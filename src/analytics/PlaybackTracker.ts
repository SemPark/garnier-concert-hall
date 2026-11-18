export type PlaybackAnalyticsEvent='playback_start'|'playback_180_seconds';

export type PlaybackSample={
 nowMs:number;
 positionSeconds:number;
 revision:number;
 playbackRate:number;
 audible:boolean;
};

const LISTENING_THRESHOLD_SECONDS=180;

/** Credit real media progress once per document, across normal track changes. */
export class PlaybackTracker{
 private previous:PlaybackSample|null=null;
 private seconds=0;
 private started=false;
 private reachedThreshold=false;
 constructor(private readonly emit:(event:PlaybackAnalyticsEvent)=>void){}

 /** A seek, wait or source change invalidates an interval, not earlier listening. */
 resetSample(){this.previous=null;}

 sample(sample:PlaybackSample){
  if(this.reachedThreshold)return;
  if(!sample.audible||!Number.isFinite(sample.positionSeconds)||!Number.isFinite(sample.nowMs)||
   !Number.isFinite(sample.playbackRate)||sample.playbackRate<=0){this.resetSample();return;}
  const before=this.previous;
  this.previous=sample;
  if(!before||before.revision!==sample.revision||before.playbackRate!==sample.playbackRate)return;
  const wall=(sample.nowMs-before.nowMs)/1000;
  const media=sample.positionSeconds-before.positionSeconds;
  if(wall<=0||media<=0||media>wall*sample.playbackRate+.25)return;
  this.seconds+=Math.min(wall,media/sample.playbackRate);
  if(!this.started){this.started=true;this.report('playback_start');}
  if(this.seconds>=LISTENING_THRESHOLD_SECONDS-1e-8){
   this.reachedThreshold=true;this.resetSample();this.report('playback_180_seconds');
  }
 }

 private report(event:PlaybackAnalyticsEvent){
  try{this.emit(event);}catch{/* Analytics never interferes with audio. */}
 }
}
