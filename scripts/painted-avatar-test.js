import * as T from 'three';
import { PaintedUsher, PORTRAIT_LEFT_TRACK_LIMIT, PORTRAIT_REST_YAW } from '../src/scene/PaintedUsher.ts';
const canvas = document.querySelector('canvas');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(384, 480, false);
const painting = new PaintedUsher();
const scene = new T.Scene();
const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 2);
scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: painting.texture, toneMapped: false })));
let last = -Infinity;
let yaw = PORTRAIT_REST_YAW, pitch = 0, targetYaw = PORTRAIT_REST_YAW, targetPitch = 0;
canvas.onpointermove = event => {
  const rect = canvas.getBoundingClientRect();
  targetYaw = T.MathUtils.clamp(((event.clientX - rect.left) / rect.width - .5) * .84, PORTRAIT_LEFT_TRACK_LIMIT, .42);
  targetPitch = (.5 - (event.clientY - rect.top) / rect.height) * .30;
};
canvas.onpointerleave = () => { targetYaw = PORTRAIT_REST_YAW; targetPitch = 0; };
function draw(now) {
  requestAnimationFrame(draw);
  if (document.hidden || now - last < 1000 / 15) return;
  if (window.paintedAvatarReady && Math.abs(yaw - targetYaw) < .002 && Math.abs(pitch - targetPitch) < .002) return;
  yaw += (targetYaw - yaw) * .35;
  pitch += (targetPitch - pitch) * .35;
  painting.pose(yaw, pitch);
  painting.render(renderer);
  renderer.render(scene, camera);
  last = now;
  window.paintedAvatarReady = true;
}
requestAnimationFrame(draw);
document.querySelector('[role=status]').textContent = '공연장에서는 플레이어를 바라봅니다 · 미리보기에서는 그림 위에서 포인터를 움직여 보세요';
addEventListener('pagehide', () => { painting.dispose(); renderer.dispose(); }, { once: true });
