import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialView,gaSpatialView} from './public/spatial-map.js';

const point = {visit:'a',seq:1,at:1000,hall:'classical',zone:'auditorium',floor:1,x:0,z:1,area:'front',layout:'dinner-v1',move:'unknown',seat:null,action:null,dwellMs:null,playbackMs:null};
const samples = [point,{...point,seq:2,at:2000,z:9,area:'middle',move:'walk',dwellMs:1000,playbackMs:0},
  {...point,seq:4,at:4000,area:'rear',z:25,move:'walk'}, {...point,seq:5,at:5000,floor:2,z:25,area:'rear',move:'transition'},
  {...point,visit:'b',seq:1,at:1001}, {...point,visit:'other',hall:'jazz'}];
const view = (mode, rows=samples) => spatialView(rows,{mode,visit:'a',hall:'classical',zone:'auditorium',floor:1});
test('spatial visits, time and playback preserve distinct visits, observed zero and missing reports', () => {
  assert.equal(view('visits').values.find(row=>row.key==='front').value,2);
  assert.deepEqual(view('dwell').values.map(c=>[c.key,c.value]),[['middle',1]]);
  assert.deepEqual(view('playback').values.map(c=>[c.key,c.value]),[['middle',0]]);
  assert.equal(view('visits',[]).values.length,0);
});
test('paths require confirmed contiguous moves and last position uses the complete visit before filtering', () => {
  assert.equal(view('path').segments.length,1);
  assert.equal(view('path').path.length,3);
  assert.equal(view('flow').flows.length,2);
  assert.deepEqual(view('last').values.map(c=>[c.key,c.value]),[['front',1]]);
  assert.equal(view('path',[point,{...point,seq:2,at:1001}]).segments.length,0);
});
test('popular seats and experiences require explicit sample fields', () => {
  const rows=[{...point,seat:'parterre-1',action:'seat_confirmed'},{...point,seq:2,at:1001,seat:'parterre-1'}];
  assert.equal(view('popular',rows).values.find(c=>c.key==='seat/parterre-1').value,1);
  assert.equal(view('popular').values.length,0);
});
test('seat selection from lobby is plotted at the selected auditorium chair', () => {
  const rows=[{...point,zone:'lobby',x:999,z:999,action:'hall_selected_parterre_1'}];
  const item=view('popular',rows).values[0];
  assert.notEqual(item.x,999);
  assert.ok(item.label.endsWith('선택'));
  assert.equal(spatialView(rows,{mode:'popular',hall:'classical',zone:'lobby',floor:1}).values.length,0);
});

const operational = (mode, report, filter = {}) => gaSpatialView(report, {
  source:'ga4',mode,hall:'all',zone:'auditorium',floor:1,...filter,
});

test('GA4 area time is restricted to a shared floor and area, independent of imported sample coordinates', () => {
  const behavior = {reports:{dwell:{status:'ok',rows:[
    {floor:1,area:'middle',seconds:60,count:2},
    {floor:1,area:'middle',seconds:30,count:1},
    {floor:2,area:'front',seconds:90,count:2},
    {floor:1,area:'lobby',seconds:30,count:1},
  ]}}};
  assert.deepEqual(operational('dwell',behavior).regions,[{key:'middle',label:'객석 중앙',value:90}]);
  assert.deepEqual(operational('dwell',behavior,{floor:2}).regions.map(row=>row.key),['front']);
  assert.deepEqual(operational('dwell',behavior,{zone:'lobby'}).regions.map(row=>row.key),['lobby']);
  assert.deepEqual(operational('dwell',behavior,{hall:'jazz'}).regions,[]);
});

test('GA4 seat markers use the shared seat location and keep selection and actual seating distinct', () => {
  const behavior = {reports:{seats:{status:'ok',rows:[
    {seatId:'parterre-1',action:'selected',count:2},
    {seatId:'parterre-1',action:'seated',count:1},
    {seatId:'out-of-layout',action:'seated',count:49},
  ]}}};
  const [seat] = operational('popular',behavior).values;
  assert.equal(seat.label,'1번 테이블 1번 자리 · 선택 2회 · 착석 1회');
  assert.equal(seat.seated,1);
  assert.equal(seat.selected,2);
  assert.ok(Number.isFinite(seat.x)&&Number.isFinite(seat.z));
  assert.equal(operational('popular',behavior).values.length,1);
  assert.equal(operational('popular',behavior,{hall:'classical'}).values.length,0);
  assert.equal(operational('popular',behavior,{floor:2}).values.length,0);
});

test('GA4 hall totals do not imply zone placement and aggregate data cannot generate traversals', () => {
  const behavior = {reports:{
    visits:{status:'ok',rows:[{hall:'classical',count:2},{hall:'jazz',count:1}]},
    listening:{status:'ok',rows:[{hall:'jazz',state:'not_playing',seconds:0,count:1}]},
    features:{status:'ok',rows:[{hall:'classical',feature:'tarot',action:'completed',count:1}]},
  }};
  assert.deepEqual(operational('visits',behavior,{hall:'classical'}).rows,[['클래식','2건']]);
  assert.deepEqual(operational('playback',behavior).rows,[['재즈','재생 아님','0초','1건']]);
  assert.deepEqual(operational('features',behavior).rows,[['클래식','별빛 타로','완료','1회']]);
  for (const mode of ['visits','playback','features','flow','path','last']) {
    const result=operational(mode,behavior);
    assert.deepEqual([result.tiles,result.regions,result.values,result.segments,result.path,result.endings],[[],[],[],[],[],[]]);
    if (mode==='path') assert.match(result.status,/미수집/);
    assert.deepEqual(result.arrows,[]);
  }
});

test('an event receipt stays visible even while its custom breakdown is unavailable', () => {
  const result=operational('dwell',{events:{pleee_area_dwell:1},
    reports:{dwell:{status:'unconfigured',rows:[]}}});
  assert.equal(result.count,1);
  assert.match(result.status,/등록되지/);
  assert.deepEqual(result.rows,[]);
});

const zoneReports = {events:{pleee_zone_flow:6,pleee_last_zone:4},reports:{
  flows:{status:'ok',rows:[
    {hall:'classical',fromZone:'1_front',toZone:'1_middle',count:5},
    {hall:'classical',fromZone:'1_middle',toZone:'1_front',count:2},
    {hall:'jazz',fromZone:'1_front',toZone:'1_middle',count:1},
    {hall:'jazz',fromZone:'1_middle',toZone:'1_lobby',count:3},
    {hall:'jazz',fromZone:'1_middle',toZone:'2_rear',count:2},
    {hall:'jazz',fromZone:'1_middle',toZone:'1_middle',count:5},
  ]},
  endings:{status:'ok',rows:[
    {hall:'classical',zone:'1_front',count:4},
    {hall:'jazz',zone:'1_front',count:3},
    {hall:'jazz',zone:'2_rear',count:5},
    {hall:'classical',zone:'1_lobby',count:1},
  ]},
}};

test('aggregated direction arrows stay on the current floor and space and respect the hall filter', () => {
  const all = operational('flow',zoneReports);
  assert.deepEqual(all.arrows,[{from:'front',to:'middle',count:6},{from:'middle',to:'front',count:2}]);
  assert.equal(all.count,6);
  assert.equal(all.rows.filter(row=>row.at(-1)==='층·공간 전환').length,2);
  assert.deepEqual(all.segments,[]);
  const jazz = operational('flow',zoneReports,{hall:'jazz'});
  assert.deepEqual(jazz.arrows,[{from:'front',to:'middle',count:1}]);
  assert.deepEqual(operational('flow',zoneReports,{zone:'lobby'}).rows,[
    ['재즈','공연장 1층 · 객석 중앙','로비 1층','3회','층·공간 전환'],
  ]);
});

test('last observation uses region shading only and coarse aggregates never produce a per-visit path', () => {
  const last = operational('last',zoneReports);
  assert.deepEqual(last.regions,[{key:'front',label:'무대 앞',value:7}]);
  assert.deepEqual(operational('last',zoneReports,{hall:'jazz'}).regions,[{key:'front',label:'무대 앞',value:3}]);
  assert.deepEqual(operational('last',zoneReports,{floor:2}).rows,[['재즈','공연장 2층 · 객석 뒤','5건']]);
  assert.deepEqual(last.endings,[]);
  const path = operational('path',zoneReports);
  assert.deepEqual([path.segments,path.path,path.rows],[[],[],[]]);
  assert.match(path.status,/미수집/);
});

test('a historical snapshot without new reports does not imply observed movement', () => {
  const archive = {status:'ok',reports:{visits:{status:'ok',rows:[{hall:'jazz',count:1}]}}};
  assert.match(operational('flow',archive).status,/미수집 또는 GA4 처리 대기/);
  assert.match(operational('last',archive).status,/미수집 또는 GA4 처리 대기/);
});
