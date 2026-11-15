import test from 'node:test';
import { useSideDepth } from '../src/dev/motion/side-view';
import assert from 'node:assert/strict';
import { bakeMotion, type CaptureFrame } from '../src/dev/motion/retarget';
import { MOTION_STRIDE, sampleClip, validateClip } from '../src/motion/clip';
import { videoURL } from '../src/dev/motion/source';
function pose(): CaptureFrame {
  const world = Array.from({length: 33}, () => ({x: 0, y: 0, z: 0, visibility: 1}));
  const set = (i:number,x:number,y:number,z=0) => { world[i] = {x,y,z,visibility:1}; };
  set(0,0,-.7,-.1);
  for (const [s,e,w,h,k,a,side] of [[11,13,15,23,25,27,1],[12,14,16,24,26,28,-1]]) {
    set(s,side*.2,-.5); set(e,side*.35,-.3); set(w,side*.4,-.1,-.15);
    set(h,side*.12,0); set(k,side*.12,.4); set(a,side*.12,.8);
  }
  return { world, image: world.map(p => ({...p,x:.5+p.x*.5,y:.5+p.y*.5})) };
}
test('retarget is finite, bounded, compact and exactly closes loop', () => {
  const raw = Array.from({length:49},pose);
  const clip = bakeMotion(raw,24,'captain');
  assert.equal(clip.duration,2);
  assert.equal(clip.frames[0].length,MOTION_STRIDE);
  assert.deepEqual(clip.frames[0],clip.frames.at(-1));
  assert.ok(clip.frames.every(f=>f.every(Number.isFinite)));
  assert.ok(clip.frames.every(f=>f[22]>=.06&&f[25]>=.06));
  const a = sampleClip(clip,.7,new Float32Array(MOTION_STRIDE));
  const b = sampleClip(clip,2.7,new Float32Array(MOTION_STRIDE));
  assert.deepEqual(a,b);
  assert.deepEqual(sampleClip(clip,-.1,new Float32Array(MOTION_STRIDE)),sampleClip(clip,1.9,new Float32Array(MOTION_STRIDE)));
});
test('short dropout interpolates, prolonged loss rejects instead of exporting fake motion',()=>{
  const raw=Array.from({length:49},pose); raw[12]={world:[],image:[]};
  assert.equal(bakeMotion(raw,24,'captain').quality.missing,1);
  for(let i=10;i<25;i++)raw[i]={world:[],image:[]};
  assert.throws(()=>bakeMotion(raw,24,'captain'),/전신 추적 실패/);
});
test('bad or oversized runtime data rejected before touching transforms',()=>{
  const clip=bakeMotion(Array.from({length:49},pose),24,'captain');
  assert.throws(()=>validateClip({...clip, duration:Infinity}));
  assert.throws(()=>validateClip({...clip, frames:[[NaN]]}));
  assert.throws(()=>validateClip({...clip, rig:'unknown'}));
});
test('URL supports signed direct URLs, rejects credentials, scripts and video pages',()=>{
  assert.equal(videoURL('https://example.com/video?token=abc'),'https://example.com/video?token=abc');
  for(const url of ['javascript:alert(1)','file:///tmp/a.mp4','https://me:secret@example.com/a','https://www.youtube.com/watch?v=1'])assert.throws(()=>videoURL(url));
});

test('side observations drive depth at video aspect scale, leaving hidden joints on the front estimate', () => {
  const front = Array.from({length: 24}, pose);
  const side = Array.from({length: 24}, pose);
  for (const frame of side) {
    frame.image[23].x = frame.image[24].x = .5;
    frame.image[15].x = .4;
    frame.image[16].visibility = .2;
  }
  const { frames, coverage } = useSideDepth(front, side, 2, 1);
  assert.ok(Math.abs(frames[0].world[15].z - (-.4)) < 1e-9);
  assert.equal(frames[0].world[16].z, front[0].world[16].z);
  assert.equal(front[0].world[15].z, -.15);
  assert.equal(coverage, 92);
  assert.ok(useSideDepth(front, side, 2, -1).frames[0].world[15].z > 0);
  assert.throws(() => useSideDepth(front, side.slice(1), 2, 1));
});
