import type { CaptureFrame, Landmark } from './retarget';

const hips = [23, 24];
const rigPoints = new Set([0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]);
const torso = [[11, 23], [12, 24]];
const tracked = (p: Landmark | undefined): p is Landmark =>
  !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= .5;

/** Approximate orthogonal projection with one fixed scale for the entire shot. */
export function useSideDepth(front: CaptureFrame[], side: CaptureFrame[], aspect: number, direction: 1 | -1) {
  if (!front.length || side.length !== front.length) throw new Error('정면과 측면의 추출 프레임 수가 다릅니다.');
  const scales: number[] = [];
  for (const [i, frame] of side.entries()) {
    for (const [s, h] of torso) {
      const a = frame.image[s], b = frame.image[h];
      const c = front[i].world[s], d = front[i].world[h];
      if (!tracked(a) || !tracked(b) || !tracked(c) || !tracked(d)) continue;
      const height = Math.abs(a.y - b.y);
      const meters = Math.abs(c.y - d.y);
      if (height > .04 && meters > .1) scales.push(meters / height);
    }
  }
  if (!Number.isFinite(aspect) || aspect <= 0 || scales.length < Math.ceil(front.length / 3)) {
    throw new Error('측면 영상에서 몸통을 충분히 추적하지 못했습니다. 구간과 시간차를 확인해 주세요.');
  }
  scales.sort((a, b) => a - b);
  const scale = scales[Math.floor(scales.length / 2)] * aspect * direction;
  let used = 0, total = 0;
  const frames = front.map((frame, i) => {
    const image = side[i].image;
    // Align the side observation to the front model's hip origin.
    const anchors = hips.filter(h => tracked(image[h]) && Number.isFinite(frame.world[h]?.z));
    const zShift = anchors.length ? anchors.reduce((sum, h) => sum + frame.world[h].z - image[h].x * scale, 0) / anchors.length : 0;
    const world = frame.world.map((p, j) => {
      if (!rigPoints.has(j) || !tracked(p)) return p;
      total++;
      if (!anchors.length || !tracked(image[j])) return p;
      used++;
      return { ...p, z: image[j].x * scale + zShift };
    });
    return { ...frame, world };
  });
  if (!used) throw new Error('정면과 측면에서 동시에 추적된 관절이 없습니다.');
  return { frames, coverage: Math.round(100 * used / total) };
}
