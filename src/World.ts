import * as T from 'three';
import {createVenue,type Venue} from './scene/Venue';
import {Avatar,musicianSits} from './character/Avatar';
import {Input} from './controls/Input';
import {findPath,segmentClear} from './navigation/path';
import {SPAWN,SEATS,BOUNDS,walkable,distance,type Visitor,type Zone,type Point} from '../shared/venue';
import type {Snapshot} from '../shared/protocol';
import type {Presence} from './network/Presence';
import type {ConcertAudio} from './audio/ConcertAudio';
import {CONCERT_CAMERA} from './orchestra/layout';
import {GOLDEN_HALL,HALL_CAMERA} from '../shared/goldenHall';

type Remote={avatar:Avatar;visitor:Visitor;lastPosition:T.Vector3};
export class World{
 readonly renderer:T.WebGLRenderer;readonly camera=new T.PerspectiveCamera(61,1,.08,150);
 readonly venues:Record<Zone,Venue>;readonly input:Input;zone:Zone='lobby';self:Visitor|null=null;
 concertView=true;hallOverview=true;
 position=new T.Vector3(0,0,10);pose:'idle'|'walk'|'sit'='idle';yaw=0;cameraYaw=0;cameraPitch=.13;cameraDistance=4.8;fps=60;entered=false;
 onChange:()=>void=()=>{};onToast:(message:string)=>void=()=>{};
 private avatar:Avatar|null=null;private remotes=new Map<string,Remote>();private route:Point[]=[];private reservedSeat:string|null=null;private seating=false;private reserveVersion=0;
 private seatedTarget:T.Vector3|null=null;
 private ray=new T.Raycaster();private ndc=new T.Vector2();private frame=0;private last=performance.now();private sentAt=0;private lastPose='';private renewAt=0;private lastUI=0;private look=new T.Vector3();private gesture:'wave'|'clap'|null=null;private gestureAt=0;
 private orchestraAt=0;private quality='balanced';private slowFrames=0;
 private marker:T.Mesh;private statsTime=0;private frames=0;private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(host:HTMLElement,private net:Presence,private audio:ConcertAudio){
  this.renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','캐릭터 뒤에서 둘러보는 가르니에 음악당. 바닥 클릭으로 이동하고 드래그로 둘러봅니다.');host.append(canvas);
  this.venues={lobby:createVenue('lobby'),auditorium:createVenue('auditorium')};
  this.marker=new T.Mesh(new T.RingGeometry(.16,.24,24),new T.MeshBasicMaterial({color:0xe5c786,transparent:true,opacity:.8,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.venues.lobby.scene.add(this.marker);
  this.input=new Input(canvas,{click:(x,y)=>this.click(x,y),rotate:(dx,dy)=>{this.cameraYaw-=dx*.0034;if(this.zone==='auditorium'&&this.concertView)this.cameraYaw=T.MathUtils.clamp(this.cameraYaw,-.5,.5);this.cameraPitch=T.MathUtils.clamp(this.cameraPitch+dy*.0022,-.15,.5);},zoom:f=>{this.cameraDistance=T.MathUtils.clamp(this.cameraDistance*f,2.2,13);},escape:()=>this.stand()});
  window.addEventListener('resize',this.resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onToast('화면 연결이 끊겼어요. 새로고침해 주세요.');});this.resize();this.snapCamera();this.animate();
 }
 setQuality(quality:string){this.quality=quality;this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='low'?.8:1));}
 get venue(){return this.venues[this.zone];}
 toggleFraming(){this.hallOverview=!this.hallOverview;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.onChange();}
 toggleConcertView(){this.concertView=!this.concertView;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.onChange();}
 private resize=()=>{const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w/h<.8?70:61;this.camera.updateProjectionMatrix();};
 apply(state:Snapshot){
  const self=state.visitors.find(v=>v.id===this.net.selfId);if(self){const initial=!this.self,changedZone=this.zone!==self.zone,stood=this.pose==='sit'&&self.pose!=='sit';this.self=self;
   if(!this.avatar){this.avatar=new Avatar(self.color,undefined,parseInt(self.id.slice(0,2),16)||0);this.venue.scene.add(this.avatar.root);}
   if(initial||changedZone||stood||self.pose==='sit'){
    if(self.pose==='sit'&&!initial&&!changedZone)this.seatedTarget=new T.Vector3(self.x,SEATS.find(s=>s.id===self.seatId)?.y??0,self.z);
    else{this.position.set(self.x,self.pose==='sit'?(SEATS.find(s=>s.id===self.seatId)?.y??0):0,self.z);this.seatedTarget=null;}
    this.yaw=self.yaw;this.pose=self.pose;
    if(initial||changedZone){this.zone=self.zone;this.avatar.root.removeFromParent();this.venue.scene.add(this.avatar.root);this.marker.removeFromParent();this.venue.scene.add(this.marker);this.route=[];this.marker.visible=false;this.reservedSeat=null;this.cameraYaw=0;this.audio.setZone(this.zone);this.snapCamera();}
    if(self.pose==='sit'){this.route=[];this.seating=false;this.marker.visible=false;}
   }
   if(this.reservedSeat&&state.seats[this.reservedSeat]?.visitorId!==self.id){this.route=[];this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
  }
  const ids=new Set(state.visitors.filter(v=>v.id!==this.net.selfId).map(v=>v.id));for(const [id,r]of this.remotes)if(!ids.has(id)){r.avatar.root.removeFromParent();this.remotes.delete(id);}
  for(const v of state.visitors){if(v.id===this.net.selfId)continue;let r=this.remotes.get(v.id);if(!r){const avatar=new Avatar(v.color,undefined,parseInt(v.id.slice(0,2),16)||0);avatar.root.position.set(v.x,0,v.z);r={avatar,visitor:v,lastPosition:avatar.root.position.clone()};this.remotes.set(v.id,r);}r.visitor=v;
   const parent=this.venues[v.zone].scene;if(r.avatar.root.parent!==parent){r.avatar.root.removeFromParent();parent.add(r.avatar.root);r.avatar.root.position.set(v.x,0,v.z);}r.avatar.root.visible=v.zone===this.zone;
  }
  for(const [id,light]of this.venues.auditorium.seatLights){const claim=state.seats[id];light.visible=!claim||claim.visitorId===this.net.selfId;(light.material as T.MeshBasicMaterial).color.setHex(claim?0xa2c8b4:0xd2b373);}
  this.onChange();
 }
 start(){this.entered=true;this.renderer.domElement.focus();this.onChange();}
 changeZone(){if(!this.entered)return;if(this.net.status!=='connected'){this.onToast('음악당에 연결한 뒤 입장할 수 있어요.');return;}this.cancelSeat();this.route=[];this.net.send({type:'zone',zone:this.zone==='lobby'?'auditorium':'lobby'});}
 async chooseSeat(id:string){
  if(this.zone!=='auditorium'||!this.entered)return;const seat=SEATS.find(s=>s.id===id);if(!seat)return;
  if(this.pose==='sit'){this.stand();this.onToast('일어난 뒤 좌석을 선택해 주세요.');return;}
  const path=seat.level==='balcony'?[]:findPath(this.zone,{x:this.position.x,z:this.position.z},seat.approach);if(!path){this.onToast('이 좌석으로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();const version=++this.reserveVersion,requestId=crypto.randomUUID();const ok=await this.net.reserve(id,requestId);if(version!==this.reserveVersion){this.net.send({type:'release',requestId});return;}
  if(!ok){this.net.send({type:'release',requestId});return;}this.reservedSeat=id;if(seat.level==='balcony'){this.net.send({type:'seated',seatId:id});this.concertView=false;this.cameraYaw=seat.yaw;this.snapCamera();this.onToast('발코니 좌석으로 이동했어요.');return;}this.seating=false;this.route=path;this.renewAt=performance.now();this.marker.visible=true;this.marker.position.set(seat.approach.x,.035,seat.approach.z);this.onToast('선택한 좌석으로 이동합니다.');
 }
 stand(){this.seatedTarget=null;if(this.pose==='sit'||this.reservedSeat){const seat=SEATS.find(s=>s.id===(this.self?.seatId??this.reservedSeat));this.net.send({type:'release'});if(this.pose==='sit'&&seat)this.position.set(seat.approach.x,0,seat.approach.z);this.pose='idle';}this.cancelSeat();this.route=[];this.onChange();}
 private cancelSeat(){this.reserveVersion++;if(this.reservedSeat)this.net.send({type:'release'});this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
 gestureAction(gesture:'wave'|'clap'){this.gesture=gesture;this.gestureAt=this.net.now();this.net.send({type:'gesture',gesture});}
 private click(x:number,y:number){if(!this.entered)return;const rect=this.renderer.domElement.getBoundingClientRect();this.ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  const hits=this.ray.intersectObjects([...this.venue.seatTargets,this.venue.portal,this.venue.floor],true);if(!hits.length)return;const hit=hits[0];let obj:T.Object3D|null=hit.object,seatId:string|undefined;while(obj){seatId=seatId??obj.userData.seatId;if(obj.userData.portal){this.changeZone();return;}obj=obj.parent;}
  if(seatId){void this.chooseSeat(seatId);return;}
  if(this.pose==='sit'){this.stand();return;}
  const point={x:hit.point.x,z:hit.point.z};if(this.zone==='lobby'&&point.z<-15&&Math.abs(point.x)<2){this.changeZone();return;}
  const path=findPath(this.zone,{x:this.position.x,z:this.position.z},point);if(!path){this.onToast('통로나 빈 바닥을 선택해 주세요.');return;}this.cancelSeat();this.route=path;this.marker.position.set(point.x,.035,point.z);this.marker.visible=true;
 }
 private sendPosition(now:number,force=false){if(!this.entered||!this.self||this.pose==='sit')return;if(force||now-this.sentAt>300||this.lastPose!==this.pose){this.sentAt=now;this.lastPose=this.pose;this.net.send({type:'move',x:this.position.x,z:this.position.z,yaw:this.yaw,pose:this.pose});}}
 private snapCamera(){const f=this.cameraFrame();this.look.copy(f.look);this.camera.position.copy(f.position);this.camera.lookAt(this.look);}
 private cameraFrame(){
  const sitting=this.pose==='sit',baseY=(sitting?2.05:1.05)+this.position.y,look=new T.Vector3(this.position.x,baseY,this.position.z-1.5),d=this.cameraDistance;
  const gallerySeat=sitting?SEATS.find(s=>s.id===this.self?.seatId&&s.level==='balcony'):undefined;
  if(gallerySeat){return {look:new T.Vector3(0,3,-19),position:new T.Vector3(Math.sign(gallerySeat.x)*13.2,gallerySeat.y+3,gallerySeat.z+2)};}
  if(!this.entered){return {look:new T.Vector3(0,5,-8),position:new T.Vector3(3.7,4.2,13.5)};}
  if(this.zone==='auditorium'&&this.concertView){
   const preset=this.hallOverview?HALL_CAMERA:CONCERT_CAMERA,center=new T.Vector3(...preset.look),offset=new T.Vector3(...preset.eye).sub(center);
   offset.multiplyScalar(T.MathUtils.clamp(this.cameraDistance/4.8,.65,1.6)*Math.min(this.camera.aspect<.8?2.2:1.3,Math.max(1,1.65/this.camera.aspect)));
   offset.applyAxisAngle(new T.Vector3(1,0,0),-(this.cameraPitch-.13)*.55);offset.applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw);
   const position=center.clone().add(offset);position.x=T.MathUtils.clamp(position.x,-13.8,13.8);position.y=T.MathUtils.clamp(position.y,1.2,GOLDEN_HALL.height-1.2);position.z=Math.min(position.z,GOLDEN_HALL.rear-2);
   return {look:center,position};
  }
  const target=new T.Vector3(this.position.x,baseY+.6+this.cameraPitch*4,this.position.z);target.x+=Math.sin(this.cameraYaw)*d;target.z+=Math.cos(this.cameraYaw)*d;look.x-=Math.sin(this.cameraYaw)*2;look.z=this.position.z-Math.cos(this.cameraYaw)*2;
  if(this.zone==='auditorium'){target.z=Math.min(target.z,GOLDEN_HALL.rear-1);target.x=T.MathUtils.clamp(target.x,-13.8,13.8);}
  const origin=new T.Vector3(this.position.x,baseY,this.position.z),dir=target.clone().sub(origin),length=dir.length();this.ray.set(origin,dir.normalize());const hit=this.ray.intersectObjects(this.venue.cameraWalls,false)[0];if(hit&&hit.distance<length)target.copy(origin).addScaledVector(dir,Math.max(.6,hit.distance-.3));return {look,position:target};
 }
 private animate=()=>{
  this.frame=requestAnimationFrame(this.animate);const now=performance.now(),dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.frames++;this.statsTime+=dt;if(this.statsTime>.7){this.fps=Math.round(this.frames/this.statsTime);this.frames=0;this.statsTime=0;}
  let speed=0;const keys=this.input.keys,kx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),kz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  if(this.entered&&this.net.status==='connected'){
   if((kx||kz)&&this.pose==='sit')this.stand();
   const previous=this.position.clone();
   if(kx||kz){this.route=[];this.cancelSeat();const v=new T.Vector3(kx,0,kz).normalize().applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw).multiplyScalar(2.8*dt),candidate=this.position.clone().add(v);
    if(segmentClear(this.zone,this.position,candidate))this.position.copy(candidate);else{const a={x:candidate.x,z:this.position.z},b={x:this.position.x,z:candidate.z};if(segmentClear(this.zone,this.position,a))this.position.x=a.x;if(segmentClear(this.zone,this.position,b))this.position.z=b.z;}
   }else if(this.route.length&&this.pose!=='sit'){
    const p=this.route[0],d=distance(this.position,p);if(d<.035){this.position.x=p.x;this.position.z=p.z;this.route.shift();}else{const step=Math.min(d,2.6*dt);this.position.x+=(p.x-this.position.x)/d*step;this.position.z+=(p.z-this.position.z)/d*step;}
    if(!this.route.length){this.marker.visible=false;this.pose='idle';if(this.reservedSeat&&!this.seating){this.seating=true;this.sendPosition(now,true);this.net.send({type:'seated',seatId:this.reservedSeat});}}
   }
   speed=previous.distanceTo(this.position)/Math.max(dt,.001);if(this.pose!=='sit'){this.pose=speed>.015?'walk':'idle';if(speed>.015)this.yaw=Math.atan2(-(this.position.x-previous.x),-(this.position.z-previous.z));}
   if(this.reservedSeat&&this.pose!=='sit'&&now-this.renewAt>5000){this.net.send({type:'renew',seatId:this.reservedSeat});this.renewAt=now;}
   this.sendPosition(now);
   if(this.zone==='lobby'&&this.position.z<-15.6&&Math.abs(this.position.x)<2)this.changeZone();
  }
  if(this.pose==='sit'&&this.seatedTarget)this.position.lerp(this.seatedTarget,1-Math.exp(-dt*12));
  if(this.avatar){this.avatar.root.position.copy(this.position);this.avatar.root.rotation.y=this.yaw;this.avatar.update(this.net.now()/1000,speed,this.pose==='sit',false,this.gesture,(this.net.now()-this.gestureAt)/1000,dt);this.avatar.root.visible=this.entered;}
  for(const r of this.remotes.values()){
   const v=r.visitor;r.avatar.root.visible=v.zone===this.zone;const target=new T.Vector3(v.x,v.pose==='sit'?(SEATS.find(s=>s.id===v.seatId)?.y??0):0,v.z);r.avatar.root.position.lerp(target,1-Math.exp(-dt*9));const dy=T.MathUtils.euclideanModulo(v.yaw-r.avatar.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;r.avatar.root.rotation.y+=dy*(1-Math.exp(-dt*9));r.avatar.update(this.net.now()/1000,v.pose==='walk'?2.6:0,v.pose==='sit',false,v.gesture,(this.net.now()-v.gestureAt)/1000,dt);
  }
  const playback=this.audio.playback;if(now-this.orchestraAt>=50){const animationDt=Math.min(.1,(now-this.orchestraAt)/1000);this.orchestraAt=now;for(const a of this.venue.musicians)a.update(this.reduced?0:this.net.now()/1000,0,musicianSits(a.instrumentType),playback.playing&&!this.reduced,null,10,animationDt);this.venue.updateMusicians();}
  this.audio.tick(dt);const f=this.cameraFrame(),smooth=1-Math.exp(-dt*7);this.camera.position.lerp(f.position,smooth);this.look.lerp(f.look,smooth);this.camera.lookAt(this.look);for(const object of this.venue.overviewHidden)object.visible=!this.concertView;this.renderer.render(this.venue.scene,this.camera);
  if(this.quality==='balanced'&&dt>.035){if(++this.slowFrames>75){this.renderer.setPixelRatio(Math.min(devicePixelRatio,.85));this.slowFrames=-100000;}}
  if(now-this.lastUI>500){this.lastUI=now;this.onChange();}
 };
 destroy(){cancelAnimationFrame(this.frame);this.input.destroy();window.removeEventListener('resize',this.resize);for(const v of Object.values(this.venues))v.scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.renderer.dispose();this.renderer.domElement.remove();}
}
