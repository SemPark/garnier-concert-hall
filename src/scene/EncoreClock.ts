import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Playback } from '../../shared/timeline';
import { TRAIN_PLATFORM } from '../../shared/encoreTrain';

const TAU = Math.PI * 2;
const REWIND = 1.4;
/** One song is one revolution; after its end, unwind before joining the next song. */
export function clockPhase(p: Playback) {
  const duration = Math.max(1, p.track.durationSeconds);
  const progress = T.MathUtils.clamp(p.offset / duration, 0, 1);
  const gapAge = p.track.gapAfterSeconds - p.remaining;
  const rewindAge = !p.playing && p.cycle >= 0 ? Math.max(0, gapAge) : -1;
  return { progress, rewindAge };
}

/** Floating station clock: opaque metal, one dial texture, no lights or shadow maps. */
export class EncoreClock {
  readonly root = new T.Group();
  private readonly rings: T.Group[] = [];
  private readonly pendulums: T.Group[] = [];
  private readonly hand = new T.Group();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials: T.Material[] = [];
  private readonly dial: T.CanvasTexture;
  private readonly frustum = new T.Frustum();
  private readonly matrix = new T.Matrix4();
  private readonly bounds = new T.Sphere(new T.Vector3(0, 21, TRAIN_PLATFORM.z - 2.2), 6);
  private key = '';
  private rewindAt = -Infinity;
  private rewindFrom = 1;
  private gapRewound = false;
  private previousPlaying = false;
  private ringPhase = 0;
  private lastTime = -1;
  private ringStart = 0;

  constructor(scene: T.Scene) {
    this.root.name = '한 곡의 시간을 되감는 천체 시계';
    this.root.position.set(0, 22, TRAIN_PLATFORM.z - 2.2);
    this.root.rotation.y = Math.PI;
    const gold = new T.MeshStandardMaterial({color:0xc69547,metalness:.72,roughness:.32,emissive:0x593607,emissiveIntensity:.3});
    const bright = new T.MeshBasicMaterial({color:0xf3d68d});
    const dark = new T.MeshStandardMaterial({color:0x693c28,metalness:.45,roughness:.5});
    const crystal = new T.MeshBasicMaterial({color:0xb78add});
    const crystalShade = new T.MeshBasicMaterial({color:0x75539e});
    this.materials.push(gold,bright,dark,crystal,crystalShade);
    const mesh = (g:T.BufferGeometry,m:T.Material,parent:T.Object3D=this.root) => {
      this.geometries.add(g);const o=new T.Mesh(g,m);parent.add(o);return o;
    };
    const ring = (r:number,t:number,m:T.Material,parent:T.Object3D=this.root) => mesh(new T.TorusGeometry(r,t,6,64),m,parent);
    const star = (r:number,inner:number,points=8) => {
      const s=new T.Shape();for(let i=0;i<points*2;i++){const a=i*Math.PI/points+Math.PI/2,d=i%2?inner:r;const x=Math.cos(a)*d,y=Math.sin(a)*d;if(i)s.lineTo(x,y);else s.moveTo(x,y);}s.closePath();return new T.ShapeGeometry(s);
    };
    mesh(new T.CylinderGeometry(2.8,2.8,.20,64).rotateX(Math.PI/2),dark);
    ring(2.82,.095,gold);ring(2.65,.025,bright);ring(2.22,.023,gold);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
    const c=canvas.getContext('2d')!;
    c.translate(384,384);
    const bg=c.createRadialGradient(-70,-90,20,0,0,380);bg.addColorStop(0,'#a16b45');bg.addColorStop(1,'#63382e');
    c.fillStyle=bg;c.beginPath();c.arc(0,0,380,0,TAU);c.fill();
    const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    c.textAlign='center';c.textBaseline='middle';c.font='bold 32px Georgia';c.fillStyle='#ead49d';
    for(let i=0;i<12;i++){const a=i*TAU/12;c.fillText(numerals[i],Math.sin(a)*325,-Math.cos(a)*325);}
    c.strokeStyle='#bb985e';c.lineWidth=2;
    for(let i=0;i<60;i++){const a=i*TAU/60,r=i%5?367:358;c.beginPath();c.moveTo(Math.sin(a)*r,-Math.cos(a)*r);c.lineTo(Math.sin(a)*375,-Math.cos(a)*375);c.stroke();}

    c.font='17px Georgia';c.fillText('P L E E E',0,125);
    this.dial=new T.CanvasTexture(canvas);this.dial.colorSpace=T.SRGBColorSpace;
    const dialMaterial=new T.MeshBasicMaterial({map:this.dial});this.materials.push(dialMaterial);
    mesh(new T.CircleGeometry(2.74,64),dialMaterial).position.z=.115;
    this.root.add(this.hand);this.hand.position.z=.19;
    const needle=new T.Shape();needle.moveTo(-.055,-.48);needle.lineTo(-.045,1.78);needle.lineTo(-.13,1.85);needle.lineTo(0,2.35);needle.lineTo(.13,1.85);needle.lineTo(.045,1.78);needle.lineTo(.055,-.48);needle.closePath();
    mesh(new T.ShapeGeometry(needle),bright,this.hand);
    mesh(star(.56,.18),bright).position.z=.24;
    mesh(new T.SphereGeometry(.13,12,8),gold).position.z=.27;
    for(let i=0;i<3;i++){
      const pivot=new T.Group();this.root.add(pivot);this.rings.push(pivot);
      ring(3.12+i*.22,.15,gold,pivot);
      const ornaments:T.BufferGeometry[]=[];
      for(let j=0;j<6;j++){const a=j*TAU/6,r=3.12+i*.22;ornaments.push(new T.OctahedronGeometry(j%2===0?.105:.075).translate(Math.cos(a)*r,Math.sin(a)*r,0));}
      const merged=mergeGeometries(ornaments);if(merged)mesh(merged,bright,pivot);ornaments.forEach(g=>g.dispose());
    }
    // Pendulum pivots stay below the dial: long central bob and two shorter flank bobs.
    const bobScale = 1.3;
    for(let i=0;i<3;i++){
      const pivot=new T.Group();pivot.position.set((i-1)*1.48,-2.77,.28);this.root.add(pivot);this.pendulums.push(pivot);
      const length = i === 1 ? 2.75 : 2.1;
      mesh(new T.CylinderGeometry(.022,.022,length,6),gold,pivot).position.y=-length/2;
      ring(.11,.025,gold,pivot);
      const cap = mesh(new T.ConeGeometry(.25 * bobScale, .30 * bobScale, 8), gold, pivot);
      cap.position.y = -length + .10 * bobScale;
      const bobY = -length - .30 * bobScale;
      const gem = mesh(new T.OctahedronGeometry(.35 * bobScale), crystal, pivot);
      gem.scale.set(.74, 1.8, .74);
      gem.position.y = bobY;
      const core = mesh(new T.OctahedronGeometry(.21 * bobScale), crystalShade, pivot);
      core.scale.set(.8, 1.9, .8);
      core.position.set(.09 * bobScale, bobY, .10 * bobScale);
    }
    // A matching crown silhouette above the dial, rather than a support or hanging chain.
    mesh(star(.43,.13),bright).position.set(0,3.92,0);
    for(const side of [-1,1]){const curl=ring(.34,.035,gold);curl.position.set(side*.42,3.22,0);}
    // Merge stationary pieces per moving assembly; preserve independent pivots.
    for (const group of [this.root, this.hand, ...this.rings, ...this.pendulums]) {
      const batches = new Map<T.Material, T.Mesh[]>();
      for (const child of group.children) {
        if (!(child instanceof T.Mesh) || Array.isArray(child.material)) continue;
        const parts = batches.get(child.material) ?? [];
        parts.push(child); batches.set(child.material, parts);
      }
      for (const [material, parts] of batches) {
        if (parts.length < 2) continue;
        const copies = parts.map(part => {part.updateMatrix();return part.geometry.clone().applyMatrix4(part.matrix);});
        const merged = mergeGeometries(copies);copies.forEach(g => g.dispose());
        if (merged) {parts.forEach(part => group.remove(part));mesh(merged, material, group);}
      }
    }
    scene.add(this.root);
  }

  update(seconds:number,p:Playback,camera:T.Camera,active:boolean,reduced:boolean) {
    this.root.visible=active;if(!active){this.lastTime=-1;return;}
    const {progress,rewindAge}=clockPhase(p),key=`${p.track.id}:${p.cycle}:${p.index}`;
    const changed=this.key!==''&&key!==this.key;
    const ended=this.previousPlaying&&!p.playing;
    if((changed&&!this.gapRewound)||ended){
      this.rewindAt=seconds;this.rewindFrom=changed?1:progress;this.ringStart=this.ringPhase;this.gapRewound=!p.playing;
    }
    if(changed)this.gapRewound=false;
    if(!this.key&&rewindAge>=0){this.rewindAt=seconds-rewindAge;this.rewindFrom=1;this.gapRewound=true;}
    this.key=key;this.previousPlaying=p.playing;
    const dt=this.lastTime<0?0:Math.min(.1,Math.max(0,seconds-this.lastTime));this.lastTime=seconds;
    const age=seconds-this.rewindAt;
    let shown=progress;
    if(age<REWIND){const t=T.MathUtils.smoothstep(age/REWIND,0,1);shown=this.rewindFrom*(1-t);this.ringPhase=this.ringStart*(1-t);}
    else if(age<REWIND+.45){shown=(p.playing?progress:0)*T.MathUtils.smoothstep((age-REWIND)/.45,0,1);}
    else if(!p.playing&&this.gapRewound)shown=0;
    if(age>=REWIND&&p.playing)this.ringPhase=(this.ringPhase+dt*.12)%TAU;
    camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    if(!this.frustum.intersectsSphere(this.bounds))return;
    this.hand.rotation.z=-TAU*shown;
    this.root.position.y=22+(reduced?0:Math.sin(seconds*.45)*.07);
    this.rings.forEach((r,i)=>{const phase=reduced?0:this.ringPhase;r.rotation.set(.45+i*.63,phase*(i===1?-1:i===2?2:1)+i*.7,.35+i*.62);});
    this.pendulums.forEach((p,i)=>{p.rotation.z=reduced?0:Math.sin(seconds*(i===1?1.35:1.65)+i*.7)*(i===1?.19:.24);});
  }

  riderPosition(seconds: number, target: T.Vector3) {
    const angle = Math.sin(seconds * 1.35 + .7) * .19;
    target.set(0, -2.75 - .39 + .819 - 1.36, 0);
    target.applyAxisAngle(new T.Vector3(0, 0, 1), angle);
    target.add(new T.Vector3(0, -2.77, .28));
    this.root.localToWorld(target);
    return Math.PI;
  }

  dispose(){this.root.removeFromParent();this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.dial.dispose();}
}
