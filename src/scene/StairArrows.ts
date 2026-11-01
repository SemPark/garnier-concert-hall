import * as T from 'three';
import {STAIR_DOORS} from '../../shared/gallery';

/** Where each stair arrow lies: on the floor in front of its door, pointing through it. */
export const STAIR_ARROWS=[-1,1].flatMap(side=>[
 {side,up:true,x:side*STAIR_DOORS.lower.x,y:.04,z:STAIR_DOORS.lower.z-1.4,label:'2층으로'},
 {side,up:false,x:side*STAIR_DOORS.upper.x,y:STAIR_DOORS.height+.04,z:STAIR_DOORS.upper.z-1.3,label:'1층으로'},
]);

function arrowShape(){
 const s=new T.Shape();s.moveTo(-.22,-.55);s.lineTo(.22,-.55);s.lineTo(.22,.05);s.lineTo(.55,.05);s.lineTo(0,.62);s.lineTo(-.55,.05);s.lineTo(-.22,.05);s.closePath();return s;
}
function label(value:string){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const c=canvas.getContext('2d')!;
 c.fillStyle='#fff3d2';c.font='600 52px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.shadowColor='#3a2410';c.shadowBlur=8;c.fillText(value,128,50);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 return new T.Mesh(new T.PlaneGeometry(1.2,.45),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
}

export type StairArrows={targets:T.Object3D[];update(time:number):void};
/** Glowing floor arrows at the foot and head of each corridor stair; tapping one takes that stair. Added after batching so they can pulse. */
export function buildStairArrows(scene:T.Scene):StairArrows{
 const material=new T.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.9,depthWrite:false}),outline=new T.MeshBasicMaterial({color:0x5a3410,transparent:true,opacity:.55,depthWrite:false});
 const geometry=new T.ShapeGeometry(arrowShape()),targets:T.Object3D[]=[],arrows:T.Object3D[]=[];
 const hitGeometry=new T.BoxGeometry(1.6,.4,2.4),hitMaterial=new T.MeshBasicMaterial({visible:false});
 for(const a of STAIR_ARROWS){
  const g=new T.Group();g.position.set(a.x,a.y,a.z);g.userData.landmark='stair-arrow';scene.add(g);
  // Shape points along +y; lying flat it points to -z, so turn it to point through the door at +z.
  const arrow=new T.Group();arrow.rotation.set(-Math.PI/2,0,Math.PI);g.add(arrow);arrows.push(arrow);
  // A dark rim keeps the gold arrow readable on the pale timber floor.
  const rim=new T.Mesh(geometry,outline);rim.scale.setScalar(1.2);rim.position.set(0,-.06,-.002);rim.renderOrder=3;arrow.add(rim);
  const face=new T.Mesh(geometry,material);face.renderOrder=4;arrow.add(face);
  const text=label(a.label);if(text){text.rotation.set(-Math.PI/2,0,Math.PI);text.position.set(0,.005,-1);text.renderOrder=3;g.add(text);}
  const hit=new T.Mesh(hitGeometry,hitMaterial);hit.position.set(0,.2,-.4);hit.userData.stairSide=a.side;hit.userData.stairUp=a.up;g.add(hit);targets.push(hit);
 }
 return {targets,update(time){material.opacity=.7+.3*(.5+.5*Math.sin(time*3));for(const arrow of arrows)arrow.position.z=.12*Math.sin(time*3);}};
}
