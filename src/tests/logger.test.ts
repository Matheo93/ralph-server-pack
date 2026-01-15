import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  Logger,
  generateRequestId,
  createApiLogger,
  createRequestTimer,
  LogLevels,
} from "@/lib/logger"

describe("Logger", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()
      expect(id1).not.toBe(id2)
    })

    it("should start with req_ prefix", () => {
      const id = generateRequestId()
      expect(id.startsWith("req_")).toBe(true)
    })

    it("should be a reasonable length", () => {
      const id = generateRequestId()
      expect(id.length).toBeGreaterThan(10)
      expect(id.length).toBeLessThan(40)
    })
  })

  describe("Logger class", () => {
    it("should log info messages", () => {
      const logger = new Logger()
      logger.info("Test message")

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("info")
      expect(logEntry.message).toBe("Test message")
    })

    it("should log warn messages", () => {
      const logger = new Logger()
      logger.warn("Warning message")

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("warn")
      expect(logEntry.message).toBe("Warning message")
    })

    it("should log error messages", () => {
      const logger = new Logger()
      logger.error("Error message")

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("error")
      expect(logEntry.message).toBe("Error message")
    })

    it("should include timestamp", () => {
      const logger = new Logger()
      logger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.timestamp).toBeDefined()
      expect(new Date(logEntry.timestamp).getTime()).not.toBeNaN()
    })

    it("should include service name", () => {
      const logger = new Logger()
      logger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.service).toBe("familyload")
    })
  })

  describe("Logger context", () => {
    it("should support context in constructor", () => {
      const logger = new Logger({ requestId: "req_123" })
      logger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toBe("req_123")
    })

    it("should support additional context in log call", () => {
      const logger = new Logger()
      logger.info("Test", { userId: "user_123" })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.userId).toBe("user_123")
    })

    it("should merge context", () => {
      const logger = new Logger({ requestId: "req_123" })
      logger.info("Test", { userId: "user_123" })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toBe("req_123")
      expect(logEntry.context.userId).toBe("user_123")
    })

    it("should support child loggers", () => {
      const logger = new Logger({ requestId: "req_123" })
      const childLogger = logger.child({ userId: "user_456" })
      childLogger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toBe("req_123")
      expect(logEntry.context.userId).toBe("user_456")
    })

    it("should support withRequestId", () => {
      const logger = new Logger()
      const loggerWithId = logger.withRequestId("req_abc")
      loggerWithId.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toBe("req_abc")
    })

    it("should support withUserId", () => {
      const logger = new Logger()
      const loggerWithUser = logger.withUserId("user_xyz")
      loggerWithUser.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.userId).toBe("user_xyz")
    })
  })

  describe("Sensitive data sanitization", () => {
    it("should redact password fields", () => {
      const logger = new Logger()
      logger.info("Test", { password: "secret123" })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.password).toBe("[REDACTED]")
    })

    it("should redact token fields", () => {
      const logger = new Logger()
      logger.info("Test", { accessToken: "abc123" })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.accessToken).toBe("[REDACTED]")
    })

    it("should redact authorization headers", () => {
      const logger = new Logger()
      logger.info("Test", { authorization: "Bearer token" })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.authorization).toBe("[REDACTED]")
    })

    it("should truncate very long strings", () => {
      const logger = new Logger()
      const longString = "a".repeat(1000)
      logger.info("Test", { data: longString })

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.data.length).toBeLessThan(600)
      expect(logEntry.context.data.endsWith("... [TRUNCATED]")).toBe(true)
    })
  })

  describe("Request logging", () => {
    it("should log info for successful requests", () => {
      const logger = new Logger()
      logger.request("GET", "/api/test", 200, 50)

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("info")
      expect(logEntry.message).toBe("GET /api/test 200 50ms")
      expect(logEntry.context.method).toBe("GET")
      expect(logEntry.context.path).toBe("/api/test")
      expect(logEntry.context.statusCode).toBe(200)
      expect(logEntry.context.duration).toBe(50)
    })

    it("should log warn for client errors", () => {
      const logger = new Logger()
      logger.request("POST", "/api/test", 400, 30)

      const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("warn")
    })

    it("should log error for server errors", () => {
      const logger = new Logger()
      logger.request("POST", "/api/test", 500, 100)

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string)
      expect(logEntry.level).toBe("error")
    })
  })

  describe("Error logging with stack", () => {
    it("should include error message and stack trace", () => {
      const logger = new Logger()
      const error = new Error("Test error")
      logger.errorWithStack("Something failed", error)

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string)
      expect(logEntry.context.error).toBe("Test error")
      expect(logEntry.context.stack).toBeDefined()
      expect(logEntry.context.stack).toContain("Error: Test error")
    })
  })

  describe("createApiLogger", () => {
    it("should create logger with request ID", () => {
      const logger = createApiLogger("req_custom")
      logger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toBe("req_custom")
    })

    it("should generate request ID if not provided", () => {
      const logger = createApiLogger()
      logger.info("Test")

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string)
      expect(logEntry.context.requestId).toMatch(/^req_/)
    })
  })

  describe("createRequestTimer", () => {
    it("should return elapsed time", async () => {
      const getElapsed = createRequestTimer()
      await new Promise((resolve) => setTimeout(resolve, 50))
      const elapsed = getElapsed()

      expect(elapsed).toBeGreaterThanOrEqual(40)
      expect(elapsed).toBeLessThan(200)
    })
  })

  describe("LogLevels", () => {
    it("should have correct hierarchy", () => {
      expect(LogLevels.debug).toBeLessThan(LogLevels.info)
      expect(LogLevels.info).toBeLessThan(LogLevels.warn)
      expect(LogLevels.warn).toBeLessThan(LogLevels.error)
    })
  })
})
