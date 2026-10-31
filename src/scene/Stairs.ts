import * as T from 'three';
import {STAIR} from '../../shared/venue';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {GALLERY_FLOORS,GALLERY_RAIL_HEIGHT,STAIRWELL_INNER_X} from '../../shared/gallery';
import {box,cylinder,line,C} from './primitives';
import {hallImageMaterial} from './HallTextures';
/** Keep the playable stair route; use the reference's dark timber treads and fine iron railing. */
export function buildStairs(scene:T.Scene){
 const surfaces:T.Mesh[]=[],collision:T.Mesh[]=[];const tread=(STAIR.topX-STAIR.bottomX)/STAIR.steps,rise=STAIR.height/STAIR.steps;
 for(const side of [-1,1]){
  const root=new T.Group();root.userData.landmark='rear-stair';scene.add(root);
  for(let i=0;i<STAIR.steps;i++){
   const h=(i+1)*rise,x=side*(STAIR.bottomX+(i+.5)*tread),step=box(root,[tread+.015,.10,STAIR.width],[x,h-.05,STAIR.z],0x875c36);step.material=hallImageMaterial('walnut');step.userData.landmark='stair-tread';surfaces.push(step);
   box(root,[.035,.025,STAIR.width],[side*(STAIR.bottomX+i*tread+.012),h+.0125,STAIR.z],0xbf9b60);
   box(root,[.035,rise-.06,STAIR.width],[side*(STAIR.bottomX+i*tread),h-rise/2-.04,STAIR.z],0x503824);
  }
  for(const edge of [-1,1]){
   const z=STAIR.z+edge*(STAIR.width/2+.025),rail=GALLERY_RAIL_HEIGHT;
   const a=new T.Vector3(side*(STAIR.bottomX+.06),rail+.04,z),b=new T.Vector3(side*(STAIR.topX-.06),STAIR.height+rail-.04,z);
   const handrail=line(root,a,b,.045,0x68462c);handrail.userData.landmark='stair-handrail';
   // Slim inclined stringers close the tread ends without blocking the space underneath.
   line(root,new T.Vector3(side*STAIR.bottomX,-.13,z),new T.Vector3(side*STAIR.topX,STAIR.height-.13,z),.065,0x5c422c);
   for(let i=0;i<=16;i++){
    const t=i/16,x=side*(STAIR.bottomX+.06+t*(STAIR.topX-STAIR.bottomX-.12)),h=(Math.abs(x)-STAIR.bottomX)/(STAIR.topX-STAIR.bottomX)*STAIR.height;
    cylinder(root,.018,rail,[x,h+rail/2,z],0x353027);
    if(i%4===0){cylinder(root,.035,.07,[x,h+rail-.07,z],C.goldLight);cylinder(root,.035,.07,[x,h+.13,z],C.goldLight);}
   }
  }
  // Gallery-level railing around the opening the stair climbs through.
  const top=H.balconyHeight,rail=GALLERY_RAIL_HEIGHT,near=STAIR.z-STAIR.width/2-.04,far=STAIR.z+STAIR.width/2+.04,inner=side*STAIRWELL_INNER_X,outer=side*(STAIR.topX-.05);
  for(const [a,b]of [[[inner,near],[outer,near]],[[inner,far],[outer,far]],[[inner,near],[inner,far]]]){
   const guard=line(root,new T.Vector3(a[0],top+rail,a[1]),new T.Vector3(b[0],top+rail,b[1]),.045,0x68462c);guard.userData.landmark='stairwell-rail';
   line(root,new T.Vector3(a[0],top+.06,a[1]),new T.Vector3(b[0],top+.06,b[1]),.03,0x5c422c);
   const count=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/.35));
   for(let i=0;i<=count;i++){const t=i/count;cylinder(root,.018,rail,[a[0]+(b[0]-a[0])*t,top+rail/2,a[1]+(b[1]-a[1])*t],0x353027);}
  }
  root.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});
 }
 for(const r of GALLERY_FLOORS){const target=new T.Mesh(new T.BoxGeometry(r.maxX-r.minX,.01,r.maxZ-r.minZ),new T.MeshBasicMaterial({visible:false}));target.position.set((r.minX+r.maxX)/2,H.balconyHeight-.005,(r.minZ+r.maxZ)/2);scene.add(target);surfaces.push(target);}
 return {surfaces,collision};
}
