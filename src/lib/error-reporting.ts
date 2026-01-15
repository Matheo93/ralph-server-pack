/**
 * Centralized Error Reporting Module
 * Production-ready error handling with queue batching and standardized format
 */

import { logger, type LogContext } from "./logger"

// ============================================
// ERROR TYPES & INTERFACES
// ============================================

export type ErrorSeverity = "low" | "medium" | "high" | "critical"
export type ErrorCategory = "ui" | "api" | "network" | "auth" | "validation" | "unknown"

export interface ErrorReport {
  id: string
  timestamp: string
  message: string
  name: string
  stack?: string
  severity: ErrorSeverity
  category: ErrorCategory
  context: ErrorReportContext
  fingerprint: string
  handled: boolean
}

export interface ErrorReportContext {
  componentName?: string
  action?: string
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  additionalData?: Record<string, unknown>
}

interface QueuedError {
  report: ErrorReport
  retryCount: number
}

// ============================================
// ERROR FINGERPRINTING
// ============================================

/**
 * Generate a fingerprint for error deduplication
 */
function generateFingerprint(error: Error, context?: ErrorReportContext): string {
  const parts = [
    error.name,
    error.message.substring(0, 100),
    context?.componentName || "unknown",
    context?.action || "unknown",
  ]

  // Simple hash function
  const str = parts.join("|")
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `fp_${Math.abs(hash).toString(36)}`
}

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `err_${timestamp}_${random}`
}

// ============================================
// ERROR CLASSIFICATION
// ============================================

/**
 * Classify error severity based on type and context
 */
function classifySeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  // Critical: auth failures, data corruption
  if (category === "auth") {
    return "high"
  }

  // High: API errors, server issues
  if (category === "api" || error.message.includes("500")) {
    return "high"
  }

  // Medium: network issues, validation errors
  if (category === "network" || category === "validation") {
    return "medium"
  }

  // Check for known critical error patterns
  const criticalPatterns = [
    "chunk load",
    "hydration",
    "minified react",
    "invariant",
    "maximum call stack",
  ]

  if (criticalPatterns.some(p => error.message.toLowerCase().includes(p))) {
    return "critical"
  }

  return "low"
}

/**
 * Classify error category based on error properties
 */
function classifyCategory(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("offline") ||
    message.includes("timeout") ||
    name.includes("networkerror")
  ) {
    return "network"
  }

  // Auth errors
  if (
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("session") ||
    message.includes("token") ||
    message.includes("authentication")
  ) {
    return "auth"
  }

  // API errors
  if (
    message.includes("api") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("server")
  ) {
    return "api"
  }

  // Validation errors
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    name.includes("zod") ||
    name.includes("validationerror")
  ) {
    return "validation"
  }

  // UI errors (React-specific)
  if (
    message.includes("render") ||
    message.includes("component") ||
    message.includes("hydration") ||
    message.includes("hook")
  ) {
    return "ui"
  }

  return "unknown"
}

// ============================================
// ERROR QUEUE FOR BATCH REPORTING
// ============================================

class ErrorQueue {
  private queue: QueuedError[] = []
  private maxQueueSize = 50
  private maxRetries = 3
  private batchInterval = 5000 // 5 seconds
  private isProcessing = false
  private intervalId: ReturnType<typeof setInterval> | null = null
  private reportEndpoint: string | null = null
  private seenFingerprints = new Set<string>()
  private fingerprintTTL = 60000 // 1 minute deduplication window

  constructor() {
    // Auto-start batch processing
    if (typeof window !== "undefined") {
      this.startBatchProcessing()

      // Flush on page unload
      window.addEventListener("beforeunload", () => {
        this.flush()
      })

      // Handle visibility change
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush()
        }
      })
    }
  }

  /**
   * Configure reporting endpoint
   */
  configure(endpoint: string): void {
    this.reportEndpoint = endpoint
  }

  /**
   * Add error to queue
   */
  enqueue(report: ErrorReport): void {
    // Deduplicate based on fingerprint
    if (this.seenFingerprints.has(report.fingerprint)) {
      logger.debug("Duplicate error suppressed", { fingerprint: report.fingerprint })
      return
    }

    this.seenFingerprints.add(report.fingerprint)

    // Clear fingerprint after TTL
    setTimeout(() => {
      this.seenFingerprints.delete(report.fingerprint)
    }, this.fingerprintTTL)

    // Enforce queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      // Remove oldest non-critical errors
      const nonCriticalIndex = this.queue.findIndex(
        e => e.report.severity !== "critical"
      )
      if (nonCriticalIndex !== -1) {
        this.queue.splice(nonCriticalIndex, 1)
      } else {
        this.queue.shift()
      }
    }

    this.queue.push({ report, retryCount: 0 })

    // Immediately process critical errors
    if (report.severity === "critical" && !this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Start batch processing interval
   */
  private startBatchProcessing(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processQueue()
      }
    }, this.batchInterval)
  }

  /**
   * Stop batch processing
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Process queued errors
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    // Get batch of errors to process
    const batch = this.queue.splice(0, 10)

    try {
      await this.sendBatch(batch.map(e => e.report))
      logger.debug(`Sent ${batch.length} error reports`)
    } catch {
      // Re-queue failed errors with retry count
      for (const item of batch) {
        if (item.retryCount < this.maxRetries) {
          item.retryCount++
          this.queue.unshift(item)
        } else {
          logger.warn("Error report dropped after max retries", {
            errorId: item.report.id,
          })
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Send batch of error reports
   */
  private async sendBatch(reports: ErrorReport[]): Promise<void> {
    // If no endpoint configured, just log
    if (!this.reportEndpoint) {
      logger.debug("Error reports (no endpoint configured)", {
        count: reports.length,
        errors: reports.map(r => ({
          id: r.id,
          message: r.message,
          severity: r.severity,
        })),
      })
      return
    }

    const response = await fetch(this.reportEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reports }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send error reports: ${response.status}`)
    }
  }

  /**
   * Flush all queued errors immediately
   */
  flush(): void {
    if (this.queue.length === 0) return

    // Use sendBeacon for reliable delivery on page unload
    if (this.reportEndpoint && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const reports = this.queue.map(e => e.report)
      navigator.sendBeacon(
        this.reportEndpoint,
        JSON.stringify({ reports })
      )
      this.queue = []
    } else {
      // Fallback to sync processing
      this.processQueue()
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; isProcessing: boolean } {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
    }
  }
}

// Singleton instance
const errorQueue = new ErrorQueue()

// ============================================
// MAIN ERROR REPORTING API
// ============================================

/**
 * Report an error to the error tracking system
 */
export function reportError(
  error: Error,
  context?: ErrorReportContext,
  options?: {
    handled?: boolean
    severity?: ErrorSeverity
    category?: ErrorCategory
  }
): ErrorReport {
  const category = options?.category || classifyCategory(error)
  const severity = options?.severity || classifySeverity(error, category)

  const report: ErrorReport = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    message: error.message,
    name: error.name,
    stack: error.stack,
    severity,
    category,
    context: {
      ...context,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
    },
    fingerprint: generateFingerprint(error, context),
    handled: options?.handled ?? true,
  }

  // Log to structured logger
  const logContext: LogContext = {
    errorId: report.id,
    errorName: error.name,
    severity: report.severity,
    category: report.category,
    fingerprint: report.fingerprint,
    componentName: context?.componentName,
    action: context?.action,
    handled: report.handled.toString(),
  }

  if (severity === "critical" || severity === "high") {
    logger.error(`[ErrorReporting] ${error.message}`, logContext)
  } else {
    logger.warn(`[ErrorReporting] ${error.message}`, logContext)
  }

  // Queue for batch reporting
  errorQueue.enqueue(report)

  return report
}

/**
 * Report an unhandled error (typically from error boundaries)
 */
export function reportUnhandledError(
  error: Error,
  componentStack?: string,
  context?: ErrorReportContext
): ErrorReport {
  return reportError(
    error,
    {
      ...context,
      additionalData: {
        ...context?.additionalData,
        componentStack: componentStack?.substring(0, 500),
      },
    },
    { handled: false }
  )
}

/**
 * Create a scoped error reporter for a specific component/module
 */
export function createErrorReporter(componentName: string) {
  return {
    report: (
      error: Error,
      action?: string,
      additionalData?: Record<string, unknown>
    ) => reportError(error, { componentName, action, additionalData }),

    reportUnhandled: (error: Error, componentStack?: string) =>
      reportUnhandledError(error, componentStack, { componentName }),

    wrap: <T extends (...args: unknown[]) => unknown>(
      fn: T,
      action?: string
    ): T => {
      return ((...args: unknown[]) => {
        try {
          const result = fn(...args)

          // Handle promises
          if (result instanceof Promise) {
            return result.catch((error: Error) => {
              reportError(error, { componentName, action })
              throw error
            })
          }

          return result
        } catch (error) {
          reportError(error as Error, { componentName, action })
          throw error
        }
      }) as T
    },
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Configure the error reporting endpoint
 */
export function configureErrorReporting(endpoint: string): void {
  errorQueue.configure(endpoint)
}

/**
 * Get current queue status
 */
export function getErrorQueueStatus(): { queueSize: number; isProcessing: boolean } {
  return errorQueue.getStatus()
}

/**
 * Flush all queued errors immediately
 */
export function flushErrorQueue(): void {
  errorQueue.flush()
}

/**
 * Stop error queue processing (for cleanup)
 */
export function stopErrorReporting(): void {
  errorQueue.stop()
}

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================

/**
 * Setup global error handlers for uncaught errors
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return

  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    if (error) {
      reportError(
        error,
        {
          additionalData: {
            source,
            lineno,
            colno,
          },
        },
        { handled: false }
      )
    } else {
      // Create synthetic error for string messages
      const syntheticError = new Error(String(message))
      syntheticError.name = "UncaughtError"
      reportError(
        syntheticError,
        {
          additionalData: {
            source,
            lineno,
            colno,
          },
        },
        { handled: false }
      )
    }

    // Don't prevent default handling
    return false
  }

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))

    error.name = error.name || "UnhandledPromiseRejection"

    reportError(error, {}, { handled: false, severity: "high" })
  }

  logger.info("[ErrorReporting] Global error handlers initialized")
}

// ============================================
// REACT ERROR BOUNDARY INTEGRATION
// ============================================

/**
 * Error handler for React Error Boundaries
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    reportUnhandledError(error, errorInfo.componentStack || undefined, {
      componentName,
    })
  }
}
