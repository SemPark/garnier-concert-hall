import {mkdir, readFile, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const defaultPath = () => process.env.OPS_ARCHIVE_PATH || join(homedir(), '.concert-hall', 'analytics.sqlite');
const fields = {
  ga4: {
    activeUsers: ['Active users', '활성 사용자'], sessions: ['Sessions', '세션', '세션수'],
    screenPageViews: ['Views', '조회수'], eventCount: ['Event count', '이벤트 수'],
  },
  gsc: {
    clicks: ['Clicks', '클릭수', '클릭'], impressions: ['Impressions', '노출수', '노출'],
    ctr: ['CTR', '클릭률'], position: ['Position', 'Average position', '순위', '게재순위', '평균 게재순위'],
  },
};

function sourceFields(source) {
  if (!Object.hasOwn(fields, source)) throw Error('출처는 ga4 또는 gsc여야 합니다.');
  return fields[source];
}

export function isoDate(input) {
  const date = String(input ?? '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  const time = Date.parse(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time)
    || new Date(time).toISOString().slice(0, 10) !== date) throw Error('유효한 날짜가 필요합니다.');
  return date;
}

export function metric(key, input) {
  const text = String(input).trim();
  const percent = key === 'ctr' && text.endsWith('%');
  const raw = percent ? text.slice(0, -1) : text;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(raw)) throw Error(key + ' 값의 형식을 확인하세요.');
  const value = Number(raw.replaceAll(',', '')) / (percent ? 100 : 1);
  if (!Number.isFinite(value) || (key === 'ctr' && value > 1)
    || (!['ctr', 'position'].includes(key) && !Number.isSafeInteger(value))) throw Error(key + ' 값의 범위를 확인하세요.');
  return value;
}

export async function saveDailyRows(source, rows, {dbPath = defaultPath()} = {}) {
  const keys = Object.keys(sourceFields(source));
  const seen = new Set();
  const records = [];
  for (const row of rows) {
    const date = isoDate(row.date);
    if (seen.has(date)) throw Error('날짜가 중복됩니다. 날짜별 전체 집계만 가져오세요.');
    seen.add(date);
    const values = {};
    for (const key of keys) {
      const input = row[key] ?? (key === 'screenPageViews' ? row.views : undefined);
      if (input != null && input !== '') values[key] = metric(key, input);
    }
    if (Object.keys(values).length) records.push([source, date, JSON.stringify(values)]);
  }
  if (!records.length) return 0;
  const {DatabaseSync} = await import('node:sqlite');
  await mkdir(dirname(resolve(dbPath)), {recursive: true, mode: 0o700});
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA busy_timeout=3000; BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS daily_metrics (source TEXT NOT NULL, date TEXT NOT NULL, metrics TEXT NOT NULL, PRIMARY KEY(source,date));');
    const insert = db.prepare('INSERT INTO daily_metrics VALUES(?,?,?) ON CONFLICT(source,date) DO UPDATE SET metrics=json_patch(daily_metrics.metrics,excluded.metrics)');
    for (const record of records) insert.run(...record);
    db.exec('COMMIT');
  } finally { db.close(); }
  return records.length;
}

// Only aggregate report data is retained, scoped to the exact reporting window.
export async function saveReport(snapshot, {dbPath = defaultPath()} = {}) {
  const {requestedAt, completedAt, range, google, cloudflare, health} = snapshot;
  const usable = [google, ...Object.values(cloudflare)].some(source =>
    source?.status === 'ok' || source?.status === 'partial');
  if (!usable) return;
  await mkdir(dirname(resolve(dbPath)), {recursive: true, mode: 0o700});
  const {DatabaseSync} = await import('node:sqlite');
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS report_windows (
        end_date TEXT, days INTEGER, requested_at TEXT, report TEXT NOT NULL,
        PRIMARY KEY(end_date, days)
      )`);
    db.prepare(`INSERT INTO report_windows VALUES(?,?,?,?)
      ON CONFLICT(end_date,days) DO UPDATE SET
        requested_at=excluded.requested_at, report=excluded.report
      WHERE excluded.requested_at >= report_windows.requested_at`)
      .run(range.endDate, range.days, requestedAt,
        JSON.stringify({requestedAt, completedAt, range, google, cloudflare, health}));
  } finally { db.close(); }
}

export async function readArchive({days = 28, endDate = new Date().toISOString().slice(0, 10), dbPath = defaultPath()} = {}) {
  const end = isoDate(endDate);
  if (!Number.isSafeInteger(days) || days < 1 || days > 3660) throw Error('조회 기간은 1~3660일입니다.');
  const start = new Date(Date.parse(end) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const sources = {ga4: {rows: [], latestDate: null}, gsc: {rows: [], latestDate: null}};
  try { await stat(dbPath); } catch (error) { if (error.code === 'ENOENT') return {sources}; throw error; }
  const {DatabaseSync} = await import('node:sqlite');
  const db = new DatabaseSync(dbPath, {readOnly: true});
  try {
    db.exec('PRAGMA busy_timeout=3000');
    const hasTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?");
    const reportRow = hasTable.get('report_windows')
      ? db.prepare('SELECT report FROM report_windows WHERE end_date=? AND days=?').get(end, days) : null;
    const report = reportRow ? JSON.parse(reportRow.report) : null;
    if (!hasTable.get('daily_metrics')) return {sources, report};
    for (const [source, output] of Object.entries(sources)) {
      output.latestDate = db.prepare('SELECT max(date) AS d FROM daily_metrics WHERE source=?').get(source).d;
      output.rows = db.prepare('SELECT date,metrics FROM daily_metrics WHERE source=? AND date BETWEEN ? AND ? ORDER BY date')
        .all(source, start, end).map(({date, metrics}) => ({date, ...JSON.parse(metrics)}));
    }
    return {sources, report};
  } finally { db.close(); }
}

export function csvRows(text, {skipComments = true} = {}) {
  const lines = [];
  let line = [], cell = '', quoted = false, closed = false;
  const csv = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (csv[i + 1] === '"') { cell += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (char === ',' || char === '\n') {
      line.push(cell.trim());
      cell = ''; closed = false;
      if (char === '\n') { lines.push(line); line = []; }
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (closed || char === '"') throw Error('CSV 따옴표 형식이 올바르지 않습니다.');
    else cell += char;
  }
  if (quoted) throw Error('CSV 따옴표가 닫히지 않았습니다.');
  lines.push([...line, cell.trim()]);
  return lines.filter((row) => row.some(Boolean) && (!skipComments || !row[0].startsWith('#')));
}

export function parseDailyCsv(source, text) {
  const titles = sourceFields(source);
  const [header, ...data] = csvRows(text);
  const aliases = new Map([['date', 'date'], ['날짜', 'date']]);
  for (const [key, names] of Object.entries(titles)) {
    for (const name of [key, ...names]) aliases.set(name.toLowerCase(), key);
  }
  const keys = (header ?? []).map((name) => aliases.get(name.toLowerCase()));
  if (!keys.includes('date') || keys.length < 2 || keys.includes(undefined) || keys.length !== new Set(keys).size)
    throw Error('날짜와 지원되는 일별 지표 열만 포함해야 합니다.');
  return data.map((row) => {
    if (row.length !== keys.length) throw Error('CSV의 열 개수가 다릅니다.');
    return Object.fromEntries(keys.map((key, i) => [key, row[i]]));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [source, filename] = process.argv.slice(2);
    if (!filename || process.argv.length !== 4) throw Error('사용법: node ops/archive.mjs ga4|gsc 일별.csv');
    const info = await stat(filename);
    if (!info.isFile() || info.size > 4 * 1024 * 1024) throw Error('4 MiB 이하의 로컬 CSV 파일을 선택하세요.');
    const rows = parseDailyCsv(source, await readFile(filename, 'utf8'));
    const count = await saveDailyRows(source, rows);
    console.log(source + ' 일별 집계 ' + count + '일 저장');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
