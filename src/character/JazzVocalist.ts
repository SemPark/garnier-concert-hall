import * as T from 'three';
import {material,sphere} from '../scene/primitives';

export const JAZZ_DRESS_COLOR=0xbd1639;
export const JAZZ_BLONDE=0xe9cd92;

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
}

type HairPoint=[number,number,number];

/** Loft one continuous lock between its outer silhouette and the hairline. */
function hairWave(head:T.Group,outer:HairPoint[],inner:HairPoint[],depth:number,color:number){
 const curve=(points:HairPoint[])=>new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
 const silhouette=curve(outer),hairline=curve(inner);
 const rows=48,sides=40,positions:number[]=[],indices:number[]=[];
 const mirrored=outer[outer.length-1][0]<outer[0][0];
 const a=new T.Vector3(),b=new T.Vector3(),point=new T.Vector3();
 const rearJoinZ=-.120;

 for(let row=0;row<=rows;row++){
  const t=row/rows;
  silhouette.getPoint(t,a);
  hairline.getPoint(t,b);
  const thickness=depth*Math.sin(Math.PI*t)**.48;
  const joinWeight=T.MathUtils.smoothstep(t,0,.055)*(1-T.MathUtils.smoothstep(t,.62,.94));
  for(let side=0;side<=sides;side++){
   const angle=side/sides*2*Math.PI;
   const profile=Math.sin(angle);
   const across=(1-Math.cos(angle))*.5;
   point.copy(a).lerp(b,across);
   // Longitudinal grooves run from the narrow part to the curled-under end.
   const grain=.007*Math.cos(2*Math.PI*(6*across+.08*Math.sin(2*Math.PI*t)));
   if(profile>=0)point.z-=profile*thickness*(1+grain/depth);
   else{
    // The hidden half of the lock reaches back into the crown along a shared depth.
    const reach=Math.max(thickness,(rearJoinZ-point.z)*joinWeight);
    point.z-=profile*reach;
   }
   positions.push(point.x,point.y,point.z);
   if(row===rows||side===sides)continue;
   const i=row*(sides+1)+side,j=i+sides+1;
   if(mirrored)indices.push(i,i+1,j,j,i+1,j+1);
   else indices.push(i,j,i+1,j,j+1,i+1);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 const wave=new T.Mesh(geometry,material(color));
 wave.userData.hairPart='wave';
 head.add(wave);
}

export function styleJazzHair(head:T.Group){
 // The broad fan arches over the forehead and flows into the cheek-level curl.
 hairWave(head,[
  [-.169,.216,-.348],[-.136,.438,-.287],[.084,.534,-.263],[.326,.463,-.249],
  [.45,.315,-.219],[.50,.124,-.163],[.478,-.065,-.155],[.395,-.226,-.138],
  [.33,-.305,-.129],[.239,-.261,-.132],
 ],[
  [-.147,.207,-.35],[-.058,.231,-.363],[.046,.257,-.373],[.174,.244,-.362],
  [.263,.171,-.332],[.287,.081,-.291],[.305,-.068,-.25],[.256,-.18,-.213],
  [.264,-.249,-.171],[.239,-.261,-.132],
 ],.105,0xffe5b4);
 // The smaller fan rises from the same part before sweeping toward the other cheek.
 hairWave(head,[
  [-.171,.216,-.348],[-.205,.384,-.279],[-.305,.411,-.247],[-.395,.306,-.227],
  [-.46,.167,-.17],[-.479,-.015,-.144],[-.443,-.163,-.148],[-.363,-.268,-.121],
  [-.239,-.246,-.125],
 ],[
  [-.181,.209,-.35],[-.209,.224,-.353],[-.255,.228,-.348],[-.285,.181,-.322],
  [-.316,.09,-.28],[-.316,-.031,-.242],[-.321,-.147,-.225],[-.283,-.216,-.175],
  [-.239,-.246,-.125],
 ],.095,0xf7dca6);
 for(const side of [-1,1]){
  const stud=sphere(head,.024,[side*.315,-.088,-.127],0xe8b64e);
  stud.userData.facePart='earring';
  const drop=sphere(head,.027,[side*.322,-.134,-.132],0xffe0a0);
  drop.scale.set(.02,.035,.02);
  drop.userData.facePart='earring';
 }
}
