/** Local CPU replay, no quality changes. Run: node --import tsx scripts/benchmark-musicians.ts [baseline|current] [classic|jazz]
 * Baseline copy is made locally at src/scene/.batching-baseline.ts before editing (not committed).
 * Times exclude instrumentation; counters are collected in a separate replay. No GPU/FPS claims from Node.
 */
import * as T from 'three';
import {createHash} from 'node:crypto';
const variant=process.argv[2]??'current',hall=process.argv[3]??'classic';
Object.assign(globalThis,{location:{search:`?hall=${hall}`}});
const {fixture:makeFixture,pose,clearRanges}=await import('./musician-replay');
const {batchCharacters}=await import(variant==='baseline'?'../src/scene/.batching-baseline.ts':'../src/scene/batching.ts');
const scenarios=['idle','far','near','moving','conducting'] as const;
const fixture=()=>makeFixture(batchCharacters);
function run(kind:typeof scenarios[number],instrument=false,f=fixture()){
 for(const actor of f.actors)actor.root.userData.poseAt=-1;
 const batchTimes:number[]=[],animationTimes:number[]=[],hash=createHash('sha256');
 let comparisons=0,writes=0,morphWrites=0,uploads=0,floats=0,draws=0;
 const eq=T.Matrix4.prototype.equals,set=T.InstancedMesh.prototype.setMatrixAt,morph=T.InstancedMesh.prototype.setMorphAt;
 if(instrument){T.Matrix4.prototype.equals=function(m){if(f.matrices.has(m))comparisons++;return eq.call(this,m);};T.InstancedMesh.prototype.setMatrixAt=function(i,m){writes++;return set.call(this,i,m);};T.InstancedMesh.prototype.setMorphAt=function(i,m){morphWrites++;return morph.call(this,i,m);};}
 try{for(let frame=0;frame<420;frame++){
  const a=performance.now();pose(f,kind,frame);const b=performance.now();f.update(f.camera);const c=performance.now();
  if(frame>=120){batchTimes.push(c-b);animationTimes.push(b-a);}
  if(instrument){
   for(const batch of f.batches){
    if(batch.instanceMatrix.updateRanges.length){uploads++;floats+=batch.instanceMatrix.updateRanges.reduce((n,r)=>n+r.count,0);}
    if(frame>=120&&batch.visible&&batch.count)draws++;
    // All render data, including eye morphs and color alignment, checked every frame.
    hash.update(`${batch.visible}/${batch.count}/`);
    if(batch.visible&&batch.count){for(const attr of [batch.instanceMatrix,batch.instanceColor])if(attr)hash.update(Buffer.from(attr.array.buffer,attr.array.byteOffset,batch.count*attr.itemSize*4));if(batch.morphTexture){const image=batch.morphTexture.image;hash.update(Buffer.from((image.data as Float32Array).buffer,0,batch.count*image.width*4));}}
   }
  }
  clearRanges(f);
 }}finally{T.Matrix4.prototype.equals=eq;T.InstancedMesh.prototype.setMatrixAt=set;T.InstancedMesh.prototype.setMorphAt=morph;}
 const stats=(v:number[])=>({mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v.sort((a,b)=>a-b)[Math.ceil(v.length*.95)-1]});
 return {actors:f.actors.length,batch:stats(batchTimes),animation:stats(animationTimes),...(instrument?{comparisons,writes,morphWrites,uploads,floats,draws:draws/300,hash:hash.digest('hex')}:{} )};
}
const measured=new Map();
for(const kind of scenarios){const f=fixture();run(kind,false,f);run(kind,false,f);measured.set(kind,Array.from({length:3},()=>run(kind,false,f)));}
for(const kind of scenarios){const counts=run(kind,true);console.log(JSON.stringify({variant,hall,kind,runs:measured.get(kind),counters:counts}));}
