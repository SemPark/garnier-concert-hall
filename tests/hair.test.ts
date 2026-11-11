import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Avatar} from '../src/character/Avatar';

/** The first part of the head a ray from outside meets on its way to a point. */
function firstHit(a:Avatar,from:T.Vector3,to:T.Vector3){
 a.root.updateMatrixWorld(true);const origin=a.head.localToWorld(from.clone()),target=a.head.localToWorld(to.clone());
 const hits=new T.Raycaster(origin,target.sub(origin).normalize()).intersectObjects(a.head.children,true);return hits[0]?.object;
}
const skullPoints=(a:Avatar)=>{const skull=a.head.children[0] as T.Mesh,out:T.Vector3[]=[];
 for(let u=0;u<48;u++)for(let v=0;v<24;v++){const th=u/48*Math.PI*2,ph=v/24*Math.PI;
  out.push(new T.Vector3(Math.sin(ph)*Math.cos(th)*skull.scale.x,Math.cos(ph)*skull.scale.y,Math.sin(ph)*Math.sin(th)*skull.scale.z).add(skull.position));}
 return out;};

test('men wear one simple cap and women one piece of long hair over the ears, with no lines on the face',()=>{
 const man=new Avatar(0x202020,undefined,0),woman=new Avatar(0x202020,undefined,4);
 assert.equal(man.hair,'short');assert.equal(woman.hair,'long');
 const parts=(a:Avatar)=>a.head.children.filter(o=>o.userData.hairPart).map(o=>o.userData.hairPart);
 assert.deepEqual(parts(man),['cap'],'one cap and no fringe');assert.deepEqual(parts(woman),['long'],'one piece, so nothing overlaps or flickers');
 // Seen from outside, the crown and the back of the head are hair, never skin.
 for(const a of [man,woman])for(const p of skullPoints(a)){if(!((p.y>.12&&p.z>-.18)||(p.z>.12&&p.y>.06)))continue;
  const from=p.clone().sub(new T.Vector3(0,.03,0)).normalize().multiplyScalar(2).add(p).add(new T.Vector3(.003,0,.002));// off the crown vertex
  assert.ok(firstHit(a,from,p)?.userData.hairPart,`${a.hair}: skin shows through the hair at ${p.toArray().map(n=>n.toFixed(2))}`);}
 // The cap now covers the earless sides. Check the real sculpted vertices, not an imaginary unit sphere.
 const cap=man.head.children.find(o=>o.userData.hairPart==='cap') as T.Mesh;
 cap.geometry.computeBoundingBox();const bounds=cap.geometry.boundingBox!;
 assert.ok(bounds.min.y<-.2&&bounds.max.y<.5);assert.ok(bounds.max.x<.45&&bounds.min.x>-.45);
 for(const p of [[-.115,-.025,-.315],[.115,-.025,-.315],[0,-.165,-.322]])assert.ok(!firstHit(man,new T.Vector3(p[0],p[1],-2),new T.Vector3(...p))?.userData.hairPart,'cap leaves the face clear');
 // The woman's hair covers both ears, and the eyes, cheeks, nose and mouth stay clear from the front.
 for(const side of [-1,1])assert.equal(firstHit(woman,new T.Vector3(side*2,-.03,0),new T.Vector3(side*.345,-.03,0))?.userData.hairPart,'long','the hair covers the ears');
 for(const p of [[-.115,-.025,-.315],[.115,-.025,-.315],[-.2,-.105,-.29],[.2,-.105,-.29],[0,-.085,-.345],[0,-.165,-.322]])
  assert.ok(!firstHit(woman,new T.Vector3(p[0],p[1],-2),new T.Vector3(...p))?.userData.hairPart,`hair covers the face at ${p}`);
 assert.equal(woman.eyes.children.filter(o=>o.userData.eyelash).length,0,'no lash strokes on the face');
 // It falls past the shoulders at the back, and below the shoulder joint (head-local y -.27) keeps clear of the upper arms.
 const long=woman.head.children.find(o=>o.userData.hairPart==='long') as T.Mesh,pos=long.geometry.getAttribute('position');
 const pts=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i));
 assert.ok(Math.min(...pts.map(p=>p.y))<-.5,'it falls past the shoulders at the back');
 for(const p of pts)if(p.y<-.27)assert.ok(Math.hypot(Math.abs(p.x)-.29,p.z)>.07,`hair cuts into the shoulder at ${p.toArray().map(n=>n.toFixed(2))}`);
});

test('a visitor can choose to appear as a man or a woman, and everyone gets the same avatar',async()=>{
 const {visitorVariant}=await import('../shared/venue');const {LocalConcert}=await import('../src/network/LocalConcert');
 const room=new LocalConcert();assert.ok(room.send({type:'look',look:'woman'}));assert.equal(room.visitor.look,'woman');
 assert.equal(new Avatar(0,undefined,visitorVariant(room.visitor)).appearance,'woman');
 assert.ok(room.send({type:'look',look:'man'}));assert.equal(new Avatar(0,undefined,visitorVariant(room.visitor)).appearance,'man');
 assert.equal(room.send({type:'look',look:'robot' as never}),false);
});
