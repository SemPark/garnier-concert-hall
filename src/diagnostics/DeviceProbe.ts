import type {World} from '../World';
import type {ConcertAudio} from '../audio/ConcertAudio';
const modes=['normal','no-draw','audio-only'] as const;
const labels=['화면과 음악 함께 측정','화면 그리기만 멈추고 측정','음악만 재생하며 측정'];
function audioState(audio:ConcertAudio){const m=audio.media;let ahead=0;for(let i=0;i<m.buffered.length;i++)if(m.buffered.start(i)<=m.currentTime&&m.buffered.end(i)>=m.currentTime)ahead=m.buffered.end(i)-m.currentTime;
 return {time:m.currentTime,bufferAhead:+ahead.toFixed(2),ready:m.readyState,seeking:m.seeking,paused:m.paused,error:m.error?.code??null,scheduled:audio.playback.offset,track:audio.playback.track.id,cycle:audio.playback.cycle};}
/** Local-only report: no upload or telemetry. The same scene/audio is held throughout. */
export async function runDeviceProbe(world:World,audio:ConcertAudio,progress:(message:string)=>void){
 if(world.diagnosticActive)throw new Error('이미 진단 중입니다.');
 const abort=new AbortController(),events:unknown[]=[],longTasks:{at:number;ms:number}[]=[],phases:{phase:string;duration:number;renderedFPS:number;initial:ReturnType<typeof audioState>;final:ReturnType<typeof audioState>;samples:unknown[]}[]=[];let phase:string='normal';
 const waits:Record<string,number>={normal:0,'no-draw':0,'audio-only':0};
 const longTasksSupported=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask');
 const observer=longTasksSupported?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration})))):null;observer?.observe({type:'longtask'});
 for(const event of ['waiting','stalled','seeking','seeked','playing','pause','error'])audio.media.addEventListener(event,()=>{if(event==='waiting'||event==='stalled')waits[phase]++;events.push({phase,event,at:performance.now(),...audioState(audio)});},{signal:abort.signal});
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
  const fps=phases[0].renderedFPS,target=world.quality==='low'?24:world.mobile||world.quality==='balanced'?30:60;
  const frame=fps<target*.8?`화면: 목표 ${target}FPS보다 낮은 ${fps}FPS입니다. 화면 처리 부담이 의심됩니다. 화면 품질을 ‘저발열’로 바꿔 비교해 보세요.`:`화면: ${fps}FPS로 목표 ${target}FPS에 가깝습니다. 측정 구간에서는 큰 프레임 저하가 보이지 않았습니다.`;
  const sound=waits['audio-only']>0?'음악만 재생할 때도 재생 대기 신호가 있었습니다. 다운로드 상태나 브라우저의 오디오 처리를 확인해야 합니다.':waits.normal>0&&waits['no-draw']===0?'화면을 그릴 때만 재생 대기 신호가 있었습니다. 화면 처리와 음악 재생이 서로 영향을 주는지 추가 비교가 필요합니다.':Object.values(waits).some(n=>n>0)?'일부 구간에서 재생 대기 신호가 있었습니다. 구간별 수치를 비교해 주세요.':'세 구간 모두 음악 재생 대기 신호가 없었습니다. 실제로 들리는 끊김까지 없다고 보장하는 결과는 아닙니다.';
  const userSummary=[frame,`음악: ${sound}`,`재생 대기 신호: 화면+음악 ${waits.normal}회 / 그리기 중단 ${waits['no-draw']}회 / 음악만 ${waits['audio-only']}회. 같은 정지에서 신호가 여러 번 잡힐 수 있습니다.`,phases.some(p=>p.final.error)?'오디오 오류가 기록됐습니다. 상세 결과를 확인해 주세요.':'',`참고: 발열·GPU 실행 시간·실제로 들린 소리의 끊김은 직접 측정하지 않습니다. 상세 결과는 개발자 확인용입니다.`].filter(Boolean).join('\n\n');
  return {userSummary,version:1,created:new Date().toISOString(),device,phases,events,longTasks,longTasksSupported};
 }finally{world.diagnosticMode='normal';world.diagnosticActive=false;world.input.keys.clear();abort.abort();observer?.disconnect();}
}
