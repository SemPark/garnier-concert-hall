import { Vector3 } from 'three';
import { validateClip, type MotionClip } from '../../motion/clip';
export interface Landmark { x: number; y: number; z: number; visibility?: number }
export interface CaptureFrame { world: Landmark[]; image: Landmark[] }
const required = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const median = (a: number[]) => a.sort((a, b) => a - b)[Math.floor(a.length / 2)];
const point = (a: Landmark[], i: number) => new Vector3(-a[i].x, -a[i].y, a[i].z);
const valid = (f: CaptureFrame) => required.every(i => [f.world[i], f.image[i]].every(p =>
  p && [p.x, p.y, p.z].every(Number.isFinite) && (p.visibility ?? 1) >= .5));

/** Camera-facing capture: +y up, -z front, anatomical left at -x. */
export function bakeMotion(raw: CaptureFrame[], fps: number, id: string, sourceStart = 0, side?: { offset: number; coverage: number }): MotionClip {
  if (raw.length < 3 || raw.length > 1801 || fps < 5 || fps > 30) throw new Error('2~60초 구간을 5~30 FPS로 추출해 주세요.');
  const good = raw.map(valid);
  const missing = good.filter(v => !v).length;
  let gap = 0, longest = 0;
  for (const ok of good) { gap = ok ? 0 : gap + 1; longest = Math.max(longest, gap); }
  if (missing / raw.length > .2 || longest / fps > .5) throw new Error('전신 추적 실패가 많습니다. 한 사람의 전신이 보이는 구간을 선택해 주세요.');
  const first = raw[good.indexOf(true)];
  const leg = median(raw.filter((_, i) => good[i]).map(f =>
    point(f.world, 23).distanceTo(point(f.world, 25)) + point(f.world, 25).distanceTo(point(f.world, 27))));
  const scale = .49 / Math.max(.25, leg);
  const imageHeight = Math.max(.1, Math.abs(first.image[27].y - first.image[23].y));
  const originX = (first.image[23].x + first.image[24].x) / 2;
  const originY = (first.image[23].y + first.image[24].y) / 2;
  const frames: number[][] = raw.map((f, index) => {
    if (!good[index]) return [];
    const p = (i: number) => point(f.world, i);
    const hip = p(23).add(p(24)).multiplyScalar(.5);
    const shoulders = p(11).add(p(12)).multiplyScalar(.5);
    const up = shoulders.clone().sub(hip).normalize();
    const across = p(12).sub(p(11)).normalize();
    const row = [
      clamp(-((f.image[23].x + f.image[24].x) / 2 - originX) / imageHeight * .49, -.12, .12),
      clamp(-((f.image[23].y + f.image[24].y) / 2 - originY) / imageHeight * .49, -.12, .18), 0,
      clamp(Math.atan2(up.z, up.y), -.55, .55),
      clamp(Math.atan2(-across.z, across.x), -1.2, 1.2),
      clamp(-Math.atan2(up.x, up.y), -.5, .5),
      0, 0, clamp(-Math.atan2(p(0).x - shoulders.x, Math.max(.05, p(0).y - shoulders.y)), -.5, .5),
    ];
    // Segment lengths are the existing avatar's lengths; source body proportions never stretch it.
    for (const [s, e, w, side] of [[11, 13, 15, -1], [12, 14, 16, 1]]) {
      const upper = p(e).sub(p(s)).normalize();
      const lower = p(w).sub(p(e)).normalize();
      const hand = upper.clone().multiplyScalar(.216).addScaledVector(lower, .203);
      row.push(hand.x + side * .16, hand.y + .99, hand.z, upper.x, upper.y, upper.z);
    }
    for (const ankle of [27, 28]) {
      const foot = p(ankle).sub(hip).multiplyScalar(scale);
      row.push(clamp(foot.x, -.4, .4) + row[0], foot.y + .55 + row[1], clamp(foot.z, -.3, .3));
    }
    return row;
  });
  // Short occlusions interpolate both sides, including leading/trailing holds.
  for (let i = 0; i < frames.length; i++) if (!good[i]) {
    let a = i - 1, b = i + 1;
    while (a >= 0 && !good[a]) a--;
    while (b < frames.length && !good[b]) b++;
    if (a < 0) frames[i] = frames[b].slice();
    else if (b === frames.length) frames[i] = frames[a].slice();
    else frames[i] = frames[a].map((v, j) => v + (frames[b][j] - v) * (i - a) / (b - a));
  }
  // Zero-phase low-pass avoids a systematic timing lag in video comparison.
  const alpha = 1 - Math.exp(-2 * Math.PI * 5 / fps);
  for (const direction of [1, -1]) {
    for (let n = 1; n < frames.length; n++) {
      const i = direction === 1 ? n : frames.length - 1 - n;
      const previous = frames[i - direction];
      frames[i] = frames[i].map((v, j) => previous[j] + clamp(v - previous[j], -.4, .4) * alpha);
    }
  }
  const floor = median(frames.map(f => Math.min(f[22], f[25])));
  for (const offset of [21, 24]) {
    let anchor: number[] | undefined;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i], prev = frames[Math.max(0, i - 1)];
      f[offset + 1] = Math.max(.06, f[offset + 1] - floor + .06);
      const speed = Math.hypot(f[offset] - prev[offset], f[offset + 2] - prev[offset + 2]) * fps;
      if (f[offset + 1] < .095 && speed < .3) {
        anchor ??= [f[offset], .06, f[offset + 2]];
        f.splice(offset, 3, ...anchor);
      } else anchor = undefined;
    }
  }
  // End at frame zero. Smoothstep makes the closing correction ease in/out.
  const blendFrames = Math.max(1, Math.min(Math.round(fps * .3), Math.floor(frames.length / 4)));
  const end = frames.length - 1;
  for (let i = end - blendFrames; i <= end; i++) {
    const t = (i - end + blendFrames) / blendFrames;
    const w = t * t * (3 - 2 * t);
    frames[i] = frames[i].map((v, j) => v * (1 - w) + frames[0][j] * w);
  }
  const warnings = [side
    ? `측면 관절 반영률 ${side.coverage}%. 가려진 관절은 정면 추정값을 사용합니다.`
    : '정면 영상만 사용했습니다. 깊이는 추정값입니다.',
    '공연장 충돌 영역을 보존하기 위해 수평 이동을 ±12cm로 제한합니다.'];
  if (missing) warnings.push(`${missing}개 프레임의 추적 손실을 보간했습니다.`);
  return validateClip({ version: 1, rig: 'pleee-parts-v1', id, fps,
    duration: end / fps, sourceStart, sideOffset: side?.offset, frames: frames.map(f => f.map(v => Math.round(v * 10000) / 10000)),
    quality: { missing, total: raw.length, warnings } });
}
