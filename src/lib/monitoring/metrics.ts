/**
 * Metrics - Custom metrics collection for production monitoring
 * Performance marks, user timing API, and Prometheus-compatible export
 */

// ============================================================================
// Types
// ============================================================================

export type MetricType = "counter" | "gauge" | "histogram" | "summary"

export interface MetricLabels {
  [key: string]: string
}

export interface MetricValue {
  value: number
  timestamp: number
  labels?: MetricLabels
}

export interface MetricDefinition {
  name: string
  type: MetricType
  help: string
  labelNames?: string[]
}

export interface HistogramBucket {
  le: number
  count: number
}

export interface HistogramValue {
  buckets: HistogramBucket[]
  sum: number
  count: number
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_HISTOGRAM_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
]

export const METRIC_PREFIX = "familyload_"

// ============================================================================
// Metric Storage
// ============================================================================

class MetricRegistry {
  private counters: Map<string, Map<string, MetricValue>> = new Map()
  private gauges: Map<string, Map<string, MetricValue>> = new Map()
  private histograms: Map<string, Map<string, HistogramValue>> = new Map()
  private definitions: Map<string, MetricDefinition> = new Map()

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  registerMetric(definition: MetricDefinition): void {
    const fullName = METRIC_PREFIX + definition.name
    this.definitions.set(fullName, { ...definition, name: fullName })

    switch (definition.type) {
      case "counter":
        this.counters.set(fullName, new Map())
        break
      case "gauge":
        this.gauges.set(fullName, new Map())
        break
      case "histogram":
        this.histograms.set(fullName, new Map())
        break
    }
  }

  // --------------------------------------------------------------------------
  // Counter Operations
  // --------------------------------------------------------------------------

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const fullName = METRIC_PREFIX + name
    const counter = this.counters.get(fullName)
    if (!counter) return

    const labelKey = this.labelsToKey(labels)
    const current = counter.get(labelKey)
    const newValue = (current?.value ?? 0) + value

    counter.set(labelKey, {
      value: newValue,
      timestamp: Date.now(),
      labels,
    })
  }

  getCounter(name: string, labels: MetricLabels = {}): number {
    const fullName = METRIC_PREFIX + name
    const counter = this.counters.get(fullName)
    if (!counter) return 0

    const labelKey = this.labelsToKey(labels)
    return counter.get(labelKey)?.value ?? 0
  }

  // --------------------------------------------------------------------------
  // Gauge Operations
  // --------------------------------------------------------------------------

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const fullName = METRIC_PREFIX + name
    const gauge = this.gauges.get(fullName)
    if (!gauge) return

    const labelKey = this.labelsToKey(labels)
    gauge.set(labelKey, {
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  incrementGauge(name: string, labels: MetricLabels = {}, value = 1): void {
    const fullName = METRIC_PREFIX + name
    const gauge = this.gauges.get(fullName)
    if (!gauge) return

    const labelKey = this.labelsToKey(labels)
    const current = gauge.get(labelKey)
    const newValue = (current?.value ?? 0) + value

    gauge.set(labelKey, {
      value: newValue,
      timestamp: Date.now(),
      labels,
    })
  }

  decrementGauge(name: string, labels: MetricLabels = {}, value = 1): void {
    this.incrementGauge(name, labels, -value)
  }

  getGauge(name: string, labels: MetricLabels = {}): number {
    const fullName = METRIC_PREFIX + name
    const gauge = this.gauges.get(fullName)
    if (!gauge) return 0

    const labelKey = this.labelsToKey(labels)
    return gauge.get(labelKey)?.value ?? 0
  }

  // --------------------------------------------------------------------------
  // Histogram Operations
  // --------------------------------------------------------------------------

  observeHistogram(
    name: string,
    value: number,
    labels: MetricLabels = {},
    buckets = DEFAULT_HISTOGRAM_BUCKETS
  ): void {
    const fullName = METRIC_PREFIX + name
    let histogram = this.histograms.get(fullName)
    if (!histogram) {
      histogram = new Map()
      this.histograms.set(fullName, histogram)
    }

    const labelKey = this.labelsToKey(labels)
    let current = histogram.get(labelKey)

    if (!current) {
      current = {
        buckets: buckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      }
    }

    // Update buckets
    for (const bucket of current.buckets) {
      if (value <= bucket.le) {
        bucket.count++
      }
    }

    current.sum += value
    current.count++

    histogram.set(labelKey, current)
  }

  getHistogram(name: string, labels: MetricLabels = {}): HistogramValue | null {
    const fullName = METRIC_PREFIX + name
    const histogram = this.histograms.get(fullName)
    if (!histogram) return null

    const labelKey = this.labelsToKey(labels)
    return histogram.get(labelKey) ?? null
  }

  // --------------------------------------------------------------------------
  // Export Methods
  // --------------------------------------------------------------------------

  toPrometheusFormat(): string {
    const lines: string[] = []

    // Export counters
    for (const [name, values] of this.counters) {
      const def = this.definitions.get(name)
      if (def) {
        lines.push(`# HELP ${name} ${def.help}`)
        lines.push(`# TYPE ${name} counter`)
      }
      for (const [, metric] of values) {
        const labelStr = this.formatLabels(metric.labels ?? {})
        lines.push(`${name}${labelStr} ${metric.value}`)
      }
    }

    // Export gauges
    for (const [name, values] of this.gauges) {
      const def = this.definitions.get(name)
      if (def) {
        lines.push(`# HELP ${name} ${def.help}`)
        lines.push(`# TYPE ${name} gauge`)
      }
      for (const [, metric] of values) {
        const labelStr = this.formatLabels(metric.labels ?? {})
        lines.push(`${name}${labelStr} ${metric.value}`)
      }
    }

    // Export histograms
    for (const [name, values] of this.histograms) {
      const def = this.definitions.get(name)
      if (def) {
        lines.push(`# HELP ${name} ${def.help}`)
        lines.push(`# TYPE ${name} histogram`)
      }
      for (const [labelKey, histogram] of values) {
        const labels = this.keyToLabels(labelKey)
        const labelStr = this.formatLabels(labels)

        // Buckets
        for (const bucket of histogram.buckets) {
          const bucketLabels = { ...labels, le: String(bucket.le) }
          lines.push(`${name}_bucket${this.formatLabels(bucketLabels)} ${bucket.count}`)
        }
        // +Inf bucket
        lines.push(`${name}_bucket${this.formatLabels({ ...labels, le: "+Inf" })} ${histogram.count}`)
        lines.push(`${name}_sum${labelStr} ${histogram.sum}`)
        lines.push(`${name}_count${labelStr} ${histogram.count}`)
      }
    }

    return lines.join("\n")
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [name, values] of this.counters) {
      result[name] = Object.fromEntries(
        Array.from(values.entries()).map(([key, val]) => [key || "default", val.value])
      )
    }

    for (const [name, values] of this.gauges) {
      result[name] = Object.fromEntries(
        Array.from(values.entries()).map(([key, val]) => [key || "default", val.value])
      )
    }

    for (const [name, values] of this.histograms) {
      result[name] = Object.fromEntries(
        Array.from(values.entries()).map(([key, val]) => [key || "default", val])
      )
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
    this.definitions.clear()
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private labelsToKey(labels: MetricLabels): string {
    const sorted = Object.keys(labels).sort()
    return sorted.map((k) => `${k}=${labels[k]}`).join(",")
  }

  private keyToLabels(key: string): MetricLabels {
    if (!key) return {}
    const labels: MetricLabels = {}
    for (const pair of key.split(",")) {
      const [k, v] = pair.split("=")
      if (k && v !== undefined) {
        labels[k] = v
      }
    }
    return labels
  }

  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels)
    if (entries.length === 0) return ""
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(",")}}`
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const metrics = new MetricRegistry()

// ============================================================================
// Pre-defined Metrics
// ============================================================================

// HTTP metrics
metrics.registerMetric({
  name: "http_requests_total",
  type: "counter",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
})

metrics.registerMetric({
  name: "http_request_duration_seconds",
  type: "histogram",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "path"],
})

// Business metrics
metrics.registerMetric({
  name: "tasks_created_total",
  type: "counter",
  help: "Total number of tasks created",
  labelNames: ["household_id"],
})

metrics.registerMetric({
  name: "tasks_completed_total",
  type: "counter",
  help: "Total number of tasks completed",
  labelNames: ["household_id", "user_id"],
})

metrics.registerMetric({
  name: "streak_days",
  type: "gauge",
  help: "Current streak days for users",
  labelNames: ["user_id"],
})

metrics.registerMetric({
  name: "active_users",
  type: "gauge",
  help: "Number of currently active users",
})

metrics.registerMetric({
  name: "households_total",
  type: "gauge",
  help: "Total number of households",
})

// Performance metrics
metrics.registerMetric({
  name: "db_query_duration_seconds",
  type: "histogram",
  help: "Database query latency in seconds",
  labelNames: ["operation", "table"],
})

metrics.registerMetric({
  name: "cache_hits_total",
  type: "counter",
  help: "Total number of cache hits",
  labelNames: ["cache_type"],
})

metrics.registerMetric({
  name: "cache_misses_total",
  type: "counter",
  help: "Total number of cache misses",
  labelNames: ["cache_type"],
})

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track HTTP request metrics
 */
export function trackHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  metrics.incrementCounter("http_requests_total", { method, path, status: String(status) })
  metrics.observeHistogram("http_request_duration_seconds", durationMs / 1000, { method, path })
}

/**
 * Track database query metrics
 */
export function trackDbQuery(operation: string, table: string, durationMs: number): void {
  metrics.observeHistogram("db_query_duration_seconds", durationMs / 1000, { operation, table })
}

/**
 * Track cache hit/miss
 */
export function trackCacheAccess(cacheType: string, hit: boolean): void {
  if (hit) {
    metrics.incrementCounter("cache_hits_total", { cache_type: cacheType })
  } else {
    metrics.incrementCounter("cache_misses_total", { cache_type: cacheType })
  }
}

/**
 * Track task creation
 */
export function trackTaskCreated(householdId: string): void {
  metrics.incrementCounter("tasks_created_total", { household_id: householdId })
}

/**
 * Track task completion
 */
export function trackTaskCompleted(householdId: string, userId: string): void {
  metrics.incrementCounter("tasks_completed_total", { household_id: householdId, user_id: userId })
}

/**
 * Update streak days
 */
export function updateStreakDays(userId: string, days: number): void {
  metrics.setGauge("streak_days", days, { user_id: userId })
}

/**
 * Update active users count
 */
export function updateActiveUsers(count: number): void {
  metrics.setGauge("active_users", count)
}

// ============================================================================
// Performance Timing
// ============================================================================

interface PerformanceMark {
  name: string
  startTime: number
  duration?: number
  metadata?: Record<string, unknown>
}

class PerformanceTracker {
  private marks: Map<string, PerformanceMark> = new Map()
  private measures: PerformanceMark[] = []

  mark(name: string, metadata?: Record<string, unknown>): void {
    this.marks.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    })
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) return 0

    const endTime = endMark
      ? (this.marks.get(endMark)?.startTime ?? performance.now())
      : performance.now()

    const duration = endTime - start.startTime

    this.measures.push({
      name,
      startTime: start.startTime,
      duration,
      metadata: start.metadata,
    })

    return duration
  }

  getMeasures(): PerformanceMark[] {
    return [...this.measures]
  }

  clearMarks(): void {
    this.marks.clear()
  }

  clearMeasures(): void {
    this.measures = []
  }
}

export const performanceTracker = new PerformanceTracker()

// ============================================================================
// Timer Utility
// ============================================================================

export class Timer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  elapsed(): number {
    return performance.now() - this.startTime
  }

  elapsedSeconds(): number {
    return this.elapsed() / 1000
  }

  reset(): void {
    this.startTime = performance.now()
  }
}

/**
 * Create a timer that automatically records to a histogram
 */
export function createHistogramTimer(
  metricName: string,
  labels: MetricLabels = {}
): () => number {
  const timer = new Timer()
  return () => {
    const duration = timer.elapsedSeconds()
    metrics.observeHistogram(metricName, duration, labels)
    return duration
  }
}
