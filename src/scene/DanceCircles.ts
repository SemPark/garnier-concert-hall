import * as T from 'three';
import {JAZZ_HALL} from '../../shared/hallKind';
import {dancePose} from '../../shared/dance';
import {CAPACITY,type Visitor} from '../../shared/venue';

/** One shared draw for the dance spots on the floor. */
export class DanceCircles {
 readonly material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,side:T.DoubleSide,
  uniforms:{time:{value:0}},
  vertexShader:`attribute float openSpot;varying float available;varying vec2 circleUV;
void main(){available=openSpot;circleUV=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float time;varying float available;varying vec2 circleUV;
void main(){
 float radius=length(circleUV),angle=atan(circleUV.y,circleUV.x);
 float outline=1.-smoothstep(.012,.035,abs(radius-.80));
 float waveRadius=.45+.4*fract(time*.28);
 float wave=(1.-smoothstep(.015,.05,abs(radius-waveRadius)))*(1.-fract(time*.28))*.4;
 float arcs=pow(max(0.,cos(angle*3.-time*.8)),12.)*(1.-smoothstep(.02,.07,abs(radius-.92)));
 float occupied=max(outline*(.46+.12*sin(time*2.4)),max(wave*.72,arcs*.48));
 float alpha=mix(occupied,max(outline*(.65+.15*sin(time*2.)),max(wave,arcs*.8)),available);
 if(alpha<.015)discard;
 gl_FragColor=vec4(1.,.78,.36,alpha);
}`
 });
 readonly geometry=new T.PlaneGeometry(1.08,1.08);
 readonly mesh=new T.InstancedMesh(this.geometry,this.material,CAPACITY*2);
 private matrix=new T.Matrix4();
 private rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
 private position=new T.Vector3();
 private scale=new T.Vector3(1,1,1);
 private openSpots=new T.InstancedBufferAttribute(new Float32Array(CAPACITY*2),1);
 constructor(){this.geometry.setAttribute('openSpot',this.openSpots);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);}
 update(visitors:readonly Visitor[],now:number,reduced:boolean,npcs:readonly Visitor[]){
  let count=0;
  const limit=this.mesh.instanceMatrix.count;
  for(const list of [visitors,npcs])for(const visitor of list){
   if(count>=limit)break;
   if(visitor.zone!=='auditorium'||!visitor.dance||visitor.dance.chair)continue;
   const pose=dancePose(visitor,now,JAZZ_HALL);
   this.setSpot(count++,pose,false);
   if(count<limit&&visitor.dance.joinSpot&&visitor.dance.endingAt===undefined)this.setSpot(count++,visitor.dance.joinSpot,true);
  }
  this.mesh.count=count;this.mesh.visible=count>0;
  this.mesh.instanceMatrix.needsUpdate=true;
  this.openSpots.needsUpdate=true;
  this.material.uniforms.time.value=reduced?0:(now%120000)/1000;
 }
 private setSpot(index:number,spot:{x:number;y:number;z:number},available:boolean){
  this.position.set(spot.x,spot.y+.025,spot.z);
  this.matrix.compose(this.position,this.rotation,this.scale);
  this.mesh.setMatrixAt(index,this.matrix);
  this.openSpots.setX(index,available?1:0);
 }
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
