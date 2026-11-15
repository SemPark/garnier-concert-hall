import * as T from 'three';
import {BOX_OFFICE_APPROACH,LOBBY_FURNITURE} from '../../shared/grandStair';
import {CLOAKROOM_APPROACH} from '../../shared/wardrobe';
import {CAFE_APPROACH} from '../../shared/venue';
import {cylinder,line} from './primitives';

/** Static floor wayfinding and a clear queue lane facing the ticket windows. */
export function buildTicketRails(scene:T.Scene){
 const group=new T.Group();group.userData.landmark='ticket-queue';scene.add(group);
 for(const rail of [...LOBBY_FURNITURE.ticketRails,...LOBBY_FURNITURE.wardrobeRails]){
  for(const x of [rail.x-rail.hx,rail.x,rail.x+rail.hx]){cylinder(group,.19,.055,[x,.03,rail.z],0x9c783d);cylinder(group,.045,1,[x,.54,rail.z],0xc5a66a);cylinder(group,.09,.09,[x,1.08,rail.z],0xe4c783);}
  line(group,new T.Vector3(rail.x-rail.hx,.88,rail.z),new T.Vector3(rail.x+rail.hx,.88,rail.z),.045,0x71323a);
 }
}

/** A floor arrow and label with a matching click target. */
export function buildFloorGuide(parent:T.Object3D,x:number,z:number,turn:number,caption:string,action:string,options:{y?:number;scale?:number;labelTarget?:boolean;arrowAction?:string}={}){
 const group=new T.Group();group.position.set(x,options.y??.035,z);group.scale.setScalar(options.scale??1);parent.add(group);
 const forwardX=-Math.sin(turn),forwardZ=-Math.cos(turn);
 const targets:T.Object3D[]=[];
 const shape=new T.Shape();shape.moveTo(-.22,-.48);shape.lineTo(.22,-.48);shape.lineTo(.22,.05);shape.lineTo(.51,.05);shape.lineTo(0,.6);shape.lineTo(-.51,.05);shape.lineTo(-.22,.05);shape.closePath();
 const geo=new T.ShapeGeometry(shape),gold=new T.MeshBasicMaterial({color:0xc69a3c}),dark=new T.MeshBasicMaterial({color:0x6c4724});
 const arrowGroup=new T.Group();arrowGroup.rotation.set(-Math.PI/2,0,turn);group.add(arrowGroup);
 const rim=new T.Mesh(geo,dark);rim.scale.setScalar(1.18);arrowGroup.add(rim);const arrow=new T.Mesh(geo,gold);arrow.position.z=.003;arrowGroup.add(arrow);
 if(options.arrowAction){
  // Keep a steady tap area around the moving arrow, including its full travel.
  const hit=new T.Mesh(new T.PlaneGeometry(1.4,1.68),new T.MeshBasicMaterial({visible:false}));
  hit.rotation.copy(arrowGroup.rotation);hit.position.y=.005;group.add(hit);
  hit.userData[options.arrowAction]=true;targets.push(hit);
 }
 gold.transparent=true;gold.depthWrite=false;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d')!;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.font='600 54px sans-serif';ctx.lineWidth=9;ctx.strokeStyle='#584024';ctx.strokeText(caption,256,80);ctx.fillStyle='#fff0bd';ctx.fillText(caption,256,80);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const label=new T.Mesh(new T.PlaneGeometry(3.2,1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));label.position.set(-forwardX*1.4,.008,-forwardZ*1.4);label.rotation.set(-Math.PI/2,0,turn);group.add(label);
  if(options.labelTarget){label.userData[action]=true;targets.push(label);}
 }
 if(!options.labelTarget){const hit=new T.Mesh(new T.BoxGeometry(1.6,.2,1.2),new T.MeshBasicMaterial({visible:false}));hit.position.set(0,.12,0);group.add(hit);hit.userData[action]=true;targets.push(hit);}
 group.traverse(o=>{o.userData.preserveSilhouette=true;o.userData.fullDetail=true;});
 return {group,targets,update(time:number){gold.opacity=.7+.3*(.5+.5*Math.sin(time*3));const pulse=.12*Math.sin(time*3);arrowGroup.position.set(forwardX*pulse,0,forwardZ*pulse);}};
}

/** Matching entrance guides for both visitor services. */
export function buildTicketGuide(scene:T.Scene){
 const guides=[
  buildFloorGuide(scene,-8.3,BOX_OFFICE_APPROACH.z,Math.PI/2,'매표소 · TICKETS','boxOffice'),
  buildFloorGuide(scene,8.3,CLOAKROOM_APPROACH.z,-Math.PI/2,'의상 교체 · DRESSING','cloakroom'),
  buildFloorGuide(scene,-8.3,CAFE_APPROACH.z,Math.PI/2,'커피 · 마카롱','cafe'),
 ];
 return {targets:guides.flatMap(g=>g.targets),update(time:number){for(const guide of guides)guide.update(time);}};
}
