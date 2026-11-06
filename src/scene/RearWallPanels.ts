import * as T from 'three';
import {box,material} from './primitives';
import {hallImage} from './HallTextures';
import {hallPanelSconce} from './HallLighting';

const vineGeometry=new T.TubeGeometry(new T.CatmullRomCurve3([[0,0,0],[.28,-.10,0],[.62,.03,0],[.78,.15,0],[.66,.24,0],[.52,.16,0],[.61,.09,0]].map(p=>new T.Vector3(...p as [number,number,number]))),24,.022,6,false);
const vineGold=material(0xc69b49,.55);
/** A repeated gilt crest, wall lamp and low scroll, centred inside each existing field. */
export function rearPanelDecoration(parent:T.Object3D,width:number,height=7.5,bottom=0,depth=.22){
 const motif=Math.min(2.7,width*.65);
 hallImage(parent,'relief',motif,motif*.35,0,bottom+height*.76,depth+.015);
 hallPanelSconce(parent,0,bottom+height*.45,depth,width-.16,Math.min(6.4,height-.4));
 for(const side of [-1,1]){
  const vine=new T.Mesh(vineGeometry,vineGold);vine.position.set(side*.09,bottom+height*.18,depth+.035);vine.scale.x=side*Math.min(1.4,width*.32);parent.add(vine);
 }
}

/** The rear screen's cream field, red piers and restrained gold mouldings, sized without stretching ornaments. */
export function rearWallPanel(parent:T.Object3D,width:number){
 const root=new T.Group();root.userData.landmark='rear-cream-panel';parent.add(root);
 const field=box(root,[width,7.5,.12],[0,3.75,.10],0xeadfc4);field.userData.smoothStone=true;
 const pier=.50,inner=width-2*pier;
 for(const sign of [-1,1]){
  const x=sign*(width-pier)/2;
  box(root,[pier,7.15,.15],[x,3.72,.20],0x6e3326);
  box(root,[pier-.14,6.88,.04],[x,3.72,.30],0xb3705d);
  box(root,[pier+.12,.24,.22],[x,.16,.22],0x49351e);
  box(root,[pier+.14,.16,.24],[x,7.34,.23],0xe7c77a);
 }
 for(const x of [-inner/2+.07,inner/2-.07])box(root,[.045,5.8,.06],[x,3.4,.20],0xc69b49);
 for(const y of [.5,6.3])box(root,[inner-.14,.045,.06],[0,y,.20],0xc69b49);
 box(root,[width,.16,.20],[0,.13,.19],0xe8d6ac);
 rearPanelDecoration(root,inner);
 root.traverse(o=>{o.userData.fullDetail=true;o.userData.cameraOccluder=true;});return root;
}
/** Use a complete wide or narrow field; leave the remainder as plain stone. */
export function rearWallInfill(parent:T.Object3D,available:number){
 const width=available>=6.6?6.6:available>=3.45?3.45:0;
 return width?rearWallPanel(parent,width):undefined;
}
