import * as T from 'three';

/** Combine repeated architecture without changing interactive or collision targets. */
export function batchArchitecture(scene:T.Scene,exclude:T.Object3D[]){
 const protectedObjects=new Set<T.Object3D>();for(const root of exclude)root.traverse(o=>protectedObjects.add(o));
 scene.updateMatrixWorld(true);const groups=new Map<string,T.Mesh[]>();
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o)||Array.isArray(o.material))return;const key=o.geometry.uuid+'/'+o.material.uuid;const group=groups.get(key)??[];group.push(o);groups.set(key,group);});
 for(const objects of groups.values()){if(objects.length<2)continue;const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);batch.receiveShadow=true;objects.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.removeFromParent();});batch.computeBoundingSphere();scene.add(batch);}
}

/** Character parts remain independently posed; repeated parts are drawn in batches. */
export function batchCharacters(scene:T.Scene,roots:T.Object3D[]){
 const groups=new Map<string,T.Mesh[]>();for(const root of roots)root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;const key=o.geometry.uuid+'/'+o.material.uuid;const group=groups.get(key)??[];group.push(o);groups.set(key,group);o.visible=false;});
 const batches=[...groups.values()].map(objects=>{const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;scene.add(batch);return {batch,objects};});
 return ()=>{for(const root of roots)root.updateMatrixWorld(true);for(const {batch,objects}of batches){objects.forEach((m,i)=>batch.setMatrixAt(i,m.matrixWorld));batch.instanceMatrix.needsUpdate=true;}};
}
