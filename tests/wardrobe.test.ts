import * as T from 'three';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Avatar} from '../src/character/Avatar';
import {LocalConcert} from '../src/network/LocalConcert';
import {CLOAKROOM_APPROACH,OUTFITS,atCloakroom} from '../shared/wardrobe';
import {visitorColor} from '../shared/venue';

test('outfits can only be selected by the cloakroom and survive entering the auditorium',()=>{
 const concert=new LocalConcert();assert.equal(concert.send({type:'outfit',outfit:'navy'}),false);
 Object.assign(concert.visitor,CLOAKROOM_APPROACH);
 assert.equal(concert.send({type:'outfit',outfit:'navy'}),true);assert.equal(concert.snapshot().visitors[0].outfit,'navy');
 assert.equal(concert.send({type:'zone',zone:'auditorium'}),true);assert.equal(concert.snapshot().visitors[0].outfit,'navy');
 assert.equal(concert.send({type:'outfit',outfit:'wine'}),false);assert.equal(concert.visitor.outfit,'navy');
 assert.equal(atCloakroom({zone:'lobby',...CLOAKROOM_APPROACH,y:7.2}),false,'upper gallery does not open the wardrobe below');
});
test('an unknown outfit does not alter the current clothes',()=>{
 const concert=new LocalConcert();Object.assign(concert.visitor,CLOAKROOM_APPROACH);
 assert.equal(concert.send({type:'outfit',outfit:'wine'}),true);
 assert.equal(concert.send({type:'outfit',outfit:'invalid' as 'wine'}),false);assert.equal(concert.visitor.outfit,'wine');
});
test('chosen clothing colour is identical for every observer, independent of visitor ID',()=>{
 for(const outfit of OUTFITS){assert.equal(visitorColor({id:'alice',outfit:outfit.id}),outfit.color);assert.equal(visitorColor({id:'bob',outfit:outfit.id}),outfit.color);}
});
test('a seated skirt pins its waist and drapes onto the lap instead of rotating up',()=>{
 const woman=new Avatar(0x293c56,undefined,4,'navy'),man=new Avatar(0x293c56,undefined,0,'navy');
 assert.ok(woman.skirt);assert.equal(man.skirt,null);
 const parts:string[]=[];woman.root.traverse(o=>{if(o.userData.garment)parts.push(o.userData.garment);});
 assert.equal(parts.includes('trousers'),false);assert.equal(parts.filter(p=>p==='stocking').length,2);
 const position=woman.skirt.geometry.getAttribute('position');woman.update(1,0,true,false,null,10,1);
 const point=new T.Vector3();let hem=0;
 for(let i=0;i<position.count;i++){
  woman.skirt.getVertexPosition(i,point);
  if(Math.abs(position.getY(i))<.0001)assert.ok(point.distanceTo(new T.Vector3().fromBufferAttribute(position,i))<.0001,'waist stays attached');
  assert.ok(point.y<=.001,'fabric never rises above the waist');
  if(position.getY(i)<-.57){hem++;assert.ok(point.z<-.3&&point.y<-.20&&point.y>-.38,'hem drops over the knees');}
 }
 assert.ok(hem>20);assert.equal(woman.skirt.rotation.x,0);
 woman.update(2,0,false,false,null,10,1);assert.ok(woman.skirt.morphTargetInfluences![0]<.001,'standing restores the dress');
});

test('female orchestra members wear trousers while female visitors keep their skirt',()=>{
 for(const instrument of ['violin','cello','flute','conductor'] as const){
  const musician=new Avatar(0x242329,instrument,4);assert.equal(musician.skirt,null);
  const parts:string[]=[];musician.root.traverse(o=>{if(o.userData.garment)parts.push(o.userData.garment);});
  assert.equal(parts.filter(p=>p==='trousers').length,2);assert.equal(parts.includes('stocking'),false);
 }
});

test('floor-standing instruments stay fixed while their performers sway and sit',()=>{
 for(const type of ['cello','bass','harp','piano','celesta','timpani','bass-drum','gong','snare','chimes','xylophone','marimba','vibraphone'] as const){
  const actor=new Avatar(0x242329,type,4);actor.update(0,0,true,true,null,10,1);actor.root.updateMatrixWorld(true);
  const before=actor.instrument.matrixWorld.clone();
  actor.update(2,0,true,true,null,10,1);actor.root.updateMatrixWorld(true);
  assert.deepEqual(actor.instrument.matrixWorld.elements,before.elements,type);
 }
});

test('painted eyes, smile and blush follow the face and the head no longer scans sideways',async()=>{
 const {faceSurfaceZ}=await import('../src/character/Face'),actor=new Avatar(0x293c56,undefined,4);
 let patches=0;actor.head.traverse(o=>{if(o instanceof T.Mesh&&o.userData.surfaceDecal){patches++;const points=o.geometry.getAttribute('position');for(let i=0;i<points.count;i++)assert.ok(Math.abs(points.getZ(i)-faceSurfaceZ(points.getX(i),points.getY(i)))<.0025,'facial paint stays flush');}});assert.equal(patches,7);
 for(const sitting of [false,true])for(const t of [.3,1,2,6]){actor.update(t,0,sitting,true,null,10,1);assert.equal(actor.head.rotation.y,0);assert.equal(actor.head.rotation.z,0);assert.equal(actor.body.rotation.z,0);}
});
