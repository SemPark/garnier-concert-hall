import list from '../../content/playlist.json';
import {playbackAt,type Playback} from '../../shared/timeline';
import type {Zone} from '../../shared/venue';
import {MediaSync} from './MediaSync';
export class ConcertAudio{
 readonly media=new Audio();enabled=false;volume=.55;zone:Zone='lobby';state='소리 꺼짐';
 private playingRequest=false;private unlocking=false;private lastId='';private cycle=-1;private fade=0;
 private sync=new MediaSync();private abort=new AbortController();private timer:ReturnType<typeof setInterval>;
 constructor(private now:()=>number){this.media.preload='metadata';this.media.setAttribute('playsinline','');
  const opts={signal:this.abort.signal};
  this.media.addEventListener('playing',()=>this.sync.playing(performance.now()),opts);
  for(const event of ['waiting','stalled'])this.media.addEventListener(event,()=>{this.state='음악을 불러오는 중';this.sync.buffering();},opts);
  this.media.addEventListener('error',()=>{this.state='음원을 불러오지 못했어요';},opts);
  document.addEventListener('visibilitychange',()=>{this.sync.request();if(document.hidden)this.media.pause();},opts);
  // Media playback does not depend on rendering frames arriving on time.
  this.timer=setInterval(()=>this.tick(.1),100);
 }
 private mediaUrl(url:string){return import.meta.env.VITE_STATIC_PREVIEW==='true'?import.meta.env.BASE_URL+url.replace(/^\/api\//,''):url;}
 get playback():Playback{return playbackAt(list,this.now());}
 async unlock(){this.enabled=true;this.unlocking=true;this.media.src=this.mediaUrl(this.playback.track.url);this.lastId=this.playback.track.id;this.cycle=this.playback.cycle;this.media.volume=0;this.sync.request();
  try{await this.media.play();if(this.zone==='lobby')this.media.pause();this.sync.request();this.state=this.zone==='lobby'?'공연장에서 음악이 시작돼요':'함께 감상 중';return true;}
  catch{this.enabled=false;this.state='소리를 켜주세요';return false;}finally{this.unlocking=false;}
 }
 toggle(){if(this.enabled){this.enabled=false;this.media.pause();this.state='소리 꺼짐';}else void this.unlock();}
 setZone(zone:Zone){this.zone=zone;this.sync.request();}
 tick(dt:number){
  if(this.unlocking)return;
  const p=this.playback,wanted=this.enabled&&this.zone==='auditorium'&&p.playing&&!document.hidden;
  const target=wanted?this.volume:0;this.fade+=(target-this.fade)*(1-Math.exp(-dt*5));if(Math.abs(this.media.volume-this.fade)>.005)this.media.volume=Math.max(0,Math.min(1,this.fade));
  if(!wanted){if(this.fade<.005||!p.playing||document.hidden)this.media.pause();this.state=!this.enabled?'소리 꺼짐':this.zone==='lobby'?'공연장에서 음악이 시작돼요':!p.playing?'잠시 쉬어가는 중':'함께 감상 중';return;}
  if(this.cycle!==p.cycle){this.cycle=p.cycle;this.sync.request();}
  if(this.lastId!==p.track.id){this.media.src=this.mediaUrl(p.track.url);this.lastId=p.track.id;this.sync.request();}
  if(this.media.readyState<1){this.state='음악을 불러오는 중';if(!this.media.src)this.media.src=this.mediaUrl(p.track.url);return;}
  const expected=Math.min(p.offset,Math.max(0,this.media.duration-.02));
  const targetBuffered=Array.from({length:this.media.buffered.length},(_,i)=>i).some(i=>this.media.buffered.start(i)<=expected&&this.media.buffered.end(i)>=expected+1);
  const seekTarget=this.sync.target(performance.now(),expected,this.media.currentTime,this.media.readyState,this.media.seeking,this.media.paused,targetBuffered);
  if(seekTarget!==null){try{this.media.currentTime=seekTarget;}catch{this.sync.request();this.state='음악을 준비하는 중';return;}}
  if(this.media.paused&&!this.playingRequest){this.playingRequest=true;void this.media.play().catch(()=>{this.enabled=false;this.state='소리 버튼을 눌러주세요';}).finally(()=>{this.playingRequest=false;});}
  this.state=this.media.readyState<3?'음악을 불러오는 중':'함께 감상 중';
 }
 destroy(){clearInterval(this.timer);this.abort.abort();this.media.pause();this.media.removeAttribute('src');this.media.load();}
}
