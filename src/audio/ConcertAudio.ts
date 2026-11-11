import list from './playlist';
import {playbackAt,type Playback,type Playlist} from '../../shared/timeline';
import type {Zone} from '../../shared/venue';
import {MediaSync} from './MediaSync';
export class ConcertAudio{
 readonly media=new Audio();enabled=false;volume=1;zone:Zone='lobby';state='소리 꺼짐';
 private playingRequest=false;private unlocking=false;private lastId='';private cycle=-1;
 private sync=new MediaSync();private abort=new AbortController();private timer:ReturnType<typeof setInterval>;
 private doorLeak=0;
 private context:AudioContext|null=null;private filters:BiquadFilterNode[]=[];
 private musicGain:GainNode|null=null;private outputTarget=-1;
 private analyser:AnalyserNode|null=null;
 private spectrumTime=-Infinity;
 private readonly frequencyData=new Float32Array(512);
 private readonly waveform=new Float32Array(1024);
 private readonly spectrum={volume:0,bands:new Float32Array(16)};
 /** Read original music before room filters and the user's volume gain, at 20 Hz. */
 musicSpectrum(time:number){
  if(time-this.spectrumTime<.05)return this.spectrum;this.spectrumTime=time;
  const a=this.analyser;
  if(!a||this.context?.state!=='running'||this.media.paused||this.media.ended){this.spectrum.volume=0;this.spectrum.bands.fill(0);return this.spectrum;}
  a.getFloatTimeDomainData(this.waveform);a.getFloatFrequencyData(this.frequencyData);
  let sum=0;for(const v of this.waveform)sum+=v*v;
  this.spectrum.volume=Math.min(1,Math.sqrt(sum/this.waveform.length)*4);
  const binHz=this.context.sampleRate/a.fftSize;
  for(let i=0;i<16;i++){
   const lo=Math.max(1,Math.floor(50*Math.pow(240,i/16)/binHz));
   const hi=Math.min(this.frequencyData.length,Math.max(lo+1,Math.ceil(50*Math.pow(240,(i+1)/16)/binHz)));
   let power=0;for(let b=lo;b<hi;b++)power+=Math.pow(10,this.frequencyData[b]/10);
   const db=10*Math.log10(Math.max(1e-12,power/Math.max(1,hi-lo)));
   this.spectrum.bands[i]=Math.max(0,Math.min(1,(db+78)/52));
  }
  return this.spectrum;
 }
 // Crossing the hall door switches the sound at once: muffled outside, full inside, with no fade.

 private lastMeow=-Infinity;
 // The lobby's own room sound: a soft, seamless murmur loop of a large hall, decoded once and looped gaplessly.
 private ambience:GainNode|null=null;private ambienceLoading=false;private ambienceTarget=-1;
 // How loud the room tone is: 1 to 10, 5 in the middle (the default). 5 (the default) gives 0.09 in both the lobby and the hall with the music at 100; 10 is twice that, and each step down takes off a tenth of that.
 roomLevel=(()=>{try{const raw=localStorage.getItem('garnier-room-level'),v=Number(raw);return raw!==null&&Number.isFinite(v)?Math.max(1,Math.min(10,Math.round(v))):5;}catch{return 5;}})();
 setRoomLevel(value:number){this.roomLevel=Math.max(1,Math.min(10,Math.round(value)));try{localStorage.setItem('garnier-room-level',String(this.roomLevel));}catch{/* kept for this visit only */}}
 private async startAmbience(context:AudioContext){
  if(this.ambience||this.ambienceLoading)return;this.ambienceLoading=true;
  try{const data=await (await fetch(this.mediaUrl('/api/audio/lobby-ambience.mp3'))).arrayBuffer(),buffer=await context.decodeAudioData(data);
   const gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
   const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=.05;source.loopEnd=Math.max(.1,buffer.duration-.05);source.connect(gain);source.start(0,.05);this.ambience=gain;}
  catch{/* the lobby simply stays silent */}finally{this.ambienceLoading=false;}
 }
 private prepareFilter(){
  if(this.context)return this.context.resume();
  const context=new AudioContext({latencyHint:'playback'}),source=context.createMediaElementSource(this.media);
  this.context=context;
  this.analyser=context.createAnalyser();this.analyser.fftSize=1024;this.analyser.smoothingTimeConstant=.35;
  source.connect(this.analyser);
  let previous:AudioNode=source;
  // Two low-pass stages leave the bass audible through a closed door.
  for(let i=0;i<2;i++){const filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.707;filter.frequency.value=this.zone==='lobby'?450:22000;previous.connect(filter);previous=filter;this.filters.push(filter);}
  this.musicGain=context.createGain();this.musicGain.gain.value=0;previous.connect(this.musicGain);this.musicGain.connect(context.destination);
  void this.startAmbience(context);return context.resume();
 }
 constructor(private now:()=>number){this.media.preload='auto';this.media.setAttribute('playsinline','');
  const opts={signal:this.abort.signal};
  this.media.addEventListener('playing',()=>this.sync.playing(performance.now()),opts);
  for(const event of ['waiting','stalled'])this.media.addEventListener(event,()=>{this.state='음악을 불러오는 중';this.sync.buffering();},opts);
  this.media.addEventListener('error',()=>{this.state='음원을 불러오지 못했어요';},opts);
  document.addEventListener('visibilitychange',()=>{this.sync.request();if(document.hidden)this.media.pause();},opts);
  // If the browser left the audio graph suspended, the next tap or key wakes it (music, door spill and lobby room tone all pass through it).
  for(const type of ['pointerdown','keydown','touchend'])document.addEventListener(type,()=>{
   if(!this.enabled||this.unlocking||document.hidden)return;
   if(this.context&&this.context.state!=='running')void this.context.resume().catch(()=>{});
   if(this.media.paused&&this.playback.playing&&!this.playback.track.stage)this.playMedia();
  },{...opts,capture:true});
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
 private clapBuffer:AudioBuffer|null=null;private clapRoom:AudioBuffer|null=null;
 /** Short individual handclaps with a small hall reflection; only an explicit visitor gesture calls this. */
 clap(gain=1){
  const c=this.context;if(!this.enabled||this.volume<=0||document.hidden||!c)return false;
  if(c.state!=='running')void c.resume().catch(()=>{});
  if(!this.clapBuffer){
   this.clapBuffer=c.createBuffer(1,Math.ceil(c.sampleRate*.085),c.sampleRate);const data=this.clapBuffer.getChannelData(0);
   for(let i=0;i<data.length;i++){const t=i/c.sampleRate;data[i]=(Math.random()*2-1)*Math.min(1,t/.0008)*Math.exp(-t*72);}
   this.clapRoom=c.createBuffer(2,Math.ceil(c.sampleRate*.65),c.sampleRate);
   for(let channel=0;channel<2;channel++){const room=this.clapRoom.getChannelData(channel);for(let i=0;i<room.length;i++){const t=i/c.sampleRate;room[i]=t<.035?0:(Math.random()*2-1)*Math.exp(-t*9)*.055;}
    for(const [delay,level] of [[.055,.25],[.095,.13],[.16,.07]])room[Math.floor((delay+channel*.007)*c.sampleRate)]+=level;
   }
  }
  for(const offset of [0,.43,.86]){
   const source=c.createBufferSource(),high=c.createBiquadFilter(),low=c.createBiquadFilter(),level=c.createGain(),room=c.createConvolver(),wet=c.createGain();
   source.buffer=this.clapBuffer;high.type='highpass';high.frequency.value=650;low.type='lowpass';low.frequency.value=6500;level.gain.value=Math.min(1,this.volume*gain)*.85;room.buffer=this.clapRoom;room.normalize=false;wet.gain.value=this.zone==='auditorium'?.42:.24;
   source.connect(high);high.connect(low);low.connect(level);level.connect(c.destination);level.connect(room);room.connect(wet);wet.connect(c.destination);
   source.start(c.currentTime+offset);source.onended=()=>window.setTimeout(()=>{for(const node of [source,high,low,level,room,wet])node.disconnect();},700);
  }
  return true;
 }
 /** A short, soft cartoon meow; generated locally, with no extra file or download. */
 meow(){
  const c=this.context;if(!this.enabled||this.volume<=0||document.hidden||!c||c.state!=='running'||c.currentTime-this.lastMeow<1.2)return false;
  const t=c.currentTime;this.lastMeow=t;
  const voice=c.createOscillator(),body=c.createOscillator(),vibrato=c.createOscillator(),depth=c.createGain(),envelope=c.createGain(),bodyGain=c.createGain();
  voice.type='sawtooth';body.type='triangle';vibrato.frequency.value=5.5;depth.gain.value=8;bodyGain.gain.value=.18;
  for(const oscillator of [voice,body]){
   oscillator.frequency.setValueAtTime(520,t);oscillator.frequency.exponentialRampToValueAtTime(740,t+.08);oscillator.frequency.exponentialRampToValueAtTime(570,t+.2);oscillator.frequency.exponentialRampToValueAtTime(340,t+.56);oscillator.frequency.exponentialRampToValueAtTime(290,t+.7);depth.connect(oscillator.frequency);
  }
  vibrato.connect(depth);body.connect(bodyGain);bodyGain.connect(envelope);
  const filters:BiquadFilterNode[]=[],levels:GainNode[]=[];
  for(const [from,to,q,amount] of [[1400,820,2.5,.7],[3000,1550,3.5,.25]]){
   const filter=c.createBiquadFilter(),gain=c.createGain();filter.type='bandpass';filter.Q.value=q;filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+.6);gain.gain.value=amount;voice.connect(filter);filter.connect(gain);gain.connect(envelope);filters.push(filter);levels.push(gain);
  }
  envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(this.volume*.25,t+.025);envelope.gain.setValueAtTime(this.volume*.22,t+.18);envelope.gain.exponentialRampToValueAtTime(.0001,t+.7);envelope.connect(c.destination);
  for(const oscillator of [voice,body,vibrato]){oscillator.start(t);oscillator.stop(t+.72);}
  voice.onended=()=>{for(const node of [voice,body,vibrato,depth,envelope,bodyGain,...filters,...levels])node.disconnect();};return true;
 }
 /** Return to the concert everyone else is hearing. */
 rejoin(){this.shift=0;this.lastId='';this.sync.request();}
 async unlock(){this.enabled=true;this.unlocking=true;this.media.src=this.mediaUrl(this.playback.track.url);this.lastId=this.playback.track.id;this.cycle=this.playback.cycle;this.media.volume=1;this.media.muted=false;this.sync.request();
  // Start the audio graph and the media in the same tap: browsers only allow sound that begins inside the gesture.
  try{const graph=this.prepareFilter(),playing=this.media.play();await graph;await playing;this.sync.request();this.state=this.zone==='lobby'?'공연장에서 음악이 시작돼요':'함께 감상 중';return true;}
  catch{this.enabled=false;this.state='소리를 켜주세요';return false;}finally{this.unlocking=false;}
 }
 toggle(){if(this.enabled){this.enabled=false;this.media.pause();this.state='소리 꺼짐';}else void this.unlock();}
 setZone(zone:Zone){const changed=zone!==this.zone;this.zone=zone;this.sync.request();
  if(!this.context)return;const t=this.context.currentTime,entering=zone==='auditorium';
  // The level and the door muffle switch together on the audio clock, in this order: going in, the muffle stays on
  // until the music is switched on; going out, the music is switched down first and the muffle comes on just after.
  if(changed&&this.musicGain){const p=this.playback,target=this.enabled&&!document.hidden&&p.playing&&!p.track.stage?this.volume*(entering?1:this.doorLeak):0,g=this.musicGain.gain;
   g.cancelScheduledValues(t);g.setValueAtTime(target,t);this.outputTarget=target;}
  for(const filter of this.filters){filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(entering?22000:450,entering?t:t+.02);}}
 /** Closed-door spill uses the existing concert stream, with no extra decoder or audio loop. */
 setDoorDistance(distance:number){
  const t=Math.max(0,Math.min(1,(9-distance)/7.8)),level=.5*t*t*(3-2*t);
  if(!this.doorLeak&&level>0)this.sync.request();this.doorLeak=level;
 }
 private playMedia(){
  if(this.playingRequest)return;this.playingRequest=true;
  void this.media.play().catch(()=>{this.enabled=false;this.state='소리 버튼을 눌러주세요';}).finally(()=>{this.playingRequest=false;});
 }
 tick(dt:number){
  // The room tone stays under everything, in the lobby and in the hall, about 20 dB below the music; at the lobby door it ducks so the music spilling through stays clear.
  if(this.ambience&&this.context){const on=this.enabled&&!document.hidden,duck=this.zone==='lobby'?1-.8*Math.min(1,this.doorLeak/.5):1;// the same level in the lobby and the hall; only near the hall door does it dip for the music
   const target=on?Math.min(1,this.volume*this.roomLevel*.018*duck):0;if(Math.abs(target-this.ambienceTarget)>.00001){this.ambience.gain.setTargetAtTime(target,this.context.currentTime,.4);this.ambienceTarget=target;}}
  if(this.unlocking)return;
  const p=this.playback,level=this.zone==='auditorium'?1:this.doorLeak,active=this.enabled&&!document.hidden;
  const target=active&&p.playing&&!p.track.stage?this.volume*level:0;
  // Crossing the door is switched in setZone; here the level only follows smaller changes, smoothly.
  if(this.context&&this.musicGain&&Math.abs(target-this.outputTarget)>.0001){const g=this.musicGain.gain,t=this.context.currentTime;
   g.setTargetAtTime(target,t,.15);this.outputTarget=target;}
  // Keep the user-unlocked stream running silently in the lobby. Pausing it here can
  // make a later asynchronous hall entry fail mobile autoplay restrictions.
  if(!active){this.media.pause();this.state=this.enabled?'음악 일시 정지':'소리 꺼짐';return;}
  if(!p.playing||p.track.stage){this.media.pause();this.state='잠시 쉬어가는 중';return;}
  if(this.cycle!==p.cycle){this.cycle=p.cycle;this.sync.request();}
  if(this.lastId!==p.track.id){this.media.src=this.mediaUrl(p.track.url);this.lastId=p.track.id;this.sync.request();}
  if(this.media.readyState<1){this.state='음악을 불러오는 중';if(!this.media.src)this.media.src=this.mediaUrl(p.track.url);if(this.media.paused)this.playMedia();return;}
  const expected=Math.min(p.offset,Math.max(0,this.media.duration-.02));
  const targetBuffered=Array.from({length:this.media.buffered.length},(_,i)=>i).some(i=>this.media.buffered.start(i)<=expected&&this.media.buffered.end(i)>=expected+1);
  const seekTarget=this.sync.target(performance.now(),expected,this.media.currentTime,this.media.readyState,this.media.seeking,this.media.paused,targetBuffered);
  if(seekTarget!==null){try{this.media.currentTime=seekTarget;}catch{this.sync.request();this.state='음악을 준비하는 중';return;}}
  if(this.media.paused)this.playMedia();
  this.state=this.context?.state!=='running'?'화면을 눌러 음악을 이어주세요':this.media.readyState<3?'음악을 불러오는 중':this.zone==='lobby'?(level>0?'문 너머에서 음악이 들려요':'로비에서 쉬어가세요'):'함께 감상 중';
 }
 destroy(){clearInterval(this.timer);this.abort.abort();this.media.pause();this.media.removeAttribute('src');this.media.load();if(this.context)void this.context.close().catch(()=>{});}
}
