import {readFile,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

export async function readUpdates(startDate,endDate,path=process.env.OPS_CHANGES_FILE || join(homedir(),'.concert-hall','changes.json')) {
  try {
    if ((await stat(path)).size>256*1024) throw Error();
    const changes=JSON.parse(await readFile(path,'utf8'));
    if (!Array.isArray(changes)) throw Error();
    return {rows:changes.filter(row=>row && ['배포','음악','홍보','측정'].includes(row.kind)
      && typeof row.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
      && row.date>=startDate && row.date<=endDate && typeof row.label==='string' && row.label.trim())
      .map(({date,kind,label})=>({date,kind,label:label.slice(0,120)})).sort((a,b)=>a.date.localeCompare(b.date))};
  } catch(error) {return {rows:[],error:error.code!=='ENOENT'};}
}
