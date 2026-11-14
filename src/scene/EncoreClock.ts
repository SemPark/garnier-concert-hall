import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Playback } from '../../shared/timeline';
import { TRAIN_PLATFORM } from '../../shared/encoreTrain';

const TAU = Math.PI * 2;
const REWIND = 1.4;
const ORBIT_SPARKS = 132;
const OPENING_SPARKS = 180;
const OPENING_SECONDS = 5;

function makeClockSparks() {
  const points = new Float32Array((ORBIT_SPARKS + OPENING_SPARKS) * 3);
  for (let i = 0; i < points.length / 3; i++) {
    points[i * 3] = i;
    points[i * 3 + 1] = (i * .61803398875) % 1;
    points[i * 3 + 2] = (i * .75487766625) % 1;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(points, 3));
  // The shader generates clock-local positions from these fixed particle seeds.
  geometry.boundingSphere = new T.Sphere(new T.Vector3(0, -.5, 0), 9);
  const material = new T.ShaderMaterial({
    uniforms: {
      orbitPhase: { value: 0 },
      openingAge: { value: 0 },
      viewportHeight: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    vertexShader: `
      #define TAU 6.28318530718
      uniform float orbitPhase, openingAge, viewportHeight;
      varying float brightness, glint, warmth;

      void main() {
        float index = position.x;
        float seed = position.y;
        float variation = position.z;
        float size;
        vec3 offset;
        warmth = variation;

        if (index < ${ORBIT_SPARKS}.0) {
          float band = mod(index, 2.0);
          float angle = TAU * (seed + orbitPhase * (4.0 - band));
          float radius = mix(3.1, 4.2, variation) + 0.15 * sin(angle * 3.0 + TAU * variation);
          offset = vec3(cos(angle) * radius, sin(angle) * radius * (0.92 + 0.08 * band),
            0.52 + 0.72 * sin(angle + band * 2.1) + variation * 0.35);

          float pulse = 0.5 + 0.5 * cos(TAU * (orbitPhase * (52.0 + floor(seed * 48.0)) + variation));
          glint = step(0.72, seed);
          brightness = mix(0.14 + pulse * 0.44, 0.1 + pow(pulse, 5.0) * 0.88, glint);
          size = mix(0.095 + variation * 0.14, 0.30 + variation * 0.24, glint) * (0.7 + pulse * 0.3);
        } else {
          float spark = index - ${ORBIT_SPARKS}.0;
          float angle = spark * 2.39996 + openingAge * 0.35;
          float radius = 2.9 + openingAge * (0.35 + mod(spark, 7.0) * 0.08);
          offset = vec3(cos(angle) * radius, sin(angle) * radius - openingAge * openingAge * 0.07,
            0.5 + sin(spark * 1.7 + openingAge) * 0.8);
          glint = step(0.90, seed);
          size = mix(0.14 + variation * 0.12, 0.42, glint);
          brightness = sin(3.14159265 * openingAge / ${OPENING_SECONDS}.0) * (0.65 + variation * 0.35);
        }

        vec4 eye = modelViewMatrix * vec4(offset, 1.0);
        gl_Position = projectionMatrix * eye;
        gl_PointSize = clamp(size * projectionMatrix[1][1] * viewportHeight / max(0.1, -2.0 * eye.z), 2.0, 64.0);
      }
    `,
    fragmentShader: `
      varying float brightness, glint, warmth;

      void main() {
        vec2 p = abs(gl_PointCoord * 2.0 - 1.0);
        float radius = length(p);
        float glow = (1.0 - smoothstep(0.0, 0.94, radius)) * (0.34 + glint * 0.09);
        float core = 1.0 - smoothstep(0.05, 0.35 - glint * 0.17, radius);
        float rays = (1.0 - smoothstep(0.025, 0.19, min(p.x, p.y)))
          * (1.0 - smoothstep(0.0, 0.96, max(p.x, p.y)));
        float shape = min(1.0, glow + 0.72 * core + glint * rays * 0.86);
        vec3 gold = mix(vec3(1.0, 0.44, 0.095), vec3(1.0, 0.82, 0.50), warmth);
        gl_FragColor = vec4(mix(gold, vec3(1.0, 0.96, 0.79), core), shape * brightness);
        #include <colorspace_fragment>
      }
    `,
  });
  const sparks = new T.Points(geometry, material);
  sparks.name = '시계 둘레의 금빛 별가루';
  sparks.onBeforeRender = renderer => { material.uniforms.viewportHeight.value = renderer.domElement.height; };
  return sparks;
}

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
  private readonly weightMaterial = new T.MeshStandardMaterial({
    color: 0xc28c48,
    metalness: .92,
    roughness: .18,
    envMapIntensity: .35,
  });
  private readonly frustum = new T.Frustum();
  private readonly matrix = new T.Matrix4();
  private readonly bounds = new T.Sphere(new T.Vector3(0, 21, TRAIN_PLATFORM.z - 2.2), 6);
  private readonly sparks = makeClockSparks();
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
    this.setEnvironment(scene.environment);
    this.materials.push(gold,bright,dark,this.weightMaterial);
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
    const weightGeometry = new T.CapsuleGeometry(.32, 1, 6, 20);
    for(let i=0;i<3;i++){
      const pivot=new T.Group();pivot.position.set((i-1)*1.48,-2.77,.28);this.root.add(pivot);this.pendulums.push(pivot);
      const length = i === 1 ? 2.75 : 2.1;
      mesh(new T.CylinderGeometry(.022,.022,length,6),gold,pivot).position.y=-length/2;
      ring(.11,.025,gold,pivot);
      const weight = mesh(weightGeometry, this.weightMaterial, pivot);
      weight.position.y = -length - .39;
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
    this.root.add(this.sparks);
    this.geometries.add(this.sparks.geometry);
    this.materials.push(this.sparks.material);
    scene.add(this.root);
  }

  setEnvironment(texture: T.Texture | null) {
    this.weightMaterial.envMap = texture;
    this.weightMaterial.needsUpdate = true;
  }

  update(seconds:number,p:Playback,camera:T.Camera,active:boolean,reduced:boolean,concertSeconds:number) {
    this.root.visible=active;if(!active){this.lastTime=-1;return;}
    this.sparks.visible = !reduced;
    if (!reduced) {
      const opening = p.playing && p.offset < OPENING_SECONDS;
      const uniforms = this.sparks.material.uniforms;
      uniforms.orbitPhase.value = (concertSeconds % 360) / 360;
      uniforms.openingAge.value = opening ? p.offset : 0;
      this.sparks.geometry.setDrawRange(0, ORBIT_SPARKS + (opening ? OPENING_SPARKS : 0));
    }
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
