import classicalCarol from '../../content/playlist.json';
import classicalAutumn from '../../content/playlist-autumn.json';
import classicalFantasy from '../../content/playlist-fantasy.json';
import classicalAfternoon from '../../content/playlist-afternoon.json';
import classicalHaetsal from '../../content/playlist-haetsal.json';
import jazzCarol from '../../content/playlist-jazz.json';
import jazzWarmth from '../../content/playlist-jazz-warmth.json';
import jazzNightscape from '../../content/playlist-jazz-nightscape.json';
import jazzYeoun from '../../content/playlist-jazz-yeoun.json';
import {PlaybackTracker, type PlaybackSample} from './PlaybackTracker';
import type {Hall} from './analyticsArea';

// Only IDs shipped in the public programs can become report dimensions.
const catalogs = {
  'classical-carol': classicalCarol,
  'classical-autumn': classicalAutumn,
  'classical-fantasy': classicalFantasy,
  'classical-afternoon': classicalAfternoon,
  'classical-haetsal': classicalHaetsal,
  'jazz-carol': jazzCarol,
  'jazz-warmth': jazzWarmth,
  'jazz-nightscape': jazzNightscape,
  'jazz-yeoun': jazzYeoun,
};
const tracksByPlaylist = new Map(Object.entries(catalogs).map(([playlist, {tracks}]) => [
  playlist, new Set(tracks.filter(track => !('stage' in track) || !track.stage).map(track => track.id)),
]));
const tracks = new Set([...tracksByPlaylist.values()].flatMap(ids => [...ids]));
const playlists = new Set(tracksByPlaylist.keys());
const milestones = [
  [30_000, '30s'],
  [60_000, '60s'],
  [180_000, '180s'],
  [300_000, '300s'],
  [600_000, '600s'],
  [1_800_000, '1800s'],
  [3_600_000, '3600s'],
] as const;
const all = new Set(['all']);
const features = new Set(['music_panel', 'seat_map', 'playlist', 'tarot', 'queen_cards']);
const components = {
  playback_attempt: all,
  playback_started: all,
  playback_failure: all,
  playback_start_latency: all,
  media_wait: all,
  song_listen: tracks,
  song_finished: tracks,
  song_selected: tracks,
  playlist_select: playlists,
  playlist_listen: playlists,
  listening_milestone: new Set<string>(milestones.map(([, key]) => key)),
  first_visit_stage: new Set(['guide_open', 'greet', 'seat', 'meal', 'space', 'complete']),
  feature_exposure: features,
  feature_cancel: new Set(['tarot', 'queen_cards']),
  co_audience: new Set(['0', '1', '2-4', '5+']),
  action_result: new Set(['seat_confirmed', 'seat_denied', 'tarot_completed', 'queen_cards_completed']),
};

export type ResearchMeasurement = keyof typeof components;
type Aggregate = {measurement: ResearchMeasurement; component: string; action_count: number; duration_ms: number};
type PlaybackAttempt = {generation: number; startedAt: number; settled: boolean};
type Observation = {
  generation: number;
  counts: Map<string, Aggregate>;
  listening: PlaybackTracker;
  track: string | null;
  waitingSince: number | null;
};
export type ResearchEvent = {name: 'pleee_visit_measure'; params: {hall: Hall} & Aggregate};

export class ResearchAnalytics {
  private observation: Observation | null = null;
  private generation = 0;

  constructor(
    private readonly hall: Hall,
    private readonly available: () => boolean,
    private readonly send: (event: ResearchEvent) => void,
  ) {}

  setAllowed(allowed: boolean) {
    if (!allowed) {
      this.observation = null;
      return;
    }
    this.observation ??= {
      generation: ++this.generation,
      counts: new Map(),
      listening: new PlaybackTracker(() => {}, true),
      track: null,
      waitingSince: null,
    };
  }

  private current() {
    const visit = this.observation;
    if (!visit || this.available()) return visit;
    visit.listening.resetSample();
    visit.waitingSince = null;
    return null;
  }

  get measuring() {
    return this.current() !== null;
  }

  count(measurement: ResearchMeasurement, component: string) {
    const visit = this.current();
    if (visit) this.add(visit, measurement, component, 0, false);
  }

  once(measurement: ResearchMeasurement, component: string) {
    const visit = this.current();
    if (visit) this.add(visit, measurement, component, 0, true);
  }

  private add(visit: Observation, measurement: ResearchMeasurement, component: string, ms: number, once: boolean) {
    if (!Object.hasOwn(components, measurement) || !components[measurement].has(component)) return;
    const key = measurement + ':' + component;
    const aggregate = visit.counts.get(key) ?? {measurement, component, action_count: 0, duration_ms: 0};
    if (!once || aggregate.action_count === 0) aggregate.action_count++;
    aggregate.duration_ms += ms;
    visit.counts.set(key, aggregate);
  }

  beginPlayback(nowMs: number): PlaybackAttempt | undefined {
    const visit = this.current();
    if (!visit || !Number.isFinite(nowMs)) return;
    this.add(visit, 'playback_attempt', 'all', 0, false);
    return {generation: visit.generation, startedAt: nowMs, settled: false};
  }

  finishPlayback(attempt: PlaybackAttempt | undefined, started: boolean, nowMs: number) {
    const visit = this.current();
    if (!visit || !attempt || attempt.settled || visit.generation !== attempt.generation) return;
    attempt.settled = true;
    this.add(visit, started ? 'playback_started' : 'playback_failure', 'all', 0, false);
    if (started && Number.isFinite(nowMs) && nowMs >= attempt.startedAt) {
      this.add(visit, 'playback_start_latency', 'all', Math.round(nowMs - attempt.startedAt), false);
    }
  }

  beginWait(nowMs: number) {
    const visit = this.current();
    if (visit && Number.isFinite(nowMs)) visit.waitingSince ??= nowMs;
  }

  finishWait(nowMs: number) {
    const visit = this.current();
    if (visit) this.closeWait(visit, nowMs);
  }

  private closeWait(visit: Observation, nowMs: number) {
    const start = visit.waitingSince;
    visit.waitingSince = null;
    if (start !== null && Number.isFinite(nowMs) && nowMs >= start) {
      this.add(visit, 'media_wait', 'all', Math.round(nowMs - start), false);
    }
  }

  resetPlayback() {
    this.observation?.listening.resetSample();
  }

  samplePlayback(playlist: string, track: string, sample: PlaybackSample) {
    const visit = this.current();
    if (!visit) return;
    if (!tracksByPlaylist.get(playlist)?.has(track)) {
      visit.listening.resetSample();
      return;
    }
    const key = playlist + ':' + track;
    if (visit.track !== key) {
      visit.track = key;
      visit.listening.resetSample();
    }
    const before = visit.listening.measuredMs;
    visit.listening.sample(sample);
    const after = visit.listening.measuredMs;
    if (after <= before) return;
    this.add(visit, 'song_listen', track, after - before, true);
    this.add(visit, 'playlist_listen', playlist, after - before, true);
    for (const [threshold, label] of milestones) {
      if (before < threshold && after >= threshold) this.add(visit, 'listening_milestone', label, 0, true);
    }
  }

  flush(nowMs = performance.now()) {
    const visit = this.current();
    this.observation = null;
    if (!visit) return;
    this.closeWait(visit, nowMs);
    for (const key of [...visit.counts.keys()].sort()) {
      if (!this.available()) return;
      try {
        this.send({name: 'pleee_visit_measure', params: {hall: this.hall, ...visit.counts.get(key)!}});
      } catch {
        // Measurement must never interrupt playback or navigation.
      }
    }
  }
}
