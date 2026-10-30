import list from '../../content/playlist.json';
import {playbackAt,type Playback} from '../../shared/timeline';
import type {Zone} from '../../shared/venue';
export class ConcertAudio{
 readonly media=new Audio();enabled=false;volume=.55;zone:Zone='lobby';state='소리 꺼짐';
 private playingRequest=false;private unlocking=false;private lastId='';private force=true;private fade=0;
 constructor(private now:()=>number){this.media.preload='metadata';this.media.setAttribute('playsinline','');
  for(const event of ['loadedmetadata','canplay','seeked'])this.media.addEventListener(event,()=>{this.force=true;});
  this.media.addEventListener('waiting',()=>{this.state='음악을 불러오는 중';this.force=true;});
  this.media.addEventListener('stalled',()=>{this.state='음악을 불러오는 중';this.force=true;});
  this.media.addEventListener('error',()=>{this.state='음원을 불러오지 못했어요';});
  document.addEventListener('visibilitychange',()=>{this.force=true;if(document.hidden)this.media.pause();});
 }
 private mediaUrl(url:string){return import.meta.env.VITE_STATIC_PREVIEW==='true'?import.meta.env.BASE_URL+url.replace(/^\/api\//,''):url;}
 get playback():Playback{return playbackAt(list,this.now());}
 async unlock(){this.enabled=true;this.unlocking=true;this.media.src=this.mediaUrl(this.playback.track.url);this.lastId=this.playback.track.id;this.media.volume=0;
  try{await this.media.play();if(this.zone==='lobby')this.media.pause();this.force=true;this.state=this.zone==='lobby'?'공연장에서 음악이 시작돼요':'함께 감상 중';return true;}
  catch{this.enabled=false;this.state='소리를 켜주세요';return false;}finally{this.unlocking=false;}
 }
 toggle(){if(this.enabled){this.enabled=false;this.media.pause();this.state='소리 꺼짐';}else void this.unlock();}
 setZone(zone:Zone){this.zone=zone;this.force=true;}
 tick(dt:number){
  if(this.unlocking)return;
  const p=this.playback,wanted=this.enabled&&this.zone==='auditorium'&&p.playing&&!document.hidden;
  const target=wanted?this.volume:0;this.fade+=(target-this.fade)*(1-Math.exp(-dt*5));this.media.volume=Math.max(0,Math.min(1,this.fade));
  if(!wanted){if(this.fade<.005||!p.playing||document.hidden)this.media.pause();this.state=!this.enabled?'소리 꺼짐':this.zone==='lobby'?'공연장에서 음악이 시작돼요':!p.playing?'잠시 쉬어가는 중':'함께 감상 중';return;}
  if(this.lastId!==p.track.id){this.media.src=this.mediaUrl(p.track.url);this.lastId=p.track.id;this.force=true;}
  if(this.media.readyState<1){this.state='음악을 불러오는 중';if(!this.media.src)this.media.src=this.mediaUrl(p.track.url);return;}
  const error=Math.abs(this.media.currentTime-p.offset);
  if((this.force&&error>.15)||error>.55){try{this.media.currentTime=Math.min(p.offset,Math.max(0,this.media.duration-.02));this.force=false;}catch{this.state='음악을 준비하는 중';return;}}
  if(this.media.paused&&!this.playingRequest){this.playingRequest=true;void this.media.play().then(()=>{this.force=true;}).catch(()=>{this.enabled=false;this.state='소리 버튼을 눌러주세요';}).finally(()=>{this.playingRequest=false;});}
  this.state=this.media.readyState<3?'음악을 불러오는 중':'함께 감상 중';
 }
 destroy(){this.media.pause();this.media.removeAttribute('src');this.media.load();}
}
