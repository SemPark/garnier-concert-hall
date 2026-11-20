import assert from 'node:assert/strict';
import test from 'node:test';
import program from '../content/playlist-afternoon.json';
import {ResearchAnalytics, type ResearchEvent} from '../src/analytics/ResearchAnalytics';

function harness() {
  const sent: ResearchEvent[] = [];
  let available = true;
  const research = new ResearchAnalytics('classical', () => available, event => sent.push(event));
  return {research, sent, setAvailable: (next: boolean) => { available = next; }};
}

const events = (sent: ResearchEvent[]) => sent.map(({params}) => [
  params.measurement, params.component, params.action_count, params.duration_ms,
]);

test('extra analytics must be allowed and only emits finite public aggregates once per flush', () => {
  const {research, sent, setAvailable} = harness();
  research.count('first_visit_stage', 'guide_open');
  assert.equal(research.beginPlayback(100), undefined);
  research.setAllowed(true);
  setAvailable(false);
  research.once('first_visit_stage', 'guide_open');
  setAvailable(true);
  research.count('song_selected', 'https://host.invalid/private?email=a@example.invalid');
  research.count('playlist_select', 'private_session_identifier');
  research.count('action_result', 'seat_confirmed');
  research.count('action_result', 'seat_confirmed');
  research.once('first_visit_stage', 'seat');
  research.once('first_visit_stage', 'seat');
  research.flush(500);
  research.flush(600);
  assert.deepEqual(events(sent), [
    ['action_result', 'seat_confirmed', 2, 0],
    ['first_visit_stage', 'seat', 1, 0],
  ]);
  for (const event of sent) {
    assert.equal(event.name, 'pleee_visit_measure');
    assert.equal(event.params.hall, 'classical');
    assert.deepEqual(Object.keys(event.params).sort(),
      ['action_count', 'component', 'duration_ms', 'hall', 'measurement']);
  }
});

test('tracks real startup outcomes and one interval per buffering episode', () => {
  const {research, sent} = harness();
  research.setAllowed(true);
  const succeeded = research.beginPlayback(10.2);
  research.finishPlayback(succeeded, true, 123.7);
  research.finishPlayback(succeeded, true, 240);
  const rejected = research.beginPlayback(300);
  research.finishPlayback(rejected, false, 510);
  research.beginWait(530);
  research.beginWait(610);
  research.finishWait(930.3);
  research.finishWait(990);
  research.beginWait(1000);
  research.flush(1_200);
  assert.deepEqual(events(sent), [
    ['media_wait', 'all', 2, 600],
    ['playback_attempt', 'all', 2, 0],
    ['playback_failure', 'all', 1, 0],
    ['playback_start_latency', 'all', 1, 114],
    ['playback_started', 'all', 1, 0],
  ]);
});

test('withdrawal discards counts, pending waits, and late results from an earlier consent', () => {
  const {research, sent} = harness();
  research.setAllowed(true);
  const oldAttempt = research.beginPlayback(0);
  research.beginWait(10);
  research.once('co_audience', '2-4');
  research.setAllowed(false);
  research.setAllowed(true);
  research.finishPlayback(oldAttempt, true, 200);
  research.finishWait(250);
  research.once('co_audience', '2-4');
  research.flush(1_000);
  assert.deepEqual(events(sent), [['co_audience', '2-4', 1, 0]]);
});

test('credits audible playback by song and playlist, excludes seeking and muted time, and counts milestones once', () => {
  const {research, sent} = harness();
  const first = program.tracks[0].id;
  const second = program.tracks[1].id;
  const playlist = 'classical-afternoon';
  const sample = (track: string, nowMs: number, positionSeconds: number, audible = true, revision = 1) => {
    research.samplePlayback(playlist, track, {nowMs,positionSeconds,revision,playbackRate:1,audible});
  };
  sample(first, 0, 0);
  sample(first, 5_000, 5);
  research.setAllowed(true);
  sample(first, 6_000, 6);
  sample(first, 21_000, 21);
  sample(first, 22_000, 90);
  sample(first, 23_000, 91, false);
  sample(first, 24_000, 92);
  sample(first, 34_000, 102);
  research.resetPlayback();
  sample(first, 35_000, 103);
  sample(first, 40_000, 108);
  sample(second, 41_000, 0, true, 2);
  sample(second, 71_000, 30, true, 2);
  research.count('song_selected', second);
  research.count('song_finished', first);
  research.count('playlist_select', playlist);
  research.flush(72_000);
  assert.deepEqual(events(sent), [
    ['listening_milestone', '30s', 1, 0],
    ['listening_milestone', '60s', 1, 0],
    ['playlist_listen', playlist, 1, 60_000],
    ['playlist_select', playlist, 1, 0],
    ['song_finished', first, 1, 0],
    ...[first, second].sort().map(track => ['song_listen', track, 1, 30_000]),
    ['song_selected', second, 1, 0],
  ]);
});

test('long listening milestones use the same accumulating audible clock', () => {
  const {research, sent} = harness();
  const playlist = 'classical-afternoon';
  const id = program.tracks[0].id;
  research.setAllowed(true);
  research.samplePlayback(playlist, id, {nowMs:0,positionSeconds:0,revision:1,playbackRate:1,audible:true});
  research.samplePlayback(playlist, id, {nowMs:3_600_000,positionSeconds:3_600,revision:1,playbackRate:1,audible:true});
  research.flush(3_600_000);
  const milestones = events(sent).filter(row => row[0] === 'listening_milestone');
  assert.deepEqual(milestones.map(row => row[1]),
    ['1800s', '180s', '300s', '30s', '3600s', '600s', '60s']);
  assert.ok(milestones.every(row => row[2] === 1));
});
