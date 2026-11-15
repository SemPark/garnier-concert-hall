import * as T from 'three';
import { Avatar } from '../../character/Avatar';
import { applyMotion } from '../../motion/player';
import { validateClip, type MotionClip } from '../../motion/clip';
import { bakeMotion, type CaptureFrame } from './retarget';
import { useSideDepth } from './side-view';
import { videoURL } from './source';
import './lab.css';
import workerSource from './pose.worker.js?raw';

if (!import.meta.env.DEV) throw new Error('Motion Lab is a development tool.');
document.querySelector('#lab')!.innerHTML = `<main>
  <div class="eyebrow">PLEEE / DEVELOPMENT TOOLS</div><h1>영상 → 캐릭터 모션</h1>
  <p>MP4 파일 또는 직접 영상 링크에서 한 사람의 춤을 추출합니다. 분석은 이 기기에서 실행되며 영상은 업로드하지 않습니다.</p>
  <section class="controls" aria-label="영상 입력">
    <label>정면 영상 파일<input id="file" type="file" accept="video/mp4,video/webm,video/quicktime"></label>
    <label class="url">정면 영상 URL<input id="url" type="url" placeholder="https://example.com/dance.mp4"></label>
    <button id="load">정면 링크 열기</button>
    <label>저장한 모션 열기<input id="json" type="file" accept="application/json,.json"></label>
  </section>
  <small>링크는 CORS 접근을 허용한 MP4/WebM 파일이어야 합니다. YouTube·Instagram 등의 페이지 링크는 파일로 내려받은 뒤 선택해 주세요.</small>
  <section class="controls" aria-label="측면 영상 입력">
    <label>측면 영상 파일<input id="side-file" type="file" accept="video/mp4,video/webm,video/quicktime"></label>
    <label class="url">측면 영상 URL<input id="side-url" type="url"></label>
    <button id="side-load">측면 링크 열기</button>
    <button id="side-clear" disabled>측면 제거</button>
    <label>측면 시간차(초)<input id="side-offset" type="number" value="0" step="0.01"></label>
    <label>시작 포즈에서 바라보는 방향<select id="side-direction"><option value="1">화면 왼쪽</option><option value="-1">화면 오른쪽</option></select></label>
  </section>
  <small>같은 춤을 동시에 정면과 약 90° 측면에서 촬영하세요. 두 원본의 재생 막대에서 같은 동작의 시각을 찾으세요. 정면 0초가 측면 1.25초와 같으면 시간차에 1.25를 입력하세요.</small>
  <section class="controls" aria-label="추출 설정">
    <label>동작 ID<input id="name" value="captain" pattern="[a-z0-9-]+" maxlength="64"></label>
    <label>시작(초)<input id="start" type="number" value="0" min="0" step="0.1"></label>
    <label>끝(초)<input id="end" type="number" value="10" min="0" step="0.1"></label>
    <label>추출 FPS<select id="fps"><option>15</option><option selected>24</option><option>30</option></select></label>
    <button id="extract" disabled>동작 추출</button><button id="cancel" disabled>취소</button>
    <button id="export" disabled>모션 JSON 저장</button>
  </section>
  <div id="status" role="status" aria-live="polite">영상 파일이나 링크를 선택하세요. 최초 분석 시 무료 MediaPipe 모델을 다운로드합니다.</div>
  <section class="views" id="views">
    <div class="panel"><h2>정면 원본</h2><div class="stage"><video id="video" playsinline muted crossorigin="anonymous"></video><canvas class="overlay" id="overlay"></canvas></div><small id="source-fps"></small></div>
    <div class="panel" id="side-panel" hidden><h2>측면 원본</h2><div class="stage"><video id="side-video" playsinline muted crossorigin="anonymous"></video><canvas class="overlay" id="side-overlay"></canvas></div><small id="side-source-fps"></small></div>
    <div class="panel"><h2>캐릭터 · 정면</h2><div class="stage" id="front"></div></div>
    <div class="panel"><h2>캐릭터 · 측면</h2><div class="stage" id="side"></div></div>
  </section>
  <div class="transport"><button id="play" disabled>재생 / 일시정지</button><input id="seek" aria-label="재생 위치" type="range" min="0" max="1" step="0.001" value="0"><output id="time">0.00s</output></div>
  <p>공연장에 적용하려면 저장한 JSON을 <code>src/motion/clips/</code>에 넣고 다시 빌드하세요. ID가 <code>captain</code>이면 기존 선장춤에 적용됩니다.</p>
  <small>두 영상에서 한 사람의 전신이 보이도록 카메라를 고정하세요. 정면 영상만 입력하면 캐릭터 측면은 깊이 추정값으로 표시됩니다.</small>
</main>`;
const el = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const input = (id: string) => el<HTMLInputElement>(id);
const video = el<HTMLVideoElement>('video'), sideVideo = el<HTMLVideoElement>('side-video');
const status = (message: string) => { el('status').textContent = message; };
const sources = [
  { video, fpsLabel: el('source-fps'), overlay: el<HTMLCanvasElement>('overlay'), ready: false, objectURL: undefined as string | undefined, captures: [] as CaptureFrame[], stopMeasuring: undefined as (() => void) | undefined },
  { video: sideVideo, fpsLabel: el('side-source-fps'), overlay: el<HTMLCanvasElement>('side-overlay'), ready: false, objectURL: undefined as string | undefined, captures: [] as CaptureFrame[], stopMeasuring: undefined as (() => void) | undefined },
];
const [front, side] = sources;
let clip: MotionClip | undefined;
const workers: Worker[] = [];
let abort: AbortController | undefined;
let busy = false, loading = false, playing = false, time = 0, last = 0, transportRevision = 0;
let nextRender = 0;
function controls() {
  const disabled = busy || loading;
  for (const id of ['file', 'url', 'load', 'side-file', 'side-url', 'side-load', 'side-offset',
    'side-direction', 'json', 'name', 'start', 'end', 'fps']) (el(id) as HTMLInputElement).disabled = disabled;
  el<HTMLButtonElement>('side-clear').disabled = disabled || !side.ready;
  el<HTMLButtonElement>('extract').disabled = disabled || !front.ready;
  el<HTMLButtonElement>('cancel').disabled = !busy;
  el<HTMLButtonElement>('export').disabled = disabled || !clip;
  el<HTMLButtonElement>('play').disabled = disabled || !clip;
  input('seek').disabled = disabled || !clip;
  for (const source of sources) {
    source.video.controls = source.ready && !busy && !clip;
    source.overlay.hidden = !busy && !clip;
  }
  el('side-panel').hidden = !side.ready;
  el('views').classList.toggle('paired', side.ready);
}
function pause() {
  transportRevision++;
  playing = false;
  for (const source of sources) source.video.pause();
}
function event(target: EventTarget, name: string, signal?: AbortSignal, timeout = 20000) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); target.removeEventListener(name, done); target.removeEventListener('error', failed);
      signal?.removeEventListener('abort', cancelled); error ? reject(error) : resolve();
    };
    const done = () => finish();
    const failed = () => finish(new Error('영상을 읽을 수 없습니다. 파일 형식, 링크 만료 및 CORS 허용 여부를 확인해 주세요.'));
    const cancelled = () => finish(new Error('취소했습니다.'));
    const timer = window.setTimeout(() => finish(new Error('영상 응답 시간이 초과되었습니다.')), timeout);
    target.addEventListener(name, done, { once: true }); target.addEventListener('error', failed, { once: true });
    signal?.addEventListener('abort', cancelled, { once: true });
    if (signal?.aborted) cancelled();
  });
}
async function loadSource(source: typeof front, src: string, local: boolean) {
  pause();
  source.stopMeasuring?.();
  source.fpsLabel.textContent = '';
  if (source.objectURL) URL.revokeObjectURL(source.objectURL);
  source.objectURL = local ? src : undefined;
  clip = undefined;
  for (const view of sources) view.captures = [];
  source.ready = false; loading = true; controls();
  status('영상을 불러오는 중…');
  try {
    const ready = event(source.video, 'loadeddata');
    source.video.src = src; source.video.load(); await ready;
    const duration = source.video.duration;
    if (!Number.isFinite(duration) || duration < 1) throw new Error('길이가 확정된 1초 이상의 영상 파일이 필요합니다.');
    source.ready = true;
    source.stopMeasuring = observeSourceRate(source.video, source.fpsLabel);
    if (source === front) {
      input('start').value = '0'; input('end').value = String(Math.min(10, duration));
    }
    status(`${source === front ? '정면' : '측면'} 영상 준비 완료 · ${duration.toFixed(2)}초`);
  } catch (error) { status(String(error)); }
  finally { loading = false; controls(); }
}
for (const [i, source] of sources.entries()) {
  const prefix = i === 0 ? '' : 'side-';
  input(prefix + 'file').onchange = () => {
    const file = input(prefix + 'file').files?.[0];
    if (file) void loadSource(source, URL.createObjectURL(file), true);
  };
  el(prefix + 'load').onclick = () => {
    try { void loadSource(source, videoURL(input(prefix + 'url').value), false); }
    catch (error) { status(String(error)); }
  };
}
el('side-clear').onclick = () => {
  pause();
  side.stopMeasuring?.();
  side.ready = false; side.captures = [];
  if (side.objectURL) URL.revokeObjectURL(side.objectURL);
  side.objectURL = undefined;
  sideVideo.removeAttribute('src'); sideVideo.load();
  input('side-file').value = ''; input('side-url').value = '';
  status('측면 영상을 제거했습니다.');
  controls();
};
function observeSourceRate(video: HTMLVideoElement, label: HTMLElement) {
  if (!video.requestVideoFrameCallback) {
    label.textContent = '이 브라우저에서는 원본 FPS를 측정할 수 없습니다.';
    return;
  }
  label.textContent = '원본을 재생하면 영상 FPS를 측정합니다.';
  let previous: VideoFrameCallbackMetadata | undefined;
  const intervals: number[] = [];
  let elapsed = 0, frames = 0;
  const reset = () => { previous = undefined; };
  video.addEventListener('seeking', reset);
  video.addEventListener('pause', reset);
  function observe(_now: number, frame: VideoFrameCallbackMetadata) {
    if (!video.paused && !video.seeking) {
      const seconds = frame.mediaTime - (previous?.mediaTime ?? frame.mediaTime);
      const count = frame.presentedFrames - (previous?.presentedFrames ?? frame.presentedFrames);
      if (seconds > 0 && count > 0) {
        // More than one frame can be presented between callbacks.
        elapsed += seconds;
        frames += count;
        if (count === 1) intervals.push(seconds);
        if (frames >= 12) {
          const sorted = intervals.slice().sort((a, b) => a - b);
          const variable = sorted.length >= 10 && sorted[sorted.length - 2] / sorted[1] > 1.2;
          label.textContent = `원본 영상 약 ${(frames / elapsed).toFixed(1)} FPS · 재생 중 측정${variable ? ' · 프레임 간격 변동' : ''}`;
          elapsed = 0; frames = 0; intervals.length = 0;
        }
      }
      previous = frame;
    }
    callback = video.requestVideoFrameCallback(observe);
  }
  let callback = video.requestVideoFrameCallback(observe);
  return () => {
    video.cancelVideoFrameCallback(callback);
    video.removeEventListener('seeking', reset);
    video.removeEventListener('pause', reset);
  };
}
async function seek(video: HTMLVideoElement, seconds: number, signal?: AbortSignal) {
  seconds = Math.min(seconds, video.duration - .001);
  if (!video.seeking && Math.abs(video.currentTime - seconds) < .0001 && video.readyState >= 2) return;
  const ready = event(video, 'seeked', signal); video.currentTime = seconds; await ready;
}
function request(active: Worker, data: unknown, signal: AbortSignal, transfer: Transferable[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); active.onmessage = null; active.onerror = null; signal.removeEventListener('abort', cancelled); };
    const cancelled = () => { cleanup(); reject(new Error('취소했습니다.')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('MediaPipe 응답 시간 초과. 네트워크 연결을 확인하고 다시 시도하세요.')); }, 90000);
    active.onmessage = ({ data }) => { cleanup(); data.error ? reject(new Error(data.error)) : resolve(data); };
    active.onerror = e => { cleanup(); reject(new Error(e.message || 'MediaPipe Worker 로딩 실패')); };
    signal.addEventListener('abort', cancelled, { once: true });
    if (signal.aborted) { cancelled(); return; }
    active.postMessage(data, transfer);
  });
}
function setClip(result: MotionClip) {
  clip = result; time = 0; input('seek').max = String(result.duration); input('seek').value = '0';
  const kb = new Blob([JSON.stringify(result)]).size / 1024;
  const summary = `모션 준비 완료 · 추출 ${result.fps} FPS · ${result.frames.length} 키프레임 · ${result.duration.toFixed(2)}초 · ${kb.toFixed(1)} KB`;
  const quality = result.quality;
  const details = [summary];
  if (Number.isFinite(quality?.missing) && Number.isFinite(quality?.total) && quality.total > 0) {
    details.push(`관절 추적 손실 ${quality.missing}/${quality.total} 프레임 · ${(100 * quality.missing / quality.total).toFixed(1)}%`);
  }
  if (Array.isArray(quality?.warnings)) details.push(...quality.warnings);
  status(details.join('\n'));
  controls();
}
el('extract').onclick = async () => {
  const start = Number(input('start').value), end = Number(input('end').value), fps = Number(input('fps').value);
  const id = input('name').value;
  if (!/^[a-z0-9-]{1,64}$/.test(id) || !Number.isFinite(start + end) || start < 0 || end > video.duration || end - start < 1 || end - start > 60) {
    status('ID는 영문 소문자·숫자·하이픈으로, 구간은 영상 안의 1~60초로 지정해 주세요.'); return;
  }
  const offset = side.ready ? Number(input('side-offset').value) : undefined;
  if (offset !== undefined && (!input('side-offset').value || !Number.isFinite(offset) ||
      start + offset < 0 || end + offset > sideVideo.duration + .000001)) {
    status('측면 영상에도 같은 구간이 들어오도록 시간차와 시작·끝을 조정해 주세요.'); return;
  }
  pause(); busy = true; clip = undefined;
  for (const source of sources) source.captures = [];
  controls(); abort = new AbortController();
  const signal = abort.signal;
  try {
    status('MediaPipe 모델 준비 중… 첫 실행에는 다운로드 시간이 필요합니다.');
    const activeSources = offset === undefined ? [front] : sources;
    const workerURL = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
    try {
      for (let i = 0; i < activeSources.length; i++) workers.push(new Worker(workerURL));
      await Promise.all(workers.map(worker => request(worker, { type: 'init' }, signal)));
    } finally { URL.revokeObjectURL(workerURL); }
    const count = Math.floor((end - start) * fps);
    const contexts = activeSources.map(({video}) => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      return canvas.getContext('2d')!;
    });
    for (let i = 0; i <= count; i++) {
      signal.throwIfAborted();
      await Promise.all(activeSources.map(async (source, view) => {
        await seek(source.video, start + i / fps + (view === 1 ? offset! : 0), signal);
        const ctx = contexts[view];
        ctx.drawImage(source.video, 0, 0, ctx.canvas.width, ctx.canvas.height);
        const bitmap = await createImageBitmap(ctx.canvas);
        if (signal.aborted) { bitmap.close(); signal.throwIfAborted(); }
        const frame: CaptureFrame = await request(workers[view],
          { type: 'frame', bitmap, timestamp: i * 1000 / fps }, signal, [bitmap]);
        source.captures.push(frame);
        drawOverlay(source, frame);
      }));
      status(`동작 추출 중 · ${Math.round(i / count * 100)}% (${i + 1}/${count + 1})`);
    }
    const result = offset === undefined ? bakeMotion(front.captures, fps, id, start) : (() => {
      const direction = el<HTMLSelectElement>('side-direction').value === '1' ? 1 : -1;
      const { frames, coverage } = useSideDepth(front.captures, side.captures, sideVideo.videoWidth / sideVideo.videoHeight, direction);
      return bakeMotion(frames, fps, id, start, { offset, coverage });
    })();
    await Promise.all(activeSources.map((source, i) => seek(source.video, start + (i === 1 ? offset! : 0), signal)));
    setClip(result);
  } catch (error) { status(signal.aborted ? '추출을 취소했습니다.' : String(error)); }
  finally {
    abort?.abort();
    for (const worker of workers.splice(0)) worker.terminate();
    busy = false; controls();
  }
};
el('cancel').onclick = () => abort?.abort();

function matchingViews(clip: MotionClip) {
  const views: { source: typeof front; start: number }[] = [];
  if (front.ready && clip.sourceStart + clip.duration <= video.duration + .000001) {
    views.push({ source: front, start: clip.sourceStart });
  }
  if (side.ready && clip.sideOffset !== undefined &&
      clip.sourceStart + clip.sideOffset + clip.duration <= sideVideo.duration + .000001) {
    views.push({ source: side, start: clip.sourceStart + clip.sideOffset });
  }
  return views;
}
input('json').onchange = async () => {
  const file = input('json').files?.[0]; if (!file) return;
  try {
    if (file.size > 3_000_000) throw new Error('모션 파일은 3MB 이하여야 합니다.');
    const imported = validateClip(JSON.parse(await file.text()));
    pause();
    for (const source of sources) source.captures = [];
    await Promise.all(matchingViews(imported).map(({source, start}) => seek(source.video, start)));
    setClip(imported);
  } catch (error) { status(String(error)); }
};
el('export').onclick = () => {
  if (!clip) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(clip)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${clip.id}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let playingViews: ReturnType<typeof matchingViews> = [];
async function playAt(position: number) {
  if (!clip) return;
  const revision = ++transportRevision;
  const views = matchingViews(clip);
  try {
    await Promise.all(views.map(({source, start}) => seek(source.video, start + position)));
    if (revision !== transportRevision) return;
    await Promise.all(views.map(({source}) => source.video.play()));
    if (revision !== transportRevision) return;
    playingViews = views;
    playing = true;
  } catch (error) {
    if (revision === transportRevision) { pause(); status(String(error)); }
  }
}
el('play').onclick = () => {
  if (!clip) return;
  if (playing) pause();
  else void playAt(time >= clip.duration ? 0 : time);
};
input('seek').oninput = () => {
  pause(); time = Number(input('seek').value);
  if (!clip) return;
  for (const {source, start} of matchingViews(clip)) {
    source.video.currentTime = Math.min(start + time, source.video.duration - .001);
  }
};
const scene = new T.Scene(); scene.background = new T.Color('#111820');
scene.add(new T.HemisphereLight(0xffedcf, 0x597187, 3));
const light = new T.DirectionalLight(0xffffff, 3); light.position.set(-2, 4, -4); scene.add(light);
const grid = new T.GridHelper(4, 20, 0x607181, 0x293c4b); scene.add(grid);
const avatar = new Avatar(0x37596c); scene.add(avatar.root);
const renderers = ['front', 'side'].map((id, i) => {
  const host = el(id), renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); host.appendChild(renderer.domElement);
  const camera = new T.PerspectiveCamera(34, 1, .1, 30);
  camera.position.set(i ? -3.4 : 0, 1.2, i ? 0 : -3.4); camera.lookAt(0, .85, 0);
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); });
  resize.observe(host); return { renderer, camera, resize };
});
const edges = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function drawOverlay({video, overlay: canvas}: typeof front, frame?: CaptureFrame) {
  const ctx = canvas.getContext('2d')!;
  if (canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
  if (canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!frame || !video.videoWidth) return;
  const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const w = video.videoWidth * scale, h = video.videoHeight * scale;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  ctx.strokeStyle = '#69ebc4'; ctx.lineWidth = 2;
  for (const [a, b] of edges) {
    const p = frame.image[a], q = frame.image[b];
    if (!p || !q || (p.visibility ?? 0) < .5 || (q.visibility ?? 0) < .5) continue;
    ctx.beginPath(); ctx.moveTo(x + p.x * w, y + p.y * h); ctx.lineTo(x + q.x * w, y + q.y * h); ctx.stroke();
  }
}
let animation = 0;
function render(now: number) {
  animation = requestAnimationFrame(render);
  const interval = 1000 / 30;
  if (document.hidden || now + 1 < nextRender) return;
  // Keep the 30 FPS cadence aligned when a display callback arrives slightly late.
  if (!nextRender || now - nextRender >= interval) nextRender = now;
  nextRender += interval;
  const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  if (clip && !busy) {
    if (playing) {
      const master = playingViews[0];
      time = master ? master.source.video.currentTime - master.start : time + dt;
      if (time >= clip.duration || master?.source.video.ended) {
        pause(); time = 0; void playAt(0);
      } else {
        for (const {source, start} of playingViews.slice(1)) {
          if (!source.video.seeking && Math.abs(source.video.currentTime - start - time) > .08) {
            source.video.currentTime = start + time;
          }
        }
      }
      time = Math.max(0, time);
    }
    input('seek').value = String(time);
    el('time').textContent = `${time.toFixed(2)} / ${clip.duration.toFixed(2)}s`;
    avatar.update(time, 0, false, false, null, 10, 1 / 30, undefined, true);
    applyMotion(avatar, clip, time);
    const frame = Math.round(time * clip.fps);
    for (const source of sources) drawOverlay(source, source.captures[frame]);
  } else if (!clip) {
    avatar.update(now / 1000, 0, false, false);
    if (!busy) for (const source of sources) drawOverlay(source);
  }
  for (const { renderer, camera } of renderers) renderer.render(scene, camera);
}
animation = requestAnimationFrame(render);
window.addEventListener('pagehide', () => {
  pause(); abort?.abort(); cancelAnimationFrame(animation);
  for (const worker of workers) worker.terminate();
  for (const source of sources) {
    source.stopMeasuring?.();
    if (source.objectURL) URL.revokeObjectURL(source.objectURL);
  }
  for (const { renderer, resize } of renderers) { resize.disconnect(); renderer.dispose(); }
}, { once: true });
controls();
