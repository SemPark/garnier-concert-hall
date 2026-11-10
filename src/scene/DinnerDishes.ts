import {buildCoffeeCup} from '../character/CoffeeCup';
import * as T from 'three';
import {DINNER_TABLES,TABLE_RADIUS} from '../../shared/dinnerTables';
import {PARTERRE} from '../../shared/parterre';
import {SEATS} from '../../shared/venue';
import type {Dish} from '../../shared/dishes';

const mat=(color:number,roughness=.7)=>new T.MeshStandardMaterial({color,roughness});
/** Deep navy china with a gold rim, so the plate stands out on the ivory cloth. */
const plateGeometry=new T.CylinderGeometry(.2,.15,.024,24),rimGeometry=new T.TorusGeometry(.19,.008,6,32).rotateX(Math.PI/2);
const plateMaterial=mat(0x1d2a4a,.3),gold=new T.MeshStandardMaterial({color:0xd4a64a,metalness:.7,roughness:.3}),silver=new T.MeshStandardMaterial({color:0xd8d8d2,metalness:.8,roughness:.25});
/** The colour of one forkful of each dish (shown on the fork on its way to the mouth). */
export const BITE_COLOUR:Record<Dish,number>={bread:0xc98a45,soup:0xe0a24a,steak:0x6b3520,salad:0x5d9a3a,pasta:0xe8c26a,cake:0xf3e2c3,coffee:0x3b2414,wine:0x6d1022};

/** A table fork: handle and four tines along −z (tips at z −0.17), shared by the table setting and the diner's hand. */
export function buildFork(){
 const g=new T.Group(),handle=new T.Mesh(new T.BoxGeometry(.012,.006,.13),silver);handle.position.z=.0;g.add(handle);
 const neck=new T.Mesh(new T.BoxGeometry(.03,.005,.03),silver);neck.position.z=-.08;g.add(neck);
 for(let i=0;i<4;i++){const tine=new T.Mesh(new T.BoxGeometry(.004,.004,.06),silver);tine.position.set(-.012+i*.008,0,-.125);g.add(tine);}
 return g;
}
function buildKnife(){const g=new T.Group(),handle=new T.Mesh(new T.BoxGeometry(.013,.007,.1),silver);handle.position.z=.03;g.add(handle);const blade=new T.Mesh(new T.BoxGeometry(.02,.003,.12),silver);blade.position.z=-.08;g.add(blade);return g;}

/** A wine glass: stem, foot and bowl, with the wine as a disc inside (userData.liquid). Bowl rim about 0.17 m up. */
export function buildWineGlass(){
 const g=new T.Group(),glass=new T.MeshStandardMaterial({color:0xf2f6f6,roughness:.05,metalness:.2,transparent:true,opacity:.6,side:T.DoubleSide});
 const shape=[[.035,0],[.004,.004],[.004,.08],[.02,.09],[.04,.12],[.042,.15],[.036,.175]].map(([x,y])=>new T.Vector2(x,y));
 g.add(new T.Mesh(new T.LatheGeometry(shape,14),glass));
 // The wine fills the bowl from its bottom; each sip leaves a lower, narrower pool, always inside the glass.
 const wineMaterial=new T.MeshStandardMaterial({color:0x6d1022,roughness:.2}),inner=(y:number)=>(y<.12?.02+(y-.09)/.03*.02:.04+(y-.12)/.03*.002)*.9;
 const levels=[.135,.12,.105].map(top=>{const pts=[[0,.093],[.017,.093]];if(top>.12)pts.push([inner(.12),.12]);pts.push([inner(top),top],[0,top]);const m=new T.Mesh(new T.LatheGeometry(pts.map(([x,y])=>new T.Vector2(x,y)),14),wineMaterial);m.visible=top===.135;g.add(m);return m;});
 g.userData.levels=levels;
 return g;
}
/** The very cup the diner lifts (the lobby coffee cup) on a saucer, handle on the diner's right. Its coffee surface
 * (userData.liquid) sinks and narrows with the cup's taper as it is drunk. */
export function buildTableCup(){
 const g=new T.Group(),china=new T.MeshStandardMaterial({color:0xf4ebda,roughness:.35});
 const saucer=new T.Mesh(new T.CylinderGeometry(.11,.085,.012,20),china);saucer.position.y=.006;g.add(saucer);
 const cup=buildCoffeeCup();cup.position.set(0,.012,0);cup.scale.setScalar(1);cup.rotation.y=Math.PI;g.add(cup);
 const surface=cup.children.find(c=>(c as T.Mesh).geometry instanceof T.CircleGeometry)!;g.userData.liquid=surface;
 g.userData.radiusAt=(y:number)=>(.054+(y-.025)/.115*.013)/.065;
 return g;
}
/** Three pieces of each dish, laid round the plate; one goes with each bite. */
const SLOTS=[[-.07,.04],[.075,.03],[0,-.075]] as const,ROW=[[-.055,0],[0,0],[.055,0]] as const;
function food(dish:Dish){
 const g=new T.Group(),chunks:T.Object3D[]=[];
 const piece=(build:(i:number)=>T.Object3D,slots:readonly(readonly[number,number])[]=SLOTS,turn=1.3)=>slots.forEach(([x,z],i)=>{const o=build(i);o.position.x+=x;o.position.z+=z;o.rotation.y+=i*turn;g.add(o);chunks.push(o);});
 const mesh=(geometry:T.BufferGeometry,material:T.Material,y:number)=>{const m=new T.Mesh(geometry,material);m.position.y=y;return m;};
 const ball=(r:number,color:number,x:number,y:number,z:number,sy=1)=>{const m=new T.Mesh(new T.SphereGeometry(r,10,8),mat(color,.6));m.position.set(x,y,z);m.scale.y=sy;return m;};
 if(dish==='bread')piece(()=>{
  // A round golden roll with a pale cross cut on top.
  const roll=new T.Group();roll.add(ball(.058,0xc98a45,0,.036,0,.68));
  for(const turn of [0,Math.PI/2]){const cut=new T.Mesh(new T.BoxGeometry(.075,.008,.012),mat(0xf0d9a4));cut.position.y=.074;cut.rotation.y=turn;roll.add(cut);}
  return roll;});
 else if(dish==='soup'){
  const bowl=mesh(new T.LatheGeometry([[0,0],[.09,0],[.16,.075],[.168,.08]].map(([x,y])=>new T.Vector2(x,y)),18),mat(0xf6f1e8,.35),0);(bowl.material as T.Material).side=T.DoubleSide;g.add(bowl);
  const liquid=mesh(new T.CircleGeometry(.15,18).rotateX(-Math.PI/2),mat(0xe8963a,.45),.066);g.add(liquid);g.userData.liquid=liquid;
  const cream=mesh(new T.TorusGeometry(.05,.008,4,16).rotateX(Math.PI/2),mat(0xfff3dc,.5),.002);liquid.add(cream);
  piece(()=>mesh(new T.BoxGeometry(.04,.03,.04),mat(0xc98a45),.074));
  for(const c of chunks){c.position.x*=.8;c.position.z*=.8;}
 }
 else if(dish==='steak'){
  // Three thick slices side by side, seared outside and pink inside, with greens and a potato beside them.
  piece(()=>{const slice=new T.Group();slice.add(mesh(new T.BoxGeometry(.044,.044,.12),mat(0xc8554f,.55),.03));
   for(const y of [.055,.008]){slice.add(mesh(new T.BoxGeometry(.048,.012,.124),mat(0x4a2414,.7),y));}
   return slice;},ROW,0);
  for(const c of chunks)c.position.z+=.03;
  for(const x of [-.07,-.04,-.01]){const stalk=new T.Mesh(new T.CapsuleGeometry(.009,.08,3,6),mat(0x4f8a35));stalk.rotation.z=Math.PI/2;stalk.rotation.y=.5;stalk.position.set(x+.01,.012,-.085-x*.2);g.add(stalk);}
  g.add(ball(.03,0xe8c56a,.09,.022,-.09,.75));
 }
 else if(dish==='salad')piece(i=>{
  // A heap of leaves in two greens with a tomato and a bit of cheese on top.
  const heap=new T.Group(),greens=[0x5d9a3a,0x86b84a,0x3f7a2e];
  for(let k=0;k<5;k++){const leaf=new T.Mesh(new T.IcosahedronGeometry(.034,0),mat(greens[(k+i)%3],.8));const a=k*1.26;leaf.position.set(Math.cos(a)*.032*(k<4?1:0),.022+(k===4?.03:k%2*.012),Math.sin(a)*.032*(k<4?1:0));leaf.scale.set(1.2,.55,1);leaf.rotation.set(k,k*2,k*.7);heap.add(leaf);}
  heap.add(ball(.02,0xd8322a,.022,.066,.01));heap.add(mesh(new T.BoxGeometry(.022,.018,.022),mat(0xfff0c8),.066).translateX(-.024));
  return heap;});
 else if(dish==='pasta'){
  // One big twirled mound of noodles with tomato sauce and basil; it shrinks with each forkful.
  const mound=new T.Group(),noodle=mat(0xf0cf72,.55);
  for(const [r,y] of [[.115,.014],[.1,.036],[.08,.057],[.056,.076]] as const){const ring=new T.Mesh(new T.TorusGeometry(r,.019,6,22),noodle);ring.rotation.x=Math.PI/2;ring.rotation.z=y*40;ring.position.y=y;mound.add(ring);}
  mound.add(mesh(new T.CylinderGeometry(.09,.1,.05,14),noodle,.03));
  const sauce=new T.Mesh(new T.SphereGeometry(.062,12,6,0,Math.PI*2,0,Math.PI/2),mat(0xb3261e,.5));sauce.scale.y=.6;sauce.position.y=.078;mound.add(sauce);
  for(const [x,z] of [[.012,0],[-.016,.018]]){const basil=new T.Mesh(new T.IcosahedronGeometry(.02,0),mat(0x3f7a2e));basil.scale.set(1.4,.35,.9);basil.position.set(x,.118,z);mound.add(basil);}
  g.add(mound);g.userData.mound=mound;
 }
 else piece(()=>{
  // A wedge of layered sponge and cream with a strawberry on top.
  // A solid sector (cut faces included), extruded upward.
  const sector=new T.Shape([new T.Vector2(0,0),...Array.from({length:7},(_,k)=>new T.Vector2(Math.cos(k*Math.PI/18)*.085,Math.sin(k*Math.PI/18)*.085))]);
  const wedge=new T.Group(),slice=(h:number,color:number,y:number)=>{const m=mesh(new T.ExtrudeGeometry(sector,{depth:h,bevelEnabled:false,curveSegments:6}).rotateX(-Math.PI/2),mat(color,.6),y-h/2);(m.material as T.Material).side=T.DoubleSide;wedge.add(m);};
  slice(.03,0xf3d9a8,.017);slice(.012,0xfff6e6,.038);slice(.03,0xf3d9a8,.059);slice(.014,0xfff6e6,.081);
  wedge.add(ball(.017,0xd8322a,.048,.1,-.028));wedge.position.set(-.045,0,.03);const holder=new T.Group();holder.add(wedge);return holder;});
 g.userData.chunks=chunks;return g;
}
/** The diner's drink, beside the plate: the coffee cup on its saucer or the wine glass. */
function drinkVessel(drink:'coffee'|'wine'){
 const g=new T.Group(),glass=drink==='wine',cup=glass?buildWineGlass():buildTableCup();if(glass)cup.scale.setScalar(WINE_SCALE);g.add(cup);g.userData.vessel=cup;g.userData.levels=cup.userData.levels;
 if(!glass){g.userData.liquid=cup.userData.liquid;g.userData.radiusAt=cup.userData.radiusAt;}
 return g;
}
/** How much bigger than modelled the wine glass is drawn, on the table and in the hand. */
export const WINE_SCALE=1.6;

type Served={root:T.Group;food:T.Group;fork?:T.Object3D;kind:string;seatId:string};
type Diner={id:string;seatId:string|null;dish?:Dish;dishBites?:number;drink?:'coffee'|'wine';drinkSips?:number;own:boolean;eating:boolean;sipping:boolean};

/**
 * Dinner settings on the tables, in front of whoever ordered: a navy plate with three pieces of the dish, a fork on the
 * left and a knife on the right, and the drink (coffee or wine) to the right beyond the knife. Each bite takes one piece
 * away; while the diner eats, the table fork is in their hand, and while they sip, the cup or glass is.
 * The viewer's own plate and drink can be tapped (their meshes carry userData.ownDish = 'eat' | 'drink').
 */
export class DinnerDishes{
 private served=new Map<string,Served>();
 readonly targets:T.Object3D[]=[];
 constructor(private scene:T.Scene){}
 update(diners:Iterable<Diner>){
  const seen=new Set<string>();
  for(const d of diners){
   if(!d.seatId||!d.dish&&!d.drink)continue;const seat=SEATS.find(s=>s.id===d.seatId);if(!seat||seat.level!=='parterre')continue;
   for(const drink of [false,true]){
    const kind=drink?d.drink:d.dish;if(!kind)continue;const key=d.id+(drink?':drink':':food');
    seen.add(key);let s=this.served.get(key);
    if(!s||s.kind!==kind||s.seatId!==d.seatId){
     if(s)this.remove(key);
     const table=DINNER_TABLES[seat.row-1],dx=seat.x-table.x,dz=seat.z-table.z,len=Math.hypot(dx,dz)||1,r=TABLE_RADIUS-.28;
     // Local +z points from the diner into the table: the diner's left is +x. Fork left, knife right, tips away.
     const root=new T.Group();root.position.set(table.x+dx/len*r,PARTERRE.floor+.77,table.z+dz/len*r);root.rotation.y=Math.atan2(dx,dz)+Math.PI;
     let meal:T.Group,fork:T.Object3D|undefined;
     if(drink){meal=drinkVessel(d.drink!);meal.position.set(-.3,0,.2);root.add(meal);}
     else{
      const plate=new T.Mesh(plateGeometry,plateMaterial);plate.position.y=.012;root.add(plate);const rim=new T.Mesh(rimGeometry,gold);rim.position.y=.025;root.add(rim);
      meal=food(d.dish!);meal.position.y=.024;root.add(meal);
      fork=buildFork();fork.position.set(.27,.004,0);fork.rotation.y=Math.PI;root.add(fork);const knife=buildKnife();knife.position.set(-.27,.004,0);knife.rotation.y=Math.PI;root.add(knife);
     }
     this.scene.add(root);s={root,food:meal,fork,kind,seatId:d.seatId};this.served.set(key,s);
     if(d.own)root.traverse(o=>{if(o instanceof T.Mesh){o.userData.ownDish=drink?'drink':'eat';this.targets.push(o);}});
    }
    const bites=Math.min(3,(drink?d.drinkSips:d.dishBites)??0);
    (s.food.userData.chunks as T.Object3D[]|undefined)?.forEach((c,i)=>{c.visible=i>=bites;});
    const mound=s.food.userData.mound as T.Object3D|undefined;if(mound){mound.visible=bites<3;mound.scale.setScalar(1-bites*.2);}
    const liquid=s.food.userData.liquid as T.Object3D|undefined;
    if(liquid){liquid.visible=bites<3;liquid.position.y=drink?.125-.03*bites:.066-.018*bites;const at=s.food.userData.radiusAt as ((y:number)=>number)|undefined;liquid.scale.setScalar(at?at(liquid.position.y):1-bites*.12);}
    (s.food.userData.levels as T.Object3D[]|undefined)?.forEach((l,i)=>{l.visible=i===bites;});
    // While a drink is being sipped it is in the diner's hand, not on the table; so is the fork while eating.
    const vessel=s.food.userData.vessel as T.Object3D|undefined;if(vessel)vessel.visible=!d.sipping;
    if(s.fork)s.fork.visible=!d.eating;
   }
  }
  for(const key of [...this.served.keys()])if(!seen.has(key))this.remove(key);
 }
 private remove(id:string){const s=this.served.get(id);if(!s)return;s.root.removeFromParent();s.root.traverse(o=>{const i=this.targets.indexOf(o);if(i>=0)this.targets.splice(i,1);});this.served.delete(id);}
}
