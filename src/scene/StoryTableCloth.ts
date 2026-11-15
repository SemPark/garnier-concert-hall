import * as T from 'three';

/** A small coloured cloth over the existing ivory tablecloth. */
export function buildStoryTableCloth(root:T.Group,color:number){
 const geometry=new T.PlaneGeometry(.84,.72).rotateX(-Math.PI/2);
 const material=new T.MeshStandardMaterial({color,roughness:.98});
 const cloth=new T.Mesh(geometry,material);
 cloth.name='금색 가장자리의 테이블보';
 cloth.position.y=.006;
 root.add(cloth);
 const hemGeometry=new T.BufferGeometry().setFromPoints([
  new T.Vector3(-.392,.008,-.332),new T.Vector3(.392,.008,-.332),
  new T.Vector3(.392,.008,.332),new T.Vector3(-.392,.008,.332),
 ]);
 const hemMaterial=new T.LineBasicMaterial({color:0xd6b476});
 const hem=new T.LineLoop(hemGeometry,hemMaterial);
 root.add(hem);
 return {dispose(){cloth.removeFromParent();hem.removeFromParent();geometry.dispose();material.dispose();hemGeometry.dispose();hemMaterial.dispose();}};
}
