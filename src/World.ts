import {visitorBlocksStep,freeVisitorPosition,VISITOR_GAP} from '../shared/visitorCollision';
import {LOUNGE_SEATS} from '../shared/loungeSeats';
import * as T from 'three';
import {constrainCamera} from './controls/cameraCollision';
import {createVenue,createVenueAsync,type Venue} from './scene/Venue';
import {Crowd} from './scene/Crowd';
import {Avatar,musicianSits} from './character/Avatar';
import {CAT_VISITOR_GAP} from './character/LobbyCat';
import {Input} from './controls/Input';
import {stageShow} from './orchestra/stageShow';
/** Gestures that make applause heard in the quiet time between pieces. */
const CLAPS:Gesture[]=['clap','bravo','ovation'];
import {corridorRoute,STAIR_CORRIDOR} from '../shared/gallery';
import {ATRIUM,HALL_INNER_DOOR,GRAND_STAIR,BOX_OFFICE_APPROACH} from '../shared/grandStair';
import program from '../content/playlist.json';
import {nextPiece,type Playlist} from '../shared/timeline';
import {localCameraFrame} from './controls/localCamera';
import {findPath,segmentClear} from './navigation/path';
import {SPAWN,SEATS,CAPACITY,BOUNDS,seatLabel,walkable,distance,surfaceHeight,stairPoint,stairLink,STAGE_APRON_Z,visitorVariant,visitorColor,type Look,type Visitor,type Zone,type Point} from '../shared/venue';
import type {Snapshot} from '../shared/protocol';
import type {Presence} from './network/Presence';
import type {ConcertAudio} from './audio/ConcertAudio';
import {renderRatio,frameRate,type RenderQuality} from './scene/quality';
import {CONCERT_CAMERA} from './orchestra/layout';
import {GOLDEN_HALL,HALL_CAMERA} from '../shared/goldenHall';
import type {Gesture} from '../shared/gestures';

function measuredVenue(zone:Zone){const start=performance.now(),venue=createVenue(zone);performance.measure(`aurea-${zone}-build`,{start,end:performance.now()});return venue;}
type Remote={avatar:Avatar;visitor:Visitor;lastPosition:T.Vector3;zone:Zone};
export class World{
 readonly renderer:T.WebGLRenderer;readonly camera=new T.PerspectiveCamera(61,1,.08,150);
 readonly venues:Record<Zone,Venue>;private readonly crowds:Record<Zone,Crowd>;readonly input:Input;zone:Zone='lobby';self:Visitor|null=null;
 concertView=true;hallOverview=true;private introUntil=0;private dragAt=0;private hallZoom=1;private introEase=0;
 ready=false;private texturesLoaded=false;private warmTimer=0;private hallBuild:Promise<Venue>|null=null;private hallWarm:Promise<void>|null=null;private hallWarmed=false;private deferredState:Snapshot|null=null;private changingZone=false;uiObscured=false;
 position=new T.Vector3(SPAWN.lobby.x,SPAWN.lobby.y,SPAWN.lobby.z);pose:'idle'|'walk'|'sit'='idle';yaw=0;cameraYaw=0;cameraPitch=.13;cameraDistance=4.8;fps=60;entered=false;
 onChange:()=>void=()=>{};onToast:(message:string)=>void=()=>{};onSeatMap:()=>void=()=>{};private pendingSeat:string|null=null;private loungeTarget:string|null=null;private visitingCat=false;private petUntil=0;private visitingBoxOffice=false;private seatWalkAt=0;private boardAt=0;
 private avatar:Avatar|null=null;private remotes=new Map<string,Remote>();private route:Point[]=[];private avatarVariant=-1;private climb:{points:Point[];up:boolean}|null=null;private reservedSeat:string|null=null;private seating=false;private reserveVersion=0;
 private collisionPauseUntil=0;private seatedTarget:T.Vector3|null=null;private petFocus=new T.Vector3();
 private ray=new T.Raycaster();private ndc=new T.Vector2();private frame=0;private last=performance.now();private sentAt=0;private lastPose='';private renewAt=0;private lastUI=0;private look=new T.Vector3();private gesture:Gesture|null=null;private headTop=new T.Vector3();private gestureAt=0;
 private disposed=false;private lodAt=0;private orchestraAt=0;quality:RenderQuality='balanced';readonly mobile=matchMedia('(pointer: coarse)').matches||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);private renderedAt=0;
 diagnosticActive=false;diagnosticMode:'normal'|'no-draw'|'audio-only'='normal';drawCount=0;frameCost={at:0,cpu:0,submit:0};
 private marker:T.Mesh;private statsTime=0;private frames=0;private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(host:HTMLElement,private net:Presence,private audio:ConcertAudio){
  const previousLoad=T.DefaultLoadingManager.onLoad;T.DefaultLoadingManager.onLoad=()=>{previousLoad?.();if(!this.disposed)this.texturesLoaded=true;};
  try{const saved=localStorage.getItem('concert-quality');if(saved==='balanced'||saved==='sharp'||saved==='low')this.quality=saved;}catch{/* Storage can be unavailable in private browsing. */}
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,this.quality,this.mobile));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','캐릭터 뒤에서 둘러보는 아우레아 음악당. 바닥 클릭으로 이동하고 드래그로 둘러봅니다.');host.append(canvas);
  this.venues={lobby:measuredVenue('lobby')} as Record<Zone,Venue>;
  // Other visitors are drawn in shared batches per hall, so a full house stays cheap.
  this.crowds={lobby:new Crowd(this.venues.lobby.scene)} as Record<Zone,Crowd>;
  this.marker=new T.Mesh(new T.RingGeometry(.16,.24,24),new T.MeshBasicMaterial({color:0xe5c786,transparent:true,opacity:.8,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.venues.lobby.scene.add(this.marker);
  this.input=new Input(canvas,{click:(x,y)=>this.click(x,y),rotate:(dx,dy)=>this.rotateView(dx,dy),zoom:f=>this.zoomView(f),escape:()=>this.stand()});
  window.addEventListener('resize',this.resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onToast('화면 연결이 끊겼어요. 새로고침해 주세요.');});this.resize();this.snapCamera();this.animate();if(new URLSearchParams(location.search).has('diagnostics'))Object.assign(window,{__concertMetrics:()=>({fps:this.fps,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pixelRatio:this.renderer.getPixelRatio(),buffer:[this.renderer.domElement.width,this.renderer.domElement.height],quality:this.quality,mobile:this.mobile,targetFPS:frameRate(this.mobile,this.quality),animationHz:30,antialias:this.renderer.getContext().getContextAttributes()?.antialias})});
 }
 private ensureHall(){
  if(!this.venues.auditorium)throw new Error('공연장을 준비하고 있어요.');return this.venues.auditorium;
 }
 private prepareHall(){
  if(this.venues.auditorium)return Promise.resolve(this.venues.auditorium);
  return this.hallBuild??=createVenueAsync('auditorium',()=>this.disposed).then(venue=>{this.venues.auditorium=venue;this.crowds.auditorium=new Crowd(venue.scene);venue.emotes.setViewport(this.renderer.domElement.height,this.camera.fov);venue.sunlight?.setViewport(this.renderer.domElement.height,this.camera.fov);return venue;}).catch(error=>{this.hallBuild=null;throw error;});
 }
 private warmHall(){return this.hallWarm??=this.warmHallChunks().then(()=>{if(!this.disposed)this.hallWarmed=true;}).catch(error=>{this.hallWarm=null;throw error;});}
 private async warmHallChunks(){
  if(this.disposed)return;
  const venue=await this.prepareHall();if(this.disposed)return;
  const camera=this.camera.clone();camera.position.set(...HALL_CAMERA.eye);camera.lookAt(new T.Vector3(...HALL_CAMERA.look));venue.updateLOD(camera);venue.updateMusicians(camera);venue.scene.updateMatrixWorld(true);
  // Compile and upload a handful of shared batches per turn. Warming the entire scene in one render
  // still blocks input on texture/instance-buffer upload, even after its CPU construction was split.
  const warm=new T.Scene();warm.fog=venue.scene.fog;
  const meshes:{object:T.Object3D;parent:T.Object3D;matrix:T.Matrix4;auto:boolean}[]=[];
  venue.scene.traverse(object=>{
   if(object instanceof T.Light){const light=object.clone();warm.add(light);if(light instanceof T.DirectionalLight||light instanceof T.SpotLight)warm.add(light.target);}
   else if((object instanceof T.Mesh||object instanceof T.Points)&&object.visible&&object.parent&&[object.material].flat().some(material=>material.visible)&&(!(object instanceof T.InstancedMesh)||object.count>0))meshes.push({object,parent:object.parent,matrix:object.matrix.clone(),auto:object.matrixAutoUpdate});
  });
  const target=new T.WebGLRenderTarget(16,16);
  try{for(let i=0;i<meshes.length;i+=2){if(this.disposed)return;const batch=meshes.slice(i,i+2);
   // Use the actual batches, so their buffers/VAOs are prepared once. Entry waits for this job;
   // the offscreen hall is never displayed with a temporarily detached batch.
   for(const {object}of batch){object.matrixAutoUpdate=false;object.matrix.copy(object.matrixWorld);warm.add(object);}
   try{await this.renderer.compileAsync(warm,camera);if(this.disposed)return;
    const start=performance.now(),previous=this.renderer.getRenderTarget();try{this.renderer.setRenderTarget(target);this.renderer.render(warm,camera);}finally{this.renderer.setRenderTarget(previous);}
    performance.measure('aurea-upload-slice',{start,end:performance.now()});
   }finally{for(const {object,parent,matrix,auto}of batch){parent.add(object);object.matrix.copy(matrix);object.matrixAutoUpdate=auto;}}
   await new Promise<void>(resolve=>{if(document.hidden)setTimeout(resolve,32);else requestAnimationFrame(()=>setTimeout(resolve,0));});
  }}finally{target.dispose();warm.clear();}
 }
 setQuality(quality:string){this.quality=quality==='low'?'low':quality==='sharp'?'sharp':'balanced';try{localStorage.setItem('concert-quality',this.quality);}catch{}this.renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,this.quality,this.mobile));this.onChange();}
 get venue(){return this.zone==='auditorium'?this.ensureHall():this.venues.lobby;}
 private *remoteAvatars(){for(const r of this.remotes.values())yield r.avatar;}
 toggleFraming(){this.introUntil=0;this.hallOverview=!this.hallOverview;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}
 toggleConcertView(){this.introUntil=0;this.concertView=!this.concertView;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}
 private resize=()=>{const w=innerWidth,h=innerHeight;this.renderer.setPixelRatio(renderRatio(w,h,devicePixelRatio,this.quality,this.mobile));this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w/h<.8?70:61;this.camera.updateProjectionMatrix();for(const v of Object.values(this.venues)){v.emotes.setViewport(this.renderer.domElement.height,this.camera.fov);v.sunlight?.setViewport(this.renderer.domElement.height,this.camera.fov);}};
 apply(state:Snapshot){
  if(this.disposed)return;
  if(state.visitors.find(v=>v.id===this.net.selfId)?.zone==='auditorium'&&!this.hallWarmed){const waiting=!!this.deferredState;this.deferredState=state;if(!waiting)void this.warmHall().then(()=>{const latest=this.deferredState;this.deferredState=null;if(latest)this.apply(latest);}).catch(()=>{this.deferredState=null;if(!this.disposed)this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');});return;}
  this.deferredState=null;
  const self=state.visitors.find(v=>v.id===this.net.selfId);if(self){const initial=!this.self,changedZone=this.zone!==self.zone,stood=this.pose==='sit'&&self.pose!=='sit',satDown=this.pose!=='sit'&&self.pose==='sit';this.self=self;
   // Reapply the visitor's saved man/woman choice when they (re)connect.
   if(initial){let saved:string|null=null;try{saved=localStorage.getItem('garnier-look');}catch{}if((saved==='man'||saved==='woman')&&saved!==(visitorVariant(self)%8>=4?'woman':'man'))this.setLook(saved);}
   if(this.avatar&&this.avatarVariant!==visitorVariant(self)){this.avatar.root.removeFromParent();this.avatar=null;}
   if(!this.avatar){this.avatarVariant=visitorVariant(self);this.avatar=new Avatar(visitorColor(self),undefined,this.avatarVariant);this.venue.scene.add(this.avatar.root);}
   if(initial||changedZone||stood||self.pose==='sit'){
    if(self.pose==='sit'&&!initial&&!changedZone)this.seatedTarget=new T.Vector3(self.x,self.y??SEATS.find(s=>s.id===self.seatId)?.y??0,self.z);
    else{this.position.set(self.x,self.y??(self.pose==='sit'?(SEATS.find(s=>s.id===self.seatId)?.y??0):0),self.z);this.seatedTarget=null;}
    this.yaw=self.yaw;this.pose=self.pose;
    if(initial||changedZone){this.zone=self.zone;
     // Entering the hall: take in the whole room first, then settle behind your own character.
     // A ticket journey waits for the overview and the settled character camera before walking.
     if(self.zone==='auditorium'){this.concertView=true;this.hallOverview=true;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.introUntil=performance.now()+3500;this.seatWalkAt=this.pendingSeat?this.introUntil+2500:0;}else{this.introUntil=0;this.seatWalkAt=0;}
     this.avatar.root.removeFromParent();this.venue.scene.add(this.avatar.root);this.marker.removeFromParent();this.venue.scene.add(this.marker);this.route=[];this.marker.visible=false;this.reservedSeat=null;this.cameraYaw=this.zone==='lobby'?Math.PI:0;// In the lobby, open facing the Grand Escalier.
     this.audio.setZone(this.zone);this.snapCamera();this.venue.updateLOD(this.camera);this.venue.updateMusicians(this.camera);this.lodAt=0;}
    if(self.pose==='sit'){this.route=[];this.seating=false;this.marker.visible=false;if(satDown){this.concertView=false;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;}}
   }
   if(this.reservedSeat&&state.seats[this.reservedSeat]?.visitorId!==self.id){this.route=[];this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
  }
  const ids=new Set(state.visitors.filter(v=>v.id!==this.net.selfId).map(v=>v.id));for(const [id,r]of this.remotes)if(!ids.has(id)){r.avatar.root.removeFromParent();this.remotes.delete(id);}
  for(const v of state.visitors){if(v.id===this.net.selfId)continue;let r=this.remotes.get(v.id);if(r&&r.avatar.variant!==visitorVariant(v)){r.avatar.root.removeFromParent();this.remotes.delete(v.id);r=undefined;}if(!r){const avatar=new Avatar(visitorColor(v),undefined,visitorVariant(v));avatar.root.position.set(v.x,v.y??0,v.z);r={avatar,visitor:v,lastPosition:avatar.root.position.clone(),zone:v.zone};this.remotes.set(v.id,r);}if(v.zone===this.zone&&v.gesture&&CLAPS.includes(v.gesture)&&v.gestureAt>r.visitor.gestureAt)this.audio.clap(.6);r.visitor=v;
   if(r.zone!==v.zone){r.zone=v.zone;r.avatar.root.position.set(v.x,v.y??0,v.z);}r.avatar.root.visible=v.zone===this.zone;
  }
  for(const [id,light]of this.venues.auditorium?.seatLights??[]){const claim=state.seats[id];light.visible=!claim||claim.visitorId===this.net.selfId;(light.material as T.MeshBasicMaterial).color.setHex(claim?0xa2c8b4:0xd2b373);}
  this.onChange();
 }
 start(){
  // Before the welcome snapshot arrives, use exactly the same spawn/orbit as the server.
  // The old temporary z=10 / yaw=0 put the camera outside the lobby for a frame.
  if(!this.self){this.position.set(SPAWN.lobby.x,SPAWN.lobby.y,SPAWN.lobby.z);this.cameraYaw=Math.PI;}
  this.entered=true;this.snapCamera();this.renderer.domElement.focus();this.onChange();
 }
 async changeZone(fromDoor=false){if(!this.entered||this.climb||this.changingZone)return;if(this.net.status!=='connected'){this.onToast('음악당에 연결한 뒤 입장할 수 있어요.');return;}this.cancelSeat(fromDoor);this.route=[];this.onToast(this.zone==='lobby'?'공연장으로 들어가는 중이에요…':'로비로 나가는 중이에요…');const destination=this.zone==='lobby'?'auditorium':'lobby';this.changingZone=true;try{if(destination==='auditorium'){await this.prepareHall();await this.warmHall();}if(!this.disposed)this.net.send({type:'zone',zone:destination});}catch{if(!this.disposed)this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');}finally{this.changingZone=false;}}
 /** A ticket tap is a walking destination; the map opens only at the counter. */
 visitBoxOffice(){
  if(this.zone!=='lobby'||!this.entered||this.climb)return;
  if(this.pose==='sit')this.stand();
  if(distance(this.position,BOX_OFFICE_APPROACH)<.3){this.onSeatMap();return;}
  const path=findPath('lobby',this.position,BOX_OFFICE_APPROACH);if(!path){this.onToast('매표소 앞 통로로 이동해 주세요.');return;}
  this.cancelSeat();this.visitingBoxOffice=true;this.route=path;this.marker.position.set(BOX_OFFICE_APPROACH.x,.035,BOX_OFFICE_APPROACH.z);this.marker.visible=true;this.onToast('매표소로 걸어갑니다. 도착하면 좌석을 고를 수 있어요.');
 }
 /** Walk to the clear front of a lounge seat before sitting. */
 private sitInLobby(id:string){
  if(this.zone!=='lobby'||this.net.status!=='connected')return;
  const seat=LOUNGE_SEATS.find(s=>s.id===id);if(!seat)return;
  if(this.net.state?.visitors.some(v=>v.id!==this.net.selfId&&v.loungeSeatId===id&&v.pose==='sit')){this.onToast('다른 관객이 앉아 있어요.');return;}
  if(this.pose==='sit')this.stand();
  const path=findPath('lobby',this.position,seat.approach);if(!path){this.onToast('의자 앞 통로로 이동해 주세요.');return;}
  this.cancelSeat();this.loungeTarget=id;this.route=path;this.marker.position.set(seat.approach.x,.035,seat.approach.z);this.marker.visible=true;
 }
 /** A click walks to the cat first, then gives a gentle pat. */
 private visitCat(){
  const cat=this.venue.cat;if(!cat||this.zone!=='lobby'||this.net.status!=='connected')return;
  if(this.pose==='sit')this.stand();
  this.cancelSeat();if(!cat.invite(this.position))return;
  const path=findPath('lobby',this.position,cat.approach);if(!path){cat.release();this.onToast('고양이 옆 통로로 이동해 주세요.');return;}
  this.visitingCat=true;this.route=path;this.marker.position.set(cat.approach.x,.035,cat.approach.z);this.marker.visible=true;
 }
 /** A seat picked at the lobby box office: enter the hall, then walk to it. */
 chooseSeatFromLobby(id:string){if(!SEATS.some(s=>s.id===id))return;this.walkToEntrance(id);}
 /** Scene door taps walk up the visible flight; HUD icons still call changeZone directly. */
 walkToEntrance(seatId:string|null=null){
  if(this.zone!=='lobby'||!this.entered||this.net.status!=='connected'||this.changingZone)return;
  if(this.pose==='sit')this.stand();
  const target={x:HALL_INNER_DOOR.x,y:GRAND_STAIR.rise,z:HALL_INNER_DOOR.approachZ},path=findPath('lobby',this.position,target);
  if(!path){this.onToast('공연장 문으로 가는 통로를 찾지 못했어요.');return;}
  this.cancelSeat();this.pendingSeat=seatId;this.route=path;this.marker.position.set(target.x,target.y+.035,target.z);this.marker.visible=true;this.onToast('공연장 문까지 걸어갑니다.');
 }
 /** Keep the lobby programme board in step with the music and the hall's free seats, once a second. */
 private updateBoard(now:number){const board=this.venues.lobby.programBoard;if(!board||this.zone!=='lobby'||now-this.boardAt<1000)return;this.boardAt=now;
  const p=this.audio.playback,next=nextPiece(program as Playlist,p.index),m=Math.floor(p.remaining/60),sec=Math.floor(p.remaining%60);
  board.update({now:p.playing?p.track.title:'곧 이어서 — '+(next?.title??''),next:next?.title??'',remaining:p.playing?`남은 시간 ${m}:${String(sec).padStart(2,'0')}`:`${sec+m*60}초 뒤 시작`,playing:p.playing,seats:Object.keys(this.net.state?.seats??{}).length,capacity:CAPACITY});}
 async chooseSeat(id:string){if(this.climb){this.onToast('계단을 다 올라간 뒤 좌석을 골라 주세요.');return;}
  if(this.zone!=='auditorium'||!this.entered)return;const seat=SEATS.find(s=>s.id===id);if(!seat)return;
  // Already seated: stand up and head straight to the new seat.
  if(this.pose==='sit')this.stand();
  const path=findPath(this.zone,{x:this.position.x,y:this.position.y,z:this.position.z},seat.approach);if(!path){this.onToast('이 좌석으로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();const version=++this.reserveVersion,requestId=crypto.randomUUID();const ok=await this.net.reserve(id,requestId);if(version!==this.reserveVersion){this.net.send({type:'release',requestId});return;}
  if(!ok){this.net.send({type:'release',requestId});return;}this.reservedSeat=id;this.concertView=false;this.cameraYaw=0;this.seating=false;this.route=path;this.renewAt=performance.now();this.marker.visible=true;this.marker.position.set(seat.approach.x,seat.y+.035,seat.approach.z);this.onToast(`${seatLabel(seat)} 자리로 걸어가요.`);
 }
 stand(){
  this.seatedTarget=null;
  if(this.pose==='sit'||this.reservedSeat){
   const seat=this.self?.loungeSeatId?LOUNGE_SEATS.find(s=>s.id===this.self?.loungeSeatId):SEATS.find(s=>s.id===(this.self?.seatId??this.reservedSeat));
   if(this.pose==='sit'&&seat){const point=freeVisitorPosition(this.zone,seat.approach,this.net.state?.visitors??[],this.net.selfId);if(!point){this.onToast('의자 앞이 붐벼요. 잠시 기다려 주세요.');return;}this.position.set(point.x,point.y??0,point.z);}
   this.net.send({type:'release'});this.pose='idle';
  }
  this.cancelSeat();this.route=[];this.onChange();
 }
 /** Walk to the stair door on this side, through the corridor stair, and out onto the other floor. */
 useStair(side:number,up:boolean){
  if(this.zone!=='auditorium'||this.climb)return;if(this.pose==='sit')this.stand();
  const from=stairPoint(side,!up),to=stairPoint(side,up),out=up?{x:side*13.6,y:GOLDEN_HALL.balconyHeight,z:48.5}:{x:side*7.4,y:0,z:49.8};
  const path=findPath(this.zone,this.position,from);if(!path){this.onToast('계단으로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();this.route=[...path,to,out];this.concertView=false;this.cameraYaw=0;this.marker.position.set(out.x,out.y+.035,out.z);this.marker.visible=true;
  this.onToast(up?'계단을 따라 2층으로 올라갑니다.':'계단을 따라 1층으로 내려갑니다.');this.onChange();
 }
 goToGallery(){if(this.zone!=='auditorium'||this.climb)return;if(this.pose==='sit')this.stand();const upper=this.position.y<GOLDEN_HALL.balconyHeight-.3,side=this.position.x<0?-1:1;const target=upper?{x:side*13.6,y:GOLDEN_HALL.balconyHeight,z:48.5}:{x:side*7.4,y:0,z:49.8};const path=findPath(this.zone,this.position,target);if(!path){this.onToast('계단으로 가는 길을 찾지 못했어요.');return;}this.cancelSeat();this.route=path;this.concertView=false;this.cameraYaw=0;this.onToast(upper?'계단을 따라 2층으로 올라갑니다.':'계단을 따라 1층으로 내려갑니다.');this.onChange();}
 private cancelSeat(keepPending=false){if(this.visitingCat||this.petUntil)this.venues.lobby.cat?.release();this.visitingCat=false;this.petUntil=0;this.visitingBoxOffice=false;this.loungeTarget=null;if(!keepPending){this.pendingSeat=null;this.seatWalkAt=0;}this.reserveVersion++;if(this.reservedSeat)this.net.send({type:'release'});this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
 /** Choose to appear as a man or a woman; everyone in the hall sees the change. */
 setLook(look:Look){this.net.send({type:'look',look});}
 get visitorLook():Look{return this.self?visitorVariant(this.self)%8>=4?'woman':'man':'man';}
 /** One drag rule for every view. */
 rotateView(dx:number,dy:number){
  // Reverse both drag axes consistently in the lobby, walking, seated and overview views.
  this.dragAt=performance.now();
  // The hall and stage views turn the head in place, so the whole
  // view rotates at the walking view's pace, instead of sliding the camera along the walls.
  const overview=this.zone==='auditorium'&&this.concertView;
  // One pace for every view and every screen: a drag across the whole screen width turns about 230°, as on a phone.
  const k=4/Math.max(320,this.renderer.domElement.clientWidth),yaw=this.cameraYaw-dx*k,pitch=this.cameraPitch+dy*k*.65;
  if(overview){this.cameraYaw=T.MathUtils.clamp(yaw,-.9,.9);this.cameraPitch=T.MathUtils.clamp(pitch,.13-1.3,.13+1.4);}
  else{this.cameraYaw=yaw;this.cameraPitch=T.MathUtils.clamp(pitch,-1.45,1.45);}
 }
 zoomView(f:number){if(this.zone==='auditorium'&&this.concertView)this.hallZoom=T.MathUtils.clamp(this.hallZoom*f,.15,1.6);else this.cameraDistance=T.MathUtils.clamp(this.cameraDistance*f,1.2,13);}
 gestureAction(gesture:Gesture){this.gesture=gesture;this.gestureAt=this.net.now();this.net.send({type:'gesture',gesture});if(CLAPS.includes(gesture))this.audio.clap();}
 private click(x:number,y:number){if(!this.entered||this.climb)return;const rect=this.renderer.domElement.getBoundingClientRect();this.ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  const hits=this.ray.intersectObjects([...(this.venue.cat?.targets??[]),...(this.venue.stairArrows?.targets??[]),...this.venue.seatTargets,this.venue.portal,...this.venue.walkTargets],true);if(!hits.length)return;const hit=hits[0];
  if(hit.object.userData.lobbyCat){this.visitCat();return;}
  if(hit.object.userData.loungeSeatId){this.sitInLobby(hit.object.userData.loungeSeatId);return;}
  if(hit.object.userData.boxOffice){this.visitBoxOffice();return;}
  if(hit.object.userData.stairSide){this.useStair(hit.object.userData.stairSide,hit.object.userData.stairUp);return;}
  if(hit.object.userData.lobbyExit){this.changeZone();return;}let obj:T.Object3D|null=hit.object,seatId:string|undefined;while(obj){seatId=seatId??obj.userData.seatId;if(obj.userData.portal){if(this.zone==='lobby')this.walkToEntrance();else void this.changeZone();return;}obj=obj.parent;}
  if(seatId){void this.chooseSeat(seatId);return;}
  if(this.pose==='sit'){this.stand();return;}
  const point={x:hit.point.x,y:surfaceHeight(this.zone,hit.point,hit.point.y)??hit.point.y,z:hit.point.z};
  // A tap on the stage lip, whose ray reaches the floor under the stage, walks to the front of the stage instead.
  if(this.zone==='auditorium'&&Math.abs(point.y??0)<.4&&point.z<STAGE_APRON_Z&&point.z>STAGE_APRON_Z-3)point.z=STAGE_APRON_Z+.3;
  const path=findPath(this.zone,{x:this.position.x,y:this.position.y,z:this.position.z},point);if(!path){this.onToast('통로나 빈 바닥을 선택해 주세요.');return;}this.cancelSeat();this.route=path;this.marker.position.set(point.x,(point.y??0)+.035,point.z);this.marker.visible=true;
 }
 /** Respect both authoritative and displayed positions while other visitors interpolate. */
 private visitorStepClear(target:Point){
  for(const remote of this.remotes.values())if(remote.visitor.zone===this.zone){
   if(visitorBlocksStep(this.position,target,remote.visitor,VISITOR_GAP+.08)||visitorBlocksStep(this.position,target,remote.avatar.root.position,VISITOR_GAP+.08))return false;
  }
  const cat=this.zone==='lobby'?this.venue.cat:null;
  if(cat&&visitorBlocksStep(this.position,target,cat.root.position,CAT_VISITOR_GAP))return false;
  return true;
 }
 private advanceRoute(target:Point){
  if(this.visitorStepClear(target)){this.position.set(target.x,target.y??0,target.z);return;}
  // Wait for the occupied route to clear; steering sideways can leave a stair flight.
 }
 correctMove(point:{x:number;y:number;z:number}){if(this.pose==='sit')return;this.position.set(point.x,point.y,point.z);this.pose='idle';this.route=[];this.marker.visible=false;this.collisionPauseUntil=performance.now()+350;this.sentAt=performance.now();}
 private sendPosition(now:number,force=false){if(!this.entered||!this.self||this.pose==='sit'||this.climb)return;if(force||now-this.sentAt>(this.pose==='walk'?100:300)||this.lastPose!==this.pose){this.sentAt=now;this.lastPose=this.pose;this.net.send({type:'move',x:this.position.x,y:this.position.y,z:this.position.z,yaw:this.yaw,pose:this.pose});}}
 private snapCamera(){const f=this.cameraFrame();this.look.copy(f.look);this.camera.position.copy(f.position);this.camera.lookAt(this.look);}
 private cameraFrame(){
  const sitting=this.pose==='sit',baseY=(sitting?2.05:1.05)+this.position.y,look=new T.Vector3(this.position.x,baseY,this.position.z-1.5),d=this.cameraDistance;
  if(!this.entered){return {look:new T.Vector3(0,8.2,35.8),position:new T.Vector3(0,7.5,20.8)};}
  // Inside the corridor stair: watch the climb from the passage side, kept within the stairwell walls.
  if(this.position.z>GOLDEN_HALL.rear){const c=STAIR_CORRIDOR,side=this.position.x<0?-1:1,ahead=this.climb?.up===false?1:-1;
   const x=side*T.MathUtils.clamp(Math.abs(this.position.x)+ahead*2.2,c.innerX+.5,c.outerX-.5),y=T.MathUtils.clamp(this.position.y+2.1,1.6,12),z=this.position.z>GOLDEN_HALL.rear?c.front+.45:GOLDEN_HALL.rear-2.4;
   return {look:new T.Vector3(this.position.x,this.position.y+1,this.position.z),position:new T.Vector3(x,y,z)};}
  if(this.zone==='auditorium'&&this.concertView){
   const preset=this.hallOverview?HALL_CAMERA:CONCERT_CAMERA,center=new T.Vector3(...preset.look),offset=new T.Vector3(...preset.eye).sub(center);
   // The hall view zooms from the rear all the way up to the front rows.
   offset.multiplyScalar(this.hallZoom*Math.min(this.camera.aspect<.8?2.2:1.3,Math.max(1,1.65/this.camera.aspect)));
   const position=center.clone().add(offset);position.x=T.MathUtils.clamp(position.x,-13.8,13.8);position.y=T.MathUtils.clamp(position.y,1.2,GOLDEN_HALL.height-1.2);position.z=Math.min(position.z,GOLDEN_HALL.rear-2);
   // Turn the head where the camera stands: sideways about the vertical, then up or down.
   const view=center.clone().sub(position).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw),right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();
   view.applyAxisAngle(right,-(this.cameraPitch-.13));
   return {look:position.clone().add(view),position};
  }
  const local=localCameraFrame(this.position,sitting,this.cameraYaw,this.cameraPitch,d),target=local.position;look.copy(local.look);
  // In the hall the camera never slips through a stair door into the corridor: it just comes closer along its orbit.
  if(this.zone==='auditorium'&&target.z>GOLDEN_HALL.rear-.5&&target.z>local.origin.z){const t=Math.max(0,(GOLDEN_HALL.rear-.5-local.origin.z)/(target.z-local.origin.z));target.lerpVectors(local.origin,target,t);}
  // Stay under the ceiling, so zooming out never leaves the building.
  target.y=Math.min(target.y,this.zone==='lobby'?ATRIUM.height-1:GOLDEN_HALL.height-1.5);
  return {look,position:constrainCamera(local.origin,target,this.venue.cameraWalls)};
 }
 /** Reaction icons float above every visible visitor's head, with a short pop when they appear. */
 private showEmotes(){
  for(const v of Object.values(this.venues))v.emotes.clear();
  const layer=this.venue.emotes,now=this.net.now();let slot=0;
  const show=(avatar:Avatar|null,gestureAt:number)=>{
   if(!avatar?.root.visible||!avatar.icon||avatar.iconAlpha<=0||slot>=layer.capacity)return;
   const age=(now-gestureAt)/1000,pop=1+.3*Math.max(0,Math.sin(Math.min(age,.35)/.35*Math.PI));
   avatar.head.getWorldPosition(this.headTop);this.headTop.y+=.78+Math.sin(age*3)*.04;layer.set(slot++,this.headTop,avatar.icon,avatar.iconAlpha*pop);
  };
  if(this.entered)show(this.avatar,this.gestureAt);
  for(const r of this.remotes.values())show(r.avatar,r.visitor.gestureAt);
  for(const v of Object.values(this.venues))v.emotes.commit();
 }
 private animate=()=>{
  this.frame=requestAnimationFrame(this.animate);const now=performance.now(),rate=document.hidden?1:this.uiObscured?8:!this.entered&&this.ready?30:frameRate(this.mobile,this.quality),interval=1000/rate;if(now-this.renderedAt<interval)return;this.renderedAt=interval?now-((now-this.renderedAt)%interval):now;const elapsed=(now-this.last)/1000,dt=Math.min(.1,elapsed);this.last=now;this.frames++;this.statsTime+=elapsed;if(this.statsTime>.7){this.fps=Math.round(this.frames/this.statsTime);this.frames=0;this.statsTime=0;}
  const workStart=this.diagnosticActive?performance.now():0;
  if(this.diagnosticActive&&this.diagnosticMode==='audio-only'){this.frameCost={at:now,cpu:0,submit:0};if(now-this.lastUI>500){this.lastUI=now;this.onChange();}return;}
  let speed=0;const keys=this.input.keys;let kx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+this.input.touchMove.x;let kz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+this.input.touchMove.z;
  if(this.entered&&this.net.status==='connected'){
   if(this.climb||now<this.collisionPauseUntil)kx=kz=0;
   if((kx||kz)&&this.pose==='sit')this.stand();
   const previous=this.position.clone();
   if(kx||kz){this.route=[];this.cancelSeat();const v=new T.Vector3(kx,0,kz).clampLength(0,1).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw).multiplyScalar(2.8*dt),candidate=this.position.clone().add(v);
    const move=(x:number,z:number)=>{const y=surfaceHeight(this.zone,{x,z},this.position.y);if(y===null)return false;const target={x,y,z};if(!segmentClear(this.zone,this.position,target)||!this.visitorStepClear(target))return false;this.position.set(x,y,z);return true;};
    // Slide along architecture, but never slide around a person or the cat.
    const candidateY=surfaceHeight(this.zone,candidate,this.position.y);
    if((candidateY===null||this.visitorStepClear({x:candidate.x,y:candidateY,z:candidate.z}))&&!move(candidate.x,candidate.z)){if(!move(candidate.x,this.position.z))move(this.position.x,candidate.z);}
   }else if(this.route.length&&this.pose!=='sit'){
    const p=this.route[0],d=distance(this.position,p);
    // Through a stair door: walk the corridor stair behind the rear wall, then come out at the partner door.
    if(this.zone==='auditorium'&&(this.climb||(d>1&&stairLink(this.position,p,.05)))){
     if(!this.climb){this.sendPosition(now,true);const up=(p.y??0)>this.position.y;this.climb={points:corridorRoute(this.position.x<0?-1:1,up).slice(1),up};}
     const target=this.climb.points[0],left=distance(this.position,target),step=Math.min(left,(this.reduced?40:3.4)*dt);
     if(left<.001)this.climb.points.shift();else{this.position.x+=(target.x-this.position.x)/left*step;this.position.y+=((target.y??0)-this.position.y)/left*step;this.position.z+=(target.z-this.position.z)/left*step;}
     if(!this.climb.points.length){const up=this.climb.up;this.climb=null;this.cameraYaw=0;this.cameraPitch=.13;// Out of the door, look straight ahead into the hall.
      this.position.set(p.x,p.y??0,p.z);this.route.shift();this.sentAt=0;this.sendPosition(now,true);this.onToast(up?'계단을 올라 2층에 왔어요.':'계단을 내려 1층에 왔어요.');}
    }
    else if(d<.035){if(this.visitorStepClear(p)){this.position.set(p.x,p.y??0,p.z);this.route.shift();}}else{const step=Math.min(d,3.4*dt);this.advanceRoute({x:this.position.x+(p.x-this.position.x)/d*step,z:this.position.z+(p.z-this.position.z)/d*step,y:this.position.y+((p.y??0)-this.position.y)/d*step});
     // Follow the currently connected lobby floor, flight or balcony.
     if(this.zone==='lobby'){const h=surfaceHeight('lobby',this.position,this.position.y);if(h!==null)this.position.y=h;}}
    if(!this.route.length){this.marker.visible=false;this.pose='idle';if(this.reservedSeat&&!this.seating){this.seating=true;this.sendPosition(now,true);this.net.send({type:'seated',seatId:this.reservedSeat});}}
   }
   if(this.visitingCat&&!this.route.length&&this.venue.cat&&distance(this.position,this.venue.cat.approach)<.15){
    this.visitingCat=false;this.petUntil=now+2600;this.venue.cat.pet(now/1000);this.audio.meow();this.pose='idle';this.onToast('고양이가 눈을 감고 기분 좋게 꼬리를 흔들어요.');this.sentAt=0;
   }
   if(this.loungeTarget&&!this.route.length){const seat=LOUNGE_SEATS.find(s=>s.id===this.loungeTarget);this.loungeTarget=null;if(seat&&distance(this.position,seat.approach)<.12){this.pose='idle';this.sendPosition(now,true);this.net.send({type:'loungeSit',seatId:seat.id});}}
   if(this.visitingBoxOffice&&this.zone==='lobby'&&distance(this.position,BOX_OFFICE_APPROACH)<.12){this.visitingBoxOffice=false;this.route=[];this.marker.visible=false;this.pose='idle';this.onSeatMap();}
   speed=previous.distanceTo(this.position)/Math.max(dt,.001);if(this.pose!=='sit'){this.pose=speed>.015?'walk':'idle';if(speed>.015)this.yaw=Math.atan2(-(this.position.x-previous.x),-(this.position.z-previous.z));}
   if(now<this.petUntil&&this.venue.cat){this.venue.cat.petPoint(this.petFocus);this.yaw=Math.atan2(this.position.x-this.petFocus.x,this.position.z-this.petFocus.z);this.pose='idle';speed=0;}
   if(this.reservedSeat&&this.pose!=='sit'&&now-this.renewAt>5000){this.net.send({type:'renew',seatId:this.reservedSeat});this.renewAt=now;}
   this.sendPosition(now);
   // Walking through the amphitheatre door at the head of the flight enters the hall.
   if(this.zone==='lobby'&&Math.abs(this.position.y-GRAND_STAIR.rise)<.3&&this.position.z>=HALL_INNER_DOOR.approachZ-.02&&this.position.z<HALL_INNER_DOOR.z&&Math.abs(this.position.x)<HALL_INNER_DOOR.halfWidth)void this.changeZone(true);
  }
  if(this.pose==='sit'&&this.seatedTarget)this.position.lerp(this.seatedTarget,1-Math.exp(-dt*12));
  const music=this.audio.playback.playing&&!this.reduced;
  // Dust and shimmer hold still for visitors who prefer reduced motion.
  this.venue.sunlight?.update(this.reduced?0:now/1000);this.venue.stairArrows?.update(this.reduced?0:now/1000);
  this.venue.cat?.update(now/1000,this.entered?this.position:new T.Vector3(Infinity,0,0),this.reduced,[...this.remotes.values()].filter(r=>r.visitor.zone===this.zone).flatMap(r=>[r.visitor,r.avatar.root.position]));
  if(this.avatar){this.avatar.root.position.copy(this.position);this.avatar.root.rotation.y=this.yaw;this.avatar.update(this.net.now()/1000,speed,this.pose==='sit',music,this.gesture,(this.net.now()-this.gestureAt)/1000,dt);this.avatar.root.visible=this.entered;
   if(now<this.petUntil&&this.venue.cat)this.avatar.pet(this.venue.cat.petPoint(this.petFocus),now/1000,this.reduced);
  }
  for(const r of this.remotes.values()){
   const v=r.visitor;r.avatar.root.visible=v.zone===this.zone;const target=new T.Vector3(v.x,v.y??(v.pose==='sit'?(SEATS.find(s=>s.id===v.seatId)?.y??0):0),v.z);r.avatar.root.position.lerp(target,1-Math.exp(-dt*9));const dy=T.MathUtils.euclideanModulo(v.yaw-r.avatar.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;r.avatar.root.rotation.y+=dy*(1-Math.exp(-dt*9));r.avatar.update(this.net.now()/1000,v.pose==='walk'?2.6:0,v.pose==='sit',music,v.gesture,(this.net.now()-v.gestureAt)/1000,dt);
  }
  this.showEmotes();
  const playback=this.audio.playback;if(now-this.orchestraAt>=1000/30){const animationDt=Math.min(.15,(now-this.orchestraAt)/1000);this.orchestraAt=now-((now-this.orchestraAt)%(1000/30));const show=stageShow(playback),clock=this.reduced?0:this.net.now()/1000;
   for(const actor of this.venue.musicians){
    if(actor.instrumentType==='conductor'){const c=show.conductor;actor.root.position.set(c.x,c.y,c.z);actor.root.rotation.y=c.yaw;actor.update(clock,c.walking?1.2:0,false,show.orchestraPlays&&!this.reduced,c.bowAge===null?null:'bow',c.bowAge??10,animationDt);continue;}
    if(actor.root.userData.concertmaster){actor.update(clock,0,!show.concertmasterStands,(show.concertmasterPlays||show.orchestraPlays)&&!this.reduced,null,10,animationDt);continue;}
    actor.update(clock,0,musicianSits(actor.instrumentType),show.orchestraPlays&&!this.reduced,null,10,animationDt);
   }this.venue.updateMusicians(this.camera);}
  if(this.introUntil&&now>this.introUntil){this.introUntil=0;if(this.zone==='auditorium'&&this.concertView&&this.pose!=='sit'){this.concertView=false;this.introEase=2.5;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}}
  if(this.zone==='auditorium'&&this.pendingSeat&&this.seatWalkAt&&now>=this.seatWalkAt){const id=this.pendingSeat;this.pendingSeat=null;this.seatWalkAt=0;void this.chooseSeat(id);}
  // The walking camera stays locked to its orbit (no trailing glide); easing is kept only for big view changes.
  this.audio.setDoorDistance(this.entered&&this.zone==='lobby'?Math.hypot(this.position.x-HALL_INNER_DOOR.x,this.position.y-GRAND_STAIR.rise,this.position.z-HALL_INNER_DOOR.z):Infinity);
  this.updateBoard(now);
  const f=this.cameraFrame(),snap=now-this.dragAt<150||!this.concertView&&this.introEase<=0&&this.camera.position.distanceTo(f.position)<1.5,smooth=snap?1:1-Math.exp(-dt*(this.introEase>0?1.6:7));if(this.introEase>0)this.introEase=Math.max(0,this.introEase-dt);this.camera.position.lerp(f.position,smooth);if(this.entered&&!this.concertView&&!this.climb&&this.position.z<=GOLDEN_HALL.rear){const origin=localCameraFrame(this.position,this.pose==='sit',this.cameraYaw,this.cameraPitch,this.cameraDistance).origin;this.camera.position.copy(constrainCamera(origin,this.camera.position,this.venue.cameraWalls));}this.venue.scene.userData.cameraFocus=this.entered?(this.concertView?f.look:localCameraFrame(this.position,this.pose==='sit',this.cameraYaw,this.cameraPitch,this.cameraDistance).origin):null;this.look.lerp(f.look,smooth);this.camera.lookAt(this.look);if(this.avatar&&this.entered&&(this.zone==='lobby'||!this.concertView)){const head=this.position.clone();head.y+=1.1;this.avatar.root.visible=this.camera.position.distanceTo(head)>1.65;}if(now-this.lodAt>200){this.lodAt=now;this.venue.updateLOD(this.camera);}for(const object of this.venue.overviewHidden)object.visible=!this.concertView;const submitStart=this.diagnosticActive?performance.now():0;if(!this.diagnosticActive||this.diagnosticMode==='normal'){this.crowds[this.zone].update(this.remoteAvatars(),this.camera);this.renderer.render(this.venue.scene,this.camera);this.drawCount++;
   if(!this.ready&&this.texturesLoaded){this.ready=true;performance.measure('aurea-first-scene',{start:0,end:performance.now()});document.body.classList.add('scene-ready');this.onChange();
    this.warmTimer=window.setTimeout(()=>{if(this.disposed)return;if('requestIdleCallback' in window)window.requestIdleCallback(()=>void this.warmHall().catch(()=>{}),{timeout:4000});else void this.warmHall().catch(()=>{});},1800);
   }
  }if(this.diagnosticActive){const end=performance.now();this.frameCost={at:now,cpu:end-workStart,submit:end-submitStart};}
  if(now-this.lastUI>500){this.lastUI=now;this.onChange();}
 };
 destroy(){this.disposed=true;clearTimeout(this.warmTimer);cancelAnimationFrame(this.frame);this.input.destroy();window.removeEventListener('resize',this.resize);for(const v of Object.values(this.venues))v.scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.renderer.dispose();this.renderer.domElement.remove();}
}
