import * as T from 'three';
import {ATRIUM,LOBBY_CHRISTMAS_TREE} from '../../shared/grandStair';

// Lit candles drifting in the air above the lobby atrium, between the balcony and the ceiling.
// No real lights: cream wax, a glowing flame and a soft additive halo, each drawn as one batch.
const COUNT=48,BODY_HEIGHT=.38;

/** Small seeded random so every visitor sees the same arrangement. */
function random(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

function haloTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!,r=g.createRadialGradient(32,32,0,32,32,32);
 r.addColorStop(0,'rgba(255,236,190,.9)');r.addColorStop(.25,'rgba(255,214,140,.35)');r.addColorStop(1,'rgba(255,200,120,0)');
 g.fillStyle=r;g.fillRect(0,0,64,64);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}

export function buildFloatingCandles(scene:T.Scene){
 const rand=random(20251224),candles:{x:number;y:number;z:number;speed:number;phase:number;tilt:number}[]=[];
 const star=LOBBY_CHRISTMAS_TREE;
 while(candles.length<COUNT){
  const x=(rand()*2-1)*(ATRIUM.halfWidth-3.2),z=ATRIUM.front+4+rand()*(ATRIUM.back-ATRIUM.front-8),y=10.5+rand()*5;
  // Keep clear of the floating star above the Christmas tree.
  if(Math.hypot(x-star.x,z-star.z)<3.2&&y<12)continue;
  candles.push({x,y,z,speed:.5+rand()*.5,phase:rand()*Math.PI*2,tilt:(rand()-.5)*.08});
 }
 const root=new T.Group();root.name='floating-candles';scene.add(root);
 const wax=new T.InstancedMesh(new T.CylinderGeometry(.045,.05,BODY_HEIGHT,10),new T.MeshLambertMaterial({color:0xf3ead6,emissive:0x4a3a26,emissiveIntensity:.5}),COUNT);
 const flame=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({color:0xffd690}),COUNT);
 for(const mesh of [wax,flame]){mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;root.add(mesh);}
 const haloPositions=new Float32Array(COUNT*3),haloGeometry=new T.BufferGeometry();haloGeometry.setAttribute('position',new T.BufferAttribute(haloPositions,3));
 let haloMaterial:T.PointsMaterial|null=null;
 if(typeof document!=='undefined'){
  haloMaterial=new T.PointsMaterial({map:haloTexture(),size:.9,sizeAttenuation:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,color:0xffe2b0});
  const halos=new T.Points(haloGeometry,haloMaterial);halos.frustumCulled=false;halos.matrixAutoUpdate=false;root.add(halos);
 }
 const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),s=new T.Vector3();
 function update(time:number){
  candles.forEach((c,i)=>{
   const y=c.y+Math.sin(time*c.speed+c.phase)*.14;
   e.set(c.tilt+Math.sin(time*.7+c.phase)*.03,0,c.tilt*.6);q.setFromEuler(e);
   m.compose(p.set(c.x,y,c.z),q,s.set(1,1,1));wax.setMatrixAt(i,m);
   // The flame flickers: a tiny teardrop just above the wick.
   const flick=1+Math.sin(time*9+c.phase*3)*.12+Math.sin(time*13.7+c.phase)*.06;
   m.compose(p.set(c.x,y+BODY_HEIGHT/2+.055,c.z),q,s.set(.026,.055*flick,.026));flame.setMatrixAt(i,m);
   haloPositions[i*3]=c.x;haloPositions[i*3+1]=y+BODY_HEIGHT/2+.06;haloPositions[i*3+2]=c.z;
  });
  wax.instanceMatrix.needsUpdate=true;flame.instanceMatrix.needsUpdate=true;haloGeometry.attributes.position.needsUpdate=true;
  if(haloMaterial)haloMaterial.opacity=.85+Math.sin(time*5.3)*.08;
 }
 update(0);
 return {root,update};
}
