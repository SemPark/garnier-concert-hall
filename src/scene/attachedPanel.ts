import * as T from 'three';
// A rectangular front attachment: its back is sealed by the supporting surface.
const geometry=new T.BoxGeometry(1,1,1);
const index=geometry.index!,normal=geometry.getAttribute('normal'),kept:number[]=[];
for(let i=0;i<index.count;i+=3)if(normal.getZ(index.getX(i))>-.5)kept.push(index.getX(i),index.getX(i+1),index.getX(i+2));
geometry.setIndex(kept);geometry.clearGroups();
/** All four edge faces and the front remain; only the fully covered back is omitted. */
export function attachedPanel(parent:T.Object3D,width:number,height:number,back:number,front:number,x:number,y:number,material:T.Material){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,(back+front)/2);mesh.scale.set(width,height,front-back);mesh.receiveShadow=true;mesh.userData.fullDetail=true;parent.add(mesh);return mesh;
}
