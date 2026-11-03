import {GOLDEN_HALL as H} from './goldenHall';
import {ORGAN_RAIL_JOIN_Z,ORGAN_RAIL_POST_HALF} from './organLoft';
/**
 * As in the original hall, no staircase stands inside the room: the galleries are reached by stairs
 * in the corridors behind the rear wall. Each side links the parterre door beside the central entrance
 * with the gallery doorway at the end of the rear gallery.
 */
export const STAIR_DOORS={lower:{x:12.6,z:50},upper:{x:14,z:50.2},height:H.balconyHeight} as const;
/**
 * The corridor stairwell behind the rear wall (one per side, mirrored in x). Two lanes run along the wall:
 * the front lane is a ground-floor passage, the back lane holds one straight flight that rises away from
 * the centre to an upper landing in front of the gallery doorway.
 */
/** Real openings through the rear wall into each corridor: the parterre door and the gallery doorway (world x, y). */
export const STAIR_OPENINGS=[-1,1].flatMap(side=>[
 {minX:side*STAIR_DOORS.lower.x-1.9,maxX:side*STAIR_DOORS.lower.x+1.9,minY:0,maxY:6.55},
 {minX:side*STAIR_DOORS.upper.x-1.075,maxX:side*STAIR_DOORS.upper.x+1.075,minY:H.balconyHeight,maxY:H.balconyHeight+5.25},
]);
export const STAIR_CORRIDOR={front:H.rear+.25,back:H.rear+5.9,innerX:.4,outerX:15.8,passageZ:H.rear+1.7,flightZ:H.rear+4.55,flightWidth:2.4,flightStart:2.6,flightEnd:12.8,landingX:12.6,steps:30} as const;
/** Height of the flight's walking surface at this |x|. */
export function corridorStairHeight(x:number){const c=STAIR_CORRIDOR,t=(Math.abs(x)-c.flightStart)/(c.flightEnd-c.flightStart);return Math.max(0,Math.min(1,t))*H.balconyHeight;}
/** Walking line through the corridor stair from one stair door to its partner; reversed for the way down. */
export function corridorRoute(side:number,up:boolean){
 const c=STAIR_CORRIDOR,y=H.balconyHeight,lo=STAIR_DOORS.lower,hi=STAIR_DOORS.upper;
 // A roomy turn at the foot (clear of the end wall and the first baluster) and a wide upper landing.
 const turn=(c.innerX+c.flightStart)/2+.2;
 const points=[[lo.x,0,lo.z],[lo.x,0,H.rear-.4],[lo.x,0,c.passageZ],[turn,0,c.passageZ],[turn,0,c.flightZ],[c.flightStart,0,c.flightZ],[c.flightEnd,y,c.flightZ],[14.6,y,c.flightZ],[hi.x,y,c.passageZ],[hi.x,y,H.rear-.4],[hi.x,y,hi.z]].map(([x,py,z])=>({x:side*x,y:py,z}));
 return up?points:points.reverse();
}
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
