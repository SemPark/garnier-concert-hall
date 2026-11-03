import * as T from 'three';
import {LOWER_HALL as L,LOWER_STATUES,LOWER_CELLS} from '../../shared/lowerHall';
import {WALL_DATUM} from './HallWallBands';
import {box,cylinder,sphere,line,material} from './primitives';
import {hallImage} from './HallTextures';
import {hallPanelSconce} from './HallLighting';

const GOLD=0xc69b49,LIGHT=0xe7c77a,IVORY=0xe8d6ac,RED=0x753e31;
const gold=material(GOLD,.68,.34),pale=material(LIGHT,.6,.38);
const shaftGeometry=new T.CylinderGeometry(.19,.25,2.55,12);
const torsoGeometry=new T.LatheGeometry([[0,0],[.24,0],[.23,.18],[.31,.42],[.35,.72],[.28,.92],[.17,1.02],[0,1.02]].map(([r,y])=>new T.Vector2(r,y)),16);
let foldedPrototype:T.Group|undefined;
/** A single draped herm, with folded arms; its crown meets the first-floor soffit. */
function foldedCaryatid(parent:T.Object3D,x:number){
 if(foldedPrototype){const copy=foldedPrototype.clone(true);copy.position.x=x;parent.add(copy);return copy;}
 const g=new T.Group();g.position.x=x;g.userData.landmark='first-floor-folded-caryatid';g.userData.occluderGroup=true;parent.add(g);
 // The ornamental pedestal is as high as the projecting front parapet.
 for(const [w,h,y,d]of [[1.02,.14,.07,.66],[.88,.13,.205,.58],[.74,.70,.62,.51],[.84,.12,1.03,.59],[.96,.14,1.16,.68]])box(g,[w,h,d],[0,y,.31],GOLD).material=gold;
 hallImage(g,'relief',.64,.57,0,.63,.58);
 for(const sign of [-1,1]){
  const curl=new T.Mesh(new T.TorusGeometry(.13,.025,5,12,Math.PI*1.6),pale);curl.position.set(sign*.22,.85,.60);curl.rotation.z=sign*.5;g.add(curl);
 }
 // Stepped base and tall tapering shaft under the draped upper figure.
 for(const [w,h,y]of [[.72,.13,1.29],[.62,.11,1.41],[.53,.10,1.515]])box(g,[w,h,.48],[0,y,.30],LIGHT).material=pale;
 const shaft=new T.Mesh(shaftGeometry,gold);shaft.position.set(0,2.84,.31);g.add(shaft);
 const robe=new T.Mesh(new T.CylinderGeometry(.30,.21,1.9,16),gold);robe.position.set(0,4.58,.35);g.add(robe);
 for(let i=0;i<9;i++){
  const x=(i-4)*.066,points=[new T.Vector3(x*.38,5.49,.57),new T.Vector3(x*1.15,4.85,.59),new T.Vector3(x*.7,4.15,.56),new T.Vector3(x*.55,3.6+.18*Math.abs(i-4),.46)];
  const fold=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.018,5,false),i%2?gold:pale);g.add(fold);
 }
 const knot=sphere(g,.12,[0,5.43,.65],LIGHT);knot.material=pale;knot.scale.set(.12,.078,.066);
 const torso=new T.Mesh(torsoGeometry,gold);torso.position.set(0,5.45,.34);g.add(torso);
 cylinder(g,.105,.24,[0,6.56,.33],GOLD).material=gold;
 // Arms stay across the chest, with hands resting on the opposite forearm.
 for(const sign of [-1,1]){
  sphere(g,.115,[sign*.30,6.23,.37],GOLD).material=gold;
  line(g,new T.Vector3(sign*.30,6.23,.39),new T.Vector3(sign*.37,5.88,.52),.095,GOLD).material=gold;
  line(g,new T.Vector3(sign*.37,5.88,.52),new T.Vector3(-sign*.16,6.02+sign*.065,.67),.080,GOLD).material=gold;
  sphere(g,.085,[-sign*.16,6.02+sign*.065,.67],LIGHT).material=pale;
 }
 const head=sphere(g,.28,[0,6.91,.34],GOLD);head.material=gold;head.scale.set(.238,.3416,.224);
 const hair=sphere(g,.29,[0,7.03,.30],GOLD);hair.material=gold;hair.scale.set(.2639,.1914,.2349);
 for(const sign of [-1,1])for(let i=0;i<3;i++)sphere(g,.045,[sign*(.21+i*.012),6.97-i*.105,.35],LIGHT).material=pale;
 sphere(g,.052,[0,6.94,.575],LIGHT).material=pale;
 for(const sign of [-1,1])line(g,new T.Vector3(sign*.055,7.005,.557),new T.Vector3(sign*.12,7.005,.535),.012,0x8e622a);
 line(g,new T.Vector3(-.055,6.81,.547),new T.Vector3(.055,6.81,.547),.012,0x8e622a);
 // A rounded capital rises directly from the head into the soffit, without raised arms.
 cylinder(g,.32,.20,[0,7.34,.32],LIGHT).material=pale;
 const bowl=new T.Mesh(new T.CylinderGeometry(.43,.30,.32,16),gold);bowl.position.set(0,7.58,.32);g.add(bowl);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;line(g,new T.Vector3(Math.cos(a)*.28,7.43,.32+Math.sin(a)*.28),new T.Vector3(Math.cos(a)*.40,7.73,.32+Math.sin(a)*.40),.018,LIGHT);}
 box(g,[1.02,.16,.75],[0,L.ceiling-.08,.32],LIGHT).material=pale;
 g.traverse(o=>{o.userData.fullDetail=true;});foldedPrototype=g.clone(true);return g;
}

type DoorBuilder=(parent:T.Object3D,x:number,bottom:number,width:number,height:number,z?:number,panels?:number)=>T.Group;
/** A continuous first-floor elevation: one broad centre door, single figures, generous cream fields. */
export function buildLowerHallFacade(scene:T.Scene,side:number,door:DoorBuilder){
 const root=new T.Group();root.position.x=side*WALL_DATUM.halfWidth;root.rotation.y=side<0?Math.PI/2:-Math.PI/2;root.userData.landmark='first-floor-side-composition';scene.add(root);
 const X=(z:number)=>side*z;
 // Each normal cell contains exactly two equal wall fields. The doorway cell stays intact.
 const fields=LOWER_CELLS.filter(c=>c.index!==0).flatMap(c=>[{a:c.start+.5,b:c.center-.5},{a:c.center+.5,b:c.end-.5}]);
 const first=LOWER_CELLS[0],last=LOWER_CELLS.at(-1)!;
 // End pieces close the corners without changing the repeated cell widths.
 fields.push({a:L.front,b:first.start-.5},{a:last.end+.5,b:L.rear});
 for(const {a,b}of fields){
  const mid=X((a+b)/2),w=b-a;if(w<.1)continue;
  const field=box(root,[w,7.5,.12],[mid,3.75,.10],IVORY);field.userData.smoothStone=true;field.userData.landmark='first-floor-cell-field';field.userData.interval=[a,b];
  for(const dx of [-w/2,w/2]){box(root,[.075,6.83,.08],[mid+dx,3.70,.20],RED);box(root,[.027,6.71,.04],[mid+dx+(dx<0?.06:-.06),3.70,.26],LIGHT);}
  for(const y of [.32,7.08]){box(root,[w,.075,.08],[mid,y,.20],RED);box(root,[w-.10,.027,.04],[mid,y+(y<1?.06:-.06),.26],LIGHT);}
  if(w>1.3)hallPanelSconce(root,mid,5.10,.31);
 }
 for(const z of LOWER_STATUES)foldedCaryatid(root,X(z));
 const entrance=door(root,X(L.doorZ),0,L.doorWidth,L.doorHeight,.40);entrance.userData.landmark='first-floor-centre-door';
 for(const sign of [-1,1])box(root,[.30,7.23,.20],[X(L.doorZ)+sign*2.75,3.62,.33],RED);
 for(const [w,h,y,d]of [[5.9,.28,7.08,.48],[6.2,.17,7.31,.56],[6.42,.12,7.49,.65]])box(root,[w,h,d],[X(L.doorZ),y,.29],LIGHT);
 hallImage(root,'relief',5.65,.23,X(L.doorZ),7.08,.55);
 root.traverse(o=>{if(o instanceof T.Mesh)o.userData.fullDetail=true;});return root;
}
