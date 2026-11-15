import {walkable,type Point,type Zone} from './venue';

export const VISITOR_GAP=.88;
/** Sweep the whole step, so a long network packet cannot jump through another visitor. */
export function visitorBlocksStep(from:Point,to:Point,other:Point,gap=VISITOR_GAP){
 const x=from.x-other.x,y=(from.y??0)-(other.y??0),z=from.z-other.z;
 const dx=to.x-from.x,dy=(to.y??0)-(from.y??0),dz=to.z-from.z,length=dx*dx+dy*dy+dz*dz;
 const start=x*x+y*y+z*z,end=(x+dx)**2+(y+dy)**2+(z+dz)**2,radius=gap**2;
 // Existing overlaps can always separate, including visitors from an older version.
 if(start<radius&&end>start+.000001&&x*dx+y*dy+z*dz>=0)return false;
 const t=length?Math.max(0,Math.min(1,-(x*dx+y*dy+z*dz)/length)):0;
 return (x+t*dx)**2+(y+t*dy)**2+(z+t*dz)**2<radius-.000001;
}

/** Find a walkable landing point for entry, relocation, or standing up. */
export function freeVisitorPosition(zone:Zone,origin:Point):Point|null{
 const free=(p:Point)=>walkable(zone,p);
 if(free(origin))return {...origin};
 for(let ring=1;ring<=16;ring++){
  const radius=ring*.92,count=Math.ceil(Math.PI*2*ring);
  for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,p={x:origin.x+Math.sin(angle)*radius,y:origin.y??0,z:origin.z+Math.cos(angle)*radius};if(free(p))return p;}
 }
 return null;
}
