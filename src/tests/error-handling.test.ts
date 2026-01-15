import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  reportError,
  reportUnhandledError,
  createErrorReporter,
  getErrorQueueStatus,
  flushErrorQueue,
} from "@/lib/error-reporting"

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe("Error Reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    flushErrorQueue()
  })

  describe("reportError", () => {
    it("should generate unique error IDs", () => {
      const error = new Error("Test error")
      const report1 = reportError(error)
      const report2 = reportError(new Error("Another error"))

      expect(report1.id).toBeDefined()
      expect(report2.id).toBeDefined()
      expect(report1.id).not.toBe(report2.id)
    })

    it("should classify network errors correctly", () => {
      const networkError = new Error("Failed to fetch data")
      const report = reportError(networkError)

      expect(report.category).toBe("network")
    })

    it("should classify auth errors correctly", () => {
      const authError = new Error("401 Unauthorized")
      const report = reportError(authError)

      expect(report.category).toBe("auth")
    })

    it("should classify server errors correctly", () => {
      const serverError = new Error("500 Internal Server Error")
      const report = reportError(serverError)

      expect(report.category).toBe("api")
    })

    it("should classify validation errors correctly", () => {
      const validationError = new Error("Validation failed: email is required")
      const report = reportError(validationError)

      expect(report.category).toBe("validation")
    })

    it("should include context in the report", () => {
      const error = new Error("Test error")
      const report = reportError(error, {
        componentName: "TestComponent",
        action: "testAction",
      })

      expect(report.context.componentName).toBe("TestComponent")
      expect(report.context.action).toBe("testAction")
    })

    it("should generate fingerprint for deduplication", () => {
      const error = new Error("Same error")
      const report1 = reportError(error, { componentName: "TestComponent" })
      const report2 = reportError(new Error("Same error"), { componentName: "TestComponent" })

      expect(report1.fingerprint).toBeDefined()
      expect(report1.fingerprint).toBe(report2.fingerprint)
    })

    it("should mark errors as handled by default", () => {
      const error = new Error("Test error")
      const report = reportError(error)

      expect(report.handled).toBe(true)
    })

    it("should allow overriding severity", () => {
      const error = new Error("Minor error")
      const report = reportError(error, {}, { severity: "critical" })

      expect(report.severity).toBe("critical")
    })

    it("should allow overriding category", () => {
      const error = new Error("Custom error")
      const report = reportError(error, {}, { category: "ui" })

      expect(report.category).toBe("ui")
    })
  })

  describe("reportUnhandledError", () => {
    it("should mark errors as unhandled", () => {
      const error = new Error("Unhandled error")
      const report = reportUnhandledError(error)

      expect(report.handled).toBe(false)
    })

    it("should include component stack in additionalData", () => {
      const error = new Error("React error")
      const componentStack = "at TestComponent (test.js:10)"
      const report = reportUnhandledError(error, componentStack, {
        componentName: "TestComponent",
      })

      expect(report.context.additionalData?.["componentStack"]).toBe(componentStack)
    })
  })

  describe("createErrorReporter", () => {
    it("should create a scoped error reporter", () => {
      const reporter = createErrorReporter("MyComponent")

      expect(reporter.report).toBeDefined()
      expect(reporter.reportUnhandled).toBeDefined()
      expect(reporter.wrap).toBeDefined()
    })

    it("should include component name in reports", () => {
      const reporter = createErrorReporter("MyComponent")
      const error = new Error("Component error")
      const report = reporter.report(error, "buttonClick")

      expect(report.context.componentName).toBe("MyComponent")
      expect(report.context.action).toBe("buttonClick")
    })

    it("should wrap functions and catch errors", () => {
      const reporter = createErrorReporter("MyComponent")
      const failingFn = () => {
        throw new Error("Function failed")
      }

      const wrappedFn = reporter.wrap(failingFn, "testAction")

      expect(() => wrappedFn()).toThrow("Function failed")
    })

    it("should wrap async functions and catch errors", async () => {
      const reporter = createErrorReporter("MyComponent")
      const failingAsyncFn = async () => {
        throw new Error("Async function failed")
      }

      const wrappedFn = reporter.wrap(failingAsyncFn, "asyncAction")

      await expect(wrappedFn()).rejects.toThrow("Async function failed")
    })
  })

  describe("Error Queue", () => {
    it("should track queue status", () => {
      const status = getErrorQueueStatus()

      expect(status).toHaveProperty("queueSize")
      expect(status).toHaveProperty("isProcessing")
      expect(typeof status.queueSize).toBe("number")
      expect(typeof status.isProcessing).toBe("boolean")
    })

    it("should deduplicate errors with same fingerprint", () => {
      const initialStatus = getErrorQueueStatus()
      const initialSize = initialStatus.queueSize

      // Report same error multiple times
      const error = new Error("Duplicate error")
      reportError(error, { componentName: "Test" })
      reportError(error, { componentName: "Test" })
      reportError(error, { componentName: "Test" })

      const newStatus = getErrorQueueStatus()
      // Should only add 1 error due to deduplication
      expect(newStatus.queueSize).toBe(initialSize + 1)
    })
  })

  describe("Error Severity Classification", () => {
    it("should classify auth errors as high severity", () => {
      const authError = new Error("Authentication failed - token expired")
      const report = reportError(authError)

      expect(report.severity).toBe("high")
    })

    it("should classify API errors as high severity", () => {
      const apiError = new Error("500 Server Error")
      const report = reportError(apiError)

      expect(report.severity).toBe("high")
    })

    it("should classify network errors as medium severity", () => {
      const networkError = new Error("Network connection timeout")
      const report = reportError(networkError)

      expect(report.severity).toBe("medium")
    })

    it("should classify validation errors as medium severity", () => {
      const validationError = new Error("Invalid email format")
      const report = reportError(validationError)

      expect(report.severity).toBe("medium")
    })

    it("should classify hydration errors as critical", () => {
      const hydrationError = new Error("Hydration mismatch detected")
      const report = reportError(hydrationError)

      expect(report.severity).toBe("critical")
    })

    it("should classify chunk load errors as critical", () => {
      const chunkError = new Error("Chunk load failed")
      const report = reportError(chunkError)

      expect(report.severity).toBe("critical")
    })
  })

  describe("Error Report Format", () => {
    it("should include timestamp", () => {
      const error = new Error("Test error")
      const report = reportError(error)

      expect(report.timestamp).toBeDefined()
      expect(new Date(report.timestamp).getTime()).not.toBeNaN()
    })

    it("should include error name and message", () => {
      const error = new Error("Test message")
      error.name = "CustomError"
      const report = reportError(error)

      expect(report.name).toBe("CustomError")
      expect(report.message).toBe("Test message")
    })

    it("should include stack trace when available", () => {
      const error = new Error("Error with stack")
      const report = reportError(error)

      expect(report.stack).toBeDefined()
      expect(report.stack).toContain("Error with stack")
    })
  })
})

describe("Error Boundary Integration", () => {
  it("should export classifyError for ErrorBoundary use", async () => {
    const { useErrorHandler } = await import("@/components/custom/ErrorBoundary")

    expect(useErrorHandler).toBeDefined()
    expect(typeof useErrorHandler).toBe("function")
  })
})
