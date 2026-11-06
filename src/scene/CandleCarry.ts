import * as T from 'three';
import {CANDLE_TABLE,type CandleTable} from '../../shared/venue';
import {glowTexture} from './Candlelight';

/** The candle table inside the hall entrance, where visitors pick up a candle to carry. */
export function buildCandleTable(scene:T.Scene,table:CandleTable=CANDLE_TABLE){
 const root=new T.Group();root.position.set(table.x,0,table.z);root.userData.landmark='candle-table';root.userData.candleTable=table;scene.add(root);
 const wood=new T.MeshLambertMaterial({color:0x4a2e1c}),cloth=new T.MeshLambertMaterial({color:0x6b1f24});
 const top=new T.Mesh(new T.BoxGeometry(1.4,.06,.6),wood);top.position.y=.86;root.add(top);
 const drape=new T.Mesh(new T.BoxGeometry(1.42,.5,.62),cloth);drape.position.y=.6;root.add(drape);
 for(const x of [-.62,.62])for(const z of [-.24,.24]){const leg=new T.Mesh(new T.BoxGeometry(.05,.86,.05),wood);leg.position.set(x,.43,z);root.add(leg);}
 // Every candle is lit, with the same warm flame and halo as the concert candles.
 const wax=new T.MeshLambertMaterial({color:0xfff2d6,emissive:0xffb648,emissiveIntensity:.85}),candle=new T.CylinderGeometry(.04,.04,.18,8);
 const flames:number[]=[];
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){const x=-.5+i*.25,z=-.18+j*.18,c=new T.Mesh(candle,wax);c.position.set(x,.98,z);root.add(c);flames.push(x,1.1,z);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(flames,3));
 root.add(new T.Points(g,new T.PointsMaterial({map:glowTexture(1,.95),size:.14,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xfff3cc,fog:false})));
 const haloGeometry=new T.BufferGeometry();haloGeometry.setAttribute('position',new T.Float32BufferAttribute([0,1.05,0],3));
 root.add(new T.Points(haloGeometry,new T.PointsMaterial({map:glowTexture(.6,.3),size:1.45,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffc463,opacity:.3,fog:false})));
 const fill=new T.PointLight(0xffbf66,.9,3.5,2);fill.position.set(0,1.25,.2);root.add(fill);
 // A glowing candle sign on the floor in front of the table, so visitors see at once where to pick one up.
 const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d')!;
 c.strokeStyle='rgba(255,214,140,.95)';c.lineWidth=10;c.beginPath();c.arc(128,128,112,0,Math.PI*2);c.stroke();
 c.fillStyle='rgba(255,214,140,.95)';c.fillRect(100,128,56,80);c.fillRect(124,112,8,18);// wax and wick
 c.beginPath();c.moveTo(128,36);c.bezierCurveTo(160,70,166,96,128,118);c.bezierCurveTo(90,96,96,70,128,36);c.fill();// a full teardrop flame on the wick
 const sign=new T.Mesh(new T.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2}));
 (sign.material.map as T.Texture).colorSpace=T.SRGBColorSpace;sign.position.set(table.approach.x-table.x,.02,table.approach.z-table.z);sign.userData.candleTable=table;root.add(sign);
 sign.onBeforeRender=()=>{(sign.material as T.MeshBasicMaterial).opacity=.65+.3*Math.sin(performance.now()/450);};
 // An invisible, generous tap target over the whole table.
 const hit=new T.Mesh(new T.BoxGeometry(1.6,1.4,.9),new T.MeshBasicMaterial({visible:false}));hit.position.y=.7;hit.userData.candleTable=table;root.add(hit);
 root.traverse(o=>{o.userData.fullDetail=true;});
 return {root,hit};
}

/**
 * Candles carried by visitors (the visitor and everyone else in the hall), drawn as one batch: wax in the hand,
 * a flame and a soft glow when lit. Only the visitor's own candle casts light, so a full house stays cheap.
 */
export class CarriedCandles{
 private own:T.PointLight;private wax:T.InstancedMesh;private flames:T.Points;private halos:T.Points;private positions:Float32Array;
 constructor(scene:T.Scene,private capacity=460){
  this.wax=new T.InstancedMesh(new T.CylinderGeometry(.035,.035,.2,8),new T.MeshLambertMaterial({color:0xfff2d6,emissive:0xffb648,emissiveIntensity:.8}),capacity);this.wax.frustumCulled=false;this.wax.count=0;
  this.positions=new Float32Array(capacity*3);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(this.positions,3));g.setDrawRange(0,0);
  this.flames=new T.Points(g,new T.PointsMaterial({map:glowTexture(1,.95),size:.14,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xfff3cc,fog:false}));
  this.halos=new T.Points(g,new T.PointsMaterial({map:glowTexture(.6,.3),size:1.35,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffbe5a,opacity:.85,fog:false}));
  this.flames.frustumCulled=this.halos.frustumCulled=false;this.flames.renderOrder=this.halos.renderOrder=2;
  scene.add(this.wax,this.halos,this.flames);
  // One small warm light follows the visitor's own lit candle, so it glows on their face and clothes. It always exists
  // in the hall (dark when unused), so lighting a candle never makes the hall's materials recompile.
  this.own=new T.PointLight(0xffb35a,0,3.2,1.6);scene.add(this.own);
 }
 private hand=new T.Vector3();private m=new T.Matrix4();private q=new T.Quaternion();private one=new T.Vector3(1,1,1);
 /** Each carrier's left hand, and whether its candle is lit. Wax goes in the hand; lit flames are packed first. */
 update(carriers:{hand:T.Object3D;lit:boolean;own?:boolean}[],time:number){
  let n=0,f=0;this.own.intensity=0;
  for(const c of carriers){if(n>=this.capacity)break;c.hand.getWorldPosition(this.hand);this.hand.y+=.06;
   this.m.compose(this.hand,this.q,this.one);this.wax.setMatrixAt(n++,this.m);
   if(c.lit){this.positions.set([this.hand.x,this.hand.y+.13,this.hand.z],f*3);f++;if(c.own){this.own.position.set(this.hand.x,this.hand.y+.15,this.hand.z-.15);this.own.intensity=.9*(.9+.07*Math.sin(time*7.3)+.03*Math.sin(time*13.1));}}}
  this.wax.count=n;this.wax.instanceMatrix.needsUpdate=true;
  const g=this.flames.geometry;g.setDrawRange(0,f);g.getAttribute('position').needsUpdate=true;
  (this.halos.material as T.PointsMaterial).opacity=.85*(.88+.08*Math.sin(time*7.3)+.04*Math.sin(time*13.1));
 }
}
