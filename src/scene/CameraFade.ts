import * as T from 'three';

export function cameraFadeGroup(parent:T.Object3D){
 const group=new T.Group();
 group.userData.cameraFade=true;
 parent.add(group);
 return group;
}

/** Fade an assembly when it crosses the segment from the camera to its focus. */
export class CameraFade{
 private readonly bounds=new T.Box3();
 private readonly parts:T.Box3[]=[];
 private readonly meshes:{mesh:T.Mesh;material:T.Material}[]=[];
 private readonly transparent=new Map<T.Material,T.Material>();
 private readonly ray=new T.Ray();
 private readonly local=new T.Matrix4();
 private readonly end=new T.Vector3();
 private readonly hit=new T.Vector3();
 private amount=1;

 constructor(private readonly root:T.Object3D){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert();
  root.traverse(object=>{
   if(!(object instanceof T.Mesh)||Array.isArray(object.material)||!object.material.visible)return;
   if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
   const part=object.geometry.boundingBox!.clone().applyMatrix4(this.local.multiplyMatrices(inverse,object.matrixWorld));
   this.parts.push(part);
   this.bounds.union(part);
  });
 }

 add(mesh:T.Mesh){
  if(!Array.isArray(mesh.material)&&mesh.material.visible)this.meshes.push({mesh,material:mesh.material});
 }

 update(eye:T.Vector3,focus:T.Vector3,maxDistance:number,seconds:number){
  this.root.updateWorldMatrix(true,false);
  this.local.copy(this.root.matrixWorld).invert();
  this.ray.origin.copy(eye).applyMatrix4(this.local);
  this.end.copy(focus).applyMatrix4(this.local);
  this.ray.direction.copy(this.end).sub(this.ray.origin);
  const length=Math.min(this.ray.direction.length(),maxDistance);
  this.ray.direction.normalize();
  const crosses=(box:T.Box3)=>box.containsPoint(this.ray.origin)||
   !!this.ray.intersectBox(box,this.hit)&&this.hit.distanceToSquared(this.ray.origin)<length*length;
  const covered=length>.05&&crosses(this.bounds)&&this.parts.some(crosses);
  const target=covered ? .17 : 1;
  if(this.amount===target)return;
  this.amount=T.MathUtils.damp(this.amount,target,covered?26:16,seconds);
  if(Math.abs(this.amount-target)<.015)this.amount=target;
  for(const {mesh,material} of this.meshes){
   if(this.amount===1){mesh.material=material;continue;}
   let fade=this.transparent.get(material);
   if(!fade){
    fade=material.clone();
    fade.onBeforeCompile=material.onBeforeCompile;
    fade.customProgramCacheKey=material.customProgramCacheKey;
    fade.transparent=true;
    fade.depthWrite=false;
    this.transparent.set(material,fade);
   }
   fade.opacity=material.opacity*this.amount;
   mesh.material=fade;
  }
 }

 dispose(){
  for(const {mesh,material} of this.meshes)mesh.material=material;
  for(const material of this.transparent.values())material.dispose();
 }
}
