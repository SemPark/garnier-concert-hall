import type {Conducting} from './Conducting';
export class ConductCameraInput{
 private pointers=new Map<number,{x:number;y:number}>();
 constructor(private demo:Conducting){}
 down(id:number,x:number,y:number){this.demo.cameraBegin(performance.now());this.pointers.set(id,{x,y});}
 up(id:number){this.pointers.delete(id);if(!this.pointers.size)this.demo.cameraEnd(performance.now());}
 private span(){const p=[...this.pointers.values()];return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;}
 move(id:number,x:number,y:number){const old=this.pointers.get(id);if(!old)return;const span=this.span(),dy=y-old.y,dx=x-old.x;this.pointers.set(id,{x,y});
  if(this.pointers.size===2){const next=this.span();if(span>8&&next>8)this.demo.setZoom(this.demo.zoom*span/next);return;}
  this.demo.angle=Math.max(-.6,Math.min(.6,this.demo.angle-dx*.004));this.demo.height=Math.max(-1,Math.min(5,this.demo.height-dy*.018));
 }
}
