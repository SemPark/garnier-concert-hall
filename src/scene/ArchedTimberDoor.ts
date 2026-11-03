import * as T from 'three';
import {box,cylinder,line} from './primitives';
import {entranceWoodMaterial} from './HallTextures';
/** A closed double door whose crown follows the stone opening all the way to its spring line. */
export function archedTimberDoor(parent:T.Object3D,width:number,height:number,z:number){
 const root=new T.Group();root.position.z=z;root.name='arched-entrance-double-door';parent.add(root);
 const r=width/2,spring=height-r,shape=new T.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,spring);shape.absarc(0,spring,r,0,Math.PI,false);shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false,curveSegments:32}),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/width,uv.getY(i)/height);
 const body=new T.Mesh(geometry,entranceWoodMaterial());root.add(body);
 const trim=0x32261d;
 box(root,[.025,height,.025],[0,height/2,.18],trim);
 for(const side of [-1,1]){
  for(const row of [0,1]){const w=width*.4,h=spring*.4,x=side*width*.245,y=spring*(.26+row*.47);box(root,[w,h,.045],[x,y,.18],trim);const panel=box(root,[w-.1,h-.1,.035],[x,y,.21],0x513723);panel.material=entranceWoodMaterial();}
  const handle=cylinder(root,.032,.30,[side*.11,spring*.55,.26],0xc9a250);handle.userData.essentialDetail=true;handle.userData.landmark='door-handle';
 }
 // Recessed curved crown panels and a continuous arch moulding.
 for(let i=0;i<40;i++){
  const a=i/40*Math.PI,b=(i+1)/40*Math.PI;
  for(const inset of [.045,.16])line(root,new T.Vector3(Math.cos(a)*(r-inset),spring+Math.sin(a)*(r-inset),.19),new T.Vector3(Math.cos(b)*(r-inset),spring+Math.sin(b)*(r-inset),.19),.022,inset<.1?0x82613b:trim);
 }
 for(const side of [-1,1])box(root,[.06,spring,.05],[side*(r-.06),spring/2,.19],0x82613b);
 box(root,[width-.2,.06,.05],[0,spring,.19],trim);
 root.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});return root;
}
