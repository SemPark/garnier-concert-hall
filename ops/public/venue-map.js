export {mountSpatialMap} from './spatial-map.js';

export function showActionReport(container, snapshot) {
  const rows = (snapshot?.google?.data?.breakdowns?.hallActions ?? [])
    .filter(row => typeof row.name === 'string' && Number.isSafeInteger(row.value) && row.value >= 0)
    .sort((a,b) => b.value - a.value);
  const title = document.createElement('summary');
  title.textContent = 'GA4 · 공연장 기능 클릭';
  const details = document.createElement('details');
  details.className = 'report-details';
  details.append(title);
  const list = document.createElement('ol');
  for (const row of rows) {
    const item = document.createElement('li');
    item.textContent = row.name + ' · ' + row.value.toLocaleString('ko-KR') + '회';
    list.append(item);
  }
  const note = document.createElement('p');
  note.className = 'panel-meta';
  note.textContent = rows.length ? '선택한 기간에 보고된 기능 버튼별 클릭 횟수입니다.' : '선택한 기간의 기능 클릭 집계가 없습니다.';
  details.append(note,list);
  container.replaceChildren(details);
}
