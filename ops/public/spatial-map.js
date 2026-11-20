import layout from './venue-map-layout.js';

const modes = {
  visits: '구역별 방문', dwell: '구역별 체류', playback: '구역별 음악 재생',
  flow: '구역 간 이동', path: '방문별 이동 경로', popular: '좌석·체험', last: '마지막 관측 위치',
};
const gaModes = {
  ...modes, visits:'공간별 방문 분포', playback:'음악 청취', popular:'인기 좌석', features:'기능 이용', last:'마지막 관측 구역',
};
const gaOverview = {
  page_view:'전체 페이지 조회', session_start:'전체 세션 시작', playback_start:'전체 재생 시작',
  playback_180_seconds:'재생 180초 도달', pleee_hall:'공간 종류',
  pleee_area_dwell:'층·구역별 체류', pleee_seat:'좌석 선택·착석',
  pleee_listening:'청취 시간·재생 상태', pleee_feature:'기능 이용·완료',
  pleee_zone_flow:'구역 간 전환', pleee_last_zone:'마지막 관측 구역',
};
const gaEventByMode = {
  visits:'pleee_hall', dwell:'pleee_area_dwell', playback:'pleee_listening', popular:'pleee_seat', features:'pleee_feature',
  flow:'pleee_zone_flow', last:'pleee_last_zone',
};
const gaReportByMode = {visits:'visits', dwell:'dwell', playback:'listening', popular:'seats', features:'features', flow:'flows', last:'endings'};
const gaNoPath = '미수집 · 운영 이벤트에는 방문별 시간순 위치 기록이 없습니다.';
const movement = {walk:'걷기', teleport:'순간 이동', train:'열차', seat:'좌석 이동', transition:'공간 전환', unknown:'이동 방식 미확인'};
const zoneNames = {lobby:'로비', auditorium:'공연장'};
const hallNames = {classical:'클래식', jazz:'재즈'};
const areaNames = {front:'무대 앞', middle:'객석 중앙', rear:'객석 뒤', lobby:'로비'};
const areaName = area => areaNames[area] ?? area;
const seats = new Map(layout.seats.map(seat => [seat.id, seat]));
const {hall, atrium, stairs, branch} = layout;
const bounds = {lobby:[atrium.front, -atrium.halfWidth, atrium.back-atrium.front, atrium.halfWidth*2],
  auditorium:[hall.front, -hall.width/2, hall.rear-hall.front, hall.width]};
const positions = new Map([
  ['walk','#c9b3ff'], ['teleport','#fcbb76'], ['train','#62d5ce'], ['seat','#ffb3cd'], ['transition','#9ebcf6'],
]);
function selectedSeat(action) {
  const selected = /^hall_selected_parterre_(\d+)$/.exec(action ?? '');
  return selected && seats.get('parterre-'+selected[1]);
}
function actionName(action) {
  if (!action) return '—';
  const seat = selectedSeat(action);
  if (seat) return seat.table+'번 테이블 '+seat.number+'번석 선택';
  return {tarot:'별빛 타로', queen_cards:'하트 여왕 카드'}[action] ?? layout.actions?.[action] ?? action;
}
const format = new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1});
function describe(sample) {
  return [hallNames[sample.hall],zoneNames[sample.zone],sample.floor+'층',areaName(sample.area)].join(' · ');
}
function match(sample, filter) {
  return sample.hall === filter.hall && sample.zone === filter.zone && sample.floor === filter.floor;
}
function samePlane(a,b) {
  return a.hall === b.hall && a.zone === b.zone && a.floor === b.floor;
}
function validRows(samples) {
  return (samples ?? []).filter(s => s?.layout === 'dinner-v1' && typeof s.visit === 'string' && Number.isFinite(s.at)
    && Number.isSafeInteger(s.seq) && Number.isFinite(s.x) && Number.isFinite(s.z));
}
function groupVisits(samples) {
  const visits = new Map();
  for (const sample of samples) {
    if (!visits.has(sample.visit)) visits.set(sample.visit, []);
    visits.get(sample.visit).push(sample);
  }
  for (const rows of visits.values()) rows.sort((a,b) => a.seq - b.seq);
  return visits;
}

export function spatialView(samples, filter) {
  const visits = groupVisits(validRows(samples));
  const keys = [];
  const cells = new Map();
  const tiles = new Map();
  const segments = [];
  const path = [];
  const endings = [];
  const flows = new Map();
  const add = (key,label,sample,amount,unique) => {
    if (['visits','dwell','playback'].includes(filter.mode)) {
      // Two-unit cells preserve the spatial distribution independently of the zone table.
      const tileX = Math.floor(sample.x / 2) * 2, tileZ = Math.floor(sample.z / 2) * 2;
      const tileKey = tileX + '/' + tileZ;
      const tile = tiles.get(tileKey) ?? {x:tileX,z:tileZ,value:0,seen:new Set()};
      if (unique === undefined || !tile.seen.has(unique)) tile.value += amount;
      if (unique !== undefined) tile.seen.add(unique);
      tiles.set(tileKey,tile);
    }
    const cell = cells.get(key) ?? {key,label,value:0,x:0,z:0,n:0,seen:new Set()};
    if (unique === undefined || !cell.seen.has(unique)) cell.value += amount;
    if (unique !== undefined) cell.seen.add(unique);
    cell.x += sample.x; cell.z += sample.z; cell.n++;
    cells.set(key, cell);
  };
  for (const [visit, rows] of visits) {
    const visible = rows.filter(s => match(s,filter));
    if (visible.length) keys.push(visit);
    if (filter.mode === 'last') {
      const last = rows.at(-1);
      if (match(last,filter)) {endings.push(last); add(last.area,areaName(last.area),last,1);}
      continue;
    }
    if (filter.mode === 'path' && visit !== filter.visit) continue;
    for (let i=0; i<rows.length; i++) {
      const s = rows[i], prev = rows[i-1], inside = match(s,filter);
      // A missing or repeated sequence cannot establish a traversal.
      const connected = prev && s.seq === prev.seq + 1 && s.at >= prev.at && positions.has(s.move);
      if (filter.mode === 'flow' && connected && (inside || match(prev,filter)) && describe(s)!==describe(prev)) {
        const key = describe(prev)+' → '+describe(s)+' ('+movement[s.move]+')';
        const flow = flows.get(key) ?? {label:key,value:0,from:prev,to:s};
        flow.value++; flows.set(key,flow);
        if (samePlane(prev,s)) segments.push([prev,s]);
      }
      const selected = filter.mode==='popular' && selectedSeat(s.action);
      if (selected && filter.hall===s.hall && filter.zone==='auditorium' && filter.floor===1)
        add('action/'+s.action,actionName(s.action),selected,1);
      if (!inside) continue;
      if (filter.mode === 'path') {
        path.push(s);
        if (connected && samePlane(prev,s)) segments.push([prev,s]);
      }
      if (filter.mode === 'visits') add(s.area,areaName(s.area),s,1,visit);
      if (filter.mode === 'dwell' || filter.mode === 'playback') {
        const value = filter.mode === 'dwell' ? s.dwellMs : s.playbackMs;
        if (Number.isFinite(value) && value >= 0) add(s.area,areaName(s.area),s,value/1000);
      }
      if (filter.mode === 'popular') {
        if (s.seat && (s.seat !== prev?.seat || !samePlane(prev,s) || s.seq !== prev.seq+1)) {
          const seat = seats.get(s.seat);
          const label = (seat ? seat.table+'번 테이블 '+seat.number+'번석' : s.seat)+' 착석 관측';
          add('seat/'+s.seat,label,seat ?? s,1);
        }
        if (s.action && !selected) add('action/'+s.action,actionName(s.action),s,1);
      }
    }
  }
  const values = [...cells.values()].map(({key,label,value,x,z,n}) => ({key,label,value,x:x/n,z:z/n}))
    .sort((a,b)=>b.value-a.value);
  return {keys:keys.sort(),values,flows:[...flows.values()].sort((a,b)=>b.value-a.value),segments,path,endings,tiles:[...tiles.values()]};
}
function zoneBucket(key) {
  const parts = /^([12])_(lobby|front|middle|rear)$/.exec(key ?? '');
  if (!parts) return null;
  const floor = Number(parts[1]), area = parts[2];
  const zone = area==='lobby'?'lobby':'auditorium';
  return {floor,area,zone,label:zoneNames[zone]+' '+floor+'층'+(zone==='lobby'?'':' · '+areaName(area))};
}

function bucketInView(bucket, filter) {
  return !!bucket && bucket.floor===filter.floor && bucket.zone===filter.zone;
}

export function gaSpatialView(behavior, filter) {
  const empty = {segments:[], path:[], endings:[], tiles:[], values:[], regions:[], arrows:[], rows:[]};
  if (filter.mode==='path') return {...empty, status:gaNoPath};
  const report = behavior?.reports?.[gaReportByMode[filter.mode]];
  const event = gaEventByMode[filter.mode];
  const count = behavior?.events?.[event];
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const status = ({
    unconfigured:'GA4 상세 항목이 아직 등록되지 않아 분류별 값을 조회할 수 없습니다.',
    pending:'미수집 또는 GA4 처리 대기 · 선택한 기간에 조회된 분류별 값이 없습니다.',
    uncollected:'미수집 · 운영 이벤트가 이 분류를 기록하지 않습니다.',
    error:'조회 실패 · GA4 상세 집계를 불러오지 못했습니다.',
    partial:'일부 상세 행만 조회되었습니다.',
    ok:'선택한 기간·공간에서 조회된 상세 행이 없습니다.',
  })[report?.status ?? (behavior?.status==='error'?'error':'pending')] ?? '처리 대기 · 선택한 기간의 GA4 운영 집계를 기다리고 있습니다.';
  const result = {...empty, count, reportStatus:report?.status, status};
  const withHall = rows.filter(row => Object.hasOwn(hallNames, row.hall) &&
    (filter.hall === 'all' || row.hall === filter.hall));
  const validCount = value => Number.isSafeInteger(value) && value >= 0;
  switch (filter.mode) {
    case 'visits':
      return {...result, columns:['공간', '동의한 페이지 집계'],
        rows:withHall.filter(row=>validCount(row.count)).map(row=>[hallNames[row.hall],format.format(row.count)+'건']),
        note:'공간 종류가 기록된 상세 이벤트 수입니다. 고유 관객 수와 구역별 방문 분포는 제공되지 않습니다.'};
    case 'playback':
      return {...result, columns:['공간', '마지막 재생 상태', '청취 시간', '관측 건수'],
        rows:withHall.filter(row => ['playing','not_playing'].includes(row.state)).map(row =>
          [hallNames[row.hall],row.state==='playing'?'재생 중':'재생 아님',
            Number.isFinite(row.seconds)?format.format(row.seconds)+'초':'미조회',
            validCount(row.count)?format.format(row.count)+'건':'미조회']),
        note:'음악은 공간 종류별로 집계합니다. 청취가 일어난 층·구역은 수집하지 않습니다.'};
    case 'features':
      return {...result, columns:['공간', '기능', '동작', '횟수'],
        rows:withHall.filter(row=>['used','completed'].includes(row.action)&&validCount(row.count))
          .map(row=>[hallNames[row.hall],actionName(row.feature),row.action==='completed'?'완료':'사용',format.format(row.count)+'회']),
        note:'기능 사용과 완료는 공간 종류별로 집계합니다. 기능을 사용한 층·구역은 수집하지 않습니다.'};
    case 'flow': {
      const movements = [];
      for (const row of withHall) {
        const from = zoneBucket(row.fromZone), to = zoneBucket(row.toZone);
        if (!from || !to || row.fromZone===row.toZone || !validCount(row.count)) continue;
        const fromVisible = bucketInView(from,filter), toVisible = bucketInView(to,filter);
        if (fromVisible || toVisible) movements.push({...row,from,to,onMap:fromVisible&&toVisible});
      }
      movements.sort((a,b)=>b.count-a.count);
      const arrows = new Map();
      for (const {from,to,count,onMap} of movements) {
        if (!onMap) continue;
        const key = from.area+'_'+to.area;
        const edge = arrows.get(key) ?? {from:from.area,to:to.area,count:0};
        edge.count += count;
        arrows.set(key,edge);
      }
      return {...result, arrows:[...arrows.values()], columns:['공연','이전 관측 구역','다음 관측 구역','관측 횟수','표시'],
        rows:movements.map(row=>[hallNames[row.hall],row.from.label,row.to.label,format.format(row.count)+'회',row.onMap?'같은 도면':'층·공간 전환']),
        note:'화살표는 같은 층·공간의 구역 중심을 연결해 연속 관측값의 전환 방향을 보여 줍니다. 다른 층·공간으로 이어지는 전환은 표에 표시합니다.'};
    }
    case 'last': {
      const totals = new Map();
      const observed = [];
      for (const row of withHall) {
        const bucket = zoneBucket(row.zone);
        if (!bucketInView(bucket,filter) || !validCount(row.count)) continue;
        totals.set(bucket.area,(totals.get(bucket.area)??0)+row.count);
        observed.push({...row,bucket});
      }
      observed.sort((a,b)=>b.count-a.count);
      const regions = [...totals].map(([key,value])=>({key,label:areaName(key),value}));
      return {...result, regions, columns:['공연','마지막 관측 구역','관측 건수'],
        rows:observed.map(row=>[hallNames[row.hall],row.bucket.label,format.format(row.count)+'건']),
        note:'각 페이지에서 마지막으로 관측된 구역의 집계입니다. 구역 음영의 농도는 관측 건수를 나타냅니다.'};
    }
    case 'dwell': {
      const note = '층·구역별 관측 체류의 합계입니다. 30초 단위로 집계하며 클래식·재즈 구분은 수집하지 않습니다.';
      if (filter.hall !== 'all') return {...result, status:'층·구역별 체류는 ‘공통 도면 · 클래식·재즈 통합’에서 확인할 수 있습니다.', note};
      const areas = rows.filter(row => row.floor===filter.floor && Object.hasOwn(areaNames,row.area) &&
        (filter.zone==='lobby' ? row.area==='lobby' : row.area!=='lobby') && Number.isFinite(row.seconds) && row.seconds>=0);
      const totals = new Map();
      for (const {area,seconds} of areas) totals.set(area,(totals.get(area)??0)+seconds);
      const regions = [...totals].map(([key,value])=>({key,label:areaName(key),value})).sort((a,b)=>b.value-a.value);
      return {...result, regions, columns:['구역','체류 시간'],
        rows:regions.map(row=>[row.label,format.format(row.value)+'초']), note};
    }
    case 'popular': {
      const note = '공유 좌석 좌표에 선택·실제 착석 횟수를 표시합니다. 클래식·재즈를 통합한 집계입니다.';
      if (filter.hall !== 'all') return {...result, status:'좌석 집계는 ‘공통 도면 · 클래식·재즈 통합’에서 확인할 수 있습니다.', note};
      if (filter.zone==='lobby') return {...result, status:'미수집 · 운영 좌석 집계는 공연장의 관객용 좌석을 대상으로 합니다.', note};
      const eligible = rows.filter(row => seats.get(row.seatId)?.visitor && seats.get(row.seatId).floor===filter.floor &&
        ['selected','seated'].includes(row.action) && validCount(row.count));
      const bySeat = new Map();
      for (const row of eligible) {
        const value = bySeat.get(row.seatId) ?? {selected:null,seated:null};
        value[row.action] = (value[row.action] ?? 0) + row.count;
        bySeat.set(row.seatId,value);
      }
      const ranking = [...bySeat].map(([id,item])=>({
        ...seats.get(id), ...item, value:(item.selected??0)+(item.seated??0),
      })).sort((a,b)=>(b.seated??0)-(a.seated??0)||(b.selected??0)-(a.selected??0)||a.id.localeCompare(b.id));
      const formatCount = value => value===null?'미수집 또는 처리 대기':format.format(value)+'회';
      return {...result, values:ranking.map(entry=>({...entry,label:entry.label+' · 선택 '+formatCount(entry.selected)+' · 착석 '+formatCount(entry.seated)})),
        columns:['좌석','선택','실제 착석'], rows:ranking.map(entry=>[entry.label,formatCount(entry.selected),formatCount(entry.seated)]), note};
    }
    default:return result;
  }
}

function html(tag,text) {
  const el=document.createElement(tag);
  if (text!==undefined) el.textContent=text;
  return el;
}
function svg(tag,attrs,text) {
  const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  if (text!==undefined) el.textContent=text;
  return el;
}
function control(label, options, value) {
  const wrap=html('label',label+' '), input=html('select');
  for (const [key,name] of options) input.add(new Option(name,key));
  input.value=value;
  wrap.append(input);
  return {wrap,input};
}
function chartFor(filter, result) {
  const [left,top,width,height] = bounds[filter.zone];
  const viewNames=filter.source==='ga4'?gaModes:modes;
  const mapHall=filter.hall==='all'?'공통 도면':hallNames[filter.hall];
  const chart=svg('svg',{viewBox:[left-1,top-1,width+2,height+2].join(' '),role:'img','aria-label':mapHall+' '+zoneNames[filter.zone]+' '+filter.floor+'층 '+viewNames[filter.mode]});
  chart.classList.add('spatial-chart');
  function floorRect(z,x,depth,span,fill) {
    chart.append(svg('rect',{x:z,y:x,width:depth,height:span,fill,stroke:'#575463','stroke-width':.15}));
  }
  floorRect(left,top,width,height,filter.floor===1?'#232331':'#11121a');
  if (filter.zone==='auditorium' && filter.floor===1) {
    floorRect(hall.front,-hall.width/2,layout.stageZ-hall.front,hall.width,'#322d3c');
    chart.append(svg('text',{x:(hall.front+layout.stageZ)/2,y:0,fill:'#cabfd4','font-size':1.4},'무대'));
    for (const t of layout.tables) chart.append(svg('circle',{cx:t.z,cy:-t.x,r:layout.tableRadius,fill:'none',stroke:'#575463','stroke-width':.15}));
  }
  if (filter.zone==='auditorium' && filter.floor===2) {
    for (const slab of layout.gallery) floorRect(slab.minZ,-slab.maxX,slab.maxZ-slab.minZ,slab.maxX-slab.minX,'#353343');
  }
  if (filter.zone==='lobby') {
    if (filter.floor===2) {
      const depth=atrium.balconyDepth;
      for (const z of [left,left+width-depth]) floorRect(z,top,depth,height,'#353343');
      for (const x of [top,top+height-depth]) floorRect(left+depth,x,width-2*depth,depth,'#353343');
      floorRect(stairs.landingEnd+.5,-stairs.branchInner+.3,atrium.back-.5-stairs.landingEnd-.5,2*(stairs.branchInner-.3),'#353343');
    } else {
      floorRect(stairs.flightStart,-stairs.flightHalf,stairs.landingEnd-stairs.flightStart,2*stairs.flightHalf,'#343040');
      for (const x of [-branch.endX,branch.startX]) floorRect(branch.z-branch.width/2,x,branch.width,branch.endX-branch.startX,'#343040');
      chart.append(svg('text',{x:stairs.flightStart+.4,y:.35,fill:'#b9aec5','font-size':1},'대계단'));
    }
  }
  const limits = {front:[hall.front,8], middle:[8,24], rear:[24,hall.rear], lobby:[left,left+width]};
  for (const region of result.regions ?? []) {
    const limit = limits[region.key];
    const slabs = filter.zone==='auditorium'&&filter.floor===2
      ? layout.gallery.map(r=>[r.minZ,r.maxZ,-r.maxX,-r.minX])
      : filter.zone==='lobby'&&filter.floor===2
        ? [[left,left+atrium.balconyDepth,top,top+height],[left+width-atrium.balconyDepth,left+width,top,top+height],
          [left+atrium.balconyDepth,left+width-atrium.balconyDepth,top,top+atrium.balconyDepth],
          [left+atrium.balconyDepth,left+width-atrium.balconyDepth,top+height-atrium.balconyDepth,top+height]]
        : [[left,left+width,top,top+height]];
    const peak = Math.max(...result.regions.map(row=>row.value),1);
    for (const [front,back,min,max] of slabs) {
      const z = Math.max(front,limit[0]), end = Math.min(back,limit[1]);
      if (end<=z) continue;
      const rect=svg('rect',{x:z,y:min,width:end-z,height:max-min,fill:'#ae95ee',
        'fill-opacity':.18+.64*Math.sqrt(region.value/peak),stroke:'#ad99cf','stroke-width':.1});
      const measure=filter.mode==='last'?'마지막 관측 '+format.format(region.value)+'건':'체류 '+format.format(region.value)+'초';
      rect.append(svg('title',{},region.label+' · '+measure));
      chart.append(rect);
    }
  }
  const arrows = result.arrows ?? [];
  const peakFlow = arrows.reduce((max,row)=>Math.max(max,row.count),1);
  for (const edge of arrows) {
    const center = area => (limits[area][0]+limits[area][1])/2;
    const from = center(edge.from), to = center(edge.to);
    const direction = Math.sign(to-from);
    const tip = to-direction*1.3, start = from+direction*1.3;
    const track = filter.floor===1 ? 0 : -14.2;
    const y = track+direction*.75;
    const radius = .65+.35*Math.sqrt(edge.count/peakFlow);
    const thickness = .22+.42*Math.sqrt(edge.count/peakFlow);
    const color = '#f5ca87';
    const g = svg('g',{});
    g.append(svg('title',{},areaName(edge.from)+' → '+areaName(edge.to)+' · '+format.format(edge.count)+'회'));
    g.append(svg('line',{x1:start,y1:y,x2:tip-direction*radius,y2:y,stroke:color,'stroke-width':thickness,'stroke-dasharray':'1.0 .55'}));
    g.append(svg('polygon',{points:[tip+','+y,(tip-direction*radius*1.9)+','+(y-radius/1.6),
      (tip-direction*radius*1.9)+','+(y+radius/1.6)].join(' '),fill:color}));
    chart.append(g);
  }
  if (filter.zone==='auditorium' && filter.source==='ga4') {
    for (const seat of seats.values()) {
      if (seat.floor!==filter.floor) continue;
      const dot=svg('circle',{cx:seat.z,cy:-seat.x,r:.28,fill:seat.visitor?'#9c8aa9':'#65566f'});
      dot.append(svg('title',{},seat.label+(seat.visitor?'':' · 이야기 인물 자리')));
      chart.append(dot);
    }
  }
  for (const [a,b] of result.segments) chart.append(svg('line',{x1:a.z,y1:-a.x,x2:b.z,y2:-b.x,
    stroke:positions.get(b.move),'stroke-width':.33,...(b.move!=='walk' && {'stroke-dasharray':'1 .6'})}));
  for (const p of [...result.path,...result.endings]) chart.append(svg('circle',{cx:p.z,cy:-p.x,r:.52,fill:'#d6c1ff'}));
  const peak = result.tiles.reduce((n,tile)=>Math.max(n,tile.value),0);
  for (const tile of result.tiles) {
    const rect=svg('rect',{x:tile.z,y:-tile.x-2,width:2,height:2,rx:.2,fill:'#ae95ee',
      'fill-opacity':tile.value===0?.06:.22+.67*Math.sqrt(tile.value/(peak||1)),stroke:'#ad99cf','stroke-width':.1});
    rect.append(svg('title',{},modes[filter.mode]+' · '+format.format(tile.value)));
    chart.append(rect);
  }
  const max = result.values.reduce((peak,cell)=>Math.max(peak,cell.value),1);
  for (const cell of filter.mode==='popular' ? result.values : []) {
    const dot=svg('circle',{cx:cell.z,cy:-cell.x,r:.55+1.5*Math.sqrt(cell.value/max),fill:'#aa8afc','fill-opacity':.72,stroke:'#eadfff','stroke-width':.15});
    dot.append(svg('title',{},cell.label+' · '+format.format(cell.value)));
    chart.append(dot);
  }
  return chart;
}
function dataTable(columns, rows) {
  const table=html('table');
  const head=table.createTHead().insertRow();
  for (const col of columns) {const cell=html('th',col);cell.scope='col';head.append(cell);}
  const body=table.createTBody();
  for (const cells of rows) {const row=body.insertRow();for (const value of cells) row.insertCell().textContent=String(value);}
  return table;
}

function eventOverview(behavior, fetchedAt) {
  const details=html('details');
  details.className='report-details spatial-event-totals';
  details.open=true;
  details.append(html('summary','GA4 운영 스트림 이벤트'));
  const period=behavior?.events ?? {};
  const realtime=behavior?.realtimeEvents ?? {};
  const count=(groups,key)=>Number.isSafeInteger(groups[key])&&groups[key]>=0?format.format(groups[key])+'건':'—';
  const rows=Object.entries(gaOverview)
    .filter(([key])=>Number.isSafeInteger(period[key])||Number.isSafeInteger(realtime[key]))
    .map(([key,label])=>[label,count(period,key),count(realtime,key)]);
  if (rows.length) details.append(dataTable(['이벤트','선택 기간','조회 시점 직전 30분'],rows));
  else details.append(html('p',behavior?.eventStatus==='error'?'조회 실패 · GA4 이벤트 집계를 읽지 못했습니다.'
    :'미수집 또는 처리 대기 · 조회된 GA4 이벤트가 없습니다.'));
  const date=fetchedAt?new Date(fetchedAt):null;
  const captured=date&&Number.isFinite(date.getTime())?' 조회 시각 '+date.toLocaleString('ko-KR')+' 기준입니다.':'';
  details.append(html('p','이벤트 건수를 표시합니다. 30분 집계는 선택 기간과 별도로 조회합니다.'+captured));
  if (behavior?.realtimeStatus==='error') details.append(html('p','GA4 30분 집계 조회 실패'));
  if (behavior?.eventStatus==='partial'||behavior?.realtimeStatus==='partial') details.append(html('p','GA4가 제공한 일부 이벤트 집계만 표시합니다.'));
  return details;
}

const gaState = new WeakMap();
function mountOperationalMap(container, snapshot, sourceControl, stateKey) {
  const behavior=snapshot?.google?.data?.behavior ??
    (snapshot?.spatialError||snapshot?.google?.status==='error' ? {status:'error',eventStatus:'error'} : undefined);
  const filter=gaState.get(stateKey) ?? {source:'ga4',hall:'all',zone:'auditorium',floor:1,mode:'dwell'};
  gaState.set(stateKey,filter);
  const scope=html('p',behavior?.includesUnlabeledQa
    ? 'GA4 운영 스트림 집계 · 실제 방문과 별도 표시 없이 전송된 운영 확인 이벤트가 함께 들어 있을 수 있습니다.'
    : 'GA4 운영 스트림 집계 · 로컬 개발 표본은 별도로 확인할 수 있습니다.');
  scope.className='panel-meta';
  const toolbar=html('div');
  toolbar.className='spatial-controls';
  toolbar.append(sourceControl);
  for (const [key,label,options] of [
    ['hall','공연', [['all','공통 도면 · 클래식·재즈 통합'],...Object.entries(hallNames)]],
    ['zone','공간',Object.entries(zoneNames)],['floor','층',[['1','1층'],['2','2층']]],
    ['mode','보기',Object.entries(gaModes)],
  ]) {
    const picker=control(label,options,String(filter[key]));
    picker.input.addEventListener('change',()=>{filter[key]=key==='floor'?Number(picker.input.value):picker.input.value;draw();});
    toolbar.append(picker.wrap);
  }
  const area=html('div');
  area.className='spatial-analysis';
  function draw() {
    const result=gaSpatialView(behavior,filter);
    const detail=html('div'), plot=html('figure');
    const chart=chartFor(filter,result);
    plot.append(chart);
    if (result.note) plot.append(html('figcaption',result.note));
    detail.setAttribute('aria-live','polite');
    detail.append(html('h3',gaModes[filter.mode]));
    if (result.rows.length) {
      detail.append(dataTable(result.columns,result.rows));
      if (result.reportStatus==='partial') detail.append(html('p',result.status));
    } else detail.append(html('p',result.status));
    if (Number.isSafeInteger(result.count)) detail.append(html('p','선택 기간의 해당 이벤트 전체 '+format.format(result.count)+'건'));
    area.replaceChildren(plot,detail);
  }
  container.replaceChildren(scope,toolbar,area,eventOverview(behavior,snapshot?.google?.fetchedAt));
  draw();
}

const sourceState = new WeakMap();
export function mountSpatialMap(container, snapshot) {
  const source=control('데이터', [['ga4','GA4 운영 집계'],['local','로컬 개발 표본']],sourceState.get(container) ?? 'ga4');
  source.input.addEventListener('change',()=>{
    sourceState.set(container,source.input.value);
    mountSpatialMap(container,snapshot);
    container.querySelector('select')?.focus();
  });
  if (source.input.value==='ga4') mountOperationalMap(container,snapshot,source.wrap,container);
  else mountLocalMap(container,snapshot,source.wrap);
}

const state = new WeakMap();
function mountLocalMap(container, snapshot, sourceControl) {
  const spatial=snapshot?.spatial;
  const samples=Array.isArray(spatial?.samples) ? spatial.samples : [];
  const initial=samples.find(s=>s.layout==='dinner-v1');
  const filter=state.get(container) ?? {hall:initial?.hall ?? 'classical',zone:initial?.zone ?? 'auditorium',floor:initial?.floor ?? 1,mode:'visits',visit:''};
  state.set(container,filter);
  const scope=html('p',snapshot?.spatialError ? '로컬 공간 기록을 읽지 못했습니다. 대시보드 서버의 상태를 확인하세요.'
    : '로컬 개발 방문 표본 · '+samples.length.toLocaleString('ko-KR')+'건. 직접 기록해 가져온 방문만 포함합니다.');
  scope.className='panel-meta';
  const toolbar=html('div');
  toolbar.className='spatial-controls';
  toolbar.append(sourceControl);
  const area=html('div');
  const visit=control('방문',[],filter.visit);
  for (const [key,label,options] of [
    ['hall','공연',Object.entries(hallNames)],['zone','공간',Object.entries(zoneNames)],
    ['floor','층',[['1','1층'],['2','2층']]],['mode','보기',Object.entries(modes)],
  ]) {
    const picker=control(label,options,String(filter[key]));
    picker.input.addEventListener('change',()=>{filter[key]=key==='floor'?Number(picker.input.value):picker.input.value;draw();});
    toolbar.append(picker.wrap);
  }
  visit.input.addEventListener('change',()=>{filter.visit=visit.input.value;draw();});
  toolbar.append(visit.wrap);
  function draw() {
    let result=spatialView(samples,filter);
    visit.wrap.hidden=filter.mode!=='path';
    if (filter.mode==='path') {
      const keys=result.keys;
      if (!keys.includes(filter.visit)) {filter.visit=keys[0] ?? '';result=spatialView(samples,filter);}
      visit.input.replaceChildren(...keys.map((key,i)=>new Option('방문 '+(i+1),key)));
      visit.input.value=filter.visit;
    }
    const rows=[];
    let columns;
    if (filter.mode==='path') {
      columns=['순서','관측 시각','구역','이동','동작','재생'];
      for (const p of [...result.path,...result.endings]) rows.push([p.seq,new Date(p.at).toLocaleTimeString('ko-KR'),areaName(p.area),movement[p.move] ?? '미확인',actionName(p.action),Number.isFinite(p.playbackMs)?format.format(p.playbackMs/1000)+'초':'미측정']);
    } else if (filter.mode==='flow') {
      columns=['구역 이동','관측 횟수'];
      for (const f of result.flows) rows.push([f.label,format.format(f.value)+'회']);
    } else {
      const unit=({visits:'방문',dwell:'초',playback:'초',last:'방문',popular:'회'})[filter.mode];
      columns=[filter.mode==='popular'?'좌석·체험':'구역',modes[filter.mode]];
      for (const cell of result.values) rows.push([cell.label,format.format(cell.value)+unit]);
    }
    const plot=html('figure'), detail=html('div');
    const regionLabel = html('label','구역 확인 ');
    const region = html('select');
    const selectedAreas = [...new Set(samples.filter(s=>match(s,filter)).map(s=>s.area))].sort();
    region.add(new Option('구역 선택',''));
    for (const key of selectedAreas) region.add(new Option(areaName(key),key));
    const readout=html('p');
    readout.setAttribute('aria-live','polite');
    region.addEventListener('change',()=>{
      const key=region.value;
      if (!key) {readout.textContent='';return;}
      const measured=samples.filter(s=>match(s,filter)&&s.area===key);
      const duration=field=>{
        const values=measured.map(s=>s[field]).filter(Number.isFinite);
        return values.length?format.format(values.reduce((a,b)=>a+b,0)/1000)+'초':'미측정';
      };
      readout.textContent=areaName(key)+' · '+new Set(measured.map(s=>s.visit)).size+'방문 · 체류 '+duration('dwellMs')+' · 재생 '+duration('playbackMs');
    });
    regionLabel.append(region);
    const note=({visits:'같은 방문이 한 구역에서 여러 번 관측되면 한 번으로 셉니다.',dwell:'수집된 체류 시간의 합계입니다.',playback:'재생이 관측된 시간의 합계입니다.',flow:'연속된 관측에서 구역이 바뀌고 이동 방식이 확인된 경우만 셉니다.',path:'점은 관측 위치입니다. 선은 같은 층에서 이동 방식이 확인된 연속 관측만 연결합니다.',popular:'좌석 선택은 선택한 의자에 표시합니다. 착석은 연속한 관측을 한 번으로 세며, 그 밖의 기능은 동작 시점의 관객 위치에 표시합니다.',last:'각 방문에서 조회 기간 중 마지막으로 관측된 위치입니다.'})[filter.mode];
    const legend = ['visits','dwell','playback'].includes(filter.mode) && result.tiles.length ? ' 밝은 칸일수록 관측값이 큽니다.' : '';
    plot.append(chartFor(filter,result),html('figcaption',note+legend));
    if (selectedAreas.length) plot.append(regionLabel,readout);
    detail.append(html('h3',modes[filter.mode]));
    if (spatial?.truncated) detail.append(html('p','조회 한도에 도달해 일부 표본만 표시합니다.'));
    if (rows.length) {
      detail.append(dataTable(columns,rows));
    } else detail.append(html('p','선택한 기간·공간에서 이 지표를 계산할 관측 기록이 없습니다.'));
    detail.setAttribute('aria-live','polite');
    area.className='spatial-analysis';
    area.replaceChildren(plot,detail);
  }
  container.replaceChildren(scope,toolbar,area);
  draw();
}
