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

const shell=new T.SphereGeometry(.085,12,6),filling=new T.CylinderGeometry(.079,.079,.028,12);
const pink=new T.MeshLambertMaterial({color:0xe6a0ac}),cream=new T.MeshLambertMaterial({color:0xffecd3});
export function buildMacaron(){
 const group=new T.Group();group.position.set(0,.075,-.04);
 for(const sign of [-1,1]){const half=new T.Mesh(shell,pink);half.scale.y=.42;half.position.y=sign*.027;group.add(half);}
 group.add(new T.Mesh(filling,cream));return group;
}
