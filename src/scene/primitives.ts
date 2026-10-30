import * as T from 'three';
const cache=new Map<string,T.MeshStandardMaterial>();
export function material(color:number,metalness=0,roughness=.72){const key=`${color}/${metalness}/${roughness}`;let m=cache.get(key);if(!m){m=new T.MeshStandardMaterial({color,metalness,roughness});cache.set(key,m);}return m;}
const boxes=new T.BoxGeometry(1,1,1),cylinders=new T.CylinderGeometry(1,1,1,8),spheres=new T.SphereGeometry(1,8,6);
export function box(parent:T.Object3D,size:number[],position:number[],color:number,metalness=0){const m=new T.Mesh(boxes,material(color,metalness));m.scale.set(size[0],size[1],size[2]);m.position.set(position[0],position[1],position[2]);m.receiveShadow=true;parent.add(m);return m;}
export function cylinder(parent:T.Object3D,r:number,h:number,position:number[],color:number){const m=new T.Mesh(cylinders,material(color));m.scale.set(r,h,r);m.position.set(position[0],position[1],position[2]);parent.add(m);return m;}
export function sphere(parent:T.Object3D,r:number,position:number[],color:number){const m=new T.Mesh(spheres,material(color));m.scale.setScalar(r);m.position.set(position[0],position[1],position[2]);parent.add(m);return m;}
export function line(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,color:number){const m=cylinder(parent,r,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),color);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
export function text(parent:T.Object3D,value:string,width:number,position:number[],color='#d9bf83'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;c.fillStyle=color;c.font='500 64px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillText(value,512,128);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide}));m.position.set(position[0],position[1],position[2]);parent.add(m);return m;
}
export const C={gold:0xb58a47,goldLight:0xd9bd7d,cream:0xe7d5ad,ivory:0xc7bfa9,wood:0x503628,dark:0x211b18,red:0x632331,redLight:0x8e3646,marble:0xd0c5ad};
