import type {FrameTimings,World} from '../World';
import type {ConcertAudio} from '../audio/ConcertAudio';
import {GpuFrameTimer} from './GpuFrameTimer';
import {PROBE_PROFILE} from './ProbeProfile';
const modes=['normal','no-draw','audio-only'] as const;
const labels=['화면과 음악 함께 측정','화면 그리기만 멈추고 측정','음악만 재생하며 측정'];
const stageLabels={
 musicianAnimation:'연주자 동작',
 musicianBatch:'연주자 배칭',
 crowdBatch:'관객 배칭',
 sceneRender:'장면 렌더 제출',
 postProcessing:'블룸·화면 합성',
} satisfies Record<keyof FrameTimings,string>;
function audioState(audio:ConcertAudio){const m=audio.media;let ahead=0;for(let i=0;i<m.buffered.length;i++)if(m.buffered.start(i)<=m.currentTime&&m.buffered.end(i)>=m.currentTime)ahead=m.buffered.end(i)-m.currentTime;
 return {time:m.currentTime,bufferAhead:+ahead.toFixed(2),ready:m.readyState,seeking:m.seeking,paused:m.paused,error:m.error?.code??null,scheduled:audio.playback.offset,track:audio.playback.track.id,cycle:audio.playback.cycle};}
function summarizeMs(values:number[]){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return {samples:values.length,avg:+(values.reduce((sum,n)=>sum+n,0)/values.length).toFixed(2),p95:+sorted[Math.ceil(sorted.length*.95)-1].toFixed(2)};
}
type Sample={at:number;frame:World['frameCost'];audio:ReturnType<typeof audioState>};
/** Local-only report: no upload or telemetry. The same scene/audio is held throughout. */
export async function runDeviceProbe(world:World,audio:ConcertAudio,progress:(message:string)=>void){
 if(world.diagnosticActive)throw new Error('이미 진단 중입니다.');
 const playback=audio.playback;
 const compareAudio=audio.enabled&&playback.playing&&!playback.track.stage&&playback.remaining>=35;
 const phaseCount=compareAudio?modes.length:1;
 const frameTimings:FrameTimings[]=[];
 const abort=new AbortController(),events:unknown[]=[],longTasks:{at:number;ms:number}[]=[],phases:{phase:string;duration:number;renderedFPS:number;initial:ReturnType<typeof audioState>;final:ReturnType<typeof audioState>;samples:Sample[]}[]=[];let phase:string='normal';
 const waits:Record<string,number>={normal:0,'no-draw':0,'audio-only':0};
 const longTasksSupported=typeof PerformanceObserver!=='undefined'&&!!PerformanceObserver.supportedEntryTypes?.includes('longtask');
 const observer=longTasksSupported?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration})))):null;observer?.observe({type:'longtask'});
 for(const event of ['waiting','stalled','seeking','seeked','playing','pause','error'])audio.media.addEventListener(event,()=>{if(event==='waiting'||event==='stalled')waits[phase]++;events.push({phase,event,at:performance.now(),...audioState(audio)});},{signal:abort.signal});
 const gl=world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 const gpu='beginQuery' in gl?new GpuFrameTimer(gl):null;
 const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 world.input.keys.clear();
 try{
  world.setDiagnosticActive(true);
  world.diagnosticGpu=gpu;
  const device={userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,mobile:world.mobile,profile:world.mobile?null:PROBE_PROFILE,quality:world.mobile?world.quality:PROBE_PROFILE.quality,buffer:[world.renderer.domElement.width,world.renderer.domElement.height],renderer,antialias:gl.getContextAttributes()?.antialias,longTasksSupported};
  for(let index=0;index<phaseCount;index++){
   phase=modes[index];world.diagnosticMode=modes[index];const start=performance.now(),drawStart=world.drawCount,initial=audioState(audio),samples:Sample[]=[];
   world.onDiagnosticFrame=phase==='normal'?timings=>{frameTimings.push(timings);}:null;
   const label=compareAudio?labels[index]:'화면과 GPU 측정';
   progress(`${index+1}/${phaseCount} · ${label} · 10초`);
   await new Promise<void>((resolve,reject)=>{const timer=setInterval(()=>{if(document.hidden){clearInterval(timer);reject(new Error('진단 중 다른 앱으로 이동했습니다. 화면을 켠 상태에서 다시 실행해 주세요.'));return;}samples.push({at:performance.now(),frame:{...world.frameCost},audio:audioState(audio)});const elapsed=performance.now()-start;progress(`${index+1}/${phaseCount} · ${label} · ${Math.max(0,Math.ceil((10000-elapsed)/1000))}초`);if(elapsed>=10000){clearInterval(timer);resolve();}},250);});
   phases.push({phase,duration:performance.now()-start,renderedFPS:world.drawCount===drawStart?0:+((world.drawCount-drawStart)*1000/(performance.now()-start)).toFixed(1),initial,final:audioState(audio),samples});
  }
  world.onDiagnosticFrame=null;
  gpu?.collect();
  const gpuTime=summarizeMs(gpu?.samples??[]),cpuTime=summarizeMs(phases[0].samples.map(s=>s.frame.cpu));
  const stageTimes=Object.fromEntries((Object.keys(stageLabels) as (keyof FrameTimings)[]).map(stage=>
   [stage,summarizeMs(frameTimings.map(timings=>timings[stage]))]));
  const stageSummary=frameTimings.length
   ? [`프레임당 CPU 측정 (${frameTimings.length}프레임, 평균 / 95백분위)`,
     ...Object.entries(stageTimes).map(([stage,stats])=>`${stageLabels[stage as keyof FrameTimings]} ${stats?.avg} / ${stats?.p95}ms`)].join('\n')
   : '세부 CPU 측정에 사용할 렌더 프레임이 없었어요.';
  const fps=phases[0].renderedFPS,target=PROBE_PROFILE.fps;
  const profile=world.mobile
   ? `${/iPhone/.test(device.userAgent)?'아이폰':'현재 모바일 기기'} 실측 · ${device.buffer.join('×')} · 목표 ${target}FPS`
   : `PC 실측 · iPhone 13 Pro 렌더링 조건 · 저발열 · ${device.buffer.join('×')} · 목표 ${target}FPS`;
  const frame=`화면: 평균 ${fps}FPS · CPU 프레임 처리 ${cpuTime?.avg??'—'}ms · 목표 프레임 간격 ${(1000/target).toFixed(1)}ms`;
  const gpuSummary=`GPU: ${renderer} · ${gpuTime?`렌더링 평균 ${gpuTime.avg}ms / 상위 5% 경계 ${gpuTime.p95}ms`:gpu?.extension?'유효한 GPU 시간 표본 없음':'이 브라우저는 GPU 시간 측정을 지원하지 않아요'}`;
  const sound=waits['audio-only']>0?'음악만 재생할 때도 재생 대기 신호가 있었습니다. 다운로드 상태나 브라우저의 오디오 처리를 확인해야 합니다.':waits.normal>0&&waits['no-draw']===0?'화면을 그릴 때만 재생 대기 신호가 있었습니다. 화면 처리와 음악 재생이 서로 영향을 주는지 추가 비교가 필요합니다.':Object.values(waits).some(n=>n>0)?'일부 구간에서 재생 대기 신호가 있었습니다. 구간별 수치를 비교해 주세요.':'세 구간 모두 음악 재생 대기 신호가 없었습니다. 실제로 들리는 끊김까지 없다고 보장하는 결과는 아닙니다.';
  const audioSummary=compareAudio
   ? `음악: ${sound}
재생 대기 신호: 화면+음악 ${waits.normal}회 / 그리기 중단 ${waits['no-draw']}회 / 음악만 ${waits['audio-only']}회.`
   : '음악 비교는 건너뛰었습니다. 곡 사이, 곡이 끝나기 직전, 또는 소리가 꺼진 상태에서는 화면과 GPU를 측정합니다.';
  const userSummary=[profile,frame,stageSummary,gpuSummary,audioSummary,phases.some(p=>p.final.error)?'오디오 오류가 기록됐습니다. 상세 결과를 확인해 주세요.':''].filter(Boolean).join('\n\n');
  return {userSummary,version:3,created:new Date().toISOString(),device,compareAudio,cpuTime,stageTimes,gpuTime,phases,events,longTasks,longTasksSupported};
 }finally{
  world.onDiagnosticFrame=null;
  world.diagnosticGpu=null;
  gpu?.dispose();
  world.diagnosticMode='normal';
  world.setDiagnosticActive(false);
  world.input.keys.clear();
  abort.abort();
  observer?.disconnect();
 }
}
