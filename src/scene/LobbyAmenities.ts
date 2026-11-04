import * as T from 'three';
import {Avatar} from '../character/Avatar';
import {LOUNGE_SEATS} from '../../shared/loungeSeats';
import {buildProgramBoard} from './ProgramBoard';
import {buildTicketRails} from './TicketGuide';
import {box,cylinder,sphere,line,text,material,C} from './primitives';
import {woodMaterial} from './HallTextures';
import {LOBBY_FURNITURE as F,COMPOSERS} from '../../shared/grandStair';

export type ProgramInfo={now:string;next:string;remaining:string;playing:boolean;seats:number;capacity:number};
export type ProgramBoard={update:(info:ProgramInfo)=>void};
const velvet=0x7c2430,brass=0xb8934f,walnut=0x5a3b25,marbleWhite=0xe8e1d3;

/** Box office, cloakroom, café, lounge, composer busts and the live programme board for the lobby. */
export function buildLobbyAmenities(scene:T.Scene,clickTargets:T.Object3D[]):{programBoard:ProgramBoard}{
 buildTicketRails(scene);
 const hit=new T.MeshBasicMaterial({visible:false});
 for(const seat of LOUNGE_SEATS){const target=new T.Mesh(new T.BoxGeometry(.8,1.1,.8),hit);target.position.set(seat.x,.65,seat.z);target.userData.loungeSeatId=seat.id;scene.add(target);clickTargets.push(target);}
 const goldTrim=0xc9a250,glass=new T.MeshLambertMaterial({color:0xe4eee8,transparent:true,opacity:.12,depthWrite:false});
 // Both sit in the first ground-tier arcade bay, so the stone arch frames them. Local frame: +z faces the hall, the
 // arch face is z=0, the bay runs back to the outer wall at about z=-1.85, x runs along the bay (opening 4.1 wide).
 const inBay=(f:{x:number;z:number})=>{const g=new T.Group();g.position.set(Math.sign(f.x)*13.15,0,f.z);g.rotation.y=f.x<0?Math.PI/2:-Math.PI/2;scene.add(g);return g;};
 const plaque=(g:T.Group,label:string)=>{
  box(g,[2.8,.52,.1],[0,6.1,.9],goldTrim);box(g,[2.62,.38,.05],[0,6.1,.97],0x2c211a);
  const name=text(g,label,2.4,[0,6.1,1.01],'#f3dc9c');name.userData.fullDetail=true;
 };
 // Box office, after the ticket windows of 19th-century theatres: the arch is closed by a walnut base with a marble
 // counter, a glazed screen in gilt mullions with three brass-grilled ticket windows, and a glazed lunette above.
 {const g=inBay(F.boxOffice),w=4.1;
  box(g,[w,1.05,.3],[0,.53,-.2],walnut);for(let i=0;i<3;i++){const x=-w/2+(i+.5)*w/3;box(g,[w/3-.3,.62,.04],[x,.55,-.03],0x6e4a2e);box(g,[w/3-.44,.48,.03],[x,.55,0],0x7d5636);}
  box(g,[w+.1,.08,.6],[0,1.09,-.05],0xe8e1d3);box(g,[w+.12,.05,.62],[0,1.03,-.05],goldTrim);
  const pane=new T.Mesh(new T.PlaneGeometry(w,2.45),glass);pane.position.set(0,2.375,.3);pane.userData.fullDetail=true;g.add(pane);
  for(const x of [-w/2+.06,-w/6,w/6,w/2-.06]){box(g,[.09,2.45,.10],[x,2.375,.35],goldTrim);}box(g,[w,.1,.14],[0,3.6,.35],goldTrim);
  for(let i=0;i<3;i++){if(i===1)continue;const x=-w/2+(i+.5)*w/3;box(g,[.5,.24,.06],[x,1.25,.35],0x1d1712);for(let k=-3;k<=3;k++)line(g,new T.Vector3(x+k*.1,1.2,.4),new T.Vector3(x+k*.1,1.85,.4),.012,brass);}
  const lunette=new T.Mesh(new T.CircleGeometry(2.05,24,0,Math.PI),glass);lunette.position.set(0,3.6,.3);lunette.userData.fullDetail=true;g.add(lunette);
  for(let k=1;k<6;k++){const a=k/6*Math.PI;line(g,new T.Vector3(0,3.6,.35),new T.Vector3(Math.cos(a)*2.05,3.6+Math.sin(a)*2.05,.35),.025,goldTrim);}
  box(g,[w,2.2,.06],[0,2.2,-1.65],0x4a3020);for(let r=0;r<4;r++)for(let c=0;c<9;c++)box(g,[.32,.24,.14],[-1.6+c*.4,1.6+r*.34,-1.58],0x3a2618);
  // A fixed member of staff behind the middle window, facing visitors; no animation registration.
  const clerk=new Avatar(0xb77d86,undefined,31);
  clerk.update(1,0,false,false,null,10,0);
  clerk.eyes.scale.y=1;clerk.head.rotation.set(0,0,0);
  clerk.root.name='box-office-clerk';clerk.root.position.set(0,0,-.95);
  clerk.root.rotation.y=Math.PI;clerk.root.scale.setScalar(1);g.add(clerk.root);
  plaque(g,'BILLETTERIE');g.traverse(o=>{o.userData.preserveSilhouette=true;});
  const target=new T.Mesh(new T.BoxGeometry(w,3,1),hit);target.position.set(0,1.6,0);target.userData.boxOffice=true;g.add(target);clickTargets.push(target);}
 // Cloakroom: a marble-topped counter across the arch with a bell and brass tokens; behind it, in the bay, two rows
 // of coats on rails with numbered tags, hats on the shelf above, against a red wall.
 {const g=inBay(F.cloakroom),w=4.1;
  box(g,[w,1.0,.55],[0,.5,-.15],walnut);box(g,[w+.1,.08,.72],[0,1.04,-.1],0xe8e1d3);for(let i=0;i<4;i++)box(g,[w/4-.25,.6,.03],[-w/2+(i+.5)*w/4,.52,.14],0x6e4a2e);
  cylinder(g,.09,.05,[w/2-.4,1.11,0],brass);sphere(g,.06,[w/2-.4,1.17,0],brass);for(let i=0;i<8;i++)cylinder(g,.05,.012,[-w/2+.5+i*.14,1.09,0],brass);
  box(g,[w,3.4,.06],[0,1.9,-1.65],0x7c2430);for(const y of [.25,3.55])box(g,[w,.1,.08],[0,y,-1.61],goldTrim);
  const coats=[0x2b2b33,0x5a3e2b,0x3d4a3a,0x6b2e2e,0x1f2a3a,0x7a6a55,0x3a3a3a,0x4a2a3a];
  for(const [y,z] of [[1.5,-.95],[1.5,-1.5]] as const){line(g,new T.Vector3(-w/2+.1,y+.85,z),new T.Vector3(w/2-.1,y+.85,z),.02,brass);
   for(let i=0;i<11;i++){const x=-w/2+.3+i*(w-.6)/10,c=coats[(i*3+(z<-1.2?1:0))%coats.length];box(g,[.28,1.05+((i*7)%3)*.08,.22],[x,y+.25,z],c);box(g,[.12,.12,.12],[x,y+.8,z],c);line(g,new T.Vector3(x-.13,y+.82,z),new T.Vector3(x+.13,y+.82,z),.012,0xa0a0a0);box(g,[.07,.09,.01],[x+.09,y+.7,z+.12],0xe8d9a8);}}
  box(g,[w,.05,.4],[0,3.25,-1.55],walnut);for(let i=0;i<8;i++){const x=-w/2+.35+i*(w-.7)/7,c=coats[i%coats.length];cylinder(g,.15,.12,[x,3.34,-1.55],c);cylinder(g,.22,.02,[x,3.29,-1.55],c);}
  plaque(g,'VESTIAIRE');
  const sign=text(g,'의상 바꾸기',2.1,[0,4.1,.26],'#ffe5b3');sign.userData.fullDetail=true;
  const target=new T.Mesh(new T.BoxGeometry(w,3,1),hit);target.position.set(0,1.6,0);target.userData.cloakroom=true;g.add(target);clickTargets.push(target);}
 // Coffee bar: dark joinery, a backlit menu, espresso machine, cups and pastry case.
 {const f=F.cafeCounter,g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  const counter=box(g,[1.05,1.1,f.hz*2],[0,.55,0],walnut);counter.material=woodMaterial('walnut');
  box(g,[1.2,.1,f.hz*2+.15],[.06,1.15,0],marbleWhite);
  for(let z=-3.7;z<4;z+=1.5){box(g,[.08,.78,1.27],[.55,.55,z],0x2b1d15);for(const y of [.18,.92])box(g,[.1,.045,1.3],[.59,y,z],brass);}
  const back=box(g,[.08,2.1,f.hz*2],[-.28,2.28,0],walnut);back.material=woodMaterial('walnut');back.userData.cameraWall=true;
  for(const y of [1.65,2.55])for(const [z,length] of [[-3.45,1.7],[2.4,3.8]])box(g,[.45,.07,length],[-.05,y,z],brass);
  // Cups and saucers, grouped away from the machine.
  for(let i=0;i<5;i++){const z=-4+i*.3;for(const y of [1.77,2.67]){cylinder(g,.09,.12,[.08,y,z],marbleWhite);cylinder(g,.12,.025,[.08,y-.07,z],marbleWhite);}}
  const machine=box(g,[.55,.55,1.15],[.15,1.49,.7],0x777a78);box(g,[.05,.28,.95],[.45,1.48,.7],0x252724);
  for(const z of [.4,.95]){cylinder(g,.10,.26,[.15,1.9,z],0x37261c);line(g,new T.Vector3(.47,1.6,z),new T.Vector3(.65,1.6,z),.025,brass);}
  for(const z of [.42,.96])cylinder(g,.07,.1,[.45,1.28,z],marbleWhite);
  const caseGlass=new T.MeshLambertMaterial({color:0xc5d4ce,transparent:true,opacity:.25,depthWrite:false});
  const display=box(g,[.65,.52,1.75],[.15,1.46,2.8],marbleWhite);display.material=caseGlass;
  for(const y of [1.22,1.51]){box(g,[.65,.04,1.75],[.15,y,2.8],brass);for(let i=0;i<4;i++){const pastry=sphere(g,.11,[.23,y+.1,2.2+i*.36],0xb78540);pastry.scale.y*=.55;}}
  box(g,[.1,.6,3.8],[1.9,6.1,0],brass);box(g,[.06,.45,3.6],[1.98,6.1,0],0x211a14);const name=text(g,'CAFÉ • pleee',3.2,[2.02,6.1,0],'#f3dc9c');name.rotation.y=Math.PI/2;
  const menu=box(g,[.08,1.2,2.8],[-.12,2.3,-1.1],0x211a14);
  for(const [label,y] of [['ESPRESSO',2.65],['CAPPUCCINO',2.35],['PÂTISSERIE',2.05]] as const){const t=text(g,label,2.3,[-.06,y,-1.1],'#f0d9a0');t.rotation.y=Math.PI/2;}
  for(const t of F.cafeTables){cylinder(scene,.32,.05,[t.x,.03,t.z],brass);cylinder(scene,.05,1.05,[t.x,.55,t.z],brass);cylinder(scene,.48,.05,[t.x,1.08,t.z],marbleWhite);cylinder(scene,.1,.025,[t.x,1.12,t.z],marbleWhite);cylinder(scene,.07,.13,[t.x,1.19,t.z],marbleWhite);}
 }
 // Lounge: red velvet sofas against the wall and a round button ottoman, the Garnier "borne".
 for(const f of F.sofas){const g=new T.Group();g.position.set(f.x,0,f.z);scene.add(g);
  box(g,[.9,.42,2.5],[0,.32,0],velvet);box(g,[.25,.9,2.6],[.38,.75,0],velvet);for(const z of [-1.25,1.25])box(g,[.9,.62,.18],[0,.5,z],velvet);
  for(const z of [-1.2,1.2])for(const x of [-.35,.35])cylinder(g,.04,.12,[x,.06,z],brass);box(g,[.92,.05,2.6],[0,.54,0],0x8f2d3a);}
 {const f=F.ottoman;cylinder(scene,f.hx,.45,[f.x,.3,f.z],velvet);cylinder(scene,f.hx*.45,.8,[f.x,.85,f.z],velvet);cylinder(scene,f.hx*.48,.1,[f.x,1.28,f.z],brass);cylinder(scene,.12,.9,[f.x,1.75,f.z],brass);sphere(scene,.2,[f.x,2.25,f.z],0xfff0c6);}
 // Seated composer statues flanking the entrance arch on tall stone pedestals.
 F.busts.forEach((f,i)=>{const g=new T.Group();g.position.set(f.x,0,f.z);g.scale.setScalar(1.3);scene.add(g);const st=0xd8cdb8;
  box(g,[1.5,.3,1.5],[0,.15,0],0xb39467);box(g,[1.3,1.9,1.3],[0,1.25,0],0xcbb48a);box(g,[1.5,.22,1.5],[0,2.31,0],0xb39467);
  box(g,[.9,.75,.8],[0,2.8,-.15],st);box(g,[.85,.9,.3],[0,3.6,-.45],st);cylinder(g,.33,.95,[0,3.55,-.05],st);sphere(g,.24,[0,4.25,-.05],st);
  for(const side of [-1,1]){box(g,[.26,.22,.8],[side*.2,3.0,.35],st);box(g,[.22,.75,.24],[side*.2,2.6,.72],st);line(g,new T.Vector3(side*.33,3.85,-.05),new T.Vector3(side*.4,3.15,.35),.09,st);}
  box(g,[.9,.24,.02],[0,1.45,.66],brass);text(g,COMPOSERS[i],.85,[0,1.45,.68],'#3a2a1c');});
 return {programBoard:buildProgramBoard(scene)};
}
