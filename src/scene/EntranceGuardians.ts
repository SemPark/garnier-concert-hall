import {classicalLamp} from './ClassicalLamp';
import * as T from 'three';
import {GRAND_STAIR,AMPHITHEATRE_DOOR} from '../../shared/grandStair';
import {box,cylinder,sphere,line} from './primitives';

/** Paired classical bronze figures in gilded drapery, grounded beside the amphitheatre entrance. */
export function buildEntranceGuardians(scene:T.Scene){
 const bronze=new T.MeshStandardMaterial({color:0x594331,metalness:.82,roughness:.4});
 const gilt=new T.MeshStandardMaterial({color:0xc4a55f,emissive:0x8b642b,emissiveIntensity:.18,metalness:.72,roughness:.39});
 for(const side of [-1,1]){
  const root=new T.Group();root.position.set(side*2.55,GRAND_STAIR.rise,AMPHITHEATRE_DOOR.z-.75);root.rotation.y=Math.PI;root.name='amphitheatre-bronze-guardian';scene.add(root);
  const skin=(r:number,p:number[],scale=[1,1,1])=>{const mesh=sphere(root,r,p,0x594331);mesh.material=bronze;mesh.scale.multiply(new T.Vector3(...scale));return mesh;};
  const limb=(a:number[],b:number[],r:number)=>{const mesh=line(root,new T.Vector3(...a),new T.Vector3(...b),r,0x594331);mesh.material=bronze;return mesh;};
  box(root,[1.04,.14,.92],[0,.07,0],0xd6c4a0);box(root,[.85,.46,.75],[0,.37,0],0xa38963);box(root,[1.02,.12,.9],[0,.66,0],0xe0cda8);
  // A continuous pleated skirt with an asymmetric shoulder drape, rather than a featureless cone.
  const segments=80,rings=24,vertices:number[]=[],indices:number[]=[];
  for(let j=0;j<=rings;j++){
   const t=j/rings,y=.74+t*1.84,r=.34*(1-t)+.2*t+.025*Math.sin(t*Math.PI*2);
   for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,pleat=Math.sin(a*14+t*.9)*(.025+.018*(1-t)),rr=r+pleat;
    vertices.push(Math.cos(a)*rr,y,Math.sin(a)*rr*.72);
    if(j<rings&&i<segments){const n=j*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
   }
  }
  const fabric=new T.BufferGeometry();fabric.setAttribute('position',new T.Float32BufferAttribute(vertices,3));fabric.setIndex(indices);fabric.computeVertexNormals();root.add(new T.Mesh(fabric,gilt));
  skin(.235,[0,2.56,0],[1.25,1,.7]);limb([0,2.5,0],[0,2.86,0],.095);
  skin(.18,[0,3.0,0],[.78,1.23,.86]);skin(.045,[0,2.99,.16],[.75,1.55,1.5]);
  // Sculpted brow, mouth and small eyes retain human proportions.
  for(const sign of [-1,1]){skin(.025,[sign*.063,3.045,.132],[1,.4,.55]);limb([sign*.03,3.075,.133],[sign*.10,3.072,.12],.012);}
  limb([-.04,2.92,.145],[.04,2.92,.145],.009);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;skin(.043,[Math.cos(a)*.14,3.13+.02*Math.sin(i*2.3),Math.sin(a)*.13],[1,.85,1]);}
  // Outer hand raised beside the temple; the inner arm rests at the hip.
  const outer=side;limb([outer*.23,2.62,0],[outer*.46,2.88,.04],.075);limb([outer*.46,2.88,.04],[outer*.27,3.18,.10],.064);skin(.075,[outer*.25,3.18,.10],[.65,1.2,.6]);
  limb([-outer*.23,2.61,0],[-outer*.45,2.14,.04],.075);limb([-outer*.45,2.14,.04],[-outer*.25,1.96,.17],.06);skin(.07,[-outer*.23,1.96,.17],[.7,1.2,.55]);
  // Diagonal gilded folds travel from one shoulder over the torso into the skirt.
  for(let i=0;i<8;i++){
   const path=new T.CatmullRomCurve3([new T.Vector3(-outer*.22,2.72-i*.015,.1),new T.Vector3(outer*.02,2.47-i*.035,.2),new T.Vector3(outer*.22,2.16-i*.07,.14),new T.Vector3(outer*.17,1.55-i*.08,.22)]);
   root.add(new T.Mesh(new T.TubeGeometry(path,20,.018,5,false),gilt));
  }
  for(const sign of [-1,1])skin(.10,[sign*.13,.79,.13],[.85,.6,1.55]);
  classicalLamp(root,outer*.25,3.56,.1,true);
  root.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});
 }
}
