import * as T from 'three';
import {PARTERRE} from '../../shared/parterre';
import {DINNER_TABLES,FLOOR_SEATS} from '../../shared/venue';
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
 return {
  get cardName(){return title;},
  show(card:TarotCard,image:HTMLImageElement,time:number){
   cardFront.map?.dispose();
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
   bouquet.removeFromParent();
   for(const light of lights)light.removeFromParent();
   cardFront.map?.dispose();
   cardFront.map=null;
  },
  update(time:number,hand:T.Group,skipHandoff:boolean,visible:boolean){
   if(!title)return;
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
   for(const mesh of [stems,petals,leaves,bow])mesh.dispose();
   for(const geometry of [stemGeometry,petalGeometry,wrapper.geometry,ribbon.geometry,cardGeometry,lightGeometry])geometry.dispose();
   for(const material of [green,petalsMaterial,paper,ribbonMaterial,cardFront,cardBack,lightMaterial])material.dispose();
  },
 };
}
