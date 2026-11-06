import type {Visitor,Zone} from './venue';
/** Full entries on arrival, removals on departure; stationary neighbours survive a room change. */
export function zoneUpdate(all:Visitor[],changed:Visitor[],previous:ReadonlySet<string>,zone:Zone){
 const visible=all.filter(v=>v.zone===zone),ids=new Set(visible.map(v=>v.id)),dirty=new Set(changed.map(v=>v.id));
 return {ids,visitors:visible.filter(v=>dirty.has(v.id)||!previous.has(v.id)),left:[...previous].filter(id=>!ids.has(id))};
}
