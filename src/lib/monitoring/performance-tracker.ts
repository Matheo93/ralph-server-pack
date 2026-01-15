/**
 * Performance Tracker Service
 *
 * Comprehensive performance monitoring:
 * - Response time tracking
 * - Error rate monitoring
 * - Resource utilization
 * - Trend analysis
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type MetricType = "counter" | "gauge" | "histogram" | "summary"
export type TrendDirection = "up" | "down" | "stable"
export type PerformanceLevel = "excellent" | "good" | "acceptable" | "poor" | "critical"

export interface PerformanceMetric {
  name: string
  type: MetricType
  value: number
  unit: string
  timestamp: Date
  labels: Record<string, string>
}

export interface ResponseTimeMetrics {
  endpoint: string
  method: string
  count: number
  sum: number
  avg: number
  min: number
  max: number
  p50: number
  p90: number
  p95: number
  p99: number
  histogram: number[] // buckets
  timestamps: Date[]
}

export interface ErrorMetrics {
  endpoint: string
  method: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  errorRate: number
  errorsByType: Record<string, number>
  lastErrors: ErrorRecord[]
}

export interface ErrorRecord {
  timestamp: Date
  endpoint: string
  method: string
  statusCode: number
  errorType: string
  message: string
  stack?: string
}

export interface ResourceMetrics {
  timestamp: Date
  cpu: CpuMetrics
  memory: MemoryMetrics
  disk: DiskMetrics
  network: NetworkMetrics
}

export interface CpuMetrics {
  usage: number // percentage
  system: number
  user: number
  idle: number
  loadAvg: number[]
}

export interface MemoryMetrics {
  total: number // bytes
  used: number
  free: number
  usagePercent: number
  heapTotal?: number
  heapUsed?: number
  external?: number
}

export interface DiskMetrics {
  total: number
  used: number
  free: number
  usagePercent: number
  readOps: number
  writeOps: number
  readBytes: number
  writeBytes: number
}

export interface NetworkMetrics {
  bytesIn: number
  bytesOut: number
  packetsIn: number
  packetsOut: number
  errorsIn: number
  errorsOut: number
  activeConnections: number
}

export interface PerformanceSnapshot {
  timestamp: Date
  responseTime: ResponseTimeStats
  errors: ErrorStats
  resources: ResourceMetrics
  throughput: ThroughputStats
  saturation: SaturationStats
}

export interface ResponseTimeStats {
  overall: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  byEndpoint: Map<string, ResponseTimeMetrics>
}

export interface ErrorStats {
  overall: {
    rate: number
    total: number
    last5Min: number
  }
  byEndpoint: Map<string, ErrorMetrics>
  byType: Record<string, number>
}

export interface ThroughputStats {
  requestsPerSecond: number
  requestsPerMinute: number
  peakRps: number
  avgRps: number
}

export interface SaturationStats {
  cpuSaturation: number
  memorySaturation: number
  connectionPoolSaturation: number
  queueDepth: number
}

export interface PerformanceTrend {
  metric: string
  direction: TrendDirection
  changePercent: number
  previousValue: number
  currentValue: number
  timeframe: string
  significance: "low" | "medium" | "high"
}

export interface PerformanceReport {
  generatedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
  summary: PerformanceSummary
  responseTime: ResponseTimeReport
  errors: ErrorReport
  resources: ResourceReport
  trends: PerformanceTrend[]
  recommendations: PerformanceRecommendation[]
}

export interface PerformanceSummary {
  level: PerformanceLevel
  score: number // 0-100
  highlights: string[]
  concerns: string[]
}

export interface ResponseTimeReport {
  avgResponseTime: number
  medianResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  slowestEndpoints: Array<{
    endpoint: string
    avgTime: number
  }>
  fastestEndpoints: Array<{
    endpoint: string
    avgTime: number
  }>
}

export interface ErrorReport {
  totalErrors: number
  errorRate: number
  topErrors: Array<{
    type: string
    count: number
    percentage: number
  }>
  errorsByEndpoint: Array<{
    endpoint: string
    errorRate: number
    count: number
  }>
}

export interface ResourceReport {
  avgCpuUsage: number
  peakCpuUsage: number
  avgMemoryUsage: number
  peakMemoryUsage: number
  diskUsage: number
  networkThroughput: number
}

export interface PerformanceRecommendation {
  id: string
  priority: "low" | "medium" | "high" | "critical"
  category: string
  title: string
  description: string
  impact: string
  effort: string
}

export interface HistogramBuckets {
  buckets: number[]
  counts: number[]
  sum: number
  count: number
}

export interface SlidingWindow<T> {
  maxSize: number
  data: T[]
  timestamps: Date[]
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const PerformanceMetricSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["counter", "gauge", "histogram", "summary"]),
  value: z.number(),
  unit: z.string(),
  timestamp: z.date(),
  labels: z.record(z.string(), z.string()),
})

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
export const DEFAULT_WINDOW_SIZE = 1000
export const DEFAULT_RETENTION_PERIOD = 3600000 // 1 hour

export const RESPONSE_TIME_THRESHOLDS = {
  excellent: 100,
  good: 250,
  acceptable: 500,
  poor: 1000,
  critical: 2000,
}

export const ERROR_RATE_THRESHOLDS = {
  excellent: 0.1,
  good: 0.5,
  acceptable: 1,
  poor: 5,
  critical: 10,
}

// =============================================================================
// SLIDING WINDOW
// =============================================================================

/**
 * Create sliding window
 */
export function createSlidingWindow<T>(maxSize: number = DEFAULT_WINDOW_SIZE): SlidingWindow<T> {
  return {
    maxSize,
    data: [],
    timestamps: [],
  }
}

/**
 * Add value to sliding window
 */
export function addToWindow<T>(window: SlidingWindow<T>, value: T): SlidingWindow<T> {
  const newData = [...window.data, value]
  const newTimestamps = [...window.timestamps, new Date()]

  // Trim to max size
  if (newData.length > window.maxSize) {
    return {
      maxSize: window.maxSize,
      data: newData.slice(-window.maxSize),
      timestamps: newTimestamps.slice(-window.maxSize),
    }
  }

  return {
    maxSize: window.maxSize,
    data: newData,
    timestamps: newTimestamps,
  }
}

/**
 * Get recent values from window
 */
export function getRecentFromWindow<T>(
  window: SlidingWindow<T>,
  duration: number
): T[] {
  const cutoff = Date.now() - duration
  const result: T[] = []

  for (let i = 0; i < window.data.length; i++) {
    if (window.timestamps[i]!.getTime() >= cutoff) {
      result.push(window.data[i]!)
    }
  }

  return result
}

/**
 * Clear old data from window
 */
export function pruneWindow<T>(
  window: SlidingWindow<T>,
  maxAge: number
): SlidingWindow<T> {
  const cutoff = Date.now() - maxAge
  const newData: T[] = []
  const newTimestamps: Date[] = []

  for (let i = 0; i < window.data.length; i++) {
    if (window.timestamps[i]!.getTime() >= cutoff) {
      newData.push(window.data[i]!)
      newTimestamps.push(window.timestamps[i]!)
    }
  }

  return {
    maxSize: window.maxSize,
    data: newData,
    timestamps: newTimestamps,
  }
}

// =============================================================================
// HISTOGRAM
// =============================================================================

/**
 * Create histogram buckets
 */
export function createHistogram(buckets: number[] = DEFAULT_HISTOGRAM_BUCKETS): HistogramBuckets {
  return {
    buckets,
    counts: new Array(buckets.length + 1).fill(0),
    sum: 0,
    count: 0,
  }
}

/**
 * Record value in histogram
 */
export function recordInHistogram(histogram: HistogramBuckets, value: number): HistogramBuckets {
  const newCounts = [...histogram.counts]

  // Find bucket
  let bucketIdx = histogram.buckets.length
  for (let i = 0; i < histogram.buckets.length; i++) {
    if (value <= histogram.buckets[i]!) {
      bucketIdx = i
      break
    }
  }

  newCounts[bucketIdx]!++

  return {
    buckets: histogram.buckets,
    counts: newCounts,
    sum: histogram.sum + value,
    count: histogram.count + 1,
  }
}

/**
 * Calculate percentile from histogram
 */
export function getHistogramPercentile(histogram: HistogramBuckets, percentile: number): number {
  if (histogram.count === 0) return 0

  const targetCount = histogram.count * (percentile / 100)
  let cumulative = 0

  for (let i = 0; i < histogram.counts.length; i++) {
    cumulative += histogram.counts[i]!
    if (cumulative >= targetCount) {
      // Return upper bound of bucket
      if (i < histogram.buckets.length) {
        return histogram.buckets[i]!
      }
      // Last bucket (overflow), estimate
      return histogram.buckets[histogram.buckets.length - 1]! * 2
    }
  }

  return histogram.buckets[histogram.buckets.length - 1]! * 2
}

/**
 * Get histogram average
 */
export function getHistogramAverage(histogram: HistogramBuckets): number {
  if (histogram.count === 0) return 0
  return histogram.sum / histogram.count
}

// =============================================================================
// RESPONSE TIME TRACKING
// =============================================================================

/**
 * Create response time metrics
 */
export function createResponseTimeMetrics(
  endpoint: string,
  method: string
): ResponseTimeMetrics {
  return {
    endpoint,
    method,
    count: 0,
    sum: 0,
    avg: 0,
    min: Infinity,
    max: 0,
    p50: 0,
    p90: 0,
    p95: 0,
    p99: 0,
    histogram: new Array(DEFAULT_HISTOGRAM_BUCKETS.length + 1).fill(0),
    timestamps: [],
  }
}

/**
 * Record response time
 */
export function recordResponseTime(
  metrics: ResponseTimeMetrics,
  duration: number
): ResponseTimeMetrics {
  const newCount = metrics.count + 1
  const newSum = metrics.sum + duration
  const newMin = Math.min(metrics.min, duration)
  const newMax = Math.max(metrics.max, duration)
  const newAvg = newSum / newCount

  // Update histogram
  const newHistogram = [...metrics.histogram]
  let bucketIdx = DEFAULT_HISTOGRAM_BUCKETS.length
  for (let i = 0; i < DEFAULT_HISTOGRAM_BUCKETS.length; i++) {
    if (duration <= DEFAULT_HISTOGRAM_BUCKETS[i]!) {
      bucketIdx = i
      break
    }
  }
  newHistogram[bucketIdx]!++

  // Calculate percentiles from histogram
  const histogramObj: HistogramBuckets = {
    buckets: DEFAULT_HISTOGRAM_BUCKETS,
    counts: newHistogram,
    sum: newSum,
    count: newCount,
  }

  return {
    ...metrics,
    count: newCount,
    sum: newSum,
    avg: newAvg,
    min: newMin === Infinity ? duration : newMin,
    max: newMax,
    p50: getHistogramPercentile(histogramObj, 50),
    p90: getHistogramPercentile(histogramObj, 90),
    p95: getHistogramPercentile(histogramObj, 95),
    p99: getHistogramPercentile(histogramObj, 99),
    histogram: newHistogram,
    timestamps: [...metrics.timestamps.slice(-DEFAULT_WINDOW_SIZE + 1), new Date()],
  }
}

/**
 * Merge response time metrics
 */
export function mergeResponseTimeMetrics(
  a: ResponseTimeMetrics,
  b: ResponseTimeMetrics
): ResponseTimeMetrics {
  const mergedHistogram = a.histogram.map((count, i) => count + (b.histogram[i] ?? 0))
  const totalCount = a.count + b.count
  const totalSum = a.sum + b.sum

  const histogramObj: HistogramBuckets = {
    buckets: DEFAULT_HISTOGRAM_BUCKETS,
    counts: mergedHistogram,
    sum: totalSum,
    count: totalCount,
  }

  return {
    endpoint: a.endpoint,
    method: a.method,
    count: totalCount,
    sum: totalSum,
    avg: totalCount > 0 ? totalSum / totalCount : 0,
    min: Math.min(a.min, b.min),
    max: Math.max(a.max, b.max),
    p50: getHistogramPercentile(histogramObj, 50),
    p90: getHistogramPercentile(histogramObj, 90),
    p95: getHistogramPercentile(histogramObj, 95),
    p99: getHistogramPercentile(histogramObj, 99),
    histogram: mergedHistogram,
    timestamps: [...a.timestamps, ...b.timestamps].sort((x, y) => x.getTime() - y.getTime()),
  }
}

/**
 * Get response time level
 */
export function getResponseTimeLevel(avgTime: number): PerformanceLevel {
  if (avgTime <= RESPONSE_TIME_THRESHOLDS.excellent) return "excellent"
  if (avgTime <= RESPONSE_TIME_THRESHOLDS.good) return "good"
  if (avgTime <= RESPONSE_TIME_THRESHOLDS.acceptable) return "acceptable"
  if (avgTime <= RESPONSE_TIME_THRESHOLDS.poor) return "poor"
  return "critical"
}

// =============================================================================
// ERROR RATE TRACKING
// =============================================================================

/**
 * Create error metrics
 */
export function createErrorMetrics(
  endpoint: string,
  method: string
): ErrorMetrics {
  return {
    endpoint,
    method,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    errorRate: 0,
    errorsByType: {},
    lastErrors: [],
  }
}

/**
 * Record successful request
 */
export function recordSuccess(metrics: ErrorMetrics): ErrorMetrics {
  const newTotal = metrics.totalRequests + 1
  const newSuccessful = metrics.successfulRequests + 1

  return {
    ...metrics,
    totalRequests: newTotal,
    successfulRequests: newSuccessful,
    errorRate: calculateErrorRate(newSuccessful, metrics.failedRequests),
  }
}

/**
 * Record failed request
 */
export function recordError(
  metrics: ErrorMetrics,
  error: {
    statusCode: number
    errorType: string
    message: string
    stack?: string
  }
): ErrorMetrics {
  const newTotal = metrics.totalRequests + 1
  const newFailed = metrics.failedRequests + 1

  const errorRecord: ErrorRecord = {
    timestamp: new Date(),
    endpoint: metrics.endpoint,
    method: metrics.method,
    statusCode: error.statusCode,
    errorType: error.errorType,
    message: error.message,
    stack: error.stack,
  }

  const newErrorsByType = { ...metrics.errorsByType }
  newErrorsByType[error.errorType] = (newErrorsByType[error.errorType] ?? 0) + 1

  const newLastErrors = [...metrics.lastErrors.slice(-99), errorRecord]

  return {
    ...metrics,
    totalRequests: newTotal,
    failedRequests: newFailed,
    errorRate: calculateErrorRate(metrics.successfulRequests, newFailed),
    errorsByType: newErrorsByType,
    lastErrors: newLastErrors,
  }
}

/**
 * Calculate error rate
 */
export function calculateErrorRate(successful: number, failed: number): number {
  const total = successful + failed
  if (total === 0) return 0
  return Math.round((failed / total) * 10000) / 100
}

/**
 * Get error rate level
 */
export function getErrorRateLevel(errorRate: number): PerformanceLevel {
  if (errorRate <= ERROR_RATE_THRESHOLDS.excellent) return "excellent"
  if (errorRate <= ERROR_RATE_THRESHOLDS.good) return "good"
  if (errorRate <= ERROR_RATE_THRESHOLDS.acceptable) return "acceptable"
  if (errorRate <= ERROR_RATE_THRESHOLDS.poor) return "poor"
  return "critical"
}

// =============================================================================
// RESOURCE MONITORING
// =============================================================================

/**
 * Create resource metrics
 */
export function createResourceMetrics(): ResourceMetrics {
  return {
    timestamp: new Date(),
    cpu: {
      usage: 0,
      system: 0,
      user: 0,
      idle: 100,
      loadAvg: [0, 0, 0],
    },
    memory: {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0,
    },
    disk: {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0,
      readOps: 0,
      writeOps: 0,
      readBytes: 0,
      writeBytes: 0,
    },
    network: {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      errorsIn: 0,
      errorsOut: 0,
      activeConnections: 0,
    },
  }
}

/**
 * Get process memory usage (Node.js specific)
 */
export function getProcessMemoryUsage(): MemoryMetrics {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage()
    return {
      total: 0, // Not available from process
      used: mem.rss,
      free: 0,
      usagePercent: 0,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    }
  }

  return {
    total: 0,
    used: 0,
    free: 0,
    usagePercent: 0,
  }
}

/**
 * Calculate CPU saturation
 */
export function calculateCpuSaturation(cpuMetrics: CpuMetrics): number {
  return Math.min(cpuMetrics.usage / 100, 1)
}

/**
 * Calculate memory saturation
 */
export function calculateMemorySaturation(memoryMetrics: MemoryMetrics): number {
  if (memoryMetrics.total === 0) return 0
  return memoryMetrics.used / memoryMetrics.total
}

/**
 * Get resource level
 */
export function getResourceLevel(usagePercent: number): PerformanceLevel {
  if (usagePercent <= 40) return "excellent"
  if (usagePercent <= 60) return "good"
  if (usagePercent <= 75) return "acceptable"
  if (usagePercent <= 90) return "poor"
  return "critical"
}

// =============================================================================
// THROUGHPUT
// =============================================================================

/**
 * Calculate throughput stats
 */
export function calculateThroughput(
  requestCounts: number[],
  intervalMs: number
): ThroughputStats {
  if (requestCounts.length === 0) {
    return {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      peakRps: 0,
      avgRps: 0,
    }
  }

  const intervalSeconds = intervalMs / 1000
  const rpsValues = requestCounts.map(count => count / intervalSeconds)

  const sum = rpsValues.reduce((a, b) => a + b, 0)
  const avgRps = sum / rpsValues.length
  const peakRps = Math.max(...rpsValues)
  const currentRps = rpsValues[rpsValues.length - 1] ?? 0

  return {
    requestsPerSecond: currentRps,
    requestsPerMinute: currentRps * 60,
    peakRps,
    avgRps,
  }
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

/**
 * Calculate trend direction
 */
export function calculateTrendDirection(
  values: number[],
  threshold: number = 0.05
): TrendDirection {
  if (values.length < 2) return "stable"

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  if (firstAvg === 0) return "stable"

  const changePercent = (secondAvg - firstAvg) / firstAvg

  if (changePercent > threshold) return "up"
  if (changePercent < -threshold) return "down"
  return "stable"
}

/**
 * Analyze performance trend
 */
export function analyzeTrend(
  metric: string,
  values: number[],
  timeframe: string
): PerformanceTrend | null {
  if (values.length < 2) return null

  const firstValue = values[0]!
  const currentValue = values[values.length - 1]!

  const direction = calculateTrendDirection(values)
  const changePercent = firstValue === 0 ? 0 : ((currentValue - firstValue) / firstValue) * 100

  let significance: "low" | "medium" | "high" = "low"
  if (Math.abs(changePercent) > 50) significance = "high"
  else if (Math.abs(changePercent) > 20) significance = "medium"

  return {
    metric,
    direction,
    changePercent,
    previousValue: firstValue,
    currentValue,
    timeframe,
    significance,
  }
}

/**
 * Identify significant trends
 */
export function identifySignificantTrends(trends: PerformanceTrend[]): PerformanceTrend[] {
  return trends.filter(t => t.significance !== "low" && t.direction !== "stable")
}

// =============================================================================
// PERFORMANCE SCORING
// =============================================================================

/**
 * Calculate overall performance score
 */
export function calculatePerformanceScore(
  responseTime: { avg: number; p95: number },
  errorRate: number,
  resourceUsage: { cpu: number; memory: number }
): { score: number; level: PerformanceLevel } {
  // Response time score (0-30 points)
  let rtScore = 30
  if (responseTime.avg > 100) rtScore -= Math.min((responseTime.avg - 100) / 50, 15)
  if (responseTime.p95 > 500) rtScore -= Math.min((responseTime.p95 - 500) / 100, 15)
  rtScore = Math.max(0, rtScore)

  // Error rate score (0-30 points)
  let errScore = 30
  errScore -= Math.min(errorRate * 3, 30)
  errScore = Math.max(0, errScore)

  // Resource usage score (0-40 points)
  let resScore = 40
  resScore -= Math.min(resourceUsage.cpu / 2.5, 20)
  resScore -= Math.min(resourceUsage.memory / 2.5, 20)
  resScore = Math.max(0, resScore)

  const totalScore = Math.round(rtScore + errScore + resScore)

  let level: PerformanceLevel
  if (totalScore >= 90) level = "excellent"
  else if (totalScore >= 75) level = "good"
  else if (totalScore >= 50) level = "acceptable"
  else if (totalScore >= 25) level = "poor"
  else level = "critical"

  return { score: totalScore, level }
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

/**
 * Generate performance recommendations
 */
export function generateRecommendations(
  snapshot: PerformanceSnapshot
): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = []

  // Response time recommendations
  if (snapshot.responseTime.overall.avg > 500) {
    recommendations.push({
      id: "rt-high-avg",
      priority: snapshot.responseTime.overall.avg > 1000 ? "high" : "medium",
      category: "response-time",
      title: "High Average Response Time",
      description: `Average response time is ${snapshot.responseTime.overall.avg}ms, consider optimizing slow endpoints`,
      impact: "Improved user experience, reduced timeout errors",
      effort: "Medium - requires profiling and optimization",
    })
  }

  if (snapshot.responseTime.overall.p99 > 2000) {
    recommendations.push({
      id: "rt-high-p99",
      priority: "high",
      category: "response-time",
      title: "High P99 Latency",
      description: `P99 latency is ${snapshot.responseTime.overall.p99}ms, some users experiencing very slow responses`,
      impact: "Reduced tail latency, better worst-case user experience",
      effort: "High - may require architectural changes",
    })
  }

  // Error rate recommendations
  if (snapshot.errors.overall.rate > 1) {
    recommendations.push({
      id: "err-high-rate",
      priority: snapshot.errors.overall.rate > 5 ? "critical" : "high",
      category: "reliability",
      title: "High Error Rate",
      description: `Error rate is ${snapshot.errors.overall.rate}%, investigate and fix root causes`,
      impact: "Improved reliability and user trust",
      effort: "Variable - depends on error types",
    })
  }

  // CPU recommendations
  if (snapshot.resources.cpu.usage > 80) {
    recommendations.push({
      id: "cpu-high",
      priority: snapshot.resources.cpu.usage > 90 ? "critical" : "high",
      category: "resources",
      title: "High CPU Usage",
      description: `CPU usage is ${snapshot.resources.cpu.usage}%, consider scaling or optimizing`,
      impact: "Prevents CPU throttling and service degradation",
      effort: "Medium - may require scaling or code optimization",
    })
  }

  // Memory recommendations
  if (snapshot.resources.memory.usagePercent > 80) {
    recommendations.push({
      id: "mem-high",
      priority: snapshot.resources.memory.usagePercent > 90 ? "critical" : "high",
      category: "resources",
      title: "High Memory Usage",
      description: `Memory usage is ${snapshot.resources.memory.usagePercent}%, risk of OOM errors`,
      impact: "Prevents out-of-memory crashes",
      effort: "Medium - may require memory leak investigation",
    })
  }

  // Connection pool saturation
  if (snapshot.saturation.connectionPoolSaturation > 0.8) {
    recommendations.push({
      id: "pool-saturated",
      priority: "high",
      category: "connections",
      title: "Connection Pool Near Saturation",
      description: "Connection pool is ${Math.round(snapshot.saturation.connectionPoolSaturation * 100)}% utilized",
      impact: "Prevents connection exhaustion and timeouts",
      effort: "Low - increase pool size or optimize query patterns",
    })
  }

  // Queue depth
  if (snapshot.saturation.queueDepth > 100) {
    recommendations.push({
      id: "queue-deep",
      priority: snapshot.saturation.queueDepth > 500 ? "critical" : "high",
      category: "throughput",
      title: "High Queue Depth",
      description: `Request queue depth is ${snapshot.saturation.queueDepth}, requests may be timing out`,
      impact: "Reduced latency and timeout errors",
      effort: "Medium - scale horizontally or optimize processing",
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Create performance snapshot
 */
export function createPerformanceSnapshot(
  responseTimeByEndpoint: Map<string, ResponseTimeMetrics>,
  errorsByEndpoint: Map<string, ErrorMetrics>,
  resources: ResourceMetrics,
  throughput: ThroughputStats,
  saturation: SaturationStats
): PerformanceSnapshot {
  // Calculate overall response time stats
  let totalCount = 0
  let totalSum = 0
  const combinedHistogram = new Array(DEFAULT_HISTOGRAM_BUCKETS.length + 1).fill(0)

  for (const metrics of responseTimeByEndpoint.values()) {
    totalCount += metrics.count
    totalSum += metrics.sum
    metrics.histogram.forEach((count, i) => {
      combinedHistogram[i] += count
    })
  }

  const overallHistogram: HistogramBuckets = {
    buckets: DEFAULT_HISTOGRAM_BUCKETS,
    counts: combinedHistogram,
    sum: totalSum,
    count: totalCount,
  }

  // Calculate overall error stats
  let totalRequests = 0
  let totalErrors = 0
  const errorsByType: Record<string, number> = {}

  for (const metrics of errorsByEndpoint.values()) {
    totalRequests += metrics.totalRequests
    totalErrors += metrics.failedRequests
    for (const [type, count] of Object.entries(metrics.errorsByType)) {
      errorsByType[type] = (errorsByType[type] ?? 0) + count
    }
  }

  return {
    timestamp: new Date(),
    responseTime: {
      overall: {
        avg: totalCount > 0 ? totalSum / totalCount : 0,
        p50: getHistogramPercentile(overallHistogram, 50),
        p95: getHistogramPercentile(overallHistogram, 95),
        p99: getHistogramPercentile(overallHistogram, 99),
      },
      byEndpoint: responseTimeByEndpoint,
    },
    errors: {
      overall: {
        rate: calculateErrorRate(totalRequests - totalErrors, totalErrors),
        total: totalErrors,
        last5Min: totalErrors, // Simplified
      },
      byEndpoint: errorsByEndpoint,
      byType: errorsByType,
    },
    resources,
    throughput,
    saturation,
  }
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  snapshots: PerformanceSnapshot[],
  timeRange: { start: Date; end: Date }
): PerformanceReport {
  if (snapshots.length === 0) {
    throw new Error("No snapshots available for report generation")
  }

  const latestSnapshot = snapshots[snapshots.length - 1]!

  // Calculate averages across snapshots
  const avgCpu = snapshots.reduce((sum, s) => sum + s.resources.cpu.usage, 0) / snapshots.length
  const avgMem = snapshots.reduce((sum, s) => sum + s.resources.memory.usagePercent, 0) / snapshots.length
  const avgResponseTime = snapshots.reduce((sum, s) => sum + s.responseTime.overall.avg, 0) / snapshots.length
  const avgErrorRate = snapshots.reduce((sum, s) => sum + s.errors.overall.rate, 0) / snapshots.length

  // Calculate performance score
  const { score, level } = calculatePerformanceScore(
    latestSnapshot.responseTime.overall,
    latestSnapshot.errors.overall.rate,
    { cpu: avgCpu, memory: avgMem }
  )

  // Generate highlights and concerns
  const highlights: string[] = []
  const concerns: string[] = []

  if (avgResponseTime < 200) highlights.push("Response times are excellent")
  else if (avgResponseTime > 500) concerns.push("Response times need improvement")

  if (avgErrorRate < 0.5) highlights.push("Error rate is very low")
  else if (avgErrorRate > 2) concerns.push("Error rate is concerning")

  if (avgCpu < 50) highlights.push("CPU utilization is optimal")
  else if (avgCpu > 80) concerns.push("CPU utilization is high")

  // Identify trends
  const responseTimes = snapshots.map(s => s.responseTime.overall.avg)
  const errorRates = snapshots.map(s => s.errors.overall.rate)
  const cpuUsages = snapshots.map(s => s.resources.cpu.usage)

  const trends: PerformanceTrend[] = []

  const rtTrend = analyzeTrend("response_time", responseTimes, "report_period")
  if (rtTrend) trends.push(rtTrend)

  const errTrend = analyzeTrend("error_rate", errorRates, "report_period")
  if (errTrend) trends.push(errTrend)

  const cpuTrend = analyzeTrend("cpu_usage", cpuUsages, "report_period")
  if (cpuTrend) trends.push(cpuTrend)

  // Get slowest/fastest endpoints
  const endpointResponseTimes = Array.from(latestSnapshot.responseTime.byEndpoint.entries())
    .map(([endpoint, metrics]) => ({ endpoint, avgTime: metrics.avg }))
    .sort((a, b) => b.avgTime - a.avgTime)

  const slowestEndpoints = endpointResponseTimes.slice(0, 5)
  const fastestEndpoints = [...endpointResponseTimes].sort((a, b) => a.avgTime - b.avgTime).slice(0, 5)

  // Get error stats
  const topErrors = Object.entries(latestSnapshot.errors.byType)
    .map(([type, count]) => ({
      type,
      count,
      percentage: latestSnapshot.errors.overall.total > 0
        ? Math.round((count / latestSnapshot.errors.overall.total) * 100)
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const errorsByEndpoint = Array.from(latestSnapshot.errors.byEndpoint.entries())
    .map(([endpoint, metrics]) => ({
      endpoint,
      errorRate: metrics.errorRate,
      count: metrics.failedRequests,
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5)

  return {
    generatedAt: new Date(),
    timeRange,
    summary: {
      level,
      score,
      highlights,
      concerns,
    },
    responseTime: {
      avgResponseTime,
      medianResponseTime: latestSnapshot.responseTime.overall.p50,
      p95ResponseTime: latestSnapshot.responseTime.overall.p95,
      p99ResponseTime: latestSnapshot.responseTime.overall.p99,
      slowestEndpoints,
      fastestEndpoints,
    },
    errors: {
      totalErrors: latestSnapshot.errors.overall.total,
      errorRate: avgErrorRate,
      topErrors,
      errorsByEndpoint,
    },
    resources: {
      avgCpuUsage: avgCpu,
      peakCpuUsage: Math.max(...snapshots.map(s => s.resources.cpu.usage)),
      avgMemoryUsage: avgMem,
      peakMemoryUsage: Math.max(...snapshots.map(s => s.resources.memory.usagePercent)),
      diskUsage: latestSnapshot.resources.disk.usagePercent,
      networkThroughput: latestSnapshot.resources.network.bytesIn + latestSnapshot.resources.network.bytesOut,
    },
    trends,
    recommendations: generateRecommendations(latestSnapshot),
  }
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let unitIndex = 0
  let value = bytes

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Get level color for UI
 */
export function getLevelColor(level: PerformanceLevel): string {
  const colors: Record<PerformanceLevel, string> = {
    excellent: "#22c55e",
    good: "#84cc16",
    acceptable: "#eab308",
    poor: "#f97316",
    critical: "#ef4444",
  }
  return colors[level]
}

/**
 * Get trend icon
 */
export function getTrendIcon(direction: TrendDirection): string {
  const icons: Record<TrendDirection, string> = {
    up: "↑",
    down: "↓",
    stable: "→",
  }
  return icons[direction]
}
