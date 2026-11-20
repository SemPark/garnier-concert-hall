const query = (selector) => document.querySelector(selector);
const elements = {
  refresh: query('#refresh'),
  explain: query('#explain'),
  explanationStatus: query('#explanation-status'),
  explanationText: query('#explanation-text'),
  ranges: query('#ranges'),
  period: query('#period'),
  updated: query('#updated'),
  notice: query('#notice'),
  googleNotice: query('#google-notice'),
  summary: query('#summary'),
  primaryMetrics: query('#primary-metrics'),
  supportingMetrics: query('#supporting-metrics'),
  googleSummary: query('#google-summary'),
  googlePeriod: query('#google-period'),
  comparison: query('#comparison-content'),
  audience: query('#audience-content'),
  infrastructure: query('#infra-content'),
  cloudflarePeriod: query('#cloudflare-period'),
};

const sourceNames = {
  google: 'Google Analytics',
  cloudflare: 'Cloudflare',
  http: 'Cloudflare HTTP',
  worker: 'Cloudflare Worker',
  rum: 'Cloudflare Web Analytics',
};

const stateNames = {
  loading: '조회 중',
  ok: '조회 완료',
  partial: '일부 조회 완료',
  unconfigured: '연결 설정 필요',
  error: '조회 실패',
};

const num = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 2});
const layoutScore = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 3});
const ratio = new Intl.NumberFormat('ko-KR', {style: 'percent', maximumFractionDigits: 2});
const moment = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const ms = (value) => `${num.format(value)} ms`;
const duration = (value) => value < 60
  ? `${num.format(Math.round(value))}초`
  : `${Math.floor(Math.round(value) / 60)}분 ${Math.round(value) % 60}초`;
const count = (value) => num.format(value);
const percent = (value) => ratio.format(value);
const bytes = (value) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = value > 0 ? Math.min(Math.floor(Math.log(value) / Math.log(1000)), units.length - 1) : 0;
  return `${count(value / 1000 ** exponent)} ${units[exponent]}`;
};
const valueText = (value, format = count) => Number.isFinite(value) ? format(value) : '—';
const dateLabel = (date) => date?.slice(5).replace('-', '.') ?? '';
const timestamp = (date) => Number.isFinite(Date.parse(date)) ? moment.format(new Date(date)) : '';
const metric = (title, key, format, description) => ({title, key, format, description});
const regionNames = new Intl.DisplayNames('ko-KR', {type: 'region'});
const formatCountry = (name) => /^[A-Z]{2}$/.test(name) ? regionNames.of(name) : name;
const formatDevice = (name) => deviceNames.get(name.toLowerCase()) ?? name;
const formatPage = (name) => name === '/' ? '첫 화면 (/)' : name;
const seoulHour = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', hourCycle: 'h23',
});
const formatSeoulHour = (name) => {
  const date = new Date(name);
  return Number.isNaN(date.getTime()) ? name : seoulHour.format(date);
};
const formatHour = (name) => /^\d{1,2}$/.test(name) ? `${name.padStart(2, '0')}:00` : name;
const formatMinutesAgo = (name) => /^\d+$/.test(name) ? `${Number(name)}분 전` : name;
const navigationLabels = new Map([
  ['navigate', '일반 이동'], ['reload', '새로고침'], ['back_forward', '뒤로·앞으로 이동'],
  ['prerender', '미리 렌더링'],
]);
const returningLabels = new Map([['new', '처음 방문'], ['returning', '재방문']]);

const googleDaily = [
  metric('방문 세션', 'sessions', count, 'GA4에서 집계한 이용 세션 수'),
  metric('활동한 방문자', 'activeUsers', count, '기간 중 활동으로 집계된 사용자 수'),
  metric('페이지 조회수', 'views', count, '같은 페이지를 다시 본 경우도 포함'),
];
const googleSummary = [...googleDaily,
  metric('주요 행동', 'keyEvents', count, 'Google Analytics에서 주요 이벤트로 지정한 행동의 발생 횟수'),
];
const googleEngagement = [
  metric('처음 방문한 사람', 'newUsers', count),
  metric('참여한 방문 비율', 'engagementRate', percent, '일정 시간 이상 머물렀거나 여러 페이지를 보거나 주요 행동을 한 방문의 비율'),
  metric('방문자당 평균 이용 시간', 'avgEngagementSeconds', duration, '페이지가 화면에 표시된 동안의 평균 이용 시간'),
];
const googleAdditionalMetrics = [
  metric('전체 사용자', 'totalUsers', count),
  metric('재방문 사용자', 'returningUsers', count),
  metric('참여한 방문', 'engagedSessions', count),
  metric('전체 이벤트', 'eventCount', count),
  metric('방문당 페이지 열람', 'viewsPerSession', count),
  metric('평균 방문 시간', 'avgSessionSeconds', duration),
  metric('주요 행동이 발생한 방문', 'sessionKeyEventRate', percent),
  metric('주요 행동을 한 사용자 비율', 'userKeyEventRate', percent),
  metric('참여 없이 끝난 방문', 'bounceRate', percent),
  metric('스크롤한 사용자', 'scrolledUsers', count),
  metric('전체 이용 시간', 'engagementSeconds', duration),
];
const channelNames = new Map([
  ['Direct', '직접 방문'], ['Organic Search', '자연 검색'], ['Organic Social', '일반 소셜 게시물'],
  ['Referral', '다른 사이트 링크'], ['Email', '이메일'], ['Paid Search', '검색 광고'],
  ['Paid Social', '소셜 광고'], ['Display', '배너 광고'], ['Cross-network', '여러 채널에 걸친 광고'],
  ['Organic Video', '일반 동영상'], ['Paid Video', '동영상 광고'], ['Paid Other', '기타 광고'],
  ['Paid Shopping', '쇼핑 광고'], ['Organic Shopping', '자연 쇼핑'], ['Unassigned', '분류되지 않음'],
]);
const eventNames = new Map([
  ['page_view', '페이지 조회'], ['session_start', '방문 시작'], ['first_visit', '첫 방문'],
  ['user_engagement', '페이지 이용'], ['scroll', '페이지 스크롤'], ['click', '외부 링크 클릭'],
  ['playback_start', '음악 재생 시작'], ['playback_180_seconds', '누적 3분 재생 도달'],
]);
const deviceNames = new Map([['desktop', '컴퓨터'], ['mobile', '휴대전화'], ['tablet', '태블릿']]);

const cfVisits = [
  metric('사이트 진입', 'visits', count, '외부 링크 또는 직접 접속으로 시작한 페이지 열기'),
  metric('페이지 열람 횟수', 'pageViews', count, '한 번 접속해서 여러 페이지를 본 경우도 포함'),
];
const cfExperience = [
  {...metric('주요 화면이 보이기까지', 'lcpP75Ms', (value) => `${num.format(value / 1000)}초`, '페이지의 가장 큰 이미지나 글이 표시되기까지 걸린 시간'), good: 2500, poor: 4000},
  {...metric('누른 뒤 반응하기까지', 'inpP75Ms', ms, '버튼이나 링크를 눌렀을 때 화면이 반응하는 데 걸린 시간'), good: 200, poor: 500},
  {...metric('화면 흔들림', 'clsP75', (value) => layoutScore.format(value), '화면 요소가 갑자기 움직인 정도. 낮을수록 안정적입니다.'), good: 0.1, poor: 0.25},
];
const cfAdditionalPerformance = [
  metric('첫 콘텐츠 표시', 'fcpP75Ms', ms),
  metric('서버 첫 응답', 'ttfbP75Ms', ms),
];

const cfBreakdownDefinitions = [
  ['browserVersions', '브라우저 버전', '열람 수'],
  ['osVersions', '운영체제 버전', '열람 수'],
  ['referrerPaths', '유입된 외부 페이지', '방문 수'],
  ['navigationTypes', '페이지 이동 방식', '열람 수', (name) => navigationLabels.get(name) ?? name],
  ['deliveryTypes', '페이지 전송 방식', '열람 수'],
];
const googleBreakdownDefinitions = [
  ['channels', '유입 채널', '세션 수', name => channelNames.get(name) ?? name],
  ['campaigns', '캠페인', '방문 수'],
  ['manualSourceMedium', 'UTM 출처 및 매체', '방문 수'],
  ['manualCampaigns', 'UTM 캠페인', '방문 수'],
  ['manualAdContents', 'UTM 콘텐츠', '방문 수'],
  ['manualTerms', 'UTM 검색어', '방문 수'],
  ['firstUserSourceMedium', '첫 방문 당시 출처 및 매체', '활동한 방문자'],
  ['firstUserCampaigns', '첫 방문 당시 캠페인', '활동한 방문자'],
  ['pageTitles', '페이지 제목', '조회수'],
  ['hostNames', '도메인', '조회수'],
  ['returning', '신규·재방문', '활동한 방문자', (name) => returningLabels.get(name) ?? name],
  ['continents', '대륙', '활동한 방문자'],
  ['cities', '도시', '활동한 방문자'],
  ['regions', '지역', '활동한 방문자'],
  ['languages', '언어', '활동한 방문자'],
  ['ages', '연령대', '활동한 방문자'],
  ['genders', '성별', '활동한 방문자'],
  ['interests', '관심사', '활동한 방문자'],
  ['deviceModels', '기기 모델', '활동한 방문자'],
  ['screenResolutions', '화면 해상도', '활동한 방문자'],
  ['weekdays', '요일별 방문', '방문 수'],
  ['keyEventNames', '주요 행동', '발생 수', (name) => eventNames.get(name) ?? name],
];
const realtimeBreakdownDefinitions = [
  ['countries', '국가', '활동한 방문자', formatCountry],
  ['devices', '기기', '활동한 방문자', formatDevice],
  ['minutes', '분별 활동', '활동한 방문자', formatMinutesAgo],
];
const googleBreakdownGroups = {
  '캠페인과 유입': ['channels', 'campaigns', 'manualSourceMedium', 'manualCampaigns', 'manualAdContents',
    'manualTerms', 'firstUserSourceMedium', 'firstUserCampaigns'],
  '페이지와 방문 시간': ['pageTitles', 'hostNames', 'weekdays'],
  '방문자와 이용 환경': ['returning', 'continents', 'cities', 'regions', 'languages', 'ages', 'genders',
    'interests', 'deviceModels', 'screenResolutions'],
  '방문 중 행동': ['keyEventNames'],
};
const cfPerformanceDefinitions = [
  ['devices', '기기', formatDevice],
  ['browsers', '브라우저'],
  ['pages', '페이지', formatPage],
  ['countries', '국가', formatCountry],
  ['operatingSystems', '운영체제'],
  ['slowContent', '표시가 느린 화면 요소'],
  ['slowInteractions', '반응이 느린 화면 요소'],
  ['layoutShifts', '위치가 움직인 화면 요소'],
];
const cfDelayDefinitions = [
  metric('주요 콘텐츠 다운로드 시작 전', 'lcpResourceLoadDelayP75Ms', ms),
  metric('주요 콘텐츠 다운로드 시간', 'lcpResourceLoadTimeP75Ms', ms),
  metric('주요 콘텐츠를 그리기 전', 'lcpElementRenderDelayP75Ms', ms),
  metric('클릭·탭 입력을 처리하기 전', 'inpInputDelayP75Ms', ms),
  metric('클릭·탭 입력 처리 시간', 'inpProcessingDurationP75Ms', ms),
  metric('클릭·탭 처리 후 화면 갱신까지', 'inpPresentationDelayP75Ms', ms),
];
const cfTimingDefinitions = [
  metric('전체 페이지 로딩', 'pageLoadP75Ms', ms),
  metric('페이지 그리기', 'pageRenderP75Ms', ms),
  metric('첫 화면 요소 표시', 'firstPaintP75Ms', ms),
  metric('도메인 주소 조회', 'dnsP75Ms', ms),
  metric('서버 연결', 'connectionP75Ms', ms),
  metric('보안 연결 설정', 'tlsP75Ms', ms),
  metric('다른 주소로 이동', 'redirectP75Ms', ms),
  metric('요청부터 첫 응답까지', 'requestP75Ms', ms),
  metric('응답 다운로드', 'responseP75Ms', ms),
  metric('페이지 로드 이벤트 처리', 'loadEventP75Ms', ms),
];
const workerDefinitions = [
  metric('Worker 요청', 'requests', count),
  metric('Worker 오류', 'errors', count),
  metric('하위 요청', 'subrequests', count),
  metric('Worker 오류율', 'errorRate', percent),
  metric('클라이언트 연결 끊김', 'clientDisconnects', count),
  metric('응답 전송량', 'responseBytes', bytes),
  metric('요청 처리 시간 · 중앙값', 'requestP50Ms', ms),
  metric('요청 처리 시간 · 95번째 백분위', 'requestP95Ms', ms),
  metric('요청 처리 시간 · 99번째 백분위', 'requestP99Ms', ms),
  metric('전체 실행 시간 · 95번째 백분위', 'wallP95Ms', ms),
  metric('CPU 사용 시간 · 중앙값', 'cpuP50Ms', ms),
  metric('CPU 사용 시간 · 99번째 백분위', 'cpuP99Ms', ms),
  metric('메모리 사용량 · 95번째 백분위', 'memoryP95Bytes', bytes),
];
const workerBreakdownDefinitions = [
  ['httpStatus', 'HTTP 응답 코드', '요청 수'],
  ['status', '실행 결과', '요청 수'],
  ['eventTypes', '이벤트 유형', '요청 수'],
  ['cacheStatus', '캐시 상태', '요청 수'],
  ['locations', '처리 위치', '요청 수'],
];

const comparisonDefinitions = [
  ['countries', '국가', '활동한 방문자', '페이지 열람', formatCountry],
  ['devices', '기기', '활동한 방문자', '페이지 열람', formatDevice],
  ['topPages', '인기 페이지', '페이지 조회', '페이지 열람', formatPage],
  ['entryPages', '첫 방문 페이지', '방문 세션', '사이트 진입', formatPage],
  ['browsers', '브라우저', '활동한 방문자', '페이지 열람'],
  ['operatingSystems', '운영체제', '활동한 방문자', '페이지 열람'],
  ['hours', '시간별 활동', '현지 시각별 방문 세션', '날짜·한국 시각별 페이지 열람', formatHour, formatSeoulHour],
];
const httpDefinitions = [
  metric('HTTP 요청', 'requests', count),
  metric('전송량', 'bytes', bytes),
  metric('4xx 응답', 'clientErrors', count),
  metric('5xx 응답', 'serverErrors', count),
  metric('5xx 응답 비율', 'errorRate', percent),
];

// Use DOM text nodes for provider-supplied names and messages.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function sourceState(result) {
  return result?.status ?? 'loading';
}

function sourceBadge(source, state, result) {
  const badge = element('span', 'source-status', `${sourceNames[source]} · ${stateNames[state]}`);
  badge.dataset.state = state;
  const fetched = timestamp(result?.fetchedAt);
  if (fetched) badge.title = `서비스 조회 ${fetched}`;
  return badge;
}

function metricCard(definition, source, result, values) {
  const cell = element('div', 'metric');
  const list = element('dl');
  const state = sourceState(result);
  const value = valueText(values?.[definition.key], definition.format);
  const main = element('dd', 'value', value);
  const meta = element('small', 'metric-meta');
  meta.dataset.state = state;
  const missing = value === '—';
  meta.textContent = missing
    ? (state === 'ok' ? '집계 없음' : stateNames[state])
    : definition.description ?? (source === 'google' ? '' : sourceNames[source]);
  if (meta.textContent) main.append(meta);
  list.append(element('dt', '', definition.title), main);
  cell.append(list);
  return cell;
}

function metricGrid(definitions, source, result, values) {
  const grid = element('div', 'metric-grid');
  grid.append(...definitions.map((definition) => metricCard(definition, source, result, values)));
  return grid;
}

function statusText(result) {
  return result?.message || ({
    loading: '원본 서비스에서 데이터를 가져오는 중입니다.',
    ok: '선택한 기간에 기록된 데이터가 없습니다.',
    partial: '이 지표를 가져오지 못했습니다.',
    unconfigured: '이 데이터 소스의 API 연결을 설정하면 지표가 표시됩니다.',
    error: '데이터를 가져오지 못했습니다. 잠시 뒤 다시 조회해 주세요.',
  })[sourceState(result)];
}

function makePanel(title, wide = false) {
  const panel = element('div', wide ? 'panel wide' : 'panel');
  panel.append(element('h3', '', title));
  return panel;
}

function table(rows, itemTitle, valueTitle, format, formatName = (name) => name) {
  const node = element('table', 'data-table');
  const head = node.createTHead().insertRow();
  for (const title of [itemTitle, valueTitle]) {
    const column = element('th', '', title);
    column.scope = 'col';
    head.append(column);
  }
  const body = node.createTBody();
  for (const row of rows) {
    const entry = body.insertRow();
    entry.insertCell().textContent = formatName(row.name) || '(값 없음)';
    entry.insertCell().textContent = valueText(row.value, format);
  }
  return node;
}

const reportSelections = new Map();

function datasetPicker(label, id, definitions, draw, groups) {
  const wrapper = element('div', 'report-data');
  const control = element('label', 'report-picker');
  const picker = element('select', 'chart-picker');
  control.append(element('span', '', label), picker);
  const options = new Map(definitions.map(([key, title]) => {
    const option = element('option', '', title);
    option.value = key;
    return [key, option];
  }));
  for (const [groupName, keys] of Object.entries(groups ?? {})) {
    const group = element('optgroup');
    group.label = groupName;
    for (const key of keys) {
      if (!options.has(key)) continue;
      group.append(options.get(key));
      options.delete(key);
    }
    if (group.childElementCount) picker.append(group);
  }
  picker.append(...options.values());
  picker.value = reportSelections.get(id) ?? definitions[0][0];
  const contents = element('div', 'report-data-contents');
  function update() {
    const selected = definitions.find(([key]) => key === picker.value) ?? definitions[0];
    reportSelections.set(id, selected[0]);
    contents.replaceChildren(draw(selected));
  }
  picker.addEventListener('change', update);
  wrapper.append(control, contents);
  update();
  return wrapper;
}

function rankedData(rows, title, measure, formatName = (name) => name) {
  if (rows?.length) return table(rows, title, measure, count, formatName);
  return element('p', 'empty', Array.isArray(rows)
    ? '선택한 기간에 기록된 데이터가 없습니다.'
    : '이 항목의 데이터를 가져오지 못했습니다.');
}

function measureTable(rows, itemTitle, definitions, formatName = (name) => name) {
  if (!rows?.length) return rankedData(rows, itemTitle, '');
  const frame = element('div', 'report-table-scroll');
  frame.tabIndex = 0;
  frame.setAttribute('aria-label', `${itemTitle} 표`);
  const node = element('table', 'data-table report-measure-table');
  const head = node.createTHead().insertRow();
  for (const title of [itemTitle, ...definitions.map(({title}) => title)]) {
    const column = element('th', '', title);
    column.scope = 'col';
    head.append(column);
  }
  const body = node.createTBody();
  for (const row of rows) {
    const entry = body.insertRow();
    const name = element('th', '', formatName(row.name));
    name.scope = 'row';
    entry.append(name);
    for (const {key, format} of definitions) entry.insertCell().textContent = valueText(row[key], format);
  }
  frame.append(node);
  return frame;
}

const openDetails = new Map();

function detailSection(className, title, ...contents) {
  const details = element('details', className);
  details.append(element('summary', '', title), ...contents);
  details.open = openDetails.get(title) ?? false;
  details.addEventListener('toggle', () => openDetails.set(title, details.open));
  return details;
}

function chart(container, rows, definition, kind) {
  container.replaceChildren();
  const values = rows.map(({date, ...point}) => ({name: date, value: point[definition.key]}));
  const finiteValues = values.filter(({value}) => Number.isFinite(value));
  if (!finiteValues.length) {
    container.append(element('p', 'empty', '선택한 기간에 기록된 데이터가 없습니다.'));
    return;
  }
  const maximum = Math.max(...finiteValues.map(({value}) => value));
  const scroll = element('div', 'chart-scroll');
  const scale = element('div', 'chart-scale');
  scale.append(element('span', '', `최댓값 ${valueText(maximum, definition.format)}`));
  scale.append(element('span', '', `${dateLabel(values[0].name)} ~ ${dateLabel(values.at(-1).name)}`));
  const bars = element('div', 'chart-bars');
  const readout = element('p', 'chart-readout', '막대를 선택하면 일별 수치를 확인할 수 있습니다.');
  bars.dataset.kind = kind;
  bars.setAttribute('aria-label', definition.title);
  bars.setAttribute('role', 'group');
  for (const {name, value} of values) {
    const bar = element('button', 'chart-point');
    const description = `${name} · ${definition.title} ${valueText(value, definition.format)}`;
    bar.type = 'button';
    bar.title = description;
    bar.setAttribute('aria-label', description);
    bar.setAttribute('aria-pressed', 'false');
    const stripe = element('span');
    const height = maximum > 0 && Number.isFinite(value) ? Math.max(0, value / maximum * 100) : 0;
    stripe.style.setProperty('--bar-height', `${height}%`);
    bar.append(stripe);
    bar.addEventListener('click', () => {
      bars.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
      bar.setAttribute('aria-pressed', 'true');
      readout.textContent = description;
    });
    bars.append(bar);
  }
  const details = element('details', 'chart-data');
  details.append(element('summary', '', '일별 수치 보기'), table(values, '날짜', definition.title, definition.format));
  scroll.append(scale, bars);
  container.append(scroll, readout, details);
}

const chartSelections = new Map();

function appendChart(panel, title, rows, definitions, source, unavailable) {
  const wrapper = element('div', 'chart');
  if (!rows?.length) {
    wrapper.append(element('p', 'empty', unavailable));
    panel.append(wrapper);
    return;
  }
  const toolbar = element('div', 'chart-toolbar');
  toolbar.append(element('h4', '', title));
  const picker = element('select', 'chart-picker');
  picker.setAttribute('aria-label', `${title} 지표`);
  for (const definition of definitions) {
    const option = element('option', '', definition.title);
    option.value = definition.key;
    picker.append(option);
  }
  picker.value = chartSelections.get(source) ?? definitions[0].key;
  const plot = element('div');
  function draw() {
    const definition = definitions.find(({key}) => key === picker.value) ?? definitions[0];
    chartSelections.set(source, definition.key);
    chart(plot, rows, definition, source === 'google' ? 'ga' : 'cf');
  }
  picker.addEventListener('change', draw);
  if (definitions.length > 1) toolbar.append(picker);
  wrapper.append(toolbar, plot);
  panel.append(wrapper);
  draw();
}

function quickCard(title, value, context, tone) {
  const card = element('div', 'quick-card');
  if (tone) card.dataset.tone = tone;
  card.append(
    element('h3', '', title),
    element('strong', 'quick-value', value),
    element('p', 'quick-context', context),
  );
  return card;
}

function paintQuickOverview(snapshot) {
  const google = snapshot?.google;
  const {rum, worker, http} = snapshot?.cloudflare ?? {};
  const web = rum?.summary;
  const ga = google?.data?.summary;
  const cfLabel = snapshot?.range?.days > 7 ? 'Cloudflare 추정치' : 'Cloudflare';
  const visit = web
    ? quickCard('사이트 진입', `${count(web.visits)}회`, `페이지 열람 ${count(web.pageViews)}회 · ${cfLabel}`)
    : Number.isFinite(ga?.sessions)
      ? quickCard('방문 세션', `${count(ga.sessions)}회`, `페이지 조회 ${valueText(ga.views)}회 · GA4`)
      : quickCard('방문', '—', statusText(snapshot ? rum : null));

  const referrer = rum?.referrers?.find(row => row.name !== '유입 주소 없음');
  const gaChannel = !web ? google?.data?.channels?.[0] : null;
  const unknown = rum?.referrers?.find(row => row.name === '유입 주소 없음');
  const attribution = [];
  if (Number.isFinite(web?.visits)) attribution.push(`전체 ${count(web.visits)}회`);
  if (referrer) attribution.push(`이 사이트에서 ${count(referrer.value)}회`);
  if (unknown) attribution.push(`출처 미확인 ${count(unknown.value)}회`);
  const acquisition = referrer || unknown
    ? quickCard('가장 많이 들어온 외부 사이트', referrer?.name ?? '확인된 사이트 없음', [...attribution, cfLabel].join(' · '))
    : gaChannel
      ? quickCard('가장 많이 들어온 경로', channelNames.get(gaChannel.name) ?? gaChannel.name, `${count(gaChannel.value)}세션 · GA4`)
      : quickCard('주요 유입 경로', '—', Array.isArray(rum?.referrers) ? '기록된 외부 유입 경로 없음' : statusText(snapshot ? rum : null));

  const errors = http?.summary?.serverErrors ?? worker?.summary?.errors;
  const slow = cfExperience.map(definition => ({
    ...definition, value: web?.[definition.key],
    rating: performanceRating(web?.[definition.key], definition)[0],
  }));
  const priority = slow.find(metric => metric.rating === 'poor') ?? slow.find(metric => metric.rating === 'watch');
  const health = snapshot?.health;
  let action;
  if (health?.status === 'error') {
    action = quickCard('먼저 확인할 것', '사이트 응답', '마지막 조회에서 응답을 확인하지 못했습니다.', 'attention');
  } else if (errors > 0) {
    action = quickCard('먼저 확인할 것', '사이트 오류', `선택 기간 ${count(errors)}건 · Cloudflare`, 'attention');
  } else if (priority) {
    const task = {lcpP75Ms: '화면 표시 속도', inpP75Ms: '클릭·탭 반응', clsP75: '화면 흔들림'};
    action = quickCard('먼저 확인할 것', task[priority.key], `${valueText(priority.value, priority.format)} · 개선 필요`, 'attention');
  } else if (slow.some(metric => Number.isFinite(metric.value))) {
    action = quickCard('방문 경험', '양호', '측정된 항목이 모두 권장 범위입니다.');
  } else {
    action = quickCard('방문 경험', '—', snapshot ? '측정값 없음' : '조회 중');
  }
  const gaStatus = (value, description) => {
    if (Number.isFinite(value)) return description + ' · GA4';
    if (!snapshot) return '조회 중 · GA4';
    return (google?.status === 'ok' ? '집계 없음' : stateNames[sourceState(google)]) + ' · GA4';
  };
  const activeUsers = ga?.activeUsers;
  const engagementSeconds = ga?.avgEngagementSeconds;
  elements.primaryMetrics.replaceChildren(
    quickCard('활동한 방문자', valueText(activeUsers, value => `${count(value)}명`),
      gaStatus(activeUsers, '선택 기간에 활동한 사용자 수')),
    quickCard('방문자당 평균 이용 시간', valueText(engagementSeconds, duration),
      gaStatus(engagementSeconds, '공연장 페이지가 화면에 표시된 시간')),
  );
  elements.supportingMetrics.replaceChildren(visit, acquisition, action);
}

function paintGoogleSummary(google) {
  const metrics = googleSummary.map((definition) => metricCard(definition, 'google', google, google?.data?.summary));
  elements.googleSummary.replaceChildren(...metrics);

  const {status, message} = google ?? {};
  elements.googleNotice.hidden = !message || status === 'ok';
  elements.googleNotice.textContent = elements.googleNotice.hidden ? '' : message;
}

function paintComparison(google, rum) {
  const panel = element('div', 'panel source-comparison');
  const ga = google?.data;
  const googleRows = {...ga?.breakdowns, countries: ga?.countries, devices: ga?.devices,
    topPages: ga?.topPages, entryPages: ga?.breakdowns?.landingPages};
  const cloudflareRows = {...rum?.breakdowns, topPages: rum?.topPages};
  panel.append(element('p', 'panel-meta', 'GA4는 방문자와 세션을, Cloudflare는 사이트 진입과 페이지 열람을 집계합니다. 각 표의 단위를 함께 확인하세요.'));
  panel.append(datasetPicker('비교 항목', 'source-comparison', comparisonDefinitions,
    ([key, title, gaMeasure, cfMeasure, formatName, cfFormat]) => {
      const columns = element('div', 'source-comparison-grid');
      for (const [source, result, rows, measure, format] of [
        ['google', google, googleRows[key], gaMeasure, formatName],
        ['rum', rum, cloudflareRows[key], cfMeasure, cfFormat ?? formatName],
      ]) {
        const column = element('div', 'source-comparison-column');
        column.append(element('h3', '', sourceNames[source]));
        column.append(Array.isArray(rows)
          ? rankedData(rows, title, measure, format)
          : element('p', 'empty', statusText(result)));
        columns.append(column);
      }
      return columns;
    }));
  elements.comparison.replaceChildren(panel);
}

function paintAudience(google) {
  const data = google?.data;
  const sources = makePanel('어디서 왔나요?');
  const sourceRows = data?.breakdowns?.sourceMedium;
  sources.append(data
    ? rankedData(sourceRows, '유입 출처 / 매체', '세션 수', name =>
      /^(?:[a-z0-9-]+\.)*threads\.(?:net|com) \/ |^threads \/ /i.test(name) ? `스레드 · ${name}` : name)
    : element('p', 'empty', statusText(google)));
  if (sourceRows?.length) sources.append(element('p', 'panel-meta', 'GA4가 각 세션에 부여한 출처입니다. 재방문에는 이전 유입 출처가 표시될 수 있습니다.'));
  const trend = makePanel('방문 추이');
  appendChart(trend, '일별 방문', data?.daily, googleDaily, 'google', statusText(google));
  const nodes = [sources, trend];
  if (data) {
    const behavior = makePanel('방문 후 어떤 행동을 했나요?', true);
    behavior.append(metricGrid(googleEngagement, 'google', google, data.summary));
    nodes.push(behavior);
    const journey = makePanel('음악 감상은 얼마나 이어졌나요?');
    const result = data.playbackJourney;
    if (result?.started > 0) {
      journey.append(element('p', '', `재생을 시작한 사용자 ${count(result.started)}명 중 ${count(result.reachedThreeMinutes)}명이 같은 방문에서 누적 3분까지 재생했습니다 (${percent(result.rate)}).`));
    } else {
      journey.append(element('p', 'empty', '이 기간에 같은 방문의 재생 시작과 3분 도달을 비교할 수 있는 기록이 없습니다.'));
    }
    const activity = makePanel('공연장 이용 기록', true);
    activity.id = 'hall-activity';
    const existing = element('div');
    existing.append(
      element('h4', '', '기존 GA4 이용 기록'),
      rankedData(data.events, '행동', '발생 횟수', name => eventNames.get(name) ?? name),
    );
    const actions = element('div');
    actions.append(element('h4', '', '관객이 누른 공연장 기능'));
    const clickRows = data.breakdowns?.hallActions;
    if (Array.isArray(clickRows) && clickRows.length === 0) {
      actions.append(element('p', 'panel-meta', '이 기간에 기능별 클릭 기록이 없습니다. 클릭 수집을 운영 공연장에 반영한 이후부터 표시됩니다.'));
    } else {
      actions.append(rankedData(clickRows, '공연장 기능', '누른 횟수'));
    }
    const activityColumns = element('div', 'detail-grid hall-activity-grid');
    activityColumns.append(existing, actions);
    activity.append(activityColumns);
    nodes.push(journey, activity);
    if (data.breakdowns || data.keyEventNames) {
      const breakdowns = {...data.breakdowns, channels: data.channels, keyEventNames: data.keyEventNames};
      nodes.push(detailSection('panel wide report-details', '유입 캠페인과 방문자 분석',
        datasetPicker('분류 기준', 'google-breakdowns', googleBreakdownDefinitions, ([key, title, measure, formatName]) =>
          rankedData(breakdowns[key], title, measure, formatName), googleBreakdownGroups)));
    }
    const additional = googleAdditionalMetrics.filter(({key}) => Number.isFinite(data.summary?.[key]));
    if (additional.length) {
      nodes.push(detailSection('panel wide report-details', '참여 및 행동 상세',
        metricGrid(additional, 'google', google, data.summary)));
    }
    if (data.realtime) {
      const realtime = [
        metric('활동한 방문자', 'activeUsers', count),
        metric('이벤트', 'eventCount', count),
        metric('주요 행동', 'keyEvents', count),
        metric('화면 및 페이지 조회', 'views', count),
      ];
      const details = detailSection('panel wide report-details', '최근 30분 실시간',
        metricGrid(realtime, 'google', google, data.realtime));
      if (data.realtime.breakdowns) {
        details.append(datasetPicker('분류 기준', 'google-realtime', realtimeBreakdownDefinitions,
          ([key, title, measure, formatName]) => rankedData(data.realtime.breakdowns[key], title, measure, formatName)));
      }
      nodes.push(details);
    }
    if (data.commerce && Object.values(data.commerce).some(Number.isFinite)) {
      let money = count;
      if (/^[A-Z]{3}$/.test(data.commerce.currencyCode ?? '')) {
        const currency = new Intl.NumberFormat('ko-KR', {style: 'currency', currency: data.commerce.currencyCode});
        money = (value) => currency.format(value);
      }
      const commerce = [
        metric('거래', 'transactions', count),
        metric('구매', 'purchases', count),
        metric('구매자', 'purchasers', count),
        metric('장바구니 추가', 'addToCarts', count),
        metric('결제 시작', 'checkouts', count),
        metric('구매 매출', 'purchaseRevenue', money),
        metric('전체 매출', 'totalRevenue', money),
        metric('환불', 'refundAmount', money),
        metric('광고 수익', 'adRevenue', money),
        metric('광고비', 'adCost', money),
        metric('광고 클릭', 'adClicks', count),
        metric('광고 노출', 'adImpressions', count),
        metric('클릭당 비용', 'costPerClick', money),
        metric('주요 행동당 비용', 'costPerKeyEvent', money),
        metric('광고비 대비 매출', 'returnOnAdSpend', (value) => `${count(value)}배`),
      ].filter(({key}) => Number.isFinite(data.commerce[key]));
      nodes.push(detailSection('panel wide report-details', '매출 및 광고',
        metricGrid(commerce, 'google', google, data.commerce)));
    }
  }
  const warnings = google?.warnings ?? data?.warnings;
  if (warnings?.length) {
    const details = makePanel('Google Analytics 일부 지표', true);
    const list = element('ul', 'warning-list');
    list.append(...warnings.map((warning) => element('li', '', warning)));
    details.append(list);
    nodes.push(details);
  }
  elements.audience.replaceChildren(...nodes);
}

function cloudflareTraffic(rum, traffic, source, days) {
  const hasVisits = Boolean(rum?.summary);
  const panel = element('section', 'cf-block cloudflare-traffic');
  panel.append(element('h3', '', hasVisits ? '방문 흐름' : '사이트 요청 흐름'));
  const result = hasVisits ? rum : traffic;
  if (!result?.summary) {
    panel.append(element('p', 'empty', statusText(rum?.status === 'error' ? rum : result)));
    return panel;
  }
  const definitions = hasVisits ? cfVisits : [metric(
    '사이트 요청', 'requests', count,
    '페이지·파일을 불러오는 요청과 자동 접근이 포함됩니다. 방문 한 번에 여러 건이 잡힐 수 있습니다.',
  )];
  const totals = element('dl', 'cf-totals');
  for (const definition of definitions) {
    const item = element('div', 'cf-total');
    item.title = definition.description;
    item.append(
      element('dt', '', definition.title),
      element('dd', 'value', valueText(result.summary[definition.key], definition.format)),
    );
    totals.append(item);
  }
  panel.append(totals);
  if (!hasVisits) panel.append(element('p', 'panel-meta', definitions[0].description));
  appendChart(panel, hasVisits ? '일별 흐름' : '일별 요청', result.daily, definitions, hasVisits ? 'rum' : source, statusText(result));
  if (hasVisits && days > 7) {
    panel.append(element('p', 'panel-meta cf-sampling', '7일보다 긴 기간의 집계는 Cloudflare 표본 기반 추정치입니다.'));
  }
  return panel;
}

function cloudflareReferrers(rum) {
  const panel = element('section', 'cf-block cf-referrers');
  panel.append(element('h3', '', '유입 사이트'));
  const rows = rum?.referrers;
  if (!rows?.length) {
    const message = rows ? '이 기간에 기록된 유입이 없습니다.' : statusText(rum);
    panel.append(element('p', 'empty', message));
  } else {
    const list = element('ul', 'cf-referrer-list');
    const largest = Math.max(...rows.map(({value}) => value), 1);
    for (const {name, value} of rows) {
      const item = element('li');
      const unattributed = name === '유입 주소 없음';
      if (unattributed) item.dataset.unattributed = 'true';
      const line = element('div', 'cf-referrer-line');
      line.append(element('span', '', name), element('strong', '', `${count(value)}건`));
      const bar = element('div', 'cf-rank-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = element('span');
      fill.style.setProperty('--rank-width', `${Math.min(100, value / largest * 100)}%`);
      bar.append(fill);
      item.append(line, bar);
      list.append(item);
    }
    panel.append(list);
    if (rows.some(({name}) => name === '유입 주소 없음')) {
      panel.append(element('p', 'panel-meta', '직접 접속하거나 출처 정보를 전달하지 않은 방문이 포함됩니다.'));
    }
  }
  return panel;
}

function cloudflareAudience(rum) {
  return detailSection('cf-block cf-audience report-details', '외부 유입 페이지·브라우저 버전·이동 방식',
    datasetPicker('분류 기준', 'cf-breakdowns', cfBreakdownDefinitions, ([key, title, measure, formatName]) =>
      rankedData(rum.breakdowns[key], title, measure, formatName)));
}

function performanceRating(value, {good, poor}) {
  if (!Number.isFinite(value)) return ['neutral', '측정 없음'];
  if (value <= good) return ['good', '양호'];
  if (value <= poor) return ['watch', '개선 필요'];
  return ['poor', '우선 개선'];
}

function cloudflareExperience(rum) {
  const panel = element('section', 'cf-block cloudflare-experience');
  panel.append(element('h3', '', '방문 경험'));
  if (!rum?.summary) {
    panel.append(element('p', 'empty', statusText(rum)));
    return panel;
  }

  const readings = cfExperience.map((definition) => ({
    definition, value: rum.summary[definition.key], rating: performanceRating(rum.summary[definition.key], definition),
  }));
  const priority = readings.find(({rating}) => rating[0] === 'poor')
    ?? readings.find(({rating}) => rating[0] === 'watch');
  if (priority) {
    const message = {
      lcpP75Ms: '첫 화면이 나타나는 속도를 먼저 점검하세요.',
      inpP75Ms: '클릭하거나 탭한 뒤 화면이 반응하는 속도를 먼저 점검하세요.',
      clsP75: '페이지를 열 때 화면 요소가 움직이는지 먼저 점검하세요.',
    }[priority.definition.key];
    panel.append(element('p', 'cf-priority', message));
  }
  const list = element('dl', 'experience-list');
  for (const {definition, value, rating: [rating, label]} of readings) {
    const item = element('div', 'experience-item');
    item.title = definition.description;
    const details = element('dd', 'experience-reading');
    const pill = element('span', 'experience-status', label);
    pill.dataset.rating = rating;
    if (Number.isFinite(value)) details.append(element('strong', '', valueText(value, definition.format)));
    details.append(pill);
    item.append(element('dt', '', definition.title), details);
    list.append(item);
  }
  panel.append(list);
  if (readings.some(({value}) => Number.isFinite(value))) {
    panel.append(element('p', 'panel-meta', '실제 브라우저에서 측정한 값입니다. 측정값 4개 중 3개가 표시된 수치 이내였습니다.'));
  }
  const delays = cfDelayDefinitions.filter(({key}) => Number.isFinite(rum.summary.delays?.[key]));
  const pageTiming = cfTimingDefinitions.filter(({key}) => Number.isFinite(rum.timings?.[key]));
  if (rum.performance || rum.summary.quality || delays.length || pageTiming.length || cfAdditionalPerformance.some(({key}) => Number.isFinite(rum.summary[key]))) {
    const details = detailSection('report-details', '기기·페이지별 성능과 문제 요소');
    const timings = cfAdditionalPerformance.filter(({key}) => Number.isFinite(rum.summary[key]));
    if (timings.length) details.append(metricGrid(timings, 'rum', rum, rum.summary));
    if (rum.performance) {
      const measures = [
        metric('측정 건수', 'count', count),
        metric('주요 화면 표시', 'lcpP75Ms', ms),
        metric('상호작용 응답', 'inpP75Ms', ms),
        metric('화면 흔들림', 'clsP75', (value) => layoutScore.format(value)),
        ...cfAdditionalPerformance,
      ];
      details.append(
        datasetPicker('비교 기준', 'cf-performance', cfPerformanceDefinitions, ([key, title, formatName]) => {
          const rows = rum.performance[key];
          if (!rows?.length) return rankedData(rows, title, '');
          const focus = {slowContent: 'lcpP75Ms', slowInteractions: 'inpP75Ms', layoutShifts: 'clsP75'}[key];
          const columns = measures.filter(({key}) =>
            (!focus || key === focus || key === 'count') && rows.some((row) => Number.isFinite(row[key])));
          return measureTable(rows, title, columns, formatName);
        }),
      );
    }
    if (delays.length) {
      details.append(element('h4', 'report-subheading', '표시와 반응이 지연된 단계'),
        metricGrid(delays, 'rum', rum, rum.summary.delays));
    }
    if (pageTiming.length) {
      details.append(element('h4', 'report-subheading', '페이지 로딩 단계별 시간'),
        metricGrid(pageTiming, 'rum', rum, rum.timings));
    }
    if (rum.summary.quality) {
      const names = {lcp: '주요 화면 표시', inp: '상호작용 응답', cls: '화면 흔들림', fcp: '첫 콘텐츠 표시', ttfb: '서버 첫 응답'};
      const quality = Object.entries(rum.summary.quality)
        .filter(([, value]) => value && typeof value === 'object')
        .map(([key, value]) => ({name: names[key] ?? key, ...value}));
      if (quality.length) {
        details.append(element('h4', 'report-subheading', '성능 등급별 측정 건수'), measureTable(quality, '성능 지표', [
          metric('양호', 'good', count),
          metric('개선 필요', 'needsImprovement', count),
          metric('우선 개선', 'poor', count),
          metric('전체', 'total', count),
        ]));
      }
    }
    panel.append(details);
  }
  return panel;
}

function cloudflareReliability(worker, http, health) {
  const panel = detailSection('cf-block cloudflare-reliability report-details', '사이트 요청·오류·서버 상태');
  for (const [source, result, definitions] of [
    ['worker', worker, workerDefinitions],
    ['http', http, httpDefinitions],
  ]) {
    const group = element('section', 'report-server-group');
    group.append(element('h4', 'report-subheading', sourceNames[source]));
    if (result?.summary) {
      group.append(metricGrid(definitions.filter(({key}) => key in result.summary), source, result, result.summary));
      const daily = definitions.filter(({key}) => result.daily?.some((row) => key in row));
      if (daily.length) appendChart(group, '일별 서버 지표', result.daily, daily, source, statusText(result));
      if (source === 'worker' && result.breakdowns) {
        group.append(datasetPicker('요청 분류', 'worker-breakdowns', workerBreakdownDefinitions,
          ([key, title, measure]) => rankedData(result.breakdowns[key], title, measure)));
      }
    } else {
      const message = source === 'http' && result?.status === 'unconfigured'
        ? 'Cloudflare에서 관리하는 자체 도메인이 연결되면 HTTP 요청과 전송량을 표시합니다.'
        : statusText(result);
      group.append(element('p', 'panel-meta', message));
    }
    panel.append(group);
  }
  if (health?.status === 'ok' || health?.status === 'error') {
    const group = element('section', 'report-server-group');
    group.append(element('h4', 'report-subheading', '현재 사이트 응답'));
    const label = health.status === 'ok' ? '응답 확인됨' : '응답 확인 실패';
    const readings = [label];
    if (Number.isFinite(health.httpStatus)) readings.push(`HTTP ${health.httpStatus}`);
    if (Number.isFinite(health.latencyMs)) readings.push(ms(health.latencyMs));
    group.append(element('p', 'panel-meta', readings.join(' · ')));
    panel.append(group);
  }
  return panel;
}

function paintInfrastructure(cloudflare, health, range) {
  const {http, worker, rum} = cloudflare ?? {};
  const source = http?.summary || (!worker?.summary && http?.status === 'error') ? 'http' : 'worker';
  const traffic = source === 'http' ? http : worker;
  const panels = [
    cloudflareTraffic(rum, traffic, source, range?.days),
    cloudflareReferrers(rum),
    rum?.breakdowns ? cloudflareAudience(rum) : null,
    cloudflareExperience(rum),
    cloudflareReliability(worker, http, health),
  ];
  const date = range?.startDate === range?.endDate ? range?.endDate : `${range?.startDate} ~ ${range?.endDate}`;
  elements.cloudflarePeriod.hidden = !range;
  elements.cloudflarePeriod.textContent = range ? `${date} (${range.timeZone ?? 'UTC'})` : '';
  if (rum?.status === 'partial' && rum.message) {
    panels.push(element('p', 'cf-block cf-note panel-meta', rum.message));
  }
  elements.infrastructure.replaceChildren(...panels.filter(Boolean));
  return aggregateState([rum, worker, http].filter(Boolean));
}

function aggregateState(results) {
  const states = results.map(({status}) => status);
  const statuses = states.filter((status) => status !== 'unconfigured');
  if (states.length && statuses.length === 0) return 'unconfigured';
  if (statuses.length === 0) return 'loading';
  if (statuses.every((status) => status === 'ok')) return 'ok';
  if (statuses.some((status) => status === 'ok' || status === 'partial')) return 'partial';
  return statuses.includes('error') ? 'error' : 'unconfigured';
}

function paintBadge(source, state, result) {
  const badge = query(`[data-source="${source}"]`);
  const updated = sourceBadge(source, state, result);
  updated.dataset.source = source;
  badge.replaceWith(updated);
}

function paint(snapshot) {
  paintQuickOverview(snapshot);
  paintGoogleSummary(snapshot?.google);
  paintComparison(snapshot?.google, snapshot?.cloudflare?.rum);
  paintAudience(snapshot?.google);
  const cloudflareStatus = paintInfrastructure(snapshot?.cloudflare, snapshot?.health, snapshot?.range);
  paintBadge('google', sourceState(snapshot?.google), snapshot?.google);
  paintBadge('cloudflare', cloudflareStatus);
}

function busy(isBusy) {
  elements.refresh.disabled = isBusy;
  for (const section of [elements.summary, elements.googleSummary, elements.comparison, elements.audience, elements.infrastructure]) {
    section.setAttribute('aria-busy', String(isBusy));
  }
}

const allowedDays = ['1', '7', '14', '30'];
let days = new URL(window.location.href).searchParams.get('days');
if (!allowedDays.includes(days)) days = '7';
query(`input[name="days"][value="${days}"]`).checked = true;
let pending = null;
let explanationSnapshot = null;
let explanationRequest = null;

function resetExplanation(message, snapshot = null) {
  explanationRequest?.abort();
  explanationRequest = null;
  explanationSnapshot = snapshot;
  elements.explain.disabled = !snapshot;
  elements.explanationStatus.textContent = message;
  elements.explanationText.textContent = '';
}

async function requestExplanation() {
  if (!explanationSnapshot || explanationRequest) return;
  const request = new AbortController();
  explanationRequest = request;
  elements.explain.disabled = true;
  elements.explanationStatus.textContent = 'Codex가 관객 경험에 미친 영향과 확인할 점을 분석하고 있습니다…';
  try {
    const response = await fetch(`/api/explanation?snapshot=${encodeURIComponent(explanationSnapshot)}`, {
      method: 'POST',
      signal: request.signal,
    });
    const result = await response.json();
    if (request.signal.aborted) return;
    if (!response.ok) {
      elements.explanationStatus.textContent = result.error || 'Codex 분석을 완료하지 못했습니다.';
      return;
    }
    if (typeof result.explanation !== 'string' || !result.explanation.trim()) throw new Error();
    elements.explanationText.textContent = result.explanation;
    elements.explanationStatus.textContent = '분석 완료';
  } catch {
    if (!request.signal.aborted) {
      elements.explanationStatus.textContent = 'Codex 분석을 불러오지 못했습니다. 다시 시도해 주세요.';
    }
  } finally {
    if (!request.signal.aborted) {
      explanationRequest = null;
      elements.explain.disabled = false;
    }
  }
}

function errorSnapshot() {
  const failure = {status: 'error', message: '대시보드 서버에서 응답을 받지 못했습니다.'};
  return {google: failure, cloudflare: {http: failure, worker: failure, rum: failure}};
}

function marketingPeriod({google, range, requestedAt}) {
  const timeZone = google.data?.timeZone;
  if (!timeZone || !requestedAt) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(new Date(requestedAt));
    const unit = (name) => Number(parts.find(({type}) => type === name)?.value);
    const end = new Date(Date.UTC(unit('year'), unit('month') - 1, unit('day')));
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - range.days + 1);
    const format = new Intl.DateTimeFormat('ko-KR', {month: 'long', day: 'numeric', timeZone: 'UTC'});
    return range.days === 1 ? format.format(end) : `${format.format(start)} ~ ${format.format(end)}`;
  } catch {
    return '';
  }
}

async function refresh() {
  pending?.abort();
  const request = new AbortController();
  pending = request;
  busy(true);
  resetExplanation('지표를 조회하는 중입니다.');
  elements.notice.hidden = true;
  elements.period.textContent = '';
  elements.googlePeriod.textContent = '';
  elements.updated.textContent = '최신 집계 조회 중…';
  paint(null);
  try {
    const response = await fetch(`/api/analytics?days=${days}`, {
      cache: 'no-store',
      headers: {Accept: 'application/json'},
      signal: request.signal,
    });
    if (!response.ok) throw new Error(`Dashboard HTTP ${response.status}`);
    const snapshot = await response.json();
    if (request.signal.aborted) return;
    if (!snapshot.range || !snapshot.google || !snapshot.cloudflare) throw new Error('Invalid dashboard response');
    paint(snapshot);
    resetExplanation(snapshot.explanationId
      ? '관객이 공연을 듣는 데 어떤 영향이 있었고 무엇을 먼저 확인할지 분석합니다.'
      : '선택한 기간에 분석할 수 있는 집계가 없습니다.', snapshot.explanationId);
    const period = marketingPeriod(snapshot);
    elements.googlePeriod.textContent = period ? `${period} (${snapshot.google.data.timeZone})` : '';
    const {startDate, endDate, timeZone} = snapshot.range;
    const dates = startDate === endDate ? endDate : `${startDate} ~ ${endDate}`;
    const zoneLabel = timeZone === 'Asia/Seoul' ? '한국시간 0시 기준' : timeZone;
    const gaZone = snapshot.google.data?.timeZone;
    elements.period.textContent = gaZone && gaZone !== timeZone
      ? `Cloudflare ${dates} (${zoneLabel}) · GA4 ${elements.googlePeriod.textContent}`
      : `${dates} (${zoneLabel})`;
    if (snapshot.completedAt) elements.updated.textContent = `마지막 조회 ${timestamp(snapshot.completedAt)}`;
    else elements.updated.textContent = '조회 완료';
  } catch {
    if (request.signal.aborted) return;
    paint(errorSnapshot());
    resetExplanation('지표를 다시 조회한 뒤 분석할 수 있습니다.');
    elements.notice.textContent = '대시보드 서버에 연결하지 못했습니다. 서버가 실행 중인지 확인하고 다시 새로고침해 주세요.';
    elements.notice.hidden = false;
    elements.updated.textContent = '조회 실패';
  } finally {
    if (!request.signal.aborted) {
      pending = null;
      busy(false);
    }
  }
}

function setNavigation() {
  const active = window.location.hash || '#overview';
  const target = document.getElementById(active.slice(1));
  const report = target?.closest('details');
  if (report) report.open = true;
  const navTarget = target?.closest('#reports') ? '#reports' : active;
  for (const link of document.querySelectorAll('.sidebar nav a')) {
    if (link.getAttribute('href') === navTarget) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (active === '#overview') window.scrollTo({top: 0, behavior: 'instant'});
  else target?.scrollIntoView({behavior: 'instant'});
}

window.addEventListener('hashchange', setNavigation);
for (const link of document.querySelectorAll('.sidebar nav a, .sidebar .brand')) {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = link.getAttribute('href');
    if (target !== window.location.hash) window.history.pushState(null, '', target);
    setNavigation();
  });
}
elements.refresh.addEventListener('click', refresh);
elements.explain.addEventListener('click', requestExplanation);
elements.ranges.addEventListener('change', (event) => {
  if (!allowedDays.includes(event.target.value)) return;
  days = event.target.value;
  const url = new URL(window.location.href);
  url.searchParams.set('days', days);
  window.history.replaceState(null, '', url);
  refresh();
});
setNavigation();
const initialAnchor = window.location.hash;
await refresh();
if (initialAnchor && initialAnchor === window.location.hash) setNavigation();
