import * as T from 'three';
import {box,cylinder,line,sphere} from './primitives';

/** Broken scroll pediment, crowned escutcheon and paired seated putti from the supplied entrance reference. */
export function buildEntranceCrest(parent:T.Object3D){
 const root=new T.Group();root.name='crowned-shield-and-putti';parent.add(root);
 const stone=new T.MeshStandardMaterial({color:0xd4c7a8,roughness:.55,metalness:.12});
 const bronze=new T.MeshStandardMaterial({color:0x796144,roughness:.39,metalness:.7});
 const gold=new T.MeshStandardMaterial({color:0xbda064,roughness:.4,metalness:.65});
 const curve=(points:T.Vector3[],radius:number,mat:T.Material)=>{const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),36,radius,8,false),mat);root.add(m);return m;};
 // Broad sloping mouldings curl inward into carved volutes; layered fillets give them real thickness.
 for(const side of [-1,1]){
  const points=[new T.Vector3(side*2.22,4.6,-.42),new T.Vector3(side*1.6,5.06,-.42),new T.Vector3(side*1.03,5.36,-.42),new T.Vector3(side*.69,5.22,-.42),new T.Vector3(side*.66,4.94,-.42),new T.Vector3(side*.9,4.87,-.42),new T.Vector3(side*1.02,5.04,-.42)];
  curve(points,.11,stone);curve(points.map(p=>p.clone().add(new T.Vector3(0,.1,-.06))),.03,gold);
  cylinder(root,.16,.09,[side*.91,5.04,-.47],0x8e7853).rotation.x=Math.PI/2;
 }
 box(root,[1.7,.17,.74],[0,5.34,-.18],0xc8ae7e);box(root,[1.46,.15,.6],[0,5.49,-.18],0xd7c59f);
 // Convex shield with a second inset face and a raised lyre emblem.
 const shield=new T.Shape();shield.moveTo(-.36,.48);shield.quadraticCurveTo(0,.60,.36,.48);shield.lineTo(.32,-.2);shield.quadraticCurveTo(.22,-.5,0,-.66);shield.quadraticCurveTo(-.22,-.5,-.32,-.2);shield.closePath();
 const frame=new T.Mesh(new T.ExtrudeGeometry(shield,{depth:.12,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1}),bronze);frame.position.set(0,6.2,-.46);root.add(frame);
 const inset=new T.Mesh(new T.ShapeGeometry(shield,20),gold);inset.scale.setScalar(.82);inset.position.set(0,6.2,-.49);inset.rotation.y=Math.PI;root.add(inset);
 for(const side of [-1,1])curve([new T.Vector3(side*.15,6.34,-.52),new T.Vector3(side*.12,6.08,-.52),new T.Vector3(0,6.02,-.52)],.018,bronze);
 for(const x of [-.065,0,.065])line(root,new T.Vector3(x,6.08,-.53),new T.Vector3(x,6.32,-.53),.008,0x715739);
 // Crown with five fleur-like points, not a floating sphere.
 cylinder(root,.26,.1,[0,6.89,-.22],0x866c43);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;curve([new T.Vector3(Math.cos(a)*.22,6.92,Math.sin(a)*.18-.22),new T.Vector3(Math.cos(a)*.33,7.13,Math.sin(a)*.27-.22),new T.Vector3(Math.cos(a)*.26,7.22,Math.sin(a)*.22-.22)],.028,bronze);const jewel=sphere(root,.045,[Math.cos(a)*.26,7.22,Math.sin(a)*.22-.22],0xc8ae7e);jewel.material=gold;}
 for(const side of [-1,1]){
  const x=side*.7;
  const flesh=(r:number,px:number,py:number,pz:number,scale=[1,1,1])=>{const m=sphere(root,r,[px,py,pz],0xd4c7a8);m.material=stone;m.scale.multiply(new T.Vector3(...scale));return m;};
  flesh(.19,x,6.11,-.12,[.8,1.25,.7]);flesh(.13,x,5.86,-.09,[1.2,.8,.8]);
  const head=flesh(.135,x+side*.025,6.48,-.18,[.9,1.1,.92]);head.rotation.z=side*.24;flesh(.025,x,6.46,-.3,[.8,1,1.4]);
  for(let i=0;i<13;i++){const a=i/13*Math.PI*2;flesh(.033,x+Math.cos(a)*.12,6.56+Math.sin(a)*.025,-.18+Math.sin(a)*.1);}
  for(const leg of [-1,1]){const px=x+leg*.085;curve([new T.Vector3(px,5.89,-.08),new T.Vector3(px+side*.04,5.72,-.22),new T.Vector3(px-side*.04,5.54,-.24)],.061,stone);flesh(.064,px-side*.04,5.54,-.28,[.8,.6,1.4]);}
  curve([new T.Vector3(x-side*.14,6.22,-.15),new T.Vector3(x-side*.29,6.12,-.36),new T.Vector3(side*.34,6.29,-.48)],.052,stone);
  curve([new T.Vector3(x+side*.14,6.22,-.12),new T.Vector3(x+side*.25,6.02,-.14),new T.Vector3(x+side*.08,5.92,-.3)],.05,stone);
  // Small feathered wings, and draped folds over the lap.
  for(let i=0;i<7;i++){curve([new T.Vector3(x,6.2,.02),new T.Vector3(x+side*(.18+i*.025),6.5-i*.04,.09),new T.Vector3(x+side*(.22+i*.035),6.24-i*.05,.08)],.025,stone);curve([new T.Vector3(x-.17+i*.045,5.98,-.17),new T.Vector3(x-.14+i*.04,5.89,-.26),new T.Vector3(x-.1+i*.03,5.77,-.17)],.018,gold);}
 }
 root.traverse(o=>{o.userData.fullDetail=true;o.userData.preserveSilhouette=true;});return root;
}
