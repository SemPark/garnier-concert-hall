import test from 'node:test';
import assert from 'node:assert/strict';
import {Conducting} from '../src/scene/Conducting';
test('each tap strokes down then returns up and waits; the next tap chooses a new direction',()=>{
 const c=new Conducting();c.start(1000);c.tick(1100);assert.equal(c.stroking,false);
 c.beat(-1,1200);c.tick(1360);assert.equal(c.x,-1);assert.ok(c.stroke>.99);
 c.tick(2800);assert.equal(c.stroke,0);assert.equal(c.stroking,false);
 c.beat(1,3200);c.tick(3360);assert.equal(c.x,1);assert.ok(c.stroke>.99);
 c.stop();assert.equal(c.active,false);assert.equal(c.stroke,0);
});
test('the camera zoom stays within the conducting view',()=>{
 const c=new Conducting();c.setZoom(5);assert.equal(c.zoom,1);c.setZoom(0);assert.equal(c.zoom,.4);
});

test('the upstroke is deliberately slower than the downstroke',()=>{const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(1160);assert.ok(c.stroke>.99);c.tick(1700);assert.ok(c.stroke>.5&&c.stroke<1);c.tick(2561);assert.equal(c.stroke,0);});

test('a new tap restarts the baton stroke before the previous tap expires',()=>{
 const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(1600);assert.equal(c.stroking,true);c.beat(1,1700);c.tick(2600);assert.equal(c.stroking,true);c.tick(3261);assert.equal(c.stroking,false);assert.equal(c.pulse,0);
});

test('the baton rests when the hand completes its rise',()=>{const c=new Conducting();c.start(0);c.beat(0,1000);c.tick(2550);assert.equal(c.stroking,true);assert.ok(c.stroke>0);c.tick(2560);assert.equal(c.stroking,false);assert.equal(c.stroke,0);});
