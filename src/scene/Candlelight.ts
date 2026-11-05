import * as T from 'three';
import {PARTERRE,parterreHeight} from '../../shared/parterre';
import {FLOOR_ROWS,STAIR_DOORS} from '../../shared/venue';
import {CONDUCTOR,ORCHESTRA_LAYOUT,STAGE,STAGE_FLOOR,stageRiseAt} from '../orchestra/layout';

/**
 * Candlelight concert: clusters of candles fill the stage floor and risers between the players, line the stage
 * front and stand on the hall floor before it, while the hall's own lamps go right down.
 * The feel comes from the light the candles throw, so every cluster has a soft halo and a warm pool on the floor,
 * and the hall's own lamps, recoloured and brought down to the candles, flicker for whole areas (no new lights).
 * Wax, flames, halos and pools are four draw calls in all.
 */
export function glowTexture(inner:number,outer:number){
 const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d')!;
 const g=c.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
 g.addColorStop(0,`rgba(255,244,210,${inner})`);g.addColorStop(.25,`rgba(255,200,95,${outer})`);g.addColorStop(1,'rgba(255,170,50,0)');
 c.fillStyle=g;c.fillRect(0,0,size,size);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;
}
type Cluster={x:number;y:number;z:number;n:number;r:number};
export function buildCandlelight(scene:T.Scene){
 if(typeof document==='undefined')return;
 const root=new T.Group();root.userData.landmark='candlelight';scene.add(root);
 // The hall's own lamps go down so the candles carry the room.
 scene.traverse(o=>{const l=o as T.Light;if(!l.isLight)return;
  if((l as T.SpotLight).isSpotLight||(l as T.PointLight).isPointLight)l.intensity*=.12;else if((l as T.DirectionalLight).isDirectionalLight)l.intensity*=.15;else l.intensity*=.3;
  // What little room light remains takes the candles' colour, so the whole hall feels warm rather than grey.
  if((l as T.HemisphereLight).isHemisphereLight){l.color.set(0xffc58a);(l as T.HemisphereLight).groundColor.set(0x40261a);}else if(!(l as T.SpotLight).isSpotLight&&!(l as T.PointLight).isPointLight)l.color.set(0xffc27e);});
 // Redirect the existing aisle-side washes onto the seating and floor. Their limited range keeps the stage lighting intact.
 scene.traverse(o=>{const light=o as T.SpotLight;if(!light.isSpotLight||light.position.y!==10.5||![6,32].includes(light.position.z))return;
  const side=Math.sign(light.position.x);light.position.set(side*9,9,light.position.z);light.target.position.set(side*3,0,light.position.z);
  light.color.set(0xffce94);light.intensity=100;light.distance=22;light.angle=1.0;light.penumbra=1;
 });
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const half=STAGE.width/2,floor=PARTERRE.floor,clusters:Cluster[]=[];
 const clearOfPlayers=(x:number,z:number)=>Math.hypot(x-CONDUCTOR.x,z-CONDUCTOR.z)>1.3&&ORCHESTRA_LAYOUT.every(p=>Math.hypot(x-p.x,z-p.z)>.95);
 // Stage floor and risers: clusters in every gap between the players, as in a candlelit church concert.
 for(let z=STAGE.front-.5;z>STAGE.back+.6;z-=.85)for(let x=-half+.5;x<half-.4;x+=.85){
  const cx=x+(rnd()-.5)*.6,cz=z+(rnd()-.5)*.6;if(!clearOfPlayers(cx,cz))continue;
  clusters.push({x:cx,y:STAGE_FLOOR+stageRiseAt(cx,cz),z:cz,n:5+Math.floor(rnd()*5),r:.36});
 }
 // A dense band along the stage lip, and on the hall floor against the stage front.
 for(let x=-half+.4;x<half-.3;x+=.7)clusters.push({x,y:STAGE_FLOOR,z:STAGE.front-.25,n:5,r:.3});
 for(let x=-half+.5;x<half-.4;x+=.8)clusters.push({x,y:floor,z:STAGE.front+.35,n:7,r:.35});
 // The way in: small groups along both edges of the two parterre aisles, against the side walls,
 // at the ends of the rear steps and either side of the stair doors, leaving every walking line clear.
 const ground=(x:number,z:number)=>parterreHeight(x,z)??0;
 for(let z=FLOOR_ROWS[0]-.9;z<FLOOR_ROWS[FLOOR_ROWS.length-1]+1;z+=1.95)for(const x of [-6.4,-4.6,4.6,6.4,-11.9,11.9])clusters.push({x,y:ground(x,z),z,n:2+Math.floor(rnd()*2),r:.18});
 for(let z=PARTERRE.stairFront+.3;z<PARTERRE.stairBack;z+=.6)for(const x of [-8.85,8.85])clusters.push({x,y:ground(x,z),z,n:2,r:.12});
 for(const side of [-1,1])for(const dx of [-2.3,2.3])clusters.push({x:side*STAIR_DOORS.lower.x+dx,y:0,z:STAIR_DOORS.lower.z-.7,n:6,r:.35});
 // Either side of the centre door from the lobby, so the candlelight greets visitors as they come in,
 // and small groups spaced along the foot of both side walls to draw the outline of the room.
 for(const x of [-2.7,2.7])clusters.push({x,y:0,z:50.7,n:8,r:.4});
 for(const side of [-1,1])for(let z=-6;z<41;z+=3.4){if(PARTERRE.sideStairZ.some(c=>Math.abs(z-c)<PARTERRE.sideStairWidth/2+.4))continue;const x=side*15.15;clusters.push({x,y:ground(x,z),z,n:3,r:.2});}
 const candles:{x:number;y:number;z:number;h:number}[]=[];
 for(const c of clusters)for(let i=0;i<c.n;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*c.r;candles.push({x:c.x+Math.cos(a)*d,y:c.y,z:c.z+Math.sin(a)*d,h:.12+rnd()*.3});}
 // Wax bodies.
 const body=new T.InstancedMesh(new T.CylinderGeometry(.075,.075,1,8),new T.MeshLambertMaterial({color:0xfff2d6,emissive:0xffb648,emissiveIntensity:1.15}),candles.length);
 const m=new T.Matrix4(),q=new T.Quaternion();candles.forEach((c,i)=>{m.compose(new T.Vector3(c.x,c.y+c.h/2,c.z),q,new T.Vector3(1,c.h,1));body.setMatrixAt(i,m);});root.add(body);
 // Flames, one bright point per candle.
 const flamePos=new Float32Array(candles.length*3);candles.forEach((c,i)=>flamePos.set([c.x,c.y+c.h+.05,c.z],i*3));
 const flameGeometry=new T.BufferGeometry();flameGeometry.setAttribute('position',new T.BufferAttribute(flamePos,3));
 const flame=new T.Points(flameGeometry,new T.PointsMaterial({map:glowTexture(1,.95),size:.2,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xfff3cc,fog:false}));
 // One soft halo per cluster, so the glow builds up where candles gather without drawing a halo per flame.
 const haloPos=new Float32Array(clusters.length*3);clusters.forEach((c,i)=>haloPos.set([c.x,c.y+.32,c.z],i*3));
 const haloGeometry=new T.BufferGeometry();haloGeometry.setAttribute('position',new T.BufferAttribute(haloPos,3));
 const halo=new T.Points(haloGeometry,new T.PointsMaterial({map:glowTexture(.6,.3),size:1.9,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffc463,opacity:.8,fog:false}));
 halo.renderOrder=flame.renderOrder=2;root.add(halo,flame);
 // Warm pools of light on the floor under every cluster.
 const pools=new T.InstancedMesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:glowTexture(.55,.3),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffb347,opacity:.75,polygonOffset:true,polygonOffsetFactor:-2,fog:false}),clusters.length);
 clusters.forEach((c,i)=>{const r=1.5+c.n*.12;m.compose(new T.Vector3(c.x,c.y+.015,c.z),q,new T.Vector3(r,1,r));pools.setMatrixAt(i,m);});pools.renderOrder=1;root.add(pools);
 // No new lights (each one costs every lit surface in the hall): the hall's own lamps become candle light instead.
 // Reuse the ceiling lamps as broad fills above both sides of the orchestra.
 const lights:T.Light[]=[],targets=[[0,floor+1.2,STAGE.front+1.2],[-6,7,-17],[6,7,-20]];
 scene.traverse(o=>{const l=o as T.PointLight;if(l.isPointLight&&l.position.y>14&&lights.length<3){const [x,y,z]=targets[lights.length];l.position.set(x,y,z);l.color.set(0xffbf66);l.intensity=lights.length===0?0:85;l.distance=25;l.decay=2;lights.push(l);}});
 scene.traverse(o=>{const l=o as T.SpotLight;if(l.isSpotLight&&l.position.z===-15&&l.position.y===12){l.color.set(0xffc874);l.intensity=85;lights.push(l);}});
 // The two wall washes nearest the stage turn to light the players softly from above, so faces and instruments read.
 scene.traverse(o=>{const l=o as T.SpotLight;if(l.isSpotLight&&l.position.z===-20&&l.position.y===10.5){const side=Math.sign(l.position.x);l.position.set(side*7,15,-10);l.target.position.set(side*4,0,-19);l.color.set(0xffd08a);l.intensity=300;l.distance=32;l.angle=.95;l.penumbra=1;}});
 // The hall is frozen after building (no automatic matrix updates), so moved lights and targets must be updated by hand.
 scene.traverse(o=>{const l=o as T.SpotLight;if(!l.isLight)return;l.updateMatrix();l.updateMatrixWorld(true);if(l.target){l.target.updateMatrix();l.target.updateMatrixWorld(true);}});
 const base=lights.map(l=>l.intensity);
 // Candle flicker: flames, halos and lights breathe together, each area a little out of step.
 flame.onBeforeRender=()=>{const t=performance.now()/1000;
  const f=(k:number)=>.86+.08*Math.sin(t*7.3+k*1.7)+.05*Math.sin(t*13.1+k*2.9)+.03*Math.sin(t*23+k);
  lights.forEach((l,i)=>{l.intensity=base[i]*f(i);});(halo.material as T.PointsMaterial).opacity=.8*f(9);(flame.material as T.PointsMaterial).size=.2*(.93+.08*Math.sin(t*11));};
 // Floating candles, as in a school of magic: high over the stalls, between the galleries and the ceiling,
 // each drifting slowly up and down on its own rhythm. Above the gallery rails so they never hide the stage.
 const floating=Array.from({length:170},()=>({x:(rnd()-.5)*23,y:9.6+rnd()*5.4,z:-6+rnd()*46,h:.22+rnd()*.18,phase:rnd()*Math.PI*2,speed:.35+rnd()*.35}));
 const floatBody=new T.InstancedMesh(new T.CylinderGeometry(.075,.075,1,8),body.material as T.Material,floating.length);floatBody.frustumCulled=false;
 const floatFlame=new Float32Array(floating.length*3),floatGeometry=new T.BufferGeometry();floatGeometry.setAttribute('position',new T.BufferAttribute(floatFlame,3));
 const floatPoints=new T.Points(floatGeometry,flame.material as T.PointsMaterial),floatHalo=new T.Points(floatGeometry,new T.PointsMaterial({map:glowTexture(.6,.3),size:1.3,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffc463,opacity:.75,fog:false}));
 floatPoints.frustumCulled=floatHalo.frustumCulled=false;floatPoints.renderOrder=floatHalo.renderOrder=2;root.add(floatBody,floatHalo,floatPoints);
 const place=(t:number)=>{floating.forEach((c,i)=>{const y=c.y+Math.sin(t*c.speed+c.phase)*.35;m.compose(new T.Vector3(c.x,y+c.h/2,c.z),q,new T.Vector3(1,c.h,1));floatBody.setMatrixAt(i,m);floatFlame.set([c.x,y+c.h+.06,c.z],i*3);});
  floatBody.instanceMatrix.needsUpdate=true;floatGeometry.getAttribute('position').needsUpdate=true;};
 place(0);let placedAt=0;
 floatPoints.onBeforeRender=()=>{const t=performance.now()/1000;if(t-placedAt<1/30)return;placedAt=t;place(t);};// 30 updates a second are plenty for a slow drift
 root.traverse(o=>{o.userData.fullDetail=true;});
 return root;
}
