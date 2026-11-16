import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GOLDEN_HALL} from '../shared/goldenHall';
import {galaxySettingsForDevice,normalizeGalaxySettings,SpaceGalaxies,type GalaxySettings} from '../src/scene/SpaceGalaxies';
import {SpaceNebula} from '../src/scene/SpaceNebula';

function intervals(min:number,max:number){
 const count=Math.ceil((max-min)/10);
 return Array.from({length:count},(_,i)=>[
  T.MathUtils.lerp(min,max,i/count),T.MathUtils.lerp(min,max,(i+1)/count),
 ]);
}

test('all 18 galaxies clear the nebulae from inside the hall at maximum size',()=>{
 const scene=new T.Scene();
 const defaults:GalaxySettings={count:8,size:1,brightness:1,resolution:'desktop'};
 const settings=normalizeGalaxySettings({...defaults,count:99,size:2},defaults);
 assert.equal(settings.count,18);

 const nebula=new SpaceNebula(scene);
 const clouds=scene.children.slice() as T.Mesh<T.PlaneGeometry>[];
 const galaxies=new SpaceGalaxies(scene,settings);
 scene.updateMatrixWorld(true);

 const {width,height,front,rear}=GOLDEN_HALL;
 const cameraCells=intervals(-width/2,width/2).flatMap(xs=>intervals(0,height).flatMap(ys=>
  intervals(front,rear).map(zs=>xs.flatMap(x=>ys.flatMap(y=>zs.map(z=>new T.Vector3(x,y,z))))),
 ));
 const mesh=scene.getObjectByName('space-galaxies') as T.Mesh;
 const offsets=mesh.geometry.getAttribute('position'),centers=mesh.geometry.getAttribute('center');
 assert.equal(centers.count,settings.count*6);
 const directions=Array.from({length:settings.count},(_,i)=>new T.Vector3().fromBufferAttribute(centers,i*6).normalize());
 const elevations=directions.map(direction=>T.MathUtils.radToDeg(Math.asin(direction.y)));
 assert.ok(Math.min(...elevations)<0&&Math.max(...elevations)<45);
 for(const mobile of [true,false]){
  const count=galaxySettingsForDevice(mobile).count;
  const headings=directions.slice(0,count).map(({x,z})=>T.MathUtils.radToDeg(Math.atan2(x,-z))).sort((a,b)=>a-b);
  const gaps=headings.map((heading,i)=>(headings[i+1]??headings[0]+360)-heading);
  assert.ok(Math.max(...gaps)<91,'default galaxies cover the hall in every quarter');
  assert.ok(elevations.slice(0,count).filter(elevation=>elevation<15).length>=count/2,
   'at least half the default galaxies are low enough to see without looking high');
 }

 for(const cloud of clouds){
  const {width,height}=cloud.geometry.parameters;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>
   cloud.localToWorld(new T.Vector3(x*width/2,y*height/2,0)),
  );
  const edges=corners.map((start,i)=>({start,along:corners[(i+1)%4].clone().sub(start)}));
  for(let i=0;i<centers.count;i+=6){
   const center=mesh.localToWorld(new T.Vector3().fromBufferAttribute(centers,i));
   // The quad stays inside this sphere through the full rotation.
   const radius=new T.Vector3().fromBufferAttribute(offsets,i).length()*settings.size;
   for(const cell of cameraCells){
    // Use the same edge at every corner so separation holds throughout the camera cell.
    const clear=edges.some(({start,along})=>{
     const toCloud=cloud.position.clone().sub(start),toGalaxy=center.clone().sub(start);
     return cell.every(camera=>{
      const normal=new T.Vector3().crossVectors(along,camera.clone().sub(start)).normalize();
      return normal.dot(toCloud)<0&&normal.dot(toGalaxy)>radius;
     });
    });
    assert.ok(clear,`Galaxy ${i/6+1} overlaps ${cloud.name}`);
   }
  }
 }
 galaxies.dispose();
 nebula.dispose();
});
