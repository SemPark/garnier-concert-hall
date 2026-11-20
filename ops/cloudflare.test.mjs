import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchCloudflare, getRange } from './cloudflare.mjs';

const snapshot = {
  startDate: '2026-11-17',
  endDate: '2026-11-18',
  now: new Date('2026-11-18T02:30:00Z'),
};
const env = {
  CF_API_TOKEN: 'fixture-token',
  CF_ZONE_ID: 'fixture-zone',
  CF_ACCOUNT_ID: 'fixture-account',
  CF_WORKER_NAME: 'pleee',
  CF_RUM_SITE_TAG: 'fixture-site',
  CF_HOSTNAME: 'pleee.hall-live.workers.dev',
};
const datetimeHour = '2026-11-17T15:00:00Z';
const data = (scope, result) => Response.json({ data: { viewer: { [scope]: [result] } }, errors: null });

test('reads each Cloudflare source through the refresh time and aggregates daily metrics', async () => {
  const requested = new Set();
  const result = await fetchCloudflare(snapshot, env, async (url, options) => {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
    assert.equal(options.headers.authorization, 'Bearer fixture-token');
    assert.equal(options.cache, 'no-store');
    const { query, variables } = JSON.parse(options.body);
    assert.equal(variables.start, '2026-11-16T15:00:00.000Z');
    assert.equal(variables.end, '2026-11-18T02:30:00.000Z');
    const operation = query.split(/\W+/)[1];
    requested.add(operation);
    if (operation === 'ZoneMetrics') {
      assert.equal(variables.id, env.CF_ZONE_ID);
      assert.equal(variables.host, env.CF_HOSTNAME);
      return data('zones', {
        trend: [{ dimensions: { datetimeHour }, count: 50, sum: { edgeResponseBytes: 2000 } }],
        clientErrors: [{ dimensions: { datetimeHour }, count: 2 }],
        serverErrors: [{ dimensions: { datetimeHour }, count: 1 }],
      });
    }
    if (operation === 'WorkerMetrics') {
      assert.equal(variables.scriptName, 'pleee');
      return data('accounts', {
        total: [{ sum: { requests: 20, errors: 1, subrequests: 6 }, quantiles: { cpuTimeP50: 124, cpuTimeP99: 1120 } }],
        trend: [
          { dimensions: { datetimeHour: '2026-11-17T14:00:00Z' }, sum: { requests: 17, errors: 1, subrequests: 6 } },
          { dimensions: { datetimeHour }, sum: { requests: 3, errors: 0, subrequests: 0 } },
        ],
      });
    }
    if (operation === 'WorkerDetails') {
      assert.equal(variables.scriptName, 'pleee');
      return data('accounts', {
        total: [{ sum: { clientDisconnects: 1, responseBodySize: 950 },
          quantiles: { requestDurationP50: 1000, requestDurationP95: 2000, requestDurationP99: 3000, wallTimeP95: 1500, memoryUsageBytesP95: 2048 } }],
        httpStatus: [{ dimensions: { httpResponseStatus: 200 }, sum: { requests: 19 } }],
        status: [], eventTypes: [], cacheStatus: [], locations: [],
      });
    }
    assert.equal(variables.siteTag, env.CF_RUM_SITE_TAG);
    assert.match(query, /bot: 0/);
    if (operation === 'WebAnalytics') {
      return data('accounts', {
        trend: [{ dimensions: { datetimeHour }, count: 30, sum: { visits: 22 } }],
      });
    }
    if (operation === 'WebRankings') {
      return data('accounts', {
        pages: [{ dimensions: { requestPath: '/' }, count: 30 }],
        referrers: [
          { dimensions: { refererHost: 'example.org' }, sum: { visits: 6 } },
          { dimensions: { refererHost: '' }, sum: { visits: 16 } },
          { dimensions: { refererHost: 'internal.example' }, sum: { visits: 0 } },
        ],
      });
    }
    const grouped = {
      WebAudience: ['countries', 'devices', 'browsers', 'operatingSystems', 'browserVersions', 'osVersions'],
      WebAcquisition: ['entryPages', 'referrerPaths', 'hours', 'navigationTypes', 'deliveryTypes'],
      WebPerformance: ['devices', 'browsers', 'pages', 'countries', 'operatingSystems'],
      WebSlowElements: ['slowContent', 'slowInteractions', 'layoutShifts'],
    };
    if (grouped[operation]) {
      const dimensions = Object.fromEntries(grouped[operation].map(key => [key, []]));
      if (operation === 'WebAcquisition') {
        dimensions.referrerPaths = [{ dimensions: { refererHost: 'example.org', refererPath: '/post' }, sum: { visits: 6 } }];
        dimensions.hours = [{ dimensions: { datetimeHour: '2026-11-18T02:00:00Z' }, count: 7 }];
      }
      return data('accounts', dimensions);
    }
    if (operation === 'WebQuality') {
      return data('accounts', { quality: [{ sum: { lcpGood: 2, lcpNeedsImprovement: 1, lcpPoor: 0, lcpTotal: 3 } }] });
    }
    if (operation === 'WebTimings') {
      return data('accounts', { timings: [{ quantiles: { pageLoadTimeP75: 2400000, redirectTimeP75: -1 } }] });
    }
    assert.equal(operation, 'WebVitals');
    return data('accounts', {
      vitals: [{ quantiles: { largestContentfulPaintP75: 1625000, interactionToNextPaintP75: -1, cumulativeLayoutShiftP75: 0.08 } }],
    });
  });

  assert.deepEqual(requested, new Set(['ZoneMetrics', 'WorkerMetrics', 'WorkerDetails', 'WebAnalytics', 'WebVitals', 'WebQuality',
    'WebTimings', 'WebRankings', 'WebAudience', 'WebAcquisition', 'WebPerformance', 'WebSlowElements']));
  assert.deepEqual(result.http.summary, { requests: 50, bytes: 2000, clientErrors: 2, serverErrors: 1, errorRate: 0.02 });
  assert.deepEqual(result.worker.summary, { requests: 20, errors: 1, subrequests: 6, errorRate: 0.05, cpuP50Ms: 0.124, cpuP99Ms: 1.12,
    clientDisconnects: 1, responseBytes: 950, requestP50Ms: 1, requestP95Ms: 2, requestP99Ms: 3, wallP95Ms: 1.5, memoryP95Bytes: 2048 });
  assert.deepEqual(result.worker.breakdowns.httpStatus, [{ name: '200', value: 19 }]);
  assert.deepEqual(result.worker.daily.map(row => row.requests), [17, 3]);
  assert.deepEqual(result.rum.daily.map(row => row.pageViews), [0, 30]);
  assert.deepEqual(result.http.daily.map(row => row.requests), [0, 50]);
  const { pageViews, visits, lcpP75Ms, inpP75Ms, clsP75, quality } = result.rum.summary;
  assert.deepEqual({ pageViews, visits, lcpP75Ms, inpP75Ms, clsP75 }, { pageViews: 30, visits: 22, lcpP75Ms: 1625, inpP75Ms: null, clsP75: 0.08 });
  assert.deepEqual(quality.lcp, { good: 2, needsImprovement: 1, poor: 0, total: 3 });
  assert.deepEqual(result.rum.topPages, [{ name: '/', value: 30 }]);
  assert.deepEqual(result.rum.referrers, [{ name: 'example.org', value: 6 }, { name: '유입 주소 없음', value: 16 }]);
  assert.deepEqual(result.rum.breakdowns.referrerPaths, [{ name: 'example.org/post', value: 6 }]);
  assert.deepEqual(result.rum.breakdowns.hours, [{ name: '2026-11-18T02:00:00.000Z', value: 7 }]);
  assert.equal(result.rum.timings.pageLoadP75Ms, 2400);
  assert.equal(result.rum.timings.redirectP75Ms, null);
  for (const section of Object.values(result)) {
    assert.equal(section.status, 'ok');
    assert.ok(Date.parse(section.fetchedAt));
    assert.deepEqual(section.daily.map(row => row.date), ['2026-11-17', '2026-11-18']);
  }
});

test('isolates API errors and keeps available data when vitals fail', async () => {
  const result = await fetchCloudflare(snapshot, { ...env, CF_ZONE_ID: '' }, async (url, options) => {
    const { query } = JSON.parse(options.body);
    if (query.startsWith('query WebAnalytics')) return data('accounts', { trend: [] });
    return Response.json({ errors: [{ message: 'not authorized fixture-token' }] });
  });
  assert.equal(result.http.status, 'unconfigured');
  assert.equal(result.worker.status, 'error');
  assert.doesNotMatch(result.worker.message, /fixture-token/);
  assert.equal(result.rum.status, 'partial');
  assert.equal(result.rum.summary.pageViews, 0);
  assert.equal(result.rum.summary.lcpP75Ms, null);
  assert.equal(result.rum.topPages, null);
  assert.match(result.rum.message, /Core Web Vitals/);
});

test('selected calendar dates roll over at Seoul midnight across year boundaries', () => {
  assert.deepEqual(getRange(7, new Date('2026-12-31T15:00:00Z')), {
    days: 7, startDate: '2026-12-26', endDate: '2027-01-01', timeZone: 'Asia/Seoul',
  });
  assert.equal(getRange(1, new Date('2026-12-31T14:59:59Z')).endDate, '2026-12-31');
});
