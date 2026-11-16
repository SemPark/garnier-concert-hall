import * as T from 'three';
import {material,sphere} from '../scene/primitives';

export const JAZZ_DRESS_COLOR=0xbd1639;
export const JAZZ_BLONDE=0xf1c977;

export function buildJazzGown(body:T.Group,color:number,skin:number){
 const profile=[
  [0,.022],[.33,.022],[.341,.055],[.31,.14],[.25,.27],[.196,.43],
  [.196,.55],[.207,.62],[.167,.76],[.182,.86],[.207,.93],[.181,.984],[0,.984],
 ];
 const geometry=new T.LatheGeometry(profile.map(([radius,y])=>new T.Vector2(radius,y)),48);
 const points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){
  const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
  const angle=Math.atan2(x,z);
  const drape=1-T.MathUtils.smoothstep(y,.06,.54);
  const fold=1+drape*(.055*Math.cos(6*angle+.65*y)+.035*Math.cos(9*angle));
  points.setXYZ(i,x*fold-.05*drape,y,z*.79*fold+.042*drape);
 }
 geometry.computeVertexNormals();
 const gown=new T.Mesh(geometry,material(color));
 gown.userData.garment='jazz-gown';
 gown.userData.clothContact='skirt';
 body.add(gown);
 const shoulders=sphere(body,.18,[0,.977,.008],skin);
 shoulders.scale.set(.184,.05,.111);
 // A diagonal sash follows the bodice to one shoulder.
 const sash=new T.CatmullRomCurve3([
  new T.Vector3(-.105,.79,-.109),new T.Vector3(.027,.866,-.153),
  new T.Vector3(.122,.967,-.111),new T.Vector3(.146,1.014,.005),
  new T.Vector3(.124,.964,.119),
 ]);
 body.add(new T.Mesh(new T.TubeGeometry(sash,20,.021,8,false),material(0xe04455)));
}

type HairPoint=[number,number,number];

/** Sweep a rounded lock that tapers into the crown and curls back toward the jaw. */
function hairWave(head:T.Group,points:HairPoint[],radius:number,color:number){
 const curve=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
 const segments=24,sides=10;
 const geometry=new T.TubeGeometry(curve,segments,radius,sides);
 const vertices=geometry.getAttribute('position');
 const center=new T.Vector3(),vertex=new T.Vector3();
 for(let ring=0;ring<=segments;ring++){
  const t=ring/segments;
  curve.getPointAt(t,center);
  const fullness=.12+.88*Math.sin(Math.PI*t)**.65;
  for(let side=0;side<=sides;side++){
   const index=ring*(sides+1)+side;
   vertex.fromBufferAttribute(vertices,index).sub(center).multiplyScalar(fullness).add(center);
   vertices.setXYZ(index,vertex.x,vertex.y,vertex.z);
  }
 }
 geometry.computeVertexNormals();
 const wave=new T.Mesh(geometry,material(color));
 wave.userData.hairPart='wave';
 head.add(wave);
}

export function styleJazzHair(head:T.Group){
 // The deep side part sends a broad wave over the forehead and a smaller roll to the other side.
 hairWave(head,[[.16,.38,-.15],[.055,.402,-.25],[-.16,.345,-.28],[-.326,.18,-.249],[-.379,.005,-.156],[-.377,-.155,-.128],[-.302,-.226,-.151]],.109,0xffe1a1);
 hairWave(head,[[.16,.378,-.136],[.29,.315,-.15],[.385,.165,-.151],[.407,.004,-.157],[.369,-.141,-.158],[.285,-.191,-.16]],.096,0xfada8c);
 for(const side of [-1,1]){
  hairWave(head,[[side*.33,.195,.099],[side*.398,.042,.101],[side*.378,-.153,.054],[side*.33,-.235,-.024],[side*.279,-.219,-.13]],.106,0xf3cd7d);
 }
 for(const side of [-1,1]){
  const stud=sphere(head,.024,[side*.315,-.088,-.127],0xe8b64e);
  stud.userData.facePart='earring';
  const drop=sphere(head,.027,[side*.322,-.134,-.132],0xffe0a0);
  drop.scale.set(.02,.035,.02);
  drop.userData.facePart='earring';
 }
}
