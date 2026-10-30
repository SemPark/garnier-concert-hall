import test from 'node:test';import assert from 'node:assert/strict';import {MediaSync} from '../src/audio/MediaSync';
test('a delayed initial seek finishes without repeated requests chasing the wall clock',()=>{
 const sync=new MediaSync();assert.equal(sync.target(0,30,0,1,false,false,false),30);
 sync.buffering();for(let t=100;t<=2000;t+=100)assert.equal(sync.target(t,30+t/1000,30,1,true,false,false),null);
 sync.playing(2000);assert.equal(sync.target(2000,32,30,4,false,false,true),null);
 for(let t=2100;t<12000;t+=100)assert.equal(sync.target(t,30+t/1000,28.5+t/1000,4,false,false,true),null);
});
test('buffering and transient stale clock readings never trigger seek loops',()=>{
 const sync=new MediaSync();assert.equal(sync.target(0,10,10,4,false,false,true),null);sync.playing(0);
 for(const t of [4000,8000,12000]){assert.equal(sync.target(t,10+t/1000,9+t/1000,4,false,false,true),null);sync.buffering();assert.equal(sync.target(t+100,20,15,2,false,false,false),null);sync.playing(t+200);}
});
test('only sustained large drift with available data gets one bounded correction',()=>{
 const sync=new MediaSync();sync.target(0,10,10,4,false,false,true);sync.playing(0);
 assert.equal(sync.target(4000,20,16,4,false,false,true),null);assert.equal(sync.target(7100,23.1,19.1,4,false,false,true),23.1);
 sync.playing(7200);assert.equal(sync.target(11000,30,25,4,false,false,true),null);assert.equal(sync.target(15000,34,29,4,false,false,true),null);
 assert.equal(sync.target(23000,42,37,4,false,false,true),42);
});
test('new entry and playlist cycle request a fresh alignment, but seeking still takes precedence',()=>{
 const sync=new MediaSync();sync.target(0,20,0,1,false,false,false);sync.request();assert.equal(sync.target(300,21,20,1,true,false,false),null);assert.equal(sync.target(1000,22,20,4,false,false,true),22);
 sync.request();assert.equal(sync.target(300000,.5,239,4,false,false,true),.5);
});
