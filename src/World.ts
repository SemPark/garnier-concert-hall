import {activeHighFive,canHighFive,USHER_HIGH_FIVE_ID,withinHighFiveReach,type HighFivePosition,type HighFiveTarget} from '../shared/highFive';
import {highFivePose,type HighFivePose} from './character/highFivePose';
import {DanceCircles} from './scene/DanceCircles';
import {JAZZ_HALL} from '../shared/hallKind';
import {danceNpc,dancePose,duetCameraFacesFront,DANCE_JOIN_RADIUS,SOLO_DANCES,type DanceCommand} from '../shared/dance';
import {poseDancingAvatar} from './scene/DancePose';
import {atTeaTable} from '../shared/tea';
import {QueenWand} from './scene/QueenWand';
import type {TarotCard} from './tarot/TarotCardFrame';
import {isMagicChair} from '../shared/magicChairConfig';
import {MAGIC_CHAIR_SEAT,magicChairPose} from '../shared/magicChair';
import {onTrainDeck,TRAIN_DECK,TRAIN_PLATFORM,TRAIN_PERIOD} from '../shared/encoreTrain';
import {EncoreTrain} from './scene/EncoreTrain';
import {EncoreClock} from './scene/EncoreClock';
import type {CameraFade} from './scene/CameraFade';
import {MusicLights} from './scene/MusicLights';
import {StageFireworks} from './scene/StageFireworks';
import {BroadcastCamera,type BroadcastTarget} from './scene/BroadcastCamera';
import {HallDust} from './scene/HallDust';
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
import {completeInitialLoading,reportInitialHallLoading,reportLoading,failLoading} from './loading';
import {visitorBlocksStep,freeVisitorPosition} from '../shared/visitorCollision';
import {CLOAKROOM_APPROACH,atCloakroom,isOutfit,type Outfit} from '../shared/wardrobe';
import {LOUNGE_SEATS} from '../shared/loungeSeats';
import * as T from 'three';
import {characterFrontLight,FRONT_LIGHT} from './character/characterLight';
import {constrainCamera} from './controls/cameraCollision';
import {danceCameraFrame,duetFrontYaw,duetSideYaw,soloCameraFacing,stepDuetCameraYaw} from './controls/danceCamera';
import {createVenue,createVenueAsync,type Venue} from './scene/Venue';
import {Ghosts,type GhostSpot} from './scene/Ghosts';
import {NpcBehavior} from './scene/NpcBehavior';
import {whiteRabbitSpot} from './scene/WhiteRabbit';
import {QUEEN_SEAT,TAROT_HOST_SEAT,TEA_TABLE} from '../shared/storyGuestSeats';
import {GESTURE_ICON,gestureTurnWeight,gestureWeight,type Icon} from './character/villager';
import {ICON_SIZE,MAX_GROWTH} from './character/EmoteLayer';
import {ghostTop} from './character/VisitorNames';
/** Three ghosts loop above the orchestra (stage runs from the apron at z −9 back to the organ). */
const FLYERS=[{x:-5,z:-14,y:7.5,rx:3.5,rz:3.5,speed:.16},{x:0,z:-16,y:8.5,rx:5,rz:4,speed:.12},{x:5,z:-13,y:7,rx:3.5,rz:3.5,speed:.14}];
/** Lanes beside and between the dinner-table rows, the stage front, the rear and the side galleries. */
const WALKER_PATHS=[{x1:-11.4,z1:-7,x2:-11.4,z2:38},{x1:11.4,z1:38,x2:11.4,z2:-7},...DINNER_LANES_Z.filter((_,i)=>i%2===0).map((z,i)=>i%2?{x1:11,z1:z,x2:-11,z2:z}:{x1:-11,z1:z,x2:11,z2:z}),{x1:-9,z1:43,x2:9,z2:43},{x1:-10,z1:-7.6,x2:10,z2:-7.6},{x1:-12.9,z1:2,x2:-12.9,z2:38},{x1:12.9,z1:38,x2:12.9,z2:2}];
/** Walking ghosts (currently off, see flyingGhosts): two per lane, spread out along it, each at its own pace. */
export const WALKERS=WALKER_PATHS.flatMap((w,i)=>[0,1].map(k=>({...w,phase:k/2+i*.13,speed:.6+.08*((i+k)%4)})));
/** A visitor's own gesture, shown on their ghost while it lasts (eating and drinking included). */
function visitorGhostGesture(v:Visitor,now:number){if(!v.gesture)return null;const age=(now-v.gestureAt)/1000;return age<=gestureSeconds(v.gesture)?{gesture:v.gesture,age}:null;}
import {LobbyLightPass,type RenderPassTimings} from './scene/LobbyLighting';
import {interiorEnvironment,bakeArchitectureShadows} from './scene/InteriorLight';
import {Avatar,musicianSits} from './character/Avatar';
import {PET_VISITOR_GAP,type PettableAnimal} from './character/PettableAnimal';
import {USHER,USHER_LINES} from './character/Usher';
import {Input} from './controls/Input';
import {stageShow} from './orchestra/stageShow';
/** Gestures that make applause heard in the quiet time between pieces. */
import {ATRIUM,HALL_INNER_DOOR,GRAND_STAIR,BOX_OFFICE_APPROACH} from '../shared/grandStair';
import {LOBBY_ENABLED} from './audio/playlist';
import {dinnerCameraFrame,localCameraFrame} from './controls/localCamera';
import {findPath,segmentClear} from './navigation/path';
import {DINNER_LANES_Z,DINNER_TABLES} from '../shared/dinnerTables';
import {GHOST_ORCHESTRA} from './orchestra/buildOrchestra';
import {ORCHESTRA_LAYOUT,STAGE_FLOOR as ORCHESTRA_FLOOR} from './orchestra/layout';
/** Trial ghost orchestra: one ghost at every player's place (people face −z, ghosts +z, hence the half turn). */
const ORCHESTRA_GHOSTS:GhostSpot[]=ORCHESTRA_LAYOUT.map((p,i)=>({x:p.x,y:ORCHESTRA_FLOOR+p.rise,z:p.z,yaw:p.yaw+Math.PI,id:'player-'+i,sitting:musicianSits(p.instrument),npc:true}));
import {FLOOR_SEATS,FLOOR_CROSS_AISLE,SPAWN,SEATS,BOUNDS,seatLabel,walkable,distance,surfaceHeight,inGallery,STAGE_APRON_Z,DESTINATION_ZONE,visitorVariant,visitorColor,cafeApproach,atCafe,CANDLE_TABLES,type CandleTable,type HallDestination,type Look,type Visitor,type Zone,type Point} from '../shared/venue';
import type {Snapshot} from '../shared/protocol';
import type {Presence} from './network/Presence';
import type {ConcertAudio} from './audio/ConcertAudio';
import {renderRatio,frameRate,bloomResolution,isIPadDevice,msaaSamples,type RenderQuality} from './scene/quality';
import {galaxySettingsForDevice,normalizeGalaxySettings,type GalaxySettings} from './scene/SpaceGalaxies';
import {CONCERT_CAMERA,CONDUCTOR,JAZZ_VOCALIST,STAGE,STAGE_FLOOR} from './orchestra/layout';
import {GOLDEN_HALL,HALL_CAMERA} from '../shared/goldenHall';
import {GALLERY_BRIDGE} from '../shared/gallery';
import {gestureSeconds,type Gesture} from '../shared/gestures';
import {DISH_BITES,isDrink,type Dish} from '../shared/dishes';
import {DinnerDishes,BITE_COLOUR} from './scene/DinnerDishes';

const DINNER_SEATS_BY_ID=new Map(FLOOR_SEATS.map(seat=>[seat.id,seat]));

function measuredVenue(zone:Zone){const start=performance.now(),venue=createVenue(zone);performance.measure(`aurea-${zone}-build`,{start,end:performance.now()});return venue;}
type Remote={avatar:Avatar;visitor:Visitor;lastPosition:T.Vector3;zone:Zone;poseAt:number;};
export type FrameTimings=RenderPassTimings&{musicianAnimation:number;musicianBatch:number;crowdBatch:number;fireworksUpdate:number};
/** The lobby is drawn a little darker than the hall's default exposure. */
const LOBBY_EXPOSURE=.88;
const FIRST_PERSON_ZOOM=1.2;
const ENTRANCE_DISTANCE=7;
const ENTRANCE_PITCH=.09;
const ENTRANCE_STAGE_HOLD_MS=1200;
const ENTRANCE_REVEAL_MS=4400;
const CAMERA_IDLE_DELAY=5000;
const CAMERA_SWAY_PERIOD=10*Math.PI;
const LUNAR_SPEED_SCALE=.42;
const LUNAR_STEP_SECONDS=1.75;
const LUNAR_LANDING=.94;
const LUNAR_HOP_HEIGHT=.54;

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
 private cameraInputAt=0;
 private cameraSwayTime=0;
 private cameraSwayBlend=0;
 ready=false;private texturesLoaded=false;private hallBuild:Promise<Venue>|null=null;private hallWarm:Promise<void>|null=null;private hallWarmed=false;private deferredState:Snapshot|null=null;private changingZone=false;uiObscured=false;
 position=new T.Vector3(SPAWN.lobby.x,SPAWN.lobby.y,SPAWN.lobby.z);pose:'idle'|'walk'|'sit'='idle';yaw=0;cameraYaw=0;cameraPitch=.13;cameraDistance=4.8;private cameraLocked=false;private introGlide=false;private entranceFraming=false;fps=60;entered=false;
 readonly queenWand=new QueenWand();
 onQueenCardGame:()=>void=()=>{};
 queenCardResult(won:boolean){
  this.npcBehavior.queenCardResult(won,this.net.now()/1000,this.position);
  if(won)this.queenWand.receive();
  this.onChange();
 }
 get atTeaTable(){return !!this.self&&atTeaTable(this.self);}
 get teaPouring(){return this.drink==='tea'&&this.net.now()<(this.self?.teaReadyAt??0);}
 get atQueenTable(){
  if(this.zone!=='auditorium'||this.pose!=='sit')return false;
  return DINNER_SEATS_BY_ID.get(this.self?.seatId??'')?.row===QUEEN_SEAT.row;
 }
 onWishTarot:()=>void=()=>{};
 private wishFlowerSeat:string|null=null;
 private onMirrorSpot=false;
 private mirrorView=false;
 private mirrorHintSeen=false;
 private nearMirrorLanding=false;
 get wishFlowerCard(){return this.venues.auditorium?.storyTableProps?.wishFlower.cardName??null;}
 get atWishTarotTable(){
  if(this.zone!=='auditorium'||this.pose!=='sit'||this.self?.pose!=='sit')return false;
  const seatId=this.self.seatId;
  if(!seatId||DINNER_SEATS_BY_ID.get(seatId)?.row!==TAROT_HOST_SEAT.row)return false;
  const claim=this.net.state?.seats[seatId];
  return claim?.visitorId===this.net.selfId&&claim?.status==='seated';
 }
 openWishTarot(){
  if(!this.atWishTarotTable||this.net.status!=='connected'||this.photoMode||this.uiObscured)return;
  this.input.keys.clear();
  this.input.touchMove.x=this.input.touchMove.z=0;
  this.route=[];
  this.marker.visible=false;
  this.onWishTarot();
 }
 receiveWishFlower(card:TarotCard,image:HTMLImageElement){
  if(!this.atWishTarotTable||this.net.status!=='connected'||this.photoMode)return;
  const seat=DINNER_SEATS_BY_ID.get(this.self?.seatId??'');
  const flower=this.venue.storyTableProps?.wishFlower;
  if(!seat||!flower)return;
  const time=this.net.now()/1000;
  this.wishFlowerSeat=seat.id;
  flower.show(card,image,time);
  this.npcBehavior.offerWishFlower(time,seat);
  this.onToast('두 사람이 타로 카드가 꽂힌 꽃다발을 건네요.');
 }
 get wishing(){return this.venues.auditorium?.storyTableProps?.wishFlower.wishing??false;}
 makeWish(){
  if(!this.wishFlowerCard||this.wishing)return;
  this.wishFlowerSeat=null;
  this.npcBehavior.cancelWishFlower();
  this.venues.auditorium?.storyTableProps?.wishFlower.wish(this.net.now()/1000);
  this.onToast('꽃과 카드에 소원을 담아 보내요.');
  this.onChange();
 }
 openQueenCardGame(){
  if(this.zone!=='auditorium')return;
  if(this.queenWand.receiving)return;
  if(this.queenWand.casting||this.queenWand.charges){
   this.onToast('마법을 다 쓰거나 지팡이를 버리면 다시 도전할 수 있어요.');
   return;
  }
  this.input.keys.clear();
  this.input.touchMove.x=this.input.touchMove.z=0;
  this.route=[];
  this.marker.visible=false;
  this.onQueenCardGame();
 }
 discardQueenWand(){
  if(!this.queenWand.discard())return;
  this.onToast('하트 지팡이를 버렸어요.');
  this.onChange();
 }
 castQueenWand(){
  if(!this.avatar||!this.queenWand.cast())return;
  if(!this.photoMode){
   this.concertView=false;
   if(this.firstPerson)this.cameraDistance=3.4;
  }
  this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.route=[];this.marker.visible=false;
  this.onChange();
 }
 onProgramBook:()=>void=()=>{};
 onChange:()=>void=()=>{};onToast:(message:string)=>void=()=>{};onSeatMap:()=>void=()=>{};onWardrobe:()=>void=()=>{};private wardrobeNear=false;private visitingWardrobe=false;private pendingSeat:string|null=null;private loungeTarget:string|null=null;private petVisit:{animal:PettableAnimal;route:Point[];expiresAt:number}|null=null;private pettingAnimal:PettableAnimal|null=null;private petUntil=0;private visitingBoxOffice=false;private seatWalkAt=0;
 private fireworks:StageFireworks|null=null;
 private hallDust:HallDust|null=null;
 private musicLights:MusicLights|null=null;
 private encoreTrain:EncoreTrain|null=null;
 private encoreClock:EncoreClock|null=null;
 private lightingPass:LobbyLightPass|null=null;private environment:T.WebGLRenderTarget;private poseFrustum=new T.Frustum();private poseProjection=new T.Matrix4();private poseSphere=new T.Sphere();private poseCenter=new T.Vector3();private avatar:Avatar|null=null;private remotes=new Map<string,Remote>();private ghostBuffer:GhostSpot[]=[];private route:Point[]=[];private avatarVariant=-1;private reservedSeat:string|null=null;private seating=false;private reserveVersion=0;
 private collisionPauseUntil=0;private seatedTarget:T.Vector3|null=null;private cameraSeatAmount=0;private petFocus=new T.Vector3();
 hallLoading=false;private hallLoadingTimeout=0;
 private lobbyEnteredAt=0;private activityEvents=new AbortController();private activitySentAt=0;
 private ray=new T.Raycaster();private ndc=new T.Vector2();private frame=0;private last=performance.now();private sentAt=0;private lastPose='';private renewAt=0;private lastUI=0;private look=new T.Vector3();private gesture:Gesture|null=null;private headTop=new T.Vector3();private gestureAt=0;
 private gestureCameraTurn:number|null=null;
 private disposed=false;private lodAt=0;private orchestraAt=0;quality:RenderQuality='balanced';readonly mobile=matchMedia('(pointer: coarse)').matches||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);private renderedAt=0;
 private readonly ipad=isIPadDevice(navigator.userAgent,navigator.maxTouchPoints);
 private releaseLoadingCallbacks=()=>{};
 diagnosticActive=false;diagnosticMode:'normal'|'no-draw'|'audio-only'='normal';drawCount=0;frameCost={at:0,cpu:0,submit:0};
 diagnosticGpu:GpuFrameTimer|null=null;
 onDiagnosticFrame:((timings:FrameTimings)=>void)|null=null;
 private probeViewport:{width:number;height:number}|undefined;
 private readonly visitorNames:VisitorNames;
 showVisitorNames=true;
 private graphicsLost=false;private graphicsRestorePending=false;
 private entranceRevealAt:number|null=null;
 private entranceRevealProgress=0;
 private entranceRevealSeen=false;
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
  try{this.showVisitorNames=localStorage.getItem('pleee-show-visitor-names')!=='0';}catch{/* Local storage is optional. */}
  try{this.mirrorHintSeen=localStorage.getItem('pleee-mirror-discovery')==='1';}catch{/* Local storage is optional. */}
  try{const saved=localStorage.getItem('concert-quality');if(saved==='balanced'||saved==='sharp'||saved==='low')this.quality=saved;}catch{/* Storage can be unavailable in private browsing. */}
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,this.quality,this.mobile,this.ipad));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','캐릭터 뒤에서 둘러보는 플리 음악당. 바닥 클릭으로 이동하고 드래그로 둘러봅니다.');host.append(canvas);this.visitorNames=new VisitorNames(host);this.visitorNames.setVisible(this.showVisitorNames);
  this.environment=interiorEnvironment(this.renderer);
  this.venues={lobby:measuredVenue('lobby')} as Record<Zone,Venue>;reportLoading(55,'음악당의 색과 빛을 준비하고 있어요');
  // Other visitors are drawn in shared batches per hall, so a full house stays cheap.
  this.venues.lobby.scene.environment=this.environment.texture;this.venues.lobby.scene.environmentIntensity=.18;this.lightingPass=new LobbyLightPass(this.renderer,this.venues.lobby.scene,this.camera,bloomResolution(this.mobile,this.quality),msaaSamples(this.quality));
  this.crowds={lobby:new Ghosts(this.venues.lobby.scene)} as Record<Zone,Ghosts>;
  this.marker=new T.Mesh(new T.RingGeometry(.16,.24,24),new T.MeshBasicMaterial({color:0xe5c786,transparent:true,opacity:.8,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.venues.lobby.scene.add(this.marker);
  this.input=new Input(canvas,{click:(x,y)=>this.click(x,y),rotate:(dx,dy)=>this.rotateView(dx,dy),zoom:f=>this.zoomView(f),escape:()=>{if(this.uiObscured)return;if(this.photoMode)this.endPhotoMode();else if(this.broadcastView)this.stopBroadcastView();else if(this.catView)this.stopCatView();else this.stand();}});
  for(const event of ['pointerdown','pointermove','keydown','wheel'])window.addEventListener(event,()=>{const now=performance.now();this.lobbyEnteredAt=now;this.cameraInputAt=now;if(this.entered&&this.zone==='lobby'&&now-this.activitySentAt>2000){this.activitySentAt=now;this.net.send({type:'activity'});}},{passive:true,signal:this.activityEvents.signal});
  for(const event of ['pointerdown','keydown','wheel'])window.addEventListener(event,this.skipEntranceReveal,{capture:true,passive:true,signal:this.activityEvents.signal});
  window.addEventListener('resize',this.resize);
  canvas.addEventListener('webglcontextlost',event=>{
   event.preventDefault();
   if(this.disposed)return;
   this.graphicsLost=true;this.graphicsRestorePending=false;
   this.onToast('화면 연결이 끊겼어요. 복구하고 있습니다.');
  },{signal:this.activityEvents.signal});
  canvas.addEventListener('webglcontextrestored',()=>{
   if(!this.disposed)this.graphicsRestorePending=true;
  },{signal:this.activityEvents.signal});
  this.resize();this.snapCamera();bakeArchitectureShadows(this.renderer,this.venues.lobby.scene,this.camera);this.venues.lobby.updateLOD(this.camera);this.animate();if(new URLSearchParams(location.search).has('diagnostics'))Object.assign(window,{__concertMetrics:()=>({fps:this.fps,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pixelRatio:this.renderer.getPixelRatio(),buffer:[this.renderer.domElement.width,this.renderer.domElement.height],quality:this.quality,mobile:this.mobile,targetFPS:frameRate(this.mobile,this.quality),animationHz:Math.min(30,frameRate(this.mobile,this.quality)),antialias:this.renderer.getContext().getContextAttributes()?.antialias})});
 }
 private restoreGraphics(){
  this.graphicsRestorePending=false;
  try{
   const previous=this.environment;
   this.environment=interiorEnvironment(this.renderer);
   for(const venue of Object.values(this.venues)){
    venue.scene.environment=this.environment.texture;
    venue.portrait?.invalidateRender();
    if(venue===this.venues.lobby||this.hallWarmed){
     bakeArchitectureShadows(this.renderer,venue.scene,this.camera);
     venue.updateLOD(this.camera);
    }
   }
   this.encoreClock?.setEnvironment(this.environment.texture);
   previous.dispose();
   this.graphicsLost=false;
  }catch(error){
   console.error('Could not restore concert graphics',error);
   this.onToast('화면을 복구하지 못했어요.');
  }
 }
 private ensureHall(){
  if(!this.venues.auditorium)throw new Error('공연장을 준비하고 있어요.');return this.venues.auditorium;
 }
 private prepareHall(){
  if(this.venues.auditorium)return Promise.resolve(this.venues.auditorium);
  return this.hallBuild??=createVenueAsync('auditorium',()=>this.disposed).then(venue=>{venue.scene.environment=this.environment.texture;venue.scene.environmentIntensity=.03;/* Candlelight concert: the walls and organ fall back into the dark. */this.venues.auditorium=venue;this.fireworks=new StageFireworks(venue.scene);this.hallDust=new HallDust(venue.scene);this.musicLights=new MusicLights(venue.scene);this.encoreTrain=new EncoreTrain(venue.scene);this.encoreClock=new EncoreClock(venue.scene);this.crowds.auditorium=new Ghosts(venue.scene);venue.emotes.setViewport(this.renderer.domElement.height,this.camera.fov);venue.sunlight?.setViewport(this.renderer.domElement.height,this.camera.fov);return venue;}).catch(error=>{this.hallBuild=null;throw error;});
 }
 /** Shader readiness can stop progressing after a mobile GPU context loss. */
 private async compileHall(scene:T.Scene,camera:T.Camera){
  let timer=0;
  try{await Promise.race([
   this.renderer.compileAsync(scene,camera),
   new Promise<never>((_,reject)=>{const started=performance.now();timer=window.setInterval(()=>{
    if(this.disposed||this.renderer.getContext().isContextLost())reject(new Error('Graphics context unavailable'));
    else if(performance.now()-started>30000)reject(new Error('Shader preparation timed out'));
   },100);}),
  ]);}finally{clearInterval(timer);}
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
   try{await this.compileHall(warm,camera);if(this.disposed)return;
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
   await this.compileHall(venue.scene,camera);
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
 setShowVisitorNames(show:boolean){
  this.showVisitorNames=show;
  this.visitorNames.setVisible(show);
  try{localStorage.setItem('pleee-show-visitor-names',show?'1':'0');}catch{/* Keep the choice for this visit. */}
  this.onChange();
 }
 setQuality(quality:string){this.quality=quality==='low'?'low':quality==='sharp'?'sharp':'balanced';this.lightingPass?.setSamples(msaaSamples(this.quality));try{localStorage.setItem('concert-quality',this.quality);}catch{}this.resize();this.onChange();}
 get venue(){return this.zone==='auditorium'?this.ensureHall():this.venues.lobby;}
 private *remoteAvatars(){for(const r of this.remotes.values())yield r.avatar;}
 private readonly danceHands={left:new T.Vector3(),right:new T.Vector3()};
 /** Everyone but the viewer is a ghost (ghosts face +z, people face -z, hence the half turn) (each viewer sees only themself as a person). */
 private *ghostSpots():Generator<GhostSpot>{
  const now=this.net.now();
  const partnerId=this.self?.dance?.partnerId;
  const hands=partnerId&&this.avatar?this.danceHands:undefined;
  if(hands&&this.avatar){
   this.avatar.leftHand.getWorldPosition(hands.left);
   this.avatar.rightHand.getWorldPosition(hands.right);
  }
  for(const npc of this.danceNpcs){
   if(npc.zone!==this.zone)continue;
   const dance=dancePose(npc,now,JAZZ_HALL);
   yield {x:dance.x,y:dance.y+dance.bob,z:dance.z,yaw:dance.yaw+Math.PI,id:npc.id,sitting:false,npc:true,dance,danceHands:npc.id===partnerId?hands:undefined};
  }
  for(const r of this.remotes.values()){
   if(r.visitor.zone!==this.zone)continue;
   const a=r.avatar.root,dance=r.visitor.dance?this.visitorDancePose(r.visitor,now):null;
   if(dance){yield {x:dance.x,y:dance.y+dance.bob,z:dance.z,yaw:dance.yaw+Math.PI,id:r.visitor.id,sitting:dance.chair&&dance.chairStand<.5,dance,danceHands:r.visitor.id===partnerId?hands:undefined};continue;}
   const chair=magicChairPose(r.visitor.pose==='sit'?r.visitor.seatId:null,this.net.state?.magicChair,now);
   if(a.visible)yield {x:a.position.x+chair.x,y:a.position.y,z:a.position.z+chair.z,yaw:a.rotation.y+Math.PI+chair.turn,id:r.visitor.id,sitting:r.visitor.pose==='sit',walking:a.position.distanceToSquared(this.poseCenter.set(r.visitor.x,r.visitor.y??0,r.visitor.z))>.0025,drink:r.visitor.drink,bite:r.visitor.dish?BITE_COLOUR[r.visitor.dish]:undefined,...visitorGhostGesture(r.visitor,now)};
  }
 }
 private *allGhosts(){
  for(const spots of [this.ghostSpots(),this.ghostBuffer]){
   for(const spot of spots){
    const highFive=this.highFives.get(spot.id);
    yield highFive?{...spot,highFive,gesture:null}:spot;
   }
  }
  if(this.broadcastView)yield*this.broadcastEventGhosts;
  else yield*this.playfulGhosts();
  if(GHOST_ORCHESTRA&&this.zone==='auditorium')yield*ORCHESTRA_GHOSTS;
 }
 /** The hall's own ghosts: a few drifting overhead, some strolling the aisles, some cheering in empty seats.
  * Everything follows the shared clock, so every visitor sees the same ghosts in the same places. */
 private updateHallGhosts(){
  this.ghostBuffer.length=0;
  if(this.zone!=='auditorium')return;const t=this.net.now()/1000;
  // Above the stage: left, middle and right.
  FLYERS.forEach((f,i)=>{const a=t*f.speed+i*2.1,x=f.x+f.rx*Math.sin(a),z=f.z+f.rz*Math.sin(a*2)/2,y=f.y+.8*Math.sin(t*.4+i);
   this.ghostBuffer.push({x,y,z,yaw:Math.atan2(f.rx*Math.cos(a),f.rz*Math.cos(a*2)),id:'npc-fly'+i,sitting:false,npc:true,angel:true});});
  const visitors=this.net.state?.visitors??[];
  const train=this.encoreTrain?this.playfulPosition:null;
  if(train)this.encoreTrain!.seat(0,train);
  this.ghostBuffer.push(...this.npcBehavior.update(t,visitors,this.net.state?.seats??{},train,this.reduced));
 }
 private readonly npcBehavior = new NpcBehavior();
 private photoGhostAt = 0;
 private photoGhostVisit = 0;
 private readonly playfulPosition = new T.Vector3();
 private *playfulGhosts(): Generator<GhostSpot> {
  if (this.zone !== 'auditorium' || !this.entered || this.reduced) return;
  const seconds = this.net.now() / 1000;
  const point = this.playfulPosition;
  const trainAge = seconds % (TRAIN_PERIOD + 3) - 3;
  if (this.encoreTrain && trainAge >= 0 && trainAge < 15) {
   const yaw = this.encoreTrain.seat(0, point) + Math.PI;
   // A late guest launches from the platform and catches the rear carriage roof.
   const catchUp = T.MathUtils.smoothstep(trainAge, 1.2, 9);
   point.y += 2.5;
   point.lerp(new T.Vector3(TRAIN_PLATFORM.x + 3, TRAIN_PLATFORM.y, TRAIN_PLATFORM.z), 1 - catchUp);
   point.y += Math.sin(catchUp * Math.PI) * 2;
   if (trainAge > 12) point.y += (trainAge - 12) * 3;
   yield {x:point.x,y:point.y,z:point.z,yaw,id:'late-train-ghost',sitting:false,npc:true,gesture:trainAge<3?'wave':null,age:trainAge};
  }
  const clockAge = seconds % 180;
  if (this.encoreClock && clockAge >= 35 && clockAge < 55) {
   const yaw = this.encoreClock.riderPosition(performance.now() / 1000, point);
   const arrival = 1 - T.MathUtils.smoothstep(clockAge, 35, 39);
   const departure = T.MathUtils.smoothstep(clockAge, 50, 55);
   point.y += (arrival + departure) * 6;
   yield {x:point.x,y:point.y,z:point.z,yaw,id:'pendulum-rider',sitting:true,npc:true,gesture:'wave',age:(clockAge-35)%6};
  }
  if (this.photoMode && this.photoGhostVisit % 3 === 1) {
   const age = (performance.now() - this.photoGhostAt) / 1000;
   if (age < 1.2) return;
   const approach = T.MathUtils.smoothstep(age, 1.2, 3.2);
   const direction = this.position.clone().sub(this.camera.position).setY(0).normalize();
   const side = new T.Vector3(-direction.z, 0, direction.x);
   point.copy(this.position).addScaledVector(direction, .85).addScaledVector(side, 2.8 - approach * 2.1);
   point.y += .12;
   yield {x:point.x,y:point.y,z:point.z,yaw:Math.atan2(this.camera.position.x-point.x,this.camera.position.z-point.z),id:'photo-sneak',sitting:false,npc:true,gesture:'wave',age:(age-1.2)%5};
  }
 }
 startPhotoMode(){
  if(!this.entered||!this.ready||this.changingZone||this.hallLoading)return;
  this.stopBroadcastView();
  this.stopCatView();
  this.photoOriginal={position:this.camera.position.clone(),look:this.camera.position.clone().add(this.camera.getWorldDirection(new T.Vector3()).multiplyScalar(20)),fov:this.camera.fov,avatarVisible:this.avatar?.root.visible??false,avatarYaw:this.avatar?.root.rotation.y??this.yaw};
  if(this.conducting.active)this.endConducting();
  if(this.pose!=='sit')this.cancelSeat();
  this.photoAnchor.copy(this.position);
  this.photoMode=true;
  this.photoGhostAt=performance.now();this.photoGhostVisit++;
  this.route=[];
  this.marker.visible=false;
  this.input.keys.clear();
  this.input.touchMove.x=this.input.touchMove.z=0;
  this.introUntil=0;
  document.body.classList.add('photo-active');
  this.setPhotoComposition(this.mirrorView?'current':'recommended');
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
 private get viewFov(){
  const aspect=this.camera.aspect;
  if(aspect>=.8)return 61;
  if(this.ridingTrain)return 86;
  if(!this.entranceViewLocked||this.broadcastView||this.concertView)return 70;
  // Fit the program on the left and the remaining candle table on the right.
  // Widen only as the stage pullback nears the entrance.
  const target=T.MathUtils.lerp(90,70,T.MathUtils.smoothstep(aspect,.43,.78));
  const blend=this.entranceRevealAt===null?1:T.MathUtils.smoothstep(this.entranceRevealProgress,.42,1);
  return T.MathUtils.lerp(70,target,blend);
 }
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
 setStageView(low:boolean){if(this.entranceViewLocked||this.zone!=='auditorium')return;this.stopBroadcastView();this.stopCatView();this.introUntil=0;this.concertView=true;this.hallOverview=false;this.stageLowView=low;this.resetCameraSway(performance.now());this.cameraYaw=0;this.cameraPitch=.13;this.hallZoom=1;this.route=[];this.marker.visible=false;this.onChange();}
 private broadcastCamera:BroadcastCamera|null=null;
 private broadcastEventGhosts:GhostSpot[]=[];
 get broadcastView(){return this.broadcastCamera!==null;}
 get canStartBroadcast(){
  return this.entered&&this.zone==='auditorium'&&!this.changingZone&&!this.photoMode&&!this.ridingTrain&&!this.self?.dance&&!this.conducting.active;
 }
 toggleBroadcastView(){
  if(this.broadcastView){this.stopBroadcastView();return;}
  if(!this.canStartBroadcast)return;
  this.stopCatView();
  this.route=[];
  if(this.pose!=='sit')this.cancelSeat();
  this.marker.visible=false;
  this.input.keys.clear();
  this.input.touchMove.x=this.input.touchMove.z=0;
  this.lunarStride=this.lunarLift=0;
  this.lunarVelocity.set(0,0,0);
  this.broadcastCamera=new BroadcastCamera(performance.now()/1000);
  this.snapCamera();
  this.onChange();
 }
 stopBroadcastView(){
  if(!this.broadcastView)return;
  this.broadcastCamera=null;
  this.broadcastEventGhosts=[];
  this.snapCamera();
  this.renderer.domElement.focus({preventScroll:true});
  this.onChange();
 }
 openHall=false;
 private lunarStride=0;
 private lunarLift=0;
 private lunarVelocity=new T.Vector3();
 private get onLunarGallery(){
  return this.openHall&&this.zone==='auditorium'&&this.position.y>=GOLDEN_HALL.balconyHeight-.3&&inGallery(this.position);
 }
 galaxySettings=galaxySettingsForDevice(this.mobile);
 setGalaxySettings(change:Partial<GalaxySettings>){
  if(!import.meta.env.DEV)return;
  const settings=normalizeGalaxySettings({...this.galaxySettings,...change},this.galaxySettings);
  this.galaxySettings=settings;
  this.venues.auditorium?.scene.userData.hallTransition?.configureGalaxies(settings);
  try{localStorage.setItem('pleee-galaxies-'+(this.mobile?'mobile':'desktop'),JSON.stringify({...settings,layoutVersion:2}));}catch{/* Storage may be unavailable. */}
  this.onChange();
 }
 get spaceVisible(){return this.openHall||(this.venues.auditorium?.scene.userData.openHallProgress??0)>0;}
 toggleOpenHall(){
  if(this.zone!=='auditorium')return;
  const scene=this.venue.scene,upper=scene.userData.upperArchitecture;
  if(!upper)return;
  this.openHall=!this.openHall;
  scene.userData.hallTransition.setOpen(this.openHall,this.galaxySettings);
  this.onChange();
 }
 showHallOverview(){
  if(this.entranceViewLocked||this.zone!=='auditorium')return;
  this.stopBroadcastView();
  this.introUntil=0;
  this.introEase=0;
  this.concertView=true;
  this.hallOverview=true;
  this.cameraYaw=0;
  this.cameraPitch=.13;
  this.cameraDistance=4.8;
  this.hallZoom=1;
  this.snapCamera();
  this.onChange();
 }
 toggleConcertView(){this.stopBroadcastView();if(this.entranceViewLocked)return;this.introUntil=0;this.concertView=!this.concertView;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.onChange();}
 setDiagnosticActive(active:boolean){
  this.diagnosticActive=active;
  this.resize();
 }
 private resize=()=>{
  const probe=this.diagnosticActive&&!this.mobile?PROBE_PROFILE:null;
  const w=probe?.width??innerWidth,h=probe?.height??innerHeight;
  const mobile=!!probe||this.mobile,quality=probe?.quality??this.quality;
  const ratio=renderRatio(w,h,probe?.dpr??devicePixelRatio,quality,mobile,!probe&&this.ipad);
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
  if(state.visitors.find(v=>v.id===this.net.selfId)?.zone==='auditorium'&&!this.hallWarmed){const waiting=!!this.deferredState;this.deferredState=state;if(!waiting){this.hallLoading=true;this.onChange();}if(!waiting)void new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))).then(()=>this.warmHall()).then(()=>{const latest=this.deferredState;this.deferredState=null;if(latest)this.apply(latest);}).catch(()=>{this.deferredState=null;this.stopHallLoading();if(!this.disposed){failLoading();this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');}});return;}
  this.deferredState=null;
  this.danceNpcs=[];
  for(const visitor of state.visitors){
   const npc=danceNpc(visitor);
   if(npc)this.danceNpcs.push(npc);
  }
  const wasRiding=this.ridingTrain;const self=state.visitors.find(v=>v.id===this.net.selfId);if(self){const initial=!this.self,changedZone=this.zone!==self.zone,stood=this.pose==='sit'&&self.pose!=='sit',satDown=this.pose!=='sit'&&self.pose==='sit';const previousDance=this.self?.dance;
   if(this.gesture==='wave'&&self.highFive?.at===self.gestureAt&&self.highFive.at!==this.self?.highFive?.at)this.gesture=null;
   this.self=self;
   if(this.predictedSolo&&(!self.dance||self.dance.partnerId||self.dance.endingAt!==undefined
    ||self.dance.startedAt!==this.predictedSolo.dance?.startedAt
    ||(self.dance.style===this.predictedSolo.dance?.style&&self.dance.moveStartedAt!==previousDance?.moveStartedAt))){
    this.predictedSolo=null;
   }

   if(self.dance&&!previousDance){
    this.catView=false;
    this.keepDanceView=this.pendingDanceView&&!self.dance.partnerId&&!self.dance.chair;
    this.pendingDanceView=false;
    this.selectedDanceHost=null;
    this.position.set(self.x,self.y??0,self.z);
    this.route=[];
    this.marker.visible=false;
    this.stopBroadcastView();
    this.beginDanceCamera(self);
   }
   if(self.dance&&previousDance&&self.dance.partnerId!==previousDance.partnerId){
    this.frameDanceCamera(self);
   }
   if(previousDance&&!self.dance){
    this.keepDanceView=false;
    this.duetCameraFront=null;this.duetCameraOrbit=null;
    this.position.set(self.x,self.y??0,self.z);this.yaw=self.yaw;
    if(this.beforeDanceCamera)Object.assign(this,this.beforeDanceCamera);
    this.beforeDanceCamera=null;
    this.startDanceCameraGlide();
   }
   // Reapply the visitor's saved man/woman choice when they (re)connect.
   if(initial){let saved:string|null=null;try{saved=localStorage.getItem('garnier-look');}catch{}if((saved==='man'||saved==='woman')&&saved!==(visitorVariant(self)%8>=4?'woman':'man'))this.setLook(saved);}
   if(this.avatar&&(this.avatarVariant!==visitorVariant(self)||this.avatar.outfit!==self.outfit)){this.avatar.disposeDanceSleeves();this.avatar.root.removeFromParent();this.avatar=null;}
   if(!this.avatar){this.avatarVariant=visitorVariant(self);this.avatar=new Avatar(visitorColor(self),undefined,this.avatarVariant,self.outfit);this.venue.scene.add(this.avatar.root);}
   if(initial||changedZone||stood||self.pose==='sit'){
    if(self.pose==='sit'&&!initial&&!changedZone)this.seatedTarget=new T.Vector3(self.x,self.y??SEATS.find(s=>s.id===self.seatId)?.y??0,self.z);
    else{this.position.set(self.x,self.y??(self.pose==='sit'?(SEATS.find(s=>s.id===self.seatId)?.y??0):0),self.z);this.seatedTarget=null;}
    this.yaw=self.yaw;this.pose=self.pose;
    if(initial||changedZone){this.catView=false;this.pendingDanceView=false;this.clearPetInteraction();this.cameraSeatAmount=self.pose==='sit'?1:0;this.zone=self.zone;this.lobbyEnteredAt=self.zone==='lobby'?performance.now():0;if(self.zone==='auditorium')this.stopHallLoading();
     // Enter beside the usher so the welcome is visible from the first hall frame.
     if(self.zone==='auditorium'){this.concertView=false;this.hallOverview=true;this.cameraYaw=0;this.cameraPitch=.13;this.cameraDistance=4.8;this.hallZoom=1;this.introUntil=0;this.seatWalkAt=0;this.usherGreetingPending=true;}else{this.introUntil=0;this.seatWalkAt=0;}
     this.entranceFraming=self.zone==='auditorium'&&self.pose!=='sit'&&underEntranceRoof(this.position);
     this.entranceRevealAt=null;
     if(this.entranceFraming)this.resetEntranceView();
     if(self.zone==='auditorium'&&!this.entranceRevealSeen){
      this.entranceRevealSeen=true;
      if(this.entranceFraming&&!this.reduced&&!this.pendingSeat){
       this.entranceRevealAt=Infinity;
       this.entranceRevealProgress=0;
      }
     }
     this.avatar.root.removeFromParent();this.venue.scene.add(this.avatar.root);this.marker.removeFromParent();this.venue.scene.add(this.marker);this.route=[];this.marker.visible=false;this.reservedSeat=null;this.cameraYaw=this.zone==='lobby'?Math.PI:0;// In the lobby, open facing the Grand Escalier.
     this.audio.setZone(this.zone);this.snapCamera();this.venue.updateLOD(this.camera);this.venue.updateMusicians(this.camera);this.lodAt=0;}
    if(self.pose==='sit'){
     this.route=[];this.seating=false;this.marker.visible=false;
     if(satDown){
      this.concertView=false;this.hallZoom=1;
      this.resetCameraSway(performance.now());
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
  for(const v of state.visitors){if(v.id===this.net.selfId)continue;let r=this.remotes.get(v.id);if(r&&(r.avatar.variant!==visitorVariant(v)||r.avatar.outfit!==v.outfit)){r.avatar.root.removeFromParent();this.remotes.delete(v.id);r=undefined;}if(!r){const avatar=new Avatar(visitorColor(v),undefined,visitorVariant(v),v.outfit);avatar.root.position.set(v.x,v.y??0,v.z);r={avatar,visitor:v,lastPosition:avatar.root.position.clone(),zone:v.zone,poseAt:0};this.remotes.set(v.id,r);}if(v.zone===this.zone&&v.gesture&&v.gestureAt>r.visitor.gestureAt){if(v.gesture==='clap')this.audio.clap(.6);else if(v.gesture==='bravo')this.audio.bravo(.6);}r.visitor=v;
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
  if(!this.entered||this.changingZone||this.hallLoading||(!LOBBY_ENABLED&&this.zone==='auditorium'))return;
  if(this.net.status!=='connected'){this.onToast('음악당에 연결한 뒤 입장할 수 있어요.');return;}
  this.stopBroadcastView();
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
    if(destination==='auditorium'&&this.hallLoading)this.hallLoadingTimeout=window.setTimeout(()=>{this.stopHallLoading();failLoading();this.onToast('입장 응답이 늦어지고 있어요. 다시 시도해 주세요.');},30000);
   }
  }catch{this.stopHallLoading();if(!this.disposed){failLoading();this.onToast('공연장을 준비하지 못했어요. 다시 입장해 주세요.');}}
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
 private get activeCat(){return this.venue.cat??this.venue.hallCat;}
 catView=false;
 get canWatchCat(){
  return this.entered&&this.ready&&!this.changingZone&&!this.hallLoading&&!this.photoMode
   &&!this.self?.dance&&!this.ridingTrain&&!this.conducting.active&&!!this.activeCat;
 }
 watchCat(){
  if(!this.canWatchCat)return false;
  this.stopBroadcastView();
  if(this.pose!=='sit')this.cancelSeat();
  this.route=[];
  this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
  this.catView=true;
  this.snapCamera();this.onChange();
  return true;
 }
 stopCatView(){
  if(!this.catView)return;
  this.catView=false;
  this.snapCamera();this.onChange();
 }
 /** A click walks to the pet first, then gives a gentle pat. */
 private visitAnimal(animal:PettableAnimal){
  if(this.net.status!=='connected'||this.changingZone||this.conducting.active)return;
  if(!animal.canPet){this.onToast('고양이가 바닥에 내려오면 쓰다듬을 수 있어요.');return;}
  if(this.pose==='sit')this.stand();
  this.cancelSeat();
  const route=animal.invite(this.position);
  if(!route){this.onToast(animal.species==='dog'?'강아지 옆 통로로 이동해 주세요.':'고양이 옆 통로로 이동해 주세요.');return;}
  this.petVisit={animal,route,expiresAt:performance.now()+20000};
  this.route=route;
  this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
  this.marker.position.set(animal.approach.x,animal.approach.y+.035,animal.approach.z);this.marker.visible=true;
 }
 private clearPetInteraction(){
  const visit=this.petVisit;
  if(visit&&this.route===visit.route){this.route=[];this.marker.visible=false;}
  visit?.animal.release();this.pettingAnimal?.release();
  this.petVisit=null;this.pettingAnimal=null;this.petUntil=0;
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
 async chooseSeat(id:string,direct=false){
  if(this.zone!=='auditorium'||!this.entered)return;const seat=SEATS.find(s=>s.id===id);if(!seat)return;
  this.stopBroadcastView();
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
  if(direct){this.position.set(seat.approach.x,seat.approach.y??seat.y,seat.approach.z);this.route=[seat.approach];this.marker.visible=false;this.sentAt=0;this.onToast(`${seatLabel(seat)}에 앉아요.`);}else this.onToast(`${seatLabel(seat)}까지 걸어가요.`);
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
  this.stopBroadcastView();
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
 get showMirrorHint(){
  return this.nearMirrorLanding&&!this.mirrorHintSeen&&this.zone==='auditorium'&&this.entered&&!this.hallLoading
   &&!this.self?.dance&&this.pose!=='sit'&&!this.photoMode&&!this.ridingTrain&&!this.conducting.active;
 }
 private rememberMirrorHint(){
  if(this.mirrorHintSeen)return;
  this.mirrorHintSeen=true;
  try{localStorage.setItem('pleee-mirror-discovery','1');}catch{/* Keep the memory for this visit. */}
 }
 dismissMirrorHint(){this.rememberMirrorHint();this.onChange();}
 private walkToMirror(){
  const mirror=this.venue.mirror;
  if(!mirror||this.pose==='sit'||this.net.status!=='connected')return false;
  const path=findPath(this.zone,this.position,mirror.standingPoint);
  if(!path)return false;
  this.cancelSeat();
  this.route=path;
  this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
  this.onMirrorSpot=false;
  return true;
 }
 /** Seat to walk to once a floor jump lands (chosen on the other floor). */
 private floorSeat:string|null=null;
 finishHallMove(point:{x:number;y:number;z:number}){
  this.stopBroadcastView();
  this.cancelSeat();this.pose='idle';this.seatedTarget=null;this.position.set(point.x,point.y,point.z);this.yaw=0;
  this.lunarStride=this.lunarLift=0;
  this.lunarVelocity.set(0,0,0);
  this.entranceFraming=this.zone==='auditorium'&&underEntranceRoof(this.position);
  this.route=[];this.introUntil=0;this.concertView=false;this.cameraYaw=this.zone==='lobby'?Math.PI:0;this.cameraPitch=.13;this.cameraDistance=4.8;this.cameraSeatAmount=0;
  if(this.entranceFraming)this.resetEntranceView();
  this.sentAt=performance.now();this.snapCamera();this.onChange();
  if(this.floorSeat){const id=this.floorSeat;this.floorSeat=null;void this.chooseSeat(id);}
 }
 /** Floor menu: jump straight to the rear gallery (2F) or back down to the rear of the stalls (1F). */
 goToGallery(){if(this.zone!=='auditorium')return;this.goToHallPoint(this.position.y<GOLDEN_HALL.balconyHeight-.3?'upper':'rear');}
 private cancelSeat(keepPending=false){this.stopCatView();this.visitingCafe=false;this.clearPetInteraction();this.visitingBoxOffice=false;this.visitingWardrobe=false;this.loungeTarget=null;if(!keepPending){this.pendingSeat=null;this.seatWalkAt=0;}this.reserveVersion++;if(this.reservedSeat)this.net.send({type:'release'});this.reservedSeat=null;this.seating=false;this.marker.visible=false;}
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
  if(this.broadcastView||this.catView)return;
  this.danceCameraGlide=false;this.duetCameraOrbit=null;
  this.mirrorView=false;
  if(this.photoMode){
   const scale=4/Math.max(320,this.renderer.domElement.clientWidth);
   this.photoYaw-=dx*scale;
   this.photoPitch=T.MathUtils.clamp(this.photoPitch-dy*(1.6/Math.max(320,this.renderer.domElement.clientHeight)),-.5,.65);
   this.snapCamera();
   return;
  }
  // Reverse both drag axes consistently in the lobby, walking, seated and overview views.
  this.dragAt=performance.now();
  // The hall and stage views turn the head in place, so the whole
  // view rotates at the walking view's pace, instead of sliding the camera along the walls.
  const overview=this.zone==='auditorium'&&this.concertView&&!this.self?.dance;
  // One pace for every view and every screen: a drag across the whole screen width turns about 230°, as on a phone.
  const k=4/Math.max(320,this.renderer.domElement.clientWidth),yaw=this.cameraYaw-dx*k,pitch=this.cameraPitch+dy*k*.65;
  if(overview){this.cameraYaw=T.MathUtils.clamp(yaw,-.9,.9);this.cameraPitch=T.MathUtils.clamp(pitch,.13-1.3,.13+1.4);}
  else{this.cameraYaw=yaw;this.cameraPitch=T.MathUtils.clamp(pitch,-1.45,1.45);}
 }
 private get firstPerson(){return !this.broadcastView&&!this.catView&&!this.self?.dance&&!this.ridingTrain&&this.entered&&!this.conducting.active&&!(this.zone==='auditorium'&&this.concertView)&&this.cameraDistance<=FIRST_PERSON_ZOOM;}
 zoomView(f:number){
  if(this.broadcastView||this.catView)return;
  this.danceCameraGlide=false;
  this.mirrorView=false;
  if(this.photoMode){
   this.photoZoom=T.MathUtils.clamp(this.photoZoom/f,.65,1.25);
   this.updatePhotoLens();
   this.onChange();
   return;
  }
  if(this.self?.dance){
   this.cameraDistance=T.MathUtils.clamp(this.cameraDistance*f,1.8,12);
   return;
  }
  if(this.entranceViewLocked)return;
  if(this.zone==='auditorium'&&this.concertView){
   const maxZoom=this.hallOverview?1:this.stageLowView?(GOLDEN_HALL.rear-2+23)/21:1.6;
   this.hallZoom=T.MathUtils.clamp(this.hallZoom*f,.15,maxZoom);
   return;
  }
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
  if(this.avatar){this.avatar.holdingCandle=mine==='on'&&this.entered&&!this.self?.dance&&!this.avatar.holdingBouquet;if(this.avatar.holdingCandle)carriers.push({hand:this.avatar.leftHand,lit:true,own:true});}
  for(const r of this.remotes.values()){const c=r.visitor.zone===this.zone&&!r.visitor.dance?r.visitor.candle:undefined;r.avatar.holdingCandle=c==='on';if(c==='on')carriers.push({hand:r.avatar.leftHand,lit:true});}
  layer.update(carriers,this.reduced?0:now/1000);
 }
 private readonly highFives=new Map<string,HighFivePose>();
 private *highFiveNpcs():Generator<HighFivePosition&{id:string}>{
  if(this.zone!=='auditorium')return;
  for(const ghost of this.ghostBuffer)if(!ghost.angel)yield ghost;
  const usher=this.venue.usher;
  if(usher)yield {...USHER,y:usher.avatar.root.position.y,id:USHER_HIGH_FIVE_ID,sitting:false};
 }
 private nearestHighFive(now:number):HighFiveTarget|undefined{
  const me=this.self;
  if(!this.entered||!me||!canHighFive(me,now)||this.conducting.active||this.wishing||this.pettingAnimal)return;
  const from={x:this.position.x,y:this.position.y,z:this.position.z,sitting:this.pose==='sit'};
  const visitors=this.net.state?.visitors??[];
  const busy=new Set<string>();
  for(const visitor of visitors){
   const event=activeHighFive(visitor,now);
   if(event?.zone===this.zone){busy.add(visitor.id);busy.add(event.id);}
  }
  if(busy.has(me.id))return;
  let target:HighFiveTarget|undefined;
  let nearest=Infinity;
  const consider=(point:HighFivePosition&{id:string},npc?:true)=>{
   if(busy.has(point.id))return;
   const gap=distance(from,point);
   if(gap>=nearest||!withinHighFiveReach(this.zone,from,point))return;
   target={id:point.id,npc};
   nearest=gap;
  };
  for(const visitor of visitors){
   if(visitor.id!==me.id&&visitor.zone===this.zone&&canHighFive(visitor,now))consider({...visitor,sitting:visitor.pose==='sit'});
  }
  for(const npc of this.highFiveNpcs())consider(npc,true);
  return target;
 }
 private updateHighFives(now:number){
  this.highFives.clear();
  const positionOf=(visitor:Visitor):HighFivePosition=>{
   const p=visitor.id===this.net.selfId?this.position:this.remotes.get(visitor.id)?.avatar.root.position??visitor;
   return {x:p.x,y:p.y,z:p.z,sitting:visitor.pose==='sit'};
  };
  for(const visitor of this.net.state?.visitors??[]){
   const event=activeHighFive(visitor,now);
   if(!event||event.zone!==this.zone||!canHighFive(visitor,now))continue;
   const from=positionOf(visitor);
   let to:HighFivePosition|undefined;
   if(event.npc){
    for(const npc of this.highFiveNpcs())if(npc.id===event.id){to=npc;break;}
   }else{
    const partner=event.id===this.net.selfId?this.self:this.remotes.get(event.id)?.visitor;
    if(partner?.zone===this.zone&&canHighFive(partner,now))to=positionOf(partner);
   }
   if(!to||!withinHighFiveReach(this.zone,from,to))continue;
   const age=(now-event.at)/1000;
   this.highFives.set(visitor.id,highFivePose(from,to,age,this.reduced));
   this.highFives.set(event.id,highFivePose(to,from,age,this.reduced));
  }
 }
 gestureAction(gesture:Gesture){if(this.self?.dance||gesture==='wave'&&this.self&&this.highFives.has(this.self.id))return;const me=this.net.state?.visitors.find(v=>v.id===this.net.selfId);if((gesture==='eat'||gesture==='drink')&&(this.gesture==='eat'||this.gesture==='drink')&&this.net.now()-this.gestureAt<3200)return;
  if(gesture==='drink'&&this.teaPouring)return;
  if(gesture==='drink'){if(this.zone==='auditorium'?!me?.drink||(me.drinkSips??0)>=DISH_BITES||me.drinkEmptyAt:!me?.coffee||(me.coffeeSips??0)>=3)return;}
  if(gesture==='eat'&&(me?.dish?(me.dishBites??0)>=DISH_BITES||me.dishEmptyAt:!me?.macaron||me.macaronEmptyAt||(me.macaronBites??0)>=2))return;
  this.lobbyEnteredAt=performance.now();this.gesture=gesture;this.gestureAt=this.net.now();this.gestureCameraTurn=null;
  const highFive=gesture==='wave'?this.nearestHighFive(this.gestureAt):undefined;
  if(highFive&&!highFive.npc)this.sendPosition(this.lobbyEnteredAt,true);
  this.net.send({type:'gesture',gesture,highFive});if(gesture==='clap')this.audio.clap();else if(gesture==='bravo')this.audio.bravo();
  if(this.entered&&(gesture==='wave'||gesture==='bow')){
   this.venue.portrait?.greet(this.position,this.lobbyEnteredAt);
   const usher=this.venue.usher;
   if(usher&&highFive?.id!==USHER_HIGH_FIVE_ID&&this.position.distanceTo(usher.avatar.root.position)<4){
    usher.greet(this.lobbyEnteredAt/1000,'반가워요. 편하게 공연을 즐겨 주세요.');
   }
  }
  }
 private pendingDanceView=false;
 private keepDanceView=false;
 private beforeDanceCamera:{cameraYaw:number;cameraPitch:number;cameraDistance:number}|null=null;
 private beginDanceCamera(visitor:Visitor){
  this.beforeDanceCamera={cameraYaw:this.cameraYaw,cameraPitch:this.cameraPitch,cameraDistance:this.cameraDistance};
  if(this.keepDanceView){
   this.cameraDistance=T.MathUtils.clamp(this.cameraDistance,3.2,12);
   this.startDanceCameraGlide();
  }else this.frameDanceCamera(visitor);
 }
 private visitorDancePose(visitor:Visitor,now:number,localCamera=false){
  const pose=dancePose(visitor,now,JAZZ_HALL);
  const dance=visitor.dance!,mirror=this.venues.auditorium?.mirror;
  let chairTurn=0,mirrorYaw:number|undefined;
  if(mirror&&visitor.zone==='auditorium'&&!dance.center&&!pose.chair
   &&mirror.standingPoint.distanceToSquared(this.mirrorDanceAnchor.set(visitor.x,visitor.y??0,visitor.z))<.29**2){
   pose.yaw=mirrorYaw=mirror.root.rotation.y;
  }
  if(pose.chair){
   const chair=magicChairPose(visitor.seatId,this.net.state?.magicChair,now);
   pose.x+=chair.x;pose.z+=chair.z;pose.yaw+=chair.turn;chairTurn=chair.turn;
  }
  if(localCamera&&!dance.center&&!dance.partnerId&&(!pose.chair||pose.chairStand>=1)){
   const baseline=mirrorYaw??((dance.stop?.yaw??(dance.joinSpot
    ?Math.atan2(visitor.x-dance.joinSpot.x,visitor.z-dance.joinSpot.z):visitor.yaw))+chairTurn);
   pose.yaw=soloCameraFacing(pose.yaw,baseline,pose,this.camera.position);
  }
  return pose;
 }
 private readonly mirrorDanceAnchor=new T.Vector3();
 private frameDanceCamera(visitor:Visitor){
  const dance=visitor.dance!,center=dance.center;
  if(this.mirrorView&&!center)return;
  if(center)this.mirrorView=false;
  const facing=this.visitorDancePose(visitor,this.net.now()).yaw;
  this.cameraPitch=.18;
  this.cameraDistance=this.camera.aspect<.8?5.4:4.6;
  if(center){
   this.frameDuetCamera(visitor,duetCameraFacesFront(dance,this.net.now()));
  }else{
   this.duetCameraFront=null;this.duetCameraOrbit=null;
   this.cameraYaw=facing+Math.PI;
  }
  this.startDanceCameraGlide();
 }
 private duetCameraFront:boolean|null=null;
 private duetCameraOrbit:number|null=null;
 private frameDuetCamera(visitor:Visitor,front:boolean){
  const dance=visitor.dance!,center=dance.center!;
  const walls=this.venues.auditorium?.cameraWalls??this.venue.cameraWalls;
  const pairAxis=dance.angle??this.visitorDancePose(visitor,this.net.now()).yaw;
  const clearance=(yaw:number)=>{
   const frame=danceCameraFrame(center,yaw,this.cameraPitch,this.cameraDistance,true,walls);
   return frame.position.distanceTo(frame.look);
  };
  this.duetCameraFront=front;
  this.duetCameraOrbit=front
   ?duetFrontYaw(pairAxis,this.cameraYaw,clearance,Math.min(3.2,this.cameraDistance*.72))
   :duetSideYaw(pairAxis,this.cameraYaw,clearance);
  this.startDanceCameraGlide();
 }
 private updateDuetCamera(dt:number){
  const visitor=this.self,dance=visitor?.dance;
  if(!visitor||!dance?.center||dance.endingAt!==undefined)return;
  const front=duetCameraFacesFront(dance,this.net.now());
  if(front!==this.duetCameraFront)this.frameDuetCamera(visitor,front);
  if(this.duetCameraOrbit===null)return;
  const next=stepDuetCameraYaw(this.cameraYaw,this.duetCameraOrbit,dt);
  this.cameraYaw=next.yaw;
  if(next.done)this.duetCameraOrbit=null;
 }
 private danceCameraGlide=false;
 private startDanceCameraGlide(){
  this.danceCameraGlide=true;
  this.cameraLocked=false;
 }
 private predictedSolo:Visitor|null=null;
 private get danceVisitor(){
  const predicted=this.predictedSolo;
  return predicted&&this.net.status==='connected'?predicted:this.self;
 }
 get danceSelection(){return this.danceVisitor?.dance;}
 private danceCircles=new DanceCircles();
 private danceNpcs:Visitor[]=[];
 private selectedDanceHost:string|null=null;
 startDanceHere(){
  if(!this.entered||this.zone!=='auditorium'||this.self?.dance||this.net.status!=='connected'
   ||this.changingZone||this.ridingTrain||this.uiObscured||this.photoMode||this.conducting.active
   ||this.queenWand.casting||this.queenWand.receiving)return;
  if(this.wishFlowerCard||this.queenWand.charges){this.onToast('손에 든 소품을 내려놓은 뒤 춤을 시작해 주세요.');return;}
  if(this.pose==='sit'){this.danceAction({type:'danceStart'});return;}
  const facing=this.cameraYaw+Math.PI;
  if(!walkable('auditorium',this.position)){
   this.onToast('걸어갈 수 있는 공연장 바닥에서 춤을 시작해 주세요.');
   return;
  }
  this.cancelSeat();
  this.selectedDanceHost=null;
  this.yaw=facing;
  // Keep the camera the visitor chose while walking here. Only a duet reframes it.
  this.danceAction({type:'danceStart'},true);
 }
 danceAction(message:DanceCommand,keepView=false){
  if(this.net.status!=='connected')return;
  if(message.type!=='danceStop'){
   if(this.conducting.active||this.photoMode||this.queenWand.casting||this.queenWand.receiving)return;
   if(this.wishFlowerCard||this.queenWand.charges){this.onToast('손에 든 소품을 내려놓은 뒤 춤을 시작해 주세요.');return;}
   this.stopBroadcastView();
   this.route=[];this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;
   this.lunarStride=this.lunarLift=0;
   this.lunarVelocity.set(0,0,0);
   this.sendPosition(performance.now(),true);
  }
  const self=this.self,dance=self?.dance;
  const predict=message.type==='danceStart'&&message.style&&SOLO_DANCES.some(move=>move.id===message.style)
   &&self&&dance&&!dance.partnerId&&dance.endingAt===undefined&&!this.net.local
   &&this.danceSelection?.style!==message.style;
  if(message.type==='danceStop')this.predictedSolo=null;
  if(message.type==='danceStart'&&!dance)this.pendingDanceView=keepView;
  const sent=this.net.send(message);
  if(!sent&&keepView)this.pendingDanceView=false;
  if(sent&&predict){
   const pending:Visitor={...self,dance:{...dance,style:message.style,moveStartedAt:this.net.now(),previousMove:undefined}};
   this.predictedSolo=pending;
   window.setTimeout(()=>{
    if(this.predictedSolo!==pending)return;
    this.predictedSolo=null;
    if(!this.disposed)this.onChange();
   },2000);
  }
  this.onChange();
 }
 private openDanceSpotAt(point:{x:number;y:number;z:number},radius=DANCE_JOIN_RADIUS){
  return this.net.state?.visitors.find(v=>{
   const spot=v.dance?.joinSpot;
   return v.id!==this.self?.id&&v.zone===this.zone&&spot&&v.dance?.endingAt===undefined
    &&Math.abs(spot.y-point.y)<.15&&distance(spot,point)<=radius;
  });
 }
 private clickDanceSpot(){
  if(this.zone!=='auditorium'||this.ridingTrain||this.pose==='sit')return false;
  const floorY=this.position.y;
  const point=this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-floorY-.025),new T.Vector3());
  const host=point?this.openDanceSpotAt(point,DANCE_JOIN_RADIUS+.09):undefined;
  const spot=host?.dance?.joinSpot;
  if(!host||!spot)return false;
  const path=findPath(this.zone,this.position,spot);
  if(!path){this.onToast('빈 춤 원까지 갈 수 있는 통로가 없어요.');return true;}
  this.cancelSeat();
  this.route=path;
  this.selectedDanceHost=host.id;
  return true;
 }
 private click(x:number,y:number){if(!this.entered||this.photoMode||this.uiObscured||this.broadcastView)return;if(this.self?.dance)return;const rect=this.renderer.domElement.getBoundingClientRect();this.ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);
  if(this.catView){
   const cat=this.activeCat;
   if(cat&&this.ray.intersectObjects(cat.targets).length)this.visitAnimal(cat);
   return;
  }
  if(this.clickDanceSpot())return;
  this.selectedDanceHost=null;
  const hits=this.ray.intersectObjects([...(this.zone==='auditorium'?this.encoreTrain?.targets??[]:[]),...(this.venue.usher?.targets??[]),...(this.venue.portrait?[this.venue.portrait.surface]:[]),...(this.dishLayer()?.targets??[]),...(this.activeCat?.targets??[]),...this.venue.dog.targets,...(this.venue.stairArrows?.targets??[]),...this.venue.seatTargets,this.venue.portal,...this.venue.walkTargets],true);
  const hit=hits[0];
  if(!hit)return;
  if(hit.object.userData.trainSeat!==undefined){if(this.ridingTrain)this.net.send({type:'trainBoard',seat:hit.object.userData.trainSeat});return;}
  if(this.ridingTrain)return;
  if(hit.object.userData.mirrorStandingSpot){this.walkToMirror();return;}
  const boardingText=hit.object.userData.trainBoardSign&&hit.uv&&hit.uv.x>=.27&&hit.uv.x<=.73&&hit.uv.y>=.3&&hit.uv.y<=.7;
  if(hit.object.userData.trainBoardArrow||boardingText){
   this.boardTrain(hit.object.userData.trainBoardArrow===true);return;
  }
  if(hit.object.userData.galleryEntrance){this.goToHallPoint('upper');return;}
  if(hit.object.userData.ownDish){this.gestureAction(hit.object.userData.ownDish);return;}
  if(hit.object.userData.hallPortrait)return;
  if(hit.object.userData.usher){this.venue.usher?.greet(performance.now()/1000,USHER_LINES.ask);return;}
  if(hit.object.userData.queenCard){this.openQueenCardGame();return;}
  if(hit.object.userData.programBook){this.route=[];this.marker.visible=false;this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.onProgramBook();return;}
  const species=hit.object.userData.pettableAnimal;
  const pet=species==='dog'?this.venue.dog:species==='cat'?this.activeCat:null;
  if(pet){this.visitAnimal(pet);return;}
  if(hit.object.userData.loungeSeatId){this.sitInLobby(hit.object.userData.loungeSeatId);return;}
  if(hit.object.userData.cloakroom){this.visitWardrobe();return;}
  if(hit.object.userData.macaron||hit.object.userData.cafe){this.openCafeMenu();return;}
  if(hit.object.userData.candleTable){this.visitCandleTable(hit.object.userData.candleTable as CandleTable);return;}
  if(hit.object.userData.boxOffice){this.visitBoxOffice();return;}
  if(hit.object.userData.lobbyExit){this.changeZone();return;}let obj:T.Object3D|null=hit.object,seatId:string|undefined;while(obj){seatId=seatId??obj.userData.seatId;if(obj.userData.portal){if(this.zone==='lobby')this.walkToEntrance();else void this.changeZone();return;}obj=obj.parent;}
  if(seatId){void this.chooseSeat(seatId,isMagicChair(seatId));return;}
  if(this.pose==='sit'){this.stand();return;}
  const point={x:hit.point.x,y:surfaceHeight(this.zone,hit.point,hit.point.y)??hit.point.y,z:hit.point.z};
  // A tap on the stage lip, whose ray reaches the floor under the stage, walks to the front of the stage instead.
  if(this.zone==='auditorium'&&Math.abs(point.y??0)<.4&&point.z<STAGE_APRON_Z&&point.z>STAGE_APRON_Z-3)point.z=STAGE_APRON_Z+.3;
  // A tap beside a chair or table lands on furniture clearance: walk to the nearest free spot instead.
  if(!walkable(this.zone,point))for(let r=.15;r<=1.5&&!walkable(this.zone,point);r+=.15)for(let k=0;k<16;k++){const a=k/16*Math.PI*2,p={x:hit.point.x+Math.cos(a)*r,y:point.y,z:hit.point.z+Math.sin(a)*r};if(walkable(this.zone,p)){point.x=p.x;point.z=p.z;break;}}
  const path=findPath(this.zone,{x:this.position.x,y:this.position.y,z:this.position.z},point);if(!path){this.onToast('통로나 빈 바닥을 선택해 주세요.');return;}this.cancelSeat();this.route=path;this.marker.position.set(point.x,(point.y??0)+.035,point.z);this.marker.visible=true;
 }
 /** Give the roaming lobby pets space as visitors walk past. */
 private visitorStepClear(target:Point){
  if(this.zone!=='lobby')return true;
  const {cat,dog}=this.venue;
  return !(cat&&visitorBlocksStep(this.position,target,cat.root.position,PET_VISITOR_GAP))
   &&!(dog&&visitorBlocksStep(this.position,target,dog.root.position,PET_VISITOR_GAP));
 }
 private advanceRoute(target:Point){
  const h=surfaceHeight(this.zone,target,this.position.y);if(h!==null)target={...target,y:h};
  if(this.visitorStepClear(target)){this.position.set(target.x,target.y??0,target.z);return;}
  // Wait for the occupied route to clear; steering sideways can leave a stair flight.
 }
 correctMove(point:{x:number;y:number;z:number}){if(this.pose==='sit')return;this.position.set(point.x,point.y,point.z);this.pose='idle';this.route=[];this.marker.visible=false;this.collisionPauseUntil=performance.now()+350;this.sentAt=performance.now();}
 private sendPosition(now:number,force=false){if(this.self?.dance)return;if(this.ridingTrain||!this.entered||!this.self||this.pose==='sit')return;if(force||now-this.sentAt>(this.pose==='walk'?100:300)||this.lastPose!==this.pose){this.sentAt=now;this.lastPose=this.pose;this.net.send({type:'move',x:this.position.x,y:this.position.y,z:this.position.z,yaw:this.yaw,pose:this.pose});}}
 startConducting(){if(this.zone!=='auditorium'||!this.ready||this.entranceViewLocked)return;this.stopBroadcastView();this.conductView=this.concertView;this.concertView=true;this.route=[];this.pendingSeat=null;this.introUntil=0;this.input.keys.clear();this.conducting.start(performance.now());this.venue.scene.userData.conducting=true;
  if(this.self){this.demoAvatar=new Avatar(visitorColor(this.self),undefined,visitorVariant(this.self),this.self.outfit);this.demoAvatar.instrumentType='conductor';buildInstrument('conductor',this.demoAvatar.instrument,this.demoAvatar.leftHand,this.demoAvatar.rightHand);this.demoAvatar.root.position.set(CONDUCTOR.x,STAGE_FLOOR+.25,CONDUCTOR.z);this.demoAvatar.root.scale.setScalar(1.1);this.demoAvatar.settlePose(false);this.venue.scene.add(this.demoAvatar.root);}
  this.conductSeat=this.pose==='sit';this.guestConductor=new Avatar(0x272b2b,'conductor');this.guestConductor.instrumentType=undefined;this.guestConductor.root.position.copy(this.position);this.guestConductor.root.rotation.y=this.yaw;this.guestConductor.settlePose(this.conductSeat);this.venue.scene.add(this.guestConductor.root);
  this.conductEffect??=new ConductTapEffect(this.venue.scene);this.snapCamera();this.onChange();}
 endConducting(){this.conducting.stop();this.venue.scene.userData.conducting=false;this.demoAvatar?.root.removeFromParent();this.demoAvatar=null;this.guestConductor?.root.removeFromParent();this.guestConductor=null;this.conductEffect?.hide();this.concertView=this.conductView;this.input.keys.clear();this.snapCamera();this.onChange();}
 private snapCamera(){this.danceCameraGlide=false;this.updatePhotoLens();const f=this.cameraFrame();this.look.copy(f.look);this.camera.position.copy(f.position);this.camera.lookAt(this.look);}
 private resetEntranceView(){
  // Match the visitor's initial facing to forward movement down the aisle.
  this.yaw=0;
  this.cameraPitch=ENTRANCE_PITCH;
  this.cameraDistance=ENTRANCE_DISTANCE;
  this.introGlide=false;
  this.introEase=0;
 }
 private entranceCameraFrame(point:Point,walls:T.Object3D[],yaw=0,pitch=ENTRANCE_PITCH){
  // Put the visitor on the opposite side of the frame from the usher.
  // Keep the shoulder offset smaller on portrait screens.
  const shoulder=-T.MathUtils.lerp(.16,.30,T.MathUtils.smoothstep(this.camera.aspect,.65,1.4));
  const turn=Math.atan2(Math.sin(yaw),Math.cos(yaw));
  const forwardBlend=1-T.MathUtils.smoothstep(Math.abs(turn),.25,1.2);
  const orbitYaw=yaw+shoulder*forwardBlend;
  const orbitPitch=pitch+.20*forwardBlend;
  const frame=localCameraFrame({x:point.x,y:point.y??0,z:point.z},false,orbitYaw,orbitPitch,ENTRANCE_DISTANCE);
  const ceiling=GOLDEN_HALL.balconyHeight-.45;
  if(frame.position.y>ceiling){const t=(ceiling-frame.origin.y)/(frame.position.y-frame.origin.y);frame.position.lerpVectors(frame.origin,frame.position,Math.max(0,t));}
  const bounds=BOUNDS.auditorium;
  const delta=frame.position.clone().sub(frame.origin);let length=1;
  for(const [axis,min,max]of [['x',bounds.minX+.25,bounds.maxX-.25],['z',bounds.minZ+.25,GOLDEN_HALL.rear-.5]] as const){
   if(delta[axis]>0)length=Math.min(length,(max-frame.origin[axis])/delta[axis]);
   if(delta[axis]<0)length=Math.min(length,(min-frame.origin[axis])/delta[axis]);
  }
  frame.position.copy(frame.origin).addScaledVector(delta,Math.max(0,length));
  const position=constrainCamera(frame.origin,frame.position,walls);
  const view=frame.look.clone().sub(frame.position).applyAxisAngle(new T.Vector3(0,1,0),-shoulder*forwardBlend);
  const right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();
  // Leave visible, clickable aisle below both characters and above the HUD.
  view.applyAxisAngle(right,.19*forwardBlend);
  return {position,look:position.clone().add(view)};
 }
 private skipEntranceReveal=()=>{
  if(this.entranceRevealAt===null)return;
  this.entranceRevealAt=null;
  this.snapCamera();
  this.camera.updateMatrixWorld();
 };
 private updateEntranceReveal(now:number){
  if(this.entranceRevealAt===null)return;
  if(!this.entranceViewLocked||this.uiObscured||this.route.length||this.self?.dance||this.concertView||this.ridingTrain||this.photoMode||this.broadcastView){
   this.entranceRevealAt=null;
   return;
  }
  if(this.entranceRevealAt===Infinity){
   // Hold the stage framing under the loading fade so the pullback is visible in full.
   if(document.getElementById('boot-screen'))return;
   this.entranceRevealAt=now+ENTRANCE_STAGE_HOLD_MS;
  }
  this.entranceRevealProgress=T.MathUtils.clamp((now-this.entranceRevealAt)/ENTRANCE_REVEAL_MS,0,1);
  if(this.entranceRevealProgress===1)this.entranceRevealAt=null;
 }
 private entranceRevealFrame(entry:{position:T.Vector3;look:T.Vector3}){
  const progress=this.entranceRevealProgress,acceleration=.28,coast=1-acceleration;
  // Integrate a short acceleration and a longer coast; speed is continuous and
  // comes to rest before we hand the camera back to the walking view.
  const t=progress<acceleration
   ? progress-acceleration*Math.sin(Math.PI*progress/acceleration)/Math.PI
   : progress+coast*Math.sin(Math.PI*(progress-acceleration)/coast)/Math.PI;
  // An ultrawide window needs a closer stage shot to avoid empty side walls.
  // Keep a little more distance on narrow screens so the orchestra still fits.
  const aspect=this.camera.aspect;
  const landscapeZ=T.MathUtils.lerp(10,5.5,T.MathUtils.smoothstep(aspect,1.4,2.05));
  const openingZ=T.MathUtils.lerp(18,landscapeZ,T.MathUtils.smoothstep(aspect,.72,1.4));
  const opening=new T.Vector3(0,3.8,openingZ);
  const direction=new T.Vector3(0,4.8,-23).sub(opening).normalize();
  const landingDirection=entry.look.clone().sub(entry.position).normalize();
  const position=opening.lerp(entry.position,t);
  return {position,look:position.clone().add(direction.lerp(landingDirection,t).normalize())};
 }
 private resetCameraSway(now:number){
  this.cameraInputAt=now;
  this.cameraSwayBlend=0;
  this.cameraSwayTime=0;
 }
 private get cameraSway(){return Math.sin(this.cameraSwayTime/5)*.045*this.cameraSwayBlend;}
 private updateCameraSway(now:number,dt:number){
  const viewing=this.concertView
   ? !this.hallOverview&&this.stageLowView
   : this.pose==='sit'&&!!this.self?.seatId&&!this.firstPerson&&!this.mirrorView;
  if(!this.entered||this.zone!=='auditorium'||!viewing||this.photoMode||this.reduced||this.conducting.active||this.ridingTrain||this.entranceViewLocked){
   this.resetCameraSway(now);
   return;
  }
  if(this.input.pointerHeld||this.input.keys.size||this.input.touchMove.x||this.input.touchMove.z||this.route.length||this.uiObscured||this.changingZone){
   this.cameraInputAt=now;
  }
  const idle=now-this.cameraInputAt>=CAMERA_IDLE_DELAY;
  this.cameraSwayBlend=T.MathUtils.damp(this.cameraSwayBlend,idle?1:0,idle?1.6:9,dt);
  if(idle)this.cameraSwayTime=(this.cameraSwayTime+dt)%CAMERA_SWAY_PERIOD;
  else if(this.cameraSwayBlend<.001)this.cameraSwayTime=0;
 }
 private broadcastFrame(director:BroadcastCamera){
  const venue=this.venue;
  const actor=this.avatar?.root;
  const visitor=actor?.position??this.position;
  const target=(id:string,point:{x:number;y:number;z:number},height:number,azimuth:number,distance:number,lift:number):BroadcastTarget=>
   ({id,x:point.x,y:point.y+height,z:point.z,azimuth,distance,lift});
  const now=this.net.now();
  const travelTarget=(subject:BroadcastTarget,heading:number,middle:{x:number;y:number;z:number},end:{x:number;y:number;z:number}):BroadcastTarget=>{
   const minX=Math.min(subject.x,middle.x,end.x),maxX=Math.max(subject.x,middle.x,end.x);
   const minZ=Math.min(subject.z,middle.z,end.z),maxZ=Math.max(subject.z,middle.z,end.z);
   return {...subject,fixed:true,
    x:(minX+maxX)/2,z:(minZ+maxZ)/2,
    distance:Math.max(subject.distance,Math.hypot(maxX-minX,maxZ-minZ)*1.4+4),azimuth:heading+1.3,
   };
  };
  const ghostTarget=(ghost:GhostSpot):BroadcastTarget=>{
   if(ghost.costume==='white-rabbit'){
    const rabbit=target(ghost.id,ghost,1.12,0,10.5,2.8);
    return {...rabbit,fixed:()=>travelTarget(rabbit,ghost.yaw,whiteRabbitSpot(now/1000+2),whiteRabbitSpot(now/1000+4))};
   }
   if(ghost.angel)return {...target(ghost.id,ghost,1.15,ghost.yaw+.55,7.2,1.55),fixed:true};
   return target(ghost.id,ghost,ghost.sitting?1.02:1.15,ghost.yaw+(ghost.sitting?.55:.17),3.1,ghost.sitting?1.12:.52);
  };
  const ghosts=this.ghostBuffer.map(ghostTarget);
  const usher=venue.usher?.avatar.root;
  if(usher)ghosts.push(target('usher',usher.position,1.1,usher.rotation.y+Math.PI,3.25,.56));

  this.broadcastEventGhosts=[...this.playfulGhosts()];
  const events:BroadcastTarget[]=this.broadcastEventGhosts.map(ghost=>ghost.id==='pendulum-rider'&&this.encoreClock
   ? {...target(ghost.id,this.encoreClock.root.position,-3,Math.PI,9.5,.7),fixed:true}
   : {...target(ghost.id,{x:-8,y:TRAIN_PLATFORM.y,z:TRAIN_PLATFORM.z-10.5},3.7,Math.atan2(8,-34),35,3),fixed:true});
  const visitors=this.net.state?.visitors??[];
  for(const dancer of visitors){
   const dance=dancer.dance;
   if(dancer.zone!==this.zone||!dance||dance.role===1)continue;
   const pose=this.visitorDancePose(dancer,now);
   const partner=visitors.find(v=>v.id===dance.partnerId)??this.danceNpcs.find(v=>v.id===dance.partnerId);
   const other=partner?.dance&&this.visitorDancePose(partner,now);
   const center=other?{x:(pose.x+other.x)/2,y:(pose.y+other.y)/2,z:(pose.z+other.z)/2}:pose;
   events.push({...target('dance-'+dancer.id,center,1,pose.yaw+Math.PI+.72,other?4.4:3.65,1.35),fixed:true});
  }

  const conductor=venue.musicians.find(m=>m.instrumentType==='conductor')?.root.position;
  const conductorInView=conductor&&conductor.x>-STAGE.wallX+.35;
  const performer={...(JAZZ_HALL?JAZZ_VOCALIST:CONDUCTOR),y:STAGE_FLOOR};
  const podium=target('podium',performer,1.04,JAZZ_HALL?-.45:1.9,JAZZ_HALL?3.1:5.5,JAZZ_HALL?.45:1.55);
  if(!JAZZ_HALL){
   const playback=this.audio.playback;
   const cue=playback.playing?playback.track.stage:undefined;
   if(cue==='tuning'){
    const leader=venue.musicians.find(m=>m.root.userData.concertmaster)?.root.position;
    if(leader)events.push(target('tuning',leader,1.02,-.55,3.3,.95));
   }else if(conductorInView&&(cue==='entrance'||cue==='farewell')){
    events.push({...target(cue,{x:-6,y:STAGE_FLOOR,z:CONDUCTOR.z},1.25,.08,18,3.4),fixed:true});
   }else if(conductorInView&&cue==='applause'){
    events.push({...podium,id:cue});
   }
  }
  for(const guest of visitors){
   const gesture=guest.gesture;
   if(guest.zone!==this.zone||guest.dance||!gesture||gesture==='eat'||gesture==='drink')continue;
   const age=(now-guest.gestureAt)/1000;
   if(age<0||age>gestureSeconds(gesture)-1.2)continue;
   const avatar=guest.id===this.net.selfId?actor:this.remotes.get(guest.id)?.avatar.root;
   if(!avatar?.visible)continue;
   events.push({...target('reaction-'+guest.id+'-'+guest.gestureAt,avatar.position,1.1,
    avatar.rotation.y+Math.PI+.45,guest.pose==='walk'?5.5:3.45,.65),fixed:true,reaction:true});
  }

  const details:BroadcastTarget[]=[];
  const {mirror,portrait,programBook}=venue;
  if(mirror)details.push(target('mirror',mirror.root.position,0,-Math.PI/2,4.2,.32));
  if(portrait)details.push(target('portrait',portrait.root.position,0,Math.PI/2,4.1,.12));
  if(programBook)details.push(target('program-book',programBook.root.position,1.17,-.5,1.85,.72));
  const candles=CANDLE_TABLES[0];
  details.push(target('candles',{...candles,y:candles.approach.y},1.06,.18,2.7,1.1));
  if(this.encoreClock)details.push(target('clock',this.encoreClock.root.position,-1.1,Math.PI,9.2,.7));
  if(this.encoreTrain){
   const position=this.playfulPosition;
   const yaw=this.encoreTrain.seat(0,position);
   const train=this.encoreTrain;
   const middleCar=target('train',position,.92,0,12,3.5);
   details.push({...middleCar,fixed:()=>travelTarget(middleCar,yaw+Math.PI,
    train.middleCarPosition(now/1000+2.5,new T.Vector3()),train.middleCarPosition(now/1000+5,new T.Vector3()))});
  }
  for(const [id,row,azimuth] of [['tea-party',TEA_TABLE,0],['wish-tarot',TAROT_HOST_SEAT.row,2.25],['queen-table',QUEEN_SEAT.row,-.53]] as const){
   const table=DINNER_TABLES[row-1];
   const seat=FLOOR_SEATS.find(seat=>seat.row===row)!;
   details.push(target(id,{...table,y:seat.y},1.13,azimuth,3.5,1.8));
  }
  const chair=MAGIC_CHAIR_SEAT;
  details.push(target('magic-chair',chair,.63,chair.yaw+1.1,2.45,1.04));
  const diner=visitors.find(v=>v.zone===this.zone&&v.pose==='sit'&&(v.dish||v.drink));
  const diningSeat=diner?.seatId&&DINNER_SEATS_BY_ID.get(diner.seatId);
  if(diningSeat)details.push(target('dining-'+diningSeat.id,diningSeat,.99,diningSeat.yaw+Math.PI+.4,3,1.45));

  const transition=venue.scene.userData.hallTransition as import('./scene/HallTransition').HallTransition|undefined;
  return director.frame(performance.now()/1000,{
   aspect:this.camera.aspect,reduced:this.reduced,space:this.spaceVisible,walls:venue.cameraWalls,
   visitor:target('visitor',visitor,this.pose==='sit'?1.05:1.1,(actor?.rotation.y??this.yaw)+Math.PI,3.4,.52),
   podium,ghosts,details,events,saturn:transition?.broadcastSaturn(this.broadcastSaturn),
  });
 }
 private readonly broadcastSaturn=new T.Vector3();

 private cameraFrame(){
  const cat=this.catView?this.activeCat:null;
  if(cat){
   const look=cat.root.position.clone();
   look.y+=.38;
   const yaw=cat.root.rotation.y;
   const x=Math.sin(yaw),z=Math.cos(yaw);
   // A close three-quarter view keeps the cat visible above the nearby chairs.
   const eye=look.clone();
   eye.x+=-1.35*x+.95*z;
   eye.y+=.95;
   eye.z+=-1.35*z-.95*x;
   return {look,position:constrainCamera(look,eye,this.venue.cameraWalls)};
  }
  if(this.broadcastCamera)return this.broadcastFrame(this.broadcastCamera);
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
  if(this.mirrorView&&!this.firstPerson&&this.zone==='auditorium'&&this.venue.mirror){
   const point=this.venue.mirror.standingPoint;
   const origin=point.clone().add(new T.Vector3(0,1.2,0));
   const look=point.clone().add(new T.Vector3(.95,1.48,0));
   const desired=point.clone().add(new T.Vector3(-3.85,3.2,-.85));
   return {look,position:constrainCamera(origin,desired,this.venue.cameraWalls)};
  }
  const dance=this.self?.dance;
  if(dance){
   const center=dance.center??(dance.chair?this.visitorDancePose(this.self!,this.net.now()):this.position);
   return danceCameraFrame(center,this.cameraYaw,this.cameraPitch,d,!!dance.center,this.venue.cameraWalls);
  }
  if(this.entranceViewLocked){
   const entry=this.entranceCameraFrame(this.position,this.venue.cameraWalls,this.cameraYaw,this.cameraPitch);
   return this.entranceRevealAt===null?entry:this.entranceRevealFrame(entry);
  }
  if(this.zone==='auditorium'&&this.concertView){
   const preset=this.hallOverview?HALL_CAMERA:this.stageLowView?{eye:[0,1.6,-2] as const,look:[0,5.2,-23] as const}:CONCERT_CAMERA,center=new T.Vector3(...preset.look),offset=new T.Vector3(...preset.eye).sub(center);
   const portrait=this.camera.aspect<.8;
   const aspectZoom=this.hallOverview&&!portrait?1:Math.min(portrait?2.2:1.3,Math.max(1,1.65/this.camera.aspect));
   offset.multiplyScalar(aspectZoom*(this.hallOverview?1:this.hallZoom));
   const position=center.clone().add(offset);
   if(this.hallOverview){
    // The opening view is the rear limit. Move toward the stage at a fixed height.
    const rear=Math.min(position.z,GOLDEN_HALL.rear-2);
    position.z=T.MathUtils.lerp(center.z,rear,this.hallZoom);
   }
   const lowStage=!this.hallOverview&&this.stageLowView;
   if(lowStage){
    position.y=1.6;
    // Match the gentle sideways motion of the conducting camera.
    position.x+=this.cameraSway*Math.min(offset.z,26);
   }
   position.x=T.MathUtils.clamp(position.x,-13.8,13.8);position.y=T.MathUtils.clamp(position.y,1.2,GOLDEN_HALL.height-1.2);position.z=Math.min(position.z,GOLDEN_HALL.rear-2);
   // Turn the head where the camera stands: sideways about the vertical, then up or down.
   const view=center.clone().sub(position).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw),right=new T.Vector3().crossVectors(view,new T.Vector3(0,1,0)).normalize();
   view.applyAxisAngle(right,-(this.cameraPitch-.13));
   return {look:position.clone().add(view),position};
  }
  const framingAngle=Math.atan(Math.tan(T.MathUtils.degToRad(this.camera.fov/2))/3);
  if(this.firstPerson){
   // Keep the ordinary walk steady and follow a small fraction of the lunar hop.
   const position=new T.Vector3(this.position.x,this.position.y+1.303+.10*sitting+this.lunarLift*.2,this.position.z);
   const pitch=T.MathUtils.clamp(this.cameraPitch-framingAngle,-1.5,1.5),forward=Math.cos(pitch);
   look.copy(position).add(new T.Vector3(-Math.sin(this.cameraYaw)*forward,-Math.sin(pitch),-Math.cos(this.cameraYaw)*forward));
   return {position,look};
  }
  const dinnerSeat=this.zone==='auditorium'&&this.pose==='sit'&&this.self?.seatId?DINNER_SEATS_BY_ID.get(this.self.seatId):undefined;
  const yaw=this.cameraYaw+this.cameraSway;
  const local=dinnerSeat
   ? dinnerCameraFrame(this.position,dinnerSeat,DINNER_TABLES[dinnerSeat.row-1],yaw,this.cameraPitch,d,this.camera.aspect,this.camera.fov)
   : localCameraFrame(this.position,sitting,yaw,this.cameraPitch,d);
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
  for(const v of this.net.state?.visitors??[])if(v.dance&&v.zone===this.zone){const p=this.visitorDancePose(v,now);put(this.headTop.set(p.x,p.y+1.9,p.z),'danceNote',.85,1,26);}
  const me=this.avatar;
  if(this.entered&&me?.root.visible&&me.icon){me.head.getWorldPosition(this.headTop);this.headTop.y+=.48*me.root.scale.y;put(this.headTop,me.icon,me.iconAlpha,(now-this.gestureAt)/1000,26);}
  // Other visitors are ghosts: same anchor as their name tag (see VisitorNames).
  for(const r of this.remotes.values()){const v=r.visitor;if(!r.avatar.root.visible||!v.gesture)continue;const age=(now-v.gestureAt)/1000;
   put(ghostTop(r.avatar.root,v.pose==='sit',this.headTop),GESTURE_ICON[v.gesture],gestureWeight(v.gesture,age),age,26);}
  // The hall's own ghosts have no name: the icon floats right above the head.
  for(const g of this.ghostBuffer)if(g.gesture)put(this.headTop.set(g.x,g.y+1.78,g.z),GESTURE_ICON[g.gesture],gestureWeight(g.gesture,g.age??0),g.age??0,0);
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
  if(this.disposed)return;
  this.frame=requestAnimationFrame(this.animate);const now=performance.now();if(document.hidden){this.last=now;this.renderedAt=0;return;}if(this.graphicsRestorePending)this.restoreGraphics();if(this.graphicsLost){this.last=now;this.renderedAt=0;return;}const rate=this.frameBudget(),interval=1000/rate;if(now-this.renderedAt<interval)return;this.renderedAt=interval?now-((now-this.renderedAt)%interval):now;const elapsed=(now-this.last)/1000,dt=Math.min(.1,elapsed);this.last=now;this.frames++;this.statsTime+=elapsed;if(this.statsTime>.7){this.fps=Math.round(this.frames/this.statsTime);this.frames=0;this.statsTime=0;}
  const workStart=this.diagnosticActive?performance.now():0;
  if(this.diagnosticActive&&this.diagnosticMode==='audio-only'){this.frameCost={at:now,cpu:0,submit:0};if(now-this.lastUI>500){this.lastUI=now;this.onChange();}return;}
  const timings:FrameTimings|undefined=this.onDiagnosticFrame
   ? {musicianAnimation:0,musicianBatch:0,crowdBatch:0,fireworksUpdate:0,sceneRender:0,postProcessing:0}
   : undefined;
  this.encoreTrain?.update(this.net.now()/1000,this.zone==='auditorium',this.reduced);
  this.venues.auditorium?.magicChair?.update(this.net.state?.magicChair,this.net.now());
  const movementLocked=this.self?.dance||this.photoMode||this.ridingTrain||this.uiObscured||this.queenWand.casting||this.queenWand.receiving;
  if(this.petVisit&&(this.petVisit.route!==this.route||now>=this.petVisit.expiresAt||this.net.status!=='connected'))this.clearPetInteraction();
  if(this.pettingAnimal&&now>=this.petUntil)this.pettingAnimal=null;
  if(movementLocked){this.clearPetInteraction();this.input.keys.clear();this.input.touchMove.x=this.input.touchMove.z=0;this.route=[];}
  const lunarGallery=this.onLunarGallery;
  const lunarWalk=lunarGallery&&!this.reduced&&!movementLocked&&!this.changingZone&&!this.conducting.active;
  const stepPhase=this.lunarStride%1;
  const strideDelta=dt/LUNAR_STEP_SECONDS;
  const airborne=stepPhase>0&&stepPhase<LUNAR_LANDING;
  let gliding=false;
  let steering=false;
  let speed=0;const keys=this.input.keys;let kx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+this.input.touchMove.x;let kz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+this.input.touchMove.z;
  if(this.broadcastView&&(kx||kz))this.stopBroadcastView();
  if(this.catView&&(kx||kz))this.stopCatView();
  if(this.entered&&this.net.status==='connected'){
   // Automatically enter only after 30 seconds without activity.
   if(this.zone!=='lobby')this.lobbyEnteredAt=0;
   else if(kx||kz||this.route.length||this.uiObscured||this.photoMode||this.catView||document.hidden)this.lobbyEnteredAt=now;
   else if(!this.lobbyEnteredAt)this.lobbyEnteredAt=now;
   else if(now-this.lobbyEnteredAt>=30000&&!this.changingZone&&!this.uiObscured&&!document.hidden){this.lobbyEnteredAt=now;void this.changeZone();}
   if(now<this.collisionPauseUntil)kx=kz=0;
   if((kx||kz)&&this.pose==='sit')this.stand();
   const previous=this.position.clone();
   const moveTime=dt*(lunarGallery?LUNAR_SPEED_SCALE:1);
   steering=!!(kx||kz);
   gliding=lunarWalk&&!steering&&!this.route.length&&this.pose!=='sit'&&now>=this.collisionPauseUntil&&airborne&&this.lunarVelocity.lengthSq()>0;
   if(steering||gliding){
    const candidate=this.position.clone();
    if(steering){
     this.route=[];
     this.cancelSeat();
     const direction=new T.Vector3(kx,0,kz).clampLength(0,1).applyAxisAngle(new T.Vector3(0,1,0),this.cameraYaw);
     candidate.addScaledVector(direction,4.2*moveTime);
    }else{
     // Keep the last clear direction and taper the remaining drift toward touchdown.
     const glideTime=Math.min(dt,(LUNAR_LANDING-stepPhase)*LUNAR_STEP_SECONDS);
     const remaining=1-(stepPhase+glideTime/(2*LUNAR_STEP_SECONDS))/LUNAR_LANDING;
     candidate.addScaledVector(this.lunarVelocity,glideTime*remaining);
    }
    const move=(x:number,z:number)=>{const y=surfaceHeight(this.zone,{x,z},this.position.y);if(y===null)return false;const target={x,y,z};if(!segmentClear(this.zone,this.position,target)||!this.visitorStepClear(target))return false;this.position.set(x,y,z);return true;};
    // Slide along architecture while preserving the cat’s clearance.
    const candidateY=surfaceHeight(this.zone,candidate,this.position.y);
    if((candidateY===null||this.visitorStepClear({x:candidate.x,y:candidateY,z:candidate.z}))&&!move(candidate.x,candidate.z)){if(!move(candidate.x,this.position.z))move(this.position.x,candidate.z);}
    if(lunarWalk&&steering)this.lunarVelocity.subVectors(this.position,previous).setY(0).divideScalar(Math.max(dt,.001));
    if(gliding&&this.position.equals(previous))this.lunarVelocity.set(0,0,0);
   }else if(this.route.length&&this.pose!=='sit'){
    const p=this.route[0],d=distance(this.position,p);
    if(d<.035){if(this.visitorStepClear(p)){this.position.set(p.x,p.y??0,p.z);this.route.shift();}}else{const step=Math.min(d,5.1*moveTime);this.advanceRoute({x:this.position.x+(p.x-this.position.x)/d*step,z:this.position.z+(p.z-this.position.z)/d*step,y:this.position.y+((p.y??0)-this.position.y)/d*step});
     // Follow the currently connected lobby floor, flight or balcony.
     {const h=surfaceHeight(this.zone,this.position,this.position.y);if(h!==null)this.position.y=h;}}
    if(!this.route.length){
     this.marker.visible=false;this.pose='idle';
     if(this.route===this.boardingRoute){this.boardingRoute=null;this.boardTrain();}
     else if(this.reservedSeat&&!this.seating){this.seating=true;this.sendPosition(now,true);this.net.send({type:'seated',seatId:this.reservedSeat});}
    }
   }
   const visit=this.petVisit;
   if(visit&&!this.route.length&&distance(this.position,visit.animal.approach)<.15){
    this.petVisit=null;
    this.pettingAnimal=visit.animal;this.petUntil=now+2600;visit.animal.pet(now/1000);
    if(visit.animal.species==='dog'){
     this.audio.bark();this.onToast('강아지가 멍멍 짖으며 꼬리를 흔들어요.');
    }else{
     this.audio.meow();this.onToast('고양이가 눈을 감고 기분 좋게 꼬리를 흔들어요.');
    }
    this.pose='idle';this.sentAt=0;
   }
   if(this.loungeTarget&&!this.route.length){const seat=LOUNGE_SEATS.find(s=>s.id===this.loungeTarget);this.loungeTarget=null;if(seat&&distance(this.position,seat.approach)<.12){this.pose='idle';this.sendPosition(now,true);this.net.send({type:'loungeSit',seatId:seat.id});}}
   if(this.visitingBoxOffice&&this.zone==='lobby'&&distance(this.position,BOX_OFFICE_APPROACH)<.12){this.visitingBoxOffice=false;this.route=[];this.marker.visible=false;this.pose='idle';this.onSeatMap();}
   speed=previous.distanceTo(this.position)/Math.max(dt,.001);if(this.pose!=='sit'){this.pose=speed>.015?'walk':'idle';if(speed>.015)this.yaw=Math.atan2(-(this.position.x-previous.x),-(this.position.z-previous.z));}
   const wardrobeDistance=this.zone==='lobby'&&Math.abs(this.position.y)<.3?Math.hypot(this.position.x-CLOAKROOM_APPROACH.x,this.position.z-CLOAKROOM_APPROACH.z):Infinity;
   if(wardrobeDistance>1.8)this.wardrobeNear=false;
   if(!this.uiObscured&&wardrobeDistance<(this.visitingWardrobe ? .2 : .9)&&!this.wardrobeNear){this.openWardrobe();speed=0;}
   if(this.pettingAnimal){this.pettingAnimal.petPoint(this.petFocus);this.yaw=Math.atan2(this.position.x-this.petFocus.x,this.position.z-this.petFocus.z);this.pose='idle';speed=0;}
   if(this.reservedSeat&&this.pose!=='sit'&&now-this.renewAt>5000){this.net.send({type:'renew',seatId:this.reservedSeat});this.renewAt=now;}
   this.sendPosition(now);
   // Walking through the amphitheatre door at the head of the flight enters the hall.
   if(this.zone==='lobby'&&Math.abs(this.position.y-GRAND_STAIR.rise)<.3&&this.position.z>=HALL_INNER_DOOR.approachZ-.02&&this.position.z<HALL_INNER_DOOR.z&&Math.abs(this.position.x)<HALL_INNER_DOOR.halfWidth)void this.changeZone(true);
  }
  if(this.pose==='sit'&&this.seatedTarget)this.position.lerp(this.seatedTarget,1-Math.exp(-dt*7));
  const mirror=this.venue.mirror;
  const mirrorDistance=mirror?this.position.distanceTo(mirror.standingPoint):Infinity;
  const nearMirror=mirrorDistance<.29;
  const nearLanding=!!mirror&&!this.mirrorHintSeen&&Math.abs(this.position.y-mirror.standingPoint.y)<.6
   &&this.position.z>=mirror.standingPoint.z-6&&mirrorDistance>4;
  if(this.nearMirrorLanding!==nearLanding){
   this.nearMirrorLanding=nearLanding;this.onChange();
  }
  if(!nearMirror||this.route.length||kx||kz||this.pose==='sit'||this.ridingTrain){
   this.onMirrorSpot=false;this.mirrorView=false;
  }else if(!this.onMirrorSpot&&this.entered&&this.net.status==='connected'&&!this.uiObscured&&!this.photoMode&&!this.self?.dance){
   this.onMirrorSpot=true;this.mirrorView=true;
   this.rememberMirrorHint();
   this.concertView=false;this.entranceFraming=false;this.introUntil=0;this.introEase=0;this.introGlide=false;
   this.cameraYaw=-Math.PI/2;this.cameraPitch=.35;this.cameraDistance=4.4;
   this.pose='idle';this.yaw=-Math.PI/2;
   this.sendPosition(now,true);this.onChange();
  }
  mirror?.updateStandingMarker(now/1000,this.onMirrorSpot,mirrorDistance);
  const music=this.audio.playback.playing&&!this.reduced;
  // Dust and shimmer hold still for visitors who prefer reduced motion.
  this.venue.storyTableProps?.update(this.net.now()/1000,this.net.state?.visitors??[],this.reduced);
  this.venue.treeStar?.update(this.reduced?0:now/1000);this.venue.sunlight?.update(this.reduced?0:now/1000);this.venue.stairArrows?.update(this.reduced?0:now/1000);
  this.updateHallGhosts();
  this.updateHighFives(this.net.now());
  this.venue.usher?.update(now/1000,dt,this.reduced,this.highFives.get(USHER_HIGH_FIVE_ID));
  this.venue.cat?.update(now/1000,this.entered?this.position:new T.Vector3(Infinity,0,0),this.reduced,[...this.remotes.values()].filter(r=>r.visitor.zone===this.zone).flatMap(r=>[r.visitor,r.avatar.root.position]));
  if(this.ridingTrain&&this.encoreTrain){this.seatedTarget=null;this.yaw=this.encoreTrain.seat(this.self!.trainSeat!,this.position);}
  if(!lunarWalk||(!steering&&!gliding))this.lunarVelocity.set(0,0,0);
  const lunarPose=lunarWalk&&this.entered&&this.pose!=='sit';
  // Finish the current hop on release without starting another one.
  const landing=airborne&&stepPhase+strideDelta<LUNAR_LANDING;
  this.lunarStride=lunarPose&&((speed>.015&&!gliding)||landing)?(this.lunarStride+strideDelta)%2:0;
  const air=Math.min(1,this.lunarStride%1/LUNAR_LANDING);
  this.lunarLift=4*LUNAR_HOP_HEIGHT*air*(1-air);
  let reflectedDance:GhostSpot['dance'];
  if(this.avatar){
   const clock=this.net.now(),gestureAge=(clock-this.gestureAt)/1000;
   const sip=this.zone==='auditorium'&&this.gesture==='drink'&&gestureAge<gestureSeconds('drink');
   const seated=this.ridingTrain||this.pose==='sit';
   this.avatar.holdingCoffee=this.zone==='lobby'&&this.coffee||sip&&this.drink==='coffee';
   this.avatar.holdingTea=sip&&this.drink==='tea';
   this.avatar.holdingWine=sip&&this.drink==='wine';
   this.avatar.holdingMacaron=this.zone==='lobby'&&this.macaron;
   this.avatar.holdingBouquet=!!this.wishFlowerCard&&!(this.avatar.holdingMacaron&&this.gesture==='eat'&&gestureAge<gestureSeconds('eat'));
   this.avatar.macaronBites=this.net.state?.visitors.find(v=>v.id===this.net.selfId)?.macaronBites??0;
   this.avatar.root.position.copy(this.position);
   // The visual hop leaves the walkable floor position intact for routing and presence.
   this.avatar.root.position.y+=this.lunarLift;

   const dx=this.position.x-this.camera.position.x,dz=this.position.z-this.camera.position.z;
   const cameraYaw=Math.atan2(dx,dz);
   this.avatar.root.rotation.y=this.photoMode?(this.photoComposition==='current'?this.photoOriginal.avatarYaw:cameraYaw):this.yaw;
   if(this.pose==='sit'){const chair=magicChairPose(this.self?.seatId,this.net.state?.magicChair,this.net.now());this.avatar.root.position.x+=chair.x;this.avatar.root.position.z+=chair.z;this.avatar.root.rotation.y+=chair.turn;}
   let cameraFacing;
   const highFive=this.self?this.highFives.get(this.self.id):undefined;
   const gesture=highFive?null:this.gesture;
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
   this.avatar.wishing=this.wishing;
   this.avatar.trainPassenger=this.ridingTrain;
   const dancer=this.danceVisitor;
   const dance=dancer?.dance?this.visitorDancePose(dancer,clock,true):null;
   const lunarSwing=lunarPose?Math.sin(Math.PI*this.lunarStride)*.86:undefined;
   this.avatar.update(clock/1000,speed,dance?.chair?1-dance.chairStand:seated,music,dance?.chair?null:gesture,gestureAge,dt,cameraFacing,!!dance?.captain,lunarSwing);
   if(highFive){
    const useLeft=this.avatar.holdingCoffee&&!this.avatar.holdingMacaron&&!this.avatar.holdingCandle&&!this.avatar.holdingBouquet;
    this.avatar.highFive(highFive,useLeft?'left':'right');
   }
   if(dance){
    poseDancingAvatar(this.avatar,dance);
    reflectedDance=dance;
   }
   if(this.wishFlowerCard){
    const leftTable=this.wishFlowerSeat!==null&&(!this.atWishTarotTable||this.self?.seatId!==this.wishFlowerSeat);
    if(leftTable){this.wishFlowerSeat=null;this.npcBehavior.cancelWishFlower();}
    this.venues.auditorium?.storyTableProps?.wishFlower.update(clock/1000,this.avatar.leftHand,this.reduced||leftTable,this.avatar.holdingBouquet,this.avatar.root.position,this.zone);
    if(!this.wishFlowerCard)this.onChange();
   }
   if(this.queenWand.casting&&!seated&&dx*dx+dz*dz>.04)this.avatar.root.rotation.y=cameraYaw;
   this.avatar.root.visible=this.entered;
   if(this.pettingAnimal)this.avatar.pet(this.pettingAnimal.petPoint(this.petFocus),now/1000,this.reduced);
  }
  this.camera.updateMatrixWorld();this.poseFrustum.setFromProjectionMatrix(this.poseProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  for(const r of this.remotes.values()){
   const v=r.visitor;if(v.dance){const p=this.visitorDancePose(v,this.net.now());r.avatar.root.visible=v.zone===this.zone;r.avatar.root.position.set(p.x,p.y+p.bob,p.z);r.avatar.root.rotation.y=p.yaw;continue;}if(v.trainSeat!==undefined&&v.zone==='auditorium'&&this.encoreTrain){r.avatar.root.visible=this.zone==='auditorium';r.avatar.root.rotation.y=this.encoreTrain.seat(v.trainSeat,r.avatar.root.position);continue;}r.avatar.holdingCoffee=v.zone==='lobby'&&v.coffee===true;r.avatar.holdingMacaron=v.zone==='lobby'&&v.macaron===true;r.avatar.macaronBites=v.macaronBites??0;r.avatar.root.visible=v.zone===this.zone;if(!r.avatar.root.visible)continue;
   this.poseCenter.set(v.x,(v.y??0)+.8,v.z);const visible=this.poseFrustum.intersectsSphere(this.poseSphere.set(this.poseCenter,1.5));
   const distanceSq=this.camera.position.distanceToSquared(this.poseCenter),interval=!visible?250:distanceSq>400?100:1000/30;
   if(now-r.poseAt<interval)continue;const poseDt=Math.min(.25,(now-r.poseAt)/1000);r.poseAt=now;
   // Hidden visitors keep their collision position, but have no skeleton/gesture work to render.
   if(!visible){r.avatar.root.position.set(v.x,v.y??0,v.z);continue;}
   this.poseCenter.y=v.y??0;r.avatar.root.position.lerp(this.poseCenter,1-Math.exp(-poseDt*12));
   const dy=T.MathUtils.euclideanModulo(v.yaw-r.avatar.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;r.avatar.root.rotation.y+=dy*(1-Math.exp(-poseDt*12));
  }
  if(this.zone==='auditorium'){
   if(this.danceCircles.mesh.parent!==this.venue.scene)this.venue.scene.add(this.danceCircles.mesh);
   const visitors=this.net.state?.visitors??[];
   const now=this.net.now();
   this.danceCircles.update(visitors,now,this.reduced,this.danceNpcs);
   const nearby=this.entered&&this.net.status==='connected'&&!this.net.local&&!this.self?.dance&&!this.photoMode&&!this.uiObscured
    &&!this.conducting.active&&!this.queenWand.casting&&!this.queenWand.receiving&&!this.queenWand.charges&&!this.wishFlowerCard
    &&this.pose!=='sit'&&!this.ridingTrain?this.openDanceSpotAt(this.position):undefined;
   if(nearby&&this.selectedDanceHost===nearby.id){
    this.selectedDanceHost=null;
    this.danceAction({type:'danceJoin',targetId:nearby.id});
   }
  }else this.danceCircles.mesh.visible=false;
  this.showEmotes();
  {const layer=this.dishLayer();if(layer){const self=this.net.selfId;const now=this.net.now(),busy=(v:Visitor,g:Gesture)=>v.gesture===g&&now-v.gestureAt<gestureSeconds(g)*1000;layer.update((this.net.state?.visitors??[]).filter(v=>v.zone==='auditorium').map(v=>({id:v.id,seatId:v.seatId,dish:v.dish,dishBites:v.dishBites,drink:v.drink,drinkSips:v.drinkSips,teaFill:v.drink==='tea'?T.MathUtils.clamp((now-((v.teaReadyAt??0)-4600))/3200,0,1):1,own:v.id===self,eating:busy(v,'eat'),sipping:busy(v,'drink')})));
   if(this.avatar){const me=this.net.state?.visitors.find(v=>v.id===self);this.avatar.diningBite=me?.dish?BITE_COLOUR[me.dish]:null;}}}
  this.conducting.tick(now);if(this.conducting.active){this.guestConductor?.update(now/1000,0,this.conductSeat,false,null,10,dt);this.input.keys.clear();const actor=this.demoAvatar,demo=this.conducting;if(actor){actor.update(now/1000,0,false,demo.stroking&&!this.reduced,null,10,dt);actor.root.position.x=T.MathUtils.damp(actor.root.position.x,CONDUCTOR.x+conductorShift(demo.x),12,dt);actor.root.rotation.y=T.MathUtils.damp(actor.root.rotation.y,conductorTurn(demo.x),12,dt);actor.head.rotation.set(-.06,Math.atan(demo.x*.2),0);actor.leftArm.rotation.set(1.05+.38*Math.sin(now*.0026),0,-.38-.06*Math.abs(demo.x)+.43*Math.sin(now*.0024));actor.rightArm.rotation.copy(rightStroke(demo.x,demo.stroke));actor.root.updateMatrixWorld(true);this.conductEffect?.update(actor.rightHand,this.camera,demo.pulse);}}
  const fireworksStart=timings?performance.now():0;
  this.fireworks?.update(now/1000,this.zone==='auditorium'&&this.entered&&!this.reduced,this.poseFrustum,!this.spaceVisible);
  if(timings)timings.fireworksUpdate=performance.now()-fireworksStart;
  const playback=this.audio.playback;
  const concertSeconds=this.net.now()/1000,hallActive=this.zone==='auditorium'&&this.entered;
  this.encoreClock?.update(now/1000,playback,this.camera,hallActive,this.reduced,concertSeconds);
  this.hallDust?.update(concertSeconds,hallActive&&!this.reduced);
  this.musicLights?.update(now/1000,dt,this.zone==='auditorium'&&this.entered&&!this.reduced,this.audio);
  this.updateCandles(now);this.updateCoffee(now);
  if(now-this.orchestraAt>=1000/30){
   const animationStart=timings?performance.now():0;
   const animationDt=Math.min(.15,(now-this.orchestraAt)/1000);this.orchestraAt=now-((now-this.orchestraAt)%(1000/30));const show=stageShow(playback);
   const clock=this.reduced?0:this.audio.usesMediaClock?playback.offset:concertSeconds;
   for(const actor of this.venue.musicians){
    this.poseCenter.copy(actor.root.position);this.poseCenter.y+=1;const inView=this.poseFrustum.intersectsSphere(this.poseSphere.set(this.poseCenter,2));
    const conductor=actor.instrumentType==='conductor',poseAt=actor.root.userData.poseAt??0,actorDt=Math.min(.25,Math.max(animationDt,(now-poseAt)/1000));
    // The conductor also travels across the stage; keep his route live when the camera looks away.
    if(!conductor&&!inView)continue;
    const actorInterval=musicianInterval(projectedHeight(1.4,this.camera.position.distanceTo(this.poseCenter),this.camera.projectionMatrix.elements[5]));
    // Keep readable players at 30Hz, including zoomed views; only tiny figures use 20Hz.
    if(!conductor&&now-poseAt<actorInterval)continue;actor.root.userData.poseAt=now;
    if(this.conducting.active){
     if(conductor)continue;
     actor.update(this.reduced?0:concertSeconds,0,musicianSits(actor.instrumentType),!this.reduced,null,10,actorDt);
     const turn=faceYaw(CONDUCTOR.x-actor.root.position.x,CONDUCTOR.z-actor.root.position.z)-actor.root.rotation.y;
     actor.head.rotation.y=Math.atan2(Math.sin(turn),Math.cos(turn));
     actor.head.rotation.x=-.08;
     continue;
    }
    if(actor.instrumentType==='conductor'){const c=show.conductor;actor.root.position.set(c.x,c.y,c.z);actor.root.rotation.y=c.yaw;actor.update(clock,c.walking?1.2:0,false,show.orchestraPlays&&!this.reduced,c.bowAge===null?null:'bow',c.bowAge??10,actorDt);continue;}
    if(actor.root.userData.concertmaster){actor.update(clock,0,!show.concertmasterStands,(show.concertmasterPlays||show.orchestraPlays)&&!this.reduced,null,10,actorDt);continue;}
    actor.update(clock,0,musicianSits(actor.instrumentType),show.orchestraPlays&&!this.reduced,null,10,actorDt);
   }
   if(hallActive)this.venues.auditorium?.hallCat?.update(concertSeconds,this.reduced,now/1000);
   this.venue.dog.update(now/1000,animationDt,this.net.state?.visitors??[],this.reduced,this.activeCat?.root.position);
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
  if(this.entranceFraming&&!this.entranceViewLocked){this.entranceFraming=false;this.onChange();}
  this.updateEntranceReveal(now);
  const entranceReveal=this.entranceRevealAt!==null;
  if(!this.photoMode){
   const target=this.viewFov,current=this.camera.fov;
   const fov=this.entranceViewLocked||this.reduced||Math.abs(target-current)<.05?target:T.MathUtils.damp(current,target,9,dt);
   if(current!==fov){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  }
  const firstPerson=this.firstPerson,broadcast=this.broadcastView;
  if(hallActive&&this.spaceVisible)this.venues.auditorium?.scene.userData.hallTransition?.update(elapsed,this.reduced?0:concertSeconds);
  // An orbit can carry a planet farther from the camera than its initial position.
  const far=hallActive&&this.spaceVisible?220:150;
  if(this.camera.far!==far){
   this.camera.far=far;
   this.camera.updateProjectionMatrix();
  }
  this.updateCameraSway(now,dt);
  this.cameraSeatAmount=T.MathUtils.damp(this.cameraSeatAmount,this.pose==='sit'?1:0,8,dt);
  this.updateDuetCamera(dt);
  const f=this.cameraFrame();
  const gap=this.camera.position.distanceTo(f.position);
  if(this.danceCameraGlide&&this.duetCameraOrbit===null&&gap<.025&&this.look.distanceTo(f.look)<.025)this.danceCameraGlide=false;
  const follow=!this.concertView&&this.introEase<=0&&gap<1.5;
  // Preserve the slow dance transition even when the normal walking view would snap.
  this.cameraLocked=!this.danceCameraGlide&&follow&&(this.cameraLocked||gap<.03);
  if(this.cameraLocked||this.concertView)this.introGlide=false;
  const snap=!this.danceCameraGlide&&((this.entered&&!this.concertView&&this.introEase<=0&&!this.introGlide)
   ||firstPerson||now-this.dragAt<150||this.cameraLocked);
  const glideRate=this.danceCameraGlide?2.8:(this.introEase>0||this.introGlide?1.6:7);
  const smooth=this.catView?1-Math.exp(-dt*10):snap||broadcast?1:1-Math.exp(-dt*(this.duetCameraOrbit===null?glideRate:12));
  if(this.introEase>0)this.introEase=Math.max(0,this.introEase-dt);
  const walled=this.entered&&!entranceReveal&&!broadcast&&!this.catView&&!this.self?.dance&&!this.ridingTrain&&!this.photoMode&&!firstPerson&&!this.concertView&&this.position.z<=GOLDEN_HALL.rear,origin=walled?localCameraFrame(this.position,this.cameraSeatAmount,this.cameraYaw,this.cameraPitch,this.cameraDistance).origin:null;
  if(origin)f.position.copy(constrainCamera(origin,f.position,this.venue.cameraWalls));
  this.camera.position.lerp(f.position,smooth);
  if(origin&&this.cameraLocked)this.camera.position.copy(constrainCamera(origin,this.camera.position,this.venue.cameraWalls));
  const scene=this.venue.scene;
  if(!this.entered)scene.userData.cameraFocus=null;
  else if(firstPerson)scene.userData.cameraFocus=f.position;
  else if(this.concertView||broadcast||this.catView)scene.userData.cameraFocus=f.look;
  else scene.userData.cameraFocus=localCameraFrame(this.position,this.cameraSeatAmount,this.cameraYaw,this.cameraPitch,this.cameraDistance).origin;
  this.look.lerp(f.look,smooth);
  this.camera.lookAt(this.look);
  if(this.avatar&&this.entered&&!broadcast&&(this.zone==='lobby'||!this.concertView)){
   const head=this.position.clone();
   head.y+=1.1;
   this.avatar.root.visible=!firstPerson&&this.camera.position.distanceTo(head)>.7;
  }
  if(now-this.lodAt>200){this.lodAt=now;this.venue.updateLOD(this.camera);}
  for(const object of this.venue.overviewHidden)object.visible=!this.concertView||broadcast||this.catView;
  if(this.conducting.active&&this.avatar)this.avatar.root.visible=false;
  if(this.photoMode&&this.avatar)this.avatar.root.visible=this.photoComposition==='current'?this.photoOriginal.avatarVisible:true;
  const submitStart=this.diagnosticActive?performance.now():0;
  if(!this.diagnosticActive||this.diagnosticMode==='normal'){
   this.diagnosticGpu?.begin(now);
   try{
   const reflectedAvatar=this.avatar?.root;
   this.venue.mirror?.setVisitor(this.entered&&this.self&&reflectedAvatar?{
    x:reflectedAvatar.position.x,y:reflectedAvatar.position.y,z:reflectedAvatar.position.z,
    // Reflect the rendered avatar's orientation without any separate camera-facing adjustment.
    yaw:reflectedAvatar.rotation.y+Math.PI,id:this.self.id,
    dance:reflectedDance,sitting:reflectedDance?reflectedDance.chair&&reflectedDance.chairStand<.5:this.pose==='sit',
    mirrorAvatar:this.avatar??undefined,walking:this.pose==='walk',gesture:this.gesture,age:(this.net.now()-this.gestureAt)/1000,
   }:null,!!this.photoCapture);
   if(this.entered)this.venue.portrait?.update(this.renderer,this.camera,this.position,now);
   const namedAvatar=this.demoAvatar??this.avatar;
   const self=this.entered&&this.self&&namedAvatar&&!(this.zone==='auditorium'&&this.concertView&&!this.demoAvatar)?{avatar:namedAvatar,visitor:this.self}:null;
   this.visitorNames.update(this.camera,broadcast?null:self,broadcast?[]:this.remotes.values(),this.venue.scene.userData.solidOccluded,this.probeViewport);
   this.venues.auditorium?.usher?.updateSpeech(this.camera,this.renderer.domElement,this.entered&&this.zone==='auditorium'&&!this.uiObscured,now/1000);
   const crowdStart=timings?performance.now():0;
   this.crowds[this.zone].update(this.allGhosts(),this.camera,now,this.reduced);
   if(this.avatar){
    const crowd=this.crowds[this.zone];
    const wasReceiving=this.queenWand.receiving;
    this.queenWand.update(now,this.avatar.rightHand,this.avatar.rightArm,this.camera,this.venue.scene,this.reduced,
     crowd.queenGivingWand?crowd.queenGiftPosition:undefined);
    if(wasReceiving&&!this.queenWand.receiving)this.onChange();
   }
   if(timings)timings.crowdBatch=performance.now()-crowdStart;
   const avatarFocus=!entranceReveal&&!broadcast&&!firstPerson&&!this.concertView&&!this.photoMode
    ?this.venue.scene.userData.cameraFocus as T.Vector3|null: null;
   const fadeFocus=avatarFocus??this.look,fadeDistance=avatarFocus?Infinity:5;
   for(const fade of this.venue.scene.userData.cameraFades as CameraFade[]??[]){
    fade.update(this.camera.position,fadeFocus,fadeDistance,dt);
   }
   if(hallActive)this.encoreClock?.fadeObstructions(this.camera.position,fadeFocus,fadeDistance,dt);
   if(hallActive&&this.spaceVisible)this.venue.scene.userData.hallTransition?.frameSaturn(this.camera);
   characterFrontLight.value=this.venue===this.venues.lobby?FRONT_LIGHT.lobby:FRONT_LIGHT.auditorium;this.renderer.toneMappingExposure=this.venue===this.venues.lobby?LOBBY_EXPOSURE:1;
    if(this.lightingPass)this.lightingPass.render(this.venue.scene,this.camera,timings);
    else{
     const renderStart=timings?performance.now():0;
     this.renderer.render(this.venue.scene,this.camera);
     if(timings)timings.sceneRender=performance.now()-renderStart;
    }
   }finally{this.diagnosticGpu?.end();}
   this.finishPhotoCapture();
   this.drawCount++;if(this.zone==='auditorium'&&this.hallWarmed)completeInitialLoading();
    if(this.usherGreetingPending&&this.entered&&!entranceReveal&&!document.getElementById('boot-screen')){this.usherGreetingPending=false;this.venue.usher?.greet(performance.now()/1000);if(this.pendingSeat)this.seatWalkAt=performance.now()+4500;}
   if(!this.ready&&this.texturesLoaded){this.ready=true;performance.measure('aurea-first-scene',{start:0,end:performance.now()});document.body.classList.add('scene-ready');reportLoading(100,'공연장 연결을 준비하고 있어요');this.onChange();
   }
  }if(this.diagnosticActive){const end=performance.now();this.frameCost={at:now,cpu:end-workStart,submit:end-submitStart};}
  if(timings)this.onDiagnosticFrame?.(timings);
  if(now-this.lastUI>500){this.lastUI=now;this.onChange();}
 };
 destroy(){if(this.disposed)return;this.avatar?.disposeDanceSleeves();this.danceCircles.dispose();this.disposed=true;this.queenWand.dispose();this.venues.auditorium?.scene.userData.hallTransition?.dispose();this.endPhotoMode();this.venues.auditorium?.programBook?.dispose();this.venues.auditorium?.storyTableProps?.dispose();this.encoreTrain?.dispose();this.encoreClock?.dispose();this.musicLights?.dispose();this.fireworks?.dispose();this.hallDust?.dispose();this.venues.auditorium?.mirror?.dispose();this.venues.auditorium?.portrait?.dispose();this.venues.auditorium?.usher?.dispose();this.conductEffect?.dispose();this.venues.lobby.cat?.dispose();this.venues.lobby.dog.dispose();this.venues.auditorium?.dog.dispose();this.venues.auditorium?.hallCat?.dispose();this.activityEvents.abort();clearTimeout(this.hallLoadingTimeout);this.releaseLoadingCallbacks();cancelAnimationFrame(this.frame);this.input.destroy();window.removeEventListener('resize',this.resize);for(const v of Object.values(this.venues)){for(const fade of v.scene.userData.cameraFades as CameraFade[]??[])fade.dispose();v.scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}this.lightingPass?.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();this.visitorNames.dispose();}
}
