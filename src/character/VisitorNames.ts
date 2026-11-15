import * as T from 'three';
import type {Avatar} from './Avatar';
import type {solidOcclusion} from '../scene/solidOcclusion';

const MAX_LABELS=16;
const REMOTE_RANGE_SQ=18*18;
type NamedAvatar={avatar:Avatar;visitor:{name:string;pose?:string}};
/** Just above a ghost's dome. A seated ghost sits 0.21 m forward of its seat and a little lower (see Ghosts). */
export function ghostTop(root:T.Object3D,sitting:boolean,out:T.Vector3){
 const forward=sitting?.21:0,yaw=root.rotation.y+Math.PI;
 return out.set(root.position.x+Math.sin(yaw)*forward,root.position.y+(sitting?1.36:1.4)+.37+.03,root.position.z+Math.cos(yaw)*forward);
}
type LabelBounds={x:number;y:number;halfWidth:number};

/** Reuse a small DOM pool so name tags add no WebGL draw calls. */
export class VisitorNames{
 private readonly layer=document.createElement('div');
 private readonly labels:HTMLSpanElement[]=[];
 private readonly placed:LabelBounds[]=[];
 private readonly anchor=new T.Vector3();
 private readonly screen=new T.Vector3();

 constructor(host:HTMLElement){
  this.layer.className='visitor-names';
  host.append(this.layer);
 }

 update(camera:T.Camera,self:NamedAvatar|null,visitors:Iterable<NamedAvatar>,occluded?:ReturnType<typeof solidOcclusion>,viewport?:{width:number;height:number}){
  const {width,height}=viewport??{width:innerWidth,height:innerHeight};
  const left=(innerWidth-width)/2,top=(innerHeight-height)/2;
  this.placed.length=0;
  camera.updateMatrixWorld();
  const show=({avatar,visitor:{name,pose}}:NamedAvatar,mine=false)=>{const sitting=pose==='sit';
   if(!avatar.root.visible||!name)return;
   // Others are ghosts (head centre 1.4 m, dome top +0.37 m): the tag floats just above the dome.
   if(mine){avatar.head.getWorldPosition(this.anchor);this.anchor.y+=.48*avatar.root.scale.y;}
   else ghostTop(avatar.root,sitting===true,this.anchor);
   this.screen.copy(this.anchor).project(camera);
   if(Math.abs(this.screen.z)>1||Math.abs(this.screen.x)>1||Math.abs(this.screen.y)>1)return;
   if(occluded?.(camera.position,this.anchor,.1))return;
   const halfWidth=Math.min(80,name.length*6+11+(mine?10:0));
   const x=Math.round((this.screen.x+1)*width/2),y=Math.round((1-this.screen.y)*height/2);
   if(x<halfWidth||x>width-halfWidth||y<22)return;
   if(this.placed.some(p=>Math.abs(p.x-x)<p.halfWidth+halfWidth&&Math.abs(p.y-y)<22))return;

   const slot=this.placed.length;
   this.placed.push({x,y,halfWidth});
   let label=this.labels[slot];
   if(!label){label=document.createElement('span');this.labels.push(label);this.layer.append(label);}
   // Your own tag carries a small "나" badge so you can find yourself at a glance.
   const key=(mine?'me:':'')+name;
   if(label.dataset.key!==key){label.dataset.key=key;label.className=mine?'self':'';
    if(mine){const badge=document.createElement('b');badge.textContent='나';label.replaceChildren(badge,document.createTextNode(name));}else label.textContent=name;}
   label.hidden=false;
   label.style.transform=`translate3d(${x+left}px,${y+top}px,0) translate(-50%,-100%)`;
  };

  if(self)show(self,true);
  const nearby:{entry:NamedAvatar;distanceSq:number}[]=[];
  for(const entry of visitors){
   if(!entry.avatar.root.visible)continue;
   const distanceSq=entry.avatar.root.position.distanceToSquared(camera.position);
   if(distanceSq<=REMOTE_RANGE_SQ)nearby.push({entry,distanceSq});
  }
  nearby.sort((a,b)=>a.distanceSq-b.distanceSq);
  for(const {entry} of nearby){
   if(this.placed.length>=MAX_LABELS)break;
   show(entry);
  }
  for(let i=this.placed.length;i<this.labels.length;i++)this.labels[i].hidden=true;
 }

 dispose(){this.layer.remove();}
}
