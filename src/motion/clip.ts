/** Compact, rig-specific offline bake. No inference dependency in the player. */
export const MOTION_STRIDE = 27;
export interface MotionClip {
  version: 1;
  rig: 'pleee-parts-v1';
  id: string;
  fps: number;
  duration: number;
  sourceStart: number;
  sideOffset?: number;
  frames: number[][];
  quality: { missing: number; total: number; warnings: string[] };
}
export function validateClip(value: unknown): MotionClip {
  const c = value as MotionClip;
  if (!c || c.version !== 1 || c.rig !== 'pleee-parts-v1' ||
      typeof c.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(c.id) || !Number.isFinite(c.fps) || c.fps < 5 || c.fps > 60 ||
      !Number.isFinite(c.duration) || c.duration <= 0 || c.duration > 60 ||
      !Number.isFinite(c.sourceStart) || c.sourceStart < 0 ||
      (c.sideOffset !== undefined && (!Number.isFinite(c.sideOffset) || c.sourceStart + c.sideOffset < 0)) ||
      !Array.isArray(c.frames) || c.frames.length < 3 || c.frames.length > 3601 ||
      Math.abs((c.frames.length - 1) / c.fps - c.duration) > .001 ||
      c.frames.some(f => !Array.isArray(f) || f.length !== MOTION_STRIDE || f.some(n => !Number.isFinite(n) || Math.abs(n) > 4))) {
    throw new Error('지원하지 않거나 손상된 PLEEE 모션 JSON입니다.');
  }
  return c;
}
/** Caller owns the output buffer. Sampling is deterministic and allocation-free. */
export function sampleClip(clip: MotionClip, seconds: number, out: Float32Array) {
  const time = ((seconds % clip.duration) + clip.duration) % clip.duration;
  const index = time * clip.fps;
  const a = Math.min(Math.floor(index), clip.frames.length - 2);
  const mix = index - a;
  for (let j = 0; j < MOTION_STRIDE; j++) {
    out[j] = clip.frames[a][j] * (1 - mix) + clip.frames[a + 1][j] * mix;
  }
  return out;
}
