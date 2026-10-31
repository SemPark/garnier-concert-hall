import {GOLDEN_HALL as H} from './goldenHall';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from './organLoft';
export const STAIR={bottomX:2,topX:13.5,z:46,width:2,steps:48,height:H.balconyHeight};
// Standing avatars are about 1.63 units tall.
export const GALLERY_RAIL_HEIGHT=.8;
export type FloorRect={minX:number;maxX:number;minZ:number;maxZ:number};
/** Deep rear gallery like the original, overhanging the last parterre row and covering both stairs. */
export const GALLERY_BRIDGE={minX:-12.5,maxX:12.5,minZ:43.2,maxZ:51.8};
/** Each stair climbs into an opening in the rear gallery from here outwards, so climbers keep headroom. */
export const STAIRWELL_INNER_X=9.6;
/** Timber columns carrying the rear gallery front, kept clear of the parterre aisles. */
export const REAR_COLUMNS={z:43.75,radius:.36,xs:[-12,-8.6,-2.9,2.9,8.6,12]} as const;
/** Disjoint slabs: side galleries, plus the rear gallery split around the two stairwells. */
export const GALLERY_FLOORS:FloorRect[]=[...[-1,1].flatMap(side=>{
 const rect=(inner:number,outer:number,minZ:number,maxZ:number)=>({minX:side<0?-outer:inner,maxX:side<0?-inner:outer,minZ,maxZ});
 return [rect(12.5,15.9,-26.5,STAIR.z-STAIR.width/2),rect(STAIR.topX,15.9,STAIR.z-STAIR.width/2,STAIR.z+STAIR.width/2),rect(12.5,15.9,STAIR.z+STAIR.width/2,51.8)];
}),
 {minX:GALLERY_BRIDGE.minX,maxX:GALLERY_BRIDGE.maxX,minZ:GALLERY_BRIDGE.minZ,maxZ:STAIR.z-STAIR.width/2},
 {minX:-STAIRWELL_INNER_X,maxX:STAIRWELL_INNER_X,minZ:STAIR.z-STAIR.width/2,maxZ:STAIR.z+STAIR.width/2},
 {minX:GALLERY_BRIDGE.minX,maxX:GALLERY_BRIDGE.maxX,minZ:STAIR.z+STAIR.width/2,maxZ:GALLERY_BRIDGE.maxZ}];
/** Guardrails stop before the stair opening, including clearance for the visitor. */
export function galleryRailSpans(bayZ:number){
 const start=Math.max(ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF,bayZ-3),end=Math.min(51.8,bayZ+3);let spans=start<end?[{start,end}]:[];
 for(const [cutStart,cutEnd]of [[GALLERY_BRIDGE.minZ,GALLERY_BRIDGE.maxZ+.35],[STAIR.z-STAIR.width/2-.35,STAIR.z+STAIR.width/2+.35]])spans=spans.flatMap(span=>span.end<=cutStart||span.start>=cutEnd?[span]:[...(span.start<cutStart?[{start:span.start,end:cutStart}]:[]),...(span.end>cutEnd?[{start:cutEnd,end:span.end}]:[])]);
 return spans;
}
export function hasGalleryFloor(x:number,z:number){return GALLERY_FLOORS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
