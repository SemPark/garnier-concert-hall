import list from '../../content/playlist.json';
import {playbackAt,type Playback,type Playlist} from '../../shared/timeline';
import type {Zone} from '../../shared/venue';
import {MediaSync} from './MediaSync';
export class ConcertAudio{
 readonly media=new Audio();enabled=false;volume=.55;zone:Zone='lobby';state='소리 꺼짐';
 private playingRequest=false;private unlocking=false;private lastId='';private cycle=-1;private fade=0;
 private sync=new MediaSync();private abort=new AbortController();private timer:ReturnType<typeof setInterval>;
 private doorLeak=0;
 private context:AudioContext|null=null;private filters:BiquadFilterNode[]=[];
 // The lobby's own room sound: a soft, seamless murmur loop of a large hall, decoded once and looped gaplessly.
 private ambience:GainNode|null=null;private ambienceLoading=false;
 private async startAmbience(context:AudioContext){
  if(this.ambience||this.ambienceLoading)return;this.ambienceLoading=true;
  try{const data=await (await fetch(this.mediaUrl('/api/audio/lobby-ambience.mp3'))).arrayBuffer(),buffer=await context.decodeAudioData(data);
   const gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
   const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=.05;source.loopEnd=Math.max(.1,buffer.duration-.05);source.connect(gain);source.start(0,.05);this.ambience=gain;}
  catch{/* the lobby simply stays silent */}finally{this.ambienceLoading=false;}
 }
 private prepareFilter(){
  if(this.context)return this.context.resume();
  const context=new AudioContext(),source=context.createMediaElementSource(this.media);
  this.context=context;let previous:AudioNode=source;
  // Two low-pass stages leave the bass audible through a closed door.
  for(let i=0;i<2;i++){const filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.707;filter.frequency.value=this.zone==='lobby'?320:22000;previous.connect(filter);previous=filter;this.filters.push(filter);}
  previous.connect(context.destination);void this.startAmbience(context);return context.resume();
 }
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
 /** A personal time shift: zero follows the shared concert; otherwise this visitor replays the program from the start. */
 shift=0;
 get personal(){return this.shift!==0;}
 get playback():Playback{return playbackAt(list as Playlist,this.now()+this.shift);}
 /** Start the whole program again for this visitor only, from the hall murmur and tuning. */
 replayFromStart(){const program=list as Playlist,total=program.tracks.reduce((s,t)=>s+t.durationSeconds+t.gapAfterSeconds,0)*1000;
  const into=(((this.now()-program.epochMs)%total)+total)%total;this.shift=-into+50;this.lastId='';this.sync.request();}
 /** True during the quiet time after a piece, when the hall is silent unless visitors clap. */
 get clapTime(){const p=this.playback;return p.playing&&(p.track.stage==='quiet'||p.track.stage==='applause'||p.track.stage==='farewell');}
 /** A burst of applause for a visitor's clap; only heard in the quiet time between pieces. */
 clap(gain=1){if(!this.enabled||this.zone!=='auditorium'||!this.clapTime||document.hidden)return false;
  const a=new Audio(this.mediaUrl('/api/audio/hall-clap.mp3'));a.volume=Math.max(0,Math.min(1,this.volume*gain));void a.play().catch(()=>{});return true;}
 /** Return to the concert everyone else is hearing. */
 rejoin(){this.shift=0;this.lastId='';this.sync.request();}
 async unlock(){this.enabled=true;this.unlocking=true;this.media.src=this.mediaUrl(this.playback.track.url);this.lastId=this.playback.track.id;this.cycle=this.playback.cycle;this.media.volume=0;this.sync.request();
  try{await this.prepareFilter();await this.media.play();if(this.zone==='lobby'&&!this.doorLeak)this.media.pause();this.sync.request();this.state=this.zone==='lobby'?'공연장에서 음악이 시작돼요':'함께 감상 중';return true;}
  catch{this.enabled=false;this.state='소리를 켜주세요';return false;}finally{this.unlocking=false;}
 }
 toggle(){if(this.enabled){this.enabled=false;this.media.pause();this.state='소리 꺼짐';}else void this.unlock();}
 setZone(zone:Zone){this.zone=zone;this.sync.request();if(this.context)for(const filter of this.filters)filter.frequency.setTargetAtTime(zone==='lobby'?320:22000,this.context.currentTime,.15);}
 /** Closed-door spill uses the existing concert stream, with no extra decoder or audio loop. */
 setDoorDistance(distance:number){
  const t=Math.max(0,Math.min(1,(6.5-distance)/5.3)),level=.22*t*t*(3-2*t);
  if(!this.doorLeak&&level>0)this.sync.request();this.doorLeak=level;
 }
 tick(dt:number){
  if(this.ambience&&this.context){const on=this.enabled&&this.zone==='lobby'&&!document.hidden;this.ambience.gain.setTargetAtTime(on?this.volume*.45:0,this.context.currentTime,.4);}
  if(this.unlocking)return;
  const p=this.playback,level=this.zone==='auditorium'?1:this.doorLeak,wanted=this.enabled&&level>0&&p.playing&&!document.hidden;
  const target=wanted?this.volume*level:0;this.fade+=(target-this.fade)*(1-Math.exp(-dt*5));if(Math.abs(this.media.volume-this.fade)>.005)this.media.volume=Math.max(0,Math.min(1,this.fade));
  if(!wanted){if(this.fade<.005||!p.playing||document.hidden)this.media.pause();this.state=!this.enabled?'소리 꺼짐':this.zone==='lobby'?'공연장에서 음악이 시작돼요':!p.playing?'잠시 쉬어가는 중':'함께 감상 중';return;}
  if(this.cycle!==p.cycle){this.cycle=p.cycle;this.sync.request();}
  if(this.lastId!==p.track.id){this.media.src=this.mediaUrl(p.track.url);this.lastId=p.track.id;this.sync.request();}
  if(this.media.readyState<1){this.state='음악을 불러오는 중';if(!this.media.src)this.media.src=this.mediaUrl(p.track.url);return;}
  const expected=Math.min(p.offset,Math.max(0,this.media.duration-.02));
  const targetBuffered=Array.from({length:this.media.buffered.length},(_,i)=>i).some(i=>this.media.buffered.start(i)<=expected&&this.media.buffered.end(i)>=expected+1);
  const seekTarget=this.sync.target(performance.now(),expected,this.media.currentTime,this.media.readyState,this.media.seeking,this.media.paused,targetBuffered);
  if(seekTarget!==null){try{this.media.currentTime=seekTarget;}catch{this.sync.request();this.state='음악을 준비하는 중';return;}}
  if(this.media.paused&&!this.playingRequest){this.playingRequest=true;void this.media.play().catch(()=>{this.enabled=false;this.state='소리 버튼을 눌러주세요';}).finally(()=>{this.playingRequest=false;});}
  this.state=this.media.readyState<3?'음악을 불러오는 중':this.zone==='lobby'?'문 너머에서 음악이 들려요':'함께 감상 중';
 }
 destroy(){clearInterval(this.timer);this.abort.abort();this.media.pause();this.media.removeAttribute('src');this.media.load();if(this.context)void this.context.close().catch(()=>{});}
}
