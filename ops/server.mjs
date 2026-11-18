import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getGoogleAnalytics } from './ga.mjs';
import { fetchCloudflare } from './cloudflare.mjs';

const host = '127.0.0.1';
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const genericError = { status: 'error', message: '조회에 실패했습니다. 잠시 후 다시 시도해 주세요.' };

function sendJSON(res, status, value) {
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

export function getRange(days, now) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    days, startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10), timeZone: 'UTC',
  };
}

export async function probeHealth(site, fetchImpl = fetch) {
  if (!site) return { status: 'unconfigured', message: '운영 주소를 설정하면 공연장 API 응답을 확인할 수 있습니다.' };
  let url;
  try {
    const origin = new URL(site);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error();
    url = new URL('/api/health', origin);
  } catch {
    return { status: 'error', message: 'OPS_SITE_URL에 경로 없이 https://로 시작하는 공연장 주소를 입력하세요.' };
  }
  const started = performance.now();
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(6000),
    });
    const result = { fetchedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), httpStatus: response.status };
    const isJSON = response.headers.get('content-type')?.includes('application/json');
    if (response.ok && isJSON) {
      const status = await response.json().catch(() => null);
      if (status?.ok === true) return { status: 'ok', ...result };
    }
    await response.body?.cancel().catch(() => {});
    return { status: 'error', ...result, message: '공연장 상태 확인 경로가 정상 응답을 반환하지 않았습니다.' };
  } catch {
    return { status: 'error', fetchedAt: new Date().toISOString(), message: '공연장 상태 확인 경로에 접속하지 못했습니다.' };
  }
}

export function createOpsServer({
  env = process.env,
  google = getGoogleAnalytics,
  cloudflare = fetchCloudflare,
  health = probeHealth,
  clock = () => new Date(),
} = {}) {
  return createServer(async (req, res) => {
    try {
      const port = req.socket.localPort;
      const allowedHosts = [host + ':' + port, 'localhost:' + port];
      if (!allowedHosts.includes(req.headers.host)
        || (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)
        || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) {
        return sendJSON(res, 403, { error: '이 대시보드는 같은 컴퓨터에서만 열 수 있습니다.' });
      }
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return sendJSON(res, 405, { error: '지원하지 않는 요청 방식입니다.' });
      }
      const url = new URL(req.url, 'http://' + req.headers.host);
      if (url.pathname === '/api/analytics') {
        const input = url.searchParams.get('days') ?? '7';
        if (!['1', '7', '14', '30'].includes(input) || url.searchParams.getAll('days').length > 1) {
          return sendJSON(res, 400, { error: '조회 기간은 오늘, 7일, 14일, 30일 중 하나를 선택하세요.' });
        }
        const now = clock();
        const days = Number(input);
        const range = getRange(days, now);
        const isolate = (task, fallback) => Promise.resolve().then(task).catch(() => fallback);
        const [gaResult, cfResult, healthResult] = await Promise.all([
          isolate(() => google({ days, now, env }), genericError),
          isolate(() => cloudflare({ ...range, now }, env), { http: genericError, worker: genericError, rum: genericError }),
          isolate(() => health(env.OPS_SITE_URL), genericError),
        ]);
        return sendJSON(res, 200, {
          requestedAt: now.toISOString(), completedAt: clock().toISOString(),
          range, google: gaResult, cloudflare: cfResult, health: healthResult,
        });
      }
      if (!assets.has(url.pathname)) return sendJSON(res, 404, { error: '페이지를 찾을 수 없습니다.' });
      const [file, contentType] = assets.get(url.pathname);
      const body = await readFile(new URL('./public/' + file, import.meta.url));
      res.writeHead(200, { ...headers, 'Content-Type': contentType });
      return res.end(body);
    } catch {
      return sendJSON(res, 500, { error: '운영 대시보드 서버에서 오류가 발생했습니다.' });
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    loadEnvFile(new URL('./.env', import.meta.url));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('ops/.env 파일을 읽지 못했습니다.');
      process.exit(1);
    }
  }
  const port = Number(process.env.OPS_PORT || 5180);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error('OPS_PORT는 1024~65535 사이의 포트 번호여야 합니다.');
    process.exit(1);
  }
  createOpsServer()
    .on('error', (error) => {
      console.error(error.code === 'EADDRINUSE'
        ? '운영 대시보드 포트가 사용 중입니다. OPS_PORT를 변경하세요.'
        : '로컬 운영 대시보드 포트를 열지 못했습니다 (' + error.code + ').');
      process.exitCode = 1;
    })
    .listen(port, host, () => console.log('공연장 운영 대시보드: http://' + host + ':' + port));
}
