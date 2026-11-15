import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {chairOffset,MAGIC_CHAIR_SEAT,MAGIC_CHAIR_TRAVEL,type MagicChairState} from '../../shared/magicChair';

/** The one unbatched chair is merged into two material meshes, never duplicated in static architecture. */
export class MagicChair{
 private readonly x:number;
 private readonly z:number;
 private readonly hitX:number;
 private readonly hitZ:number;
 constructor(readonly root:T.Group,private readonly hit:T.Object3D,private readonly seat=MAGIC_CHAIR_SEAT){
  root.name='스스로 움직이는 의자';
  this.x=root.position.x;this.z=root.position.z;this.hitX=hit.position.x;this.hitZ=hit.position.z;
  const parts=new Map<T.Material,T.BufferGeometry[]>();
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert();
  root.traverse(o=>{
   if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
   let g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
   // Shared primitive boxes may already have lobby-generated UV/occlusion attributes.
   for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
   if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}
   const list=parts.get(o.material)??[];list.push(g);parts.set(o.material,list);
  });
  root.clear();
  for(const [material,geometries] of parts){
   const geometry=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());
   const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=true;root.add(mesh);
  }
 }
 update(state:MagicChairState|undefined,now:number){
  const offset=chairOffset(state,now),dx=Math.sin(this.seat.yaw)*offset,dz=Math.cos(this.seat.yaw)*offset;
  this.root.rotation.y=this.hit.rotation.y=this.seat.yaw+offset/MAGIC_CHAIR_TRAVEL*.22;
  this.root.position.x=this.x+dx;this.root.position.z=this.z+dz;
  this.hit.position.x=this.hitX+dx;this.hit.position.z=this.hitZ+dz;
 }
}

export class MagicChairs{
 readonly root=new T.Group();
 private chairs:{id:string;chair:MagicChair}[]=[];
 add(scene:T.Scene,root:T.Group,hit:T.Object3D,seat:typeof MAGIC_CHAIR_SEAT){
  if(!this.root.parent)scene.add(this.root);
  this.root.add(root);this.chairs.push({id:seat.id,chair:new MagicChair(root,hit,seat)});
 }
 update(state:MagicChairState|undefined,now:number){
  for(const {id,chair} of this.chairs)chair.update(state?.chairs?.[id]??(id===MAGIC_CHAIR_SEAT.id?state:undefined),now);
 }
}
