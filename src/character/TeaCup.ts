import * as T from 'three';

const bowl=new T.LatheGeometry([[0,0],[.06,0],[.09,.04],[.105,.12],[.09,.12],[.075,.04],[0,.025]].map(([x,y])=>new T.Vector2(x,y)),12);
const handle=new T.TorusGeometry(.05,.012,5,10);
const porcelain=new T.MeshLambertMaterial({color:0xe6ddc7});
const liquidGeometry=new T.CircleGeometry(.087,12);
const teaMaterial=new T.MeshBasicMaterial({color:0x754518});

/** The same low, rounded porcelain cup used by the Hatter and his guests. */
export function buildTeaCup(){
 const cup=new T.Group();cup.name='모자장수의 찻잔';
 cup.add(new T.Mesh(bowl,porcelain));
 const ring=new T.Mesh(handle,porcelain);ring.position.set(-.13,.08,0);cup.add(ring);
 const liquid=new T.Mesh(liquidGeometry,teaMaterial);
 liquid.rotation.x=-Math.PI/2;liquid.position.y=.102;cup.add(liquid);
 cup.userData.liquid=liquid;
 cup.userData.radiusAt=(y:number)=>T.MathUtils.lerp(.075,.09,T.MathUtils.clamp((y-.04)/.08,0,1))/.087;
 return cup;
}
