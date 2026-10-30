import test from 'node:test';import assert from 'node:assert/strict';
import {playbackAt,type Playlist} from '../shared/timeline';
const list:Playlist={version:'test',epochMs:10000,tracks:[{id:'a',title:'A',composer:'',url:'/a',durationSeconds:10,gapAfterSeconds:2},{id:'b',title:'B',composer:'',url:'/b',durationSeconds:20,gapAfterSeconds:3}]};
test('late arrivals join the current track at the elapsed position',()=>{const p=playbackAt(list,27000);assert.equal(p.track.id,'b');assert.equal(p.offset,5);assert.equal(p.playing,true);});
test('track end enters the gap without playing past its duration',()=>{const p=playbackAt(list,20000);assert.equal(p.playing,false);assert.equal(p.remaining,2);assert.equal(p.offset,10);});
test('the next track begins at the gap boundary',()=>{const p=playbackAt(list,22000);assert.equal(p.track.id,'b');assert.equal(p.offset,0);});
test('the entire playlist loops at its exact boundary',()=>{const p=playbackAt(list,45000);assert.equal(p.track.id,'a');assert.equal(p.offset,0);assert.equal(p.cycle,1);});
test('a future epoch waits rather than playing the last track',()=>{const p=playbackAt(list,7000);assert.equal(p.playing,false);assert.equal(p.remaining,3);});
test('invalid media durations and clocks are rejected',()=>{assert.throws(()=>playbackAt({...list,tracks:[]},10000));assert.throws(()=>playbackAt(list,NaN));assert.throws(()=>playbackAt({...list,tracks:[{...list.tracks[0],durationSeconds:0}]},10000));});
