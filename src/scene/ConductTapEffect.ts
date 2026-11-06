import * as T from 'three';
/** One lightweight ring follows the baton hand; each tap restarts its outward fade. */
export class ConductTapEffect{
 readonly root=new T.Group();private ring:T.Mesh;private sparks:T.Points;
 constructor(scene:T.Scene){
  this.ring=new T.Mesh(new T.RingGeometry(.16,.19,24),new T.MeshBasicMaterial({color:0xffdfa0,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
  const points=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;points.push(Math.cos(a)*.28,Math.sin(a)*.28,0);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));this.sparks=new T.Points(g,new T.PointsMaterial({color:0xffedc2,size:.045,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.root.add(this.ring,this.sparks);scene.add(this.root);this.root.visible=false;
 }
 update(hand:T.Object3D,camera:T.Camera,pulse:number){this.root.visible=pulse>0;if(!pulse)return;hand.getWorldPosition(this.root.position);this.root.quaternion.copy(camera.quaternion);this.root.scale.setScalar(.6+(1-pulse)*1.8);(this.ring.material as T.MeshBasicMaterial).opacity=pulse*.75;(this.sparks.material as T.PointsMaterial).opacity=pulse;}
 hide(){this.root.visible=false;}
 dispose(){this.root.removeFromParent();this.ring.geometry.dispose();(this.ring.material as T.Material).dispose();this.sparks.geometry.dispose();(this.sparks.material as T.Material).dispose();}
}
