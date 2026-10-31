import * as T from 'three';
import {ICONS,type Icon} from './villager';

const COLS=3,ROWS=2;
const GLYPHS:Record<Icon,{text:string;color:string}>={heart:{text:'♥',color:'#e0485f'},bang:{text:'!',color:'#e8862a'},sparkle:{text:'✦',color:'#d9a426'},zz:{text:'Zz',color:'#5b7fc4'},dots:{text:'…',color:'#7a6f62'},note:{text:'♪',color:'#9a5cc0'}};
/** World height of an icon at close range. */
export const ICON_SIZE=.5;
/** Far icons keep growing on screen up to this factor so reactions read from the balcony. */
export const MAX_GROWTH=2.4;

function atlas(){
 if(typeof document==='undefined')return null;
 const cell=128,canvas=document.createElement('canvas');canvas.width=cell*COLS;canvas.height=cell*ROWS;const c=canvas.getContext('2d');if(!c)return null;
 ICONS.forEach((icon,i)=>{const x=(i%COLS)*cell+cell/2,y=Math.floor(i/COLS)*cell+cell/2,g=GLYPHS[icon];
  c.fillStyle='#fffaf0';c.strokeStyle='#5a4632';c.lineWidth=5;c.beginPath();c.arc(x,y-4,cell*.36,0,Math.PI*2);c.fill();c.stroke();
  c.beginPath();c.moveTo(x-10,y+cell*.3);c.lineTo(x,y+cell*.44);c.lineTo(x+10,y+cell*.3);c.closePath();c.fill();c.stroke();c.fillStyle='#fffaf0';c.fillRect(x-8,y+cell*.27,16,6);
  c.fillStyle=g.color;c.font=`bold ${g.text.length>1?48:62}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(g.text,x,y-2);
 });
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

/** All head-top reaction icons in one camera-facing point batch. */
export class EmoteLayer{
 readonly points:T.Points;private positions:Float32Array;private icons:Float32Array;private sizes:Float32Array;readonly material:T.ShaderMaterial;
 constructor(readonly capacity:number){
  this.positions=new Float32Array(capacity*3);this.icons=new Float32Array(capacity);this.sizes=new Float32Array(capacity);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('icon',new T.BufferAttribute(this.icons,1).setUsage(T.DynamicDrawUsage));geometry.setAttribute('size',new T.BufferAttribute(this.sizes,1).setUsage(T.DynamicDrawUsage));
  this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{atlas:{value:atlas()},scale:{value:500},maxGrowth:{value:MAX_GROWTH}},
   vertexShader:`attribute float icon;attribute float size;uniform float scale;uniform float maxGrowth;varying float vIcon;varying float vAlpha;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);float d=max(.5,-mv.z);vIcon=icon;vAlpha=clamp(size,0.0,1.0);
gl_PointSize=${ICON_SIZE.toFixed(2)}*size*scale/d*clamp(d/8.0,1.0,maxGrowth);gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`uniform sampler2D atlas;varying float vIcon;varying float vAlpha;
void main(){vec2 cell=vec2(mod(vIcon,${COLS}.0),floor(vIcon/${COLS}.0));vec2 uv=vec2((cell.x+gl_PointCoord.x)/${COLS}.0,1.0-(cell.y+gl_PointCoord.y)/${ROWS}.0);
vec4 c=texture2D(atlas,uv);if(c.a<.05)discard;gl_FragColor=vec4(c.rgb,c.a*vAlpha);
#include <colorspace_fragment>
}`});
  this.points=new T.Points(geometry,this.material);this.points.frustumCulled=false;this.points.renderOrder=10;
 }
 /** Pixels per world unit at distance 1, from the camera's vertical field of view. */
 setViewport(heightPx:number,fov:number){this.material.uniforms.scale.value=heightPx/(2*Math.tan(T.MathUtils.degToRad(fov)/2));}
 /** Show one icon. Size above 1 is a short pop when the icon appears. */
 set(slot:number,position:T.Vector3,icon:Icon,alpha:number){
  if(slot<0||slot>=this.capacity)return;
  this.positions.set([position.x,position.y,position.z],slot*3);this.icons[slot]=ICONS.indexOf(icon);this.sizes[slot]=Math.max(0,alpha);
 }
 hide(slot:number){if(slot>=0&&slot<this.capacity)this.sizes[slot]=0;}
 clear(){this.sizes.fill(0);}
 visibleCount(){let n=0;for(const s of this.sizes)if(s>0)n++;return n;}
 iconAt(slot:number):Icon|null{return this.sizes[slot]>0?ICONS[this.icons[slot]]:null;}
 commit(){const g=this.points.geometry;for(const name of ['position','icon','size'])g.getAttribute(name).needsUpdate=true;}
}
