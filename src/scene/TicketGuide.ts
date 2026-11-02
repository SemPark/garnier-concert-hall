import * as T from 'three';
import {BOX_OFFICE_APPROACH,LOBBY_FURNITURE} from '../../shared/grandStair';
import {cylinder,line} from './primitives';

/** Static floor wayfinding and a clear queue lane facing the ticket windows. */
export function buildTicketRails(scene:T.Scene){
 const group=new T.Group();group.userData.landmark='ticket-queue';scene.add(group);
 for(const rail of LOBBY_FURNITURE.ticketRails){
  for(const x of [rail.x-rail.hx,rail.x,rail.x+rail.hx]){cylinder(group,.19,.055,[x,.03,rail.z],0x9c783d);cylinder(group,.045,1,[x,.54,rail.z],0xc5a66a);cylinder(group,.09,.09,[x,1.08,rail.z],0xe4c783);}
  line(group,new T.Vector3(rail.x-rail.hx,.88,rail.z),new T.Vector3(rail.x+rail.hx,.88,rail.z),.045,0x71323a);
 }
}

/** One pulsing marker at the entrance to the queue, matching the hall arrows. */
export function buildTicketGuide(scene:T.Scene){
 const group=new T.Group();group.position.set(-8.3,.035,BOX_OFFICE_APPROACH.z);scene.add(group);
 const targets:T.Object3D[]=[];
 const shape=new T.Shape();shape.moveTo(-.22,-.48);shape.lineTo(.22,-.48);shape.lineTo(.22,.05);shape.lineTo(.51,.05);shape.lineTo(0,.6);shape.lineTo(-.51,.05);shape.lineTo(-.22,.05);shape.closePath();
 const geo=new T.ShapeGeometry(shape),gold=new T.MeshBasicMaterial({color:0xc69a3c}),dark=new T.MeshBasicMaterial({color:0x6c4724});
 const arrowGroup=new T.Group();arrowGroup.rotation.set(-Math.PI/2,0,Math.PI/2);group.add(arrowGroup);
 const rim=new T.Mesh(geo,dark);rim.scale.setScalar(1.18);arrowGroup.add(rim);const arrow=new T.Mesh(geo,gold);arrow.position.z=.003;arrowGroup.add(arrow);
 gold.transparent=true;gold.depthWrite=false;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d')!;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.font='600 54px sans-serif';ctx.lineWidth=9;ctx.strokeStyle='#584024';ctx.strokeText('매표소 · TICKETS',256,80);ctx.fillStyle='#fff0bd';ctx.fillText('매표소 · TICKETS',256,80);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const label=new T.Mesh(new T.PlaneGeometry(3.2,1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));label.position.set(1,.008,1.15);label.rotation.set(-Math.PI/2,0,Math.PI);group.add(label);
 }
 const hit=new T.Mesh(new T.BoxGeometry(1.6,.2,1.2),new T.MeshBasicMaterial({visible:false}));hit.position.set(0,.12,0);group.add(hit);hit.userData.boxOffice=true;targets.push(hit);
 group.traverse(o=>{o.userData.preserveSilhouette=true;o.userData.fullDetail=true;});
 return {targets,update(time:number){gold.opacity=.7+.3*(.5+.5*Math.sin(time*3));arrowGroup.position.x=-.12*Math.sin(time*3);}};
}
