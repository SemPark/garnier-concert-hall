/** Tap-driven local performance; playback and shared visitor state are never modified. */
export class Conducting{
 active=false;playing=false;clock=0;speed=0;x=0;y=0;zoom=.85;height=0;angle=0;stroke=0;pulse=0;pan=0;private cameraHeld=false;private panResumeAt=0;
 private beatAt=-Infinity;private lastBeat=-Infinity;
 cameraBegin(now:number){if(!this.cameraHeld){this.angle=Math.max(-.6,Math.min(.6,this.angle+this.pan));this.pan=0;}this.cameraHeld=true;this.panResumeAt=now;}
 cameraEnd(now:number){this.cameraHeld=false;this.panResumeAt=now;}
 setZoom(value:number){this.zoom=Math.max(.4,Math.min(1,value));}
 start(_now:number){this.active=true;this.cameraHeld=false;this.pan=0;this.panResumeAt=_now;this.playing=false;this.clock=0;this.speed=0;this.stroke=0;this.y=0;this.pulse=0;this.beatAt=this.lastBeat=-Infinity;}
 beat(x:number,now:number){const gap=now-this.lastBeat;this.speed=Number.isFinite(gap)?Math.min(2.5,Math.max(.65,650/Math.max(180,gap))):1;this.lastBeat=this.beatAt=now;this.playing=true;this.x=Math.max(-1,Math.min(1,x));}
 tick(now:number,dt:number){const elapsed=Math.max(0,now-this.panResumeAt-1200);this.pan=this.cameraHeld?0:Math.sin(elapsed/5000)*.045*Math.min(1,elapsed/1800);const age=(now-this.beatAt)/1000;this.playing=age<1.56;this.pulse=Math.max(0,1-age/.45);
  if(age>=1.56){this.speed=0;this.stroke=0;this.y=0;return;}
  this.stroke=age<.16?Math.sin(Math.max(0,age)/.16*Math.PI/2):Math.cos((age-.16)/1.40*Math.PI/2);this.y=this.stroke;
  this.clock+=Math.min(.1,dt)*this.speed;
 }
 stop(){this.active=false;this.playing=false;this.speed=0;this.stroke=0;this.y=0;this.pulse=0;}
}
