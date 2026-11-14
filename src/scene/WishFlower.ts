import * as T from 'three';
import {createDaystarMaterial} from './vendor/threejs-vfx/WishMaterials';
import {PARTERRE} from '../../shared/parterre';
import {DINNER_TABLES,FLOOR_SEATS,surfaceHeight,type Zone} from '../../shared/venue';
import {SEATED_STORY_CAST,TAROT_HOST_SEAT} from '../../shared/storyGuestSeats';
import type {TarotCard} from '../tarot/TarotCardFrame';

const table=DINNER_TABLES.find(t=>t.id===TAROT_HOST_SEAT.row)!;
const surface=PARTERRE.floor+.77;
const hosts=SEATED_STORY_CAST.filter(s=>s.row===table.id).map(({column})=>{
 const seat=FLOOR_SEATS.find(s=>s.row===table.id&&s.column===column)!;
 return new T.Vector3(T.MathUtils.lerp(seat.x,table.x,.32),surface+.42,T.MathUtils.lerp(seat.z,table.z,.32));
});
const grip=new T.Vector3(-.018,.018,-.045);
const gripRotation=new T.Quaternion().setFromEuler(new T.Euler(-.18,0,.35));

function makeCardTexture(card:TarotCard,image:HTMLImageElement){
 const canvas=document.createElement('canvas');
 canvas.width=128;
 canvas.height=192;
 const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#f0e3c6';
 ctx.fillRect(0,0,128,192);
 ctx.strokeStyle='#9e7539';
 ctx.lineWidth=2;
 ctx.strokeRect(4,4,120,184);
 ctx.drawImage(image,14,27,100,150);
 ctx.font='bold 17px Georgia, serif';
 ctx.textAlign='center';
 ctx.fillStyle='#672b38';
 ctx.fillText(card.number,64,23);
 const texture=new T.CanvasTexture(canvas);
 texture.colorSpace=T.SRGBColorSpace;
 return texture;
}

/** Two lights form a bouquet, which flies to the player's hand and stays there. */
export function buildWishFlower(hall:T.Scene){
 const bouquet=new T.Group();
 bouquet.name='소원 타로 꽃다발';
 const green=new T.MeshStandardMaterial({color:0x5c7040,roughness:.85});
 const petalsMaterial=new T.MeshStandardMaterial({roughness:.72});
 const paper=new T.MeshStandardMaterial({color:0xddbf91,roughness:.95,side:T.DoubleSide});
 const ribbonMaterial=new T.MeshStandardMaterial({color:0x9a384c,roughness:.6});
 const stemGeometry=new T.CylinderGeometry(.007,.009,1,6);
 const petalGeometry=new T.SphereGeometry(1,9,6);
 const flowers=[
  [-.153,.34,.018,0xffdfbc],[-.075,.407,-.013,0xffecd2],[.033,.408,.021,0xffe5c6],
  [.151,.36,.015,0xf0bcb4],[-.104,.31,-.086,0xeeb6a8],[.013,.341,-.108,0xffeacc],
  [.106,.319,-.075,0xffead0],
 ] as const;
 const stems=new T.InstancedMesh(stemGeometry,green,flowers.length);
 const petals=new T.InstancedMesh(petalGeometry,petalsMaterial,flowers.length*10);
 const leaves=new T.InstancedMesh(petalGeometry,green,6);
 const pose=new T.Object3D();
 const up=new T.Vector3(0,1,0);
 const base=new T.Vector3(0,-.13,0);
 const stem=new T.Vector3();
 for(const [index,[x,y,z,color]] of flowers.entries()){
  stem.set(x,y,z).sub(base);
  pose.position.copy(base).addScaledVector(stem,.5);
  pose.quaternion.setFromUnitVectors(up,stem.clone().normalize());
  pose.scale.set(1,stem.length(),1);
  pose.updateMatrix();
  stems.setMatrixAt(index,pose.matrix);
  for(let i=0;i<10;i++){
   const inner=i>=6;
   const angle=i*(inner?Math.PI/2:Math.PI/3)+index*.47;
   const radius=inner?.021:.037;
   pose.position.set(x+Math.cos(angle)*radius,y+(inner?.031:.011),z+Math.sin(angle)*radius);
   pose.rotation.set(.38,-angle,0);
   pose.scale.set(inner?.023:.031,.017,inner?.026:.039);
   pose.updateMatrix();
   const petal=index*10+i;
   petals.setMatrixAt(petal,pose.matrix);
   petals.setColorAt(petal,new T.Color(color));
  }
 }
 for(let i=0;i<leaves.count;i++){
  const angle=i*Math.PI/3;
  pose.position.set(Math.cos(angle)*.12,.255+i%2*.03,Math.sin(angle)*.096);
  pose.rotation.set(-.4,-angle,.45);
  pose.scale.set(.09,.014,.038);
  pose.updateMatrix();
  leaves.setMatrixAt(i,pose.matrix);
 }
 bouquet.add(stems,petals,leaves);

 const wrapper=new T.Mesh(new T.CylinderGeometry(.146,.036,.30,7,1,true,.45,Math.PI*1.84),paper);
 wrapper.position.y=.095;
 wrapper.scale.z=.78;
 const ribbon=new T.Mesh(new T.CylinderGeometry(.059,.053,.037,10,1,true),ribbonMaterial);
 ribbon.position.y=-.014;
 const bow=new T.InstancedMesh(petalGeometry,ribbonMaterial,2);
 for(const [index,side] of [-1,1].entries()){
  pose.position.set(side*.035,-.013,-.05);
  pose.rotation.set(0,0,side*.31);
  pose.scale.set(.042,.023,.015);
  pose.updateMatrix();
  bow.setMatrixAt(index,pose.matrix);
 }
 bouquet.add(wrapper,ribbon,bow);

 const cardGeometry=new T.PlaneGeometry(.132,.198);
 const cardFront=new T.MeshBasicMaterial({color:0xffffff});
 const cardBack=new T.MeshBasicMaterial({color:0x702c40});
 const cardSlot=new T.Group();
 cardSlot.name='꽃다발에 꽂힌 타로 카드';
 cardSlot.position.set(.026,.414,-.106);
 cardSlot.rotation.set(.14,Math.PI,-.14);
 const back=new T.Mesh(cardGeometry,cardBack);
 back.rotation.y=Math.PI;
 cardSlot.add(new T.Mesh(cardGeometry,cardFront),back);
 bouquet.add(cardSlot);

 const lightGeometry=new T.IcosahedronGeometry(.026,1);
 const lightMaterial=new T.MeshBasicMaterial({color:0xffdf97});
 const lights=hosts.map(()=>new T.Mesh(lightGeometry,lightMaterial));
 const meeting=new T.Vector3(table.x,surface+.52,table.z);
 const destination=new T.Vector3();
 const handRotation=new T.Quaternion();
 let started:number|null=null;
 let title:string|null=null;
 let wishAt:number|null=null;
 const flight=new T.Group();
 const sparks=new T.InstancedMesh(new T.OctahedronGeometry(.036),new T.MeshBasicMaterial({
  color:0xffdf92,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 }),32);
 sparks.frustumCulled=false;
 const star=new T.Mesh(new T.PlaneGeometry(1,1),createDaystarMaterial());
 star.frustumCulled=false;
 const beam=new T.Mesh(new T.PlaneGeometry(2.8,4.5),new T.ShaderMaterial({
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{strength:{value:0}},
  vertexShader:`
   varying vec2 vUv;
   void main(){
    vec4 centre=modelViewMatrix*vec4(0.,0.,0.,1.);
    vec3 right=normalize(vec3(viewMatrix[0].x,0.,viewMatrix[2].x));
    centre.xyz+=mat3(viewMatrix)*(right*position.x+vec3(0.,position.y,0.));
    vUv=uv;
    gl_Position=projectionMatrix*centre;
   }
  `,
  fragmentShader:`
   varying vec2 vUv;
   uniform float strength;
   void main(){
    float y=vUv.y;
    float x=abs(vUv.x-.5);
    float width=mix(.43,.19,y);
    float veil=1.-smoothstep(0.,width,x);
    float core=1.-smoothstep(0.,width*.32,x);
    float fade=smoothstep(0.,.19,y)*(1.-smoothstep(.68,1.,y));
    gl_FragColor=vec4(mix(vec3(1.,.54,.19),vec3(1.,.94,.7),core),
      strength*fade*(veil*.35+core*.16));
   }
  `,
 }));
 beam.frustumCulled=false;
 const floorLight=new T.Group();
 const goldRing=(inner:number,outer:number,color:number)=>{
  const mesh=new T.Mesh(new T.RingGeometry(inner,outer,64),new T.MeshBasicMaterial({
   color,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  }));
  mesh.rotation.x=-Math.PI/2;
  return mesh;
 };
 const seal=goldRing(.95,1,0xffce75);
 const ripple=goldRing(.975,1,0xffac4a);
 floorLight.add(seal,ripple);
 flight.add(sparks,star,beam,floorLight);
 const flashCentre=new T.Vector3();
 const starUniforms=star.material.uniforms;
 starUniforms.uGranule.value=.12;

 return {
  get cardName(){return title;},
 get wishing(){return wishAt!==null;},
 wish(time:number){
  if(!title||wishAt!==null)return;
  wishAt=time;
 },

  show(card:TarotCard,image:HTMLImageElement,time:number){
   this.discard();
   cardFront.map=makeCardTexture(card,image);
   cardFront.needsUpdate=true;
   title=card.nameKo;
   started=time;
   hall.add(bouquet,...lights);
   bouquet.visible=false;
   for(const [index,light] of lights.entries()){
    light.position.copy(hosts[index]);
    light.visible=true;
   }
  },
  discard(){
   title=null;
   started=null;
   wishAt=null;
   flight.removeFromParent();
   cardSlot.position.set(.026,.414,-.106);
   cardSlot.scale.setScalar(1);
   cardFront.color.set(0xffffff);
   for(const part of [stems,petals,leaves,wrapper,ribbon,bow])part.scale.setScalar(1);

   bouquet.removeFromParent();
   for(const light of lights)light.removeFromParent();
   cardFront.map?.dispose();
   cardFront.map=null;
  },
  update(time:number,hand:T.Group,skipHandoff:boolean,visible:boolean,avatarPosition:T.Vector3,zone:Zone){
   if(!title)return;
   if(wishAt!==null){
    const age=Math.max(0,time-wishAt);
    if(age>=6){this.discard();return;}
    const release=Math.max(0,age-2);
    if(!flight.parent){
     let scene:T.Object3D=hand;
     while(scene.parent)scene=scene.parent;
     scene.add(flight);
    }
    flight.position.copy(avatarPosition);
    beam.position.y=2.28;
    const strength=T.MathUtils.smoothstep(age,.12,1.35)*(1-T.MathUtils.smoothstep(age,3.7,5.9));
    beam.material.uniforms.strength.value=strength;
    const floorY=surfaceHeight(zone,avatarPosition);
    floorLight.visible=floorY!==null;
    if(floorY!==null){
     floorLight.position.y=floorY-avatarPosition.y+.018;
     seal.scale.setScalar(T.MathUtils.lerp(.38,.95,T.MathUtils.smoothstep(age,0,1)));
     seal.material.opacity=T.MathUtils.smoothstep(age,0,.65)*(1-T.MathUtils.smoothstep(age,3.7,5.9))*.94;
     ripple.scale.setScalar(T.MathUtils.lerp(.87,1.46,T.MathUtils.smoothstep(age,.65,2.65)));
     ripple.material.opacity=T.MathUtils.smoothstep(age,.65,1.05)*(1-T.MathUtils.smoothstep(age,1.25,2.65))*.72;
     ripple.visible=ripple.material.opacity>0;
    }
    sparks.material.opacity=strength*.9;
    for(let i=0;i<sparks.count;i++){
     const rise=(i/sparks.count+age*.32)%1;
     const angle=i*2.399+age*(1.15+i%3*.18);
     const radius=.37+(i%7)*.055;
     pose.position.set(Math.cos(angle)*radius,.15+rise*3.25,Math.sin(angle)*radius);
     pose.rotation.set(age+i,angle,age*.7);
     pose.scale.setScalar(Math.sin(rise*Math.PI)*(.48+i%4*.22));
     pose.updateMatrix();sparks.setMatrixAt(i,pose.matrix);
    }
    sparks.instanceMatrix.needsUpdate=true;
    star.visible=release>=1.15;
    starUniforms.uTime.value=age;
    starUniforms.uCentre.value.copy(flight.localToWorld(flashCentre.set(0,1.32+Math.max(0,release-1.15)*1.18,0)));
    starUniforms.uSize.value=.075+.13*Math.exp(-(((release-1.35)*4)**2));
    starUniforms.uWarm.value=.9;
    starUniforms.uFade.value=T.MathUtils.smoothstep(release,1.15,1.36)*(1-T.MathUtils.smoothstep(release,2.8,4));
    const shrink=1-T.MathUtils.smoothstep(release,0,1.3);
    for(const part of [stems,petals,leaves,wrapper,ribbon,bow])part.scale.setScalar(shrink);
    cardSlot.position.y=.414+Math.min(release,1.4)*.2;
    cardFront.color.setRGB(1,1,Math.max(.35,1-release*.4));
    cardSlot.scale.setScalar(1-T.MathUtils.smoothstep(release,.92,1.36));
   }
   if(started!==null){
    const age=skipHandoff?2:Math.max(0,time-started);
    const merge=T.MathUtils.smoothstep(age,0,.85);
    for(const [index,light] of lights.entries()){
     light.visible=age<.85;
     if(!light.visible)continue;
     light.position.copy(hosts[index]).lerp(meeting,merge);
     light.position.y+=Math.sin(merge*Math.PI)*.17;
    }
    if(age<1.9){
     bouquet.visible=age>=.68;
     const travel=T.MathUtils.smoothstep(age,.85,1.9);
     hand.localToWorld(destination.copy(grip));
     bouquet.position.copy(meeting).lerp(destination,travel);
     bouquet.position.y+=Math.sin(travel*Math.PI)*.16;
     bouquet.quaternion.copy(hand.getWorldQuaternion(handRotation)).multiply(gripRotation);
     bouquet.scale.setScalar(Math.max(.01,T.MathUtils.smoothstep(age,.68,1.08)));
     return;
    }
    started=null;
    for(const light of lights)light.removeFromParent();
   }
   if(bouquet.parent!==hand){
    hand.add(bouquet);
    bouquet.position.copy(grip);
    bouquet.quaternion.copy(gripRotation);
    bouquet.scale.setScalar(1);
   }
   bouquet.visible=visible;
  },
  dispose(){
   this.discard();
   for(const ring of [seal,ripple]){ring.geometry.dispose();ring.material.dispose();}
   sparks.dispose();sparks.geometry.dispose();sparks.material.dispose();
   beam.geometry.dispose();beam.material.dispose();
   star.geometry.dispose();star.material.dispose();
   for(const mesh of [stems,petals,leaves,bow])mesh.dispose();
   for(const geometry of [stemGeometry,petalGeometry,wrapper.geometry,ribbon.geometry,cardGeometry,lightGeometry])geometry.dispose();
   for(const material of [green,petalsMaterial,paper,ribbonMaterial,cardFront,cardBack,lightMaterial])material.dispose();
  },
 };
}
