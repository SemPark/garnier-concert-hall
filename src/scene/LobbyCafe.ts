import * as T from 'three';
import {Avatar} from '../character/Avatar';
import {buildCoffeeCup,buildMacaron} from '../character/CoffeeCup';
import {LOBBY_FURNITURE as F} from '../../shared/grandStair';
import {box,cylinder,line,text} from './primitives';
import {woodMaterial} from './HallTextures';

const PRICE_SIZE=122;

/** A staffed café contained inside one arcade bay, leaving the columns and the walking aisle clear. */
export function buildLobbyCafe(scene:T.Scene,clickTargets:T.Object3D[]){
 const g=new T.Group();g.name='lobby-cafe';g.position.set(F.cafeCounter.x,0,F.cafeCounter.z);g.rotation.y=Math.PI/2;scene.add(g);
 const brass=0xb8934f,walnut=0x513725,marble=0xe8e1d3,green=0x24473b;
 const part=(name:string)=>{const group=new T.Group();group.name=`cafe-${name}`;g.add(group);return group;};
 const counter=part('counter');
 box(counter,[4.05,1.02,.68],[0,.51,0],walnut).material=woodMaterial('walnut');
 box(counter,[4.16,.08,.84],[0,1.06,.015],marble);
 for(const x of [-1.35,0,1.35]){
  box(counter,[1.18,.73,.035],[x,.51,.36],brass);
  box(counter,[1.08,.63,.025],[x,.51,.39],green);
 }
 // A brass foot rail and stone top give the standing espresso bar its familiar profile.
 line(counter,new T.Vector3(-1.82,.22,.57),new T.Vector3(1.82,.22,.57),.025,brass);
 for(const x of [-1.62,1.62])line(counter,new T.Vector3(x,.22,.35),new T.Vector3(x,.22,.57),.02,brass);
 // The timber back and shelves sit behind the employee, not through their body or the counter.
 const back=part('back-wall');box(back,[4.08,3.55,.10],[0,1.83,-1.77],walnut).material=woodMaterial('walnut');
 box(back,[4.08,.07,.16],[0,3.60,-1.70],brass);
 const menu=part('menu');box(menu,[1.14,1.2,.055],[-1.32,2.49,-1.68],brass);box(menu,[1.06,1.12,.025],[-1.32,2.49,-1.64],0x25211b);
 const menuCanvas=document.createElement('canvas');menuCanvas.width=512;menuCanvas.height=640;
 const ink=menuCanvas.getContext('2d')!;ink.fillStyle='#edd9ac';ink.textAlign='center';ink.textBaseline='middle';
 ink.font='60px Georgia,serif';ink.fillText('CAFFÈ',256,90);
 ink.strokeStyle='#a88b54';ink.lineWidth=2;ink.beginPath();ink.moveTo(85,165);ink.lineTo(427,165);ink.stroke();
 for(const [label,y] of [['ESPRESSO',250],['CAPPUCCINO',350],['MACARON',450]] as const){ink.font='40px Georgia,serif';ink.fillText(label,256,y);}
 ink.font='32px sans-serif';ink.fillText('커피 · 마카롱',256,555);
 const menuMap=new T.CanvasTexture(menuCanvas);menuMap.colorSpace=T.SRGBColorSpace;
 const lettering=new T.Mesh(new T.PlaneGeometry(1.02,1.08),new T.MeshBasicMaterial({map:menuMap,transparent:true,depthWrite:false}));lettering.position.set(-1.32,2.49,-1.61);menu.add(lettering);
 // A matte green price board in a brass frame; the upper rows remain visible above the barista.
 const mirror=part('mirror');box(mirror,[1.06,1.4,.055],[0,2.35,-1.68],brass);
 box(mirror,[.98,1.32,.025],[0,2.35,-1.64],green);
 const priceCanvas=document.createElement('canvas');priceCanvas.width=768;priceCanvas.height=1024;
 const priceInk=priceCanvas.getContext('2d')!;
 // Chalk-style handwriting, drawn large enough to read from the lobby floor.
 const hand='"Single Day","Noto Serif KR",serif';
 const drawPrices=()=>{
  priceInk.clearRect(0,0,768,1024);priceInk.fillStyle='#f1dfb4';priceInk.strokeStyle='#b99a60';priceInk.lineWidth=3;priceInk.textBaseline='middle';
  priceInk.textAlign='center';priceInk.font=`120px ${hand}`;priceInk.fillText('차림표',384,115);
  for(const y of [220,660]){priceInk.beginPath();priceInk.moveTo(30,y);priceInk.lineTo(738,y);priceInk.stroke();}
  for(const [label,price,y] of [['커피','5,000원',340],['마카롱','3,000원',540]] as const){
   priceInk.font=`${PRICE_SIZE}px ${hand}`;priceInk.textAlign='left';priceInk.fillText(label,30,y);priceInk.textAlign='right';priceInk.fillText(price,738,y);
  }
 };
 drawPrices();
 const priceMap=new T.CanvasTexture(priceCanvas);priceMap.colorSpace=T.SRGBColorSpace;
 // The web font may arrive after the scene is built; redraw once it is ready.
 document.fonts?.load(`${PRICE_SIZE}px "Single Day"`,'차림표커피마카롱0123456789,원').then(()=>{drawPrices();priceMap.needsUpdate=true;}).catch(()=>{});
 const prices=new T.Mesh(new T.PlaneGeometry(.94,1.28),new T.MeshBasicMaterial({map:priceMap,transparent:true,depthWrite:false}));prices.position.set(0,2.35,-1.61);mirror.add(prices);
 const clock=new T.Mesh(new T.CircleGeometry(.16,24),new T.MeshLambertMaterial({color:0xe9dcc1}));clock.position.set(0,3.32,-1.64);mirror.add(clock);
 const rim=new T.Mesh(new T.TorusGeometry(.17,.018,5,24),new T.MeshStandardMaterial({color:brass,metalness:.7,roughness:.35}));rim.position.set(0,3.32,-1.64);mirror.add(rim);
 line(mirror,new T.Vector3(0,3.32,-1.61),new T.Vector3(.085,3.36,-1.61),.008,0x423327);line(mirror,new T.Vector3(0,3.32,-1.61),new T.Vector3(-.02,3.43,-1.61),.007,0x423327);
 const shelves=part('cup-shelf');
 for(const y of [2.47,3.04]){
  box(shelves,[1.22,.065,.30],[1.28,y,-1.49],brass);
  for(let i=0;i<4;i++){const x=.87+i*.27;cylinder(shelves,.083,.022,[x,y+.045,-1.46],marble);cylinder(shelves,.062,.11,[x,y+.11,-1.46],marble);}
 }
 const strip=box(shelves,[1.10,.025,.06],[1.28,3.00,-1.36],0xffd086);strip.material=new T.MeshLambertMaterial({color:0xffd086,emissive:0xffbf66,emissiveIntensity:.7});
 // The preparation bench is behind the serving counter, on the barista's own right (visitor's left).
 const workbench=part('preparation-bench');box(workbench,[.82,1.02,1.10],[-1.30,.51,-1.10],walnut).material=woodMaterial('walnut');
 box(workbench,[.88,.06,1.14],[-1.30,1.05,-1.10],marble);
 const machine=part('espresso-machine');machine.position.set(-1.30,1.08,-1.10);machine.rotation.y=Math.PI/2;
 // Brew controls face the barista's workspace, so visitors see the side of the machine.
 box(machine,[.82,.38,.48],[0,.22,0],0x696c68);box(machine,[.75,.21,.035],[0,.24,.26],0x252724);
 for(const x of [-.185,.185]){
  cylinder(machine,.085,.17,[x,.50,0],0x36291e);line(machine,new T.Vector3(x,.26,.28),new T.Vector3(x,.26,.43),.025,brass);
  const cup=buildCoffeeCup();cup.position.set(x,.01,.37);cup.scale.setScalar(.8);machine.add(cup);
  cylinder(machine,.044,.035,[x,.29,.25],brass);
 }
 cylinder(machine,.17,.26,[0,.47,-.02],0xb6b9b2);
 // A single low glass display, offset from the employee and the coffee machine.
 const pastries=part('macaron-display');
 box(pastries,[1.08,.045,.58],[1.35,1.13,.09],brass);
 const glass=new T.MeshLambertMaterial({color:0xe5eee7,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});
 const front=new T.Mesh(new T.PlaneGeometry(1.08,.44),glass);front.position.set(1.35,1.37,.39);pastries.add(front);
 const lid=new T.Mesh(new T.PlaneGeometry(1.08,.58),glass);lid.rotation.x=-Math.PI/2;lid.position.set(1.35,1.59,.10);pastries.add(lid);
 for(const x of [.81,1.89])line(pastries,new T.Vector3(x,1.16,.39),new T.Vector3(x,1.59,.39),.012,brass);
 for(const y of [1.18,1.39]){
  box(pastries,[.96,.025,.47],[1.35,y,.09],marble);
  for(let i=0;i<3;i++){const macaron=buildMacaron();macaron.position.set(1.04+i*.31,y+.065,.12);pastries.add(macaron);}
 }
 const brand=part('brand-sign');box(brand,[2.8,.52,.1],[0,6.1,.9],brass);box(brand,[2.62,.38,.05],[0,6.1,.97],0x2c211a);text(brand,'BAR · CAFFÈ',2.4,[0,6.1,1.01],'#f3dc9c');
 // Same sign as the cloakroom's, inside the arch above the counter.
 const name=text(g,'카페',2.1,[0,4.1,.26],'#ffe5b3');name.userData.fullDetail=true;
 const staff=new Avatar(0x3c5449,undefined,24);staff.update(1,0,false,false,null,10,0);staff.eyes.scale.y=1;staff.head.rotation.set(0,0,0);
 staff.root.name='cafe-barista';staff.root.position.set(.02,.25,-.80);staff.root.rotation.y=Math.PI;
 for(const [arm,x] of [[staff.leftArm,-.23],[staff.rightArm,.23]] as const){
  const direction=new T.Vector3(x,.95,-.43).sub(arm.position).normalize();arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),direction);
 }
 // The employee stands on a concealed service platform, with hands above the worktop.
 box(g,[1.08,.25,.70],[.02,.125,-.96],walnut);
 // A cream apron is an accessory on the existing character; face and body proportions stay unchanged.
 box(staff.body,[.25,.30,.025],[0,.87,-.19],0xe6d8ba);
 for(const x of [-.095,.095])box(staff.body,[.025,.16,.02],[x,1.09,-.18],0xe6d8ba);
 g.add(staff.root);staff.root.traverse(o=>{o.userData.preserveSilhouette=true;});
 const hitMaterial=new T.MeshBasicMaterial({visible:false});
 const coffeeHit=new T.Mesh(new T.BoxGeometry(2.70,1.65,.90),hitMaterial);coffeeHit.position.set(-.70,.82,.02);coffeeHit.userData.cafe=true;g.add(coffeeHit);clickTargets.push(coffeeHit);
 const macaronHit=new T.Mesh(new T.BoxGeometry(1.30,.65,.68),hitMaterial);macaronHit.position.set(1.35,1.39,.14);macaronHit.userData.macaron=true;g.add(macaronHit);clickTargets.push(macaronHit);
 return g;
}
