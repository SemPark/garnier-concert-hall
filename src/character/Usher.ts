import * as T from 'three';
import {Avatar} from './Avatar';
import {box,cylinder,sphere,text} from '../scene/primitives';

/** Entrance usher: a ghost who keeps a human shape and greets everyone like an old friend. */
export const USHER={x:-1.1,z:44.5,faceZ:47};
export const USHER_LINES={welcome:'어서 오세요. 다시 오셨군요.',ask:'이 공연이 언제 끝나냐고요? 글쎄요, 아직 끝난 적이 없어서요.'};
export class Usher{
 readonly avatar=new Avatar(0x5e1624,undefined,0);
 readonly targets:T.Object3D[]=[];
 private greetAt=-10;
 private speechUntil=0;
 private readonly speech=document.createElement('div');
 private readonly anchor=new T.Vector3();
 private readonly screen=new T.Vector3();
 constructor(scene:T.Scene,y=0){
  const a=this.avatar,gold=new T.MeshStandardMaterial({color:0xc9a24a,roughness:.4,metalness:.6});
  // Thin gold edging at the collar.
  const collar=new T.Mesh(new T.TorusGeometry(.13,.012,6,20),gold);collar.rotation.x=Math.PI/2;collar.position.y=.95;a.body.add(collar);
  // The pillbox cap gives the usher a distinct silhouette above the visitors' hair.
  const cap=new T.Group();cap.position.y=.34;a.head.add(cap);
  cylinder(cap,.285,.18,[0,.09,0],0x782438);
  cylinder(cap,.292,.025,[0,.015,0],0xd6b66b);
  cylinder(cap,.288,.018,[0,.175,0],0xd6b66b);
  const badge=cylinder(cap,.052,.012,[0,.09,-.285],0xd6b66b);badge.rotation.x=Math.PI/2;
  text(cap,'P',.14,[0,.09,-.294],'#5e1624').rotation.y=Math.PI;
  // Shoulder boards and double rows of buttons read as a staff uniform.
  for(const arm of [a.leftArm,a.rightArm]){
   box(arm,[.17,.035,.15],[0,.015,0],0xd6b66b);
   for(const x of [-.055,0,.055])box(arm,[.018,.065,.025],[x,-.025,-.075],0xd6b66b);
  }
  for(const x of [-.105,.105])for(const y of [.68,.78])sphere(a.body,.022,[x,y,-.195],0xd6b66b);
  box(a.body,[.13,.055,.025],[-.11,.9,-.205],0xd6b66b);
  text(a.body,'PLEEE',.12,[-.11,.9,-.22],'#46212a').rotation.y=Math.PI;
  // A readable programme cover replaces the tiny ticket.
  const book=new T.Group();book.position.set(0,-.07,-.075);a.rightHand.add(book);
  box(book,[.23,.3,.045],[0,0,0],0x30564d);
  box(book,[.205,.275,.035],[0,0,.012],0xf3e6c4);
  box(book,[.23,.3,.012],[0,0,-.025],0x30564d);
  for(const y of [-.125,.125])box(book,[.19,.008,.008],[0,y,-.034],0xd6b66b);
  text(book,'PLEEE',.22,[0,.055,-.034]).rotation.y=Math.PI;
  text(book,'PROGRAMME',.21,[0,-.025,-.034]).rotation.y=Math.PI;
  this.speech.className='usher-speech';
  this.speech.setAttribute('role','status');
  this.speech.setAttribute('aria-live','polite');
  this.speech.hidden=true;
  a.root.position.set(USHER.x,y,USHER.z);a.root.rotation.y=Math.atan2(USHER.x,USHER.z-USHER.faceZ);
  const hit=new T.Mesh(new T.CylinderGeometry(.45,.45,1.8,8),new T.MeshBasicMaterial({visible:false}));hit.position.y=.9;hit.userData.usher=true;a.root.add(hit);this.targets.push(hit);
  scene.add(a.root);
 }
 /** Welcome the visitor, then present the seats with an open arm. */
 greet(time:number,line:string=USHER_LINES.welcome){
  this.greetAt=time;
  this.speech.textContent=line;
  this.speechUntil=time+(line===USHER_LINES.welcome?7:10);
 }
 updateSpeech(camera:T.Camera,canvas:HTMLCanvasElement,visible:boolean,time:number){
  this.speech.hidden=true;
  if(!visible||time>this.speechUntil)return;
  if(!this.speech.isConnected)canvas.parentElement?.append(this.speech);
  this.avatar.head.getWorldPosition(this.anchor);this.anchor.y+=.64;
  camera.updateMatrixWorld();
  this.screen.copy(this.anchor).project(camera);
  if(Math.abs(this.screen.z)>1||Math.abs(this.screen.x)>1||Math.abs(this.screen.y)>1)return;
  const rect=canvas.getBoundingClientRect();
  const x=(this.screen.x+1)*rect.width/2+rect.left;
  const y=(1-this.screen.y)*rect.height/2+rect.top;
  this.speech.hidden=false;
  const halfWidth=this.speech.offsetWidth/2;
  const left=T.MathUtils.clamp(x,halfWidth+12,innerWidth-halfWidth-12);
  const top=Math.max(y,this.speech.offsetHeight+16);
  this.speech.style.left=left+'px';this.speech.style.top=top+'px';
  this.speech.style.setProperty('--tail-offset',T.MathUtils.clamp(x-left,-halfWidth+16,halfWidth-16)+'px');
  this.speech.hidden=false;
 }
 dispose(){this.speech.remove();}
 update(time:number,dt:number,reduced=false){
  const age=time-this.greetAt;
  this.avatar.update(time,0,false,false,null,age,dt);
  if(reduced||age<0||age>5)return;
  const bow=Math.sin(Math.PI*T.MathUtils.clamp(age/1.2,0,1))*.16;
  const guide=T.MathUtils.smoothstep(age,.8,1.8)*(1-T.MathUtils.smoothstep(age,4,5));
  this.avatar.head.rotation.x=-bow;
  this.avatar.leftArm.rotation.set(-.7*guide,0,-1.25*guide);
 }
}
