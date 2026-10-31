import {GOLDEN_HALL as H} from './goldenHall';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from './organLoft';
export const STAIR={bottomX:2,topX:13.5,z:46,width:2,steps:48,height:H.balconyHeight};
// Standing avatars are about 1.63 units tall.
export const GALLERY_RAIL_HEIGHT=.8;
export type FloorRect={minX:number;maxX:number;minZ:number;maxZ:number};
export const GALLERY_BRIDGE={minX:-12.5,maxX:12.5,minZ:48.5,maxZ:51.8};
/** Disjoint slabs: a stairwell cutout at each end, plus a flush rear bridge. */
export const GALLERY_FLOORS:FloorRect[]=[...[-1,1].flatMap(side=>{
 const rect=(inner:number,outer:number,minZ:number,maxZ:number)=>({minX:side<0?-outer:inner,maxX:side<0?-inner:outer,minZ,maxZ});
 return [rect(12.5,15.9,-26.5,STAIR.z-STAIR.width/2),rect(STAIR.topX,15.9,STAIR.z-STAIR.width/2,STAIR.z+STAIR.width/2),rect(12.5,15.9,STAIR.z+STAIR.width/2,51.8)];
}),GALLERY_BRIDGE];
/** Guardrails stop before the stair opening, including clearance for the visitor. */
export function galleryRailSpans(bayZ:number){
 const start=Math.max(ORGAN_RAIL_JOIN_Z+ORGAN_RAIL_POST_HALF,bayZ-3),end=Math.min(51.8,bayZ+3);let spans=start<end?[{start,end}]:[];
 for(const [cutStart,cutEnd]of [[GALLERY_BRIDGE.minZ,GALLERY_BRIDGE.maxZ+.35],[STAIR.z-STAIR.width/2-.35,STAIR.z+STAIR.width/2+.35]])spans=spans.flatMap(span=>span.end<=cutStart||span.start>=cutEnd?[span]:[...(span.start<cutStart?[{start:span.start,end:cutStart}]:[]),...(span.end>cutEnd?[{start:cutEnd,end:span.end}]:[])]);
 return spans;
}
export function hasGalleryFloor(x:number,z:number){return GALLERY_FLOORS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
