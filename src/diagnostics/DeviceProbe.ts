import type {World} from '../World';
import type {ConcertAudio} from '../audio/ConcertAudio';
const modes=['normal','no-draw','audio-only'] as const;
const labels=['화면과 음악 함께 측정','화면 그리기만 멈추고 측정','음악만 재생하며 측정'];
function audioState(audio:ConcertAudio){const m=audio.media;let ahead=0;for(let i=0;i<m.buffered.length;i++)if(m.buffered.start(i)<=m.currentTime&&m.buffered.end(i)>=m.currentTime)ahead=m.buffered.end(i)-m.currentTime;
 return {time:m.currentTime,bufferAhead:+ahead.toFixed(2),ready:m.readyState,seeking:m.seeking,paused:m.paused,error:m.error?.code??null,scheduled:audio.playback.offset,track:audio.playback.track.id,cycle:audio.playback.cycle};}
/** Local-only report: no upload or telemetry. The same scene/audio is held throughout. */
export async function runDeviceProbe(world:World,audio:ConcertAudio,progress:(message:string)=>void){
 if(world.diagnosticActive)throw new Error('이미 진단 중입니다.');
 const abort=new AbortController(),events:unknown[]=[],longTasks:{at:number;ms:number}[]=[],phases:unknown[]=[];let phase:string='normal';
 const longTasksSupported=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask');
 const observer=longTasksSupported?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration})))):null;observer?.observe({type:'longtask'});
 for(const event of ['waiting','stalled','seeking','seeked','playing','pause','error'])audio.media.addEventListener(event,()=>events.push({phase,event,at:performance.now(),...audioState(audio)}),{signal:abort.signal});
 const gl=world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 const device={userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,quality:world.quality,buffer:[world.renderer.domElement.width,world.renderer.domElement.height],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),antialias:gl.getContextAttributes()?.antialias,longTasksSupported,gpuTime:'not measured; render submission time is CPU time, not GPU execution time'};
 world.input.keys.clear();world.diagnosticActive=true;
 try{
  for(let index=0;index<modes.length;index++){
   phase=modes[index];world.diagnosticMode=modes[index];const start=performance.now(),drawStart=world.drawCount,initial=audioState(audio),samples:unknown[]=[];
   progress(`${index+1}/3 · ${labels[index]} · 10초`);
   await new Promise<void>((resolve,reject)=>{const timer=setInterval(()=>{if(document.hidden){clearInterval(timer);reject(new Error('진단 중 다른 앱으로 이동했습니다. 화면을 켠 상태에서 다시 실행해 주세요.'));return;}samples.push({at:performance.now(),frame:{...world.frameCost},audio:audioState(audio)});const elapsed=performance.now()-start;progress(`${index+1}/3 · ${labels[index]} · ${Math.max(0,Math.ceil((10000-elapsed)/1000))}초`);if(elapsed>=10000){clearInterval(timer);resolve();}},250);});
   phases.push({phase,duration:performance.now()-start,renderedFPS:world.drawCount===drawStart?0:+((world.drawCount-drawStart)*1000/(performance.now()-start)).toFixed(1),initial,final:audioState(audio),samples});
  }
  return {version:1,created:new Date().toISOString(),device,phases,events,longTasks,longTasksSupported};
 }finally{world.diagnosticMode='normal';world.diagnosticActive=false;world.input.keys.clear();abort.abort();observer?.disconnect();}
}
