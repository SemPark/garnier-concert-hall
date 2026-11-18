import {sign} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const analyticsScope = 'https://www.googleapis.com/auth/analytics.readonly';
const dailyMetrics = ['activeUsers', 'sessions', 'screenPageViews'];
const summaryMetrics = {
  activeUsers: 'activeUsers', sessions: 'sessions', views: 'screenPageViews', newUsers: 'newUsers',
  engagementRate: 'engagementRate', engagementSeconds: 'userEngagementDuration', keyEvents: 'keyEvents',
};
const engagementMetrics = {
  totalUsers: 'totalUsers', engagedSessions: 'engagedSessions', eventCount: 'eventCount',
  viewsPerSession: 'screenPageViewsPerSession', avgSessionSeconds: 'averageSessionDuration',
  sessionKeyEventRate: 'sessionKeyEventRate', userKeyEventRate: 'userKeyEventRate',
  bounceRate: 'bounceRate', scrolledUsers: 'scrolledUsers',
};
const commerceMetrics = {
  transactions: 'transactions', purchases: 'ecommercePurchases', purchasers: 'totalPurchasers',
  addToCarts: 'addToCarts', checkouts: 'checkouts', purchaseRevenue: 'purchaseRevenue', totalRevenue: 'totalRevenue',
  refundAmount: 'refundAmount', adRevenue: 'totalAdRevenue',
};
const adMetrics = {
  adCost: 'advertiserAdCost', adClicks: 'advertiserAdClicks', adImpressions: 'advertiserAdImpressions',
  costPerClick: 'advertiserAdCostPerClick', costPerKeyEvent: 'advertiserAdCostPerKeyEvent', returnOnAdSpend: 'returnOnAdSpend',
};
const metricsThatNeedObservations = new Set([
  'engagementRate', 'viewsPerSession', 'avgSessionSeconds', 'sessionKeyEventRate', 'userKeyEventRate',
  'bounceRate', 'costPerClick', 'costPerKeyEvent', 'returnOnAdSpend',
]);
const realtimeMetrics = {activeUsers: 'activeUsers', eventCount: 'eventCount', keyEvents: 'keyEvents', views: 'screenPageViews'};
const breakdowns = [
  ['topPages', '인기 페이지', 'pagePath', 'screenPageViews'],
  ['channels', '유입 채널', 'sessionDefaultChannelGroup', 'sessions'],
  ['devices', '기기', 'deviceCategory', 'activeUsers'],
  ['countries', '국가', 'country', 'activeUsers'],
  ['events', '이벤트', 'eventName', 'eventCount'],
  ['keyEventNames', '주요 이벤트', 'eventName', 'keyEvents'],
  ['sourceMedium', '유입 소스 및 매체', 'sessionSourceMedium', 'sessions'],
  ['campaigns', '캠페인', 'sessionCampaignName', 'sessions'],
  ['manualCampaigns', 'UTM 캠페인', 'sessionManualCampaignName', 'sessions'],
  ['manualSourceMedium', 'UTM 소스 및 매체', 'sessionManualSourceMedium', 'sessions'],
  ['manualAdContents', 'UTM 콘텐츠', 'sessionManualAdContent', 'sessions'],
  ['manualTerms', 'UTM 키워드', 'sessionManualTerm', 'sessions'],
  ['firstUserSourceMedium', '첫 유입 소스 및 매체', 'firstUserSourceMedium', 'activeUsers'],
  ['firstUserCampaigns', '첫 유입 캠페인', 'firstUserCampaignName', 'activeUsers'],
  ['landingPages', '첫 방문 페이지', 'landingPage', 'sessions'],
  ['pageTitles', '페이지 제목', 'pageTitle', 'screenPageViews'],
  ['returning', '신규 및 재방문', 'newVsReturning', 'activeUsers'],
  ['cities', '도시', 'city', 'activeUsers'],
  ['regions', '지역', 'region', 'activeUsers'],
  ['continents', '대륙', 'continent', 'activeUsers'],
  ['languages', '언어', 'language', 'activeUsers'],
  ['browsers', '브라우저', 'browser', 'activeUsers'],
  ['operatingSystems', '운영체제', 'operatingSystem', 'activeUsers'],
  ['deviceModels', '기기 모델', 'deviceModel', 'activeUsers'],
  ['screenResolutions', '화면 해상도', 'screenResolution', 'activeUsers'],
  ['hostNames', '호스트', 'hostName', 'screenPageViews'],
  ['hours', '시간대별 방문', 'hour', 'sessions'],
  ['weekdays', '요일별 방문', 'dayOfWeekName', 'sessions'],
  ['ages', '연령대', 'userAgeBracket', 'activeUsers'],
  ['genders', '성별', 'userGender', 'activeUsers'],
  ['interests', '관심사', 'brandingInterest', 'activeUsers'],
];
const legacyBreakdowns = new Set(['topPages', 'channels', 'devices', 'countries', 'events', 'keyEventNames']);
const realtimeBreakdowns = [
  ['countries', '실시간 국가', 'country', 'activeUsers'],
  ['devices', '실시간 기기', 'deviceCategory', 'activeUsers'],
  ['minutes', '분별 실시간 사용자', 'minutesAgo', 'activeUsers'],
];

class GoogleAnalyticsError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function post(fetchImpl, url, body, headers) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GoogleAnalyticsError('Google 서버에 접속하지 못했습니다.');
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 429) {
      throw new GoogleAnalyticsError('Google API 할당량에 도달했습니다. 잠시 후 다시 시도하세요.');
    }
    if (url === tokenUrl) {
      throw new GoogleAnalyticsError('Google 서비스 계정 인증에 실패했습니다. 키 상태를 확인하세요.');
    }
    if (response.status === 403) {
      throw new GoogleAnalyticsError('Analytics Data API 활성화와 GA4 속성의 서비스 계정 조회 권한을 확인하세요.');
    }
    if (response.status === 404) {
      throw new GoogleAnalyticsError('Google Analytics에서 해당 GA4 속성을 찾지 못했습니다. 속성 ID를 확인하세요.');
    }
    throw new GoogleAnalyticsError(`Google API 요청에 실패했습니다 (HTTP ${response.status}).`, response.status);
  }
  try {
    return await response.json();
  } catch {
    throw new GoogleAnalyticsError('Google API 응답을 읽지 못했습니다.');
  }
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function requestAccessToken(file, now, fetchImpl) {
  let assertion;
  try {
    const key = JSON.parse(await readFile(file, 'utf8'));
    if (key.type !== 'service_account' || typeof key.client_email !== 'string') {
      throw new Error('Expected a service account');
    }
    const header = {alg: 'RS256', typ: 'JWT'};
    if (key.private_key_id) header.kid = key.private_key_id;
    const iat = Math.floor(now.getTime() / 1_000);
    const claims = {iss: key.client_email, aud: tokenUrl, scope: analyticsScope, iat, exp: iat + 300};
    const signingInput = `${encode(header)}.${encode(claims)}`;
    const signature = sign('RSA-SHA256', Buffer.from(signingInput), key.private_key);
    assertion = `${signingInput}.${signature.toString('base64url')}`;
  } catch {
    throw new GoogleAnalyticsError('서비스 계정 JSON을 읽을 수 없습니다. GOOGLE_APPLICATION_CREDENTIALS 경로와 키 파일을 확인하세요.');
  }

  const token = await post(fetchImpl, tokenUrl, new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }), {'content-type': 'application/x-www-form-urlencoded'});
  if (typeof token?.access_token !== 'string' || !token.access_token) {
    throw new GoogleAnalyticsError('Google에서 액세스 토큰을 받지 못했습니다.');
  }
  return token.access_token;
}

function readReport(report, metricNames, dimensionName) {
  // GA4 can omit all headers from an empty totals or realtime report.
  if (['analyticsData#runReport', 'analyticsData#runRealtimeReport'].includes(report?.kind)
      && report.metricHeaders == null && (report.rows?.length ?? 0) === 0
      && (report.rowCount ?? 0) === 0) {
    return {rows: [], metadata: report.metadata};
  }
  if (!report?.metricHeaders || metricNames.some((name, index) => report.metricHeaders[index]?.name !== name)) {
    throw new GoogleAnalyticsError('Google에서 요청한 지표를 반환하지 않았습니다.');
  }
  if (dimensionName && report.dimensionHeaders?.[0]?.name !== dimensionName) {
    throw new GoogleAnalyticsError('Google에서 요청한 분류 기준을 반환하지 않았습니다.');
  }
  const rows = (report.rows ?? []).map((row) => ({
    dimension: row.dimensionValues?.[0]?.value,
    values: metricNames.map((_, index) => {
      const raw = row.metricValues?.[index]?.value;
      if (typeof raw !== 'string' || !raw.trim()) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    }),
  }));
  return {rows, metadata: report.metadata};
}

function collectTotals({rows, metadata}, metrics) {
  // A missing row can reflect Google's privacy threshold instead of zero traffic.
  const empty = metadata?.subjectToThresholding ? null : 0;
  const restrictedMetrics = new Set(
    metadata?.schemaRestrictionResponse?.activeMetricRestrictions?.map(({metricName}) => metricName),
  );
  return Object.fromEntries(Object.entries(metrics).map(([key, apiName], index) => {
    const fallback = metricsThatNeedObservations.has(key) ? null : empty;
    const value = restrictedMetrics.has(apiName) ? null : rows.length ? rows[0].values[index] : fallback;
    return [key, value];
  }));
}

function collectSummary(report) {
  const metrics = collectTotals(report, summaryMetrics);
  const {activeUsers, engagementSeconds} = metrics;
  return {
    ...metrics,
    avgEngagementSeconds: activeUsers > 0 && engagementSeconds != null ? engagementSeconds / activeUsers : null,
  };
}

function collectDaily({rows}) {
  return rows.flatMap(({dimension, values: [activeUsers, sessions, views]}) => {
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(dimension ?? '');
    return date ? [{date: `${date[1]}-${date[2]}-${date[3]}`, activeUsers, sessions, views}] : [];
  });
}

function collectBreakdown({rows}) {
  return rows.flatMap(({dimension, values: [value]}) => (
    typeof dimension === 'string' && value != null ? [{name: dimension, value}] : []
  ));
}

async function batchReports(api, requests) {
  try {
    const response = await api('batchRunReports', {requests});
    return requests.map((_, index) => ({status: 'fulfilled', value: response?.reports?.[index]}));
  } catch (error) {
    // A rejected metric or dimension combination can otherwise hide unrelated reports in its batch.
    if (error.status === 400 && requests.length > 1) {
      const midpoint = Math.ceil(requests.length / 2);
      const first = await batchReports(api, requests.slice(0, midpoint));
      const rest = await batchReports(api, requests.slice(midpoint));
      return [...first, ...rest];
    }
    return requests.map(() => ({status: 'rejected', reason: error}));
  }
}

export async function getGoogleAnalytics({days, now = new Date(), env = process.env, fetchImpl = fetch}) {
  const property = env.GA4_PROPERTY_ID?.trim();
  const credentialFile = env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!property || !credentialFile) {
    return {status: 'unconfigured', message: 'GA4 속성 ID와 서비스 계정 키 경로를 설정하세요.'};
  }
  if (!/^\d+$/.test(property)) {
    return {status: 'error', message: 'GA4 속성 ID는 Google Analytics 관리 화면에 표시되는 숫자입니다.'};
  }
  if (!Number.isInteger(days) || days < 1) {
    return {status: 'error', message: 'Google Analytics 조회 기간을 확인하세요.'};
  }

  let token;
  try {
    token = await requestAccessToken(credentialFile, now, fetchImpl);
  } catch (error) {
    return {status: 'error', message: safeMessage(error)};
  }

  const dateRanges = [{startDate: days === 1 ? 'today' : `${days - 1}daysAgo`, endDate: 'today'}];
  const report = (metricNames, dimensionName, options = {}) => ({
    dateRanges,
    metrics: metricNames.map((name) => ({name})),
    ...(dimensionName ? {dimensions: [{name: dimensionName}]} : {}),
    ...options,
  });
  const api = (method, body) => post(
    fetchImpl,
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:${method}`,
    JSON.stringify(body),
    {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
  );

  const coreRequests = [
    ...[summaryMetrics, engagementMetrics, commerceMetrics].map((metrics) => report(Object.values(metrics))),
    report(Object.values(adMetrics), 'sessionCampaignName', {metricAggregations: ['TOTAL'], limit: '1'}),
    report(dailyMetrics, 'date', {orderBys: [{dimension: {dimensionName: 'date'}}]}),
    ...breakdowns.map(([key, , dimension, metric]) => report([metric], dimension, {
      limit: '50',
      orderBys: key === 'hours'
        ? [{dimension: {dimensionName: dimension}}]
        : [{metric: {metricName: metric}, desc: true}],
      ...(key === 'keyEventNames' && {metricFilter: {
        filter: {fieldName: 'keyEvents', numericFilter: {operation: 'GREATER_THAN', value: {int64Value: '0'}}},
      }}),
    })),
  ];
  // Keep property-wide report concurrency bounded for standard GA4 properties.
  async function loadCoreReports() {
    const reports = [];
    for (let start = 0; start < coreRequests.length; start += 15) {
      const requests = coreRequests.slice(start, start + 15);
      const batches = [requests.slice(0, 5), requests.slice(5, 10), requests.slice(10)].filter((batch) => batch.length);
      reports.push(...(await Promise.all(batches.map((batch) => batchReports(api, batch)))).flat());
    }
    return reports;
  }
  const [coreReports, realtimeReports] = await Promise.all([
    loadCoreReports(),
    Promise.allSettled([
      api('runRealtimeReport', {metrics: Object.values(realtimeMetrics).map((name) => ({name}))}),
      ...realtimeBreakdowns.map(([key, , dimension, metric]) => api('runRealtimeReport', {
        dimensions: [{name: dimension}],
        metrics: [{name: metric}],
        limit: '50',
        orderBys: key === 'minutes'
          ? [{dimension: {dimensionName: dimension, orderType: 'NUMERIC'}, desc: true}]
          : [{metric: {metricName: metric}, desc: true}],
      })),
    ]),
  ]);

  const failures = new Map();
  const warnings = new Set();
  const data = {timeZone: null};
  let successfulReports = 0;
  function collect(label, result, parse, format) {
    try {
      if (result.status === 'rejected') throw result.reason;
      const value = parse(result.value);
      const metadata = value.metadata;
      data.timeZone ??= metadata?.timeZone ?? null;
      if (metadata?.subjectToThresholding) warnings.add('개인정보 보호 기준에 따라 일부 Google Analytics 값이 표시되지 않을 수 있습니다.');
      if (metadata?.samplingMetadatas?.length) warnings.add('Google Analytics 일부 보고서에 표본 추출이 적용되었습니다.');
      if (metadata?.dataLossFromOtherRow) warnings.add('Google Analytics에서 일부 항목을 기타로 묶어 집계했습니다.');
      if (metadata?.schemaRestrictionResponse?.activeMetricRestrictions?.length) warnings.add('Google Analytics 데이터 열람 권한에 따라 일부 수치를 표시하지 못했습니다.');
      const formatted = format(value);
      successfulReports += 1;
      return formatted;
    } catch (error) {
      const reason = safeMessage(error);
      const labels = failures.get(reason) ?? [];
      labels.push(label);
      failures.set(reason, labels);
      return null;
    }
  }

  const amounts = (report, metrics) => ({...collectTotals(report, metrics), currencyCode: report.metadata?.currencyCode ?? null});
  const totalReport = (index, label, metrics, format = (report) => collectTotals(report, metrics)) =>
    collect(label, coreReports[index], (value) => readReport(value, Object.values(metrics)), format);
  const overview = totalReport(0, '기간 요약', summaryMetrics, collectSummary);
  const engagement = totalReport(1, '방문 및 참여 요약', engagementMetrics);
  const commerce = totalReport(2, '구매 및 수익', commerceMetrics, (report) => amounts(report, commerceMetrics));
  const ads = collect('광고 성과', coreReports[3], (value) => {
    const totals = value?.totals ?? [];
    if (value?.rows?.length && !totals.length) throw new GoogleAnalyticsError('Google에서 광고 합계를 반환하지 않았습니다.');
    return readReport(value && {...value, rows: totals}, Object.values(adMetrics));
  }, (report) => amounts(report, adMetrics));
  data.commerce = commerce || ads
    ? {...commerce, ...ads, currencyCode: ads?.currencyCode ?? commerce?.currencyCode ?? null}
    : null;
  data.daily = collect('일별 추이', coreReports[4], (value) => readReport(value, dailyMetrics, 'date'), collectDaily);
  data.breakdowns = {};
  let returningUsers = null;
  for (const [index, [key, label, dimension, metric]] of breakdowns.entries()) {
    const result = collect(label, coreReports[5 + index], (value) => readReport(value, [metric], dimension), (report) => {
      const rows = collectBreakdown(report);
      if (key === 'returning') {
        returningUsers = rows.find(({name}) => name === 'returning')?.value
          ?? (report.metadata?.subjectToThresholding ? null : 0);
      }
      return rows;
    });
    const target = legacyBreakdowns.has(key) ? data : data.breakdowns;
    target[key] = result;
  }
  data.summary = overview || engagement ? {...overview, ...engagement, returningUsers} : null;
  const realtime = collect('실시간', realtimeReports[0], (value) => readReport(value, Object.values(realtimeMetrics)),
    (report) => collectTotals(report, realtimeMetrics));
  const liveBreakdowns = {};
  for (const [index, [key, label, dimension, metric]] of realtimeBreakdowns.entries()) {
    liveBreakdowns[key] = collect(label, realtimeReports[1 + index], (value) => readReport(value, [metric], dimension), collectBreakdown);
  }
  data.realtime = realtime || Object.values(liveBreakdowns).some((report) => report !== null)
    ? {...realtime, breakdowns: liveBreakdowns}
    : null;

  const fetchedAt = new Date().toISOString();
  if (!failures.size) return {status: 'ok', fetchedAt, warnings: [...warnings], data};
  if (!successfulReports) {
    return {status: 'error', message: [...failures.keys()].join(' ')};
  }
  const message = [...failures].map(([reason, labels]) => `${labels.join(', ')} 조회 실패. ${reason}`).join(' ');
  return {status: 'partial', fetchedAt, message, warnings: [...warnings], data};
}

function safeMessage(error) {
  return error instanceof GoogleAnalyticsError ? error.message : 'Google Analytics 데이터를 읽지 못했습니다.';
}
