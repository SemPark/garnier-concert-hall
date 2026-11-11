import {onTrainDeck,TRAIN_DECK,TRAIN_PLATFORM} from '../shared/encoreTrain';
import {EncoreTrain} from './scene/EncoreTrain';
import {MusicLights} from './scene/MusicLights';
import {StageFireworks} from './scene/StageFireworks';
import {newId} from './util/requestId';
import {PROBE_PROFILE} from './diagnostics/ProbeProfile';
import type {GpuFrameTimer} from './diagnostics/GpuFrameTimer';
import {VisitorNames} from './character/VisitorNames';
import {ConductTapEffect} from './scene/ConductTapEffect';
import {buildInstrument} from './orchestra/instruments';
import {faceYaw,rightStroke,conductorTurn,conductorShift} from './scene/conductPose';
import {Conducting} from './scene/Conducting';
import {projectedHeight,musicianInterval} from './scene/projectedDetail';
import {CarriedCandles} from './scene/CandleCarry';
import {completeInitialLoading,reportInitialHallLoading,reportLoading} from './loading';
import {visitorBlocksStep,freeVisitorPosition} from '../shared/visitorCollision';
import {CLOAKROOM_APPROACH,atCloakroom,isOutfit,type Outfit} from '../shared/wardrobe';
import {LOUNGE_SEATS} from '../shared/loungeSeats';
import * as T from 'three';
import {characterFrontLight,FRONT_LIGHT} from './character/characterLight';
import {constrainCamera} from './controls/cameraCollision';
import {createVenue,createVenueAsync,type Venue} from './scene/Venue';
import {Ghosts,type GhostSpot} from './scene/Ghosts';
import {GESTURE_ICON,gestureTurnWeight,gestureWeight,type Icon} from './character/villager';
import {ICON_SIZE,MAX_GROWTH} from './character/EmoteLayer';
import {ghostTop} from './character/VisitorNames';
/** Three ghosts loop above the orchestra (stage runs from the apron at z −9 back to the organ). */
const FLYERS=[{x:-5,z:-14,y:7.5,rx:3.5,rz:3.5,speed:.16},{x:0,z:-16,y:8.5,rx:5,rz:4,speed:.12},{x:5,z:-13,y:7,rx:3.5,rz:3.5,speed:.14}];
/** Lanes beside and between the dinner-table rows, the stage front, the rear and the side galleries. */
const WALKER_PATHS=[{x1:-11.4,z1:-7,x2:-11.4,z2:38},{x1:11.4,z1:38,x2:11.4,z2:-7},...DINNER_LANES_Z.filter((_,i)=>i%2===0).map((z,i)=>i%2?{x1:11,z1:z,x2:-11,z2:z}:{x1:-11,z1:z,x2:11,z2:z}),{x1:-9,z1:43,x2:9,z2:43},{x1:-10,z1:-7.6,x2:10,z2:-7.6},{x1:-12.9,z1:2,x2:-12.9,z2:38},{x1:12.9,z1:38,x2:12.9,z2:2}];
/** Walking ghosts (currently off, see flyingGhosts): two per lane, spread out along it, each at its own pace. */
export const WALKERS=WALKER_PATHS.flatMap((w,i)=>[0,1].map(k=>({...w,phase:k/2+i*.13,speed:.6+.08*((i+k)%4)})));
/** Hall ghosts act like visitors: every four seconds each one picks one of the eight audience gestures at random (a
 * third of the time it just rests), out of step with the others. Seeded by id and time, so every viewer sees the same. */
const GHOST_GESTURES=8;
function ghostGesture(id:string,t:number){const offset=(ghostSeatHash(id)%97)/97,slot=Math.floor(t/4+offset),h=ghostSeatHash(id+':'+slot)%12;return h<GHOST_GESTURES?{gesture:GESTURES[h].id as Gesture,age:t-(slot-offset)*4}:null;}
/** A visitor's own gesture, shown on their ghost while it lasts (eating and drinking included). */
function visitorGhostGesture(v:Visitor,now:number){if(!v.gesture)return null;const age=(now-v.gestureAt)/1000;return age<=gestureSeconds(v.gesture)?{gesture:v.gesture,age}:null;}
const ghostSeatHash=(id:string)=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;};
/** A handful of parterre seats hold a ghost while no visitor has taken them. */
const NPC_SEATS=FLOOR_SEATS.filter((_,i)=>i%25===6).slice(0,5);
import {LobbyLightPass,type RenderPassTimings} from './scene/LobbyLighting';
import {interiorEnvironment,bakeArchitectureShadows} from './scene/InteriorLight';
import {Avatar,musicianSits} from './character/Avatar';
import {CAT_VISITOR_GAP} from './character/LobbyCat';
import {USHER_LINES} from './character/Usher';
import {Input} from './controls/Input';
import {stageShow} from './orchestra/stageShow';
/** Gestures that make applause heard in the quiet time between pieces. */
const CLAPS:Gesture[]=['clap','bravo'];
import {ATRIUM,HALL_INNER_DOOR,GRAND_STAIR,BOX_OFFICE_APPROACH} from '../shared/grandStair';
import program from './audio/playlist';
import {nextPiece,type Playlist} from '../shared/timeline';
import {dinnerCameraFrame,localCameraFrame} from './controls/localCamera';
import {findPath,segmentClear} from './navigation/path';
import {DINNER_LANES_Z,DINNER_TABLES} from '../shared/dinnerTables';
import {GHOST_ORCHESTRA} from './orchestra/buildOrchestra';
import {ORCHESTRA_LAYOUT,STAGE_FLOOR as ORCHESTRA_FLOOR} from './orchestra/layout';
/** Trial ghost orchestra: one ghost at every player's place (people face −z, ghosts +z, hence the half turn). */
const ORCHESTRA_GHOSTS:GhostSpot[]=ORCHESTRA_LAYOUT.map((p,i)=>({x:p.x,y:ORCHESTRA_FLOOR+p.rise,z:p.z,yaw:p.yaw+Math.PI,id:'player-'+i,sitting:musicianSits(p.instrument),npc:true}));
import {FLOOR_SEATS,FLOOR_CROSS_AISLE,SPAWN,SEATS,CAPACITY,BOUNDS,seatLabel,walkable,distance,surfaceHeight,STAGE_APRON_Z,DESTINATION_ZONE,visitorVariant,visitorColor,cafeApproach,atCafe,CANDLE_TABLES,type CandleTable,type HallDestination,type Look,type Visitor,type Zone,type Point} from '../shared/venue';
import type {Snapshot} from '../shared/protocol';
import type {Presence} from './network/Presence';
import type {ConcertAudio} from './audio/ConcertAudio';
import {renderRatio,frameRate,bloomResolution,msaaSamples,type RenderQuality} from './scene/quality';
import {CONCERT_CAMERA,CONDUCTOR,STAGE,STAGE_FLOOR} from './orchestra/layout';
import {GOLDEN_HALL,HALL_CAMERA} from '../shared/goldenHall';
import {GALLERY_BRIDGE} from '../shared/gallery';
import {GESTURES,gestureSeconds,type Gesture} from '../shared/gestures';
import {DISH_BITES,isDrink,type Dish} from '../shared/dishes';
import {DinnerDishes,BITE_COLOUR} from './scene/DinnerDishes';

const DINNER_SEATS_BY_ID=new Map(FLOOR_SEATS.map(seat=>[seat.id,seat]));

function measuredVenue(zone:Zone){const start=performance.now(),venue=createVenue(zone);performance.measure(`aurea-${zone}-build`,{start,end:performance.now()});return venue;}
type Remote={avatar:Avatar;visitor:Visitor;lastPosition:T.Vector3;zone:Zone;poseAt:number;};
export type FrameTimings=RenderPassTimings&{musicianAnimation:number;musicianBatch:number;crowdBatch:number};
/** The lobby is drawn a little darker than the hall's default exposure. */
const LOBBY_EXPOSURE=.88;
const FIRST_PERSON_ZOOM=1.2;
const ENTRANCE_DISTANCE=7;
const ENTRANCE_PITCH=.09;
const STAGE_IDLE_DELAY=5000;
const STAGE_SWAY_PERIOD=10*Math.PI;

function underEntranceRoof(point:Point){
 const roof=GALLERY_BRIDGE;
 return (point.y??0)<1&&point.z>=roof.minZ&&point.z<=roof.maxZ&&point.x>=roof.minX&&point.x<=roof.maxX;
}
export class World{
 readonly renderer:T.WebGLRenderer;readonly camera=new T.PerspectiveCamera(61,1,.08,150);
 readonly venues:Record<Zone,Venue>;private readonly crowds:Record<Zone,Ghosts>;readonly input:Input;zone:Zone='lobby';self:Visitor|null=null;
 readonly conducting=new Conducting();private conductView=false;private demoAvatar:Avatar|null=null;private guestConductor:Avatar|null=null;private conductSeat=false;private conductEffect:ConductTapEffect|null=null;
 concertView=true;hallOverview=true;stageLowView=false;private introUntil=0;private usherGreetingPending=false;private dragAt=0;private hallZoom=1;private introEase=0;
 photoMode=false;
 photoComposition:'recommended'|'current'='recommended';
 private photoOriginal={position:new T.Vector3(),look:new T.Vector3(),fov:61,avatarVisible:true,avatarYaw:0};
 photoZoom=1;
 photoHeight=1.6;
 private photoYaw=0;
 private photoPitch=Math.atan2(3.6,21);
 private photoAnchor=new T.Vector3();
 private photoDistance=7.5;
 private photoCapture:{resolve:(blob:Blob)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
 private stageInputAt=0;
 private stageCameraTime=0;
 private stageCameraBlend=0;
 ready=false;private texturesLoaded=false;private hallBuild:Promise<Venue>|null=null;private hallWarm:Promise<void>|null=null;private hallWarmed=false;private deferredState:Snapshot|null=null;private changingZone=false;uiObscured=false;
 position=new T.Vector3(SPAWN.lobby.x,SPAWN.lobby.y,SPAWN.lobby.z);pose:'idle'|'walk'|'sit'='idle';yaw=0;cameraYaw=0;cameraPitch=.13;cameraDistance=4.8;private cameraLocked=false;private introGlide=false;private entranceFraming=false;fps=60;entered=false;
 onChange:()=>void=()=>{};onToast:(message:string)=>void=()=>{};onSeatMap:()=>void=()=>{};onWardrobe:()=>void=()=>{};private wardrobeNear=false;private visitingWardrobe=false;private pendingSeat:string|null=null;private loungeTarget:string|null=null;private visitingCat=false;private petUntil=0;private visitingBoxOffice=false;private seatWalkAt=0;private boardAt=0;
 private fireworks:StageFireworks|null=null;
 private musicLights:MusicLights|null=null;
 private encoreTrain:EncoreTrain|null=null;
 private lightingPass:LobbyLightPass|null=null;private environment:T.WebGLRenderTarget;private poseFrustum=new T.Frustum();private poseProjection=new T.Matrix4();private poseSphere=new T.Sphere();private poseCenter=new T.Vector3();private avatar:Avatar|null=null;private remotes=new Map<string,Remote>();private ghostBuffer:GhostSpot[]=[];private route:Point[]=[];private avatarVariant=-1;private reservedSeat:string|null=null;private seating=false;private reserveVersion=0;
 private collisionPauseUntil=0;private seatedTarget:T.Vector3|null=null;private cameraSeatAmount=0;private petFocus=new T.Vector3();
 hallLoading=false;private hallLoadingTimeout=0;
 private lobbyEnteredAt=0;private activityEvents=new AbortController();private activitySentAt=0;
 private ray=new T.Raycaster();private ndc=new T.Vector2();private frame=0;private last=performance.now();private sentAt=0;private lastPose='';private renewAt=0;private lastUI=0;private look=new T.Vector3();private gesture:Gesture|null=null;private headTop=new T.Vector3();private gestureAt=0;
 private gestureCameraTurn:number|null=null;
 private disposed=false;private lodAt=0;private orchestraAt=0;quality:RenderQuality='balanced';readonly mobile=matchMedia('(pointer: coarse)').matches||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);private renderedAt=0;
 private releaseLoadingCallbacks=()=>{};
 diagnosticActive=false;diagnosticMode:'normal'|'no-draw'|'audio-only'='normal';drawCount=0;frameCost={at:0,cpu:0,submit:0};
 diagnosticGpu:GpuFrameTimer|null=null;
 onDiagnosticFrame:((timings:FrameTimings)=>void)|null=null;
 private probeViewport:{width:number;height:number}|undefined;
 private readonly visitorNames:VisitorNames;
 private marker:T.Mesh;private statsTime=0;private frames=0;private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(host:HTMLElement,private net:Presence,private audio:ConcertAudio){
  reportLoading(20,'음악당 공간을 만들고 있어요');
  const previousProgress=T.DefaultLoadingManager.onProgress;
  T.DefaultLoadingManager.onProgress=(url,loaded,total)=>{previousProgress?.(url,loaded,total);if(!this.disposed&&!this.ready)reportLoading(55+38*loaded/Math.max(1,total),'음악당의 색과 빛을 준비하고 있어요');};
  const previousLoad=T.DefaultLoadingManager.onLoad;T.DefaultLoadingManager.onLoad=()=>{previousLoad?.();if(!this.disposed){this.texturesLoaded=true;if(!this.ready)reportLoading(95,'마지막 화면을 준비하고 있어요');}};
  const progressHandler=T.DefaultLoadingManager.onProgress,loadHandler=T.DefaultLoadingManager.onLoad;
  this.releaseLoadingCallbacks=()=>{
   if(T.DefaultLoadingManager.onProgress===progressHandler)T.DefaultLoadingManager.onProgress=previousProgress;
   if(T.DefaultLoadingManager.onLoad===loadHandler)T.DefaultLoadingManager.onLoad=previousLoad;
  };
  // Phones start on the cool-running setting; a saved choice still wins.
  this.quality=this.mobile?'low':'balanced';
  try{const saved=localStorage.getItem('concert-quality');if(saved==='balanced'||saved==='sharp'||saved==='low')this.quality=saved;}catch{/* Storage can be unavailable in private browsing. */}
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,this.quality,this.mobile));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','캐릭터 뒤에서 둘러보는 플리 음악당. 바닥 클릭으로 이동하고 드래그로 둘러봅니다.');host.append(canvas);this.visitorNames=new VisitorNames(host);
  this.environment=interiorEnvironment(this.renderer);
  this.venues={lobby:measuredVenue('lobby')} as Record<Zone,Venue>;reportLoading(55,'음악당의 색과 빛을 준비하고 있어요');
  // Other visitors are drawn in shared batches per hall, so a full house stays cheap.
  this.venues.lobby.scene.environment=this.environment.texture;this.venues.lobby.scene.environmentIntensity=.18;this.lightingPass=new LobbyLightPass(this.renderer,this.venues.lobby.scene,this.camera,bloomResolution(this.mobile,this.quality),msaaSamples(this.quality));
  this.crowds={lobby:new Ghosts(this.venues.lobby.scene)} as Record<Zone,Ghosts>;
  this.marker=new T.Mesh(new T.RingGeometry(.16,.24,24),new T.MeshBasicMaterial({color:0xe5c786,transparent:true,opacity:.8,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.venues.lobby.scene.add(this.marker);
  this.input=new Input(canvas,{click:(x,y)=>this.click(x,y),rotate:(dx,dy)=>this.rotateView(dx,dy),zoom:f=>this.zoomView(f),escape:()=>{if(this.photoMode)this.endPhotoMode();else this.stand();}});
  for(const event of ['pointerdown','pointermove','keydown','wheel'])window.addEventListener(event,()=>{const now=performance.now();this.lobbyEnteredAt=now;this.stageInputAt=now;if(this.entered&&this.zone==='lobby'&&now-this.activitySentAt>2000){this.activitySentAt=now;this.net.send({type:'activity'});}},{passive:true,signal:this.activityEvents.signal});
  window.addEventListener('resize',this.resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onToast('화면 연결이 끊겼어요. 새로고침해 주세요.');});this.resize();this.snapCamera();bakeArchitectureShadows(this.renderer,this.venues.lobby.scene,this.camera);this.venues.lobby.updateLOD(this.camera);this.animate();if(new URLSearchParams(location.search).has('diagnostics'))Object.assign(window,{__concertMetrics:()=>({fps:this.fps,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pixelRatio:this.renderer.getPixelRatio(),buffer:[this.renderer.domElement.width,this.renderer.domElement.height],quality:this.quality,mobile:this.mobile,targetFPS:frameRate(this.mobile,this.quality),animationHz:Math.min(30,frameRate(this.mobile,this.quality)),antialias:this.renderer.getContext().getContextAttributes()?.antialias})});
 }
 private ensureHall(){
  if(!this.venues.auditorium)throw new Error('공연장을 준비하고 있어요.');return this.venues.auditorium;
 }
 private prepareHall(){
  if(this.venues.auditorium)return Promise.resolve(this.venues.auditorium);
  return this.hallBuild??=createVenueAsync('auditorium',()=>this.disposed).then(venue=>{venue.scene.environment=this.environment.texture;venue.scene.environmentIntensity=.03;/* Candlelight concert: the walls and organ fall back into the dark. */this.venues.auditorium=venue;this.fireworks=new StageFireworks(venue.scene,this.mobile);this.musicLights=new MusicLights(venue.scene);this.encoreTrain=new EncoreTrain(venue.scene);this.crowds.auditorium=new Ghosts(venue.scene);venue.emotes.setViewport(this.renderer.domElement.height,this.camera.fov);venue.sunlight?.setViewport(this.renderer.domElement.height,this.camera.fov);return venue;}).catch(error=>{this.hallBuild=null;throw error;});
 }
 private warmHall(){return this.hallWarm??=this.warmHallChunks().then(()=>{if(!this.disposed)this.hallWarmed=true;}).catch(error=>{this.hallWarm=null;throw error;});}
 private async warmHallChunks(){
  if(this.disposed)return;
  const venue=await this.prepareHall();if(this.disposed)return;
  const camera=this.camera.clone();camera.position.set(...HALL_CAMERA.eye);camera.lookAt(new T.Vector3(...HALL_CAMERA.look));venue.updateLOD(camera);venue.updateMusicians(camera);venue.scene.updateMatrixWorld(true);
  // Compile and upload a handful of shared batches per turn. Warming the entire scene in one render
  // still blocks input on texture/instance-buffer upload, even after its CPU construction was split.
  const warm=new T.Scene();warm.fog=venue.scene.fog;warm.environment=venue.scene.environment;warm.environmentIntensity=venue.scene.environmentIntensity;
  const meshes:{object:T.Object3D;parent:T.Object3D;matrix:T.Matrix4;auto:boolean}[]=[];
  venue.scene.traverse(object=>{
   if(object instanceof T.Light){const light=object.clone();warm.add(light);if(light instanceof T.DirectionalLight||light instanceof T.SpotLight){light.shadow.autoUpdate=false;light.shadow.needsUpdate=false;warm.add(light.target);}}
   else if((object instanceof T.Mesh||object instanceof T.Points)&&object.visible&&object.parent&&[object.material].flat().some(material=>material.visible)&&(!(object instanceof T.InstancedMesh)||object.count>0))meshes.push({object,parent:object.parent,matrix:object.matrix.clone(),auto:object.matrixAutoUpdate});
  });
  const target=new T.WebGLRenderTarget(16,16);reportInitialHallLoading(72,'공연장의 무대와 좌석을 준비하고 있어요');
  try{for(let i=0;i<meshes.length;i+=2){if(this.disposed)return;const batch=meshes.slice(i,i+2);
   // Use the actual batches, so their buffers/VAOs are prepared once. Entry waits for this job;
   // the offscreen hall is never displayed with a temporarily detached batch.
   for(const {object}of batch){object.matrixAutoUpdate=false;object.matrix.copy(object.matrixWorld);warm.add(object);}
   try{await this.renderer.compileAsync(warm,camera);if(this.disposed)return;
    const start=performance.now(),previous=this.renderer.getRenderTarget();try{this.renderer.setRenderTarget(target);this.renderer.render(warm,camera);}finally{this.renderer.setRenderTarget(previous);}
    performance.measure('aurea-upload-slice',{start,end:performance.now()});
   }finally{for(const {object,parent,matrix,auto}of batch){parent.add(object);object.matrix.copy(matrix);object.matrixAutoUpdate=auto;}}
   reportInitialHallLoading(72+Math.round(23*Math.min(1,(i+2)/meshes.length)),'공연장의 조명과 오케스트라를 준비하고 있어요');
   await new Promise<void>(resolve=>{if(document.hidden)setTimeout(resolve,32);else requestAnimationFrame(()=>setTimeout(resolve,0));});
  }}finally{target.dispose();warm.clear();}
  if(this.disposed)return;
  bakeArchitectureShadows(this.renderer,venue.scene,camera);
  // The tiny upload scene cannot warm the actual shadow/light shader variants or the
  // full-size HDR/MSAA composer. Prepare both the overview and entrance before entry.
  const entry=this.entranceCameraFrame(SPAWN.auditorium,venue.cameraWalls);
  for(const [i,view]of [{position:camera.position.clone(),look:new T.Vector3(...HALL_CAMERA.look)},entry].entries()){
   if(this.disposed)return;
   reportInitialHallLoading(96+i,'실제 화면의 조명과 그래픽을 준비하고 있어요');
   camera.position.copy(view.position);camera.lookAt(view.look);camera.updateMatrixWorld();
   venue.updateLOD(camera);venue.updateMusicians(camera);
   await this.renderer.compileAsync(venue.scene,camera);
   if(this.disposed)return;
   const exposure=this.renderer.toneMappingExposure;
   try{this.renderer.toneMappingExposure=1;this.lightingPass?.render(venue.scene,camera);}
   finally{this.renderer.toneMappingExposure=exposure;}
   await this.waitForWarmGPU();
  }
  if(this.disposed)return;
  venue.updateLOD(camera);venue.updateMusicians(camera);
 }
 /** Let queued startup uploads/renders finish without blocking the main thread. */
 private async waitForWarmGPU(){
  const gl=this.renderer.getContext() as WebGL2RenderingContext;
  const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(!fence)return;
  gl.flush();
  const deadline=performance.now()+2000;
  try{
   while(!this.disposed&&!gl.isContextLost()&&performance.now()<deadline){
    const status=gl.clientWaitSync(fence,0,0);
    if(status!==gl.TIMEOUT_EXPIRED)break;
    await new Promise<void>(resolve=>setTimeout(resolve,16));
   }
  }finally{gl.deleteSync(fence);}
 }
 setQuality(quality:string){this.quality=quality==='low'?'low':quality==='sharp'?'sharp':'balanced';this.lightingPass?.setSamples(msaaSamples(this.quality));try{localStorage.setItem('concert-quality',this.quality);}catch{}this.resize();this.onChange();}
 get venue(){return this.zone==='auditorium'?this.ensureHall():this.venues.lobby;}
 private *remoteAvatars(){for(const r of this.remotes.values())yield r.avatar;}
 /** Everyone but the viewer is a ghost (ghosts face +z, people face -z, hence the half turn) (each viewer sees only themself as a person). */
 private *ghostSpots():Generator<GhostSpot>{for(const r of this.remotes.values()){const a=r.avatar.root;if(a.visible)yield {x:a.position.x,y:a.position.y,z:a.position.z,yaw:a.rotation.y+Math.PI,id:r.visitor.id,sitting:r.visitor.pose==='sit',walking:a.position.distanceToSquared(this.poseCenter.set(r.visitor.x,r.visitor.y??0,r.visitor.z))>.0025,drink:r.visitor.drink,bite:r.visitor.dish?BITE_COLOUR[r.visitor.dish]:undefined,...visitorGhostGesture(r.visitor,this.net.now())};}}
 private *allGhosts(){yield*this.ghostSpots();yield*this.flyingGhosts();if(GHOST_ORCHESTRA&&this.zone==='auditorium')yield*ORCHESTRA_GHOSTS;}
 /** The hall's own ghosts: a few drifting overhead, some strolling the aisles, some cheering in empty seats.
  * Everything follows the shared clock, so every visitor sees the same ghosts in the same places. */
 private *flyingGhosts():Generator<GhostSpot>{
  if(this.zone!=='auditorium')return;const t=this.net.now()/1000;
  // Above the stage: left, middle and right.
  FLYERS.forEach((f,i)=>{const a=t*f.speed+i*2.1,x=f.x+f.rx*Math.sin(a),z=f.z+f.rz*Math.sin(a*2)/2,y=f.y+.8*Math.sin(t*.4+i);
   this.ghostBuffer.push({x,y,z,yaw:Math.atan2(f.rx*Math.cos(a),f.rz*Math.cos(a*2)),id:'npc-fly'+i,sitting:false,npc:true,angel:true});});
  // (Walking ghosts are switched off for now: WALKER_PATHS is kept to bring them back.)
  // In seats nobody has claimed: clapping, waving, cheering and nodding in turns.
  const claimed=this.net.state?.seats??{};
  NPC_SEATS.forEach((seat,i)=>{if(claimed[seat.id])return;
   this.ghostBuffer.push({x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw+Math.PI,id:'npc-'+seat.id,sitting:true,npc:true,...ghostGesture('npc-'+seat.id,t)});});
  yield*this.ghostBuffer;this.ghostBuffer.length=0;
 }
 startPhotoMode(){
  if(!this.entered||!this.ready||this.changingZone||this.hallLoading)return;
  this.photoOriginal={position:this.camera.position.clone(),look:this.camera.position.clone().add(this.camera.getWorldDirection(new T.Vector3()).multiplyScalar(20)),fov:this.camera.fov,avatarVisible:this.avatar?.root.visible??false,avatarYaw:this.avatar?.root.rotation.y??this.yaw};
  if(this.conducting.active)this.endConducting();
  if(this.pose!=='sit')this.cancelSeat();
  this.photoAnchor.copy(this.position);
  this.photoMode=true;
  this.route=[];
  this.marker.visible=false;
  this.input.keys.clear();
  this.input.touchMove.x=this.input.touchMove.z=0;
  this.introUntil=0;
  document.body.classList.add('photo-active');
  this.resetPhotoView();
 }
 resetPhotoView(){this.setPhotoComposition('recommended');}
 setPhotoComposition(composition:'recommended'|'current'){
  this.photoComposition=composition;
  this.photoDistance=8.6;
  this.photoHeight=2.9;
  this.photoPitch=0;
  this.photoZoom=1;
  this.photoYaw=composition==='current'?0:this.zone==='auditorium'?Math.atan2(this.photoAnchor.x,this.photoAnchor.z+23):this.cameraYaw;
  this.updatePhotoLens();
  this.snapCamera();
  this.onChange();
 }
 private get photoBaseFov(){return this.photoComposition==='current'?this.photoOriginal.fov:61;}
 private get viewFov(){return this.camera.aspect<.8?(this.ridingTrain?86:70):61;}
 private updatePhotoLens(){
  this.camera.fov=this.photoMode?this.photoBaseFov/this.photoZoom:this.viewFov;
  this.camera.updateProjectionMatrix();
 }
 endPhotoMode(){
  if(!this.photoMode)return;
  this.photoMode=false;
  document.body.classList.remove('photo-active');
  if(this.photoCapture){
   clearTimeout(this.photoCapture.timer);
   this.photoCapture.reject(new Error('촬영이 취소되었습니다.'));
   this.photoCapture=null;
  }
  this.input.keys.clear();
  if(this.avatar){this.avatar.root.visible=true;this.avatar.root.rotation.y=this.yaw;}
  this.updatePhotoLens();
  this.snapCamera();
  this.onChange();
 }
 capturePhoto():Promise<Blob>{
  if(!this.photoMode||this.photoCapture)return Promise.reject(new Error('사진 모드에서 다시 촬영해 주세요.'));
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{
    this.photoCapture=null;
    reject(new Error('촬영하지 못했습니다. 다시 눌러 주세요.'));
   },5000);
   this.photoCapture={resolve,reject,timer};
  });
 }
 private finishPhotoCapture(){
  const request=this.photoCapture;
  if(!request)return;
  this.photoCapture=null;
  clearTimeout(request.timer);
  // Read immediately after rendering, before WebGL clears its drawing buffer.
  try{
   this.renderer.domElement.toBlob(blob=>{
    if(blob)request.resolve(blob);
    else request.reject(new Error('사진을 만들지 못했습니다. 다시 촬영해 주세요.'));
   },'image/png');
  }catch{
   request.reject(new Error('사진을 저장하지 못했습니다. 다시 촬영해 주세요.'));
  }
 }
 setStageView(low:boolean){if(this.entranceViewLocked||this.zone!=='auditorium')return;this.introUntil=0;this.concertView=true;this.hallOverview=false;this.stageLowView=low;this.stageInputAt=performance.now();this.stageCameraTime=0;this.stageCameraBlend=0;this.cameraYaw=0;this.cameraPitch=.13;this.hallZoom=1;this.route=[];this.marker.visible=false;this.onChange();}
 toggleFraming(){if(this.entranceViewLocked)return;this.introUntil=0;this.hallOverview=!this.hallOverview;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}
 toggleConcertView(){if(this.entranceViewLocked)return;this.introUntil=0;this.concertView=!this.concertView;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}
 setDiagnosticActive(active:boolean){
  this.diagnosticActive=active;
  this.resize();
 }
 private resize=()=>{
  const probe=this.diagnosticActive&&!this.mobile?PROBE_PROFILE:null;
  const w=probe?.width??innerWidth,h=probe?.height??innerHeight;
  const mobile=!!probe||this.mobile,quality=probe?.quality??this.quality;
  const ratio=renderRatio(w,h,probe?.dpr??devicePixelRatio,quality,mobile);
  const canvas=this.renderer.domElement;
  this.renderer.setDrawingBufferSize(w,h,ratio);
  const fit=probe?Math.min(innerWidth/w,innerHeight/h):1;
  canvas.style.width=w*fit+'px';
  canvas.style.height=h*fit+'px';
  canvas.style.margin=probe?'auto':'';
  canvas.classList.toggle('probe-canvas',!!probe);
  this.probeViewport=probe?{width:w*fit,height:h*fit}:undefined;
  this.camera.aspect=w/h;this.updatePhotoLens();
  this.lightingPass?.setBloomRatio(bloomResolution(mobile,quality));
  this.lightingPass?.resize(w,h,ratio);
  for(const v of Object.values(this.venues)){
   v.emotes.setViewport(canvas.height,this.camera.fov);
   v.sunlight?.setViewport(canvas.height,this.camera.fov);
  }
 };

 apply(state:Snapshot){
  if(this.disposed)return;
  if(state.visitors.find(v=>v.id===this.net.selfId)?.zone==='auditorium'&&!this.hallWarmed){const waiting=!!this.deferredState;this.deferredState=state;if(!waiting){this.hallLoading=true;this.onChange();}if(!waiting)void new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))).then(()=>this.warmHall()).then(()=>{const latest=this.deferredState;this.deferredState=null;if(latest)this.apply(latest);}).catch(()=>{this.deferredState=null;this.stopHallLoading();if(!this.disposed)this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');});return;}
  this.deferredState=null;
  const wasRiding=this.ridingTrain;const self=state.visitors.find(v=>v.id===this.net.selfId);if(self){const initial=!this.self,changedZone=this.zone!==self.zone,stood=this.pose==='sit'&&self.pose!=='sit',satDown=this.pose!=='sit'&&self.pose==='sit';this.self=self;
   // Reapply the visitor's saved man/woman choice when they (re)connect.
   if(initial){let saved:string|null=null;try{saved=localStorage.getItem('garnier-look');}catch{}if((saved==='man'||saved==='woman')&&saved!==(visitorVariant(self)%8>=4?'woman':'man'))this.setLook(saved);}
   if(this.avatar&&(this.avatarVariant!==visitorVariant(self)||this.avatar.outfit!==self.outfit)){this.avatar.root.removeFromParent();this.avatar=null;}
   if(!this.avatar){this.avatarVariant=visitorVariant(self);this.avatar=new Avatar(visitorColor(self),undefined,this.avatarVariant,self.outfit);this.venue.scene.add(this.avatar.root);}
   if(initial||changedZone||stood||self.pose==='sit'){
    if(self.pose==='sit'&&!initial&&!changedZone)this.seatedTarget=new T.Vector3(self.x,self.y??SEATS.find(s=>s.id===self.seatId)?.y??0,self.z);
    else{this.position.set(self.x,self.y??(self.pose==='sit'?(SEATS.find(s=>s.id===self.seatId)?.y??0):0),self.z);this.seatedTarget=null;}
    this.yaw=self.yaw;this.pose=self.pose;
    if(initial||changedZone){this.cameraSeatAmount=self.pose==='sit'?1:0;this.zone=self.zone;this.lobbyEnteredAt=self.zone==='lobby'?performance.now():0;if(self.zone==='auditorium')this.stopHallLoading();
     // Enter beside the usher so the welcome is visible from the first hall frame.
     if(self.zone==='auditorium'){this.concertView=false;this.hallOverview=true;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.introUntil=0;this.seatWalkAt=0;this.usherGreetingPending=true;}else{this.introUntil=0;this.seatWalkAt=0;}
     this.entranceFraming=self.zone==='auditorium'&&self.pose!=='sit'&&underEntranceRoof(this.position);
     if(this.entranceFraming){this.cameraPitch=ENTRANCE_PITCH;this.cameraDistance=ENTRANCE_DISTANCE;}
     this.avatar.root.removeFromParent();this.venue.scene.add(this.avatar.root);this.marker.removeFromParent();this.venue.scene.add(this.marker);this.route=[];this.marker.visible=false;this.reservedSeat=null;this.cameraYaw=this.zone==='lobby'?Math.PI:0;// In the lobby, open facing the Grand Escalier.
     this.audio.setZone(this.zone);this.snapCamera();this.venue.updateLOD(this.camera);this.venue.updateMusicians(this.camera);this.lodAt=0;}
    if(self.pose==='sit'){
     this.route=[];this.seating=false;this.marker.visible=false;
     if(satDown){
      this.concertView=false;this.hallZoom=1;
      if(self.zone==='auditorium'&&self.seatId&&DINNER_SEATS_BY_ID.has(self.seatId)){
       this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.4;
      }
     }
    }
   }
   if(this.ridingTrain){
    this.seatedTarget=null;this.route=[];this.entranceFraming=false;this.introUntil=0;this.concertView=false;
    this.encoreTrain?.update(this.net.now()/1000,true,this.reduced);
    if(this.encoreTrain)this.yaw=this.encoreTrain.seat(self.trainSeat!,this.position);
    if(!wasRiding){this.cameraYaw=Math.PI;this.cameraPitch=.08;this.cameraDistance=3.8;this.updatePhotoLens();this.snapCamera();this.onToast('앙코르 열차에 탔어요. 드래그해서 둘러보세요.');}
   }else if(wasRiding){this.seatedTarget=null;this.position.set(self.x,self.y??0,self.z);this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.updatePhotoLens();this.snapCamera();this.onToast('2층 뒤 승강장에 내렸어요.');}
   if(this.reservedSeat&&state.seats[this.reservedSeat]?.visitorId!==self.id){this.route=[];this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
  }
  const ids=new Set(state.visitors.filter(v=>v.id!==this.net.selfId).map(v=>v.id));for(const [id,r]of this.remotes)if(!ids.has(id)){r.avatar.root.removeFromParent();this.remotes.delete(id);}
  for(const v of state.visitors){if(v.id===this.net.selfId)continue;let r=this.remotes.get(v.id);if(r&&(r.avatar.variant!==visitorVariant(v)||r.avatar.outfit!==v.outfit)){r.avatar.root.removeFromParent();this.remotes.delete(v.id);r=undefined;}if(!r){const avatar=new Avatar(visitorColor(v),undefined,visitorVariant(v),v.outfit);avatar.root.position.set(v.x,v.y??0,v.z);r={avatar,visitor:v,lastPosition:avatar.root.position.clone(),zone:v.zone,poseAt:0};this.remotes.set(v.id,r);}if(v.zone===this.zone&&v.gesture&&CLAPS.includes(v.gesture)&&v.gestureAt>r.visitor.gestureAt)this.audio.clap(.6);r.visitor=v;
   if(r.zone!==v.zone){r.zone=v.zone;r.avatar.root.position.set(v.x,v.y??0,v.z);}r.avatar.root.visible=v.zone===this.zone;
  }
  for(const [id,light]of this.venues.auditorium?.seatLights??[]){const claim=state.seats[id];light.visible=!claim||claim.visitorId===this.net.selfId;(light.material as T.MeshBasicMaterial).color.setHex(claim?0xa2c8b4:0xd2b373);}
  this.onChange();
 }
 start(){
  // Before the welcome snapshot arrives, use exactly the same spawn/orbit as the server.
  // The old temporary z=10 / yaw=0 put the camera outside the lobby for a frame.
  if(!this.self){this.position.set(SPAWN.lobby.x,SPAWN.lobby.y,SPAWN.lobby.z);this.cameraYaw=Math.PI;}
  this.entered=true;this.lobbyEnteredAt=performance.now();this.snapCamera();this.renderer.domElement.focus();this.onChange();
 }
 stopHallLoading(){clearTimeout(this.hallLoadingTimeout);this.hallLoading=false;this.onChange();}
 async changeZone(fromDoor=false){
  if(!this.entered||this.changingZone||this.hallLoading)return;
  if(this.net.status!=='connected'){this.onToast('음악당에 연결한 뒤 입장할 수 있어요.');return;}
  this.cancelSeat(fromDoor);this.route=[];
  const destination=this.zone==='lobby'?'auditorium':'lobby';this.changingZone=true;
  if(destination==='auditorium'){this.hallLoading=true;this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.onChange();}
  else this.onToast('로비로 나가는 중이에요…');
  try{
   if(destination==='auditorium'){
    // Let the overlay paint before scene preparation and shader uploads start.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    if(this.disposed)return;
    await this.prepareHall();await this.warmHall();
   }
   if(!this.disposed){
    if(!this.net.send({type:'zone',zone:destination}))throw new Error('Disconnected');
    if(destination==='auditorium'&&this.hallLoading)this.hallLoadingTimeout=window.setTimeout(()=>{this.stopHallLoading();this.onToast('입장 응답이 늦어지고 있어요. 다시 시도해 주세요.');},30000);
   }
  }catch{this.stopHallLoading();if(!this.disposed)this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');}
  finally{this.changingZone=false;}
 }
 /** A ticket tap is a walking destination; the map opens only at the counter. */
 visitBoxOffice(){
  if(this.zone!=='lobby'||!this.entered)return;
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
 chooseSeatFromLobby(id:string){if(!SEATS.some(s=>s.id===id)||this.zone!=='lobby'||!this.entered)return;if(this.pose==='sit')this.stand();this.pendingSeat=id;void this.changeZone(true);}// Seat map: no walk to the hall door, go straight in.
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
 async chooseSeat(id:string,direct=false){
  if(this.zone!=='auditorium'||!this.entered)return;const seat=SEATS.find(s=>s.id===id);if(!seat)return;
  // Already seated: stand up and head straight to the new seat.
  if(this.pose==='sit')this.stand();
  const path=findPath(this.zone,{x:this.position.x,y:this.position.y,z:this.position.z},seat.approach);
  // There are no stairs: a seat on the other floor is reached by jumping to that floor first, then walking.
  if(!path&&!direct){const upper=seat.level==='balcony',here=this.position.y>GOLDEN_HALL.balconyHeight-1;
   if(upper!==here){this.floorSeat=id;this.goToHallPoint(upper?'upper':'rear');return;}
   this.onToast('이 좌석으로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();const version=++this.reserveVersion,requestId=newId();const ok=await this.net.reserve(id,requestId);if(version!==this.reserveVersion){this.net.send({type:'release',requestId});return;}
  if(!ok){this.net.send({type:'release',requestId});return;}this.reservedSeat=id;this.concertView=false;this.cameraYaw=0;this.seating=false;this.route=path??[seat.approach];this.renewAt=performance.now();this.marker.visible=true;this.marker.position.set(seat.approach.x,seat.y+.035,seat.approach.z);
  // Chosen on the seat map: appear in front of the seat and sit at once, no walk across the hall.
  if(direct&&!this.candle)this.net.send({type:'candle',state:'on'});
  if(direct){this.position.set(seat.approach.x,seat.approach.y??seat.y,seat.approach.z);this.route=[seat.approach];this.marker.visible=false;this.sentAt=0;this.onToast(`${seatLabel(seat)} 자리에 앉아요.`);}else this.onToast(`${seatLabel(seat)} 자리로 걸어가요.`);
 }
 get ridingTrain(){return this.zone==='auditorium'&&this.self?.trainSeat!==undefined;}
 toggleTrain(){
  if(this.ridingTrain)this.stand();
  else this.boardTrain(true);
 }
 private boardingRoute:Point[]|null=null;
 private boardTrain(direct=false){
  if(this.ridingTrain)return;
  if(this.zone!=='auditorium'||!this.entered||this.net.status!=='connected')return;
  if(!direct&&!onTrainDeck(this.position)){
   const target={x:TRAIN_PLATFORM.x,y:TRAIN_PLATFORM.y+TRAIN_DECK.height,z:TRAIN_DECK.z};
   const path=findPath(this.zone,this.position,target);
   if(!path||this.pose==='sit'){this.onToast('2층 승강장으로 이동한 뒤 눌러 주세요.');return;}
   this.cancelSeat();this.route=path;this.boardingRoute=path;
   return;
  }
  this.endPhotoMode();this.cancelSeat();this.route=[];this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
  if(!direct)this.sendPosition(performance.now(),true);
  this.net.send(direct?{type:'trainBoard',direct:true}:{type:'trainBoard'});
 }
 stand(){
  if(this.ridingTrain){this.net.send({type:'trainLeave'});return;}
  this.seatedTarget=null;
  if(this.pose==='sit'||this.reservedSeat){
   const seat=this.self?.loungeSeatId?LOUNGE_SEATS.find(s=>s.id===this.self?.loungeSeatId):SEATS.find(s=>s.id===(this.self?.seatId??this.reservedSeat));
   if(this.pose==='sit'&&seat){const point=freeVisitorPosition(this.zone,seat.approach);if(!point){this.onToast('일어설 위치를 찾지 못했어요.');return;}this.position.set(point.x,point.y??0,point.z);}
   this.net.send({type:'release'});this.pose='idle';
  }
  this.cancelSeat();this.route=[];this.onChange();
 }
 /** Walk to the stair door on this side, through the corridor stair, and out onto the other floor. */
 goToHallPoint(destination:HallDestination){
  if(this.zone!==DESTINATION_ZONE[destination]||this.net.status!=='connected')return;
  this.cancelSeat();this.route=[];this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
  this.net.send({type:'hallMove',destination});
 }
 /** Seat to walk to once a floor jump lands (chosen on the other floor). */
 private floorSeat:string|null=null;
 finishHallMove(point:{x:number;y:number;z:number}){
  this.cancelSeat();this.pose='idle';this.seatedTarget=null;this.position.set(point.x,point.y,point.z);this.yaw=0;
  this.entranceFraming=this.zone==='auditorium'&&underEntranceRoof(this.position);
  this.route=[];this.introUntil=0;this.concertView=false;this.cameraYaw=this.zone==='lobby'?Math.PI:0;this.cameraPitch=this.entranceFraming?ENTRANCE_PITCH:.13;this.cameraDistance=this.entranceFraming?ENTRANCE_DISTANCE:4.8;this.cameraSeatAmount=0;this.sentAt=performance.now();this.snapCamera();this.onChange();
  if(this.floorSeat){const id=this.floorSeat;this.floorSeat=null;void this.chooseSeat(id);}
 }
 /** Floor menu: jump straight to the rear gallery (2F) or back down to the rear of the stalls (1F). */
 goToGallery(){if(this.zone!=='auditorium')return;this.goToHallPoint(this.position.y<GOLDEN_HALL.balconyHeight-.3?'upper':'rear');}
 private cancelSeat(keepPending=false){this.visitingCafe=false;if(this.visitingCat||this.petUntil)this.venues.lobby.cat?.release();this.visitingCat=false;this.petUntil=0;this.visitingBoxOffice=false;this.visitingWardrobe=false;this.loungeTarget=null;if(!keepPending){this.pendingSeat=null;this.seatWalkAt=0;}this.reserveVersion++;if(this.reservedSeat)this.net.send({type:'release'});this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
 /** Wardrobe changes happen in front of the cloakroom, then travel with the visitor into the hall. */
 visitWardrobe(){
  if(this.zone!=='lobby'||!this.entered||this.net.status!=='connected')return;
  if(this.pose==='sit')this.stand();this.cancelSeat();
  if(atCloakroom({zone:this.zone,...this.position})){this.openWardrobe();return;}
  const path=findPath('lobby',this.position,CLOAKROOM_APPROACH);if(!path){this.onToast('옷 보관소 앞 통로로 이동해 주세요.');return;}
  this.visitingWardrobe=true;this.route=path;this.marker.position.set(CLOAKROOM_APPROACH.x,.035,CLOAKROOM_APPROACH.z);this.marker.visible=true;this.onToast('옷 보관소에 도착하면 관람복을 고를 수 있어요.');
 }
 private openWardrobe(){
  this.visitingWardrobe=false;this.wardrobeNear=true;this.route=[];this.marker.visible=false;this.pose='idle';this.yaw=Math.PI/2;this.cameraYaw=-Math.PI/2;this.cameraPitch=.13;this.cameraDistance=3.5;this.snapCamera();this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.sendPosition(performance.now(),true);this.onWardrobe();
 }
 setOutfit(outfit:Outfit){if(isOutfit(outfit)&&atCloakroom({zone:this.zone,...this.position}))this.net.send({type:'outfit',outfit});}
 /** Choose to appear as a man or a woman; everyone in the hall sees the change. */
 setLook(look:Look){this.net.send({type:'look',look});}
 get visitorLook():Look{return this.self?visitorVariant(this.self)%8>=4?'woman':'man':'man';}
 /** One drag rule for every view. */
 get entranceViewLocked(){return this.entered&&this.entranceFraming&&this.zone==='auditorium'&&this.pose!=='sit'&&underEntranceRoof(this.position);}
 rotateView(dx:number,dy:number){
  if(this.photoMode){
   const scale=4/Math.max(320,this.renderer.domElement.clientWidth);
   this.photoYaw-=dx*scale;
   this.photoPitch=T.MathUtils.clamp(this.photoPitch+dy*(1.6/Math.max(320,this.renderer.domElement.clientHeight)),-.5,.65);
   this.snapCamera();
   return;
  }
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
 private get firstPerson(){return !this.ridingTrain&&this.entered&&!this.conducting.active&&!(this.zone==='auditorium'&&this.concertView)&&this.cameraDistance<=FIRST_PERSON_ZOOM;}
 zoomView(f:number){
  if(this.photoMode){
   this.photoZoom=T.MathUtils.clamp(this.photoZoom/f,.65,1.25);
   this.updatePhotoLens();
   this.onChange();
   return;
  }
  if(this.entranceViewLocked)return;
  if(this.zone==='auditorium'&&this.concertView){this.hallZoom=T.MathUtils.clamp(this.hallZoom*f,.15,1.6);return;}
  const wasFirstPerson=this.firstPerson;
  this.cameraDistance=T.MathUtils.clamp(this.cameraDistance*f,FIRST_PERSON_ZOOM,13);
  if(wasFirstPerson!==this.firstPerson)this.snapCamera();
 }
 /** This visitor's carried candle, if any: lit ('on') or blown out ('off'). */
 get candle(){return this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.candle;}
 toggleCandle(){const c=this.candle;if(c)this.net.send({type:'candle',state:c==='on'?'off':'on'});}
 private cafeItem:'coffee'|'macaron'='coffee';private visitingCafe=false;private coffeeAskAt=0;
 get nearCafe(){return atCafe({zone:this.zone,...this.position});}
 get macaron(){return this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.macaron===true;}
 get coffee(){return this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.coffee===true;}
 /** Centre choice card, shown only while standing at the counter; once closed it stays closed until the visitor walks away. */
 private cafeMenuClosed=false;
 get cafeMenu(){
  if(this.zone!=='lobby'||!this.entered||(this.coffee&&this.macaron)||this.visitingCafe)return false;
  if(!this.nearCafe){this.cafeMenuClosed=false;return false;}
  return !this.cafeMenuClosed;
 }
 /** Tapping the counter walks to its front first; the choice card appears on arrival. */
 openCafeMenu(){
  if(this.zone!=='lobby'||!this.entered)return;
  if(this.coffee&&this.macaron){this.gestureAction('drink');return;}
  if(this.pose==='sit')this.stand();this.cafeMenuClosed=false;
  if(this.nearCafe){this.onChange();return;}
  const target=cafeApproach(this.position.z),path=findPath(this.zone,this.position,target);if(!path){this.onToast('카페로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();this.route=path;this.marker.position.set(target.x,.035,target.z);this.marker.visible=path.length>0;this.onToast('카페로 가는 중이에요. 도착하면 고를 수 있어요.');this.onChange();
 }
 closeCafeMenu(){this.cafeMenuClosed=true;this.onChange();}
 visitCafe(item:'coffee'|'macaron'='coffee'){
  if(this.zone!=='lobby'||!this.entered)return;if(this.pose==='sit')this.stand();
  this.cafeMenuClosed=true;
  if(item==='coffee'?this.coffee:this.macaron){this.gestureAction(item==='coffee'?'drink':'eat');return;}
  const target=cafeApproach(this.position.z),path=this.nearCafe?[]:findPath(this.zone,this.position,target);if(!path){this.onToast('카페로 가는 길을 찾지 못했어요.');return;}
  this.cancelSeat();this.visitingCafe=true;this.cafeItem=item;this.coffeeAskAt=0;this.route=path;this.marker.position.set(target.x,.035,target.z);this.marker.visible=path.length>0;this.onToast(path.length?`카운터로 이동 중이에요. 도착하면 ${item==='coffee'?'커피':'마카롱'}을 받아요.`:`${item==='coffee'?'커피':'마카롱'}을 받는 중이에요…`);this.updateCoffee(performance.now());
 }
 private updateCoffee(now:number){
  if(this.visitingCafe&&this.zone==='lobby'&&atCafe({zone:this.zone,...this.position})&&now-this.coffeeAskAt>1000){this.coffeeAskAt=now;this.sendPosition(now,true);this.net.send({type:this.cafeItem});}
  if(this.visitingCafe&&(this.cafeItem==='coffee'?this.coffee:this.macaron)){this.visitingCafe=false;this.onToast(this.cafeItem==='coffee'?'커피를 받았어요. 오른손으로 3번 마실 수 있어요.':'마카롱을 받았어요. 왼손으로 2번 먹을 수 있어요.');this.onChange();}
 }
 /** Dinner: the dish this visitor ordered at their table, the menu, and the plates drawn on the tables. */
 get dish(){return this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.dish;}
 get atDinnerTable(){return this.zone==='auditorium'&&this.pose==='sit'&&SEATS.find(s=>s.id===this.self?.seatId)?.level==='parterre';}
 dishMenu=false;
 openDishMenu(){if(!this.atDinnerTable)return;this.dishMenu=true;this.onChange();}
 closeDishMenu(){this.dishMenu=false;this.onChange();}
 get drink(){return this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.drink;}
 orderDish(dish:Dish){if(!this.atDinnerTable||(isDrink(dish)?this.drink:this.dish))return;this.net.send({type:'dish',dish});this.dishMenu=false;this.onChange();}
 /** Throw away whatever food and drink is on the table. */
 clearDishes(){if(this.dish||this.drink)this.net.send({type:'clearDish'});}
 private dinnerDishes=new WeakMap<T.Scene,DinnerDishes>();
 private dishLayer(){if(this.zone!=='auditorium')return null;let layer=this.dinnerDishes.get(this.venue.scene);if(!layer){layer=new DinnerDishes(this.venue.scene);this.dinnerDishes.set(this.venue.scene,layer);}return layer;}
 private candleLayers=new WeakMap<T.Scene,CarriedCandles>();private candleAskAt=0;
 /** Walk to the candle table; arriving next to it picks up a lit candle. */
 visitCandleTable(table:CandleTable){if(this.zone!=='auditorium'||!this.entered)return;if(this.pose==='sit')this.stand();
  const path=findPath(this.zone,this.position,table.approach);if(!path)return;this.cancelSeat();this.route=path;this.marker.position.set(table.approach.x,.035,table.approach.z);this.marker.visible=true;}
 private updateCandles(now:number){
  // Passing the candle table picks up a lit candle (once a second at most, until the server confirms it).
  if(this.zone==='auditorium'&&this.entered&&!this.candle&&now-this.candleAskAt>1000&&CANDLE_TABLES.some(table=>Math.hypot(this.position.x-table.approach.x,this.position.z-table.approach.z)<1.1)&&Math.abs(this.position.y)<.5){this.candleAskAt=now;this.net.send({type:'candle',state:'on'});}
  if(this.zone!=='auditorium'){if(this.avatar)this.avatar.holdingCandle=false;for(const r of this.remotes.values())r.avatar.holdingCandle=false;return;}
  let layer=this.candleLayers.get(this.venue.scene);if(!layer){layer=new CarriedCandles(this.venue.scene);this.candleLayers.set(this.venue.scene,layer);}
  const carriers:{hand:T.Object3D;lit:boolean;own?:boolean}[]=[],mine=this.candle;
  if(this.avatar){this.avatar.holdingCandle=mine==='on'&&this.entered;if(this.avatar.holdingCandle)carriers.push({hand:this.avatar.leftHand,lit:mine==='on',own:true});}
  for(const r of this.remotes.values()){const c=r.visitor.zone===this.zone?r.visitor.candle:undefined;r.avatar.holdingCandle=c==='on';if(c==='on')carriers.push({hand:r.avatar.leftHand,lit:true});}
  layer.update(carriers,this.reduced?0:now/1000);
 }
 gestureAction(gesture:Gesture){const me=this.net.state?.visitors.find(v=>v.id===this.net.selfId);if((gesture==='eat'||gesture==='drink')&&(this.gesture==='eat'||this.gesture==='drink')&&this.net.now()-this.gestureAt<3200)return;
  if(gesture==='drink'){if(this.zone==='auditorium'?!me?.drink||(me.drinkSips??0)>=DISH_BITES||me.drinkEmptyAt:!me?.coffee||(me.coffeeSips??0)>=3)return;}
  if(gesture==='eat'&&(me?.dish?(me.dishBites??0)>=DISH_BITES||me.dishEmptyAt:!me?.macaron||me.macaronEmptyAt||(me.macaronBites??0)>=2))return;
  this.lobbyEnteredAt=performance.now();this.gesture=gesture;this.gestureAt=this.net.now();this.gestureCameraTurn=null;this.net.send({type:'gesture',gesture});if(CLAPS.includes(gesture))this.audio.clap();}
 private click(x:number,y:number){if(!this.entered||this.photoMode)return;const rect=this.renderer.domElement.getBoundingClientRect();this.ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  const hits=this.ray.intersectObjects([...(this.zone==='auditorium'?this.encoreTrain?.targets??[]:[]),...(this.venue.usher?.targets??[]),...(this.dishLayer()?.targets??[]),...(this.venue.cat?.targets??[]),...(this.venue.stairArrows?.targets??[]),...this.venue.seatTargets,this.venue.portal,...this.venue.walkTargets],true);if(!hits.length)return;const hit=hits[0];
  if(hit.object.userData.trainSeat!==undefined){if(this.ridingTrain)this.net.send({type:'trainBoard',seat:hit.object.userData.trainSeat});return;}
  if(this.ridingTrain)return;
  const boardingText=hit.object.userData.trainBoardSign&&hit.uv&&hit.uv.x>=.27&&hit.uv.x<=.73&&hit.uv.y>=.3&&hit.uv.y<=.7;
  if(hit.object.userData.trainBoardArrow||boardingText){
   this.boardTrain(hit.object.userData.trainBoardArrow===true);return;
  }
  if(hit.object.userData.galleryEntrance){this.goToHallPoint('upper');return;}
  if(hit.object.userData.ownDish){this.gestureAction(hit.object.userData.ownDish);return;}
  if(hit.object.userData.usher){this.venue.usher?.greet(performance.now()/1000,USHER_LINES.ask);return;}
  if(hit.object.userData.lobbyCat){this.visitCat();return;}
  if(hit.object.userData.loungeSeatId){this.sitInLobby(hit.object.userData.loungeSeatId);return;}
  if(hit.object.userData.cloakroom){this.visitWardrobe();return;}
  if(hit.object.userData.macaron||hit.object.userData.cafe){this.openCafeMenu();return;}
  if(hit.object.userData.candleTable){this.visitCandleTable(hit.object.userData.candleTable as CandleTable);return;}
  if(hit.object.userData.boxOffice){this.visitBoxOffice();return;}
  if(hit.object.userData.lobbyExit){this.changeZone();return;}let obj:T.Object3D|null=hit.object,seatId:string|undefined;while(obj){seatId=seatId??obj.userData.seatId;if(obj.userData.portal){if(this.zone==='lobby')this.walkToEntrance();else void this.changeZone();return;}obj=obj.parent;}
  if(seatId){void this.chooseSeat(seatId);return;}
  if(this.pose==='sit'){this.stand();return;}
  const point={x:hit.point.x,y:surfaceHeight(this.zone,hit.point,hit.point.y)??hit.point.y,z:hit.point.z};
  // A tap on the stage lip, whose ray reaches the floor under the stage, walks to the front of the stage instead.
  if(this.zone==='auditorium'&&Math.abs(point.y??0)<.4&&point.z<STAGE_APRON_Z&&point.z>STAGE_APRON_Z-3)point.z=STAGE_APRON_Z+.3;
  // A tap beside a chair or table lands on furniture clearance: walk to the nearest free spot instead.
  if(!walkable(this.zone,point))for(let r=.15;r<=1.5&&!walkable(this.zone,point);r+=.15)for(let k=0;k<16;k++){const a=k/16*Math.PI*2,p={x:hit.point.x+Math.cos(a)*r,y:point.y,z:hit.point.z+Math.sin(a)*r};if(walkable(this.zone,p)){point.x=p.x;point.z=p.z;break;}}
  const path=findPath(this.zone,{x:this.position.x,y:this.position.y,z:this.position.z},point);if(!path){this.onToast('통로나 빈 바닥을 선택해 주세요.');return;}this.cancelSeat();this.route=path;this.marker.position.set(point.x,(point.y??0)+.035,point.z);this.marker.visible=true;
 }
 /** Visitors can pass through each other; the lobby cat still has its own clearance. */
 private visitorStepClear(target:Point){
  const cat=this.zone==='lobby'?this.venue.cat:null;
  if(cat&&visitorBlocksStep(this.position,target,cat.root.position,CAT_VISITOR_GAP))return false;
  return true;
 }
 private advanceRoute(target:Point){
  const h=surfaceHeight(this.zone,target,this.position.y);if(h!==null)target={...target,y:h};
  if(this.visitorStepClear(target)){this.position.set(target.x,target.y??0,target.z);return;}
  // Wait for the occupied route to clear; steering sideways can leave a stair flight.
 }
 correctMove(point:{x:number;y:number;z:number}){if(this.pose==='sit')return;this.position.set(point.x,point.y,point.z);this.pose='idle';this.route=[];this.marker.visible=false;this.collisionPauseUntil=performance.now()+350;this.sentAt=performance.now();}
 private sendPosition(now:number,force=false){if(this.ridingTrain||!this.entered||!this.self||this.pose==='sit')return;if(force||now-this.sentAt>(this.pose==='walk'?100:300)||this.lastPose!==this.pose){this.sentAt=now;this.lastPose=this.pose;this.net.send({type:'move',x:this.position.x,y:this.position.y,z:this.position.z,yaw:this.yaw,pose:this.pose});}}
 startConducting(){if(this.zone!=='auditorium'||!this.ready||this.entranceViewLocked)return;this.conductView=this.concertView;this.concertView=true;this.route=[];this.pendingSeat=null;this.introUntil=0;this.input.keys.clear();this.conducting.start(performance.now());this.venue.scene.userData.conducting=true;
  if(this.self){this.demoAvatar=new Avatar(visitorColor(this.self),undefined,visitorVariant(this.self),this.self.outfit);this.demoAvatar.instrumentType='conductor';buildInstrument('conductor',this.demoAvatar.instrument,this.demoAvatar.leftHand,this.demoAvatar.rightHand);this.demoAvatar.root.position.set(CONDUCTOR.x,STAGE_FLOOR+.25,CONDUCTOR.z);this.demoAvatar.root.scale.setScalar(1.1);this.demoAvatar.settlePose(false);this.venue.scene.add(this.demoAvatar.root);}
  this.conductSeat=this.pose==='sit';this.guestConductor=new Avatar(0x272b2b,'conductor');this.guestConductor.instrumentType=undefined;this.guestConductor.root.position.copy(this.position);this.guestConductor.root.rotation.y=this.yaw;this.guestConductor.settlePose(this.conductSeat);this.venue.scene.add(this.guestConductor.root);
  this.conductEffect??=new ConductTapEffect(this.venue.scene);this.snapCamera();this.onChange();}
 endConducting(){this.conducting.stop();this.venue.scene.userData.conducting=false;this.demoAvatar?.root.removeFromParent();this.demoAvatar=null;this.guestConductor?.root.removeFromParent();this.guestConductor=null;this.conductEffect?.hide();this.concertView=this.conductView;this.input.keys.clear();this.snapCamera();this.onChange();}
 private snapCamera(){const f=this.cameraFrame();this.look.copy(f.look);this.camera.position.copy(f.position);this.camera.lookAt(this.look);}
 private entranceCameraFrame(point:Point,walls:T.Object3D[],yaw=0,pitch=ENTRANCE_PITCH){
  // Spring arm: orbit the character's chest, shorten only when geometry intervenes.
  const frame=localCameraFrame({x:point.x,y:point.y??0,z:point.z},false,yaw,pitch,ENTRANCE_DISTANCE);
  const ceiling=GOLDEN_HALL.balconyHeight-.45;
  if(frame.position.y>ceiling){const t=(ceiling-frame.origin.y)/(frame.position.y-frame.origin.y);frame.position.lerpVectors(frame.origin,frame.position,Math.max(0,t));}
  const bounds=BOUNDS.auditorium;
  const delta=frame.position.clone().sub(frame.origin);let length=1;
  for(const [axis,min,max]of [['x',bounds.minX+.25,bounds.maxX-.25],['z',bounds.minZ+.25,GOLDEN_HALL.rear-.5]] as const){
   if(delta[axis]>0)length=Math.min(length,(max-frame.origin[axis])/delta[axis]);
   if(delta[axis]<0)length=Math.min(length,(min-frame.origin[axis])/delta[axis]);
  }
  frame.position.copy(frame.origin).addScaledVector(delta,Math.max(0,length));
  return {position:constrainCamera(frame.origin,frame.position,walls),look:frame.origin};
 }
 private updateStageCamera(now:number,dt:number){
  const viewing=this.entered&&this.zone==='auditorium'&&this.concertView&&!this.hallOverview&&this.stageLowView;
  if(!viewing||this.photoMode||this.reduced||this.conducting.active||this.entranceViewLocked){
   this.stageInputAt=now;
   this.stageCameraBlend=0;
   this.stageCameraTime=0;
   return;
  }
  if(this.input.pointerHeld||this.input.keys.size||this.input.touchMove.x||this.input.touchMove.z||this.route.length||this.uiObscured||this.changingZone){
   this.stageInputAt=now;
  }
  const idle=now-this.stageInputAt>=STAGE_IDLE_DELAY;
  this.stageCameraBlend=T.MathUtils.damp(this.stageCameraBlend,idle?1:0,idle?1.6:9,dt);
  if(idle)this.stageCameraTime=(this.stageCameraTime+dt)%STAGE_SWAY_PERIOD;
  else if(this.stageCameraBlend<.001)this.stageCameraTime=0;
 }
 private cameraFrame(){
  if(this.photoMode){
   if(this.photoComposition==='current'){
    const position=this.photoOriginal.position.clone();
    const direction=this.photoOriginal.look.clone().sub(position).applyAxisAngle(new T.Vector3(0,1,0),this.photoYaw);
    const right=new T.Vector3().crossVectors(direction,new T.Vector3(0,1,0)).normalize();
    direction.applyAxisAngle(right,this.photoPitch);
    return {position,look:position.clone().add(direction)};
   }
   const origin=this.photoAnchor.clone().add(new T.Vector3(0,1.3,0));
   const eye=this.photoAnchor.clone().add(new T.Vector3(Math.sin(this.photoYaw)*this.photoDistance,this.photoHeight,Math.cos(this.photoYaw)*this.photoDistance));
   const position=constrainCamera(origin,eye,this.venue.cameraWalls);
   const face=this.photoAnchor.clone().add(new T.Vector3(0,1.318+(this.pose==='sit'?.1:0),0));
   const direction=face.sub(position);
   const horizontal=Math.max(.1,Math.hypot(direction.x,direction.z));
   // Reference: centered visitor below the stage, head around 73.5% of the image.
   const pitch=Math.atan2(direction.y,horizontal)+Math.atan(Math.tan(T.MathUtils.degToRad(this.camera.fov)*.5)*.47)+this.photoPitch;
   direction.y=0;direction.normalize().multiplyScalar(Math.cos(pitch));direction.y=Math.sin(pitch);
   return {position,look:position.clone().addScaledVector(direction,20)};
  }
  if(this.ridingTrain){
   const heading=this.yaw-Math.PI;
   const forward=new T.Vector3(Math.sin(heading),0,Math.cos(heading));
   const inward=new T.Vector3(-Math.cos(heading),0,Math.sin(heading));
   const origin=this.position.clone().add(new T.Vector3(0,1.55,0));
   const sin=Math.sin(this.cameraYaw),cos=Math.cos(this.cameraYaw);
   const along=-.8*cos+.6*sin;
   const across=.8*sin+.6*cos;
   const front=T.MathUtils.smoothstep(along,.15,.72);
   const portrait=this.camera.aspect<.8;
   const dist=T.MathUtils.clamp(this.cameraDistance*(portrait?1+.4*front:1),2.2,6.8);
   // In the front view, keep the camera on the auditorium side of the carriage.
   const audienceSide=T.MathUtils.lerp(across,Math.max(.42,across),front);
   const desired=origin.clone().addScaledVector(forward,dist*along).addScaledVector(inward,dist*audienceSide);
   desired.y+=.7-.28*front+Math.sin(T.MathUtils.clamp(this.cameraPitch,-.35,.65))*dist;
   // Keep the whole camera inside the hall, including drags towards exterior walls.
   desired.x=T.MathUtils.clamp(desired.x,-15.15,15.15);
   desired.z=T.MathUtils.clamp(desired.z,GOLDEN_HALL.front+1,GOLDEN_HALL.rear-1);
   const position=constrainCamera(origin,desired,this.venue.cameraWalls,.3);
   const look=origin.clone().addScaledVector(forward,3.5*cos+2.4*sin).addScaledVector(inward,2.4*cos-3.5*sin);
   const frontLook=origin.clone().addScaledVector(forward,-.65).addScaledVector(inward,1.5);
   frontLook.y-=portrait?1.18:.44;
   look.lerp(frontLook,front);
   if(portrait){
    // Keep the PC trailing view and forward scenery, but fit the rider within
    // the narrower horizontal field of view of a portrait screen.
    const view=look.clone().sub(position);
    const toRider=origin.clone().sub(position);
    const riderYaw=Math.atan2(toRider.x,toRider.z);
    const viewYaw=Math.atan2(view.x,view.z);
    const delta=T.MathUtils.euclideanModulo(viewYaw-riderYaw+Math.PI,Math.PI*2)-Math.PI;
    const halfHorizontalFov=Math.atan(Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect);
    const yawLimit=halfHorizontalFov*(.4+.1*front);
    const framedYaw=riderYaw+T.MathUtils.clamp(delta,-yawLimit,yawLimit);
    const reach=Math.hypot(view.x,view.z);
    look.set(position.x+Math.sin(framedYaw)*reach,look.y,position.z+Math.cos(framedYaw)*reach);
   }
   return {look,position};
  }
  if(this.conducting.active){const look=new T.Vector3(CONDUCTOR.x,STAGE_FLOOR+1.3,CONDUCTOR.z),rear=new T.Vector3(Math.sin(this.conducting.angle+(this.reduced?0:this.conducting.pan))*(CONDUCTOR.z-STAGE.back-1),STAGE_FLOOR+5.2+this.conducting.height,CONDUCTOR.z-Math.cos(this.conducting.angle+(this.reduced?0:this.conducting.pan))*(CONDUCTOR.z-STAGE.back-1));return {position:look.clone().lerp(rear,this.conducting.zoom),look};}
  const sitting=this.cameraSeatAmount,baseY=1.05+.10*sitting+this.position.y,look=new T.Vector3(this.position.x,baseY,this.position.z-1.5),d=this.cameraDistance;
  if(!this.entered){const t=this.reduced?0:performance.now()/1000;return {look:new T.Vector3(Math.sin(t*.1)*.1,8.2,35.8),position:new T.Vector3(Math.sin(t*.12)*.32,7.5+Math.sin(t*.09)*.09,20.8+Math.cos(t*.1)*.14)};}
  if(this.entranceViewLocked)return this.entranceCameraFrame(this.position,this.venue.cameraWalls,this.cameraYaw,this.cameraPitch);
  if(this.zone==='auditorium'&&this.concertView){
   const preset=this.hallOverview?HALL_CAMERA:this.stageLowView?{eye:[0,1.6,-2] as const,look:[0,5.2,-23] as const}:CONCERT_CAMERA,center=new T.Vector3(...preset.look),offset=new T.Vector3(...preset.eye).sub(center);
   // The hall view zooms from the rear all the way up to the front rows.
   offset.multiplyScalar(this.hallZoom*Math.min(this.camera.aspect<.8?2.2:1.3,Math.max(1,1.65/this.camera.aspect)));
   const position=center.clone().add(offset);
   const lowStage=!this.hallOverview&&this.stageLowView;
   if(lowStage){
    position.y=1.6;
    // Match the gentle sideways motion of the conducting camera.
    const sway=Math.sin(this.stageCameraTime/5)*.045*this.stageCameraBlend;
    position.x+=sway*Math.min(offset.z,26);
   }
   position.x=T.MathUtils.clamp(position.x,-13.8,13.8);position.y=T.MathUtils.clamp(position.y,1.2,GOLDEN_HALL.height-1.2);position.z=Math.min(position.z,GOLDEN_HALL.rear-2);
   // Turn the head where the camera stands: sideways about the vertical, then up or down.
   const view=center.clone().sub(position).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw),right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();
   view.applyAxisAngle(right,-(this.cameraPitch-.13));
   return {look:position.clone().add(view),position};
  }
  const framingAngle=Math.atan(Math.tan(T.MathUtils.degToRad(this.camera.fov/2))/3);
  if(this.firstPerson){
   // Match the avatar's eye height without inheriting the walk cycle's head bob.
   const position=new T.Vector3(this.position.x,this.position.y+1.303+.10*sitting,this.position.z);
   const pitch=T.MathUtils.clamp(this.cameraPitch-framingAngle,-1.5,1.5),forward=Math.cos(pitch);
   look.copy(position).add(new T.Vector3(-Math.sin(this.cameraYaw)*forward,-Math.sin(pitch),-Math.cos(this.cameraYaw)*forward));
   return {position,look};
  }
  const dinnerSeat=this.zone==='auditorium'&&this.pose==='sit'&&this.self?.seatId?DINNER_SEATS_BY_ID.get(this.self.seatId):undefined;
  const local=dinnerSeat
   ? dinnerCameraFrame(this.position,dinnerSeat,DINNER_TABLES[dinnerSeat.row-1],this.cameraYaw,this.cameraPitch,d,this.camera.aspect,this.camera.fov)
   : localCameraFrame(this.position,sitting,this.cameraYaw,this.cameraPitch,d);
  const target=local.position;look.copy(local.look);
  // In the hall the camera never slips through a stair door into the corridor: it just comes closer along its orbit.
  if(this.zone==='auditorium'&&target.z>GOLDEN_HALL.rear-.5&&target.z>local.origin.z){const t=Math.max(0,(GOLDEN_HALL.rear-.5-local.origin.z)/(target.z-local.origin.z));target.lerpVectors(local.origin,target,t);}
  // Stay under the ceiling, so zooming out never leaves the building.
  target.y=Math.min(target.y,this.zone==='lobby'?ATRIUM.height-1:GOLDEN_HALL.height-1.5);
  // Keep the viewing camera inside the room even during a rapid orbit near an outer wall.
  const bounds=BOUNDS[this.zone];target.x=T.MathUtils.clamp(target.x,bounds.minX+.15,bounds.maxX-.15);target.z=T.MathUtils.clamp(target.z,bounds.minZ+.15,bounds.maxZ-.15);
  return {look,position:constrainCamera(local.origin,target,this.venue.cameraWalls)};
 }
 /** Reaction icons float above every visible visitor's head, with a short pop when they appear. */
 private showEmotes(){
  for(const v of Object.values(this.venues))v.emotes.clear();
  if(this.photoMode)return;
  const layer=this.venue.emotes,now=this.net.now(),perPixel=this.renderer.getPixelRatio()/(layer.material.uniforms.scale.value as number);let slot=0;
  // Every icon sits just above the name tag: the tag is a 24 px pill above the anchor, so the icon is lifted by that
  // many pixels (whatever the distance) plus half its own height.
  const put=(anchor:T.Vector3,icon:Icon|null,alpha:number,age:number,tagPx:number)=>{
   if(!icon||alpha<=0||slot>=layer.capacity)return;
   const d=Math.max(.5,anchor.distanceTo(this.camera.position)),pop=1+.3*Math.max(0,Math.sin(Math.min(age,.35)/.35*Math.PI));
   anchor.y+=tagPx*d*perPixel+ICON_SIZE*T.MathUtils.clamp(d/8,1,MAX_GROWTH)/2+Math.sin(age*3)*.03;layer.set(slot++,anchor,icon,alpha*pop);
  };
  const me=this.avatar;
  if(this.entered&&me?.root.visible&&me.icon){me.head.getWorldPosition(this.headTop);this.headTop.y+=.48*me.root.scale.y;put(this.headTop,me.icon,me.iconAlpha,(now-this.gestureAt)/1000,26);}
  // Other visitors are ghosts: same anchor as their name tag (see VisitorNames).
  for(const r of this.remotes.values()){const v=r.visitor;if(!r.avatar.root.visible||!v.gesture)continue;const age=(now-v.gestureAt)/1000;
   put(ghostTop(r.avatar.root,v.pose==='sit',this.headTop),GESTURE_ICON[v.gesture],gestureWeight(v.gesture,age),age,26);}
  // The hall's own ghosts have no name: the icon floats right above the head.
  for(const g of this.flyingGhosts())if(g.gesture)put(this.headTop.set(g.x,g.y+1.78,g.z),GESTURE_ICON[g.gesture],gestureWeight(g.gesture,g.age??0),g.age??0,0);
  for(const v of Object.values(this.venues))v.emotes.commit();
 }
 /** Frames per second to draw now. While the hall is being built (or pre-built in the lobby, or the connection is opening),
  * fewer frames leave the phone's CPU for that work; otherwise the chosen quality decides (sharp: 60). */
 private frameBudget(){
  if(this.diagnosticActive)return PROBE_PROFILE.fps;
  if(this.mobile)return frameRate(true,this.quality);
  if(!this.entered&&this.ready)return 15;
  const chosen=frameRate(this.mobile,this.quality);
  if(this.hallLoading||this.changingZone)return Math.min(chosen,15);
  if(this.zone==='lobby'&&!this.hallWarmed||this.net.status!=='connected')return Math.min(chosen,30);
  return chosen;
 }
 private animate=()=>{
  this.frame=requestAnimationFrame(this.animate);const now=performance.now();if(document.hidden){this.last=now;this.renderedAt=0;return;}const rate=this.frameBudget(),interval=1000/rate;if(now-this.renderedAt<interval)return;this.renderedAt=interval?now-((now-this.renderedAt)%interval):now;const elapsed=(now-this.last)/1000,dt=Math.min(.1,elapsed);this.last=now;this.frames++;this.statsTime+=elapsed;if(this.statsTime>.7){this.fps=Math.round(this.frames/this.statsTime);this.frames=0;this.statsTime=0;}
  const workStart=this.diagnosticActive?performance.now():0;
  if(this.diagnosticActive&&this.diagnosticMode==='audio-only'){this.frameCost={at:now,cpu:0,submit:0};if(now-this.lastUI>500){this.lastUI=now;this.onChange();}return;}
  const timings:FrameTimings|undefined=this.onDiagnosticFrame
   ? {musicianAnimation:0,musicianBatch:0,crowdBatch:0,sceneRender:0,postProcessing:0}
   : undefined;
  this.encoreTrain?.update(this.net.now()/1000,this.zone==='auditorium',this.reduced);
  if(this.photoMode||this.ridingTrain){this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.route=[];}
  let speed=0;const keys=this.input.keys;let kx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+this.input.touchMove.x;let kz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+this.input.touchMove.z;
  if(this.entered&&this.net.status==='connected'){
   // Automatically enter only after 30 seconds without activity.
   if(this.zone!=='lobby')this.lobbyEnteredAt=0;
   else if(kx||kz||this.route.length||this.uiObscured||this.photoMode||document.hidden)this.lobbyEnteredAt=now;
   else if(!this.lobbyEnteredAt)this.lobbyEnteredAt=now;
   else if(now-this.lobbyEnteredAt>=30000&&!this.changingZone&&!this.uiObscured&&!document.hidden){this.lobbyEnteredAt=now;void this.changeZone();}
   if(now<this.collisionPauseUntil)kx=kz=0;
   if((kx||kz)&&this.pose==='sit')this.stand();
   const previous=this.position.clone();
   if(kx||kz){this.route=[];this.cancelSeat();const v=new T.Vector3(kx,0,kz).clampLength(0,1).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw).multiplyScalar(4.2*dt),candidate=this.position.clone().add(v);
    const move=(x:number,z:number)=>{const y=surfaceHeight(this.zone,{x,z},this.position.y);if(y===null)return false;const target={x,y,z};if(!segmentClear(this.zone,this.position,target)||!this.visitorStepClear(target))return false;this.position.set(x,y,z);return true;};
    // Slide along architecture while preserving the cat’s clearance.
    const candidateY=surfaceHeight(this.zone,candidate,this.position.y);
    if((candidateY===null||this.visitorStepClear({x:candidate.x,y:candidateY,z:candidate.z}))&&!move(candidate.x,candidate.z)){if(!move(candidate.x,this.position.z))move(this.position.x,candidate.z);}
   }else if(this.route.length&&this.pose!=='sit'){
    const p=this.route[0],d=distance(this.position,p);
    if(d<.035){if(this.visitorStepClear(p)){this.position.set(p.x,p.y??0,p.z);this.route.shift();}}else{const step=Math.min(d,5.1*dt);this.advanceRoute({x:this.position.x+(p.x-this.position.x)/d*step,z:this.position.z+(p.z-this.position.z)/d*step,y:this.position.y+((p.y??0)-this.position.y)/d*step});
     // Follow the currently connected lobby floor, flight or balcony.
     {const h=surfaceHeight(this.zone,this.position,this.position.y);if(h!==null)this.position.y=h;}}
    if(!this.route.length){
     this.marker.visible=false;this.pose='idle';
     if(this.route===this.boardingRoute){this.boardingRoute=null;this.boardTrain();}
     else if(this.reservedSeat&&!this.seating){this.seating=true;this.sendPosition(now,true);this.net.send({type:'seated',seatId:this.reservedSeat});}
    }
   }
   if(this.visitingCat&&!this.route.length&&this.venue.cat&&distance(this.position,this.venue.cat.approach)<.15){
    this.visitingCat=false;this.petUntil=now+2600;this.venue.cat.pet(now/1000);this.audio.meow();this.pose='idle';this.onToast('고양이가 눈을 감고 기분 좋게 꼬리를 흔들어요.');this.sentAt=0;
   }
   if(this.loungeTarget&&!this.route.length){const seat=LOUNGE_SEATS.find(s=>s.id===this.loungeTarget);this.loungeTarget=null;if(seat&&distance(this.position,seat.approach)<.12){this.pose='idle';this.sendPosition(now,true);this.net.send({type:'loungeSit',seatId:seat.id});}}
   if(this.visitingBoxOffice&&this.zone==='lobby'&&distance(this.position,BOX_OFFICE_APPROACH)<.12){this.visitingBoxOffice=false;this.route=[];this.marker.visible=false;this.pose='idle';this.onSeatMap();}
   speed=previous.distanceTo(this.position)/Math.max(dt,.001);if(this.pose!=='sit'){this.pose=speed>.015?'walk':'idle';if(speed>.015)this.yaw=Math.atan2(-(this.position.x-previous.x),-(this.position.z-previous.z));}
   const wardrobeDistance=this.zone==='lobby'&&Math.abs(this.position.y)<.3?Math.hypot(this.position.x-CLOAKROOM_APPROACH.x,this.position.z-CLOAKROOM_APPROACH.z):Infinity;
   if(wardrobeDistance>1.8)this.wardrobeNear=false;
   if(!this.uiObscured&&wardrobeDistance<(this.visitingWardrobe ? .2 : .9)&&!this.wardrobeNear){this.openWardrobe();speed=0;}
   if(now<this.petUntil&&this.venue.cat){this.venue.cat.petPoint(this.petFocus);this.yaw=Math.atan2(this.position.x-this.petFocus.x,this.position.z-this.petFocus.z);this.pose='idle';speed=0;}
   if(this.reservedSeat&&this.pose!=='sit'&&now-this.renewAt>5000){this.net.send({type:'renew',seatId:this.reservedSeat});this.renewAt=now;}
   this.sendPosition(now);
   // Walking through the amphitheatre door at the head of the flight enters the hall.
   if(this.zone==='lobby'&&Math.abs(this.position.y-GRAND_STAIR.rise)<.3&&this.position.z>=HALL_INNER_DOOR.approachZ-.02&&this.position.z<HALL_INNER_DOOR.z&&Math.abs(this.position.x)<HALL_INNER_DOOR.halfWidth)void this.changeZone(true);
  }
  if(this.pose==='sit'&&this.seatedTarget)this.position.lerp(this.seatedTarget,1-Math.exp(-dt*7));
  const music=this.audio.playback.playing&&!this.reduced;
  // Dust and shimmer hold still for visitors who prefer reduced motion.
  this.venue.treeStar?.update(this.reduced?0:now/1000);this.venue.sunlight?.update(this.reduced?0:now/1000);this.venue.stairArrows?.update(this.reduced?0:now/1000);
  this.venue.usher?.update(now/1000,dt,this.reduced);
  this.venue.cat?.update(now/1000,this.entered?this.position:new T.Vector3(Infinity,0,0),this.reduced,[...this.remotes.values()].filter(r=>r.visitor.zone===this.zone).flatMap(r=>[r.visitor,r.avatar.root.position]));
  if(this.ridingTrain&&this.encoreTrain){this.seatedTarget=null;this.yaw=this.encoreTrain.seat(this.self!.trainSeat!,this.position);}
  if(this.avatar){
   const clock=this.net.now(),gestureAge=(clock-this.gestureAt)/1000;
   const sip=this.zone==='auditorium'&&this.gesture==='drink'&&gestureAge<gestureSeconds('drink');
   const seated=this.pose==='sit';
   this.avatar.holdingCoffee=this.zone==='lobby'&&this.coffee||sip&&this.drink==='coffee';
   this.avatar.holdingWine=sip&&this.drink==='wine';
   this.avatar.holdingMacaron=this.zone==='lobby'&&this.macaron;
   this.avatar.macaronBites=this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.macaronBites??0;
   this.avatar.root.position.copy(this.position);
   const dx=this.position.x-this.camera.position.x,dz=this.position.z-this.camera.position.z;
   const cameraYaw=Math.atan2(dx,dz);
   this.avatar.root.rotation.y=this.photoMode?(this.photoComposition==='current'?this.photoOriginal.avatarYaw:cameraYaw):this.yaw;
   let cameraFacing;
   const gesture=this.gesture;
   if(!this.photoMode&&!this.firstPerson&&(gesture==='ovation'||gesture==='shh')&&gestureAge<gestureSeconds(gesture)&&dx*dx+dz*dz>.04){
    const wrap=(angle:number)=>T.MathUtils.euclideanModulo(angle+Math.PI,Math.PI*2)-Math.PI;
    const target=wrap(cameraYaw-this.yaw);
    const previous=this.gestureCameraTurn??target;
    // Follow the camera without changing turn direction at the ±180° boundary.
    const nearest=previous+wrap(target-previous);
    const turn=T.MathUtils.damp(previous,Math.abs(nearest)<=Math.PI+.3?nearest:target,14,dt);
    this.gestureCameraTurn=turn;
    const eyeHeight=this.position.y+1.318+(seated?.1:0);
    const pitch=T.MathUtils.clamp(Math.atan2(eyeHeight-this.camera.position.y,Math.hypot(dx,dz)),-.5,.4);
    cameraFacing={turn,pitch};
    if(!seated)this.avatar.root.rotation.y+=turn*gestureTurnWeight(gesture,gestureAge);
   }else this.gestureCameraTurn=null;
   this.avatar.update(clock/1000,speed,seated,music,gesture,gestureAge,dt,cameraFacing);
   this.avatar.root.visible=this.entered;
   if(now<this.petUntil&&this.venue.cat)this.avatar.pet(this.venue.cat.petPoint(this.petFocus),now/1000,this.reduced);
  }
  this.camera.updateMatrixWorld();this.poseFrustum.setFromProjectionMatrix(this.poseProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  for(const r of this.remotes.values()){
   const v=r.visitor;if(v.trainSeat!==undefined&&v.zone==='auditorium'&&this.encoreTrain){r.avatar.root.visible=this.zone==='auditorium';r.avatar.root.rotation.y=this.encoreTrain.seat(v.trainSeat,r.avatar.root.position);continue;}r.avatar.holdingCoffee=v.zone==='lobby'&&v.coffee===true;r.avatar.holdingMacaron=v.zone==='lobby'&&v.macaron===true;r.avatar.macaronBites=v.macaronBites??0;r.avatar.root.visible=v.zone===this.zone;if(!r.avatar.root.visible)continue;
   this.poseCenter.set(v.x,(v.y??0)+.8,v.z);const visible=this.poseFrustum.intersectsSphere(this.poseSphere.set(this.poseCenter,1.5));
   const distanceSq=this.camera.position.distanceToSquared(this.poseCenter),interval=!visible?250:distanceSq>400?100:1000/30;
   if(now-r.poseAt<interval)continue;const poseDt=Math.min(.25,(now-r.poseAt)/1000);r.poseAt=now;
   // Hidden visitors keep their collision position, but have no skeleton/gesture work to render.
   if(!visible){r.avatar.root.position.set(v.x,v.y??0,v.z);continue;}
   this.poseCenter.y=v.y??0;r.avatar.root.position.lerp(this.poseCenter,1-Math.exp(-poseDt*12));
   const dy=T.MathUtils.euclideanModulo(v.yaw-r.avatar.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;r.avatar.root.rotation.y+=dy*(1-Math.exp(-poseDt*12));
  }
  this.showEmotes();
  {const layer=this.dishLayer();if(layer){const self=this.net.selfId;const now=this.net.now(),busy=(v:Visitor,g:Gesture)=>v.gesture===g&&now-v.gestureAt<gestureSeconds(g)*1000;layer.update((this.net.state?.visitors??[]).filter(v=>v.zone==='auditorium').map(v=>({id:v.id,seatId:v.seatId,dish:v.dish,dishBites:v.dishBites,drink:v.drink,drinkSips:v.drinkSips,own:v.id===self,eating:busy(v,'eat'),sipping:busy(v,'drink')})));
   if(this.avatar){const me=this.net.state?.visitors.find(v=>v.id===self);this.avatar.diningBite=me?.dish?BITE_COLOUR[me.dish]:null;}}}
  this.conducting.tick(now,dt);if(this.conducting.active){this.guestConductor?.update(now/1000,0,this.conductSeat,false,null,10,dt);this.input.keys.clear();const actor=this.demoAvatar,demo=this.conducting;if(actor){actor.update(now/1000,0,false,demo.playing&&!this.reduced,null,10,dt);actor.root.position.x=T.MathUtils.damp(actor.root.position.x,CONDUCTOR.x+conductorShift(demo.x),12,dt);actor.root.rotation.y=T.MathUtils.damp(actor.root.rotation.y,conductorTurn(demo.x),12,dt);actor.head.rotation.set(-.06,Math.atan(demo.x*.2),0);actor.leftArm.rotation.set(1.05+.38*Math.sin(now*.0026),0,-.38-.06*Math.abs(demo.x)+.43*Math.sin(now*.0024));actor.rightArm.rotation.copy(rightStroke(demo.x,demo.stroke));actor.root.updateMatrixWorld(true);this.conductEffect?.update(actor.rightHand,this.camera,demo.pulse);}}
  this.fireworks?.update(now/1000,this.zone==='auditorium'&&this.entered&&!this.reduced,this.quality==='low');
  this.musicLights?.update(now/1000,dt,this.zone==='auditorium'&&this.entered&&!this.reduced,this.audio);
  this.updateCandles(now);this.updateCoffee(now);
  const playback=this.audio.playback;if(now-this.orchestraAt>=1000/30){
   const animationStart=timings?performance.now():0;
   const animationDt=Math.min(.15,(now-this.orchestraAt)/1000);this.orchestraAt=now-((now-this.orchestraAt)%(1000/30));const show=stageShow(playback),clock=this.reduced?0:this.net.now()/1000;
   for(const actor of this.venue.musicians){
    this.poseCenter.copy(actor.root.position);this.poseCenter.y+=1;const inView=this.poseFrustum.intersectsSphere(this.poseSphere.set(this.poseCenter,2));
    const conductor=actor.instrumentType==='conductor',poseAt=actor.root.userData.poseAt??0,actorDt=Math.min(.25,Math.max(animationDt,(now-poseAt)/1000));
    // The conductor also travels across the stage; keep his route live when the camera looks away.
    if(!conductor&&!inView)continue;
    const actorInterval=musicianInterval(projectedHeight(1.4,this.camera.position.distanceTo(this.poseCenter),this.camera.projectionMatrix.elements[5]));
    // Keep readable players at 30Hz, including zoomed views; only tiny figures use 20Hz.
    if(!conductor&&now-poseAt<actorInterval)continue;actor.root.userData.poseAt=now;
    if(this.conducting.active){if(conductor)continue;const demo=this.conducting,moving=demo.playing;
     actor.update(demo.clock,0,musicianSits(actor.instrumentType),moving&&!this.reduced,null,10,actorDt);
     if(conductor){actor.root.position.set(CONDUCTOR.x,STAGE_FLOOR+.25,CONDUCTOR.z);actor.root.rotation.y=faceYaw(0,-1);actor.head.rotation.set(0,0,0);actor.leftArm.rotation.set(1.15+.25*Math.sin(now*.002),0,-.5+.12*Math.sin(now*.0015));actor.rightArm.rotation.copy(rightStroke(demo.x,demo.stroke));}
     else {const turn=faceYaw(CONDUCTOR.x-actor.root.position.x,CONDUCTOR.z-actor.root.position.z)-actor.root.rotation.y;actor.head.rotation.y=Math.atan2(Math.sin(turn),Math.cos(turn));actor.head.rotation.x=-.08;}
     continue;
    }
    if(actor.instrumentType==='conductor'){const c=show.conductor;actor.root.position.set(c.x,c.y,c.z);actor.root.rotation.y=c.yaw;actor.update(clock,c.walking?1.2:0,false,show.orchestraPlays&&!this.reduced,c.bowAge===null?null:'bow',c.bowAge??10,actorDt);continue;}
    if(actor.root.userData.concertmaster){actor.update(clock,0,!show.concertmasterStands,(show.concertmasterPlays||show.orchestraPlays)&&!this.reduced,null,10,actorDt);continue;}
    actor.update(clock,0,musicianSits(actor.instrumentType),show.orchestraPlays&&!this.reduced,null,10,actorDt);
   }
   const batchStart=timings?performance.now():0;
   this.venue.updateMusicians(this.camera);
   if(timings){
    timings.musicianAnimation=batchStart-animationStart;
    timings.musicianBatch=performance.now()-batchStart;
   }
  }
  if(this.introUntil&&now>this.introUntil){this.introUntil=0;if(this.zone==='auditorium'&&this.concertView&&this.pose!=='sit'){this.concertView=false;this.introEase=2.5;this.introGlide=true;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}}
  if(this.zone==='auditorium'&&this.pendingSeat&&this.seatWalkAt&&now>=this.seatWalkAt){const id=this.pendingSeat;this.pendingSeat=null;this.seatWalkAt=0;void this.chooseSeat(id,true);}
  // The walking camera stays locked to its orbit (no trailing glide); easing is kept only for big view changes.
  this.audio.setDoorDistance(this.entered&&this.zone==='lobby'?Math.hypot(this.position.x-HALL_INNER_DOOR.x,this.position.y-GRAND_STAIR.rise,this.position.z-HALL_INNER_DOOR.z):Infinity);
  this.updateBoard(now);
  if(this.entranceFraming&&!this.entranceViewLocked){this.entranceFraming=false;this.onChange();}
  const firstPerson=this.firstPerson;
  this.updateStageCamera(now,dt);
  this.cameraSeatAmount=T.MathUtils.damp(this.cameraSeatAmount,this.pose==='sit'?1:0,8,dt);const f=this.cameraFrame(),gap=this.camera.position.distanceTo(f.position),follow=!this.concertView&&this.introEase<=0&&gap<1.5;
  // Lock onto the orbit only once the glide has actually arrived, so the fly-in never ends in a jump.
  this.cameraLocked=follow&&(this.cameraLocked||gap<.03);if(this.cameraLocked||this.concertView)this.introGlide=false;const snap=(this.entered&&!this.concertView&&this.introEase<=0&&!this.introGlide)||firstPerson||now-this.dragAt<150||this.cameraLocked,smooth=snap?1:1-Math.exp(-dt*(this.introEase>0||this.introGlide?1.6:7));if(this.introEase>0)this.introEase=Math.max(0,this.introEase-dt);// Keep the destination inside the walls and glide to it; clamping the moving camera itself made the fly-in jump.
  const walled=this.entered&&!this.ridingTrain&&!this.photoMode&&!firstPerson&&!this.concertView&&this.position.z<=GOLDEN_HALL.rear,origin=walled?localCameraFrame(this.position,this.cameraSeatAmount,this.cameraYaw,this.cameraPitch,this.cameraDistance).origin:null;
  if(origin)f.position.copy(constrainCamera(origin,f.position,this.venue.cameraWalls));
  this.camera.position.lerp(f.position,smooth);if(origin&&this.cameraLocked){this.camera.position.copy(constrainCamera(origin,this.camera.position,this.venue.cameraWalls));}this.venue.scene.userData.cameraFocus=this.entered?(firstPerson?f.position:this.concertView?f.look:localCameraFrame(this.position,this.cameraSeatAmount,this.cameraYaw,this.cameraPitch,this.cameraDistance).origin):null;this.look.lerp(f.look,smooth);this.camera.lookAt(this.look);if(this.avatar&&this.entered&&(this.zone==='lobby'||!this.concertView)){const head=this.position.clone();head.y+=1.1;this.avatar.root.visible=!firstPerson&&this.camera.position.distanceTo(head)>.7;}if(now-this.lodAt>200){this.lodAt=now;this.venue.updateLOD(this.camera);}for(const object of this.venue.overviewHidden)object.visible=!this.concertView;if(this.conducting.active&&this.avatar)this.avatar.root.visible=false;if(this.photoMode&&this.avatar)this.avatar.root.visible=this.photoComposition==='current'?this.photoOriginal.avatarVisible:true;const submitStart=this.diagnosticActive?performance.now():0;if(!this.diagnosticActive||this.diagnosticMode==='normal'){
   this.venue.mirror?.setVisitor(this.avatar?.root??null,this.entered&&this.self?{x:this.position.x,y:this.position.y,z:this.position.z,yaw:this.yaw+Math.PI,id:this.self.id,sitting:this.pose==='sit',walking:this.pose==='walk',gesture:this.gesture,age:(this.net.now()-this.gestureAt)/1000}:null);
   const namedAvatar=this.demoAvatar??this.avatar;
   const self=this.entered&&this.self&&namedAvatar?{avatar:namedAvatar,visitor:this.self}:null;
   this.visitorNames.update(this.camera,self,this.remotes.values(),this.venue.scene.userData.solidOccluded,this.probeViewport);
   this.venues.auditorium?.usher?.updateSpeech(this.camera,this.renderer.domElement,this.entered&&this.zone==='auditorium'&&!this.uiObscured,now/1000);
   const crowdStart=timings?performance.now():0;
   this.crowds[this.zone].update(this.allGhosts(),this.camera);
   if(timings)timings.crowdBatch=performance.now()-crowdStart;
   characterFrontLight.value=this.venue===this.venues.lobby?FRONT_LIGHT.lobby:FRONT_LIGHT.auditorium;this.renderer.toneMappingExposure=this.venue===this.venues.lobby?LOBBY_EXPOSURE:1;this.diagnosticGpu?.begin(now);
   try{
    if(this.lightingPass)this.lightingPass.render(this.venue.scene,this.camera,timings);
    else{
     const renderStart=timings?performance.now():0;
     this.renderer.render(this.venue.scene,this.camera);
     if(timings)timings.sceneRender=performance.now()-renderStart;
    }
   }finally{this.diagnosticGpu?.end();}
   this.finishPhotoCapture();
   this.drawCount++;if(this.zone==='auditorium'&&this.hallWarmed)completeInitialLoading();
    if(this.usherGreetingPending&&this.entered){this.usherGreetingPending=false;this.venue.usher?.greet(performance.now()/1000);if(this.pendingSeat)this.seatWalkAt=performance.now()+4500;}
   if(!this.ready&&this.texturesLoaded){this.ready=true;performance.measure('aurea-first-scene',{start:0,end:performance.now()});document.body.classList.add('scene-ready');reportLoading(100,'공연장 연결을 준비하고 있어요');this.onChange();
   }
  }if(this.diagnosticActive){const end=performance.now();this.frameCost={at:now,cpu:end-workStart,submit:end-submitStart};}
  if(timings)this.onDiagnosticFrame?.(timings);
  if(now-this.lastUI>500){this.lastUI=now;this.onChange();}
 };
 destroy(){this.endPhotoMode();this.encoreTrain?.dispose();this.musicLights?.dispose();this.fireworks?.dispose();this.venues.auditorium?.mirror?.dispose();this.venues.auditorium?.usher?.dispose();this.conductEffect?.dispose();this.activityEvents.abort();this.disposed=true;clearTimeout(this.hallLoadingTimeout);this.releaseLoadingCallbacks();cancelAnimationFrame(this.frame);this.input.destroy();window.removeEventListener('resize',this.resize);for(const v of Object.values(this.venues))v.scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.lightingPass?.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.domElement.remove();this.visitorNames.dispose();}
}
