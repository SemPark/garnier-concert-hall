/** A seek is a discontinuity, not a per-frame clock correction. */
export class MediaSync{
 private pending=true;private stableAt:number|null=null;private driftAt:number|null=null;private lastSeek=-Infinity;
 request(){this.pending=true;this.driftAt=null;}
 buffering(){this.stableAt=null;this.driftAt=null;}
 playing(now:number){if(this.stableAt===null)this.stableAt=now;}
 target(now:number,expected:number,current:number,ready:number,seeking:boolean,paused:boolean,targetBuffered:boolean):number|null{
  if(seeking||ready<1)return null;
  const drift=Math.abs(expected-current);
  if(this.pending){this.pending=false;if(drift<=.2)return null;return this.seek(now,expected);}
  // Let the decoder recover. Brief stalls and coarse media-clock reads are not drift.
  if(paused||ready<3||this.stableAt===null||now-this.stableAt<3000||drift<2||!targetBuffered){this.driftAt=null;return null;}
  if(this.driftAt===null)this.driftAt=now;
  if(now-this.driftAt<3000||now-this.lastSeek<15000)return null;
  return this.seek(now,expected);
 }
 private seek(now:number,expected:number){this.lastSeek=now;this.buffering();return expected;}
}
