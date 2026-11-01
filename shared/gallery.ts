import {GOLDEN_HALL as H} from './goldenHall';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from './organLoft';
/**
 * As in the original hall, no staircase stands inside the room: the galleries are reached by stairs
 * in the corridors behind the rear wall. Each side links the parterre door beside the central entrance
 * with the gallery doorway at the end of the rear gallery.
 */
export const STAIR_DOORS={lower:{x:7.4,z:50},upper:{x:14,z:50.2},height:H.balconyHeight} as const;
// Standing avatars are about 1.63 units tall.
export const GALLERY_RAIL_HEIGHT=.8;
export type FloorRect={minX:number;maxX:number;minZ:number;maxZ:number};
/** Deep rear gallery like the original, overhanging the last parterre row and covering both stairs. */
export const GALLERY_BRIDGE={minX:-12.5,maxX:12.5,minZ:43.2,maxZ:51.8};
/** Timber columns carrying the rear gallery front, kept clear of the parterre aisles. */
export const REAR_COLUMNS={z:43.75,radius:.36,xs:[-12,-8.6,-2.9,2.9,8.6,12]} as const;
/** Disjoint slabs: the two side galleries and the deep rear gallery between them. */
export const GALLERY_FLOORS:FloorRect[]=[...[-1,1].flatMap(side=>{
 const rect=(inner:number,outer:number,minZ:number,maxZ:number)=>({minX:side<0?-outer:inner,maxX:side<0?-inner:outer,minZ,maxZ});
 return [rect(12.5,15.9,-26.5,51.8)];
}),
 {...GALLERY_BRIDGE}];
/** Side guardrails stop where the rear gallery joins, leaving the walkway between them open. */
export function galleryRailSpans(bayZ:number){
 const start=Math.max(ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF,bayZ-3),end=Math.min(51.8,bayZ+3);let spans=start<end?[{start,end}]:[];
 for(const [cutStart,cutEnd]of [[GALLERY_BRIDGE.minZ,GALLERY_BRIDGE.maxZ+.35]])spans=spans.flatMap(span=>span.end<=cutStart||span.start>=cutEnd?[span]:[...(span.start<cutStart?[{start:span.start,end:cutStart}]:[]),...(span.end>cutEnd?[{start:cutEnd,end:span.end}]:[])]);
 return spans;
}
export function hasGalleryFloor(x:number,z:number){return GALLERY_FLOORS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
