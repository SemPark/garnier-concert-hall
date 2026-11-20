import {deepEqual, equal} from 'node:assert/strict';
import {test} from 'node:test';
import {WebPerformanceAnalytics, type WebPerformanceEvent} from '../src/analytics/WebPerformanceAnalytics';

function harness(consentAtNavigation = true) {
  type Observer = NonNullable<ConstructorParameters<typeof WebPerformanceAnalytics>[4]>;
  type Record = Parameters<Observer>[0];
  let mayCollect = true;
  let maySend = true;
  let observer: {record: Record; flush: () => void; active: () => boolean; signal: AbortSignal} | undefined;
  const sent: WebPerformanceEvent[] = [];
  const analytics = new WebPerformanceAnalytics('classical', consentAtNavigation, () => mayCollect, () => maySend,
    event => sent.push(event), async (record, flush, active, signal) => { observer = {record, flush, active, signal}; });
  return {
    analytics, sent,
    get observer() { return observer; },
    refuseBasic: () => { mayCollect = false; },
    blockSend: () => { maySend = false; },
  };
}

test('late consent waits until navigation and does not install an observer', () => {
  const visit = harness(false);
  visit.analytics.setAllowed(true);
  equal(visit.observer, undefined);
});

test('keeps the last sample per metric and sends only finite bounded numbers or predefined categories', () => {
  const visit = harness();
  visit.analytics.setAllowed(false);
  visit.analytics.setAllowed(true);
  const {record, flush, signal} = visit.observer!;
  record({name: 'perf_inp', value: 99.6});
  record({name: 'perf_inp', value: 200});
  record({name: 'perf_lcp', value: 2_400_000});
  record({name: 'perf_cls', value: 0.1});
  record({name: 'perf_fcp', value: Number.POSITIVE_INFINITY});
  record({name: 'perf_component_inp', value: 'music_panel'});
  record({name: 'perf_component_inp', value: '#visitor-name > span'});
  record({name: 'perf_navigation_type', value: 'reload'});
  flush();
  flush();
  equal(signal.aborted, true);
  deepEqual(visit.sent.map(({name, params}) => [name, params.hall, params.measurement, params.component, params.action_count, params.duration_ms]), [
    ['pleee_visit_measure', 'classical', 'perf_inp', 'b4', 1, 200],
    ['pleee_visit_measure', 'classical', 'perf_lcp', 'b22', 1, 60000],
    ['pleee_visit_measure', 'classical', 'perf_cls', 'b2', 1, 100],
    ['pleee_visit_measure', 'classical', 'perf_component_inp', 'music_panel', 1, 0],
    ['pleee_visit_measure', 'classical', 'perf_navigation_type', 'reload', 1, 0],
  ]);
});

test('discarded samples cannot be resumed on the same page after withdrawal', () => {
  const visit = harness();
  visit.analytics.setAllowed(true);
  const {record, flush, active, signal} = visit.observer!;
  record({name: 'perf_inp', value: 190});
  visit.analytics.setAllowed(false);
  visit.analytics.setAllowed(true);
  equal(active(), false);
  equal(signal.aborted, true);
  record({name: 'perf_inp', value: 200});
  flush();
  deepEqual(visit.sent, []);
});

test('checks current browser consent and Google Analytics readiness again at exit', () => {
  for (const block of [(v: ReturnType<typeof harness>) => v.refuseBasic(), (v: ReturnType<typeof harness>) => v.blockSend()]) {
    const visit = harness();
    visit.analytics.setAllowed(true);
    const {record, flush} = visit.observer!;
    record({name: 'perf_inp', value: 300});
    block(visit);
    flush();
    deepEqual(visit.sent, []);
  }
});
