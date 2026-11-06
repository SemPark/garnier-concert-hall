import {GOLDEN_HALL as H} from './goldenHall';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from './organLoft';
/** The closed doors either side of the rear wall, one on each floor (the stairs behind them are archived). */
export const STAIR_DOORS={lower:{x:12.6,z:50},upper:{x:14,z:50.2},height:H.balconyHeight} as const;
// The corridor stairs (openings, stairwell, flight and walking route) are archived in archive/hall-stairs-2026-11-06.
// Standing avatars are about 1.63 units tall.
export const GALLERY_RAIL_HEIGHT=.8;
export type FloorRect={minX:number;maxX:number;minZ:number;maxZ:number};
/** Deep rear gallery like the original, overhanging the last parterre row and covering both stairs. */
export const GALLERY_BRIDGE={minX:-12.5,maxX:12.5,minZ:43.2,maxZ:51.8};
/** Timber columns carrying the rear gallery front, kept clear of the parterre aisles. */
export const REAR_COLUMNS={z:43.75,radius:.36,xs:[-8.6,-2.9,2.9,8.6]} as const;
/**
 * As in the original, the bays beyond the outer columns are closed by a short wall reaching the side wall,
 * so the stair doors in these corners are out of sight from the front of the hall; behind the colonnade they stay open.
 */
export const REAR_SCREENS={innerX:9.1,outerX:15.72,z:REAR_COLUMNS.z,thickness:.5,height:8} as const;
/** Disjoint slabs: the two side galleries and the deep rear gallery between them. */
export const GALLERY_FLOORS:FloorRect[]=[...[-1,1].flatMap(side=>{
 const rect=(inner:number,outer:number,minZ:number,maxZ:number)=>({minX:side<0?-outer:inner,maxX:side<0?-inner:outer,minZ,maxZ});
 return [rect(12.5,15.9,-26.5,51.8)];
}),
 {...GALLERY_BRIDGE}];
/** Side guardrails stop where the rear gallery joins, leaving the walkway between them open. */
export function galleryRailSpans(bayZ:number,width=6){
 const start=Math.max(ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF,bayZ-width/2),end=Math.min(51.8,bayZ+width/2);let spans=start<end?[{start,end}]:[];
 for(const [cutStart,cutEnd]of [[GALLERY_BRIDGE.minZ,GALLERY_BRIDGE.maxZ+.35]])spans=spans.flatMap(span=>span.end<=cutStart||span.start>=cutEnd?[span]:[...(span.start<cutStart?[{start:span.start,end:cutStart}]:[]),...(span.end>cutEnd?[{start:cutEnd,end:span.end}]:[])]);
 return spans;
}
export function hasGalleryFloor(x:number,z:number){return GALLERY_FLOORS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
