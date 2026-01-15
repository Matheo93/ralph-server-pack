/**
 * Alerting System
 *
 * Comprehensive alerting infrastructure:
 * - Threshold-based alerts
 * - Anomaly detection
 * - Alert routing (Slack, email, webhook)
 * - Alert deduplication and grouping
 */

import { z } from "zod"
import type { HealthStatus, HealthMetrics } from "./health-checker"

// =============================================================================
// TYPES
// =============================================================================

export type AlertSeverity = "info" | "warning" | "error" | "critical"
export type AlertStatus = "firing" | "resolved" | "acknowledged" | "silenced"
export type AlertChannel = "slack" | "email" | "webhook" | "pagerduty" | "sms"
export type ThresholdOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq"
export type AnomalyType = "spike" | "drop" | "drift" | "trend_change"

export interface Alert {
  id: string
  name: string
  description: string
  severity: AlertSeverity
  status: AlertStatus
  source: string
  metric?: string
  value?: number
  threshold?: number
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: Date
  endsAt?: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  silencedUntil?: Date
  fingerprint: string
}

export interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  condition: ThresholdCondition
  severity: AlertSeverity
  for: number // duration in ms before firing
  labels: Record<string, string>
  annotations: Record<string, string>
  channels: AlertChannel[]
  enabled: boolean
  cooldown: number // ms between repeated alerts
}

export interface ThresholdCondition {
  operator: ThresholdOperator
  value: number
  windowSize?: number // ms to aggregate over
}

export interface AlertGroup {
  key: string
  alerts: Alert[]
  severity: AlertSeverity
  startsAt: Date
  latestAt: Date
  count: number
}

export interface AlertRoute {
  id: string
  matchers: AlertMatcher[]
  channels: AlertChannelConfig[]
  groupBy: string[]
  groupWait: number // ms
  groupInterval: number // ms
  repeatInterval: number // ms
}

export interface AlertMatcher {
  label: string
  operator: "eq" | "neq" | "regex"
  value: string
}

export interface AlertChannelConfig {
  type: AlertChannel
  config: SlackConfig | EmailConfig | WebhookConfig | PagerDutyConfig | SmsConfig
  enabled: boolean
}

export interface SlackConfig {
  webhookUrl: string
  channel?: string
  username?: string
  iconEmoji?: string
}

export interface EmailConfig {
  to: string[]
  cc?: string[]
  from: string
  smtpHost: string
  smtpPort: number
  smtpUser?: string
  smtpPass?: string
  useTls: boolean
}

export interface WebhookConfig {
  url: string
  method: "POST" | "PUT"
  headers?: Record<string, string>
  timeout: number
}

export interface PagerDutyConfig {
  routingKey: string
  serviceKey?: string
  severity: "info" | "warning" | "error" | "critical"
}

export interface SmsConfig {
  provider: "twilio" | "aws_sns"
  to: string[]
  from?: string
  accountSid?: string
  authToken?: string
}

export interface AlertStatistics {
  totalAlerts: number
  byStatus: Record<AlertStatus, number>
  bySeverity: Record<AlertSeverity, number>
  bySource: Record<string, number>
  avgResolutionTime: number
  alertsLast24h: number
}

export interface AnomalyDetectionConfig {
  enabled: boolean
  sensitivity: number // 0-1, higher = more sensitive
  windowSize: number // ms
  minDataPoints: number
  methods: AnomalyType[]
}

export interface AnomalyResult {
  detected: boolean
  type?: AnomalyType
  score: number // 0-1 confidence
  expectedValue: number
  actualValue: number
  deviation: number
  message: string
}

export interface MetricDataPoint {
  timestamp: Date
  value: number
}

export interface MetricSeries {
  name: string
  dataPoints: MetricDataPoint[]
  stats: MetricStats
}

export interface MetricStats {
  mean: number
  stdDev: number
  min: number
  max: number
  median: number
  p95: number
  p99: number
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const AlertRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  metric: z.string().min(1),
  condition: z.object({
    operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
    value: z.number(),
    windowSize: z.number().optional(),
  }),
  severity: z.enum(["info", "warning", "error", "critical"]),
  for: z.number().min(0),
  labels: z.record(z.string(), z.string()),
  annotations: z.record(z.string(), z.string()),
  channels: z.array(z.enum(["slack", "email", "webhook", "pagerduty", "sms"])),
  enabled: z.boolean(),
  cooldown: z.number().min(0),
})

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  enabled: true,
  sensitivity: 0.7,
  windowSize: 3600000, // 1 hour
  minDataPoints: 10,
  methods: ["spike", "drop", "drift"],
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: "high_error_rate",
    name: "High Error Rate",
    description: "Error rate exceeds threshold",
    metric: "error_rate",
    condition: { operator: "gt", value: 5, windowSize: 300000 },
    severity: "error",
    for: 60000,
    labels: { category: "reliability" },
    annotations: { summary: "Error rate is above 5%" },
    channels: ["slack", "email"],
    enabled: true,
    cooldown: 300000,
  },
  {
    id: "high_response_time",
    name: "High Response Time",
    description: "Average response time exceeds threshold",
    metric: "avg_response_time",
    condition: { operator: "gt", value: 2000, windowSize: 300000 },
    severity: "warning",
    for: 120000,
    labels: { category: "performance" },
    annotations: { summary: "Response time is above 2s" },
    channels: ["slack"],
    enabled: true,
    cooldown: 600000,
  },
  {
    id: "memory_high",
    name: "High Memory Usage",
    description: "Memory usage exceeds 90%",
    metric: "memory_usage",
    condition: { operator: "gt", value: 90 },
    severity: "critical",
    for: 300000,
    labels: { category: "resources" },
    annotations: { summary: "Memory usage is critically high" },
    channels: ["slack", "email", "pagerduty"],
    enabled: true,
    cooldown: 900000,
  },
  {
    id: "cpu_high",
    name: "High CPU Usage",
    description: "CPU usage exceeds 85%",
    metric: "cpu_usage",
    condition: { operator: "gt", value: 85 },
    severity: "warning",
    for: 300000,
    labels: { category: "resources" },
    annotations: { summary: "CPU usage is high" },
    channels: ["slack"],
    enabled: true,
    cooldown: 600000,
  },
  {
    id: "service_down",
    name: "Service Down",
    description: "Critical service is unhealthy",
    metric: "health_status",
    condition: { operator: "eq", value: 0 },
    severity: "critical",
    for: 30000,
    labels: { category: "availability" },
    annotations: { summary: "Service health check failed" },
    channels: ["slack", "email", "pagerduty", "sms"],
    enabled: true,
    cooldown: 60000,
  },
]

// =============================================================================
// ALERT MANAGEMENT
// =============================================================================

/**
 * Generate unique alert fingerprint for deduplication
 */
export function generateAlertFingerprint(
  name: string,
  source: string,
  labels: Record<string, string>
): string {
  const sortedLabels = Object.keys(labels)
    .sort()
    .map(k => `${k}=${labels[k]}`)
    .join(",")

  const data = `${name}|${source}|${sortedLabels}`

  // Simple hash function
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, "0")
}

/**
 * Create new alert
 */
export function createAlert(
  name: string,
  description: string,
  severity: AlertSeverity,
  source: string,
  options: {
    metric?: string
    value?: number
    threshold?: number
    labels?: Record<string, string>
    annotations?: Record<string, string>
  } = {}
): Alert {
  const labels = options.labels ?? {}
  const fingerprint = generateAlertFingerprint(name, source, labels)

  return {
    id: `alert_${Date.now()}_${fingerprint}`,
    name,
    description,
    severity,
    status: "firing",
    source,
    metric: options.metric,
    value: options.value,
    threshold: options.threshold,
    labels,
    annotations: options.annotations ?? {},
    startsAt: new Date(),
    fingerprint,
  }
}

/**
 * Resolve an alert
 */
export function resolveAlert(alert: Alert): Alert {
  return {
    ...alert,
    status: "resolved",
    endsAt: new Date(),
  }
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alert: Alert, acknowledgedBy: string): Alert {
  return {
    ...alert,
    status: "acknowledged",
    acknowledgedAt: new Date(),
    acknowledgedBy,
  }
}

/**
 * Silence an alert
 */
export function silenceAlert(alert: Alert, until: Date): Alert {
  return {
    ...alert,
    status: "silenced",
    silencedUntil: until,
  }
}

/**
 * Check if alert is silenced
 */
export function isAlertSilenced(alert: Alert): boolean {
  if (alert.status !== "silenced") return false
  if (!alert.silencedUntil) return false
  return new Date() < alert.silencedUntil
}

/**
 * Get severity level (for comparison)
 */
export function getSeverityLevel(severity: AlertSeverity): number {
  const levels: Record<AlertSeverity, number> = {
    info: 0,
    warning: 1,
    error: 2,
    critical: 3,
  }
  return levels[severity]
}

// =============================================================================
// THRESHOLD EVALUATION
// =============================================================================

/**
 * Evaluate threshold condition
 */
export function evaluateThreshold(
  value: number,
  condition: ThresholdCondition
): boolean {
  switch (condition.operator) {
    case "gt":
      return value > condition.value
    case "gte":
      return value >= condition.value
    case "lt":
      return value < condition.value
    case "lte":
      return value <= condition.value
    case "eq":
      return value === condition.value
    case "neq":
      return value !== condition.value
    default:
      return false
  }
}

/**
 * Evaluate alert rule against current metrics
 */
export function evaluateAlertRule(
  rule: AlertRule,
  currentValue: number,
  source: string
): Alert | null {
  if (!rule.enabled) return null

  const triggered = evaluateThreshold(currentValue, rule.condition)

  if (!triggered) return null

  return createAlert(
    rule.name,
    rule.description,
    rule.severity,
    source,
    {
      metric: rule.metric,
      value: currentValue,
      threshold: rule.condition.value,
      labels: rule.labels,
      annotations: rule.annotations,
    }
  )
}

/**
 * Evaluate all rules against metrics
 */
export function evaluateAllRules(
  rules: AlertRule[],
  metrics: Record<string, number>,
  source: string
): Alert[] {
  const alerts: Alert[] = []

  for (const rule of rules) {
    const value = metrics[rule.metric]
    if (value === undefined) continue

    const alert = evaluateAlertRule(rule, value, source)
    if (alert) {
      alerts.push(alert)
    }
  }

  return alerts
}

/**
 * Convert health metrics to alert metrics format
 */
export function healthMetricsToAlertMetrics(
  metrics: HealthMetrics,
  healthStatus: HealthStatus
): Record<string, number> {
  const statusValue = healthStatus === "healthy" ? 1 : healthStatus === "degraded" ? 0.5 : 0

  return {
    error_rate: metrics.errorRate,
    avg_response_time: metrics.avgResponseTime,
    memory_usage: metrics.memoryUsage,
    cpu_usage: metrics.cpuUsage,
    requests_per_second: metrics.requestsPerSecond,
    active_connections: metrics.activeConnections,
    health_status: statusValue,
  }
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

/**
 * Calculate statistics for a metric series
 */
export function calculateMetricStats(dataPoints: MetricDataPoint[]): MetricStats {
  if (dataPoints.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      median: 0,
      p95: 0,
      p99: 0,
    }
  }

  const values = dataPoints.map(d => d.value).sort((a, b) => a - b)
  const n = values.length

  // Mean
  const mean = values.reduce((a, b) => a + b, 0) / n

  // Standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / n
  const stdDev = Math.sqrt(avgSquaredDiff)

  // Min/Max
  const min = values[0]!
  const max = values[n - 1]!

  // Median
  const median = n % 2 === 0
    ? (values[n / 2 - 1]! + values[n / 2]!) / 2
    : values[Math.floor(n / 2)]!

  // Percentiles
  const p95 = values[Math.floor(n * 0.95)] ?? max
  const p99 = values[Math.floor(n * 0.99)] ?? max

  return { mean, stdDev, min, max, median, p95, p99 }
}

/**
 * Detect spike anomaly (sudden increase)
 */
export function detectSpike(
  currentValue: number,
  stats: MetricStats,
  sensitivity: number
): AnomalyResult {
  const threshold = stats.mean + (stats.stdDev * (3 - sensitivity * 2))
  const deviation = (currentValue - stats.mean) / (stats.stdDev || 1)
  const detected = currentValue > threshold

  return {
    detected,
    type: "spike",
    score: Math.min(Math.abs(deviation) / 3, 1),
    expectedValue: stats.mean,
    actualValue: currentValue,
    deviation,
    message: detected
      ? `Value ${currentValue.toFixed(2)} is ${deviation.toFixed(1)} standard deviations above mean`
      : "No spike detected",
  }
}

/**
 * Detect drop anomaly (sudden decrease)
 */
export function detectDrop(
  currentValue: number,
  stats: MetricStats,
  sensitivity: number
): AnomalyResult {
  const threshold = stats.mean - (stats.stdDev * (3 - sensitivity * 2))
  const deviation = (stats.mean - currentValue) / (stats.stdDev || 1)
  const detected = currentValue < threshold

  return {
    detected,
    type: "drop",
    score: Math.min(Math.abs(deviation) / 3, 1),
    expectedValue: stats.mean,
    actualValue: currentValue,
    deviation: -deviation,
    message: detected
      ? `Value ${currentValue.toFixed(2)} is ${deviation.toFixed(1)} standard deviations below mean`
      : "No drop detected",
  }
}

/**
 * Detect drift anomaly (gradual change)
 */
export function detectDrift(
  dataPoints: MetricDataPoint[],
  sensitivity: number
): AnomalyResult {
  if (dataPoints.length < 5) {
    return {
      detected: false,
      type: "drift",
      score: 0,
      expectedValue: 0,
      actualValue: 0,
      deviation: 0,
      message: "Insufficient data points for drift detection",
    }
  }

  // Calculate linear regression
  const n = dataPoints.length
  const xMean = (n - 1) / 2
  const yMean = dataPoints.reduce((a, d) => a + d.value, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const dp = dataPoints[i]!
    numerator += (i - xMean) * (dp.value - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  const slope = numerator / (denominator || 1)
  const slopeNormalized = slope / (yMean || 1)

  const driftThreshold = 0.1 * (1 - sensitivity * 0.5) // 10% per window at default
  const detected = Math.abs(slopeNormalized) > driftThreshold

  const firstValue = dataPoints[0]!.value
  const lastValue = dataPoints[n - 1]!.value

  return {
    detected,
    type: "drift",
    score: Math.min(Math.abs(slopeNormalized) / driftThreshold, 1),
    expectedValue: firstValue,
    actualValue: lastValue,
    deviation: ((lastValue - firstValue) / (firstValue || 1)) * 100,
    message: detected
      ? `Detected ${slopeNormalized > 0 ? "upward" : "downward"} drift of ${(slopeNormalized * 100).toFixed(1)}% per window`
      : "No significant drift detected",
  }
}

/**
 * Detect trend change (reversal in direction)
 */
export function detectTrendChange(
  dataPoints: MetricDataPoint[],
  sensitivity: number
): AnomalyResult {
  if (dataPoints.length < 10) {
    return {
      detected: false,
      type: "trend_change",
      score: 0,
      expectedValue: 0,
      actualValue: 0,
      deviation: 0,
      message: "Insufficient data points for trend change detection",
    }
  }

  const n = dataPoints.length
  const midpoint = Math.floor(n / 2)

  // Calculate slope for first half
  const firstHalf = dataPoints.slice(0, midpoint)
  const firstSlope = calculateSlope(firstHalf)

  // Calculate slope for second half
  const secondHalf = dataPoints.slice(midpoint)
  const secondSlope = calculateSlope(secondHalf)

  // Detect trend reversal
  const trendReversed = (firstSlope > 0 && secondSlope < 0) || (firstSlope < 0 && secondSlope > 0)
  const slopeDiff = Math.abs(secondSlope - firstSlope)
  const changeThreshold = 0.05 * (1 - sensitivity * 0.5)

  const detected = trendReversed && slopeDiff > changeThreshold

  return {
    detected,
    type: "trend_change",
    score: detected ? Math.min(slopeDiff / changeThreshold, 1) : 0,
    expectedValue: firstSlope,
    actualValue: secondSlope,
    deviation: slopeDiff,
    message: detected
      ? `Trend reversed from ${firstSlope > 0 ? "upward" : "downward"} to ${secondSlope > 0 ? "upward" : "downward"}`
      : "No trend change detected",
  }
}

/**
 * Helper: Calculate slope of data points
 */
function calculateSlope(dataPoints: MetricDataPoint[]): number {
  const n = dataPoints.length
  if (n < 2) return 0

  const xMean = (n - 1) / 2
  const yMean = dataPoints.reduce((a, d) => a + d.value, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const dp = dataPoints[i]!
    numerator += (i - xMean) * (dp.value - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  return numerator / (denominator || 1)
}

/**
 * Run full anomaly detection
 */
export function detectAnomalies(
  series: MetricSeries,
  config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG
): AnomalyResult[] {
  const results: AnomalyResult[] = []

  if (!config.enabled) return results
  if (series.dataPoints.length < config.minDataPoints) return results

  const currentValue = series.dataPoints[series.dataPoints.length - 1]!.value

  if (config.methods.includes("spike")) {
    results.push(detectSpike(currentValue, series.stats, config.sensitivity))
  }

  if (config.methods.includes("drop")) {
    results.push(detectDrop(currentValue, series.stats, config.sensitivity))
  }

  if (config.methods.includes("drift")) {
    results.push(detectDrift(series.dataPoints, config.sensitivity))
  }

  if (config.methods.includes("trend_change")) {
    results.push(detectTrendChange(series.dataPoints, config.sensitivity))
  }

  return results
}

/**
 * Create alerts from anomaly results
 */
export function createAnomalyAlerts(
  metricName: string,
  source: string,
  results: AnomalyResult[]
): Alert[] {
  return results
    .filter(r => r.detected)
    .map(r => createAlert(
      `Anomaly: ${r.type} in ${metricName}`,
      r.message,
      r.score > 0.8 ? "error" : "warning",
      source,
      {
        metric: metricName,
        value: r.actualValue,
        labels: { anomaly_type: r.type ?? "unknown" },
        annotations: {
          expected: r.expectedValue.toFixed(2),
          deviation: r.deviation.toFixed(2),
          confidence: (r.score * 100).toFixed(0) + "%",
        },
      }
    ))
}

// =============================================================================
// ALERT GROUPING
// =============================================================================

/**
 * Group alerts by labels
 */
export function groupAlerts(
  alerts: Alert[],
  groupByLabels: string[]
): AlertGroup[] {
  const groups: Map<string, Alert[]> = new Map()

  for (const alert of alerts) {
    const keyParts = groupByLabels.map(label => `${label}=${alert.labels[label] ?? ""}`)
    const key = keyParts.join(",")

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(alert)
  }

  return Array.from(groups.entries()).map(([key, groupAlerts]) => {
    const sortedAlerts = groupAlerts.sort((a, b) =>
      getSeverityLevel(b.severity) - getSeverityLevel(a.severity)
    )

    return {
      key,
      alerts: sortedAlerts,
      severity: sortedAlerts[0]!.severity,
      startsAt: new Date(Math.min(...groupAlerts.map(a => a.startsAt.getTime()))),
      latestAt: new Date(Math.max(...groupAlerts.map(a => a.startsAt.getTime()))),
      count: groupAlerts.length,
    }
  })
}

/**
 * Deduplicate alerts by fingerprint
 */
export function deduplicateAlerts(alerts: Alert[]): Alert[] {
  const seen = new Map<string, Alert>()

  for (const alert of alerts) {
    const existing = seen.get(alert.fingerprint)

    if (!existing) {
      seen.set(alert.fingerprint, alert)
    } else if (getSeverityLevel(alert.severity) > getSeverityLevel(existing.severity)) {
      // Keep the more severe alert
      seen.set(alert.fingerprint, alert)
    }
  }

  return Array.from(seen.values())
}

// =============================================================================
// ALERT ROUTING
// =============================================================================

/**
 * Match alert against route matchers
 */
export function matchAlert(alert: Alert, matchers: AlertMatcher[]): boolean {
  for (const matcher of matchers) {
    const labelValue = alert.labels[matcher.label]

    switch (matcher.operator) {
      case "eq":
        if (labelValue !== matcher.value) return false
        break
      case "neq":
        if (labelValue === matcher.value) return false
        break
      case "regex":
        try {
          const regex = new RegExp(matcher.value)
          if (!regex.test(labelValue ?? "")) return false
        } catch {
          return false
        }
        break
    }
  }

  return true
}

/**
 * Find matching route for alert
 */
export function findMatchingRoute(
  alert: Alert,
  routes: AlertRoute[]
): AlertRoute | null {
  for (const route of routes) {
    if (matchAlert(alert, route.matchers)) {
      return route
    }
  }
  return null
}

// =============================================================================
// ALERT FORMATTING
// =============================================================================

/**
 * Format alert for Slack
 */
export function formatAlertForSlack(alert: Alert): {
  text: string
  blocks: Array<{
    type: string
    text?: { type: string; text: string; emoji?: boolean }
    fields?: Array<{ type: string; text: string }>
    elements?: Array<{ type: string; text: string }>
  }>
} {
  const severityEmoji: Record<AlertSeverity, string> = {
    info: ":information_source:",
    warning: ":warning:",
    error: ":x:",
    critical: ":rotating_light:",
  }

  const statusColor: Record<AlertStatus, string> = {
    firing: "#dc2626",
    resolved: "#16a34a",
    acknowledged: "#ca8a04",
    silenced: "#6b7280",
  }

  const emoji = severityEmoji[alert.severity]
  const color = statusColor[alert.status]

  return {
    text: `${emoji} [${alert.severity.toUpperCase()}] ${alert.name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${alert.name}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: alert.description,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Severity:* ${alert.severity}` },
          { type: "mrkdwn", text: `*Status:* ${alert.status}` },
          { type: "mrkdwn", text: `*Source:* ${alert.source}` },
          { type: "mrkdwn", text: `*Time:* ${alert.startsAt.toISOString()}` },
          ...(alert.metric
            ? [{ type: "mrkdwn", text: `*Metric:* ${alert.metric}` }]
            : []),
          ...(alert.value !== undefined
            ? [{ type: "mrkdwn", text: `*Value:* ${alert.value}` }]
            : []),
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Alert ID: ${alert.id} | Fingerprint: ${alert.fingerprint}`,
          },
        ],
      },
    ],
  }
}

/**
 * Format alert for email
 */
export function formatAlertForEmail(alert: Alert): {
  subject: string
  body: string
  html: string
} {
  const severityPrefix: Record<AlertSeverity, string> = {
    info: "[INFO]",
    warning: "[WARNING]",
    error: "[ERROR]",
    critical: "[CRITICAL]",
  }

  const subject = `${severityPrefix[alert.severity]} ${alert.name} - ${alert.status}`

  const body = `
Alert: ${alert.name}
Status: ${alert.status}
Severity: ${alert.severity}
Source: ${alert.source}
Time: ${alert.startsAt.toISOString()}

Description:
${alert.description}

${alert.metric ? `Metric: ${alert.metric}` : ""}
${alert.value !== undefined ? `Value: ${alert.value}` : ""}
${alert.threshold !== undefined ? `Threshold: ${alert.threshold}` : ""}

Labels:
${Object.entries(alert.labels).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

Annotations:
${Object.entries(alert.annotations).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

---
Alert ID: ${alert.id}
Fingerprint: ${alert.fingerprint}
  `.trim()

  const severityColor: Record<AlertSeverity, string> = {
    info: "#2563eb",
    warning: "#ca8a04",
    error: "#dc2626",
    critical: "#7c2d12",
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${severityColor[alert.severity]}; color: white; padding: 20px; }
    .content { padding: 20px; }
    .label { background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin-right: 8px; }
    .footer { background: #f9fafb; padding: 10px 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">${alert.name}</h1>
    <p style="margin: 5px 0 0 0;">Status: ${alert.status.toUpperCase()} | Severity: ${alert.severity.toUpperCase()}</p>
  </div>
  <div class="content">
    <p><strong>Description:</strong> ${alert.description}</p>
    <p><strong>Source:</strong> ${alert.source}</p>
    <p><strong>Time:</strong> ${alert.startsAt.toISOString()}</p>
    ${alert.metric ? `<p><strong>Metric:</strong> ${alert.metric}</p>` : ""}
    ${alert.value !== undefined ? `<p><strong>Value:</strong> ${alert.value}</p>` : ""}
    ${alert.threshold !== undefined ? `<p><strong>Threshold:</strong> ${alert.threshold}</p>` : ""}
    <p><strong>Labels:</strong></p>
    <p>${Object.entries(alert.labels).map(([k, v]) => `<span class="label">${k}: ${v}</span>`).join(" ")}</p>
  </div>
  <div class="footer">
    Alert ID: ${alert.id} | Fingerprint: ${alert.fingerprint}
  </div>
</body>
</html>
  `.trim()

  return { subject, body, html }
}

/**
 * Format alert for webhook
 */
export function formatAlertForWebhook(alert: Alert): Record<string, unknown> {
  return {
    id: alert.id,
    name: alert.name,
    description: alert.description,
    severity: alert.severity,
    status: alert.status,
    source: alert.source,
    metric: alert.metric,
    value: alert.value,
    threshold: alert.threshold,
    labels: alert.labels,
    annotations: alert.annotations,
    startsAt: alert.startsAt.toISOString(),
    endsAt: alert.endsAt?.toISOString(),
    fingerprint: alert.fingerprint,
  }
}

/**
 * Format alert for PagerDuty
 */
export function formatAlertForPagerDuty(
  alert: Alert,
  routingKey: string
): {
  routing_key: string
  event_action: "trigger" | "resolve"
  dedup_key: string
  payload: {
    summary: string
    severity: "info" | "warning" | "error" | "critical"
    source: string
    timestamp: string
    custom_details: Record<string, unknown>
  }
} {
  return {
    routing_key: routingKey,
    event_action: alert.status === "resolved" ? "resolve" : "trigger",
    dedup_key: alert.fingerprint,
    payload: {
      summary: `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.description}`,
      severity: alert.severity,
      source: alert.source,
      timestamp: alert.startsAt.toISOString(),
      custom_details: {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        labels: alert.labels,
        annotations: alert.annotations,
      },
    },
  }
}

// =============================================================================
// ALERT SENDING
// =============================================================================

/**
 * Send alert to Slack
 */
export async function sendAlertToSlack(
  alert: Alert,
  config: SlackConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = formatAlertForSlack(alert)

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        channel: config.channel,
        username: config.username ?? "FamilyLoad Alerts",
        icon_emoji: config.iconEmoji ?? ":bell:",
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Slack API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send alert to webhook
 */
export async function sendAlertToWebhook(
  alert: Alert,
  config: WebhookConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(config.url, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify(formatAlertForWebhook(alert)),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { success: false, error: `Webhook error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send alert to PagerDuty
 */
export async function sendAlertToPagerDuty(
  alert: Alert,
  config: PagerDutyConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = formatAlertForPagerDuty(alert, config.routingKey)

    const response = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return { success: false, error: `PagerDuty API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Route and send alert to configured channels
 */
export async function routeAndSendAlert(
  alert: Alert,
  channelConfigs: AlertChannelConfig[]
): Promise<Map<AlertChannel, { success: boolean; error?: string }>> {
  const results = new Map<AlertChannel, { success: boolean; error?: string }>()

  const sendPromises = channelConfigs
    .filter(c => c.enabled)
    .map(async channelConfig => {
      let result: { success: boolean; error?: string }

      switch (channelConfig.type) {
        case "slack":
          result = await sendAlertToSlack(alert, channelConfig.config as SlackConfig)
          break
        case "webhook":
          result = await sendAlertToWebhook(alert, channelConfig.config as WebhookConfig)
          break
        case "pagerduty":
          result = await sendAlertToPagerDuty(alert, channelConfig.config as PagerDutyConfig)
          break
        case "email":
          // Email requires SMTP setup, return placeholder
          result = { success: false, error: "Email channel not implemented" }
          break
        case "sms":
          // SMS requires provider setup, return placeholder
          result = { success: false, error: "SMS channel not implemented" }
          break
        default:
          result = { success: false, error: "Unknown channel type" }
      }

      results.set(channelConfig.type, result)
    })

  await Promise.all(sendPromises)

  return results
}

// =============================================================================
// ALERT STATISTICS
// =============================================================================

/**
 * Calculate alert statistics
 */
export function calculateAlertStatistics(alerts: Alert[]): AlertStatistics {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const byStatus: Record<AlertStatus, number> = {
    firing: 0,
    resolved: 0,
    acknowledged: 0,
    silenced: 0,
  }

  const bySeverity: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  }

  const bySource: Record<string, number> = {}

  let totalResolutionTime = 0
  let resolvedCount = 0
  let alertsLast24h = 0

  for (const alert of alerts) {
    byStatus[alert.status]++
    bySeverity[alert.severity]++
    bySource[alert.source] = (bySource[alert.source] ?? 0) + 1

    if (alert.startsAt >= oneDayAgo) {
      alertsLast24h++
    }

    if (alert.status === "resolved" && alert.endsAt) {
      totalResolutionTime += alert.endsAt.getTime() - alert.startsAt.getTime()
      resolvedCount++
    }
  }

  return {
    totalAlerts: alerts.length,
    byStatus,
    bySeverity,
    bySource,
    avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    alertsLast24h,
  }
}

/**
 * Get active alerts (firing or acknowledged)
 */
export function getActiveAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter(a => a.status === "firing" || a.status === "acknowledged")
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(alerts: Alert[], severity: AlertSeverity): Alert[] {
  return alerts.filter(a => a.severity === severity)
}

/**
 * Get critical and unresolved alerts
 */
export function getCriticalAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter(a =>
    a.severity === "critical" &&
    (a.status === "firing" || a.status === "acknowledged")
  )
}
