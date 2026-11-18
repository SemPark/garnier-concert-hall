import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playbackAt,type Playlist} from '../shared/timeline';

const playlist:Playlist=JSON.parse(readFileSync(new URL('../content/playlist-afternoon.json',import.meta.url),'utf8'));
const expected=['mozart-k299-2','haydn-op64-5-2','bach-bwv1043-2','mozart-k465-2','beethoven-op68-2','dvorak-op22-4','dvorak-op96-2','borodin-quartet2-3'];

test('Afternoon preserves the eight approved recordings and their 62:22.410 program',()=>{
 assert.equal(playlist.name,'오후');
 assert.deepEqual(playlist.tracks.map(track=>track.id),expected.map(id=>'afternoon-'+id));
 const total=playlist.tracks.reduce((sum,track)=>sum+track.durationSeconds+track.gapAfterSeconds,0);
 assert.equal(Math.round(total*1000),3742410);
 let elapsed=0;
 for(const track of playlist.tracks){
  assert.equal(track.gapAfterSeconds,0);
  assert.equal(track.stage,undefined);
  assert.equal(playbackAt(playlist,elapsed*1000+.01).track.id,track.id);
  assert.match(track.url,/^\/api\/audio\/afternoon-.+\.(ogg|flac)$/);
  assert.ok(track.gain!==undefined&&track.gain>0&&track.gain<=1);
  assert.ok(track.credit?.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.ok(track.credit?.licenseName&&track.credit.licenseUrl&&track.credit.artist);
  elapsed+=track.durationSeconds;
 }
 assert.equal(playbackAt(playlist,total*1000+.01).track.id,playlist.tracks[0].id);
});

test('Beethoven does not inherit the composer as a guessed recording performer',()=>{
 const track=playlist.tracks[4];
 assert.match(track.credit!.artist!,/미상/);
 assert.match(track.credit!.changes!,/원본 파일 변경 없음/);
});
