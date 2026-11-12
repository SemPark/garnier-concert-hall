import * as T from 'three';
import {timberDoor} from '../src/scene/GoldenHall';
type Rect=[number,number,number,number];
function subtract(a:Rect,b:Rect):Rect[]{
 const l=Math.max(a[0],b[0]),r=Math.min(a[1],b[1]),d=Math.max(a[2],b[2]),u=Math.min(a[3],b[3]);if(l>=r-1e-7||d>=u-1e-7)return [a];
 return [[a[0],l,a[2],a[3]],[r,a[1],a[2],a[3]],[l,r,a[2],d],[l,r,u,a[3]]].filter(x=>x[1]-x[0]>1e-7&&x[3]-x[2]>1e-7) as Rect[];
}
const scene=new T.Scene(),door=timberDoor(scene,0,0,4.8,6.85,.4,3);scene.updateMatrixWorld(true);
let total=0;const boxes:{mesh:T.Mesh;bounds:T.Box3;normals:Set<string>;triangles:number}[]=[];
door.traverse(o=>{if(!(o instanceof T.Mesh))return;const g=o.geometry,triangles=(g.index?.count??g.getAttribute('position').count)/3;total+=triangles;
 if(!(g instanceof T.BoxGeometry))return;const e=o.matrixWorld.elements;if(![0,4,8].every(i=>[e[i],e[i+1],e[i+2]].filter(v=>Math.abs(v)>1e-6).length===1))return;
 const n=g.getAttribute('normal'),normals=new Set<string>(),normal=new T.Vector3(),normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld),index=g.index;
 for(let i=0;i<(index?.count??n.count);i++){normal.fromBufferAttribute(n,index?index.getX(i):i).applyMatrix3(normalMatrix).normalize();normals.add(normal.toArray().map(v=>Math.round(v)).join(','));}
 boxes.push({mesh:o,bounds:new T.Box3().setFromObject(o),normals,triangles});
});
let before=0,after=0,fullyHidden=0;
for(const box of boxes){before+=box.triangles;let visible=0;const lo=box.bounds.min.toArray(),hi=box.bounds.max.toArray();
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const normal=[0,0,0];normal[axis]=sign;if(!box.normals.has(normal.join(',')))continue;const axes=[0,1,2].filter(a=>a!==axis),plane=sign>0?hi[axis]:lo[axis];let pieces:Rect[]=[[lo[axes[0]],hi[axes[0]],lo[axes[1]],hi[axes[1]]]];
  for(const other of boxes){if(other===box)continue;const min=other.bounds.min.toArray(),max=other.bounds.max.toArray();if(min[axis]>plane+1e-7||max[axis]<plane-1e-7||(sign>0?max[axis]<=plane+1e-7:min[axis]>=plane-1e-7))continue;
   pieces=pieces.flatMap(p=>subtract(p,[min[axes[0]],max[axes[0]],min[axes[1]],max[axes[1]]]));
  }visible+=pieces.length*2;
 }after+=visible;if(!visible)fullyHidden++;
}
console.log(JSON.stringify({door:'4.8 × 6.85, six raised panels',boxMeshes:boxes.length,boxTrianglesBefore:before,boxTrianglesAfterExactHiddenSurfaceCut:after,totalTrianglesBefore:total,totalTrianglesAfter:total-before+after,fullyHiddenBoxMeshes:fullyHidden,note:'Geometry experiment only; rectangle cuts retain visible faces but can increase triangulation. No GPU timing measured.'},null,2));
