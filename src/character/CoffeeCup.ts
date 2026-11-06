import * as T from 'three';
const cup=new T.LatheGeometry([[0,0],[.045,0],[.062,.012],[.078,.14],[.067,.14],[.054,.025],[0,.025]].map(([x,y])=>new T.Vector2(x,y)),12);
const handle=new T.TorusGeometry(.055,.012,6,12),coffee=new T.CircleGeometry(.065,16);
const ceramic=new T.MeshLambertMaterial({color:0xf4ebda}),drink=new T.MeshLambertMaterial({color:0x43291c});
/** Shared meshes use the avatar's existing instance batches and hand transform. */
export function buildCoffeeCup(){
 const group=new T.Group();group.position.set(-.175,-.058,-.035);
 group.add(new T.Mesh(cup,ceramic));const ring=new T.Mesh(handle,ceramic);ring.position.set(.12,.105,0);group.add(ring);
 const surface=new T.Mesh(coffee,drink);surface.rotation.x=-Math.PI/2;surface.position.y=.125;group.add(surface);group.scale.setScalar(0);return group;
}

// The macaron is two side halves (cut at x=0) so one bite can take a whole half away.
const shellHalf=new T.SphereGeometry(.085,12,6,Math.PI/2,Math.PI),fillingHalf=new T.CylinderGeometry(.079,.079,.028,12,1,false,0,Math.PI);
const shellCut=new T.CircleGeometry(.085,12),fillingCut=new T.PlaneGeometry(.158,.028);
const pink=new T.MeshLambertMaterial({color:0xe6a0ac}),cream=new T.MeshLambertMaterial({color:0xffecd3});
const pinkCut=new T.MeshLambertMaterial({color:0xe6a0ac,side:T.DoubleSide}),creamCut=new T.MeshLambertMaterial({color:0xffecd3,side:T.DoubleSide});
export function buildMacaron(){
 const group=new T.Group();group.position.set(0,.075,-.04);
 const halves=[1,-1].map(side=>{
  const half=new T.Group();half.rotation.y=side>0?0:Math.PI;group.add(half);
  for(const sign of [-1,1]){
   const shell=new T.Mesh(shellHalf,pink);shell.scale.y=.42;shell.position.y=sign*.027;half.add(shell);
   const cut=new T.Mesh(shellCut,pinkCut);cut.rotation.y=-Math.PI/2;cut.scale.y=.42;cut.position.y=sign*.027;half.add(cut);
  }
  half.add(new T.Mesh(fillingHalf,cream));const face=new T.Mesh(fillingCut,creamCut);face.rotation.y=-Math.PI/2;half.add(face);
  return half;
 });
 group.userData.halves=halves;return group;
}
