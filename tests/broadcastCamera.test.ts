import assert from 'node:assert/strict';
import test from 'node:test';
import {PerspectiveCamera,Vector3} from 'three';
import {ORCHESTRA_LAYOUT,STAGE_FLOOR} from '../src/orchestra/layout';
import {BroadcastCamera,type BroadcastTarget} from '../src/scene/BroadcastCamera';
import {TREE_SPOTS} from '../src/scene/ChristmasTrees';

const target=(id:string,x:number):BroadcastTarget=>({id,x,y:1.2,z:28,azimuth:0,distance:3,lift:1});
const visitor=target('visitor',6);
const podium=target('podium',7);
const ghosts=[target('rabbit',1),target('queen',2),target('angel',3),target('phantom',4)];
const view={aspect:1.8,reduced:false,space:false,walls:[],visitor,podium,ghosts,details:[],events:[]};

test('broadcast visits each instrument and section and each available ghost before repeating',()=>{
 const camera=new BroadcastCamera(0,()=>.26);
 const parts=new Map(ORCHESTRA_LAYOUT.map(p=>[`${p.x},${STAGE_FLOOR+p.rise+.88},${p.z}`,p.section+'/'+p.instrument]));
 const expectedParts=new Set(parts.values());
 const seenParts=new Set<string>();
 const seenGhosts=new Set<string>();
 for(let seconds=0;seconds<2600;seconds+=10){
  const {look}=camera.frame(seconds,view);
  const part=parts.get(look.toArray().join(','));
  if(part&&seenParts.size<expectedParts.size){
   assert.ok(!seenParts.has(part),`part repeated early: ${part}`);
   seenParts.add(part);
  }
  const ghost=ghosts.find(g=>g.x===look.x&&g.y===look.y&&g.z===look.z);
  if(ghost&&seenGhosts.size<ghosts.length){
   assert.ok(!seenGhosts.has(ghost.id),`ghost repeated early: ${ghost.id}`);
   seenGhosts.add(ghost.id);
  }
  if(seenParts.size===expectedParts.size&&seenGhosts.size===ghosts.length)break;
 }
 assert.deepEqual(seenParts,expectedParts);
 assert.deepEqual(seenGhosts,new Set(ghosts.map(g=>g.id)));
});

test('the orchestra holds for 18 seconds and returns after every cutaway',()=>{
 const director=new BroadcastCamera(0,()=>0);
 const stageZ=director.frame(0,view).look.z;
 assert.equal(director.frame(17.99,view).look.z,stageZ);
 assert.notEqual(director.frame(18,view).look.z,stageZ);
 assert.equal(director.frame(24,view).look.z,stageZ);
 assert.equal(director.frame(41.99,view).look.z,stageZ);
 assert.equal(director.frame(42,view).look.x,ghosts[0].x);
 assert.equal(director.frame(46,view).look.z,stageZ);
});

test('a fast live event holds its framing and leaves a stage and regular cut before another event',()=>{
 const director=new BroadcastCamera(0,()=>0);
 const ghost={...target('late-train-ghost',9),fixed:true};
 const live={...view,events:[ghost]};
 const stageZ=director.frame(0,live).look.z;
 assert.equal(director.frame(11.99,live).look.z,stageZ);
 const first=director.frame(12,live);
 assert.equal(first.look.x,ghost.x);
 const later=director.frame(14,{...live,events:[{...ghost,x:12,y:2.8}]});
 assert.deepEqual(later,first);
 assert.equal(director.frame(15,view).look.z,stageZ);
 assert.equal(director.frame(27,live).look.z,stageZ);
 assert.notEqual(director.frame(33,live).look.x,ghost.x);
 assert.equal(director.frame(39,view).look.z,stageZ);
 assert.equal(director.frame(51,live).look.x,ghost.x);
});

test('a brief audience reaction holds long enough to read even after its animation finishes',()=>{
 const director=new BroadcastCamera(0,()=>0);
 const reaction={...target('clapping-visitor',10),reaction:true,fixed:true};
 const stageZ=director.frame(0,view).look.z;
 const cut=director.frame(12,{...view,events:[reaction]});
 assert.equal(cut.look.x,reaction.x);
 assert.deepEqual(director.frame(14,view),cut);
 assert.equal(director.frame(15.5,view).look.z,stageZ);
});

test('moving NPCs and train b-roll both hold their original positions and aim',()=>{
 const director=new BroadcastCamera(0,()=>0);
 const rabbit={...ghosts[0],fixed:true};
 const train={...target('train',10),fixed:true};
 const moving={...view,ghosts:[rabbit],details:[train]};
 const stageZ=director.frame(0,moving).look.z;
 director.frame(18,moving);
 director.frame(24,moving);
 const rabbitShot=director.frame(42,moving);
 assert.equal(rabbitShot.look.x,rabbit.x);
 assert.deepEqual(director.frame(44,{...moving,ghosts:[{...rabbit,x:4}]}),rabbitShot);
 assert.equal(director.frame(46,moving).look.z,stageZ);
 const trainShot=director.frame(64,moving);
 assert.equal(trainShot.look.x,train.x);
 assert.deepEqual(director.frame(66,{...moving,details:[{...train,x:12}]}),trainShot);
 assert.equal(director.frame(69,moving).look.z,stageZ);
});

test('all indoor stage angles keep the ensemble in portrait framing and drift slowly',()=>{
 const aspect=390/844;
 const camera=new PerspectiveCamera(70,aspect,.08,150);
 const director=new BroadcastCamera(0,()=>0);
 const portrait={...view,aspect};
 const cuts=[18,42,64];
 const starts=[0,24,46,69];
 const positions:Vector3[]=[];
 for(const [index,start] of starts.entries()){
  if(index>0)director.frame(cuts[index-1],portrait);
  positions.push(director.frame(start,portrait).position);
  for(const elapsed of [start,start+9,start+17.99]){
   const {look,position}=director.frame(elapsed,portrait);
   assert.ok(position.distanceTo(positions[index])<2);
   camera.position.copy(position);
   camera.lookAt(look);
   camera.updateMatrixWorld();
   for(const player of ORCHESTRA_LAYOUT){
    const center=new Vector3(player.x,STAGE_FLOOR+player.rise+1,player.z).project(camera);
    assert.ok(Math.abs(center.x)<.96&&Math.abs(center.y)<.96,`${player.instrument} cropped at ${elapsed} seconds`);
   }
  }
 }
 const [front,left,high,right]=positions;
 assert.ok(left.x< -10&&right.x>10);
 assert.ok(high.y>front.y+8);
});

test('space coverage uses a reverse stage angle and follows the current planet position',()=>{
 const director=new BroadcastCamera(0,()=>0);
 const saturn={id:'saturn',position:new Vector3(40,37,100)};
 const space={...view,space:true,planets:[saturn]};
 for(const time of [0,18,24,42])director.frame(time,space);
 const reverse=director.frame(46,space);
 assert.ok(reverse.position.z< -24&&reverse.look.z>0);
 assert.ok(reverse.position.y>8.3);
 assert.deepEqual(director.frame(64,space).look,saturn.position);
 const moved={...saturn,position:new Vector3(44,37,98)};
 assert.deepEqual(director.frame(67,{...space,planets:[moved]}).look,moved.position);
 const indoors=director.frame(68,view);
 assert.ok(indoors.position.z>0&&indoors.position.y<8.3);
});

test('close-ups change angles to avoid stage foliage and keep the stage when the subject is fully covered',()=>{
 const tree=TREE_SPOTS[0];
 const rear={...target('behind-tree',tree.x),z:tree.z-3,distance:4};
 const director=new BroadcastCamera(0,()=>0);
 const behindTree={...view,events:[rear]};
 const frame=director.frame(12,behindTree);
 assert.equal(frame.look.z,rear.z);
 assert.ok(Math.abs(frame.position.x-tree.x)>2);

 const covered={...rear,z:tree.z};
 const blocked=new BroadcastCamera(0,()=>0);
 const stageZ=blocked.frame(0,view).look.z;
 assert.equal(blocked.frame(12,{...view,events:[covered]}).look.z,stageZ);
 assert.equal(blocked.frame(13,{...view,events:[rear]}).look.z,stageZ);
});
