/**
 * Monitoring Tests
 * Tests for metrics, tracing, and health check modules
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  metrics,
  trackHttpRequest,
  trackDbQuery,
  trackCacheAccess,
  trackTaskCreated,
  trackTaskCompleted,
  updateStreakDays,
  Timer,
  createHistogramTimer,
  DEFAULT_HISTOGRAM_BUCKETS,
  METRIC_PREFIX,
} from "@/lib/monitoring/metrics"

import {
  tracer,
  generateTraceId,
  generateSpanId,
  withSpan,
  withSpanSync,
  TRACE_HEADER_NAME,
  SPAN_HEADER_NAME,
  DEFAULT_SAMPLING_RATE,
} from "@/lib/monitoring/tracing"

import {
  healthChecks,
  livenessCheck,
  formatHealthResponse,
  DEFAULT_TIMEOUT,
  HEALTHY_THRESHOLD_MS,
  DEGRADED_THRESHOLD_MS,
} from "@/lib/monitoring/health-checks"

// =============================================================================
// Metrics Tests
// =============================================================================

describe("Metrics Module", () => {
  beforeEach(() => {
    metrics.reset()
    // Re-register default metrics after reset
    metrics.registerMetric({
      name: "test_counter",
      type: "counter",
      help: "Test counter",
    })
    metrics.registerMetric({
      name: "test_gauge",
      type: "gauge",
      help: "Test gauge",
    })
    metrics.registerMetric({
      name: "test_histogram",
      type: "histogram",
      help: "Test histogram",
    })
  })

  describe("Counter Operations", () => {
    it("should increment counter with default value", () => {
      metrics.incrementCounter("test_counter")
      expect(metrics.getCounter("test_counter")).toBe(1)
    })

    it("should increment counter with custom value", () => {
      metrics.incrementCounter("test_counter", {}, 5)
      expect(metrics.getCounter("test_counter")).toBe(5)
    })

    it("should increment counter with labels", () => {
      metrics.incrementCounter("test_counter", { method: "GET" })
      metrics.incrementCounter("test_counter", { method: "POST" })
      expect(metrics.getCounter("test_counter", { method: "GET" })).toBe(1)
      expect(metrics.getCounter("test_counter", { method: "POST" })).toBe(1)
    })

    it("should accumulate counter increments", () => {
      metrics.incrementCounter("test_counter")
      metrics.incrementCounter("test_counter")
      metrics.incrementCounter("test_counter")
      expect(metrics.getCounter("test_counter")).toBe(3)
    })
  })

  describe("Gauge Operations", () => {
    it("should set gauge value", () => {
      metrics.setGauge("test_gauge", 42)
      expect(metrics.getGauge("test_gauge")).toBe(42)
    })

    it("should overwrite gauge value", () => {
      metrics.setGauge("test_gauge", 10)
      metrics.setGauge("test_gauge", 20)
      expect(metrics.getGauge("test_gauge")).toBe(20)
    })

    it("should increment gauge", () => {
      metrics.setGauge("test_gauge", 10)
      metrics.incrementGauge("test_gauge", {}, 5)
      expect(metrics.getGauge("test_gauge")).toBe(15)
    })

    it("should decrement gauge", () => {
      metrics.setGauge("test_gauge", 10)
      metrics.decrementGauge("test_gauge", {}, 3)
      expect(metrics.getGauge("test_gauge")).toBe(7)
    })

    it("should handle gauge with labels", () => {
      metrics.setGauge("test_gauge", 100, { user_id: "1" })
      metrics.setGauge("test_gauge", 200, { user_id: "2" })
      expect(metrics.getGauge("test_gauge", { user_id: "1" })).toBe(100)
      expect(metrics.getGauge("test_gauge", { user_id: "2" })).toBe(200)
    })
  })

  describe("Histogram Operations", () => {
    it("should observe histogram value", () => {
      metrics.observeHistogram("test_histogram", 0.1)
      const histogram = metrics.getHistogram("test_histogram")
      expect(histogram).not.toBeNull()
      expect(histogram?.count).toBe(1)
      expect(histogram?.sum).toBe(0.1)
    })

    it("should update histogram buckets correctly", () => {
      metrics.observeHistogram("test_histogram", 0.05)
      const histogram = metrics.getHistogram("test_histogram")
      expect(histogram).not.toBeNull()
      // Value 0.05 should be in buckets <= 0.05, 0.1, 0.25, etc.
      const bucket005 = histogram?.buckets.find(b => b.le === 0.05)
      expect(bucket005?.count).toBe(1)
    })

    it("should accumulate histogram observations", () => {
      metrics.observeHistogram("test_histogram", 0.1)
      metrics.observeHistogram("test_histogram", 0.2)
      metrics.observeHistogram("test_histogram", 0.3)
      const histogram = metrics.getHistogram("test_histogram")
      expect(histogram?.count).toBe(3)
      expect(histogram?.sum).toBeCloseTo(0.6, 5)
    })
  })

  describe("Prometheus Export", () => {
    it("should export metrics in Prometheus format", () => {
      metrics.incrementCounter("test_counter", { status: "200" })
      const output = metrics.toPrometheusFormat()
      expect(output).toContain("familyload_test_counter")
      expect(output).toContain("counter")
    })

    it("should include HELP and TYPE comments", () => {
      metrics.incrementCounter("test_counter")
      const output = metrics.toPrometheusFormat()
      expect(output).toContain("# HELP")
      expect(output).toContain("# TYPE")
    })
  })

  describe("JSON Export", () => {
    it("should export metrics as JSON", () => {
      metrics.incrementCounter("test_counter")
      metrics.setGauge("test_gauge", 42)
      const json = metrics.toJSON()
      expect(json).toHaveProperty(`${METRIC_PREFIX}test_counter`)
      expect(json).toHaveProperty(`${METRIC_PREFIX}test_gauge`)
    })
  })

  describe("Convenience Functions", () => {
    it("should track HTTP request", () => {
      // Re-register HTTP metrics
      metrics.registerMetric({
        name: "http_requests_total",
        type: "counter",
        help: "Total HTTP requests",
      })
      metrics.registerMetric({
        name: "http_request_duration_seconds",
        type: "histogram",
        help: "HTTP request duration",
      })
      trackHttpRequest("GET", "/api/test", 200, 100)
      expect(metrics.getCounter("http_requests_total", { method: "GET", path: "/api/test", status: "200" })).toBe(1)
    })

    it("should track DB query", () => {
      metrics.registerMetric({
        name: "db_query_duration_seconds",
        type: "histogram",
        help: "DB query duration",
      })
      trackDbQuery("SELECT", "users", 50)
      const histogram = metrics.getHistogram("db_query_duration_seconds", { operation: "SELECT", table: "users" })
      expect(histogram).not.toBeNull()
    })

    it("should track cache access", () => {
      metrics.registerMetric({
        name: "cache_hits_total",
        type: "counter",
        help: "Cache hits",
      })
      metrics.registerMetric({
        name: "cache_misses_total",
        type: "counter",
        help: "Cache misses",
      })
      trackCacheAccess("redis", true)
      trackCacheAccess("redis", false)
      expect(metrics.getCounter("cache_hits_total", { cache_type: "redis" })).toBe(1)
      expect(metrics.getCounter("cache_misses_total", { cache_type: "redis" })).toBe(1)
    })

    it("should track task creation", () => {
      metrics.registerMetric({
        name: "tasks_created_total",
        type: "counter",
        help: "Tasks created",
      })
      trackTaskCreated("household-1")
      expect(metrics.getCounter("tasks_created_total", { household_id: "household-1" })).toBe(1)
    })

    it("should track task completion", () => {
      metrics.registerMetric({
        name: "tasks_completed_total",
        type: "counter",
        help: "Tasks completed",
      })
      trackTaskCompleted("household-1", "user-1")
      expect(metrics.getCounter("tasks_completed_total", { household_id: "household-1", user_id: "user-1" })).toBe(1)
    })

    it("should update streak days", () => {
      metrics.registerMetric({
        name: "streak_days",
        type: "gauge",
        help: "Streak days",
      })
      updateStreakDays("user-1", 7)
      expect(metrics.getGauge("streak_days", { user_id: "user-1" })).toBe(7)
    })
  })

  describe("Timer Utility", () => {
    it("should measure elapsed time", async () => {
      const timer = new Timer()
      await new Promise(resolve => setTimeout(resolve, 15))
      const elapsed = timer.elapsed()
      // Allow small timing variance in CI environments
      expect(elapsed).toBeGreaterThanOrEqual(9)
    })

    it("should measure elapsed time in seconds", async () => {
      const timer = new Timer()
      await new Promise(resolve => setTimeout(resolve, 10))
      const seconds = timer.elapsedSeconds()
      expect(seconds).toBeGreaterThanOrEqual(0.01)
    })

    it("should reset timer", async () => {
      const timer = new Timer()
      await new Promise(resolve => setTimeout(resolve, 10))
      timer.reset()
      const elapsed = timer.elapsed()
      expect(elapsed).toBeLessThan(10)
    })
  })

  describe("Constants", () => {
    it("should have default histogram buckets", () => {
      expect(DEFAULT_HISTOGRAM_BUCKETS).toBeInstanceOf(Array)
      expect(DEFAULT_HISTOGRAM_BUCKETS.length).toBeGreaterThan(0)
    })

    it("should have metric prefix", () => {
      expect(METRIC_PREFIX).toBe("familyload_")
    })
  })
})

// =============================================================================
// Tracing Tests
// =============================================================================

describe("Tracing Module", () => {
  beforeEach(() => {
    tracer.clearCompletedSpans()
  })

  describe("ID Generation", () => {
    it("should generate valid trace ID", () => {
      const traceId = generateTraceId()
      expect(traceId).toMatch(/^[a-f0-9]{32}$/)
    })

    it("should generate unique trace IDs", () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateTraceId())
      }
      expect(ids.size).toBe(100)
    })

    it("should generate valid span ID", () => {
      const spanId = generateSpanId()
      expect(spanId).toMatch(/^[a-f0-9]{16}$/)
    })

    it("should generate unique span IDs", () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateSpanId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe("Span Operations", () => {
    it("should start a span", () => {
      const span = tracer.startSpan("test-span")
      expect(span).toBeDefined()
      expect(span.getSpan().name).toBe("test-span")
    })

    it("should set span attributes", () => {
      const span = tracer.startSpan("test-span")
      span.setAttribute("key", "value")
      span.setAttribute("number", 42)
      span.setAttribute("bool", true)
      const spanData = span.getSpan()
      expect(spanData.attributes["key"]).toBe("value")
      expect(spanData.attributes["number"]).toBe(42)
      expect(spanData.attributes["bool"]).toBe(true)
    })

    it("should add span events", () => {
      const span = tracer.startSpan("test-span")
      span.addEvent("event-1", { detail: "info" })
      const spanData = span.getSpan()
      expect(spanData.events.length).toBe(1)
      expect(spanData.events[0]?.name).toBe("event-1")
    })

    it("should set span status", () => {
      const span = tracer.startSpan("test-span")
      span.setStatus("ok")
      expect(span.getSpan().status).toBe("ok")
    })

    it("should end span and record it", () => {
      tracer.setSamplingRate(1) // Always sample
      const span = tracer.startSpan("test-span", { sampled: true })
      const spanId = span.getSpan().context.spanId
      tracer.endSpan(spanId)
      const completed = tracer.getCompletedSpans()
      expect(completed.length).toBe(1)
      expect(completed[0]?.endTime).toBeDefined()
    })
  })

  describe("Context Propagation", () => {
    it("should create child span with parent context", () => {
      const parentSpan = tracer.startSpan("parent")
      const childSpan = tracer.startSpan("child", {
        parentContext: parentSpan.getSpan().context,
      })
      expect(childSpan.getSpan().context.traceId).toBe(parentSpan.getSpan().context.traceId)
      expect(childSpan.getSpan().context.parentSpanId).toBe(parentSpan.getSpan().context.spanId)
    })

    it("should extract context from headers", () => {
      const headers = new Headers()
      headers.set(TRACE_HEADER_NAME, "abc123def456")
      headers.set(SPAN_HEADER_NAME, "span123")
      const context = tracer.extractContext(headers)
      expect(context?.traceId).toBe("abc123def456")
      expect(context?.spanId).toBe("span123")
    })

    it("should inject context into headers", () => {
      const context = {
        traceId: "test-trace-id",
        spanId: "test-span-id",
        sampled: true,
      }
      const headers = new Headers()
      tracer.injectContext(context, headers)
      expect(headers.get(TRACE_HEADER_NAME)).toBe("test-trace-id")
      expect(headers.get(SPAN_HEADER_NAME)).toBe("test-span-id")
    })
  })

  describe("withSpan Helper", () => {
    it("should wrap async function with span", async () => {
      tracer.setSamplingRate(1)
      const result = await withSpan("test-operation", async (span) => {
        span.setAttribute("test", "value")
        return 42
      }, { sampled: true })
      expect(result).toBe(42)
    })

    it("should set error status on exception", async () => {
      tracer.setSamplingRate(1)
      try {
        await withSpan("error-operation", async () => {
          throw new Error("Test error")
        }, { sampled: true })
      } catch {
        // Expected
      }
      const spans = tracer.getCompletedSpans()
      expect(spans.some(s => s.status === "error")).toBe(true)
    })
  })

  describe("withSpanSync Helper", () => {
    it("should wrap sync function with span", () => {
      tracer.setSamplingRate(1)
      const result = withSpanSync("test-sync", (span) => {
        span.setAttribute("sync", true)
        return "sync-result"
      }, { sampled: true })
      expect(result).toBe("sync-result")
    })
  })

  describe("Constants", () => {
    it("should have trace header name", () => {
      expect(TRACE_HEADER_NAME).toBe("x-trace-id")
    })

    it("should have span header name", () => {
      expect(SPAN_HEADER_NAME).toBe("x-span-id")
    })

    it("should have default sampling rate", () => {
      expect(DEFAULT_SAMPLING_RATE).toBe(0.1)
    })
  })

  describe("Export", () => {
    it("should export spans as JSON", () => {
      tracer.setSamplingRate(1)
      const span = tracer.startSpan("export-test", { sampled: true })
      span.setAttribute("key", "value")
      tracer.endSpan(span.getSpan().context.spanId)
      const json = tracer.toJSON()
      expect(json).toBeInstanceOf(Array)
      expect(json.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// Health Checks Tests
// =============================================================================

describe("Health Checks Module", () => {
  beforeEach(() => {
    healthChecks.reset()
  })

  describe("Health Check Registration", () => {
    it("should register health check", () => {
      healthChecks.register("test-check", async () => ({
        name: "test-check",
        status: "healthy",
        timestamp: Date.now(),
      }))
      expect(healthChecks.getRegisteredChecks()).toContain("test-check")
    })

    it("should unregister health check", () => {
      healthChecks.register("temp-check", async () => ({
        name: "temp-check",
        status: "healthy",
        timestamp: Date.now(),
      }))
      expect(healthChecks.unregister("temp-check")).toBe(true)
      expect(healthChecks.getRegisteredChecks()).not.toContain("temp-check")
    })
  })

  describe("Health Check Execution", () => {
    it("should run health check", async () => {
      healthChecks.register("run-test", async () => ({
        name: "run-test",
        status: "healthy",
        message: "All good",
        timestamp: Date.now(),
      }))
      const result = await healthChecks.runCheck("run-test")
      expect(result.status).toBe("healthy")
      expect(result.message).toBe("All good")
    })

    it("should return unhealthy for missing check", async () => {
      const result = await healthChecks.runCheck("non-existent")
      expect(result.status).toBe("unhealthy")
      expect(result.message).toBe("Health check not found")
    })

    it("should handle check timeout", async () => {
      healthChecks.register("slow-check", async () => {
        await new Promise(resolve => setTimeout(resolve, 10000))
        return {
          name: "slow-check",
          status: "healthy",
          timestamp: Date.now(),
        }
      }, { timeout: 100 })
      const result = await healthChecks.runCheck("slow-check")
      expect(result.status).toBe("unhealthy")
      expect(result.message).toBe("Health check timeout")
    }, 5000)

    it("should handle check exception", async () => {
      healthChecks.register("error-check", async () => {
        throw new Error("Check failed")
      })
      const result = await healthChecks.runCheck("error-check")
      expect(result.status).toBe("unhealthy")
      expect(result.message).toBe("Check failed")
    })
  })

  describe("Overall Health", () => {
    it("should return healthy when all checks pass", async () => {
      healthChecks.register("check-1", async () => ({
        name: "check-1",
        status: "healthy",
        timestamp: Date.now(),
      }))
      healthChecks.register("check-2", async () => ({
        name: "check-2",
        status: "healthy",
        timestamp: Date.now(),
      }))
      const health = await healthChecks.runAllChecks()
      expect(health.status).toBe("healthy")
    })

    it("should return degraded when non-critical check fails", async () => {
      healthChecks.register("critical-check", async () => ({
        name: "critical-check",
        status: "healthy",
        timestamp: Date.now(),
      }), { critical: true })
      healthChecks.register("optional-check", async () => ({
        name: "optional-check",
        status: "degraded",
        timestamp: Date.now(),
      }), { critical: false })
      const health = await healthChecks.runAllChecks()
      expect(health.status).toBe("degraded")
    })

    it("should return unhealthy when critical check fails", async () => {
      healthChecks.register("critical-check", async () => ({
        name: "critical-check",
        status: "unhealthy",
        timestamp: Date.now(),
      }), { critical: true })
      const health = await healthChecks.runAllChecks()
      expect(health.status).toBe("unhealthy")
    })

    it("should include uptime in health response", async () => {
      const health = await healthChecks.runAllChecks()
      expect(health.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Liveness Check", () => {
    it("should return healthy liveness", async () => {
      const result = await livenessCheck()
      expect(result.status).toBe("healthy")
      expect(result.name).toBe("liveness")
    })
  })

  describe("Format Health Response", () => {
    it("should return 200 for healthy status", () => {
      const { statusCode } = formatHealthResponse({
        status: "healthy",
        checks: [],
        timestamp: Date.now(),
      })
      expect(statusCode).toBe(200)
    })

    it("should return 200 for degraded status", () => {
      const { statusCode } = formatHealthResponse({
        status: "degraded",
        checks: [],
        timestamp: Date.now(),
      })
      expect(statusCode).toBe(200)
    })

    it("should return 503 for unhealthy status", () => {
      const { statusCode } = formatHealthResponse({
        status: "unhealthy",
        checks: [],
        timestamp: Date.now(),
      })
      expect(statusCode).toBe(503)
    })
  })

  describe("Constants", () => {
    it("should have default timeout", () => {
      expect(DEFAULT_TIMEOUT).toBe(5000)
    })

    it("should have healthy threshold", () => {
      expect(HEALTHY_THRESHOLD_MS).toBe(100)
    })

    it("should have degraded threshold", () => {
      expect(DEGRADED_THRESHOLD_MS).toBe(500)
    })
  })

  describe("Last Results", () => {
    it("should store last results", async () => {
      healthChecks.register("store-test", async () => ({
        name: "store-test",
        status: "healthy",
        timestamp: Date.now(),
      }))
      await healthChecks.runCheck("store-test")
      const lastResult = healthChecks.getLastResult("store-test")
      expect(lastResult).toBeDefined()
      expect(lastResult?.status).toBe("healthy")
    })

    it("should get all last results", async () => {
      healthChecks.register("result-1", async () => ({
        name: "result-1",
        status: "healthy",
        timestamp: Date.now(),
      }))
      healthChecks.register("result-2", async () => ({
        name: "result-2",
        status: "healthy",
        timestamp: Date.now(),
      }))
      await healthChecks.runAllChecks()
      const results = healthChecks.getAllLastResults()
      expect(results.length).toBe(2)
    })
  })
})

// =============================================================================
// Advanced Health Checker Tests
// =============================================================================

import {
  determineOverallStatus,
  createHealthCheck,
  createDependencyHealth,
  createCircuitBreaker,
  recordSuccess as recordCircuitSuccess,
  recordFailure as recordCircuitFailure,
  shouldAllowRequest,
  executeWithCircuitBreaker,
  formatUptime,
  calculateErrorRate as calculateHealthErrorRate,
  isOperational,
  type HealthCheck as AdvHealthCheck,
  type DependencyHealth,
  type CircuitBreaker,
} from "@/lib/monitoring/health-checker"

describe("Advanced Health Checker", () => {
  describe("determineOverallStatus", () => {
    it("returns healthy when all checks pass", () => {
      const checks: AdvHealthCheck[] = [
        createHealthCheck("db", "healthy", 10),
        createHealthCheck("cache", "healthy", 5),
      ]
      const deps: DependencyHealth[] = []
      const status = determineOverallStatus(checks, deps)
      expect(status).toBe("healthy")
    })

    it("returns unhealthy when critical dependency fails", () => {
      const checks: AdvHealthCheck[] = []
      const deps: DependencyHealth[] = [
        createDependencyHealth("database", "database", "unhealthy", true, 100, "Connection refused"),
      ]
      const status = determineOverallStatus(checks, deps)
      expect(status).toBe("unhealthy")
    })

    it("returns degraded when non-critical checks fail", () => {
      const checks: AdvHealthCheck[] = [
        createHealthCheck("main", "healthy", 10),
        createHealthCheck("optional", "degraded", 500, "Slow response"),
      ]
      const deps: DependencyHealth[] = []
      const status = determineOverallStatus(checks, deps)
      expect(status).toBe("degraded")
    })
  })

  describe("Circuit Breaker", () => {
    let breaker: CircuitBreaker

    beforeEach(() => {
      breaker = createCircuitBreaker("test", {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      })
    })

    it("starts in closed state", () => {
      expect(breaker.state).toBe("closed")
      expect(breaker.failureCount).toBe(0)
    })

    it("opens after reaching failure threshold", () => {
      let currentBreaker = breaker
      for (let i = 0; i < 3; i++) {
        currentBreaker = recordCircuitFailure(currentBreaker)
      }
      expect(currentBreaker.state).toBe("open")
    })

    it("resets failure count on success", () => {
      const afterFailure = recordCircuitFailure(breaker)
      const afterSuccess = recordCircuitSuccess(afterFailure)
      expect(afterSuccess.failureCount).toBe(0)
    })

    it("rejects requests when open", () => {
      let currentBreaker = breaker
      for (let i = 0; i < 3; i++) {
        currentBreaker = recordCircuitFailure(currentBreaker)
      }
      const { allowed } = shouldAllowRequest(currentBreaker)
      expect(allowed).toBe(false)
    })

    it("executes operation with circuit breaker", async () => {
      const operation = async () => "success"
      const { result, breaker: newBreaker } = await executeWithCircuitBreaker(breaker, operation)
      expect(result).toBe("success")
      expect(newBreaker.metrics.successfulRequests).toBe(1)
    })
  })

  describe("Utility Functions", () => {
    it("formats uptime correctly", () => {
      expect(formatUptime(5000)).toBe("5s")
      expect(formatUptime(65000)).toBe("1m 5s")
      expect(formatUptime(3665000)).toBe("1h 1m 5s")
    })

    it("calculates error rate correctly", () => {
      expect(calculateHealthErrorRate(90, 10)).toBe(10)
      expect(calculateHealthErrorRate(100, 0)).toBe(0)
    })

    it("checks operational status", () => {
      expect(isOperational("healthy")).toBe(true)
      expect(isOperational("degraded")).toBe(true)
      expect(isOperational("unhealthy")).toBe(false)
    })
  })
})

// =============================================================================
// Alerting Tests
// =============================================================================

import {
  createAlert,
  resolveAlert,
  acknowledgeAlert,
  silenceAlert,
  isAlertSilenced,
  getSeverityLevel,
  evaluateThreshold,
  evaluateAlertRule,
  evaluateAllRules,
  calculateMetricStats,
  detectSpike,
  detectDrop,
  generateAlertFingerprint,
  groupAlerts,
  deduplicateAlerts,
  formatAlertForSlack,
  formatAlertForEmail,
  calculateAlertStatistics,
  getActiveAlerts,
  getCriticalAlerts,
  DEFAULT_ALERT_RULES,
  type Alert,
  type AlertRule,
  type MetricDataPoint,
} from "@/lib/monitoring/alerting"

describe("Alerting System", () => {
  describe("Alert Management", () => {
    it("creates alert with correct properties", () => {
      const alert = createAlert("High CPU", "CPU usage above 90%", "critical", "monitoring", { metric: "cpu_usage", value: 95, threshold: 90 })
      expect(alert.name).toBe("High CPU")
      expect(alert.severity).toBe("critical")
      expect(alert.status).toBe("firing")
      expect(alert.value).toBe(95)
    })

    it("resolves alert", () => {
      const alert = createAlert("Test", "Test alert", "warning", "test")
      const resolved = resolveAlert(alert)
      expect(resolved.status).toBe("resolved")
      expect(resolved.endsAt).toBeDefined()
    })

    it("acknowledges alert", () => {
      const alert = createAlert("Test", "Test alert", "warning", "test")
      const acknowledged = acknowledgeAlert(alert, "admin")
      expect(acknowledged.status).toBe("acknowledged")
      expect(acknowledged.acknowledgedBy).toBe("admin")
    })

    it("silences alert", () => {
      const alert = createAlert("Test", "Test alert", "warning", "test")
      const until = new Date(Date.now() + 3600000)
      const silenced = silenceAlert(alert, until)
      expect(silenced.status).toBe("silenced")
      expect(isAlertSilenced(silenced)).toBe(true)
    })

    it("generates unique fingerprints", () => {
      const fp1 = generateAlertFingerprint("Alert1", "source1", { env: "prod" })
      const fp2 = generateAlertFingerprint("Alert1", "source1", { env: "staging" })
      const fp3 = generateAlertFingerprint("Alert1", "source1", { env: "prod" })
      expect(fp1).not.toBe(fp2)
      expect(fp1).toBe(fp3)
    })
  })

  describe("Threshold Evaluation", () => {
    it("evaluates gt threshold correctly", () => {
      expect(evaluateThreshold(100, { operator: "gt", value: 90 })).toBe(true)
      expect(evaluateThreshold(90, { operator: "gt", value: 90 })).toBe(false)
    })

    it("evaluates gte threshold correctly", () => {
      expect(evaluateThreshold(90, { operator: "gte", value: 90 })).toBe(true)
      expect(evaluateThreshold(89, { operator: "gte", value: 90 })).toBe(false)
    })

    it("evaluates lt threshold correctly", () => {
      expect(evaluateThreshold(80, { operator: "lt", value: 90 })).toBe(true)
      expect(evaluateThreshold(90, { operator: "lt", value: 90 })).toBe(false)
    })

    it("evaluates alert rules", () => {
      const rule: AlertRule = {
        id: "test", name: "Test Rule", description: "Test", metric: "cpu_usage",
        condition: { operator: "gt", value: 80 }, severity: "warning", for: 0,
        labels: {}, annotations: {}, channels: ["slack"], enabled: true, cooldown: 0,
      }
      const alert = evaluateAlertRule(rule, 85, "test-source")
      expect(alert).not.toBeNull()
      expect(alert?.severity).toBe("warning")
      const noAlert = evaluateAlertRule(rule, 75, "test-source")
      expect(noAlert).toBeNull()
    })

    it("evaluates all rules against metrics", () => {
      const metricsData = { error_rate: 10, avg_response_time: 100, cpu_usage: 50 }
      const alerts = evaluateAllRules(DEFAULT_ALERT_RULES, metricsData, "test")
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts.some(a => a.name === "High Error Rate")).toBe(true)
    })
  })

  describe("Anomaly Detection", () => {
    it("calculates metric statistics", () => {
      const dataPoints: MetricDataPoint[] = [
        { timestamp: new Date(), value: 10 }, { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 }, { timestamp: new Date(), value: 40 }, { timestamp: new Date(), value: 50 },
      ]
      const stats = calculateMetricStats(dataPoints)
      expect(stats.mean).toBe(30)
      expect(stats.min).toBe(10)
      expect(stats.max).toBe(50)
    })

    it("detects spike anomaly", () => {
      const stats = { mean: 50, stdDev: 5, min: 40, max: 60, median: 50, p95: 58, p99: 59 }
      const spike = detectSpike(100, stats, 0.7)
      expect(spike.detected).toBe(true)
      expect(spike.type).toBe("spike")
      const noSpike = detectSpike(52, stats, 0.7)
      expect(noSpike.detected).toBe(false)
    })

    it("detects drop anomaly", () => {
      const stats = { mean: 50, stdDev: 5, min: 40, max: 60, median: 50, p95: 58, p99: 59 }
      const drop = detectDrop(10, stats, 0.7)
      expect(drop.detected).toBe(true)
      expect(drop.type).toBe("drop")
    })
  })

  describe("Alert Grouping", () => {
    it("groups alerts by labels", () => {
      const alerts: Alert[] = [
        createAlert("Alert1", "Desc", "warning", "src", { labels: { env: "prod" } }),
        createAlert("Alert2", "Desc", "error", "src", { labels: { env: "prod" } }),
        createAlert("Alert3", "Desc", "warning", "src", { labels: { env: "staging" } }),
      ]
      const groups = groupAlerts(alerts, ["env"])
      expect(groups.length).toBe(2)
      const prodGroup = groups.find(g => g.key === "env=prod")
      expect(prodGroup?.alerts.length).toBe(2)
    })

    it("deduplicates alerts by fingerprint", () => {
      const alert1 = createAlert("Same", "Desc", "warning", "src", { labels: { key: "val" } })
      const alert2 = createAlert("Same", "Desc", "error", "src", { labels: { key: "val" } })
      const alert3 = createAlert("Different", "Desc", "warning", "src", { labels: { key: "val" } })
      const deduplicated = deduplicateAlerts([alert1, alert2, alert3])
      expect(deduplicated.length).toBe(2)
    })
  })

  describe("Alert Formatting", () => {
    it("formats alert for Slack", () => {
      const alert = createAlert("Test Alert", "This is a test", "error", "test-source")
      const formatted = formatAlertForSlack(alert)
      expect(formatted.text).toContain("Test Alert")
      expect(formatted.blocks.length).toBeGreaterThan(0)
    })

    it("formats alert for email", () => {
      const alert = createAlert("Test Alert", "This is a test", "critical", "test-source")
      const { subject, body, html } = formatAlertForEmail(alert)
      expect(subject).toContain("[CRITICAL]")
      expect(body).toContain("Test Alert")
      expect(html).toContain("Test Alert")
    })
  })

  describe("Alert Statistics", () => {
    it("calculates alert statistics", () => {
      const alerts: Alert[] = [
        createAlert("A1", "Desc", "warning", "src"),
        createAlert("A2", "Desc", "error", "src"),
        createAlert("A3", "Desc", "critical", "src"),
      ]
      const stats = calculateAlertStatistics(alerts)
      expect(stats.totalAlerts).toBe(3)
      expect(stats.bySeverity.warning).toBe(1)
      expect(stats.bySeverity.error).toBe(1)
      expect(stats.bySeverity.critical).toBe(1)
    })

    it("filters active alerts", () => {
      const alert1 = createAlert("A1", "Desc", "warning", "src")
      const alert2 = resolveAlert(createAlert("A2", "Desc", "error", "src"))
      const alert3 = acknowledgeAlert(createAlert("A3", "Desc", "critical", "src"), "admin")
      const active = getActiveAlerts([alert1, alert2, alert3])
      expect(active.length).toBe(2)
    })

    it("filters critical alerts", () => {
      const alert1 = createAlert("A1", "Desc", "warning", "src")
      const alert2 = createAlert("A2", "Desc", "critical", "src")
      const alert3 = resolveAlert(createAlert("A3", "Desc", "critical", "src"))
      const critical = getCriticalAlerts([alert1, alert2, alert3])
      expect(critical.length).toBe(1)
    })
  })
})

// =============================================================================
// Performance Tracker Tests
// =============================================================================

import {
  createSlidingWindow,
  addToWindow,
  getRecentFromWindow,
  createHistogram as createPerfHistogram,
  recordInHistogram,
  getHistogramPercentile,
  getHistogramAverage,
  createResponseTimeMetrics,
  recordResponseTime,
  getResponseTimeLevel,
  createErrorMetrics,
  recordSuccess as recordErrorSuccess,
  recordError,
  calculateErrorRate,
  getErrorRateLevel,
  createResourceMetrics,
  calculateCpuSaturation,
  calculateMemorySaturation,
  getResourceLevel,
  calculateThroughput,
  calculateTrendDirection,
  analyzeTrend,
  calculatePerformanceScore,
  formatDuration,
  formatBytes,
  formatPercent,
} from "@/lib/monitoring/performance-tracker"

describe("Performance Tracker", () => {
  describe("Sliding Window", () => {
    it("creates and adds to window", () => {
      let window = createSlidingWindow<number>(5)
      window = addToWindow(window, 1)
      window = addToWindow(window, 2)
      window = addToWindow(window, 3)
      expect(window.data.length).toBe(3)
    })

    it("trims to max size", () => {
      let window = createSlidingWindow<number>(3)
      for (let i = 0; i < 5; i++) {
        window = addToWindow(window, i)
      }
      expect(window.data.length).toBe(3)
      expect(window.data).toEqual([2, 3, 4])
    })

    it("gets recent values", () => {
      let window = createSlidingWindow<number>(10)
      window = addToWindow(window, 1)
      window = addToWindow(window, 2)
      const recent = getRecentFromWindow(window, 1000)
      expect(recent.length).toBe(2)
    })
  })

  describe("Histogram", () => {
    it("records values in correct buckets", () => {
      let histogram = createPerfHistogram([10, 50, 100, 500])
      histogram = recordInHistogram(histogram, 5)
      histogram = recordInHistogram(histogram, 25)
      histogram = recordInHistogram(histogram, 75)
      histogram = recordInHistogram(histogram, 1000)
      expect(histogram.counts[0]).toBe(1)
      expect(histogram.counts[1]).toBe(1)
      expect(histogram.counts[2]).toBe(1)
      expect(histogram.counts[4]).toBe(1)
      expect(histogram.count).toBe(4)
    })

    it("calculates percentiles", () => {
      let histogram = createPerfHistogram([10, 50, 100, 500])
      for (let i = 0; i < 100; i++) {
        histogram = recordInHistogram(histogram, i % 100)
      }
      const p50 = getHistogramPercentile(histogram, 50)
      expect(p50).toBeLessThanOrEqual(100)
    })

    it("calculates average", () => {
      let histogram = createPerfHistogram([100])
      histogram = recordInHistogram(histogram, 50)
      histogram = recordInHistogram(histogram, 100)
      expect(getHistogramAverage(histogram)).toBe(75)
    })
  })

  describe("Response Time Tracking", () => {
    it("creates response time metrics", () => {
      const metricsData = createResponseTimeMetrics("/api/test", "GET")
      expect(metricsData.endpoint).toBe("/api/test")
      expect(metricsData.method).toBe("GET")
      expect(metricsData.count).toBe(0)
    })

    it("records response times", () => {
      let metricsData = createResponseTimeMetrics("/api/test", "GET")
      metricsData = recordResponseTime(metricsData, 100)
      metricsData = recordResponseTime(metricsData, 200)
      metricsData = recordResponseTime(metricsData, 300)
      expect(metricsData.count).toBe(3)
      expect(metricsData.avg).toBe(200)
      expect(metricsData.min).toBe(100)
      expect(metricsData.max).toBe(300)
    })

    it("determines response time level", () => {
      expect(getResponseTimeLevel(50)).toBe("excellent")
      expect(getResponseTimeLevel(150)).toBe("good")
      expect(getResponseTimeLevel(400)).toBe("acceptable")
      expect(getResponseTimeLevel(800)).toBe("poor")
      expect(getResponseTimeLevel(3000)).toBe("critical")
    })
  })

  describe("Error Rate Tracking", () => {
    it("records successes and errors", () => {
      let metricsData = createErrorMetrics("/api/test", "GET")
      metricsData = recordErrorSuccess(metricsData)
      metricsData = recordErrorSuccess(metricsData)
      metricsData = recordError(metricsData, { statusCode: 500, errorType: "ServerError", message: "Internal error" })
      expect(metricsData.totalRequests).toBe(3)
      expect(metricsData.successfulRequests).toBe(2)
      expect(metricsData.failedRequests).toBe(1)
      expect(metricsData.errorRate).toBeCloseTo(33.33, 1)
    })

    it("calculates error rate level", () => {
      expect(getErrorRateLevel(0.05)).toBe("excellent")
      expect(getErrorRateLevel(0.3)).toBe("good")
      expect(getErrorRateLevel(0.8)).toBe("acceptable")
      expect(getErrorRateLevel(3)).toBe("poor")
      expect(getErrorRateLevel(15)).toBe("critical")
    })
  })

  describe("Resource Monitoring", () => {
    it("creates resource metrics", () => {
      const metricsData = createResourceMetrics()
      expect(metricsData.cpu.usage).toBe(0)
      expect(metricsData.memory.total).toBe(0)
    })

    it("calculates CPU saturation", () => {
      const saturation = calculateCpuSaturation({ usage: 80, system: 20, user: 60, idle: 20, loadAvg: [2, 2, 2] })
      expect(saturation).toBe(0.8)
    })

    it("calculates memory saturation", () => {
      const saturation = calculateMemorySaturation({ total: 1000, used: 750, free: 250, usagePercent: 75 })
      expect(saturation).toBe(0.75)
    })

    it("determines resource level", () => {
      expect(getResourceLevel(30)).toBe("excellent")
      expect(getResourceLevel(50)).toBe("good")
      expect(getResourceLevel(70)).toBe("acceptable")
      expect(getResourceLevel(85)).toBe("poor")
      expect(getResourceLevel(95)).toBe("critical")
    })
  })

  describe("Throughput", () => {
    it("calculates throughput stats", () => {
      const requestCounts = [100, 120, 110, 130, 115]
      const stats = calculateThroughput(requestCounts, 1000)
      expect(stats.requestsPerSecond).toBe(115)
      expect(stats.peakRps).toBe(130)
      expect(stats.avgRps).toBeCloseTo(115, 0)
    })
  })

  describe("Trend Analysis", () => {
    it("detects upward trend", () => {
      const values = [100, 110, 120, 130, 140, 150]
      const direction = calculateTrendDirection(values)
      expect(direction).toBe("up")
    })

    it("detects downward trend", () => {
      const values = [150, 140, 130, 120, 110, 100]
      const direction = calculateTrendDirection(values)
      expect(direction).toBe("down")
    })

    it("detects stable trend", () => {
      const values = [100, 101, 99, 100, 100, 101]
      const direction = calculateTrendDirection(values)
      expect(direction).toBe("stable")
    })

    it("analyzes trend with metrics", () => {
      const values = [100, 120, 140, 160, 180, 200]
      const trend = analyzeTrend("response_time", values, "1h")
      expect(trend).not.toBeNull()
      expect(trend?.direction).toBe("up")
      expect(trend?.changePercent).toBe(100)
    })
  })

  describe("Performance Scoring", () => {
    it("calculates performance score", () => {
      const { score, level } = calculatePerformanceScore({ avg: 100, p95: 200 }, 0.5, { cpu: 30, memory: 40 })
      expect(score).toBeGreaterThan(50)
      expect(["excellent", "good", "acceptable"]).toContain(level)
    })

    it("penalizes high error rate", () => {
      const { score: goodScore } = calculatePerformanceScore({ avg: 100, p95: 200 }, 0.5, { cpu: 30, memory: 40 })
      const { score: badScore } = calculatePerformanceScore({ avg: 100, p95: 200 }, 10, { cpu: 30, memory: 40 })
      expect(badScore).toBeLessThan(goodScore)
    })
  })

  describe("Formatting", () => {
    it("formats duration correctly", () => {
      expect(formatDuration(0.5)).toContain("µs")
      expect(formatDuration(500)).toBe("500.00ms")
      expect(formatDuration(1500)).toBe("1.50s")
      expect(formatDuration(90000)).toBe("1.50m")
    })

    it("formats bytes correctly", () => {
      expect(formatBytes(500)).toBe("500.00 B")
      expect(formatBytes(1500)).toContain("KB")
      expect(formatBytes(1500000)).toContain("MB")
    })

    it("formats percent correctly", () => {
      expect(formatPercent(75.5)).toBe("75.50%")
    })
  })
})

// =============================================================================
// User Analytics Tests
// =============================================================================

import {
  createAnalyticsEvent,
  createPageViewEvent,
  createFeatureUseEvent,
  createFeatureUsage,
  recordFeatureUsage,
  getTopFeatures,
  analyzeFunnel,
  calculateChurnRate,
  determineUserSegment,
  segmentUsers,
  calculateEngagementScore,
  getEngagementLevel,
  analyzeActivityPattern,
  getDayName,
  formatHour,
  DEFAULT_FUNNELS,
  type FeatureUsage,
  type FunnelDefinition,
} from "@/lib/monitoring/user-analytics"

describe("User Analytics", () => {
  describe("Event Creation", () => {
    it("creates analytics event", () => {
      const event = createAnalyticsEvent("user123", "feature_use", "task_created", "tasks", "session456", { taskType: "chore" })
      expect(event.userId).toBe("user123")
      expect(event.type).toBe("feature_use")
      expect(event.name).toBe("task_created")
      expect(event.properties["taskType"]).toBe("chore")
    })

    it("creates page view event", () => {
      const event = createPageViewEvent("user123", "session456", "Dashboard", "/dashboard")
      expect(event.type).toBe("page_view")
      expect(event.name).toBe("Dashboard")
      expect(event.properties["path"]).toBe("/dashboard")
    })

    it("creates feature use event", () => {
      const event = createFeatureUseEvent("user123", "session456", "task_assignment", "tasks", { assigneeId: "member123" })
      expect(event.type).toBe("feature_use")
      expect(event.name).toBe("task_assignment")
    })
  })

  describe("Feature Usage", () => {
    it("creates feature usage tracker", () => {
      const usage = createFeatureUsage("task_creation", "tasks")
      expect(usage.featureName).toBe("task_creation")
      expect(usage.totalUses).toBe(0)
      expect(usage.uniqueUsers).toBe(0)
    })

    it("records feature usage", () => {
      let usage = createFeatureUsage("task_creation", "tasks")
      const existingUsers = new Set<string>()
      usage = recordFeatureUsage(usage, "user1", "active", existingUsers)
      existingUsers.add("user1")
      usage = recordFeatureUsage(usage, "user1", "active", existingUsers)
      usage = recordFeatureUsage(usage, "user2", "new", existingUsers)
      expect(usage.totalUses).toBe(3)
      expect(usage.uniqueUsers).toBe(2)
      expect(usage.avgUsesPerUser).toBe(1.5)
    })

    it("gets top features", () => {
      const usageMap = new Map<string, FeatureUsage>()
      let usage1 = createFeatureUsage("feature1", "cat")
      usage1 = { ...usage1, totalUses: 100, uniqueUsers: 50 }
      usageMap.set("feature1", usage1)
      let usage2 = createFeatureUsage("feature2", "cat")
      usage2 = { ...usage2, totalUses: 200, uniqueUsers: 75 }
      usageMap.set("feature2", usage2)
      const top = getTopFeatures(usageMap, 2)
      expect(top[0]!.name).toBe("feature2")
      expect(top[0]!.uses).toBe(200)
    })
  })

  describe("Funnel Analysis", () => {
    it("analyzes simple funnel", () => {
      const funnel: FunnelDefinition = {
        id: "test", name: "Test Funnel", description: "Test",
        steps: [{ name: "Step 1", eventName: "event1" }, { name: "Step 2", eventName: "event2" }],
        timeWindow: 86400000,
      }
      const now = new Date()
      const events = [
        { ...createAnalyticsEvent("user1", "action", "event1", "test", "s1"), timestamp: new Date(now.getTime() - 10000) },
        { ...createAnalyticsEvent("user1", "action", "event2", "test", "s1"), timestamp: now },
        { ...createAnalyticsEvent("user2", "action", "event1", "test", "s2"), timestamp: new Date(now.getTime() - 10000) },
      ]
      const result = analyzeFunnel(funnel, events, new Date(now.getTime() - 100000), now)
      expect(result.steps.length).toBe(2)
      expect(result.steps[0]!.completed).toBe(2)
      expect(result.steps[1]!.completed).toBe(1)
      expect(result.overallConversion).toBe(50)
    })

    it("has default funnels defined", () => {
      expect(DEFAULT_FUNNELS.length).toBeGreaterThan(0)
      expect(DEFAULT_FUNNELS[0]!.steps.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("Retention", () => {
    it("calculates churn rate", () => {
      const churnRate = calculateChurnRate(100, 90, 10)
      expect(churnRate).toBeCloseTo(18.18, 1)
    })
  })

  describe("User Segmentation", () => {
    it("determines new user segment", () => {
      const now = new Date()
      const firstSeen = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const lastSeen = now
      const segment = determineUserSegment("user1", firstSeen, lastSeen, 5, 50, now)
      expect(segment).toBe("new")
    })

    it("determines churned user segment", () => {
      const now = new Date()
      const firstSeen = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const lastSeen = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
      const segment = determineUserSegment("user1", firstSeen, lastSeen, 10, 100, now)
      expect(segment).toBe("churned")
    })

    it("determines power user segment", () => {
      const now = new Date()
      const firstSeen = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const lastSeen = now
      // Power user needs ~5 sessions/week (21 in 30 days) and ~15 actions/session (315 total)
      const segment = determineUserSegment("user1", firstSeen, lastSeen, 25, 400, now)
      expect(segment).toBe("power")
    })

    it("segments multiple users", () => {
      const now = new Date()
      const users = [
        { userId: "new1", firstSeen: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), lastSeen: now, sessionCount: 3, actionsCount: 15 },
        { userId: "active1", firstSeen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), lastSeen: now, sessionCount: 10, actionsCount: 50 },
      ]
      const segments = segmentUsers(users)
      expect(segments.get("new")!.includes("new1")).toBe(true)
      expect(segments.get("active")!.includes("active1")).toBe(true)
    })
  })

  describe("Engagement Scoring", () => {
    it("calculates engagement score", () => {
      const score = calculateEngagementScore(30, 15, 8, 10, 10)
      expect(score).toBeGreaterThan(80)
    })

    it("determines engagement level", () => {
      expect(getEngagementLevel(95)).toBe("power")
      expect(getEngagementLevel(80)).toBe("high")
      expect(getEngagementLevel(60)).toBe("medium")
      expect(getEngagementLevel(15)).toBe("low")
    })
  })

  describe("Activity Patterns", () => {
    it("analyzes user activity pattern", () => {
      const events = []
      const baseDate = new Date()
      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate)
        date.setHours(14)
        date.setDate(date.getDate() - i)
        events.push({ ...createFeatureUseEvent("user1", `session${i}`, "feature1", "cat"), timestamp: date })
      }
      const pattern = analyzeActivityPattern("user1", events)
      expect(pattern.userId).toBe("user1")
      expect(pattern.peakHours).toContain(14)
      expect(pattern.preferredFeatures).toContain("feature1")
    })

    it("formats day names", () => {
      expect(getDayName(0)).toBe("Sunday")
      expect(getDayName(1)).toBe("Monday")
      expect(getDayName(6)).toBe("Saturday")
    })

    it("formats hours", () => {
      expect(formatHour(0)).toBe("12:00 AM")
      expect(formatHour(12)).toBe("12:00 PM")
      expect(formatHour(14)).toBe("2:00 PM")
      expect(formatHour(23)).toBe("11:00 PM")
    })
  })
})
