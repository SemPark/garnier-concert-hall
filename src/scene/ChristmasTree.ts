import * as T from 'three';
import {box,cylinder,line} from './primitives';

/** Static, batched evergreen branches and ornaments; only one local light for the whole tree. */
export function buildChristmasTree(scene:T.Scene,x:number,z:number){
 const root=new T.Group();root.name='lobby-christmas-tree';root.position.set(x,0,z);scene.add(root);
 const gold=new T.MeshStandardMaterial({color:0xe1ba66,metalness:.85,roughness:.2});
 const silver=new T.MeshStandardMaterial({color:0xe6dccc,metalness:.92,roughness:.18});
 const red=new T.MeshStandardMaterial({color:0x9d172c,metalness:.5,roughness:.24});
 const glow=new T.MeshStandardMaterial({color:0xffe3a1,emissive:0xffc76b,emissiveIntensity:4.5,roughness:.3});
 const ball=new T.SphereGeometry(1,16,12),bulbGeometry=new T.SphereGeometry(1,6,4);
 const add=(geometry:T.BufferGeometry,mat:T.Material,px:number,py:number,pz:number,sx:number,sy=sx,sz=sx)=>{const mesh=new T.Mesh(geometry,mat);mesh.position.set(px,py,pz);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;root.add(mesh);return mesh;};
 cylinder(root,2.05,.08,[0,.045,0],0x772b35);cylinder(root,1.94,.025,[0,.095,0],0xb7904c);
 cylinder(root,.22,2,[0,1,0],0x4c3020);
 // Alpha-cutout spruce fronds, with individual needles, replace the solid cone silhouette.
 let seed=31;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let map:T.CanvasTexture|undefined;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d')!;
  const stroke=(x:number,y:number,xx:number,yy:number,color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
  stroke(12,128,495,128,'#554632',3);
  for(let i=0;i<32;i++){
   const x=25+i*14,span=(1-x/530)*108;
   for(const side of [-1,1]){
    const ex=x+55,ey=128+side*span;stroke(x,128,ex,ey,'#2e5036',1.6);
    for(let k=0;k<19;k++){
     const t=k/19,px=x+(ex-x)*t,py=128+(ey-128)*t,len=12+random()*18;
     for(const sign of [-1,1])stroke(px,py,px+len*.65,py+sign*len*(.5+random()*.5),['#224431','#315c3b','#496c44','#5a7950'][Math.floor(random()*4)],1.4);
    }
   }
  }
  map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 }
 const foliage=new T.MeshStandardMaterial({color:0xffffff,emissive:0x0b2110,emissiveIntensity:.2,map,alphaTest:.4,side:T.DoubleSide,roughness:.88});
 // Distinct whorls: long radial boughs with airy side fronds, leaving open space between tiers.
 const tiers=17,branches=11,fronds=7,count=tiers*branches*(fronds+1);
 const cards=new T.InstancedMesh(new T.PlaneGeometry(1,1),foliage,count),dummy=new T.Object3D();let instance=0;
 const sparklePositions:number[]=[],profile=(t:number)=>2.3*Math.pow(1-t,.85);
 for(let tier=0;tier<tiers;tier++){
  const t=tier/tiers,y=.85+t*7.4,radius=profile(t);
  for(let j=0;j<branches;j++){
   const a=j/branches*Math.PI*2+tier*.67,tip=radius*(.93+random()*.08);
   line(root,new T.Vector3(0,y+.16,0),new T.Vector3(Math.cos(a)*tip,y-.03,Math.sin(a)*tip),.012,0x38432b);
   for(let k=0;k<fronds;k++){
    const f=(k+.65)/fronds,offset=(k%2?1:-1)*(.15+.15*f),r=tip*f;
    dummy.position.set(Math.cos(a)*r-Math.sin(a)*offset,y+.025+random()*.09,Math.sin(a)*r+Math.cos(a)*offset);
    dummy.rotation.set(-Math.PI/2+(random()-.5)*.18,-a+(k%2?.36:-.36),-.08);
    dummy.scale.set(.38+radius*.27,.23+radius*.12,1);dummy.updateMatrix();cards.setMatrixAt(instance++,dummy.matrix);
   }
   // A long, slightly upturned terminal spray breaks the conical outline at every bough tip.
   dummy.position.set(Math.cos(a)*tip*.88,y+.03,Math.sin(a)*tip*.88);
   dummy.rotation.set(-Math.PI/2,-a,-.12);dummy.scale.set(.45+radius*.4,.25+radius*.13,1);dummy.updateMatrix();cards.setMatrixAt(instance++,dummy.matrix);
  }
  // Ornaments hang in the air below the branch tips, rather than inside the foliage volume.
  const ornamentCount=Math.max(4,16-Math.floor(tier*.6));
  for(let j=0;j<ornamentCount;j++){
   const a=j/ornamentCount*Math.PI*2+tier*.91,r=radius+.08,yBall=y-.2;
   const size=.105+(j%4)*.023,mat=[red,gold,silver,gold][(j+tier)%4];
   const ornament=add(ball,mat,Math.cos(a)*r,yBall,Math.sin(a)*r,size);ornament.userData.fullDetail=true;
   line(root,new T.Vector3(Math.cos(a)*r,yBall+size,Math.sin(a)*r),new T.Vector3(Math.cos(a)*r,y+.04,Math.sin(a)*r),.006,0xc5a46b);
  }
  for(let j=0;j<42;j++){
   const a=j/42*Math.PI*2+tier*.48,r=radius+.12,yLight=y-.08-.09*Math.sin(a*branches);
   add(bulbGeometry,glow,Math.cos(a)*r,yLight,Math.sin(a)*r,.027+(j%3)*.005).userData.fullDetail=true;
   sparklePositions.push(Math.cos(a)*r,yLight,Math.sin(a)*r);
  }
 }
 cards.receiveShadow=true;cards.userData.fullDetail=true;cards.computeBoundingSphere();root.add(cards);
 // Bronze perimeter with tiny lights and low uplighting, inspired by the exterior tree's ring.
 const ringMat=new T.MeshStandardMaterial({color:0x574433,metalness:.7,roughness:.32});
 const ring=new T.Mesh(new T.TorusGeometry(2.08,.055,8,80),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.16;root.add(ring);
 for(let i=0;i<80;i++){const a=i/80*Math.PI*2;add(ball,glow,Math.cos(a)*2.08,.18,Math.sin(a)*2.08,.027);}
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!;
  const gradient=c.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,249,221,1)');gradient.addColorStop(.12,'rgba(255,235,184,.8)');gradient.addColorStop(.38,'rgba(255,218,148,.18)');gradient.addColorStop(1,'rgba(255,204,112,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);
  const halo=new T.CanvasTexture(canvas);halo.colorSpace=T.SRGBColorSpace;
  const sparkle=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(sparklePositions,3)),new T.PointsMaterial({map:halo,color:0xffe3af,size:.19,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));root.add(sparkle);

 }
 for(let i=0;i<12;i++){
  const a=i*2.4,r=1.65,w=.3+(i%3)*.1,h=.25+(i%2)*.18,px=Math.cos(a)*r,pz=Math.sin(a)*r;
  box(root,[w,h,w],[px,.12+h/2,pz],i%2?0x762333:0xc9b185);
  box(root,[w+.01,.025,.055],[px,.13+h,pz],0xd5b26a);box(root,[.055,h+.025,w+.01],[px,.12+h/2,pz],0xd5b26a);
 }
 const light=new T.PointLight(0xffd49c,18,10,2);light.position.set(0,1.1,0);root.add(light);
 root.traverse(o=>{o.userData.preserveSilhouette=true;});return root;
}

/** Added after static batching: a suspended, faceted eight-point star with restrained bloom. */
export function buildFloatingTreeStar(scene:T.Scene,x:number,z:number){
 const root=new T.Group();root.name='floating-christmas-star';root.position.set(x,9.25,z);scene.add(root);
 const positions:number[]=[],colors:number[]=[];
 const warm=new T.Color(0xffe7a5),pale=new T.Color(0xfff6da);
 for(const front of [1,-1])for(let i=0;i<16;i++){
  const point=(j:number)=>{const a=Math.PI/2+j*Math.PI/8,r=j%2?.15:(j%4===0?.52:.35);return [Math.cos(a)*r,Math.sin(a)*r,0];};
  const a=point(i),b=point(i+1);positions.push(0,0,front*.16,...(front===1?a:b),...(front===1?b:a));
  for(let v=0;v<3;v++){const c=(i+v)%2?warm:pale;colors.push(c.r,c.g,c.b);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const material=new T.MeshStandardMaterial({vertexColors:true,color:0xffedbd,emissive:0xffcc79,emissiveIntensity:1.8,metalness:.65,roughness:.25});
 const star=new T.Mesh(geometry,material);root.add(star);
 let halo:T.Sprite|undefined;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!,radial=g.createRadialGradient(64,64,0,64,64,64);radial.addColorStop(0,'rgba(255,242,204,.42)');radial.addColorStop(.3,'rgba(255,223,166,.12)');radial.addColorStop(1,'rgba(255,220,154,0)');g.fillStyle=radial;g.fillRect(0,0,128,128);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;halo=new T.Sprite(new T.SpriteMaterial({map,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));halo.scale.setScalar(4);root.add(halo);
  const raysCanvas=document.createElement('canvas');raysCanvas.width=raysCanvas.height=256;const ctx=raysCanvas.getContext('2d')!;
  for(let i=0;i<8;i++){ctx.save();ctx.translate(128,128);ctx.rotate(i*Math.PI/4);const length=i%2?88:123,ray=ctx.createLinearGradient(0,0,length,0);ray.addColorStop(0,'rgba(255,246,214,.7)');ray.addColorStop(.18,'rgba(255,235,188,.4)');ray.addColorStop(1,'rgba(255,227,170,0)');ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(0,-2.2);ctx.lineTo(length,0);ctx.lineTo(0,2.2);ctx.fill();ctx.restore();}
  const raysMap=new T.CanvasTexture(raysCanvas);raysMap.colorSpace=T.SRGBColorSpace;const rays=new T.Sprite(new T.SpriteMaterial({map:raysMap,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,opacity:.7}));rays.scale.setScalar(3.5);root.add(rays);
 }
 const light=new T.PointLight(0xffe0a8,30,9,2);root.add(light);
 return {root,update(time:number){root.position.y=9.25+Math.sin(time*.85)*.12;star.rotation.y=time*.3;star.rotation.z=Math.sin(time*.6)*.055;if(halo)(halo.material as T.SpriteMaterial).opacity=.8+.12*Math.sin(time*1.1);}};
}
