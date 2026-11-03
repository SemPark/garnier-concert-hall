import {LOWER_HALL,parapetModules} from '../../shared/lowerHall';
import * as T from 'three';
import {PARTERRE as P} from '../../shared/parterre';
import {box,cylinder} from './primitives';
import {woodMaterial,applyWoodSurface,hallImage} from './HallTextures';

let marble:T.MeshStandardMaterial|undefined;
/** Restrained, fine ivory veins on warm charcoal marble; one shared 256px map. */
function darkMarble(){
 if(marble)return marble;
 let map:T.CanvasTexture|undefined;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#222722';ctx.fillRect(0,0,256,256);
  let seed=197;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<19;i++){ctx.beginPath();let x=rand()*320-32,y=-20;ctx.moveTo(x,y);for(let j=0;j<8;j++){const nx=x+(rand()-.7)*54,ny=y+40;ctx.quadraticCurveTo(x+rand()*25,y+15,nx,ny);x=nx;y=ny;}ctx.strokeStyle=i%4===0?'rgba(203,187,145,.32)':'rgba(149,154,137,.17)';ctx.lineWidth=i%4===0?.9:.4;ctx.stroke();}
  map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
 }
 marble=new T.MeshStandardMaterial({color:0xd2c4a9,map,roughness:.48,metalness:0,envMapIntensity:.25});return marble;
}
/** Walnut framing and dark marble continue around the excavated audience floor. */
export function buildParterreWell(scene:T.Scene){
 const root=new T.Group();root.userData.landmark='sunken-parterre';scene.add(root);
 const height=-P.floor,marbleMaterial=darkMarble();
 const panel=(g:T.Group,width:number,bottom:number=P.floor,top:number=0)=>{
  const height=top-bottom,center=(bottom+top)/2;
  box(g,[width,height,.20],[0,center,0],0x5e3925).material=woodMaterial('walnut');
  const count=Math.max(1,Math.round(width/1.45)),span=width/count;
  for(let i=0;i<count;i++){
   const x=-width/2+(i+.5)*span;
   box(g,[span-.16,height-.30,.045],[x,center,.13],0x242924).material=marbleMaterial;
   for(const xx of [x-span/2+.05,x+span/2-.05])box(g,[.07,height-.18,.08],[xx,center,.14],0x66432d).material=woodMaterial('frame');
  }
  for(const [y,h,d]of [[bottom+.07,.14,.29],[top-.08,.16,.35],[top+.035,.07,.39]])box(g,[width,h,d],[0,y,.06],0x66432d).material=woodMaterial('frame');
 };
 for(const side of [-1,1]){
  // Raised, usable side-seat platforms project from the wall, rather than a floating wall strip.
  const start=P.front,end=P.stairFront,depth=end-start,mid=(start+end)/2;
  const deck=(a:number,b:number,inner:number=P.sideFront)=>{const floor=box(root,[16-inner,.16,b-a],[side*(16+inner)/2,-.09,(a+b)/2],0x805734);applyWoodSurface(floor,'walnut');floor.userData.landmark='side-box-floor';floor.userData.walkSurface=true;};
  const cuts=P.sideStairZ.map(z=>[z-P.sideStairWidth/2,z+P.sideStairWidth/2]);
  let spans:number[][]=[[start,end]];for(const [a,b]of cuts)spans=spans.flatMap(([lo,hi])=>hi<=a||lo>=b?[[lo,hi]]:[...(lo<a?[[lo,a]]:[]),...(hi>b?[[b,hi]]:[])]);
  for(const [a,b]of spans){
   deck(a,b);
   const front=new T.Group();front.position.set(side*P.sideFront,0,(a+b)/2);front.rotation.y=side<0?Math.PI/2:-Math.PI/2;front.userData.landmark='side-box-front';root.add(front);panel(front,b-a);
   // Alternating complete units, laid side by side: no marble post laid over a pattern panel.
   for(const module of parapetModules(a,b)){
    const unit=new T.Group();unit.position.x=side*((module.start+module.end-a-b)/2);unit.userData.landmark=`parapet-${module.kind}-module`;unit.userData.interval=[module.start,module.end];front.add(unit);
    const w=module.end-module.start-.02;
    if(module.kind==='marble')panel(unit,w,0,LOWER_HALL.plinth);
    else{
     box(unit,[w,1.10,.18],[0,.55,0],0x805734).material=woodMaterial('walnut');
     hallImage(unit,'damask',w-.10,.92,0,.58,.15);
     box(unit,[w,.10,.27],[0,.07,.04],0x805734).material=woodMaterial('frame');
     const rail=cylinder(unit,.065,w,[0,1.13,.13],0x6f2830);rail.rotation.z=Math.PI/2;
    }
   }

  }
  for(const z of P.sideStairZ){
   deck(z-P.sideStairWidth/2,z+P.sideStairWidth/2,P.sideFront+P.sideStairRun);
   const run=P.sideStairRun/P.steps,rise=height/P.steps;
   for(let i=0;i<P.steps;i++){
    const top=P.floor+(i+1)*rise,x=P.sideFront+(i+.5)*run;
    // Solid timber beneath each tread closes both exposed sides, flush with the platform cheek.
    const supportHeight=top-.085-P.floor;
    const support=box(root,[run,supportHeight,P.sideStairWidth],[side*x,P.floor+supportHeight/2,z],0x5d3824);support.material=woodMaterial('stage-side');support.userData.landmark='side-box-stair-solid';
    const tread=box(root,[run+.01,.085,P.sideStairWidth],[side*x,top-.0425,z],0x805734);applyWoodSurface(tread,'walnut');tread.userData.landmark='side-box-step';tread.userData.walkSurface=true;
    box(root,[.04,rise,P.sideStairWidth],[side*(P.sideFront+i*run),top-rise/2,z],0x5d3824).material=woodMaterial('stage-side');
   }
   // Full-height cheeks close the triangular opening between the treads and the level deck.
   for(const edge of [-1,1]){
    const cheek=new T.Group();cheek.position.set(side*(P.sideFront+P.sideStairRun/2),0,z+edge*(P.sideStairWidth/2+.10));cheek.rotation.y=edge<0?Math.PI:0;cheek.userData.landmark='side-box-stair-cheek';root.add(cheek);panel(cheek,P.sideStairRun);
   }

  }
  const rear=new T.Group();rear.position.set(side*(16+P.stairHalfWidth)/2,0,P.stairFront+.08);rear.rotation.y=Math.PI;root.add(rear);panel(rear,16-P.stairHalfWidth);
  // Solid stone retaining mass behind the side cheeks, without a coplanar top surface.
  box(root,[16-P.stairHalfWidth,height,P.stairBack-P.stairFront],[side*(16+P.stairHalfWidth)/2,P.floor+height/2,(P.stairBack+P.stairFront)/2],0x513a29).material=woodMaterial('walnut');
 }
 const apron=new T.Group();apron.position.z=P.front+.12;apron.userData.landmark='stage-marble-apron';root.add(apron);panel(apron,30.4);
 const run=(P.stairBack-P.stairFront)/P.steps,rise=height/P.steps;
 for(let i=0;i<P.steps;i++){
  const top=P.floor+(i+1)*rise,z=P.stairFront+(i+.5)*run;
  const step=box(root,[P.stairHalfWidth*2,.10,run+.005],[0,top-.05,z],0x6b4429);applyWoodSurface(step,'walnut');step.userData.landmark='parterre-rear-step';
  box(root,[P.stairHalfWidth*2,rise-.02,.055],[0,top-rise/2,P.stairFront+i*run+.025],0x3d2a1e).material=woodMaterial('stage-side');
  box(root,[P.stairHalfWidth*2,.025,.035],[0,top+.003,P.stairFront+i*run+.035],0x9f7644).material=woodMaterial('frame');
 }
 // The raised rear landing remains at the entrances' original elevation.
 const landing=box(root,[32,.14,52-P.stairBack],[0,-.085,(52+P.stairBack)/2],0x5c412d);landing.material=woodMaterial('walnut');
 root.traverse(o=>{o.userData.fullDetail=true;});return root;
}
