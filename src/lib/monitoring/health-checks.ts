/**
 * Health Checks - Service health verification
 * Database connectivity, external services status, and dependency health
 */

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy"

export interface HealthCheckResult {
  name: string
  status: HealthStatus
  message?: string
  latencyMs?: number
  details?: Record<string, unknown>
  timestamp: number
}

export interface OverallHealth {
  status: HealthStatus
  checks: HealthCheckResult[]
  timestamp: number
  version?: string
  uptime?: number
}

export type HealthCheckFn = () => Promise<HealthCheckResult>

export interface HealthCheckOptions {
  timeout?: number
  critical?: boolean
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_TIMEOUT = 5000 // 5 seconds
export const HEALTHY_THRESHOLD_MS = 100
export const DEGRADED_THRESHOLD_MS = 500

// ============================================================================
// Health Check Registry
// ============================================================================

class HealthCheckRegistry {
  private checks: Map<string, { fn: HealthCheckFn; options: HealthCheckOptions }> = new Map()
  private lastResults: Map<string, HealthCheckResult> = new Map()
  private startTime: number = Date.now()

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  register(name: string, fn: HealthCheckFn, options: HealthCheckOptions = {}): void {
    this.checks.set(name, { fn, options })
  }

  unregister(name: string): boolean {
    return this.checks.delete(name)
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name)
    if (!check) {
      return {
        name,
        status: "unhealthy",
        message: "Health check not found",
        timestamp: Date.now(),
      }
    }

    const timeout = check.options.timeout ?? DEFAULT_TIMEOUT
    const startTime = performance.now()

    try {
      const result = await Promise.race([
        check.fn(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), timeout)
        ),
      ])

      const latencyMs = performance.now() - startTime
      const finalResult = {
        ...result,
        latencyMs,
        timestamp: Date.now(),
      }

      this.lastResults.set(name, finalResult)
      return finalResult
    } catch (error) {
      const latencyMs = performance.now() - startTime
      const result: HealthCheckResult = {
        name,
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        latencyMs,
        timestamp: Date.now(),
      }

      this.lastResults.set(name, result)
      return result
    }
  }

  async runAllChecks(): Promise<OverallHealth> {
    const results = await Promise.all(
      Array.from(this.checks.keys()).map((name) => this.runCheck(name))
    )

    // Determine overall status
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([, check]) => check.options.critical !== false)
      .map(([name]) => name)

    let overallStatus: HealthStatus = "healthy"

    for (const result of results) {
      if (result.status === "unhealthy" && criticalChecks.includes(result.name)) {
        overallStatus = "unhealthy"
        break
      }
      if (result.status === "degraded" && overallStatus === "healthy") {
        overallStatus = "degraded"
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    }
  }

  // --------------------------------------------------------------------------
  // Results
  // --------------------------------------------------------------------------

  getLastResult(name: string): HealthCheckResult | undefined {
    return this.lastResults.get(name)
  }

  getAllLastResults(): HealthCheckResult[] {
    return Array.from(this.lastResults.values())
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys())
  }

  getUptime(): number {
    return Date.now() - this.startTime
  }

  reset(): void {
    this.checks.clear()
    this.lastResults.clear()
    this.startTime = Date.now()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const healthChecks = new HealthCheckRegistry()

// ============================================================================
// Built-in Health Check Creators
// ============================================================================

/**
 * Create a database health check
 */
export function createDatabaseCheck(
  name: string,
  queryFn: () => Promise<boolean>,
  options: HealthCheckOptions = {}
): void {
  healthChecks.register(
    name,
    async (): Promise<HealthCheckResult> => {
      const startTime = performance.now()

      try {
        const success = await queryFn()
        const latencyMs = performance.now() - startTime

        if (!success) {
          return {
            name,
            status: "unhealthy",
            message: "Database query returned false",
            latencyMs,
            timestamp: Date.now(),
          }
        }

        const status: HealthStatus =
          latencyMs > DEGRADED_THRESHOLD_MS
            ? "degraded"
            : latencyMs > HEALTHY_THRESHOLD_MS
            ? "degraded"
            : "healthy"

        return {
          name,
          status,
          message: status === "healthy" ? "Database is responsive" : "Database is slow",
          latencyMs,
          timestamp: Date.now(),
        }
      } catch (error) {
        return {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Database check failed",
          latencyMs: performance.now() - startTime,
          timestamp: Date.now(),
        }
      }
    },
    { ...options, critical: options.critical ?? true }
  )
}

/**
 * Create an HTTP endpoint health check
 */
export function createHttpCheck(
  name: string,
  url: string,
  options: HealthCheckOptions & { expectedStatus?: number } = {}
): void {
  const expectedStatus = options.expectedStatus ?? 200

  healthChecks.register(
    name,
    async (): Promise<HealthCheckResult> => {
      const startTime = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout ?? DEFAULT_TIMEOUT
      )

      try {
        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const latencyMs = performance.now() - startTime
        const isHealthy = response.status === expectedStatus

        if (!isHealthy) {
          return {
            name,
            status: "unhealthy",
            message: `Expected status ${expectedStatus}, got ${response.status}`,
            latencyMs,
            details: { url, actualStatus: response.status },
            timestamp: Date.now(),
          }
        }

        const status: HealthStatus =
          latencyMs > DEGRADED_THRESHOLD_MS ? "degraded" : "healthy"

        return {
          name,
          status,
          message: status === "healthy" ? "Endpoint is responsive" : "Endpoint is slow",
          latencyMs,
          details: { url },
          timestamp: Date.now(),
        }
      } catch (error) {
        clearTimeout(timeoutId)
        return {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "HTTP check failed",
          latencyMs: performance.now() - startTime,
          details: { url },
          timestamp: Date.now(),
        }
      }
    },
    options
  )
}

/**
 * Create a Redis/cache health check
 */
export function createCacheCheck(
  name: string,
  pingFn: () => Promise<boolean>,
  options: HealthCheckOptions = {}
): void {
  healthChecks.register(
    name,
    async (): Promise<HealthCheckResult> => {
      const startTime = performance.now()

      try {
        const success = await pingFn()
        const latencyMs = performance.now() - startTime

        if (!success) {
          return {
            name,
            status: "unhealthy",
            message: "Cache ping returned false",
            latencyMs,
            timestamp: Date.now(),
          }
        }

        const status: HealthStatus = latencyMs > 50 ? "degraded" : "healthy"

        return {
          name,
          status,
          message: status === "healthy" ? "Cache is responsive" : "Cache is slow",
          latencyMs,
          timestamp: Date.now(),
        }
      } catch (error) {
        return {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Cache check failed",
          latencyMs: performance.now() - startTime,
          timestamp: Date.now(),
        }
      }
    },
    { ...options, critical: options.critical ?? false }
  )
}

/**
 * Create a disk space health check
 */
export function createDiskSpaceCheck(
  name: string,
  checkFn: () => Promise<{ used: number; total: number }>,
  options: HealthCheckOptions & { warningThreshold?: number; criticalThreshold?: number } = {}
): void {
  const warningThreshold = options.warningThreshold ?? 0.8 // 80%
  const criticalThreshold = options.criticalThreshold ?? 0.95 // 95%

  healthChecks.register(
    name,
    async (): Promise<HealthCheckResult> => {
      try {
        const { used, total } = await checkFn()
        const usageRatio = used / total

        let status: HealthStatus = "healthy"
        let message = "Disk space is adequate"

        if (usageRatio >= criticalThreshold) {
          status = "unhealthy"
          message = "Disk space critically low"
        } else if (usageRatio >= warningThreshold) {
          status = "degraded"
          message = "Disk space running low"
        }

        return {
          name,
          status,
          message,
          details: {
            usedBytes: used,
            totalBytes: total,
            usagePercent: Math.round(usageRatio * 100),
          },
          timestamp: Date.now(),
        }
      } catch (error) {
        return {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Disk check failed",
          timestamp: Date.now(),
        }
      }
    },
    options
  )
}

/**
 * Create a memory health check
 */
export function createMemoryCheck(
  name: string,
  options: HealthCheckOptions & { warningThreshold?: number; criticalThreshold?: number } = {}
): void {
  const warningThreshold = options.warningThreshold ?? 0.8
  const criticalThreshold = options.criticalThreshold ?? 0.95

  healthChecks.register(
    name,
    async (): Promise<HealthCheckResult> => {
      try {
        // In Node.js environment
        if (typeof process !== "undefined" && process.memoryUsage) {
          const { heapUsed, heapTotal } = process.memoryUsage()
          const usageRatio = heapUsed / heapTotal

          let status: HealthStatus = "healthy"
          let message = "Memory usage is normal"

          if (usageRatio >= criticalThreshold) {
            status = "unhealthy"
            message = "Memory usage critically high"
          } else if (usageRatio >= warningThreshold) {
            status = "degraded"
            message = "Memory usage elevated"
          }

          return {
            name,
            status,
            message,
            details: {
              heapUsed,
              heapTotal,
              usagePercent: Math.round(usageRatio * 100),
            },
            timestamp: Date.now(),
          }
        }

        // Browser environment - less detailed
        return {
          name,
          status: "healthy",
          message: "Memory check not available in browser",
          timestamp: Date.now(),
        }
      } catch (error) {
        return {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Memory check failed",
          timestamp: Date.now(),
        }
      }
    },
    options
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run a liveness check (minimal check that the process is alive)
 */
export async function livenessCheck(): Promise<HealthCheckResult> {
  return {
    name: "liveness",
    status: "healthy",
    message: "Process is running",
    timestamp: Date.now(),
  }
}

/**
 * Run a readiness check (whether the service is ready to accept traffic)
 */
export async function readinessCheck(): Promise<OverallHealth> {
  return healthChecks.runAllChecks()
}

/**
 * Format health check results for HTTP response
 */
export function formatHealthResponse(health: OverallHealth): {
  statusCode: number
  body: OverallHealth
} {
  let statusCode: number

  switch (health.status) {
    case "healthy":
      statusCode = 200
      break
    case "degraded":
      statusCode = 200 // Still serving traffic
      break
    case "unhealthy":
      statusCode = 503
      break
    default:
      statusCode = 500
  }

  return {
    statusCode,
    body: health,
  }
}
