const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const DAY_MS = 86_400_000;
const SEOUL_OFFSET_MS = 9 * 3_600_000;

function seoulDate(timestamp) {
  return new Date(timestamp + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

export function getRange(days, now) {
  return {
    days, startDate: seoulDate(now.getTime() - (days - 1) * DAY_MS),
    endDate: seoulDate(now.getTime()), timeZone: 'Asia/Seoul',
  };
}

// GraphQL permits variables in the selection's filter without typing the
// whole filter as a scope-specific input object.
const WINDOW = 'datetime_geq: $start, datetime_lt: $end';
const VARIABLES = '$id: string!, $start: Time!, $end: Time!';

const WORKER = `query WorkerMetrics(${VARIABLES}, $scriptName: string!) {
  viewer {
    accounts(filter: { accountTag: $id }) {
      total: workersInvocationsAdaptive(
        limit: 1, filter: { ${WINDOW}, scriptName: $scriptName }
      ) {
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
      }
      trend: workersInvocationsAdaptive(
        limit: 720, orderBy: [datetimeHour_ASC],
        filter: { ${WINDOW}, scriptName: $scriptName }
      ) {
        dimensions { datetimeHour }
        sum { requests errors subrequests }
      }
    }
  }
}`;

const workerDimensions = {
  httpStatus: 'httpResponseStatus',
  status: 'status',
  eventTypes: 'eventType',
  cacheStatus: 'cacheStatus',
  locations: 'coloCode',
};

const WORKER_DETAILS = `query WorkerDetails(${VARIABLES}, $scriptName: string!) {
  viewer {
    accounts(filter: { accountTag: $id }) {
      total: workersInvocationsAdaptive(limit: 1, filter: { ${WINDOW}, scriptName: $scriptName }) {
        sum { clientDisconnects responseBodySize }
        quantiles { requestDurationP50 requestDurationP95 requestDurationP99 wallTimeP95 memoryUsageBytesP95 }
      }
      ${Object.entries(workerDimensions).map(([key, dimension]) => `${key}: workersInvocationsAdaptive(
        limit: 12, orderBy: [sum_requests_DESC], filter: { ${WINDOW}, scriptName: $scriptName }
      ) {
        dimensions { ${dimension} }
        sum { requests }
      }`).join('\n')}
    }
  }
}`;

function zoneQuery(hostname) {
  const filter = `${WINDOW}, requestSource: "eyeball"${hostname ? ', clientRequestHTTPHost: $host' : ''}`;
  return `query ZoneMetrics(${VARIABLES}${hostname ? ', $host: string!' : ''}) {
    viewer {
      zones(filter: { zoneTag: $id }) {
        trend: httpRequestsAdaptiveGroups(
          limit: 720, orderBy: [datetimeHour_ASC], filter: { ${filter} }
        ) {
          dimensions { datetimeHour }
          count
          sum { edgeResponseBytes }
        }
        clientErrors: httpRequestsAdaptiveGroups(
          limit: 720, orderBy: [datetimeHour_ASC],
          filter: { ${filter}, edgeResponseStatus_geq: 400, edgeResponseStatus_lt: 500 }
        ) {
          dimensions { datetimeHour }
          count
        }
        serverErrors: httpRequestsAdaptiveGroups(
          limit: 720, orderBy: [datetimeHour_ASC],
          filter: { ${filter}, edgeResponseStatus_geq: 500, edgeResponseStatus_lt: 600 }
        ) {
          dimensions { datetimeHour }
          count
        }
      }
    }
  }`;
}

const webDimensions = {
  countries: ['countryName'],
  devices: ['deviceType'],
  browsers: ['userAgentBrowser'],
  operatingSystems: ['userAgentOS'],
  browserVersions: ['userAgentBrowser', 'browserVersion'],
  osVersions: ['userAgentOS', 'osVersion'],
  navigationTypes: ['navigationType'],
  deliveryTypes: ['deliveryType'],
  referrerPaths: ['refererHost', 'refererPath'],
  entryPages: ['requestPath'],
  hours: ['datetimeHour'],
};
const visitDimensions = new Set(['referrerPaths', 'entryPages']);
const performanceDimensions = {
  devices: 'deviceType',
  browsers: 'userAgentBrowser',
  pages: 'requestPath',
  countries: 'countryName',
  operatingSystems: 'userAgentOS',
  slowContent: 'largestContentfulPaintElement',
  slowInteractions: 'interactionToNextPaintElement',
  layoutShifts: 'cumulativeLayoutShiftElement',
};
const problemMetrics = {
  slowContent: 'largestContentfulPaintP75',
  slowInteractions: 'interactionToNextPaintP75',
  layoutShifts: 'cumulativeLayoutShiftP75',
};
const p75Fields = 'largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 firstContentfulPaintP75 timeToFirstByteP75';
const grades = ['lcp', 'inp', 'cls', 'fcp', 'ttfb'];
const gradeFields = grades.flatMap(metric => ['Good', 'NeedsImprovement', 'Poor', 'Total'].map(level => metric + level)).join(' ');
const delayFields = 'lcpResourceLoadDelayP75 lcpResourceLoadTimeP75 lcpElementRenderDelayP75 inpInputDelayP75 inpProcessingDurationP75 inpPresentationDelayP75';
const timingFields = {
  pageLoadP75Ms: 'pageLoadTimeP75',
  pageRenderP75Ms: 'pageRenderTimeP75',
  firstPaintP75Ms: 'firstPaintP75',
  dnsP75Ms: 'dnsTimeP75',
  connectionP75Ms: 'connectionTimeP75',
  tlsP75Ms: 'tlsTimeP75',
  redirectP75Ms: 'redirectTimeP75',
  requestP75Ms: 'requestTimeP75',
  responseP75Ms: 'responseTimeP75',
  loadEventP75Ms: 'loadEventTimeP75',
};

function rumQuery(hostname, operation, buildSelection) {
  const filter = `${WINDOW}, siteTag: $siteTag, bot: 0${hostname ? ', requestHost: $host' : ''}`;
  const queries = {
    WebAnalytics: `trend: rumPageloadEventsAdaptiveGroups(
      limit: 720, orderBy: [datetimeHour_ASC], filter: { ${filter} }
    ) {
      dimensions { datetimeHour }
      count
      sum { visits }
    }`,
    WebVitals: `vitals: rumWebVitalsEventsAdaptiveGroups(limit: 1, filter: { ${filter} }) {
      quantiles { ${p75Fields} ${delayFields} }
    }`,
    WebQuality: `quality: rumWebVitalsEventsAdaptiveGroups(limit: 1, filter: { ${filter} }) {
      sum { ${gradeFields} }
    }`,
    WebTimings: `timings: rumPerformanceEventsAdaptiveGroups(limit: 1, filter: { ${filter} }) {
      quantiles { ${Object.values(timingFields).join(' ')} }
    }`,
    WebRankings: `pages: rumPageloadEventsAdaptiveGroups(
      limit: 6, orderBy: [count_DESC], filter: { ${filter} }
    ) {
      dimensions { requestPath }
      count
    }
    referrers: rumPageloadEventsAdaptiveGroups(
      limit: 6, orderBy: [sum_visits_DESC], filter: { ${filter} }
    ) {
      dimensions { refererHost }
      sum { visits }
    }`,
  };
  return `query ${operation}(${VARIABLES}, $siteTag: string!${hostname ? ', $host: string!' : ''}) {
    viewer {
      accounts(filter: { accountTag: $id }) {
        ${buildSelection ? buildSelection(filter) : queries[operation]}
      }
    }
  }`;
}

function webBreakdownQuery(keys, filter) {
  return keys.map((key) => {
    const byVisits = visitDimensions.has(key);
    return `${key}: rumPageloadEventsAdaptiveGroups(
      limit: ${key === 'hours' ? 24 : 12}, orderBy: [${byVisits ? 'sum_visits_DESC' : 'count_DESC'}], filter: { ${filter} }
    ) {
      dimensions { ${webDimensions[key].join(' ')} }
      ${byVisits ? 'sum { visits }' : 'count'}
    }`;
  }).join('\n');
}

function performanceQuery(keys, filter) {
  return keys.map((key) => {
    const dimension = performanceDimensions[key];
    const sort = problemMetrics[key] ? `quantiles_${problemMetrics[key]}_DESC` : 'count_DESC';
    return `${key}: rumWebVitalsEventsAdaptiveGroups(
      limit: 12, orderBy: [${sort}], filter: { ${filter} }
    ) {
      dimensions { ${dimension} }
      count
      quantiles { ${p75Fields} }
    }`;
  }).join('\n');
}

class CloudflareError extends Error {}

function providerFailure(status, details) {
  if (status === 401 || status === 403 || /not authorized|unauthorized|access denied|permission|forbidden/i.test(details)) {
    return 'Cloudflare API 토큰과 이 계정 또는 도메인의 Analytics 읽기 권한을 확인하세요.';
  }
  if (status === 429 || /rate limit|quota|budget/i.test(details)) {
    return 'Cloudflare API 요청 한도에 도달했습니다. 잠시 뒤 다시 조회하세요.';
  }
  if (/time range|too (large|long|old)|not older|retention|maxduration|time filter|start time|time window/i.test(details)) {
    return 'Cloudflare에서 이 조회 기간을 지원하지 않습니다. 더 짧은 기간을 선택하세요.';
  }
  return status >= 500
    ? `Cloudflare API가 응답하지 않습니다 (HTTP ${status}). 잠시 뒤 다시 조회하세요.`
    : 'Cloudflare에서 이 지표를 조회하지 못했습니다. 계정과 데이터 원본 설정을 확인하세요.';
}

async function graphql(query, variables, scope, token, request) {
  let response;
  let body;
  try {
    response = await request(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(9_000),
    });
    if (response.ok) body = await response.json();
  } catch {
    throw new CloudflareError('Cloudflare API에 연결하지 못했습니다. 잠시 뒤 다시 조회하세요.');
  }

  if (!response.ok || body?.errors?.length) {
    throw new CloudflareError(providerFailure(response.status, body?.errors?.map(error => error.message).join(' ') ?? ''));
  }
  const source = body?.data?.viewer?.[scope]?.[0];
  if (!source) throw new CloudflareError('Cloudflare 계정 또는 도메인을 찾지 못했습니다. ID와 읽기 권한을 확인하세요.');
  return source;
}

function rows(source, name) {
  const value = source[name];
  if (!Array.isArray(value)) throw new CloudflareError('Cloudflare에서 지표 응답을 확인하지 못했습니다.');
  return value;
}

function windowFor({ startDate, endDate, now }) {
  const first = Date.parse(`${startDate}T00:00:00+09:00`);
  const last = Date.parse(`${endDate}T00:00:00+09:00`);
  const cutoff = Math.min(last + DAY_MS, new Date(now ?? Date.now()).valueOf());
  const dates = [];
  for (let day = first; day <= last; day += DAY_MS) {
    dates.push(seoulDate(day));
  }
  return { dates, variables: { start: new Date(first).toISOString(), end: new Date(cutoff).toISOString() } };
}

function aggregate(daily, fields) {
  return Object.fromEntries(fields.map(field => [field, daily.reduce((sum, day) => sum + day[field], 0)]));
}

function withErrorRate(metrics, key) {
  return { ...metrics, errorRate: metrics.requests ? metrics[key] / metrics.requests : null };
}

function percentile(value, divider = 1) {
  return Number.isFinite(value) && value >= 0 ? value / divider : null;
}

// Cloudflare buckets are UTC hours. Fold them at Seoul midnight for the report.
function dailyTotals(dates, hourlyRows, metrics) {
  const daily = dates.map(date => ({ date, ...Object.fromEntries(Object.keys(metrics).map(key => [key, 0])) }));
  const byDate = new Map(daily.map(day => [day.date, day]));
  for (const row of hourlyRows) {
    const day = byDate.get(seoulDate(Date.parse(row.dimensions.datetimeHour)));
    if (day) {
      for (const [key, read] of Object.entries(metrics)) day[key] += read(row);
    }
  }
  return daily;
}

function zoneMetrics(source, dates) {
  const traffic = dailyTotals(dates, rows(source, 'trend'), {
    requests: row => row.count, bytes: row => row.sum.edgeResponseBytes,
  });
  const clients = dailyTotals(dates, rows(source, 'clientErrors'), {clientErrors: row => row.count});
  const servers = dailyTotals(dates, rows(source, 'serverErrors'), {serverErrors: row => row.count});
  const daily = traffic.map((day, i) => withErrorRate({...day, ...clients[i], ...servers[i]}, 'serverErrors'));
  return { summary: withErrorRate(aggregate(daily, ['requests', 'bytes', 'clientErrors', 'serverErrors']), 'serverErrors'), daily };
}

function workerMetrics(source, dates) {
  const zero = { requests: 0, errors: 0, subrequests: 0 };
  const daily = dailyTotals(dates, rows(source, 'trend'), {
    requests: row => row.sum.requests, errors: row => row.sum.errors, subrequests: row => row.sum.subrequests,
  });
  const total = rows(source, 'total')[0];
  return {
    summary: {
      ...withErrorRate(total?.sum ?? zero, 'errors'),
      cpuP50Ms: percentile(total?.quantiles?.cpuTimeP50, 1_000),
      cpuP99Ms: percentile(total?.quantiles?.cpuTimeP99, 1_000),
    },
    daily: daily.map(day => withErrorRate(day, 'errors')),
  };
}

function workerDetails(source) {
  const total = rows(source, 'total')[0];
  const q = total?.quantiles;
  return {
    summary: {
      clientDisconnects: total?.sum?.clientDisconnects ?? null,
      responseBytes: total?.sum?.responseBodySize ?? null,
      requestP50Ms: percentile(q?.requestDurationP50, 1_000),
      requestP95Ms: percentile(q?.requestDurationP95, 1_000),
      requestP99Ms: percentile(q?.requestDurationP99, 1_000),
      wallP95Ms: percentile(q?.wallTimeP95, 1_000),
      memoryP95Bytes: percentile(q?.memoryUsageBytesP95),
    },
    breakdowns: Object.fromEntries(Object.entries(workerDimensions).map(([key, dimension]) => [
      key, rows(source, key).map(row => ({ name: String(row.dimensions[dimension] ?? '알 수 없음'), value: row.sum.requests })),
    ])),
  };
}

function performanceValues(quantiles) {
  return {
    lcpP75Ms: percentile(quantiles?.largestContentfulPaintP75, 1_000),
    inpP75Ms: percentile(quantiles?.interactionToNextPaintP75, 1_000),
    clsP75: percentile(quantiles?.cumulativeLayoutShiftP75),
    fcpP75Ms: percentile(quantiles?.firstContentfulPaintP75, 1_000),
    ttfbP75Ms: percentile(quantiles?.timeToFirstByteP75, 1_000),
  };
}

function rumMetrics(source, dates, quantiles, quality) {
  const daily = dailyTotals(dates, rows(source, 'trend'), {
    pageViews: row => row.count, visits: row => row.sum.visits,
  });
  return {
    summary: {
      ...aggregate(daily, ['pageViews', 'visits']),
      ...performanceValues(quantiles),
      quality: quality ? Object.fromEntries(grades.map(metric => [metric, {
        good: quality[metric + 'Good'] ?? null,
        needsImprovement: quality[metric + 'NeedsImprovement'] ?? null,
        poor: quality[metric + 'Poor'] ?? null,
        total: quality[metric + 'Total'] ?? null,
      }])) : null,
      delays: quantiles ? Object.fromEntries(delayFields.split(' ').map(key => [
        key + 'Ms', percentile(quantiles[key], 1_000),
      ])) : null,
    },
    daily,
  };
}

function breakdownRows(source, key) {
  return rows(source, key).flatMap((row) => {
    const dimensions = webDimensions[key].map(field => row.dimensions[field]);
    const value = visitDimensions.has(key) ? row.sum.visits : row.count;
    if (!Number.isFinite(value) || value <= 0) return [];
    let name = dimensions.filter(Boolean).join(' ');
    if (key === 'referrerPaths') {
      const [host, path] = dimensions;
      name = host ? host + (path || '/') : '유입 주소 없음';
    } else if (key === 'hours') {
      const timestamp = Date.parse(name);
      if (!Number.isFinite(timestamp)) return [];
      name = new Date(timestamp).toISOString();
    } else if (key === 'entryPages') {
      name ||= '/';
    }
    return [{ name: name || '알 수 없음', value }];
  });
}

function performanceRows(source, key) {
  const metric = problemMetrics[key];
  return rows(source, key).flatMap((row) => {
    const name = row.dimensions[performanceDimensions[key]];
    const quantiles = row.quantiles;
    if (metric && (!name || name === 'unknown' || !Number.isFinite(quantiles?.[metric]) || quantiles[metric] < 0)) return [];
    return [{ name: name || '알 수 없음', count: row.count, ...performanceValues(quantiles) }];
  });
}

async function optionalReport(query, keys, read, message) {
  try {
    const source = await query();
    return { data: Object.fromEntries(keys.map(key => [key, read(source, key)])) };
  } catch {
    return { data: Object.fromEntries(keys.map(key => [key, null])), message };
  }
}

async function section(configured, instructions, load) {
  if (!configured) return { status: 'unconfigured', message: instructions };
  try {
    return { status: 'ok', ...await load(), fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { status: 'error', message: error instanceof CloudflareError ? error.message : 'Cloudflare 데이터를 조회할 수 없습니다.' };
  }
}

export async function fetchCloudflare(snapshot, env = process.env, request = fetch) {
  const { variables, dates } = windowFor(snapshot);
  const token = env.CF_API_TOKEN?.trim();
  const hostname = env.CF_HOSTNAME?.trim();
  const account = env.CF_ACCOUNT_ID?.trim();
  const zone = env.CF_ZONE_ID?.trim();
  const scriptName = env.CF_WORKER_NAME?.trim();
  const siteTag = env.CF_RUM_SITE_TAG?.trim();
  const hostFilter = hostname ? { host: hostname } : {};
  const query = (document, parameters, scope) => graphql(document, { ...variables, ...parameters }, scope, token, request);

  const [http, worker, rum] = await Promise.all([
    section(token && zone, '커스텀 도메인의 CF_ZONE_ID와 CF_API_TOKEN을 설정하면 HTTP 요청을 볼 수 있습니다.', async () => {
      const data = await query(zoneQuery(hostname), { id: zone, ...hostFilter }, 'zones');
      return zoneMetrics(data, dates);
    }),
    section(token && account && scriptName, 'CF_ACCOUNT_ID, CF_WORKER_NAME과 CF_API_TOKEN을 설정하면 Worker 지표를 볼 수 있습니다.', async () => {
      const parameters = { id: account, scriptName };
      const [data, details] = await Promise.all([
        query(WORKER, parameters, 'accounts'),
        query(WORKER_DETAILS, parameters, 'accounts').then(workerDetails)
          .catch(() => ({ message: 'Cloudflare에서 Worker 실행 세부 지표를 조회하지 못했습니다.' })),
      ]);
      const metrics = workerMetrics(data, dates);
      return {
        ...metrics,
        summary: { ...metrics.summary, ...details.summary },
        breakdowns: details.breakdowns ?? null,
        ...(details.message && { status: 'partial', message: details.message }),
      };
    }),
    section(token && account && siteTag, 'CF_ACCOUNT_ID, CF_RUM_SITE_TAG와 CF_API_TOKEN을 설정하면 Web Analytics를 볼 수 있습니다.', async () => {
      const parameters = { id: account, siteTag, ...hostFilter };
      const load = (operation, buildSelection) => query(rumQuery(hostname, operation, buildSelection), parameters, 'accounts');
      const loadGroups = (operation, keys, selection, read, message) => optionalReport(
        () => load(operation, filter => selection(keys, filter)), keys, read, message,
      );
      const [data, vitals, quality, timings, rankings, audience, acquisition, performance, elements] = await Promise.all([
        load('WebAnalytics'),
        load('WebVitals')
          .then(result => ({ value: rows(result, 'vitals')[0]?.quantiles }))
          .catch(() => ({ message: 'Cloudflare에서 Core Web Vitals를 조회하지 못했습니다.' })),
        load('WebQuality')
          .then(result => ({ value: rows(result, 'quality')[0]?.sum }))
          .catch(() => ({ message: 'Cloudflare에서 성능 등급별 분포를 조회하지 못했습니다.' })),
        load('WebTimings')
          .then(result => {
            const quantiles = rows(result, 'timings')[0]?.quantiles;
            return { value: Object.fromEntries(Object.entries(timingFields).map(([key, field]) => [
              key, percentile(quantiles?.[field], 1_000),
            ])) };
          })
          .catch(() => ({ message: 'Cloudflare에서 페이지 로딩 단계를 조회하지 못했습니다.' })),
        load('WebRankings')
          .then(result => ({
            topPages: rows(result, 'pages').map(row => ({ name: row.dimensions.requestPath || '/', value: row.count })),
            referrers: rows(result, 'referrers').filter(row => row.sum.visits > 0)
              .map(row => ({ name: row.dimensions.refererHost || '유입 주소 없음', value: row.sum.visits })),
          }))
          .catch(() => ({ message: 'Cloudflare에서 인기 페이지와 유입 사이트를 조회하지 못했습니다.' })),
        loadGroups('WebAudience', ['countries', 'devices', 'browsers', 'operatingSystems', 'browserVersions', 'osVersions'],
          webBreakdownQuery, breakdownRows, 'Cloudflare에서 방문 환경을 조회하지 못했습니다.'),
        loadGroups('WebAcquisition', ['entryPages', 'referrerPaths', 'hours', 'navigationTypes', 'deliveryTypes'],
          webBreakdownQuery, breakdownRows, 'Cloudflare에서 유입과 시간대 세부 지표를 조회하지 못했습니다.'),
        loadGroups('WebPerformance', ['devices', 'browsers', 'pages', 'countries', 'operatingSystems'],
          performanceQuery, performanceRows, 'Cloudflare에서 방문 환경별 속도를 조회하지 못했습니다.'),
        loadGroups('WebSlowElements', ['slowContent', 'slowInteractions', 'layoutShifts'],
          performanceQuery, performanceRows, 'Cloudflare에서 화면 요소별 속도를 조회하지 못했습니다.'),
      ]);
      const message = [vitals, quality, timings, rankings, audience, acquisition, performance, elements]
        .map(result => result.message).filter(Boolean).join(' ');
      return {
        ...rumMetrics(data, dates, vitals.value, quality.value),
        topPages: rankings.topPages ?? null,
        referrers: rankings.referrers ?? null,
        breakdowns: { ...audience.data, ...acquisition.data },
        performance: { ...performance.data, ...elements.data },
        timings: timings.value ?? null,
        ...(message && { status: 'partial', message }),
      };
    }),
  ]);
  return { http, worker, rum };
}
