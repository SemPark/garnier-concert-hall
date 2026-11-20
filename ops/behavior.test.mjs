import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBehavior} from './behavior.mjs';

const range = {startDate: '2026-11-20', endDate: '2026-11-20', includesToday: true};
const header = (apiNames) => apiNames.map(apiName => ({apiName: 'customEvent:' + apiName}));
const metadata = {
  dimensions: header(['hall', 'floor', 'area', 'seat_id', 'seat_action', 'feature', 'feature_action', 'playback_state', 'from_zone', 'to_zone']),
  metrics: header(['dwell_seconds', 'action_count', 'listening_seconds']),
};

function report(request, rows, metadata) {
  const values = values => values.map(value => ({value: String(value)}));
  return {
    dimensionHeaders: request.dimensions, metricHeaders: request.metrics, metadata,
    rows: rows.map(([dimensions, metrics]) => ({dimensionValues: values(dimensions), metricValues: values(metrics)})),
    rowCount: rows.length,
  };
}

test('production event totals remain available without the custom definitions', async () => {
  const requests = [];
  const output = await loadBehavior(async (method, request) => {
    requests.push({method, request});
    return report(request, method === 'runRealtimeReport' ? [[['pleee_seat'], [2]]] : [[['page_view'], [18]]]);
  }, () => ({dimensions: [], metrics: []}), range);
  assert.equal(output.status, 'partial');
  assert.deepEqual(output.events, {page_view: 18});
  assert.deepEqual(output.realtimeEvents, {pleee_seat: 2});
  assert.equal(output.includesUnlabeledQa, true);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].request.dateRanges, [{startDate: '2026-11-20', endDate: '2026-11-20'}]);
  assert.ok(Object.values(output.reports).every(entry => entry.status === 'unconfigured' && !entry.rows.length));
});

test('retains metric sums and omits rows without GA4 classifications', async () => {
  const rows = {
    pleee_area_dwell: [[['2', 'rear'], [2, 120]], [['(not set)', '(not set)'], [1, 0]]],
    pleee_seat: [[['P-001', 'selected'], [2, 7]]],
    pleee_feature: [[['classical', 'tarot', 'completed'], [1, 3]]],
    pleee_hall: [[['jazz'], [2]]],
    pleee_zone_flow: [[['classical', '1_lobby', '2_rear'], [1, 4]], [['classical', '2_front', '2_front'], [1, 2]]],
    pleee_last_zone: [[['classical', '2', 'front'], [3]]],
    pleee_listening: [[['jazz', 'not_playing'], [1, 0]]],
  };
  const output = await loadBehavior(async (method, request) => {
    if (method === 'runRealtimeReport') assert.fail('historical queries cannot include live GA4 counts');
    const filter = request.dimensionFilter.filter.inListFilter.values;
    return report(request, filter.length === 1 ? rows[filter[0]] : []);
  }, () => metadata, {...range, startDate: '2026-11-21', endDate: '2026-11-21', includesToday: false});
  assert.equal(output.includesUnlabeledQa, false);
  assert.deepEqual(output.reports.dwell.rows, [{floor: 2, area: 'rear', count: 2, seconds: 120}]);
  assert.equal(output.reports.dwell.status, 'partial');
  assert.deepEqual(output.reports.seats.rows, [{seatId: 'P-001', action: 'selected', count: 7}]);
  assert.deepEqual(output.reports.features.rows, [{hall: 'classical', feature: 'tarot', action: 'completed', count: 3}]);
  assert.deepEqual(output.reports.visits.rows, [{hall: 'jazz', count: 2}]);
  assert.deepEqual(output.reports.flows.rows, [{hall: 'classical', fromZone: '1_lobby', toZone: '2_rear', count: 4}]);
  assert.equal(output.reports.flows.status, 'partial');
  assert.deepEqual(output.reports.endings.rows, [{hall: 'classical', zone: '2_front', count: 3}]);
  assert.deepEqual(output.reports.listening.rows, [{hall: 'jazz', state: 'not_playing', seconds: 0, count: 1}]);
});

test('empty and failed queries never turn into a measured zero', async () => {
  const output = await loadBehavior(async (method, request) => {
    if (request.dimensionFilter.filter.inListFilter.values.includes('pleee_seat')) throw Error('unavailable');
    return report(request, []);
  }, () => metadata, range);
  assert.equal(output.reports.seats.status, 'error');
  assert.equal(output.reports.dwell.status, 'pending');
  assert.deepEqual(output.events, {});
});
