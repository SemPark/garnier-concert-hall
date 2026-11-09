/** crypto.randomUUID exists only on https or localhost; a phone opening the dev server by LAN address has none. */
export function newId(){
 if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)+'-'+Math.random().toString(36).slice(2,10);
}
