import actions from '../shared/hall-analytics-actions.json' with {type: 'json'};

const detailedEvents = ['pleee_hall', 'pleee_area_dwell', 'pleee_seat', 'pleee_feature', 'pleee_listening', 'pleee_zone_flow', 'pleee_last_zone'];
const overviewEvents = ['page_view', 'session_start', 'playback_start', 'playback_180_seconds', ...detailedEvents];
const qaDate = '2026-11-20';
const dimension = name => 'customEvent:' + name;
const metric = dimension;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isFinite(value) && value >= 0;
const enumValue = (choices, value) => choices.includes(value);
const hall = value => enumValue(['classical', 'jazz'], value);
const areaKey = value => /^[12]_(lobby|front|middle|rear)$/.test(value ?? '');

const reports = {
  visits: {
    event: 'pleee_hall', fields: ['hall'],
    row: ([name], [count]) => hall(name) && positive(count) ? {hall: name, count} : null,
  },
  dwell: {
    event: 'pleee_area_dwell', fields: ['floor', 'area'], metric: 'dwell_seconds',
    row: ([floor, area], [count, seconds]) => enumValue(['1', '2'], floor)
      && enumValue(['lobby', 'front', 'middle', 'rear'], area) && positive(count) && nonnegative(seconds)
      ? {floor: Number(floor), area, seconds, count} : null,
  },
  seats: {
    event: 'pleee_seat', fields: ['seat_id', 'seat_action'], metric: 'action_count',
    row: ([seatId, action], [, count]) => /^[a-zA-Z0-9_-]{1,32}$/.test(seatId ?? '')
      && enumValue(['selected', 'seated'], action) && positive(count) ? {seatId, action, count} : null,
  },
  features: {
    event: 'pleee_feature', fields: ['hall', 'feature', 'feature_action'], metric: 'action_count',
    row: ([name, feature, action], [, count]) => hall(name)
      && (Object.hasOwn(actions, feature) || enumValue(['tarot', 'queen_cards'], feature))
      && enumValue(['used', 'completed'], action) && positive(count) ? {hall: name, feature, action, count} : null,
  },
  flows: {
    event: 'pleee_zone_flow', fields: ['hall', 'from_zone', 'to_zone'], metric: 'action_count',
    row: ([name, fromZone, toZone], [, count]) => hall(name) && areaKey(fromZone) && areaKey(toZone)
      && fromZone !== toZone && positive(count) ? {hall: name, fromZone, toZone, count} : null,
  },
  endings: {
    event: 'pleee_last_zone', fields: ['hall', 'floor', 'area'],
    row: ([name, floor, area], [count]) => hall(name) && areaKey(floor + '_' + area) && positive(count)
      ? {hall: name, zone: floor + '_' + area, count} : null,
  },
  listening: {
    event: 'pleee_listening', fields: ['hall', 'playback_state'], metric: 'listening_seconds',
    row: ([name, state], [count, seconds]) => hall(name) && enumValue(['playing', 'not_playing'], state)
      && positive(count) && nonnegative(seconds) ? {hall: name, state, seconds, count} : null,
  },
};

const names = values => values.map(name => ({name}));
const eventFilter = values => ({filter: {fieldName: 'eventName', inListFilter: {values, caseSensitive: true}}});
const partial = metadata => !!(metadata?.subjectToThresholding || metadata?.dataLossFromOtherRow
  || metadata?.samplingMetadatas?.length || metadata?.schemaRestrictionResponse?.activeMetricRestrictions?.length);
const result = (status, rows = [], message) => ({status, rows, ...(message ? {message} : {})});

function checkedRows(report, dimensions, metrics) {
  if (!Array.isArray(report?.rows) && report?.rowCount > 0) throw Error('Missing GA4 rows');
  const rows = report?.rows ?? [];
  if (rows.length && (
    JSON.stringify(report.dimensionHeaders?.map(({name}) => name)) !== JSON.stringify(dimensions)
    || JSON.stringify(report.metricHeaders?.map(({name}) => name)) !== JSON.stringify(metrics)
  )) throw Error('Unexpected GA4 headers');
  return rows.map(row => [
    row.dimensionValues?.map(({value}) => value) ?? [],
    row.metricValues?.map(({value}) => typeof value === 'string' && value.trim() ? Number(value) : NaN) ?? [],
  ]);
}

async function readCounts(api, method, values, range) {
  try {
    const response = await api(method, {
      ...(range ? {dateRanges: [range]} : {}),
      dimensions: names(['eventName']), metrics: names(['eventCount']),
      dimensionFilter: eventFilter(values), limit: String(values.length),
    });
    const counts = {};
    for (const [[event], [count]] of checkedRows(response, ['eventName'], ['eventCount'])) {
      if (values.includes(event) && positive(count)) counts[event] = count;
    }
    return {counts, status: partial(response.metadata) ? 'partial' : Object.keys(counts).length ? 'ok' : 'pending'};
  } catch {
    return {counts: {}, status: 'error'};
  }
}

function reportAvailability(metadata, spec) {
  const dims = new Set(metadata.dimensions?.map(({apiName}) => apiName));
  const metrics = new Set(metadata.metrics?.map(({apiName}) => apiName));
  return spec.fields.every(field => dims.has(dimension(field))) && (!spec.metric || metrics.has(metric(spec.metric)));
}

async function readBreakdown(api, range, spec) {
  const dims = spec.fields.map(dimension);
  const metrics = ['eventCount', ...(spec.metric ? [metric(spec.metric)] : [])];
  try {
    const response = await api('runReport', {
      dateRanges: [range], dimensions: names(dims), metrics: names(metrics), dimensionFilter: eventFilter([spec.event]),
      limit: '1000',
    });
    const all = checkedRows(response, dims, metrics);
    const rows = all.map(([values, counts]) => spec.row(values, counts)).filter(Boolean);
    if (!rows.length) return result(partial(response.metadata) ? 'partial' : 'pending', [],
      all.length ? 'GA4에 이벤트가 있지만 아직 분류할 수 있는 값이 없습니다.' : undefined);
    const limited = partial(response.metadata) || response.rowCount > all.length || rows.length < all.length;
    return result(limited ? 'partial' : 'ok', rows,
      limited ? 'GA4에 표시할 수 있는 분류값만 포함했습니다.' : undefined);
  } catch {
    return result('error', [], 'GA4 상세 분류 보고서를 읽지 못했습니다.');
  }
}

export async function loadBehavior(api, loadMetadata, range) {
  const today = range.includesToday;
  const dateRange = {startDate: range.startDate, endDate: range.endDate};
  const [standard, live, metadata] = await Promise.all([
    readCounts(api, 'runReport', overviewEvents, dateRange),
    today ? readCounts(api, 'runRealtimeReport', detailedEvents) : {counts: {}, status: 'pending'},
    Promise.resolve().then(loadMetadata).catch(() => null),
  ]);
  // Keep this request group below GA4's concurrent-report quota.
  const entries = await Promise.all(Object.entries(reports).map(async ([key, spec]) => {
    if (!metadata) return [key, result('error', [], 'GA4 맞춤 정의를 조회하지 못했습니다.')];
    if (!reportAvailability(metadata, spec)) return [key, result('unconfigured', [],
      '기존 GA4 속성에서 이 이벤트의 맞춤 측정기준·측정항목을 등록해야 합니다.')];
    return [key, await readBreakdown(api, dateRange, spec)];
  }));
  const complete = entries.every(([, report]) => report.status === 'ok');
  const hasClassifiedRows = entries.some(([, report]) => report.rows.length);
  return {
    source: 'ga4', status: complete ? 'ok' : hasClassifiedRows || ['ok', 'partial'].includes(standard.status) || ['ok', 'partial'].includes(live.status)
      ? 'partial' : standard.status === 'error' ? 'error' : 'pending',
    events: standard.counts, eventStatus: standard.status, realtimeEvents: live.counts, realtimeStatus: live.status,
    reports: Object.fromEntries(entries),
    // The two deployment checks used the production stream before this dashboard existed.
    // GA4 did not receive a marker by which to exclude those visits retrospectively.
    includesUnlabeledQa: range.startDate <= qaDate && qaDate <= range.endDate,
  };
}
