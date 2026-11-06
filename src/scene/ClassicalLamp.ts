import * as T from 'three';
import {cylinder,sphere} from './primitives';
let halo:T.CanvasTexture|undefined;
/** A compact brass globe with a soft, depth-tested halo, shared by statue torches and stair newels. */
export function classicalLamp(parent:T.Object3D,x:number,y:number,z:number,light=false){
 const root=new T.Group();root.position.set(x,y,z);root.name='classical-globe-lamp';parent.add(root);
 cylinder(root,.025,.23,[0,-.15,0],0xc3a25c);cylinder(root,.16,.06,[0,-.055,0],0xc3a25c);
 const globe=sphere(root,.13,[0,.09,0],0xffedc2);globe.scale.y*=1.25;globe.material=new T.MeshStandardMaterial({color:0xffe1a1,emissive:0xffbf66,emissiveIntensity:1.7,roughness:.38});
 cylinder(root,.055,.04,[0,.27,0],0xc3a25c);
 if(typeof document!=='undefined'){
  if(!halo){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,232,188,.55)');g.addColorStop(.2,'rgba(255,213,146,.2)');g.addColorStop(1,'rgba(255,213,146,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);halo=new T.CanvasTexture(canvas);halo.colorSpace=T.SRGBColorSpace;}
  const sprite=new T.Sprite(new T.SpriteMaterial({map:halo,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sprite.position.y=.09;sprite.scale.setScalar(.9);root.add(sprite);
 }
 if(light){const glow=new T.PointLight(0xffbf66,7,5,2);glow.position.y=.12;root.add(glow);}
 root.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});return root;
}
