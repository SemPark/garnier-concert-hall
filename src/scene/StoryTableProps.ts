import * as T from 'three';
import {DINNER_TABLES,FLOOR_SEATS,type Visitor} from '../../shared/venue';
import {TABLE_RADIUS} from '../../shared/dinnerTables';
import {atTeaTable,TEA_POUR_MS} from '../../shared/tea';
import {PARTERRE} from '../../shared/parterre';
import {TEA_TABLE} from './GhostTeaParty';
import {QUEEN_SEAT} from './NpcBehavior';
import {TAROT_HOST_SEAT} from '../../shared/storyGuestSeats';
import {buildWishTarotTable} from './WishTarotTable';
import {buildStoryTableCloth} from './StoryTableCloth';
import {buildWishFlower} from './WishFlower';

function place(scene:T.Scene,tableId:number,column:number,name:string,fromCenter=.48){
 const table=DINNER_TABLES.find(t=>t.id===tableId)!;
 const seat=FLOOR_SEATS.find(s=>s.row===tableId&&s.column===column)!;
 const prop=new T.Group();
 prop.name=name;
 prop.position.set(T.MathUtils.lerp(table.x,seat.x,fromCenter),PARTERRE.floor+.761,T.MathUtils.lerp(table.z,seat.z,fromCenter));
 prop.rotation.y=seat.yaw;
 scene.add(prop);
 return prop;
}

export function buildStoryTableProps(scene:T.Scene){
 const teapot=place(scene,TEA_TABLE,1,'모자장수의 점프하는 주전자',.31);
 const pot=new T.Group();
 teapot.add(pot);
 const ceramic=new T.MeshStandardMaterial({color:0x477667,roughness:.3});
 const brass=new T.MeshStandardMaterial({color:0xc49952,roughness:.35,metalness:.5});
 const add=(geometry:T.BufferGeometry,material:T.Material,y=0)=>{
  const mesh=new T.Mesh(geometry,material);
  mesh.position.y=y;
  pot.add(mesh);
 };
 add(new T.SphereGeometry(.135,16,10).scale(1,.78,1),ceramic,.113);
 add(new T.SphereGeometry(.091,16,8).scale(1,.3,1),ceramic,.205);
 add(new T.SphereGeometry(.023,10,8),brass,.247);
 add(new T.TorusGeometry(.077,.013,6,16).translate(-.144,.125,0),ceramic);
 const spout=new T.CatmullRomCurve3([
  new T.Vector3(.1,.095,0),new T.Vector3(.17,.12,0),
  new T.Vector3(.212,.177,0),new T.Vector3(.237,.21,0),
 ]);
 add(new T.TubeGeometry(spout,10,.026,8,false),ceramic);
 add(new T.TorusGeometry(.026,.005,6,12).rotateY(Math.PI/2).translate(.237,.21,0),brass);
 const stream=new T.Mesh(new T.CylinderGeometry(.009,.013,1,6),new T.MeshBasicMaterial({color:0xc58b3b,transparent:true,opacity:.7,depthWrite:false}));
 stream.name='주전자에서 잔으로 흐르는 차';stream.visible=false;scene.add(stream);
 const cupPosition=new T.Vector3(),destination=new T.Vector3(),spoutPosition=new T.Vector3(),direction=new T.Vector3();
 const up=new T.Vector3(0,1,0);

 const cards=place(scene,QUEEN_SEAT.row,QUEEN_SEAT.column,'하트 여왕의 트럼프 카드',.39);
 const queenCloth=buildStoryTableCloth(cards,0x8c263d);
 const cardTargets:T.Mesh[]=[];
 const canvas=document.createElement('canvas');
 canvas.width=128;
 canvas.height=192;
 const ctx=canvas.getContext('2d')!;
 const geometry=new T.PlaneGeometry(.15,.225).rotateX(-Math.PI/2);
 const textures:T.CanvasTexture[]=[];
 for(const [i,rank] of ['A','K','Q'].entries()){
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,128,192);
  ctx.strokeStyle='#bc8b4d';
  ctx.strokeRect(6,6,116,180);
  ctx.fillStyle='#a42136';
  ctx.font='bold 28px Georgia';
  ctx.fillText(rank,12,36);
  ctx.font='76px Georgia';
  ctx.fillText('♥',24,124);
  ctx.save();
  ctx.translate(128,192);
  ctx.rotate(Math.PI);
  ctx.font='bold 28px Georgia';
  ctx.fillText(rank,12,36);
  ctx.restore();
  const face=document.createElement('canvas');
  face.width=128;
  face.height=192;
  face.getContext('2d')!.drawImage(canvas,0,0);
  const map=new T.CanvasTexture(face);
  map.colorSpace=T.SRGBColorSpace;
  textures.push(map);
  const card=new T.Mesh(geometry,new T.MeshStandardMaterial({map,roughness:.75}));
  card.position.set((i-1)*.12,.013+i*.002,.15);
  card.rotation.y=(i-1)*.27;
  card.userData.queenCard=true;
  cards.add(card);
  cardTargets.push(card);
 }
 const tarotRoot=place(scene,TAROT_HOST_SEAT.row,TAROT_HOST_SEAT.column,'랜턴 캐릭터 앞 소원 타로',.39);
 const tarot=buildWishTarotTable(tarotRoot);
 const wishFlower=buildWishFlower(scene);
 return {
  cardTargets,
  wishFlower,
  update(time:number,visitors:Visitor[],reduced:boolean){
   stream.visible=false;
   const diner=visitors.find(v=>v.drink==='tea'&&atTeaTable(v)&&v.teaReadyAt&&time*1000>=v.teaReadyAt-TEA_POUR_MS&&time*1000<v.teaReadyAt);
   if(diner){
    const seat=FLOOR_SEATS.find(s=>s.id===diner.seatId)!;
    const table=DINNER_TABLES.find(t=>t.id===TEA_TABLE)!;
    const dx=seat.x-table.x,dz=seat.z-table.z,length=Math.hypot(dx,dz);
    cupPosition.set(table.x+dx/length*(TABLE_RADIUS-.28),PARTERRE.floor+.872,table.z+dz/length*(TABLE_RADIUS-.28));
    if(diner.dish){direction.set(-.3,0,.2).applyAxisAngle(up,Math.atan2(dx,dz)+Math.PI);cupPosition.add(direction);}
    const age=(time*1000-(diner.teaReadyAt!-TEA_POUR_MS))/1000;
    const travel=T.MathUtils.smoothstep(age,0,1)*(1-T.MathUtils.smoothstep(age,5,6));
    destination.copy(cupPosition);destination.x-=.31;destination.y+=.42;
    teapot.worldToLocal(destination);pot.position.copy(destination).multiplyScalar(travel);
    pot.rotation.order='YXZ';pot.rotation.y=-teapot.rotation.y*travel;
    pot.rotation.z=-.65*T.MathUtils.smoothstep(age,.9,1.4)*(1-T.MathUtils.smoothstep(age,4.6,5));
    if(age>1.35&&age<4.65){
     spoutPosition.set(.237,.21,0);pot.localToWorld(spoutPosition);
     direction.copy(spoutPosition).sub(cupPosition);
     stream.position.copy(cupPosition).add(spoutPosition).multiplyScalar(.5);
     stream.scale.y=direction.length();stream.quaternion.setFromUnitVectors(up,direction.normalize());stream.visible=true;
    }
    return;
   }
   pot.position.set(0,0,0);pot.rotation.y=0;
   const jump=reduced?0:T.MathUtils.clamp((time%4.6-2.8)/.68,0,1);
   const lift=4*jump*(1-jump);
   pot.position.y=.19*lift;
   pot.rotation.z=.15*Math.sin(jump*2*Math.PI)*lift;
  },
  dispose(){stream.removeFromParent();stream.geometry.dispose();stream.material.dispose();queenCloth.dispose();tarot.dispose();wishFlower.dispose();for(const texture of textures)texture.dispose();},
 };
}
