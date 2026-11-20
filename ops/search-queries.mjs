import {mkdir, readFile, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {csvRows, isoDate, metric} from './archive.mjs';

const defaultPath = () => process.env.OPS_SEARCH_QUERIES_PATH || join(homedir(), '.concert-hall', 'search-queries.sqlite');
const fileLimit = 4 * 1024 * 1024;
const aliases = {
  query: ['query', 'queries', 'top queries', '검색어', '검색어(쿼리)', '인기 검색어', '상위 검색어', '쿼리', '인기 검색어(쿼리)'],
  clicks: ['clicks', '클릭수', '클릭 수', '클릭'],
  impressions: ['impressions', '노출수', '노출 수', '노출'],
  ctr: ['ctr', '클릭률', '평균 ctr'],
  position: ['position', 'average position', '순위', '게재순위', '평균 게재순위'],
};
const headers = new Map(Object.entries(aliases).flatMap(([key, names]) => names.map(name => [name, key])));

function period(startDate, endDate) {
  const start = isoDate(startDate), end = isoDate(endDate);
  if (start > end) throw Error('시작 날짜는 마지막 날짜보다 늦을 수 없습니다.');
  return [start, end];
}

function parseQueries(csv) {
  if (typeof csv !== 'string' || Buffer.byteLength(csv) > fileLimit) throw Error('4 MiB 이하의 검색어 CSV를 선택해 주세요.');
  const [titles, ...data] = csvRows(csv, {skipComments:false});
  const keys = (titles ?? []).map(title => headers.get(title.toLowerCase()));
  if (keys.length < 2 || !keys.includes('query') || keys.includes(undefined) || new Set(keys).size !== keys.length)
    throw Error('검색어와 실적 지표 열을 포함한 Search Console 검색어 CSV가 필요합니다.');
  if (data.length > 5000) throw Error('가져올 수 있는 최대 검색어는 한 파일에 5,000개입니다.');
  const seen = new Set();
  return data.map(row => {
    if (row.length !== keys.length) throw Error('CSV의 열 개수가 다릅니다.');
    const query = row[keys.indexOf('query')];
    if (!query || query.length > 2048 || seen.has(query)) throw Error('검색어가 비었거나 너무 길거나 중복되었습니다.');
    seen.add(query);
    const result = {query};
    for (const [i, key] of keys.entries()) {
      if (key !== 'query' && row[i] !== '') result[key] = metric(key,row[i]);
    }
    return result;
  });
}

export async function importSearchQueries({startDate, endDate, csv, dbPath = defaultPath()}) {
  const [start, end] = period(startDate, endDate);
  const rows = parseQueries(csv);
  await mkdir(dirname(resolve(dbPath)), {recursive:true, mode:0o700});
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS query_reports (start_date TEXT, end_date TEXT, imported_at TEXT NOT NULL, rows_json TEXT NOT NULL, PRIMARY KEY(start_date, end_date))');
    db.prepare(`INSERT INTO query_reports VALUES(?,?,?,?)
      ON CONFLICT(start_date, end_date) DO UPDATE SET imported_at=excluded.imported_at, rows_json=excluded.rows_json`)
      .run(start, end, new Date().toISOString(), JSON.stringify(rows));
    return rows.length;
  } finally { db.close(); }
}

export async function readSearchQueries({startDate, endDate, dbPath = defaultPath()}) {
  const [start, end] = period(startDate,endDate);
  const result = {startDate:start, endDate:end, importedAt:null, rows:[]};
  try { await stat(dbPath); } catch(error) { if (error.code === 'ENOENT') return result; throw error; }
  const db = new DatabaseSync(dbPath, {readOnly:true});
  try {
    db.exec('PRAGMA busy_timeout=3000');
    const row = db.prepare('SELECT imported_at,rows_json FROM query_reports WHERE start_date=? AND end_date=?').get(start,end);
    return row ? {...result, importedAt:row.imported_at, rows:JSON.parse(row.rows_json)} : result;
  } finally { db.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const [startDate,endDate,filename] = process.argv.slice(2);
    if (!filename || process.argv.length !== 5) throw Error('사용법: node ops/search-queries.mjs 시작날짜 마지막날짜 Queries.csv');
    const file = await stat(filename);
    if (!file.isFile() || file.size > fileLimit) throw Error('4 MiB 이하의 로컬 CSV 파일을 선택하세요.');
    const count = await importSearchQueries({startDate,endDate,csv:await readFile(filename,'utf8')});
    console.log(startDate + ' ~ ' + endDate + ' 검색어 ' + count + '개 저장');
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
