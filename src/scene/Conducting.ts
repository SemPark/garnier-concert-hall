/** Local baton and camera state for the conducting experience. */
export class Conducting{
 active=false;stroking=false;x=0;zoom=.85;height=0;angle=0;stroke=0;pulse=0;pan=0;private cameraHeld=false;private panResumeAt=0;
 private beatAt=-Infinity;
 cameraBegin(now:number){if(!this.cameraHeld){this.angle=Math.max(-.6,Math.min(.6,this.angle+this.pan));this.pan=0;}this.cameraHeld=true;this.panResumeAt=now;}
 cameraEnd(now:number){this.cameraHeld=false;this.panResumeAt=now;}
 setZoom(value:number){this.zoom=Math.max(.4,Math.min(1,value));}
 start(now:number){this.active=true;this.cameraHeld=false;this.pan=0;this.panResumeAt=now;this.stroking=false;this.stroke=0;this.pulse=0;this.beatAt=-Infinity;}
 beat(x:number,now:number){this.beatAt=now;this.stroking=true;this.x=Math.max(-1,Math.min(1,x));}
 tick(now:number){
  const elapsed=Math.max(0,now-this.panResumeAt-1200);
  this.pan=this.cameraHeld?0:Math.sin(elapsed/5000)*.045*Math.min(1,elapsed/1800);
  const age=(now-this.beatAt)/1000;
  this.stroking=age<1.56;
  this.pulse=Math.max(0,1-age/.45);
  if(!this.stroking){this.stroke=0;return;}
  this.stroke=age<.16?Math.sin(Math.max(0,age)/.16*Math.PI/2):Math.cos((age-.16)/1.40*Math.PI/2);
 }
 stop(){this.active=false;this.stroking=false;this.stroke=0;this.pulse=0;}
}
