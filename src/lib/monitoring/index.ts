/**
 * Monitoring Module Index
 * Re-exports all monitoring utilities
 */

// Metrics
export {
  metrics,
  trackHttpRequest,
  trackDbQuery,
  trackCacheAccess,
  trackTaskCreated,
  trackTaskCompleted,
  updateStreakDays,
  updateActiveUsers,
  performanceTracker,
  Timer,
  createHistogramTimer,
  DEFAULT_HISTOGRAM_BUCKETS,
  METRIC_PREFIX,
} from "./metrics"

export type {
  MetricType,
  MetricLabels,
  MetricValue,
  MetricDefinition,
  HistogramBucket,
  HistogramValue,
} from "./metrics"

// Tracing
export {
  tracer,
  generateTraceId,
  generateSpanId,
  setCurrentContext,
  getCurrentContext,
  getCurrentTraceId,
  getCurrentSpan,
  withSpan,
  withSpanSync,
  traceRequest,
  traceDbQuery,
  traceExternalCall,
  TRACE_HEADER_NAME,
  SPAN_HEADER_NAME,
  SAMPLED_HEADER_NAME,
  DEFAULT_SAMPLING_RATE,
} from "./tracing"

export type {
  SpanContext,
  SpanAttributes,
  SpanEvent,
  SpanStatus,
  Span,
  TraceOptions,
} from "./tracing"

// Health Checks
export {
  healthChecks,
  createDatabaseCheck,
  createHttpCheck,
  createCacheCheck,
  createDiskSpaceCheck,
  createMemoryCheck,
  livenessCheck,
  readinessCheck,
  formatHealthResponse,
  DEFAULT_TIMEOUT,
  HEALTHY_THRESHOLD_MS,
  DEGRADED_THRESHOLD_MS,
} from "./health-checks"

export type {
  HealthStatus,
  HealthCheckResult,
  OverallHealth,
  HealthCheckFn,
  HealthCheckOptions,
} from "./health-checks"
