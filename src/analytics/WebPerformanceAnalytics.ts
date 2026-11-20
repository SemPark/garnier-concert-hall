import performanceContract from '../../shared/web-performance.json';
import type {Hall} from './analyticsArea';

const {durationBuckets, durationMeasures, categoryMeasures} = performanceContract;
type DurationMeasure = keyof typeof durationMeasures;
type CategoryMeasure = keyof typeof categoryMeasures;
type Measurement = {name: DurationMeasure | CategoryMeasure; value: number | string};
type Sample = {
  measurement: Measurement['name'];
  component: string;
  action_count: 1;
  duration_ms: number;
};
export type WebPerformanceEvent = {name: 'pleee_visit_measure'; params: {hall: Hall} & Sample};
type WebPerformanceObserver = (record: (sample: Measurement) => void, flush: () => void, active: () => boolean, signal: AbortSignal) => Promise<void>;

function formatSample({name, value}: Measurement): Sample | null {
  if (typeof value === 'number' && Object.hasOwn(durationMeasures, name)) {
    if (!Number.isFinite(value) || value < 0) return null;
    // CLS is unitless. Encode thousandths so the same integer bucket schema can be reused.
    const duration = Math.min(Math.round(value * (name === 'perf_cls' ? 1000 : 1)), durationBuckets.at(-1)!);
    const bucket = durationBuckets.findIndex(bound => duration <= bound);
    return {measurement: name, component: 'b' + bucket, action_count: 1, duration_ms: duration};
  }
  if (typeof value !== 'string' || !Object.hasOwn(categoryMeasures, name)
      || !categoryMeasures[name as CategoryMeasure].includes(value)) return null;
  return {measurement: name, component: value, action_count: 1, duration_ms: 0};
}

function recordNavigation(record: (sample: Measurement) => void) {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!navigation) return;
  function phase(name: DurationMeasure, start: number, end: number) {
    if (Number.isFinite(start) && start >= 0 && end > 0 && end >= start) record({name, value: end - start});
  }
  phase('perf_page_load', navigation.startTime, navigation.loadEventEnd);
  phase('perf_page_render', navigation.responseEnd, navigation.domComplete);
  phase('perf_dns', navigation.domainLookupStart, navigation.domainLookupEnd);
  phase('perf_connection', navigation.connectStart, navigation.connectEnd);
  if (navigation.secureConnectionStart > 0) phase('perf_tls', navigation.secureConnectionStart, navigation.connectEnd);
  if (navigation.redirectCount > 0) phase('perf_redirect', navigation.redirectStart, navigation.redirectEnd);
  phase('perf_request', navigation.requestStart, navigation.responseStart);
  phase('perf_response', navigation.responseStart, navigation.responseEnd);
  phase('perf_load_event', navigation.loadEventStart, navigation.loadEventEnd);
  const firstPaint = performance.getEntriesByName('first-paint', 'paint')[0];
  if (firstPaint) record({name: 'perf_first_paint', value: firstPaint.startTime});
  record({name: 'perf_navigation_type', value: navigation.type});
  const {deliveryType} = navigation as PerformanceNavigationTiming & {deliveryType?: unknown};
  if (typeof deliveryType === 'string') record({name: 'perf_delivery_type', value: deliveryType.replace(/-/g, '_') || 'no_type'});
}

const elementGroups = [
  ['loading', '#boot-screen'],
  ['settings', '.settings-dialog'],
  ['seating', '.ticket-dialog, .ticket-confirm, [data-visit-guide="seat"]'],
  ['music_controls', '.music-controls, .music-list'],
  ['music_panel', '.music-summary, .music-panel'],
  ['program', '.hall-picker, [data-concert-picker]'],
  ['navigation', '.topbar, .actionbar'],
  ['hall', '#world'],
] as const;

function elementGroup(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return elementGroups.find(([, selector]) => element?.closest(selector))?.[0] ?? 'other';
}

const observeWebPerformance: WebPerformanceObserver = async (record, flush, active, signal) => {
  const vitals = await import('web-vitals/attribution');
  if (!active()) return;
  const options = {reportAllChanges: true, generateTarget: elementGroup};
  vitals.onINP(({value, attribution}) => {
    record({name: 'perf_inp', value});
    if (attribution.interactionTarget) record({name: 'perf_component_inp', value: attribution.interactionTarget});
    record({name: 'perf_inp_input', value: attribution.inputDelay});
    record({name: 'perf_inp_processing', value: attribution.processingDuration});
    record({name: 'perf_inp_presentation', value: attribution.presentationDelay});
  }, options);
  vitals.onLCP(({value, attribution}) => {
    record({name: 'perf_lcp', value});
    if (attribution.target) record({name: 'perf_component_lcp', value: attribution.target});
    record({name: 'perf_lcp_resource_delay', value: attribution.resourceLoadDelay});
    record({name: 'perf_lcp_resource_load', value: attribution.resourceLoadDuration});
    record({name: 'perf_lcp_render', value: attribution.elementRenderDelay});
  }, options);
  vitals.onCLS(({value, attribution}) => {
    record({name: 'perf_cls', value});
    if (attribution.largestShiftTarget) record({name: 'perf_component_cls', value: attribution.largestShiftTarget});
  }, options);
  vitals.onFCP(({value}) => record({name: 'perf_fcp', value}), options);
  vitals.onTTFB(({value}) => record({name: 'perf_ttfb', value}));
  function finish() {
    if (!active()) return;
    recordNavigation(record);
    flush();
  }
  // Google finalizes buffered entries in its capture-phase visibility listener. Finalize
  // after that listener, once per page, so tab switching does not duplicate measurements.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') finish();
  }, {signal});
  addEventListener('pagehide', finish, {signal});
  if (document.visibilityState === 'hidden' && !document.prerendering) finish();
};

export class WebPerformanceAnalytics {
  private started = false;
  private lifecycle: AbortController | null = null;
  private readonly samples = new Map<Sample['measurement'], Sample>();

  constructor(
    private readonly hall: Hall,
    private readonly consentAtNavigation: boolean,
    private readonly mayCollect: () => boolean,
    private readonly maySend: () => boolean,
    private readonly send: (event: WebPerformanceEvent) => void,
    private readonly observe: WebPerformanceObserver = observeWebPerformance,
  ) {}

  setAllowed(allowed: boolean) {
    if (!allowed) {
      this.lifecycle?.abort();
      this.lifecycle = null;
      this.samples.clear();
      return;
    }
    // Performance timing is buffered from navigation start, even if observers start later.
    // Consent granted after initial load can only start measuring on the next navigation.
    if (this.started || !this.consentAtNavigation || !this.mayCollect()) return;
    this.started = true;
    const lifecycle = new AbortController();
    this.lifecycle = lifecycle;
    const active = () => !lifecycle.signal.aborted && this.mayCollect();
    void this.observe(
      sample => {
        if (!active()) return;
        const formatted = formatSample(sample);
        if (formatted) this.samples.set(formatted.measurement, formatted);
      },
      () => this.flush(),
      active,
      lifecycle.signal,
    ).catch(() => this.setAllowed(false));
  }

  private flush() {
    if (!this.lifecycle) return;
    const samples = [...this.samples.values()];
    this.setAllowed(false);
    for (const sample of samples) {
      if (!this.mayCollect() || !this.maySend()) return;
      try {
        this.send({name: 'pleee_visit_measure', params: {hall: this.hall, ...sample}});
      } catch {
        // Collection is optional and cannot interfere with the concert.
      }
    }
  }
}
