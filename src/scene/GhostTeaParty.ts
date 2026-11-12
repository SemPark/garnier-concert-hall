import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type TeaGuest='hatter'|'hare';
export const TEA_TABLE=27;

/** Tea-party costumes with static decorations merged by colour. */
export function buildTeaGuest(role:TeaGuest){
 const root=new T.Group();
 root.name=`tea-party-${role}`;
 const parts=new Map<number,T.BufferGeometry[]>();
 const hat=new T.Group(),ears:T.Group[]=[];
 const hatter=role==='hatter';
 hat.position.y=-.17;
 const add=(color:number,geometry:T.BufferGeometry,x:number,y:number,z:number,tilt=0)=>{
  geometry.rotateZ(tilt);geometry.translate(x,y,z);
  const list=parts.get(color)??[];list.push(geometry);parts.set(color,list);
 };
 const addBatches=(parent:T.Group)=>{
  for(const [color,geometries] of parts){
   const geometry=geometries.length===1?geometries[0]:mergeGeometries(geometries)!;
   parent.add(new T.Mesh(geometry,new T.MeshLambertMaterial({color})));
   if(geometries.length>1)geometries.forEach(part=>part.dispose());
  }
  parts.clear();
 };
 const green=0x658d32,ribbon=0xc8ae36,gold=0xc69b58,ivory=0xe6ddc7,orange=0xc46b27;
 if(hatter){
  add(green,new T.CylinderGeometry(.58,.58,.065,16),0,.37,0,-.12);
  add(green,new T.CylinderGeometry(.43,.31,.77,12),.05,.78,0,-.12);
  add(ribbon,new T.CylinderGeometry(.335,.32,.17,12),.012,.49,0,-.12);
 }else{
  const fur=new T.MeshLambertMaterial({color:0xa87944});
  const inner=new T.MeshLambertMaterial({color:0xd3a080});
  for(const side of [-1,1]){
   const ear=new T.Group();ear.position.set(side*.18,.24,0);
   const shape=new T.Shape();
   shape.moveTo(-.085,0);
   shape.bezierCurveTo(-.15,.25,-.12,.68,0,.91);
   shape.bezierCurveTo(.12,.68,.15,.25,.085,0);
   shape.quadraticCurveTo(0,-.06,-.085,0);
   const geometry=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:10});
   const outer=new T.Mesh(geometry,fur);outer.position.z=-.035;
   const inset=new T.Mesh(new T.ShapeGeometry(shape,10),inner);
   inset.scale.set(.52,.78,1);inset.position.set(0,.065,.047);
   ear.add(outer,inset);
   // Bend the upper part smoothly forward instead of attaching a separate tip.
   if(side===1){
    ear.scale.y=.88;
    for(const mesh of [outer,inset]){
     const position=mesh.geometry.getAttribute('position');
     for(let i=0;i<position.count;i++){
      const y=position.getY(i),height=y*mesh.scale.y+mesh.position.y;
      const bend=Math.max(0,(height-.52)/.39);
      position.setXYZ(i,position.getX(i)+.10*bend*bend/mesh.scale.x,y-.17*bend*bend/mesh.scale.y,position.getZ(i)+.23*bend*bend);
     }
     mesh.geometry.computeVertexNormals();
    }
   }
   ear.rotation.z=-side*.16;ears.push(ear);root.add(ear);
  }
 }
 addBatches(hat);
 if(hatter){
  root.add(hat);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#fff2ce';ctx.fillRect(0,0,256,192);
  ctx.fillStyle='#30271d';ctx.font='bold 92px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('10/6',128,100);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const tag=new T.Mesh(new T.PlaneGeometry(.28,.23),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
  tag.position.set(.18,.69,.39);tag.rotation.z=-.18;hat.add(tag);
  for(const side of [-1,1]){
   add(orange,new T.SphereGeometry(.15,8,5).scale(.7,1.25,.75),side*.35,.12,.02);
  }
 }
 const silk=hatter?0x74a8bd:0xa44939;
 for(const side of [-1,1]){
  add(silk,new T.SphereGeometry(.17,8,5).scale(1,.7,.35),side*.14,-.23,.34,side*.2);
 }
 add(gold,new T.SphereGeometry(.055,8,5),0,-.23,.39);
 addBatches(root);
 const cup=new T.Group();cup.name=`${role}-teacup`;
 const porcelain=new T.MeshLambertMaterial({color:ivory});
 const bowl=new T.LatheGeometry([[0,0],[.06,0],[.09,.04],[.105,.12],[.09,.12],[.075,.04],[0,.025]].map(([x,y])=>new T.Vector2(x,y)),12);
 const handle=new T.TorusGeometry(.05,.012,5,10).translate(-.13,.08,0);
 cup.add(new T.Mesh(mergeGeometries([bowl,handle])!,porcelain));
 bowl.dispose();handle.dispose();
 const tea=new T.Mesh(new T.CircleGeometry(.087,12),new T.MeshBasicMaterial({color:0x754518}));
 tea.rotation.x=-Math.PI/2;tea.position.y=.102;cup.add(tea);
 // The handle is the hand anchor, matching the existing ghost drinking pose.
 for(const child of cup.children){child.position.x+=.13;child.position.y-=.08;}
 return {root,cup,hat,ears};
}
