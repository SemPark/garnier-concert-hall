import {GOLDEN_HALL as H} from './goldenHall';
export const ORGAN_LOFT_BACK=H.front+.4;
export const ORGAN_RAIL_JOIN_X=12.5;
export const ORGAN_RAIL_POST_HALF=.28;
export function organBalconyFront(x:number){
 const a=Math.abs(x);
 if(a<=4.3)return 7.2+1.8*Math.cos(a/4.3*Math.PI/2)**2;
 if(a<=12.3)return 7.2+.9*Math.sin((a-4.3)/8*Math.PI)**2;
 const t=Math.min(1,(a-12.3)/3.05);return 7.2-4.1*t*t*(3-2*t);
}
export const ORGAN_RAIL_JOIN_Z=ORGAN_LOFT_BACK+organBalconyFront(ORGAN_RAIL_JOIN_X);
/** Every adjoining slab and rail uses these exact vertices, including the joins. */
export const ORGAN_LOFT_CONTOUR=[...new Set([
 ...Array.from({length:81},(_,i)=>-15.35+i/80*30.7),
 ...[-1,1].flatMap(side=>[4.3,12.3,ORGAN_RAIL_JOIN_X,ORGAN_RAIL_JOIN_X-ORGAN_RAIL_POST_HALF,15.35].map(x=>side*x)),
])].sort((a,b)=>a-b).map(x=>({x,z:organBalconyFront(x)}));
