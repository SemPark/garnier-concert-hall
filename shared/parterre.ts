/** Lowered audience floor; the rear entrances and column bases stay on the original datum. */
export const PARTERRE={floor:-1.3,front:-9.5,stairFront:39.8,stairBack:43.35,stairHalfWidth:9.1,steps:7,sideFront:12.2,sideStairRun:2.9,sideStairWidth:4.8,sideStairZ:[13.325]} as const;
/** Continuous walking envelope over the shallow physical treads, avoiding a camera bump at every riser. */
export function parterreHeight(x:number,z:number):number|null{
 const side=Math.abs(x);
 if(z>=PARTERRE.stairFront&&z<44.3&&side>=PARTERRE.stairHalfWidth)return null;
 if(side>=PARTERRE.sideFront&&side<=PARTERRE.sideFront+PARTERRE.sideStairRun&&PARTERRE.sideStairZ.some(center=>Math.abs(z-center)<PARTERRE.sideStairWidth/2))return PARTERRE.floor*(1-(side-PARTERRE.sideFront)/PARTERRE.sideStairRun);
 if(side>=PARTERRE.sideFront)return 0;
 if(z<PARTERRE.stairFront)return PARTERRE.floor;
 if(z>=PARTERRE.stairBack)return 0;
 if(Math.abs(x)>PARTERRE.stairHalfWidth-.28)return null;
 return PARTERRE.floor*(1-(z-PARTERRE.stairFront)/(PARTERRE.stairBack-PARTERRE.stairFront));
}
