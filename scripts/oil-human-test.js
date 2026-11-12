import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {pinDabs} from './vendor/oilpaint3d/pins.js';
import {createShared} from './vendor/oilpaint3d/common.js';
import {createBrushSheet} from './vendor/oilpaint3d/brush.js';
const canvas=document.querySelector('canvas'), status=document.querySelector('#status');
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(600,750,false);renderer.setPixelRatio(1);
const scene=new T.Scene();scene.background=new T.Color('#282723');
const camera=new T.PerspectiveCamera(34,600/750,.1,100);camera.position.set(0,1.8,3.8);camera.lookAt(0,1.7,0);
const shared=createShared();shared.tBrush.value=createBrushSheet();shared.uPixel.value=2*Math.tan(T.MathUtils.degToRad(17))/750;
shared.uSunDir.value.set(-.65,.65,1).normalize();shared.uHazeDensity.value=0;shared.uBounce.value.setRGB(.025,.018,.018);shared.uImpasto.value=.9;
const basicGroup=new T.Group(), paintGroup=new T.Group();scene.add(basicGroup,paintGroup);
scene.add(new T.HemisphereLight(0xffead0,0x30283a,2));const light=new T.DirectionalLight(0xffecd8,3);light.position.set(-3,5,5);scene.add(light);
const headGroup=new T.Group();basicGroup.add(headGroup);
let playing=true,painted=true,yaw=0,targetYaw=0,nod=0,frames=0,sum=0;
const all=[];
function addPaint(mesh,count,palette,size,color){
 mesh.updateWorldMatrix(true,false);
 const pins=pinDabs(shared,[palette],[{mesh,count,style:(p,n,v,uv)=>({pal:0,size:typeof size==='function'?size(p):size,dir:new T.Vector3(-n.y*.25,1,.15),color:color?.(v,uv)})}]);
 pins.update();paintGroup.add(pins.mesh);all.push(pins);return pins;
}
const palette=[[1,.93,.79],[.68,.61,.54],[.27,.26,.29]];
try{
 const [gltf,texture]=await Promise.all([new GLTFLoader().loadAsync('/portraits/test-model/LeePerrySmith.glb'),new T.TextureLoader().loadAsync('/portraits/test-model/Map-COL.jpg')]);
 let head;gltf.scene.traverse(o=>{if(o.isMesh&&!head)head=o;});
 const geo=head.geometry.clone();geo.computeBoundingBox();const box=geo.boundingBox;const center=box.getCenter(new T.Vector3()),height=box.max.y-box.min.y;
 geo.translate(-center.x,-center.y,-center.z);geo.scale(1.7/height,1.7/height,1.7/height);
 texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;
 const face=new T.Mesh(geo,new T.MeshStandardMaterial({map:texture,roughness:.95}));headGroup.add(face);headGroup.position.y=1.65;
 const image=texture.image,c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data,uv=geo.attributes.uv;
 const sample=(v,point)=>{const x=Math.max(0,Math.min(c.width-1,Math.floor(point.x*c.width))),y=Math.max(0,Math.min(c.height-1,Math.floor(point.y*c.height)));const i=(y*c.width+x)*4;return [pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255];};
 addPaint(face,14000,palette,p=>p.z>.25&&p.y>-.35&&p.y<.4?[.024,.04]:[.045,.075],sample);
 const jacket=new T.Mesh(new T.SphereGeometry(1,48,32),new T.MeshStandardMaterial({color:'#502c30',roughness:1}));jacket.scale.set(.95,1.02,.42);jacket.position.set(0,.25,-.12);basicGroup.add(jacket);
 addPaint(jacket,3600,[[.40,.21,.17],[.23,.10,.12],[.09,.065,.09]],[.13,.20]);
 const shirt=new T.Mesh(new T.ConeGeometry(.24,.9,24),new T.MeshStandardMaterial({color:'#d1c3a6'}));shirt.position.set(0,.52,.28);basicGroup.add(shirt);addPaint(shirt,700,[[.86,.8,.65],[.63,.57,.45],[.34,.3,.25]],[.035,.08]);
 const bg=new T.Mesh(new T.PlaneGeometry(8,9,65,70),new T.MeshBasicMaterial({color:'#35352e'}));bg.position.set(0,1,-1.4);basicGroup.add(bg);
 const back=addPaint(bg,4200,[[.26,.29,.22],[.15,.18,.16],[.08,.09,.095]],[.30,.46]);back.mesh.renderOrder=0;
 basicGroup.visible=true;
 const moving=all[0];
 status.textContent='렌더링 준비 완료 · 고개 움직임과 일반 3D 비교를 확인하세요';
 document.querySelector('#motion').onclick=()=>{playing=!playing;document.querySelector('#motion').textContent=playing?'움직임 멈추기':'움직임 재생';};
 document.querySelector('#paint').onclick=()=>{painted=!painted;basicGroup.visible=true;paintGroup.visible=painted;document.querySelector('#paint').textContent=painted?'일반 3D와 비교':'유화로 보기';};
 canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect();targetYaw=((e.clientX-r.left)/r.width-.5)*.65;};canvas.onpointerleave=()=>targetYaw=0;
 const started=performance.now();let last=0;
 function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<1000/30)return;last=now;const t=(now-started)/1000;
 const begin=performance.now();if(playing){yaw+=(targetYaw+Math.sin(t*.48)*.12-yaw)*.1;nod=Math.sin(t*.7)*.035;headGroup.rotation.set(nod,yaw,Math.sin(t*.35)*.015);headGroup.updateWorldMatrix(true,true);moving.update();}
 renderer.render(scene,camera);sum+=performance.now()-begin;frames++;
 if(frames%30===0){status.textContent=`붓 자국 ${all.reduce((n,p)=>n+p.count,0).toLocaleString()}개 · CPU 갱신/렌더 제출 ${(sum/frames).toFixed(1)}ms · ${renderer.info.render.calls} draw calls`;}
 window.oilTest={ready:true,painted,yaw,frames,cpuMs:sum/frames,glError:renderer.getContext().getError(),dabs:all.reduce((n,p)=>n+p.count,0)};
 }
 requestAnimationFrame(frame);
}catch(error){status.textContent='불러오기 실패: '+error.message;console.error(error);}
