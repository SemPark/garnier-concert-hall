import * as T from 'three';
/** Exact static duplicates only: partial overlaps and different finishes remain untouched. */
export function removeDuplicates(scene:T.Scene,protectedObjects:Set<T.Object3D>){
 const seen=new Set<string>(),duplicates:T.Mesh[]=[];
 scene.traverse(o=>{
  if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||protectedObjects.has(o)||Array.isArray(o.material)||o.material.transparent||!o.material.visible||o.morphTargetInfluences||o.onBeforeRender!==T.Object3D.prototype.onBeforeRender)return;
  const geometry=o.geometry instanceof T.BoxGeometry?JSON.stringify(o.geometry.parameters):o.geometry.uuid;
  const key=[geometry,o.material.uuid,o.castShadow,o.receiveShadow,JSON.stringify(o.userData),o.matrixWorld.elements.map(n=>n.toFixed(7)).join(',')].join('/');
  if(seen.has(key))duplicates.push(o);else seen.add(key);
 });
 for(const mesh of duplicates)mesh.removeFromParent();return duplicates.length;
}
