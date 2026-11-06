import test from 'node:test';
import assert from 'node:assert/strict';
import {Conducting} from '../src/scene/Conducting';
test('each tap strokes down then returns up and waits; the next tap chooses a new direction',()=>{
 const c=new Conducting();c.start(1000);c.tick(1100,.1);assert.equal(c.speed,0);
 c.beat(-1,1200);c.tick(1360,.1);assert.equal(c.x,-1);assert.ok(c.stroke>.99);assert.ok(c.clock>0);
 c.tick(2800,.1);assert.equal(c.stroke,0);assert.equal(c.speed,0);const clock=c.clock;
 c.beat(1,3200);c.tick(3360,.1);assert.equal(c.x,1);assert.ok(c.stroke>.99);assert.ok(c.clock>clock);
 c.stop();assert.equal(c.active,false);assert.equal(c.stroke,0);
});
test('faster tap intervals drive a faster visual clock without changing audio',()=>{
 const c=new Conducting();c.start(0);c.beat(0,1000);c.beat(0,1800);const slow=c.speed;c.beat(0,2000);assert.ok(c.speed>slow);c.setZoom(5);assert.equal(c.zoom,1);
});

test('the upstroke is deliberately slower than the downstroke',()=>{const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(1160,.1);assert.ok(c.stroke>.99);c.tick(1700,.1);assert.ok(c.stroke>.5&&c.stroke<1);c.tick(2561,.1);assert.equal(c.stroke,0);});

test('players keep moving between taps and stop only after the tap timeout',()=>{
 const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(1600,.1);assert.equal(c.playing,true);c.beat(1,1700);c.tick(2600,.1);assert.equal(c.playing,true);c.tick(3261,.1);assert.equal(c.playing,false);assert.equal(c.pulse,0);
});

test('players stop exactly when the hand completes its rise',()=>{const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(2550,.1);assert.equal(c.playing,true);assert.ok(c.stroke>0);c.tick(2560,.1);assert.equal(c.playing,false);assert.equal(c.stroke,0);});
