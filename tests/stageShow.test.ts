import test from 'node:test';import assert from 'node:assert/strict';
import {stageShow} from '../src/orchestra/stageShow';
import {CONDUCTOR} from '../src/orchestra/layout';
import type {Playback,Track} from '../shared/timeline';

const track=(stage:Track['stage'],durationSeconds=20):Track=>({id:String(stage),title:'',composer:'',url:'',durationSeconds,gapAfterSeconds:0,stage});
const at=(t:Track,f:number,playing=true):Playback=>({track:t,index:0,offset:t.durationSeconds*f,playing,remaining:0,cycle:0});

test('the concert opens with tuning led by the standing concertmaster while the conductor waits offstage',()=>{
 const murmur=stageShow(at(track('murmur'),.5)),tuning=stageShow(at(track('tuning',24),.5));
 assert.ok(murmur.conductor.x<-16,'conductor is behind the side wall before the concert');assert.equal(murmur.orchestraPlays,false);
 assert.equal(tuning.concertmasterStands,true);assert.equal(tuning.concertmasterPlays,true);assert.ok(tuning.conductor.x<-16);
 assert.equal(stageShow(at(track('tuning',24),.99)).concertmasterStands,false,'the concertmaster sits again before the conductor enters');
});

test('the conductor walks on, bows to the audience, and turns to the orchestra before the music',()=>{
 const t=track('entrance',18),walk=stageShow(at(t,.25)),bow=stageShow(at(t,.7)),ready=stageShow(at(t,1));
 assert.equal(walk.conductor.walking,true);assert.ok(walk.conductor.x>-14.5&&walk.conductor.x<0);
 assert.ok(bow.conductor.bowAge!==null);assert.ok(Math.abs(Math.abs(bow.conductor.yaw)-Math.PI)<.05,'faces the audience to bow');
 assert.ok(Math.abs(ready.conductor.x-CONDUCTOR.x)<1e-6&&Math.abs(ready.conductor.z-CONDUCTOR.z)<1e-6);assert.ok(Math.abs(ready.conductor.yaw)<.05,'back to the orchestra');
 const music=stageShow(at({...track(undefined,200),stage:undefined},.4));assert.equal(music.orchestraPlays,true);assert.equal(music.conductor.bowAge,null);
});

test('applause brings a bow between pieces, and after the encore the conductor leaves the stage',()=>{
 const clap=stageShow(at(track('applause',18),.3));assert.equal(clap.orchestraPlays,false);assert.ok(clap.conductor.bowAge!==null);
 const leaving=stageShow(at(track('farewell',32),.8)),gone=stageShow(at(track('farewell',32),1,false));
 assert.equal(leaving.conductor.walking,true);assert.ok(gone.conductor.x<-16);
});

test('after each piece the hall is quiet: no recorded applause, only a short clap clip for visitors who clap',async()=>{
 const {default:list}=await import('../content/playlist.json',{with:{type:'json'}});const files=(await import('../content/audio-files.json',{with:{type:'json'}})).default as Record<string,number>;
 const tracks=list.tracks as Track[];
 for(let i=0;i<tracks.length;i++)if(!tracks[i].stage){const next=tracks[(i+1)%tracks.length];if(next.stage)assert.match(next.id,/^hall-(quiet|farewell)/,`${tracks[i].id} is followed by quiet hall sound`);}
 assert.ok(!tracks.some(t=>t.id.includes('applause')),'no applause recording in the program');
 assert.ok(files['/audio/hall-clap.mp3']>0,'the clap clip is served for visitor claps');
 const total=tracks.reduce((s,t)=>s+t.durationSeconds+t.gapAfterSeconds,0)/60;assert.ok(total>17&&total<24,`a twenty-minute Christmas concert (${total.toFixed(1)} min)`);
});
