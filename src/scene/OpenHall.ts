import * as T from 'three';
import {GOLDEN_HALL} from '../../shared/goldenHall';

const retainedArchitecture=new Set(['pipe-organ','gallery-rail','gallery-rail-corner-infill','gallery-floor','herringbone-gallery-floor']);

/** Split architecture before batching; the organ is a protected, full-height landmark. */
export function separateUpperHall(scene:T.Scene,height=GOLDEN_HALL.balconyHeight){
 const upper=new T.Scene();upper.name='hall-upper-architecture';
 scene.updateMatrixWorld(true);
 const cutoff={value:Infinity};
 upper.userData.transitionCutoff=cutoff;
 const meshes:T.Mesh[]=[];
 const upperObjects:T.Object3D[]=[];
 const position=new T.Vector3();
 const collect=(o:T.Object3D)=>{
  const kind=o.userData.landmark;
  if(retainedArchitecture.has(kind))return;
  // Keep the fixture root with its meshes: the wall wash is built from the root later.
  if(o.userData.upperWallLight||
    (o instanceof T.Sprite||kind==='panel-centre-sconce'||kind==='door-header-light')&&o.getWorldPosition(position).y>=height){
   upperObjects.push(o);return;
  }
  if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))meshes.push(o);
  for(const child of o.children)collect(child);
 };
 collect(scene);
 for(const object of upperObjects)upper.attach(object);
 for(const mesh of meshes){
  const bounds=new T.Box3().setFromObject(mesh);
  if(bounds.max.y<=height)continue;
  mesh.userData.openHallCutoff=cutoff;
  if(bounds.min.y>=height){upper.attach(mesh);continue;}
  // Crossing walls are cut into triangles, so neither half depends on a hidden source object.
  const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  source.applyMatrix4(mesh.matrixWorld);
  const names=Object.keys(source.attributes),position=source.getAttribute('position');
  const outputs=[Object.fromEntries(names.map(n=>[n,[] as number[]])),Object.fromEntries(names.map(n=>[n,[] as number[]]))];
  const materialGroups:{start:number;count:number;materialIndex:number}[][]=[[],[]];
  for(let i=0;i<position.count;i+=3){
   const triangle=[0,1,2].map(j=>Object.fromEntries(names.map(n=>{
    const a=source.getAttribute(n);return [n,Array.from({length:a.itemSize},(_,k)=>a.array[(i+j)*a.itemSize+k])];
   })));
   for(let side=0;side<2;side++){
    const polygon:typeof triangle=[];
    for(let j=0;j<3;j++){
     const a=triangle[j],b=triangle[(j+1)%3],inside=side===0?a.position[1]<=height:a.position[1]>=height;
     const next=side===0?b.position[1]<=height:b.position[1]>=height;
     if(inside)polygon.push(a);
     if(inside!==next){
      const t=(height-a.position[1])/(b.position[1]-a.position[1]);
      polygon.push(Object.fromEntries(names.map(n=>[n,a[n].map((v,k)=>v+(b[n][k]-v)*t)])));
     }
    }
    const start=outputs[side].position.length/3;
    const count=Math.max(0,polygon.length-2)*3;
    if(count&&source.groups.length)materialGroups[side].push({start,count,materialIndex:source.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0});
    for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])
     for(const n of names)outputs[side][n].push(...v[n]);
   }
  }
  outputs.forEach((values,side)=>{
   if(!values.position.length)return;
   const geometry=new T.BufferGeometry();
   for(const n of names)geometry.setAttribute(n,new T.Float32BufferAttribute(values[n],source.getAttribute(n).itemSize));
   for(const g of materialGroups[side])geometry.addGroup(g.start,g.count,g.materialIndex);
   const part=new T.Mesh(geometry,mesh.material);part.userData={...mesh.userData};part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;
   (side?upper:scene).add(part);
  });
  source.dispose();mesh.removeFromParent();
 }
 return upper;
}
