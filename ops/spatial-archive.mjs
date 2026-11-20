import {DatabaseSync} from 'node:sqlite';
import {mkdir, stat, readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const defaultPath = () => process.env.OPS_SPATIAL_PATH || join(homedir(), '.concert-hall', 'development-visits.sqlite');
const day = 86_400_000;
const nullableMs = n => n == null || (Number.isFinite(n) && n >= 0 && n <= 30000);
const token = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);

function normalize(s) {
  if (!s || !token(s.visit) || !Number.isSafeInteger(s.seq) || s.seq < 0 ||
      !Number.isSafeInteger(s.at) || s.at <= 0 || s.at > Date.now()+60_000 ||
      !['classical','jazz'].includes(s.hall) || !['lobby','auditorium'].includes(s.zone) ||
      ![1,2].includes(s.floor) || ![s.x,s.z].every(n => Number.isFinite(n) && Math.abs(n)<1024) ||
      s.layout !== 'dinner-v1' || !token(s.area) || !nullableMs(s.dwellMs) || !nullableMs(s.playbackMs) ||
      !['walk','unknown','teleport','train','seat','transition'].includes(s.move) ||
      (s.seat != null && !/^parterre-\d{1,3}$/.test(s.seat)) ||
      (s.action != null && !token(s.action))) throw Error('지원하는 개발 방문 표본 형식이 아닙니다.');
  const keys = ['visit','seq','at','hall','zone','floor','x','z','layout','area','dwellMs','playbackMs','move','seat','action'];
  if (s.others != null) {
    if (!['0','1','2-4','5+'].includes(s.others)) throw Error('관객 수 구간을 확인하세요.');
    keys.push('others');
  }
  for (const key of ['track','playlist']) {
    if (s[key] != null && !token(s[key])) throw Error('곡 또는 목록 ID 형식을 확인하세요.');
    if (s[key] != null) keys.push(key);
  }
  return Object.fromEntries(keys.map(key => [key,s[key] ?? null]));
}
export async function importSamples(payload, {dbPath = defaultPath(), now = Date.now()} = {}) {
  const input = Array.isArray(payload) ? payload : payload?.samples;
  if (!Array.isArray(input) || !input.length || input.length > 4000) throw Error('1~4000개 표본이 있는 개발 방문 파일을 선택하세요.');
  const records = input.map(normalize);
  const cutoff = now - 30 * day;
  if (records.some(s => s.at < cutoff)) throw Error('최근 30일의 방문 표본만 가져올 수 있습니다.');
  await mkdir(dirname(resolve(dbPath)), {recursive:true,mode:0o700});
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`PRAGMA busy_timeout=3000; BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS samples (visit TEXT, seq INTEGER, at INTEGER, data TEXT, PRIMARY KEY(visit,seq));
      CREATE INDEX IF NOT EXISTS samples_at ON samples(at)`);
    db.prepare('DELETE FROM samples WHERE at < ?').run(cutoff);
    const put=db.prepare('INSERT OR IGNORE INTO samples VALUES(?,?,?,?)');
    let inserted=0;
    for (const row of records) inserted+=Number(put.run(row.visit,row.seq,row.at,JSON.stringify(row)).changes);
    if (db.prepare('SELECT COUNT(*) AS n FROM samples').get().n > 100000) throw Error('로컬 표본 보관 상한 10만 건에 도달했습니다.');
    db.exec('COMMIT');
    return inserted;
  } finally { db.close(); }
}
export async function readSamples({endDate,days,dbPath=defaultPath(),now=Date.now()}) {
  try { await stat(dbPath); } catch(error) { if(error.code==='ENOENT') return {samples:[],truncated:false}; throw error; }
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA busy_timeout=3000');
    db.prepare('DELETE FROM samples WHERE at < ?').run(now - 30*day);
    const end = Date.parse(endDate+'T00:00:00+09:00')+day;
    const rows=db.prepare('SELECT data FROM samples WHERE at >= ? AND at < ? ORDER BY at,visit,seq LIMIT 4001').all(end-days*day,end);
    return {samples:rows.slice(0,4000).map(r=>JSON.parse(r.data)),truncated:rows.length>4000};
  } finally { db.close(); }
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const path=process.argv[2];
    if(!path || (await stat(path)).size>4*1024*1024) throw Error('4 MiB 이하의 방문 JSON 파일을 선택하세요.');
    console.log('로컬 개발 표본 '+await importSamples(JSON.parse(await readFile(path,'utf8')))+'건 추가');
  } catch(error){console.error(error.message);process.exitCode=1;}
}
