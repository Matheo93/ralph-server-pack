import { describe, it, expect, beforeEach } from "vitest"
import {
  performanceStore,
  rateMetric,
  trackError,
  getPerformanceReport,
  type WebVitalsMetric,
  type APITiming,
} from "@/lib/services/performance"
import {
  sanitizeString,
  containsSQLInjection,
  containsXSS,
  validateUserInput,
  uuidSchema,
  emailSchema,
  safeStringSchema,
  taskTitleSchema,
  generateSecurityAuditReport,
} from "@/lib/services/security-audit"

describe("Performance Monitoring", () => {
  beforeEach(() => {
    performanceStore.clear()
  })

  describe("rateMetric", () => {
    it("rates LCP correctly", () => {
      expect(rateMetric("LCP", 1500)).toBe("good")
      expect(rateMetric("LCP", 3000)).toBe("needs-improvement")
      expect(rateMetric("LCP", 5000)).toBe("poor")
    })

    it("rates CLS correctly", () => {
      expect(rateMetric("CLS", 0.05)).toBe("good")
      expect(rateMetric("CLS", 0.15)).toBe("needs-improvement")
      expect(rateMetric("CLS", 0.5)).toBe("poor")
    })

    it("rates FID correctly", () => {
      expect(rateMetric("FID", 50)).toBe("good")
      expect(rateMetric("FID", 200)).toBe("needs-improvement")
      expect(rateMetric("FID", 500)).toBe("poor")
    })

    it("rates TTFB correctly", () => {
      expect(rateMetric("TTFB", 500)).toBe("good")
      expect(rateMetric("TTFB", 1000)).toBe("needs-improvement")
      expect(rateMetric("TTFB", 2500)).toBe("poor")
    })
  })

  describe("PerformanceStore", () => {
    it("adds and retrieves web vitals", () => {
      const metric: WebVitalsMetric = {
        name: "LCP",
        value: 2000,
        rating: "good",
        delta: 100,
        id: "test-1",
        navigationType: "navigate",
      }

      performanceStore.addWebVital(metric)
      const vitals = performanceStore.getWebVitals()

      expect(vitals).toHaveLength(1)
      expect(vitals[0]!.name).toBe("LCP")
    })

    it("adds and retrieves API timings", () => {
      const timing: APITiming = {
        endpoint: "/api/tasks",
        method: "GET",
        duration: 150,
        status: 200,
        timestamp: new Date(),
      }

      performanceStore.addAPITiming(timing)
      const timings = performanceStore.getAPITimings()

      expect(timings).toHaveLength(1)
      expect(timings[0]!.endpoint).toBe("/api/tasks")
    })

    it("calculates average API time", () => {
      performanceStore.addAPITiming({
        endpoint: "/api/tasks",
        method: "GET",
        duration: 100,
        status: 200,
        timestamp: new Date(),
      })
      performanceStore.addAPITiming({
        endpoint: "/api/tasks",
        method: "GET",
        duration: 200,
        status: 200,
        timestamp: new Date(),
      })

      const avg = performanceStore.getAverageAPITime()
      expect(avg).toBe(150)
    })

    it("calculates average API time for specific endpoint", () => {
      performanceStore.addAPITiming({
        endpoint: "/api/tasks",
        method: "GET",
        duration: 100,
        status: 200,
        timestamp: new Date(),
      })
      performanceStore.addAPITiming({
        endpoint: "/api/children",
        method: "GET",
        duration: 200,
        status: 200,
        timestamp: new Date(),
      })

      const avg = performanceStore.getAverageAPITime("/api/tasks")
      expect(avg).toBe(100)
    })

    it("returns summary correctly", () => {
      performanceStore.addWebVital({
        name: "LCP",
        value: 2000,
        rating: "good",
        delta: 100,
        id: "test-1",
        navigationType: "navigate",
      })

      const summary = performanceStore.getSummary()
      expect(summary.webVitals["LCP"]).toBeDefined()
      expect(summary.apiTimingsCount).toBe(0)
    })

    it("clears store correctly", () => {
      performanceStore.addWebVital({
        name: "LCP",
        value: 2000,
        rating: "good",
        delta: 100,
        id: "test-1",
        navigationType: "navigate",
      })

      performanceStore.clear()

      expect(performanceStore.getWebVitals()).toHaveLength(0)
      expect(performanceStore.getAPITimings()).toHaveLength(0)
      expect(performanceStore.getErrors()).toHaveLength(0)
    })
  })

  describe("trackError", () => {
    it("adds error to store", () => {
      trackError("Test error", { url: "/test" })

      const errors = performanceStore.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0]!.message).toBe("Test error")
    })
  })

  describe("getPerformanceReport", () => {
    it("returns correct report format", () => {
      const report = getPerformanceReport()

      expect(report).toHaveProperty("webVitals")
      expect(report).toHaveProperty("apiTimingsCount")
      expect(report).toHaveProperty("averageAPITime")
      expect(report).toHaveProperty("errorsCount")
      expect(report).toHaveProperty("errorRate")
    })
  })
})

describe("Security Audit", () => {
  describe("sanitizeString", () => {
    it("escapes HTML entities", () => {
      expect(sanitizeString("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
      )
    })

    it("escapes quotes", () => {
      expect(sanitizeString('Test "quoted" text')).toBe(
        "Test &quot;quoted&quot; text"
      )
    })

    it("handles normal text", () => {
      expect(sanitizeString("Hello World")).toBe("Hello World")
    })
  })

  describe("containsSQLInjection", () => {
    it("detects SELECT injection", () => {
      expect(containsSQLInjection("'; SELECT * FROM users --")).toBe(true)
    })

    it("detects DROP TABLE", () => {
      expect(containsSQLInjection("'; DROP TABLE users; --")).toBe(true)
    })

    it("detects OR 1=1", () => {
      expect(containsSQLInjection("' OR 1=1 --")).toBe(true)
    })

    it("detects UNION SELECT", () => {
      expect(containsSQLInjection("' UNION SELECT * FROM passwords --")).toBe(true)
    })

    it("allows normal text", () => {
      expect(containsSQLInjection("Hello World")).toBe(false)
    })

    it("allows normal queries", () => {
      expect(containsSQLInjection("Buy groceries for the family")).toBe(false)
    })
  })

  describe("containsXSS", () => {
    it("detects script tags", () => {
      expect(containsXSS("<script>alert('xss')</script>")).toBe(true)
    })

    it("detects event handlers", () => {
      expect(containsXSS('<img onerror="alert(1)">')).toBe(true)
    })

    it("detects javascript: protocol", () => {
      expect(containsXSS("javascript:alert(1)")).toBe(true)
    })

    it("detects iframe", () => {
      expect(containsXSS("<iframe src='evil.com'>")).toBe(true)
    })

    it("allows normal text", () => {
      expect(containsXSS("Hello World")).toBe(false)
    })

    it("allows normal HTML-like text", () => {
      expect(containsXSS("temperature > 0")).toBe(false)
    })
  })

  describe("validateUserInput", () => {
    it("validates clean input", () => {
      const result = validateUserInput("Hello World")
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects too long input", () => {
      const longInput = "a".repeat(1001)
      const result = validateUserInput(longInput)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Input exceeds maximum length of 1000 characters")
    })

    it("rejects SQL injection", () => {
      const result = validateUserInput("'; DROP TABLE users; --")
      expect(result.valid).toBe(false)
    })

    it("rejects XSS", () => {
      const result = validateUserInput("<script>alert('xss')</script>")
      expect(result.valid).toBe(false)
    })

    it("sanitizes output", () => {
      const result = validateUserInput("<div>Test</div>")
      expect(result.sanitized).toBe("&lt;div&gt;Test&lt;&#x2F;div&gt;")
    })
  })

  describe("Zod Schemas", () => {
    it("validates UUID", () => {
      expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true)
      expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false)
    })

    it("validates email", () => {
      expect(emailSchema.safeParse("test@example.com").success).toBe(true)
      expect(emailSchema.safeParse("invalid-email").success).toBe(false)
    })

    it("validates safe string", () => {
      expect(safeStringSchema.safeParse("Normal text").success).toBe(true)
      expect(safeStringSchema.safeParse("").success).toBe(false) // empty
    })

    it("validates task title", () => {
      expect(taskTitleSchema.safeParse("Buy groceries").success).toBe(true)
      expect(taskTitleSchema.safeParse("").success).toBe(false)
      expect(taskTitleSchema.safeParse("a".repeat(201)).success).toBe(false)
    })
  })

  describe("generateSecurityAuditReport", () => {
    it("returns complete report", () => {
      const report = generateSecurityAuditReport()

      expect(report.timestamp).toBeInstanceOf(Date)
      expect(report.inputValidation.sqlInjectionProtected).toBe(true)
      expect(report.inputValidation.xssProtected).toBe(true)
      expect(report.inputValidation.zodValidation).toBe(true)
      expect(report.authentication.supabaseAuth).toBe(true)
      expect(report.authorization.rlsEnabled).toBe(true)
      expect(report.authorization.tablesWithRLS.length).toBeGreaterThan(0)
      expect(report.notes.length).toBeGreaterThan(0)
    })
  })
})
