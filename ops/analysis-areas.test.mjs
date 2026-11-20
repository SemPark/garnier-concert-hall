import assert from 'node:assert/strict';
import test from 'node:test';
import {analysisAreas} from './public/analysis-areas.js';

const requested = [
  '첫 재생 성공', '누적 청취', '곡별 이용', '플레이리스트', '음악 상태', '첫 방문 진행',
  '기능 노출·접근', '체험 이용', '이동·체류', '좌석 이용', '다른 관객과 함께한 경험', '조작 결과',
  '오류·성능', '공유·홍보', '업데이트 비교', '재방문 행동',
];

test('shows all 16 requested behavioral areas with explicit missing and connection states', () => {
  const reports = analysisAreas({google: {status: 'unconfigured'}});
  assert.deepEqual(reports.map(report => report.title), requested);
  assert.ok(reports.every(report => !report.tables.length && report.missing));
  assert.match(reports[0].state, /연결/);
  assert.equal(reports[14].state, '미계측');
  assert.match(reports[7].state,/개발 기록 없음/);
  assert.equal(analysisAreas({google: {status: 'error'}})[0].state, '조회 실패');
});

test('keeps action counts, reported playback events and user funnel in separate units', () => {
  const reports = analysisAreas({google: {data: {
    events: [{name: 'playback_start', value: 6}, {name: 'playback_180_seconds', value: 3}],
    playbackJourney: {started: 4, reachedThreeMinutes: 2, rate: 0.5},
    breakdowns: {hallActions: [{name: '좌석 지도 열기', value: 4}, {name: '다음 곡 누르기', value: 0}]},
  }}});
  assert.deepEqual(reports[0].tables[0].rows, [['실제 음원 진행 시작', '6']]);
  assert.deepEqual(reports[1].tables[0].rows, [['누적 3분 도달', '3']]);
  assert.deepEqual(reports[1].tables[1].rows.map(row => row[1]), ['4', '2', '50%']);
  assert.deepEqual(reports[2].tables[0].rows, [['다음 곡 누르기', '0']]);
  assert.deepEqual(reports[9].tables[0].rows, [['좌석 지도 열기', '4']]);
  assert.deepEqual(reports[10].tables, []);
});

test('search click-through rate uses only dates with both measured clicks and impressions', () => {
  const result = analysisAreas({archive: {sources: {gsc: {rows: [
    {date: '2026-01-01', clicks: 0, impressions: 2},
    {date: '2026-01-02', clicks: 2, impressions: 98},
    {date: '2026-01-03', clicks: 8},
  ]}}}})[13];
  assert.deepEqual(result.tables[0].rows.map(row => row[1]), ['2', '2', '100', '2%']);
  assert.equal(result.tables[1].rows.at(-1)[1], '0');
});

test('area aggregation separates hall and floor, counts a visit once, and keeps missing time distinct', () => {
  const base = {visit:'local-a',hall:'jazz',zone:'auditorium',area:'rear',floor:1,seat:null};
  const reports = analysisAreas({spatial:{truncated:true,samples:[
    {...base,dwellMs:3000,playbackMs:2000},
    {...base,dwellMs:1600,playbackMs:0},
    {...base,floor:2,dwellMs:null,playbackMs:null},
  ]}});
  const table = reports[8].tables[0];
  assert.equal(table.caption,'가져온 개발 방문 표본');
  assert.deepEqual(table.rows,[['재즈 · 공연장 · 1층 · 뒤쪽','1','4.6','2'],['재즈 · 공연장 · 2층 · 뒤쪽','1','—','—']]);
  assert.match(reports[8].note,/4,000/);
  assert.equal(reports[1].tables[0].rows[0][1],'2');
  assert.deepEqual(reports[9].tables,[]);
});

test('selecting a seat and confirmed occupancy remain separate and duration excludes transition intervals', () => {
  const base={visit:'a',hall:'classical',zone:'auditorium',floor:1,area:'middle',dwellMs:5000,playbackMs:1000};
  const samples=[
    {...base,seq:1,action:'hall_selected_parterre_1',seat:null},
    {...base,seq:2,action:'hall_seated_parterre_1',seat:'parterre-1'},
    {...base,seq:3,action:null,seat:'parterre-1'},
  ];
  const report=analysisAreas({spatial:{samples}})[9];
  assert.deepEqual(report.tables[0].rows,[['좌석 선택','1'],['착석 확인','1']]);
  assert.deepEqual(report.tables[1].rows[0].slice(-3),['1','5','1']);
});

test('local media and experience counts never inflate a production event or other audience count', () => {
  const samples = ['tarot_open','media_waiting','seat_denied','playlist_change','user_skip_next','media_ended'].map(
    (action,seq) => ({visit:'v',seq,action,others:seq<4?'0':'2-4'}));
  const areas = analysisAreas({spatial:{samples}});
  assert.deepEqual(areas[7].tables[0].rows,[['타로 열기','1']]);
  assert.deepEqual(areas[4].tables[0].rows,[['재생 대기','1'],['음원 종료','1']]);
  assert.deepEqual(areas[10].tables[0].rows.map(r => r.slice(0,2)),[['0명','1'],['2-4명','1']]);
  assert.deepEqual(areas[11].tables[0].rows,[['착석 거부','1']]);
  assert.match(areas[3].tables[0].caption,/개발 방문/);
});

test('GSC imported query report labels its window and keeps missing metrics apart from zero', () => {
  const input={searchQueries:{startDate:'2026-01-01',endDate:'2026-01-07',importedAt:'2026-01-10',rows:[{query:'concert',clicks:0,position:2}]}};
  const report=analysisAreas(input)[13];
  assert.match(report.tables[0].caption,/2026-01-01 ~ 2026-01-07/);
  assert.deepEqual(report.tables[0].rows,[['concert','0','—','—','2']]);
  assert.doesNotMatch(report.source,/개발 방문/);
});

test('compares only observed days on either side of the recorded change',()=>{
 const report=analysisAreas({updates:{rows:[{date:'2026-11-15',kind:'음악',label:'테스트'}]},archive:{sources:{ga4:{rows:[
  {date:'2026-11-14',sessions:0},{date:'2026-11-15',sessions:70},{date:'2026-11-16',sessions:8},
 ]}}}}).find(r=>r.title==='업데이트 비교');
 assert.deepEqual(report.tables[0].rows[0].slice(-2),['0 (1일)','8 (1일)']);
});
