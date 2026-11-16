import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GOLDEN_HALL} from '../shared/goldenHall';
import {SpacePlanets,SPACE_ORBIT_CENTER} from '../src/scene/SpaceSky';

test('Earth keeps a north-up axis toward the hall and spins back to Korea',()=>{
 const scene=new T.Scene(),planets=new SpacePlanets(scene);
 const earth=planets.root.getObjectByName('earth')!;
 const surface=earth.children[0] as T.Mesh<T.SphereGeometry,T.MeshBasicMaterial>;
 const map=new T.Texture(),camera=new T.PerspectiveCamera();
 surface.material.map=map;
 const latitude=T.MathUtils.degToRad(36),longitude=T.MathUtils.degToRad(128);
 const korea=new T.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),-Math.cos(latitude)*Math.sin(longitude));
 const hall=SPACE_ORBIT_CENTER.clone();hall.y=1.3+GOLDEN_HALL.balconyHeight/2;

 planets.update(1);
 for(const [seconds,offset] of [[0,0],[30,.25],[120,0],[180,.5],[360,0],[540,.5]]){
  planets.orbit(seconds);
  planets.root.updateMatrixWorld(true);
  surface.onBeforeRender(null!,scene,camera,surface.geometry,surface.material,null!);
  assert.equal(map.offset.x,offset);
  const towardsHall=hall.clone().sub(earth.getWorldPosition(new T.Vector3())).normalize();
  const facing=korea.clone().transformDirection(surface.matrixWorld);
  assert.ok(facing.dot(towardsHall)>.9999);
 }
 map.dispose();
 planets.dispose();
});

test('the moon keeps its scale and circles Earth on the concert clock',()=>{
 const planets=new SpacePlanets(new T.Scene());
 const earth=planets.root.getObjectByName('earth')!;
 const surface=earth.children[0] as T.Mesh<T.SphereGeometry>;
 const moon=earth.getObjectByName('moon') as T.Mesh<T.SphereGeometry>;
 assert.equal(moon.parent,earth);
 assert.ok(Math.abs(moon.geometry.parameters.radius/surface.geometry.parameters.radius-.273)<.001);

 planets.update(1);
 planets.orbit(0);
 const start=moon.position.clone();
 planets.orbit(24);
 assert.ok(start.distanceTo(moon.position)>40);
 assert.ok(Math.abs(start.length()-moon.position.length())<.001);
 const pole=new T.Vector3(0,1,0).applyQuaternion(surface.quaternion);
 const orbitAxis=start.clone().cross(moon.position).normalize();
 assert.ok(Math.abs(start.dot(pole))<.001);
 assert.ok(orbitAxis.dot(pole)<-.95,'the moon orbits toward the direction of Earth’s positive texture scroll');
 planets.orbit(96);
 assert.ok(start.distanceTo(moon.position)<.001);
 planets.dispose();
});

test('planetary silhouettes stay separated from both floors across orbital phases',()=>{
 const planets=new SpacePlanets(new T.Scene());
 const groups=planets.root.children.filter(child=>child instanceof T.Group);
 const distant=planets.root.getObjectByName('space-distant-planets') as T.InstancedMesh;
 const matrix=new T.Matrix4();
 const viewpoints=[-13.5,0,13.5].flatMap(x=>
  [1.3,9.6].flatMap(y=>[-22,14,46].map(z=>new T.Vector3(x,y,z))),
 );

 planets.update(1);
 for(let seconds=0;seconds<720;seconds+=30){
  planets.orbit(seconds);
  planets.root.updateMatrixWorld(true);
  const silhouettes=groups.map(group=>{
   const surface=group.children[0] as T.Mesh<T.SphereGeometry>;
   const moon=group.getObjectByName('moon') as T.Mesh<T.SphereGeometry>|undefined;
   const ring=group.name==='saturn'?group.children[1] as T.Mesh<T.RingGeometry>:undefined;
   const radius=moon?moon.position.length()+moon.geometry.parameters.radius
    :ring?.geometry.parameters.outerRadius??surface.geometry.parameters.radius;
   return {name:group.name,center:group.getWorldPosition(new T.Vector3()),radius};
  });
  for(let i=0;i<distant.count;i++){
   distant.getMatrixAt(i,matrix);
   silhouettes.push({name:`distant planet ${i+1}`,center:distant.localToWorld(new T.Vector3().setFromMatrixPosition(matrix)),
    radius:matrix.getMaxScaleOnAxis()});
  }
  for(const eye of viewpoints){
   const discs=silhouettes.map(({name,center,radius})=>{
    const direction=center.clone().sub(eye),distance=direction.length();
    return {name,direction:direction.divideScalar(distance),radius:Math.asin(radius/distance)};
   });
   for(const [i,a] of discs.entries())for(const b of discs.slice(i+1)){
    const gap=a.direction.angleTo(b.direction)-a.radius-b.radius;
    assert.ok(T.MathUtils.radToDeg(gap)>5,`${a.name} and ${b.name} crowd the same view`);
   }
  }
 }
 planets.dispose();
});
