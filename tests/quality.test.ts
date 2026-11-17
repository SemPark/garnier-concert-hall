import test from 'node:test';import assert from 'node:assert/strict';
import {renderRatio,frameRate,isIPadDevice,msaaSamples} from '../src/scene/quality';
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

test('detects iPad with both mobile and desktop UAs independently of pointer type',()=>{
 const mac='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.3 Safari/605.1.15';
 assert.equal(isIPadDevice('Mozilla/5.0 (iPad; CPU OS 18_3 like Mac OS X)',5),true);
 assert.equal(isIPadDevice(mac,5),true);
 assert.equal(isIPadDevice(mac,1),false);
 assert.equal(isIPadDevice(mac,0),false);
 assert.equal(isIPadDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)',5),false);
 assert.equal(isIPadDevice('Mozilla/5.0 (Linux; Android 15; Tablet)',10),false);
 assert.equal(isIPadDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)',10),false);
});

test('only iPad sharp uses the FHD envelope without stretching or exceeding DPR',()=>{
 for(const [width,height] of [[1194,834],[834,1194],[1024,768],[1920,1080],[1080,1920]]){
  for(const dpr of [1,2,3]){
   const ipad=renderRatio(width,height,dpr,'sharp',true,true);
   assert.equal(ipad,renderRatio(width,height,dpr,'sharp',false));
   assert.equal(ipad,renderRatio(width,height,dpr,'sharp',false,true));
   assert.ok(Math.max(width,height)*ipad<=1920.001);
   assert.ok(Math.min(width,height)*ipad<=1080.001);
   assert.ok(ipad<=dpr);
   assert.ok(renderRatio(width,height,dpr,'sharp',true)<=ipad);
  }
  for(const quality of ['low','balanced'] as const){
   assert.equal(renderRatio(width,height,2,quality,true,true),renderRatio(width,height,2,quality,true));
   assert.equal(renderRatio(width,height,2,quality,false,true),renderRatio(width,height,2,quality,false));
  }
 }
 const ratio=renderRatio(1194,834,2,'sharp',true,true);
 assert.deepEqual([Math.floor(1194*ratio),Math.floor(834*ratio)],[1546,1080]);
});
