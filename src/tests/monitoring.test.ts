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
      await new Promise(resolve => setTimeout(resolve, 10))
      const elapsed = timer.elapsed()
      expect(elapsed).toBeGreaterThanOrEqual(10)
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
