import hallAnalyticsActions from '../shared/hall-analytics-actions.json' with {type: 'json'};
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function numbers(source, keys) {
  return Object.fromEntries(keys.filter(key => Number.isFinite(source?.[key]))
    .map(key => [key, source[key]]));
}

function totals(result, metrics) {
  return { status: result.status, ...numbers(result.summary, metrics) };
}

function countsByLabel(rows, labels) {
  if (!Array.isArray(rows)) return {};
  return Object.fromEntries(labels.flatMap(label => {
    const value = rows.find(row => row.name === label)?.value;
    return Number.isFinite(value) ? [[label, value]] : [];
  }));
}

const interactionTargets = [
  ['3D 공연장 화면', '#world>canvas'],
  ['다음 곡 버튼', 'button.music-control.music-next'],
  ['입장 로딩 화면', '#boot-screen>img.boot-art'],
  ['좌석 확인 버튼', 'button.ticket-confirm'],
  ['음악 패널 열기', 'button.music-summary'],
];

function slowInteractionEvidence(rows) {
  return interactionTargets.flatMap(([target, selector]) => {
    const match = rows?.filter(row => row.name.includes(selector) && row.inpP75Ms > 200)
      .sort((a, b) => b.count - a.count)[0];
    return match ? [{target, sampleCount: match.count, inpP75Ms: match.inpP75Ms}] : [];
  }).sort((a, b) => b.sampleCount - a.sampleCount);
}

export function analysisInput({ requestedAt, range, google, cloudflare, health }) {
  const ga = google.data;
  const gaMetrics = numbers(ga?.summary, [
    'activeUsers', 'sessions', 'views', 'newUsers', 'returningUsers', 'engagedSessions',
    'engagementRate', 'avgEngagementSeconds',
  ]);
  const { http, worker, rum } = cloudflare;
  const webAnalytics = totals(rum, [
    'visits', 'pageViews', 'lcpP75Ms', 'inpP75Ms', 'clsP75',
  ]);
  const workerAnalytics = totals(worker, ['requests', 'errors', 'errorRate', 'requestP95Ms']);
  const httpAnalytics = totals(http, ['requests', 'clientErrors', 'serverErrors', 'errorRate']);
  if (!Object.keys(gaMetrics).length
    && [webAnalytics, workerAnalytics, httpAnalytics].every(source => Object.keys(source).length === 1)) return null;

  return {
    requestedAt,
    range,
    googleAnalytics: {
      status: google.status,
      timeZone: ga?.timeZone,
      privacyOrSamplingWarnings: Boolean(google.warnings?.length),
      ...gaMetrics,
      daily: ga?.daily?.map(day => ({ date: day.date, ...numbers(day, ['sessions', 'views']) })),
      channelsBySession: countsByLabel(ga?.channels, [
        'Direct', 'Organic Search', 'Organic Social', 'Referral', 'Email', 'Paid Search',
        'Paid Social', 'Display', 'Cross-network', 'Organic Video', 'Paid Video',
        'Paid Other', 'Organic Shopping', 'Paid Shopping', 'Unassigned',
      ]),
      devicesByActiveUser: countsByLabel(ga?.devices, ['mobile', 'desktop', 'tablet']),
      playbackJourney: ga?.playbackJourney,
      hallActions: countsByLabel(ga?.breakdowns?.hallActions, Object.values(hallAnalyticsActions)),
      playbackEventCounts: countsByLabel(ga?.events, ['playback_start', 'playback_180_seconds']),
    },
    cloudflareWebAnalytics: {
      ...webAnalytics,
      slowInteractionEvidence: slowInteractionEvidence(rum.performance?.slowInteractions),
      interactionDelays: numbers(rum.summary?.delays, ['inpInputDelayP75Ms', 'inpProcessingDurationP75Ms', 'inpPresentationDelayP75Ms']),
      referrersByVisit: countsByLabel(rum.referrers, [
        '유입 주소 없음', 'www.bing.com', 'www.google.com', 'www.google.co.kr', 'search.naver.com',
        'm.search.naver.com', 'www.naver.com', 'www.youtube.com', 'www.facebook.com', 'l.facebook.com',
        'www.instagram.com', 'l.instagram.com', 't.co', 'chatgpt.com', 'www.reddit.com',
      ]),
      experienceMeasurements: Object.fromEntries(['lcp', 'inp', 'cls'].map(key => [
        key, numbers(rum.summary?.quality?.[key], ['good', 'needsImprovement', 'poor', 'total']),
      ])),
    },
    cloudflareWorker: workerAnalytics,
    cloudflareHTTP: httpAnalytics,
    healthSpotCheck: { status: health.status, ...numbers(health, ['latencyMs', 'httpStatus']) },
  };
}

const instructions = `브라우저 3D 공연장의 운영자가 공연 재생과 감상 경험을 판단할 수 있도록, 아래 집계만 읽고 쉬운 한국어로 답하세요. 도구는 사용하지 마세요. 짧은 세 문단으로 쓰고 문단마다 한두 문장을 사용하세요.

첫 문단은 GA4 활동한 방문자 수와 방문자당 평균 화면 이용 시간을 한 문장으로 보여 주세요. 시간은 1분 20초처럼 읽기 쉽게 쓰고, 누락된 값은 확인되지 않았다고만 표현하세요.

둘째 문단은 가장 중요한 해석부터 쓰세요. 예를 들어 3분 도달이 기록됐다면, 일부 이용에서 음악이 실제로 누적 3분 이상 재생됐다는 점을 먼저 말하고 건수를 근거로 제시하세요. playbackJourney가 있으면 재생을 시작한 사용자 중 같은 GA4 방문에서 누적 3분에 도달한 사용자의 수를 최우선 근거로 사용하세요. rate는 같은 방문 도달 비율이며 개인의 재생 횟수나 전체 관객의 이탈률과 별개입니다. 이 보고서가 없으면 따로 센 이벤트만 제시하고 비율을 계산하지 마세요. 화면 이용 시간도 감상 시간으로 해석하지 마세요. 클릭·탭 반응이 느리다면 화면 조작에 관련된 별도 문제로 짧게 제시할 수 있습니다. slowInteractionEvidence가 있으면 측정 표본 수가 많은 지연 대상을 먼저 짚고 대상 이름, 응답 시간의 75번째 백분위, 표본 수를 함께 쓰세요. 예시 형식은 “[대상]의 응답 시간은 75번째 백분위 기준 [시간]이었습니다(표본 [측정 수]건)”입니다. 표본 수는 빠른 값과 느린 값을 포함한 전체 측정 수입니다. 표본 수를 지연 건수로 표현하지 마세요. 3D 공연장 화면은 캔버스 전체이므로 특정 물체나 조작으로 좁힐 수 없습니다. hallActions는 관객이 누른 기능의 횟수입니다. 두 보고서를 같은 관객의 데이터처럼 연결하거나 클릭 순위를 시선·체류 순위로 해석하지 마세요.

셋째 문단은 지금 먼저 확인할 일이나 결정 한 가지를 제시하세요. 응답이 느린 대상에 여러 표본이 있으면 어떤 화면에서 어떤 조작을 우선 점검할지 제시하세요. 3D 화면에 집중돼 있으면 조작 뒤 다음 화면이 그려지는 과정을 우선 점검하세요. 표본이 적으면 한 가지 대상만 고르고 판단 범위를 좁히세요. 관측된 명확한 장애가 더 긴급하면 그 근거와 확인 대상을 우선하세요. 성능 기준을 넘었다는 이유만으로 재생 장애 재현을 제안하지 마세요.

GA4 방문자·세션·조회와 Cloudflare 진입·열람·요청·Worker 실행은 각각 별도 단위입니다. 누락은 0으로 읽지 마세요. 오늘이 진행 중이거나 표본이 작고 비교 기준이 없으면 추세나 문제 규모를 단정하지 마세요. 여러 날짜 비교는 동일 출처의 완료된 날짜끼리만 하세요. 개인정보 보호와 집계 지연은 판단을 바꾸는 경우에만 언급하세요.
클릭·탭 반응의 권장 기준은 200ms, 주요 화면 표시는 2500ms, 화면 흔들림은 0.1입니다. experienceMeasurements는 등급별 측정 건수입니다. 측정 건수나 백분위로 영향받은 관객 수를 추정하지 마세요. 백분위 용어가 없어도 판단을 전달할 수 있다면 쉬운 말로 풀어 쓰세요.
`;

export async function explainAnalytics(input, env = process.env) {
  const dir = await mkdtemp(join(tmpdir(), 'pleee-ops-codex-'));
  try {
    const output = join(dir, 'summary.txt');
    const childEnv = Object.fromEntries(['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'CODEX_HOME']
      .filter(key => env[key] ?? process.env[key])
      .map(key => [key, env[key] ?? process.env[key]]));
    await new Promise((resolve, reject) => {
      const child = execFile(env.OPS_CODEX_BIN || 'codex', [
        '--ask-for-approval', 'never', 'exec', '--ignore-user-config',
        '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '--color', 'never',
        '--output-last-message', output, '-',
      ], { cwd: dir, env: childEnv, timeout: 90_000, maxBuffer: 512 * 1024 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
      child.stdin.on('error', reject);
      child.stdin.end(instructions + '\n' + JSON.stringify(input));
    });
    const explanation = (await readFile(output, 'utf8')).trim();
    if (!explanation || explanation.length > 5000) throw new Error('Invalid Codex response');
    return explanation;
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}
