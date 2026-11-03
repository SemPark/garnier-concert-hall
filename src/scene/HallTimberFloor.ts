import * as T from 'three';
import {woodMaterial} from './HallTextures';

/** One mesh of staggered planks: fine joints and subtle timber variation, using the lobby maps. */
export function buildHallTimberFloor(scene:T.Scene,width:number,front:number,rear:number){
 const positions:number[]=[],uv:number[]=[],colors:number[]=[],normals:number[]=[];
 const board=.36,length=3,gap=.002;
 for(let col=0,x=-width/2;x<width/2;x+=board,col++){
  const offset=(col%3)*length/3;
  for(let row=0,z=front-offset;z<rear;z+=length,row++){
   const x0=x+gap/2,x1=Math.min(width/2,x+board)-gap/2,z0=Math.max(front,z)+gap/2,z1=Math.min(rear,z+length)-gap/2;
   if(z1<=z0)continue;
   const tone=.91+((col*17+row*31)%13)/100,shift=((col*7+row*13)%19)/19;
   for(const [xx,zz]of [[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]]){
    positions.push(xx,0,zz);normals.push(0,1,0);uv.push((xx-x)/board*.45+shift,(zz-z)/length+shift);colors.push(tone,tone,tone);
   }
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const source=woodMaterial('floor'),material=source.clone();material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;material.vertexColors=true;
 const floor=new T.Mesh(geometry,material);floor.receiveShadow=true;floor.userData.fullDetail=true;floor.userData.landmark='staggered-timber-floor';scene.add(floor);return floor;
}
