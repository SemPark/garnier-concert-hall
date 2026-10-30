import {GOLDEN_HALL as H} from './goldenHall';
export const STAIR={bottomX:2,topX:13.5,z:49,width:2,steps:48,height:H.balconyHeight};
export type FloorRect={minX:number;maxX:number;minZ:number;maxZ:number};
export const GALLERY_BRIDGE={minX:-12.5,maxX:12.5,minZ:44.9,maxZ:47.1};
/** Disjoint slabs: a stairwell cutout at each end, plus a flush rear bridge. */
export const GALLERY_FLOORS:FloorRect[]=[...[-1,1].flatMap(side=>{
 const rect=(inner:number,outer:number,minZ:number,maxZ:number)=>({minX:side<0?-outer:inner,maxX:side<0?-inner:outer,minZ,maxZ});
 return [rect(12.5,15.9,-26.5,STAIR.z-STAIR.width/2),rect(STAIR.topX,15.9,STAIR.z-STAIR.width/2,50.3)];
}),GALLERY_BRIDGE];
/** Guardrails stop before the stair opening, including clearance for the visitor. */
export function galleryRailSpans(bayZ:number){
 const start=Math.max(-26.5,bayZ-3),end=Math.min(50.3,bayZ+3);let spans=start<end?[{start,end}]:[];
 for(const [cutStart,cutEnd]of [[GALLERY_BRIDGE.minZ-.35,GALLERY_BRIDGE.maxZ+.35],[STAIR.z-STAIR.width/2-.35,50.3]])spans=spans.flatMap(span=>span.end<=cutStart||span.start>=cutEnd?[span]:[...(span.start<cutStart?[{start:span.start,end:cutStart}]:[]),...(span.end>cutEnd?[{start:cutEnd,end:span.end}]:[])]);
 return spans;
}
export function hasGalleryFloor(x:number,z:number){return GALLERY_FLOORS.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);}
