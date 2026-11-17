import * as T from 'three';
import {surfaceHeight,walkable,type Point,type Zone} from '../../shared/venue';
import {visitorBlocksStep} from '../../shared/visitorCollision';
import {findPath} from '../navigation/path';

export const PET_VISITOR_GAP=.64;

/** Hit target, path to the head, and feedback shared by the pets. */
export abstract class PettableAnimal{
 readonly root=new T.Group();
 readonly targets:T.Mesh<T.BoxGeometry,T.MeshBasicMaterial>[];
 readonly approach={x:0,y:0,z:0};
 protected happyUntil=0;
 protected heldUntil=0;
 private heart?:T.Sprite;
 constructor(private readonly scene:T.Scene,private readonly zone:Zone,readonly species:'cat'|'dog'){
  scene.add(this.root);
  const hit=new T.Mesh(new T.BoxGeometry(.7,.85,1.1),new T.MeshBasicMaterial({visible:false}));
  hit.userData.pettableAnimal=species;
  scene.add(hit);
  this.targets=[hit];
 }
 get canPet(){return true;}
 abstract petPoint(out:T.Vector3):T.Vector3;

 invite(visitor:T.Vector3):Point[]|null{
  if(!this.canPet)return null;
  const center=this.root.position;
  const head=this.petPoint(new T.Vector3());
  const startDistance=Math.hypot(visitor.x-head.x,visitor.z-head.z);
  const angle=Math.atan2(visitor.x-head.x,visitor.z-head.z);
  const candidates=[0,.4,-.4,.8,-.8,1.6,-1.6,2.4,-2.4,Math.PI].map(offset=>({
   x:head.x+Math.sin(angle+offset)*.72,y:center.y,z:head.z+Math.cos(angle+offset)*.72,
  }));
  if(Math.abs(visitor.y-center.y)<.2&&startDistance>=.45&&startDistance<=.6)
   candidates.unshift({x:visitor.x,y:center.y,z:visitor.z});
  for(const point of candidates){
   const floor=surfaceHeight(this.zone,point,center.y);
   if(floor===null||Math.abs(floor-center.y)>.2)continue;
   point.y=floor;
   if(!walkable(this.zone,point)||visitorBlocksStep(point,point,center,PET_VISITOR_GAP+.02))continue;
   const path=findPath(this.zone,visitor,point);
   if(!path||path.some((step,i)=>visitorBlocksStep(path[i-1]??visitor,step,center,PET_VISITOR_GAP)))continue;
   Object.assign(this.approach,point);
   this.heldUntil=Infinity;
   return path;
  }
  return null;
 }

 release(){this.heldUntil=0;}
 pet(now:number){
  this.happyUntil=now+3;this.heldUntil=now+4;
  if(this.heart)return;
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 65px sans-serif';ctx.lineJoin='round';
  ctx.lineWidth=8;ctx.strokeStyle='#594737';ctx.strokeText('♥',192,64);ctx.fillStyle='#ed7189';ctx.fillText('♥',192,64);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  this.heart=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
  this.heart.scale.set(1.8,.6,1);this.heart.renderOrder=30;
  this.scene.add(this.heart);
 }
 protected updateInteraction(now:number,reduced:boolean){
  const {x,y,z}=this.root.position;
  const hit=this.targets[0];
  hit.position.set(x,y+.42,z);hit.rotation.y=this.root.rotation.y;hit.updateMatrixWorld(true);
  if(!this.heart)return;
  const age=3-this.happyUntil+now;
  this.heart.visible=now<this.happyUntil;
  this.heart.position.set(x,y+1.05+(reduced?0:Math.max(0,age)*.12),z);
  this.heart.material.opacity=this.heart.visible?Math.min(1,age/.15,(this.happyUntil-now)/.5):0;
  this.heart.updateMatrixWorld(true);
 }
 dispose(){
  this.heart?.material.map?.dispose();
  this.heart?.material.dispose();
  this.heart?.removeFromParent();
  this.targets[0].material.dispose();
 }
}
