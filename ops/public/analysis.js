import {renderAnalysisAreas} from './analysis-areas.js';
import {mountSpatialMap, showActionReport} from './venue-map.js';

const byId = id => document.getElementById(id);
const end = byId('end');
const days = byId('days');
const status = byId('status');
const sources = [
  ['ga4', 'GA4', {activeUsers: '활성 사용자', sessions: '세션', screenPageViews: '조회수', eventCount: '이벤트 수'}],
  ['gsc', 'Search Console', {clicks: '클릭', impressions: '노출', ctr: '클릭률', position: '평균 게재순위'}],
];
const numbers = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 2});
function showHistory(archive) {
  const daily = byId('daily');
  daily.replaceChildren();
  for (const [source, label, fields] of sources) {
    const title = document.createElement('h3');
    title.textContent = label;
    daily.append(title);
    const rows = archive.sources[source].rows;
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = '이 기간에 보관한 일별 데이터가 없습니다.';
      daily.append(empty);
      continue;
    }
    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    for (const name of ['날짜', ...Object.values(fields)]) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = name;
      header.append(cell);
    }
    const body = table.createTBody();
    for (const item of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = item.date;
      for (const key of Object.keys(fields)) {
        const value = item[key];
        row.insertCell().textContent = !Number.isFinite(value) ? '—' :
          key === 'ctr' ? numbers.format(value * 100) + '%' : numbers.format(value);
      }
    }
    daily.append(table);
  }
}
let latest = 0;
async function load() {
  const generation = ++latest;
  status.textContent = '로컬 기록을 읽는 중입니다.';
  byId('areas').replaceChildren();
  byId('daily').replaceChildren();
  try {
    const params = new URLSearchParams({days: days.value, end: end.value});
    const response = await fetch('/api/local-analysis?' + params);
    if (!response.ok) throw new Error();
    const snapshot = await response.json();
    if (generation !== latest) return;
    end.value = snapshot.endDate;
    renderAnalysisAreas(byId('areas'), snapshot);
    mountSpatialMap(byId('map'), snapshot);
    showActionReport(byId('action-report'), snapshot);
    showHistory(snapshot.archive);
    status.textContent = snapshot.completedAt
      ? '방문 리포트 조회 시각 ' + new Date(snapshot.completedAt).toLocaleString('ko-KR')
      : '선택한 기간의 방문 리포트 조회 결과가 없습니다. 로컬에 보관된 데이터만 표시합니다.';
  } catch {
    if (generation === latest) {
      mountSpatialMap(byId('map'), {spatialError:true});
      showActionReport(byId('action-report'));
    }
    if (generation === latest) status.textContent = '로컬 기록을 읽지 못했습니다. 날짜와 대시보드 서버를 확인해 주세요.';
  }
}
byId('import').addEventListener('click', async () => {
  const file = byId('csv').files[0];
  const feedback = byId('import-status');
  if (!file || file.size > 4 * 1024 * 1024) {
    feedback.textContent = '4 MiB 이하의 일별 CSV를 선택해 주세요.';
    return;
  }
  byId('import').disabled = true;
  try {
    const response = await fetch('/api/import-daily?source=' + byId('source').value, {
      method: 'POST', headers: {'Content-Type': 'text/csv'}, body: file,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    feedback.textContent = result.count + '일분을 로컬에 저장했습니다.';
    byId('csv').value = '';
    await load();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    byId('import').disabled = false;
  }
});
mountSpatialMap(byId('map'));
showActionReport(byId('action-report'));
for (const input of [end, days]) input.addEventListener('change', load);
byId('reload').addEventListener('click', load);
await load();
