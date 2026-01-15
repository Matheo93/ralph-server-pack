/**
 * Structured Logging Module
 * Production-ready logger with JSON output, log levels, and request tracking
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  requestId?: string
  userId?: string
  path?: string
  method?: string
  duration?: number
  statusCode?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  environment: string
  service: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Configurable log level from environment
const CURRENT_LOG_LEVEL: LogLevel =
  (process.env["LOG_LEVEL"] as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug")

const SERVICE_NAME = "familyload"

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return `req_${timestamp}_${randomPart}`
}

/**
 * Check if a log level should be logged based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL]
}

/**
 * Format a log entry as JSON
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || "development",
    service: SERVICE_NAME,
  }

  if (context && Object.keys(context).length > 0) {
    // Sanitize sensitive data from context
    const sanitizedContext = sanitizeContext(context)
    entry.context = sanitizedContext
  }

  return JSON.stringify(entry)
}

/**
 * Sanitize sensitive fields from log context
 */
function sanitizeContext(context: LogContext): LogContext {
  const sensitiveFields = [
    "password",
    "token",
    "authorization",
    "cookie",
    "secret",
    "api_key",
    "apiKey",
    "accessToken",
    "refreshToken",
    "idToken",
  ]

  const sanitized: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = "[REDACTED]"
    } else if (typeof value === "string" && value.length > 500) {
      // Truncate very long strings
      sanitized[key] = value.substring(0, 500) + "... [TRUNCATED]"
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Write log to console (structured JSON)
 */
function writeLog(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return

  const logEntry = formatLogEntry(level, message, context)

  switch (level) {
    case "debug":
      console.debug(logEntry)
      break
    case "info":
      console.info(logEntry)
      break
    case "warn":
      console.warn(logEntry)
      break
    case "error":
      console.error(logEntry)
      break
  }
}

/**
 * Logger class with method chaining for context
 */
export class Logger {
  private context: LogContext

  constructor(context?: LogContext) {
    this.context = context || {}
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext })
  }

  /**
   * Set request ID for this logger instance
   */
  withRequestId(requestId: string): Logger {
    return this.child({ requestId })
  }

  /**
   * Set user ID for this logger instance
   */
  withUserId(userId: string): Logger {
    return this.child({ userId })
  }

  debug(message: string, context?: LogContext): void {
    writeLog("debug", message, { ...this.context, ...context })
  }

  info(message: string, context?: LogContext): void {
    writeLog("info", message, { ...this.context, ...context })
  }

  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, { ...this.context, ...context })
  }

  error(message: string, context?: LogContext): void {
    writeLog("error", message, { ...this.context, ...context })
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(message: string, error: Error, context?: LogContext): void {
    writeLog("error", message, {
      ...this.context,
      ...context,
      error: error.message,
      stack: error.stack,
    })
  }

  /**
   * Log an API request
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
    writeLog(level, `${method} ${path} ${statusCode} ${duration}ms`, {
      ...this.context,
      ...context,
      method,
      path,
      statusCode,
      duration,
    })
  }
}

// Default logger instance
export const logger = new Logger()

/**
 * Create a logger for API routes
 */
export function createApiLogger(requestId?: string): Logger {
  return new Logger({ requestId: requestId || generateRequestId() })
}

/**
 * Middleware helper to track request timing
 */
export function createRequestTimer(): () => number {
  const start = performance.now()
  return () => Math.round(performance.now() - start)
}

/**
 * Log levels for external use
 */
export const LogLevels = LOG_LEVELS
