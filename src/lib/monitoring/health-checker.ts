/**
 * Health Checker Service
 *
 * Monitors service health:
 * - Service health probes
 * - Dependency checks
 * - Circuit breaker patterns
 */

// =============================================================================
// TYPES
// =============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown"
export type DependencyType = "database" | "cache" | "external_api" | "storage" | "queue" | "service"
export type CircuitState = "closed" | "open" | "half_open"

export interface HealthCheck {
  name: string
  status: HealthStatus
  latency?: number // ms
  message?: string
  lastCheck: Date
  metadata?: Record<string, unknown>
}

export interface DependencyHealth {
  name: string
  type: DependencyType
  status: HealthStatus
  latency?: number
  message?: string
  critical: boolean
  lastCheck: Date
  consecutiveFailures: number
}

export interface HealthReport {
  status: HealthStatus
  timestamp: Date
  uptime: number
  version: string
  checks: HealthCheck[]
  dependencies: DependencyHealth[]
  metrics: HealthMetrics
}

export interface HealthMetrics {
  requestsPerSecond: number
  avgResponseTime: number
  errorRate: number
  activeConnections: number
  memoryUsage: number
  cpuUsage: number
}

export interface HealthProbe {
  name: string
  type: "liveness" | "readiness" | "startup"
  check: () => Promise<HealthCheck>
  interval: number // ms
  timeout: number // ms
  critical: boolean
}

export interface CircuitBreaker {
  name: string
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailure?: Date
  lastSuccess?: Date
  lastStateChange: Date
  config: CircuitBreakerConfig
  metrics: CircuitMetrics
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number // ms to wait before trying again
  volumeThreshold: number // minimum requests before considering failure rate
}

export interface CircuitMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rejectedRequests: number
  lastMinuteRequests: number
}

export interface DependencyConfig {
  name: string
  type: DependencyType
  endpoint?: string
  critical: boolean
  timeout: number
  checkFn?: () => Promise<boolean>
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000, // 30 seconds
  volumeThreshold: 10,
}

// =============================================================================
// HEALTH STATUS DETERMINATION
// =============================================================================

/**
 * Determine overall health status from checks
 */
export function determineOverallStatus(
  checks: HealthCheck[],
  dependencies: DependencyHealth[]
): HealthStatus {
  // Check for unhealthy critical dependencies
  const unhealthyCritical = dependencies.filter(
    d => d.critical && d.status === "unhealthy"
  )

  if (unhealthyCritical.length > 0) {
    return "unhealthy"
  }

  // Check for any unhealthy checks
  const unhealthyChecks = checks.filter(c => c.status === "unhealthy")
  if (unhealthyChecks.length > 0) {
    return "unhealthy"
  }

  // Check for degraded status
  const degradedChecks = checks.filter(c => c.status === "degraded")
  const degradedDeps = dependencies.filter(d => d.status === "degraded")

  if (degradedChecks.length > 0 || degradedDeps.length > 0) {
    return "degraded"
  }

  // Check for unknown status
  const unknownChecks = checks.filter(c => c.status === "unknown")
  if (unknownChecks.length > checks.length / 2) {
    return "unknown"
  }

  return "healthy"
}

/**
 * Create health check result
 */
export function createHealthCheck(
  name: string,
  status: HealthStatus,
  latency?: number,
  message?: string,
  metadata?: Record<string, unknown>
): HealthCheck {
  return {
    name,
    status,
    latency,
    message,
    lastCheck: new Date(),
    metadata,
  }
}

/**
 * Create dependency health result
 */
export function createDependencyHealth(
  name: string,
  type: DependencyType,
  status: HealthStatus,
  critical: boolean,
  latency?: number,
  message?: string
): DependencyHealth {
  return {
    name,
    type,
    status,
    latency,
    message,
    critical,
    lastCheck: new Date(),
    consecutiveFailures: status === "unhealthy" ? 1 : 0,
  }
}

// =============================================================================
// DEPENDENCY CHECKING
// =============================================================================

/**
 * Check dependency health with timeout
 */
export async function checkDependency(
  config: DependencyConfig
): Promise<DependencyHealth> {
  const startTime = Date.now()

  try {
    if (config.checkFn) {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), config.timeout)
      })

      const result = await Promise.race([config.checkFn(), timeoutPromise])

      const latency = Date.now() - startTime
      const status: HealthStatus = result ? "healthy" : "unhealthy"

      return createDependencyHealth(
        config.name,
        config.type,
        status,
        config.critical,
        latency
      )
    }

    // Default HTTP check if no custom function
    if (config.endpoint) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      try {
        const response = await fetch(config.endpoint, {
          method: "GET",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const latency = Date.now() - startTime

        return createDependencyHealth(
          config.name,
          config.type,
          response.ok ? "healthy" : "unhealthy",
          config.critical,
          latency,
          response.ok ? undefined : `HTTP ${response.status}`
        )
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }

    return createDependencyHealth(
      config.name,
      config.type,
      "unknown",
      config.critical,
      undefined,
      "No check function or endpoint configured"
    )
  } catch (error) {
    const latency = Date.now() - startTime
    const message = error instanceof Error ? error.message : "Unknown error"

    return createDependencyHealth(
      config.name,
      config.type,
      "unhealthy",
      config.critical,
      latency,
      message
    )
  }
}

/**
 * Check all dependencies
 */
export async function checkAllDependencies(
  configs: DependencyConfig[]
): Promise<DependencyHealth[]> {
  const results = await Promise.all(configs.map(config => checkDependency(config)))
  return results
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * Create circuit breaker
 */
export function createCircuitBreaker(
  name: string,
  config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker {
  return {
    name,
    state: "closed",
    failureCount: 0,
    successCount: 0,
    lastStateChange: new Date(),
    config: { ...DEFAULT_CIRCUIT_CONFIG, ...config },
    metrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastMinuteRequests: 0,
    },
  }
}

/**
 * Record successful request
 */
export function recordSuccess(breaker: CircuitBreaker): CircuitBreaker {
  const newSuccessCount = breaker.successCount + 1

  let newState = breaker.state
  const newFailureCount = 0 // Reset on success

  // If half-open and we've hit success threshold, close the circuit
  if (breaker.state === "half_open" && newSuccessCount >= breaker.config.successThreshold) {
    newState = "closed"
  }

  return {
    ...breaker,
    state: newState,
    successCount: newSuccessCount,
    failureCount: newFailureCount,
    lastSuccess: new Date(),
    lastStateChange: newState !== breaker.state ? new Date() : breaker.lastStateChange,
    metrics: {
      ...breaker.metrics,
      totalRequests: breaker.metrics.totalRequests + 1,
      successfulRequests: breaker.metrics.successfulRequests + 1,
    },
  }
}

/**
 * Record failed request
 */
export function recordFailure(breaker: CircuitBreaker): CircuitBreaker {
  const newFailureCount = breaker.failureCount + 1

  let newState = breaker.state
  const newSuccessCount = 0 // Reset on failure

  // Check if we should open the circuit
  if (breaker.state === "closed" || breaker.state === "half_open") {
    if (newFailureCount >= breaker.config.failureThreshold) {
      newState = "open"
    }
  }

  return {
    ...breaker,
    state: newState,
    failureCount: newFailureCount,
    successCount: newSuccessCount,
    lastFailure: new Date(),
    lastStateChange: newState !== breaker.state ? new Date() : breaker.lastStateChange,
    metrics: {
      ...breaker.metrics,
      totalRequests: breaker.metrics.totalRequests + 1,
      failedRequests: breaker.metrics.failedRequests + 1,
    },
  }
}

/**
 * Record rejected request (circuit open)
 */
export function recordRejection(breaker: CircuitBreaker): CircuitBreaker {
  return {
    ...breaker,
    metrics: {
      ...breaker.metrics,
      rejectedRequests: breaker.metrics.rejectedRequests + 1,
    },
  }
}

/**
 * Check if circuit should transition to half-open
 */
export function shouldTryHalfOpen(breaker: CircuitBreaker): boolean {
  if (breaker.state !== "open") return false

  const timeSinceLastFailure = breaker.lastFailure
    ? Date.now() - breaker.lastFailure.getTime()
    : Infinity

  return timeSinceLastFailure >= breaker.config.timeout
}

/**
 * Transition to half-open state
 */
export function transitionToHalfOpen(breaker: CircuitBreaker): CircuitBreaker {
  return {
    ...breaker,
    state: "half_open",
    successCount: 0,
    failureCount: 0,
    lastStateChange: new Date(),
  }
}

/**
 * Check if request should be allowed
 */
export function shouldAllowRequest(breaker: CircuitBreaker): {
  allowed: boolean
  breaker: CircuitBreaker
} {
  if (breaker.state === "closed") {
    return { allowed: true, breaker }
  }

  if (breaker.state === "open") {
    if (shouldTryHalfOpen(breaker)) {
      return {
        allowed: true,
        breaker: transitionToHalfOpen(breaker),
      }
    }
    return {
      allowed: false,
      breaker: recordRejection(breaker),
    }
  }

  // half_open state - allow limited requests
  return { allowed: true, breaker }
}

/**
 * Execute with circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  breaker: CircuitBreaker,
  operation: () => Promise<T>
): Promise<{ result?: T; error?: Error; breaker: CircuitBreaker }> {
  const { allowed, breaker: checkedBreaker } = shouldAllowRequest(breaker)

  if (!allowed) {
    return {
      error: new Error("Circuit breaker is open"),
      breaker: checkedBreaker,
    }
  }

  try {
    const result = await operation()
    return {
      result,
      breaker: recordSuccess(checkedBreaker),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      breaker: recordFailure(checkedBreaker),
    }
  }
}

// =============================================================================
// HEALTH PROBES
// =============================================================================

/**
 * Create health probe
 */
export function createHealthProbe(
  name: string,
  type: HealthProbe["type"],
  checkFn: () => Promise<HealthCheck>,
  options: {
    interval?: number
    timeout?: number
    critical?: boolean
  } = {}
): HealthProbe {
  return {
    name,
    type,
    check: checkFn,
    interval: options.interval ?? 30000,
    timeout: options.timeout ?? 5000,
    critical: options.critical ?? false,
  }
}

/**
 * Execute health probe with timeout
 */
export async function executeProbe(probe: HealthProbe): Promise<HealthCheck> {
  const startTime = Date.now()

  try {
    const timeoutPromise = new Promise<HealthCheck>((_, reject) => {
      setTimeout(() => reject(new Error("Probe timeout")), probe.timeout)
    })

    const result = await Promise.race([probe.check(), timeoutPromise])
    return result
  } catch (error) {
    const latency = Date.now() - startTime
    return createHealthCheck(
      probe.name,
      "unhealthy",
      latency,
      error instanceof Error ? error.message : "Unknown error"
    )
  }
}

/**
 * Execute all probes of a type
 */
export async function executeProbes(
  probes: HealthProbe[],
  type: HealthProbe["type"]
): Promise<HealthCheck[]> {
  const filteredProbes = probes.filter(p => p.type === type)
  return Promise.all(filteredProbes.map(probe => executeProbe(probe)))
}

// =============================================================================
// HEALTH REPORT GENERATION
// =============================================================================

/**
 * Create health metrics
 */
export function createHealthMetrics(
  data: Partial<HealthMetrics> = {}
): HealthMetrics {
  return {
    requestsPerSecond: data.requestsPerSecond ?? 0,
    avgResponseTime: data.avgResponseTime ?? 0,
    errorRate: data.errorRate ?? 0,
    activeConnections: data.activeConnections ?? 0,
    memoryUsage: data.memoryUsage ?? 0,
    cpuUsage: data.cpuUsage ?? 0,
  }
}

/**
 * Create health report
 */
export function createHealthReport(
  checks: HealthCheck[],
  dependencies: DependencyHealth[],
  metrics: HealthMetrics,
  version: string,
  startTime: Date
): HealthReport {
  const status = determineOverallStatus(checks, dependencies)
  const uptime = Date.now() - startTime.getTime()

  return {
    status,
    timestamp: new Date(),
    uptime,
    version,
    checks,
    dependencies,
    metrics,
  }
}

/**
 * Format health report for API response
 */
export function formatHealthReport(report: HealthReport): {
  status: string
  timestamp: string
  uptime: string
  version: string
  checks: Array<{
    name: string
    status: string
    latency?: number
    message?: string
  }>
  dependencies: Array<{
    name: string
    type: string
    status: string
    critical: boolean
  }>
} {
  return {
    status: report.status,
    timestamp: report.timestamp.toISOString(),
    uptime: formatUptime(report.uptime),
    version: report.version,
    checks: report.checks.map(c => ({
      name: c.name,
      status: c.status,
      latency: c.latency,
      message: c.message,
    })),
    dependencies: report.dependencies.map(d => ({
      name: d.name,
      type: d.type,
      status: d.status,
      critical: d.critical,
    })),
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format uptime for display
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    healthy: "#22c55e",
    degraded: "#f97316",
    unhealthy: "#ef4444",
    unknown: "#6b7280",
  }
  return colors[status]
}

/**
 * Get circuit state color for UI
 */
export function getCircuitStateColor(state: CircuitState): string {
  const colors: Record<CircuitState, string> = {
    closed: "#22c55e",
    open: "#ef4444",
    half_open: "#f97316",
  }
  return colors[state]
}

/**
 * Calculate error rate
 */
export function calculateErrorRate(
  successful: number,
  failed: number
): number {
  const total = successful + failed
  if (total === 0) return 0
  return Math.round((failed / total) * 10000) / 100
}

/**
 * Check if status is operational
 */
export function isOperational(status: HealthStatus): boolean {
  return status === "healthy" || status === "degraded"
}

/**
 * Create liveness probe (is the service running?)
 */
export function createLivenessProbe(): HealthProbe {
  return createHealthProbe(
    "liveness",
    "liveness",
    async () => createHealthCheck("liveness", "healthy"),
    { critical: true }
  )
}

/**
 * Create readiness probe (is the service ready to accept traffic?)
 */
export function createReadinessProbe(
  checkFn: () => Promise<boolean>
): HealthProbe {
  return createHealthProbe(
    "readiness",
    "readiness",
    async () => {
      const ready = await checkFn()
      return createHealthCheck(
        "readiness",
        ready ? "healthy" : "unhealthy",
        undefined,
        ready ? undefined : "Service not ready"
      )
    },
    { critical: true }
  )
}
