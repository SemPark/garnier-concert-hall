type Touch={x:number;y:number};
export class Input{
 readonly keys=new Set<string>();private pointers=new Map<number,Touch>();private start:Touch&{id:number;time:number;dragged:boolean}|null=null;private span=0;private abort=new AbortController();
 constructor(canvas:HTMLCanvasElement,actions:{click:(x:number,y:number)=>void;rotate:(dx:number,dy:number)=>void;zoom:(factor:number)=>void;escape:()=>void}){
  const opts={signal:this.abort.signal};
  canvas.addEventListener('pointerdown',e=>{if(e.button>0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===1)this.start={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),dragged:false};else{this.start=null;this.span=this.getSpan();}},opts);
  canvas.addEventListener('pointermove',e=>{const old=this.pointers.get(e.pointerId);if(!old)return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const span=this.getSpan();if(this.span>5&&span>5)actions.zoom(this.span/span);this.span=span;return;}
   if(!this.start)return;if(Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>(e.pointerType==='touch'?10:5))this.start.dragged=true;if(this.start.dragged)actions.rotate(e.clientX-old.x,e.clientY-old.y);
  },opts);
  canvas.addEventListener('pointerup',e=>{const start=this.start;this.pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(start?.id===e.pointerId&&!start.dragged&&performance.now()-start.time<500)actions.click(e.clientX,e.clientY);this.start=null;this.span=0;},opts);
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{this.pointers.clear();this.start=null;},opts);
  canvas.addEventListener('wheel',e=>{e.preventDefault();actions.zoom(Math.exp(Math.max(-.8,Math.min(.8,e.deltaY*.0012))));},{...opts,passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  window.addEventListener('keydown',e=>{if((e.target as HTMLElement)?.closest('input,textarea,select,[role="dialog"]'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.code==='Escape')actions.escape();},opts);
  window.addEventListener('keyup',e=>this.keys.delete(e.code),opts);window.addEventListener('blur',()=>this.keys.clear(),opts);
 }
 private getSpan(){const [a,b]=[...this.pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
 destroy(){this.abort.abort();}
}
