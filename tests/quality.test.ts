import test from 'node:test';import assert from 'node:assert/strict';
import {renderRatio,frameRate,msaaSamples} from '../src/scene/quality';
test('sharp fits FHD in either orientation without stretching',()=>{
 for(const [w,h]of [[390,844],[844,390],[1920,1080],[3840,2160]]){const r=renderRatio(w,h,3,'sharp');assert.ok(Math.max(w,h)*r<=1920.001);assert.ok(Math.min(w,h)*r<=1080.001);assert.ok(r<=3);}
 assert.equal(renderRatio(1920,1080,2,'sharp'),1);assert.equal(renderRatio(3840,2160,2,'sharp'),.5);
});
test('mobile sharp fits 720p and the two lower tiers share resolution with different MSAA',()=>{
 for(const [w,h] of [[390,669],[390,844],[844,390],[1024,768]]){
  const low=renderRatio(w,h,3,'low',true),balanced=renderRatio(w,h,3,'balanced',true),sharp=renderRatio(w,h,3,'sharp',true);
  assert.ok(Math.max(w,h)*sharp<=1280.001);
  assert.ok(Math.min(w,h)*sharp<=720.001);
  assert.ok(Math.max(w,h)*balanced<=1136.001);
  assert.ok(Math.min(w,h)*balanced<=640.001);
  assert.equal(low,balanced);
  assert.ok(balanced<sharp);
 }
 assert.deepEqual(['sharp','balanced','low'].map(quality=>msaaSamples(quality as 'sharp'|'balanced'|'low')),[4,4,2]);
 assert.equal(renderRatio(390,844,1,'sharp',true),1);
});

test('phones cap rendering independently of display refresh rate',()=>{assert.equal(frameRate(true,'balanced'),60);assert.equal(frameRate(true,'low'),60);assert.equal(frameRate(true,'sharp'),60);assert.equal(frameRate(false,'balanced'),30);});
