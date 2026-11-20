const number = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 3});
const percent = new Intl.NumberFormat('ko-KR', {style: 'percent', maximumFractionDigits: 1});
const numeric = (value, unit = '') => Number.isFinite(value) ? number.format(value) + unit : '—';
const ratio = value => Number.isFinite(value) ? percent.format(value) : '—';

function measures(values, fields) {
  const rows = fields.filter(([key]) => Number.isFinite(values?.[key]))
    .map(([key, label, format = numeric]) => [label, format(values[key])]);
  return {headers: ['지표', '측정값'], rows};
}

function ranking(data, label, measure) {
  const rows = (data ?? []).filter(row => typeof row.name === 'string' && Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value).slice(0, 10)
    .map(row => [row.name, numeric(row.value)]);
  return {headers: [(rows.length === 10 ? label + ' · 상위 10개' : label), measure], rows};
}

function daily(source, fields) {
  const rows = (source?.rows ?? []).filter(row => fields.some(([key]) => Number.isFinite(row[key])))
    .slice().sort((a, b) => b.date.localeCompare(a.date))
    .map(row => [row.date, ...fields.map(([key, , format = numeric]) => format(row[key]))]);
  return {headers: ['날짜', ...fields.map(([, label]) => label)], rows};
}

function searchTotals(rows = []) {
  const pairs = rows.filter(row => Number.isFinite(row.clicks) && Number.isFinite(row.impressions));
  if (!pairs.length) return measures({}, []);
  const clicks = pairs.reduce((total, row) => total + row.clicks, 0);
  const impressions = pairs.reduce((total, row) => total + row.impressions, 0);
  return measures({days: pairs.length, clicks, impressions, ctr: impressions > 0 ? clicks / impressions : null}, [
    ['days', '클릭·노출이 함께 기록된 날짜'], ['clicks', '해당 날짜의 클릭 합계'],
    ['impressions', '해당 날짜의 노출 합계'], ['ctr', '해당 날짜의 전체 클릭률', ratio],
  ]);
}

function searchQueryTable(report) {
  const rows = [...(report?.rows ?? [])].sort((a,b) =>
    (b.clicks ?? -1) - (a.clicks ?? -1) || (b.impressions ?? -1) - (a.impressions ?? -1));
  const caption = report?.importedAt ? 'Search Console 검색어 · ' + report.startDate + ' ~ ' + report.endDate +
    (rows.length > 100 ? ' · 가져온 ' + numeric(rows.length) + '개 중 상위 100개' : '') : '';
  return {caption, headers:['검색어', '클릭', '노출', 'CTR', '평균 게재순위'],
    rows: rows.slice(0,100).map(row => [row.query,numeric(row.clicks),numeric(row.impressions),ratio(row.ctr),numeric(row.position)])};
}

function statusFor(result) {
  if (result?.status === 'unconfigured') return '계정 연결·설정 필요';
  if (result?.status === 'error') return '조회 실패';
  if (result?.status === 'partial') return '일부 보고서 조회 실패';
  return '선택 기간에 조회된 행 없음';
}

function actionCounts(actions, names, label) {
  return ranking(actions.filter(row => names.includes(row.name)), label, '조작 횟수');
}

function eventCounts(events, labels) {
  return ranking(events.filter(row => Object.hasOwn(labels, row.name))
    .map(row => ({name: labels[row.name], value: row.value})), '이벤트', '발생 횟수');
}

function observedTimes(samples, groupOf, label, includeDwell = true) {
  const groups = new Map();
  for (const row of samples) {
    const key = groupOf(row);
    if (!key) continue;
    const group = groups.get(key) ?? {visits: new Set(), dwellMs: null, playbackMs: null};
    group.visits.add(row.visit);
    for (const measure of ['dwellMs', 'playbackMs']) {
      if (Number.isFinite(row[measure])) group[measure] = (group[measure] ?? 0) + row[measure];
    }
    groups.set(key, group);
  }
  const seconds = ms => ms == null ? '—' : numeric(ms / 1000);
  return {caption: '가져온 개발 방문 표본', headers: [label, '관측 방문', ...(includeDwell ? ['체류(초)'] : []), '재생(초)'],
    rows: [...groups].sort((a,b) => (b[1].dwellMs ?? 0) - (a[1].dwellMs ?? 0))
      .map(([key,g]) => [key, numeric(g.visits.size), ...(includeDwell ? [seconds(g.dwellMs)] : []), seconds(g.playbackMs)])};
}

function observedListening(samples) {
  const visits = new Map();
  for (const row of samples) {
    if (Number.isFinite(row.playbackMs)) visits.set(row.visit, (visits.get(row.visit) ?? 0) + row.playbackMs);
  }
  const times = [...visits.values()];
  const rows = times.length ? [
    ['관측 재생 시간 합계(초)', numeric(times.reduce((a,b) => a+b, 0)/1000)],
    ...[3,5,10,30,60].map(minutes => [minutes + '분 이상 관측된 방문', numeric(times.filter(ms => ms >= minutes*60000).length)]),
  ] : [];
  return {caption: '가져온 개발 방문 · 조회 범위 내 재생 표본', headers: ['관측 지표', '측정값'], rows};
}

function areaLabel(row) {
  const hall = {classical: '클래식', jazz: '재즈'}[row.hall] ?? row.hall;
  const zone = {lobby: '로비', auditorium: '공연장'}[row.zone] ?? row.zone;
  const area = {front:'무대 앞', middle:'중앙', rear:'뒤쪽', lobby:'로비'}[row.area] ?? row.area;
  return [hall, zone, row.floor+'층', area].join(' · ');
}

export function analysisAreas(snapshot) {
  const ga = snapshot?.google?.data ?? {};
  const cloudflare = snapshot?.cloudflare ?? {};
  const events = ga.events ?? [];
  const actions = ga.breakdowns?.hallActions ?? [];
  const gsc = snapshot?.archive?.sources?.gsc;
  const samples = snapshot?.spatial?.samples ?? [];
  const gaState = snapshot?.google ? statusFor(snapshot.google) : '해당 기간 방문 리포트 조회 필요';
  function report(title, tables, note, source = 'GA4', empty = gaState) {
    const observed = tables.filter(table => table.rows.length);
    const hasLocalSamples = observed.some(table => table.caption?.startsWith('가져온 개발 방문'));
    if (hasLocalSamples) source += ' · 로컬 개발 방문';
    const partialSample = snapshot?.spatial?.truncated && hasLocalSamples;
    return {title, tables: observed, source, missing: empty,
      note: note + (partialSample ? ' 조회 상한으로 개발 방문 표본의 처음 4,000건만 포함합니다.' : ''),
      state: observed.length ? '측정값 있음' : empty};
  }
  const localOnly = (title, tables, note) => report(title, tables, note, '오프라인 행동 계측', '이 기간에 해당 개발 기록 없음');
  const updateRows = (snapshot?.updates?.rows ?? []).map(change => {
    const daily = snapshot?.archive?.sources?.ga4?.rows ?? [];
    const day = Date.parse(change.date);
    function meanSessions(lower, upper) {
      const rows = daily.filter(row => Number.isFinite(row.sessions) &&
        Date.parse(row.date) >= lower && Date.parse(row.date) < upper);
      return rows.length ? numeric(rows.reduce((sum,row) => sum+row.sessions,0)/rows.length) + ' (' + rows.length + '일)' : '—';
    }
    return [change.date, change.kind, change.label, meanSessions(day-7*86400000, day),
      meanSessions(day+86400000, day+8*86400000)];
  });
  function localActions(labels) {
    const counts = new Map();
    for (const sample of samples) {
      if (Object.hasOwn(labels, sample.action)) {
        const label = labels[sample.action];
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    return {caption: '가져온 개발 방문 표본', headers: ['기록한 동작', '횟수'],
      rows: [...counts].map(([label, count]) => [label, numeric(count)])};
  }
  const crowdVisits = new Map();
  const seatCounts = new Map();
  const prior = new Map();
  const seatedIntervals = [];
  for (const row of samples) {
    if (['0','1','2-4','5+'].includes(row.others)) {
      const visits = crowdVisits.get(row.others) ?? new Set();
      visits.add(row.visit);
      crowdVisits.set(row.others, visits);
    }
    const previous = prior.get(row.visit);
    const action = /^hall_(selected|seated)_parterre_([0-9]+)$/.exec(row.action ?? '');
    if (action) {
      const label = action[1] === 'selected' ? '좌석 선택' : '착석 확인';
      seatCounts.set(label, (seatCounts.get(label) ?? 0) + 1);
    }
    if (row.seat) {
      const sameSeat = previous && previous.seat === row.seat && previous.floor === row.floor &&
        previous.zone === row.zone && previous.hall === row.hall && previous.seq + 1 === row.seq;
      seatedIntervals.push(sameSeat ? row : {...row, dwellMs:null, playbackMs:null});
    }
    prior.set(row.visit, row);
  }
  return [
    report('첫 재생 성공', [
      eventCounts(events, {playback_start: '실제 음원 진행 시작'}),
      measures(ga.playbackJourney, [['started', '재생 시작 사용자']]),
    ], '첫 터치 전후의 준비·시도·실패 횟수와 단계별 지연은 별도 계측이 필요합니다.'),
    report('누적 청취', [
      observedListening(samples),
      eventCounts(events, {
        playback_180_seconds: '누적 3분 도달',
      }),
      measures(ga.playbackJourney, [['started', '재생 시작 사용자'], ['reachedThreeMinutes', '같은 세션에서 누적 3분 도달 사용자'], ['rate', '같은 세션의 3분 도달률', ratio]]),
    ], '도달 횟수는 이정표를 통과한 이벤트 수입니다. 개발 방문 합계는 가져온 표본의 재생 시간만 더합니다. 운영 방문의 총 재생 시간은 별도 집계가 필요합니다.'),
    report('곡별 이용', [localActions({media_ended:'음원 자연 종료', user_skip_next:'다음 곡 선택', user_skip_previous:'이전 곡 선택'}), observedTimes(samples, row => row.track, '곡', false), actionCounts(actions, ['다음 곡 누르기'], '재생 조작')],
      '개발 방문의 곡별 재생 시간은 곡 식별자가 있는 표본을 사용합니다. 다음 곡 버튼 횟수는 스킵 완료를 보장하지 않습니다.'),
    report('플레이리스트', [localActions({playlist_change:'목록 변경'}), observedTimes(samples, row => row.playlist, '목록', false), actionCounts(actions, ['플레이리스트 열기', '공연 선택'], '목록 관련 조작')],
      '각 목록의 노출·선택·실제 재생을 구분하려면 목록 식별자와 동작 결과가 필요합니다.'),
    localOnly('음악 상태', [localActions({media_playing:'재생 진행', media_pause:'일시정지', media_waiting:'재생 대기', media_ended:'음원 종료', media_error:'재생 오류'})],
      '미디어 상태가 바뀐 횟수입니다. 재생 대기와 일시정지의 원인·지속 시간은 별도 기록이 필요합니다.'),
    report('첫 방문 진행', [eventCounts(events, {first_visit: 'GA4 첫 방문'}), measures(ga.summary, [['newUsers', 'GA4 신규 사용자']])],
      '첫 방문자의 입장·로딩·설정 단계별 진행과 실패는 아직 확인할 수 없습니다.'),
    report('기능 노출·접근', [actionCounts(actions, ['음악 패널 열기', '좌석 지도 열기', '플레이리스트 열기'], '열기 동작')],
      '열기 동작만 기록됩니다. 체험 근처로 접근한 횟수와 실제 화면에 노출된 횟수는 미집계입니다.'),
    localOnly('체험 이용', [localActions({tarot_open:'타로 열기', queen_open:'여왕 카드 열기'})],
      '체험을 연 횟수입니다. 체험의 완료와 취소는 별도 결과가 필요합니다.'),
    report('이동·체류', [observedTimes(samples, areaLabel, '홀·공간·층·구역'), actionCounts(actions, ['우주 공간 전환 누르기', '무대 앞으로 이동 누르기', '객석 뒤로 이동 누르기'], '이동 조작')],
      '개발 방문의 체류·재생 시간은 시간값이 있는 구간만 합산합니다. GA4 버튼 동작과 개발 표본은 출처가 다릅니다.'),
    report('좌석 이용', [
      localActions({seat_denied:'착석 거부', seat_stand:'일어남'}),
      {caption: '가져온 개발 방문 · 좌석 동작', headers: ['동작', '횟수'], rows: [...seatCounts].map(([name,n]) => [name,numeric(n)])},
      observedTimes(seatedIntervals, row => areaLabel(row) + ' · ' + row.seat, '관측 착석 좌석'),
      actionCounts(actions, ['좌석 지도 열기'], '좌석 화면 조작')],
      '선택과 착석 확인은 각각 집계합니다. 착석 중 시간은 같은 자리가 연속으로 관측된 구간만 더합니다.'),
    localOnly('다른 관객과 함께한 경험', [
      {caption:'가져온 개발 방문 표본', headers:['같은 공간의 다른 관객', '관측 방문'],
        rows: ['0','1','2-4','5+'].filter(group => crowdVisits.has(group)).map(group => [group+'명',numeric(crowdVisits.get(group).size)])}],
      '해당 인원 범위가 한 번이라도 관측된 방문 수입니다. 한 방문이 여러 범위에 포함될 수 있습니다. 본인과 NPC는 제외합니다.'),
    localOnly('조작 결과', [localActions({seat_denied:'착석 거부'})],
      '기록된 실패만 합산합니다. 모든 조작의 성공률이나 반복 시도 원인을 계산할 수 없습니다.'),
    report('오류·성능', [
      localActions({media_error:'재생 오류', media_waiting:'재생 대기'}),
      measures(cloudflare.rum?.summary, [['lcpP75Ms', '주요 콘텐츠 표시 · 75백분위', value => numeric(value, ' ms')],
        ['inpP75Ms', '입력 반응 · 75백분위', value => numeric(value, ' ms')], ['clsP75', '레이아웃 이동 · 75백분위']]),
      measures(cloudflare.worker?.summary, [['requests', 'Worker 요청'], ['errors', 'Worker 오류']]),
      measures(cloudflare.http?.summary, [['serverErrors', 'HTTP 5xx 응답']]),
    ], '음원 상태 이벤트는 개발 방문 단말에서 관측했습니다. Cloudflare 입력 반응 지연은 3D 프레임 시간과 별개입니다.', 'Cloudflare',
    cloudflare.rum ? statusFor(cloudflare.rum) : '해당 기간 방문 리포트 조회 필요'),
    report('공유·홍보', [
      ranking(ga.breakdowns?.manualCampaigns, 'UTM 캠페인', '세션'),
      ranking(ga.breakdowns?.manualAdContents, 'UTM 게시물 콘텐츠', '세션'),
      searchQueryTable(snapshot?.searchQueries),
      searchTotals(gsc?.rows),
      daily(gsc, [['clicks', '검색 클릭'], ['impressions', '검색 노출'], ['ctr', '검색 클릭률', ratio], ['position', '평균 게재순위']]),
    ], '게시물별 청취·재방문 연결과 공유 시도·결과는 미집계입니다. ' +
      (snapshot?.searchQueries?.importedAt ? (!snapshot.searchQueries.rows.length ? '이 기간에 가져온 검색어 보고서에 행이 없습니다.' : '검색어는 선택 기간과 일치하는 내보내기에서 가져왔습니다.') : '이 기간과 일치하는 Search Console 검색어 파일이 필요합니다.'),
      'GA4 · Search Console', snapshot?.searchQueries?.importedAt ? '가져온 검색어 행 없음' : gaState),
    report('업데이트 비교', [{headers:['변경일','종류','변경 내용','이전 일평균 세션','이후 일평균 세션'], rows:updateRows}],
      '변경 당일을 제외한 전후 7일 중 선택한 기간에 보관된 날짜만 비교합니다. 괄호는 포함된 날짜 수입니다. 변경의 인과 효과를 뜻하지 않습니다.',
      '운영 변경 기록 · GA4 일별 보관', snapshot?.updates?.error ? '로컬 변경 파일 조회 실패' : '미계측'),
    report('재방문 행동', [measures(ga.summary, [['returningUsers', '재방문 사용자']])],
      '재방문자의 음악·체험 이용과 청취 시간 변화는 방문 집단별 보고서가 필요합니다.'),
  ];
}

function textElement(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function dataTable({headers, rows, caption}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-scroll';
  const table = document.createElement('table');
  if (caption) table.createCaption().textContent = caption;
  const heading = table.createTHead().insertRow();
  for (const label of headers) {
    const header = textElement('th', label);
    header.scope = 'col';
    heading.append(header);
  }
  const body = table.createTBody();
  for (const cells of rows) {
    const row = body.insertRow();
    for (const cell of cells) row.insertCell().textContent = cell;
  }
  wrapper.append(table);
  return wrapper;
}

export function renderAnalysisAreas(container, snapshot) {
  const expanded = new Set([...container.querySelectorAll('details[open]')].map(node => node.dataset.area));
  const nodes = analysisAreas(snapshot).map(area => {
    const panel = document.createElement('details');
    panel.className = 'panel report-details';
    panel.dataset.area = area.title;
    panel.open = expanded.has(area.title);
    const label = textElement('summary', area.title);
    label.append(textElement('small', ' · ' + area.state, 'panel-meta'));
    panel.append(label, textElement('p', area.source, 'panel-meta'));
    if (area.tables.length) {
      for (const table of area.tables) panel.append(dataTable(table));
    } else {
      panel.append(textElement('p', snapshot ? area.missing : '조회 전', 'panel-meta'));
    }
    if (area.note) panel.append(textElement('p', area.note, 'panel-meta'));
    return panel;
  });
  container.replaceChildren(...nodes);
}
