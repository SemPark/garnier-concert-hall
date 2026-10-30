import * as T from 'three';
import {STAIR} from '../../shared/venue';
import {GOLDEN_HALL as H} from '../../shared/goldenHall';
import {GALLERY_FLOORS,GALLERY_RAIL_HEIGHT} from '../../shared/gallery';
import {box,cylinder,line,text,C} from './primitives';
/** Two real stair flights connect the rear aisle to both side galleries. */
export function buildStairs(scene:T.Scene){
 const surfaces:T.Mesh[]=[],collision:T.Mesh[]=[];const tread=(STAIR.topX-STAIR.bottomX)/STAIR.steps;
 for(const side of [-1,1]){
  for(let i=0;i<STAIR.steps;i++){
   const h=(i+1)/STAIR.steps*STAIR.height,x=side*(STAIR.bottomX+(i+.5)*tread),step=box(scene,[tread+.012,h,STAIR.width],[x,h/2,STAIR.z],0x9b6d3a);surfaces.push(step);
   box(scene,[tread,.025,STAIR.width],[x,h+.015,STAIR.z],0xd4b171);
  }
  for(const edge of [-1,1]){
   const z=STAIR.z+edge*(STAIR.width/2+.05);line(scene,new T.Vector3(side*(STAIR.bottomX+.25),1.18,z),new T.Vector3(side*(STAIR.topX-.8),STAIR.height+.42,z),.045,C.goldLight);
   for(let i=0;i<=8;i++){const x=side*(STAIR.bottomX+.25+i/8*(STAIR.topX-STAIR.bottomX-1.05)),h=(Math.abs(x)-STAIR.bottomX)/(STAIR.topX-STAIR.bottomX)*STAIR.height;cylinder(scene,.025,1,[x,h+.5,z],C.gold);}
  }
  text(scene,'2F / BALCONY',2.8,[side*7.5,1.7,STAIR.z-1.07]).rotation.y=Math.PI;
 }
 // The rear connecting gallery is offset from the stairs so it does not cap their headroom.
 for(const r of GALLERY_FLOORS){const target=new T.Mesh(new T.BoxGeometry(r.maxX-r.minX,.01,r.maxZ-r.minZ),new T.MeshBasicMaterial({visible:false}));target.position.set((r.minX+r.maxX)/2,H.balconyHeight-.005,(r.minZ+r.maxZ)/2);scene.add(target);surfaces.push(target);}
 for(const z of [44.85,47.15]){const cap=.08,panel=GALLERY_RAIL_HEIGHT-cap;box(scene,[25.2,panel,.08],[0,H.balconyHeight+panel/2,z],C.gold);box(scene,[25.2,cap,.16],[0,H.balconyHeight+GALLERY_RAIL_HEIGHT-cap/2,z],C.goldLight);}
 return {surfaces,collision};
}
