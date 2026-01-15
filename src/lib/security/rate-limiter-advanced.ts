/**
 * Advanced Rate Limiting Library
 *
 * Features:
 * - Sliding window algorithm (more accurate than fixed windows)
 * - Per-user and per-IP rate limiting
 * - Adaptive rate limiting (backoff after failures)
 * - Distributed rate limiting support (Redis-compatible)
 * - Automatic cleanup with LRU eviction
 */

import { NextRequest, NextResponse } from "next/server"

// ============================================================
// TYPES
// ============================================================

export interface RateLimitConfig {
  /** Maximum requests in window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Message on rate limit */
  message?: string
  /** Custom key generator */
  keyGenerator?: (request: NextRequest) => Promise<string> | string
  /** Skip function */
  skip?: (request: NextRequest) => Promise<boolean> | boolean
  /** Enable adaptive limiting */
  adaptive?: AdaptiveConfig
  /** Store type */
  store?: RateLimitStore
}

export interface AdaptiveConfig {
  /** Enable failure tracking */
  enabled: boolean
  /** Failure endpoints (e.g., login failures) */
  failureEndpoints?: string[]
  /** Multiplier for each failure (default: 2) */
  backoffMultiplier?: number
  /** Maximum backoff multiplier (default: 16) */
  maxBackoffMultiplier?: number
  /** Reset failures after success (default: true) */
  resetOnSuccess?: boolean
  /** Time to keep failure count (default: 1 hour) */
  failureWindowMs?: number
}

export interface RateLimitResult {
  limited: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter: number
  currentCount: number
}

export interface RateLimitStore {
  get(key: string): Promise<SlidingWindowData | null>
  set(key: string, data: SlidingWindowData, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

interface SlidingWindowData {
  /** Requests in previous window */
  previousCount: number
  /** Requests in current window */
  currentCount: number
  /** Start of current window */
  windowStart: number
  /** Failure count for adaptive limiting */
  failures?: number
  /** Last failure timestamp */
  lastFailure?: number
}

// ============================================================
// IN-MEMORY STORE (LRU Cache)
// ============================================================

class LRUCache<K, V> {
  private cache: Map<K, { value: V; lastAccess: number }>
  private maxSize: number

  constructor(maxSize: number = 10000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      entry.lastAccess = Date.now()
      return entry.value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }
    this.cache.set(key, { value, lastAccess: Date.now() })
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  private evict(): void {
    let oldestKey: K | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey)
    }
  }
}

class InMemoryStore implements RateLimitStore {
  private cache: LRUCache<string, SlidingWindowData>
  private ttls: Map<string, number>
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(maxSize: number = 10000) {
    this.cache = new LRUCache(maxSize)
    this.ttls = new Map()

    // Start cleanup interval
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  async get(key: string): Promise<SlidingWindowData | null> {
    const ttl = this.ttls.get(key)
    if (ttl && Date.now() > ttl) {
      this.cache.delete(key)
      this.ttls.delete(key)
      return null
    }
    return this.cache.get(key) ?? null
  }

  async set(key: string, data: SlidingWindowData, ttlMs: number): Promise<void> {
    this.cache.set(key, data)
    this.ttls.set(key, Date.now() + ttlMs)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
    this.ttls.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.ttls.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, ttl] of this.ttls.entries()) {
      if (now > ttl) {
        this.cache.delete(key)
        this.ttls.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// ============================================================
// GLOBAL STORE
// ============================================================

let globalStore: InMemoryStore | null = null

function getGlobalStore(): InMemoryStore {
  if (!globalStore) {
    globalStore = new InMemoryStore(50000)
  }
  return globalStore
}

// ============================================================
// KEY GENERATORS
// ============================================================

/**
 * Extracts IP address from request
 */
export function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return (forwarded.split(",")[0] ?? "unknown").trim()
  }
  const realIp = request.headers.get("x-real-ip")
  return realIp || "unknown"
}

/**
 * Extracts user ID from request (cookie or header)
 */
export function extractUserId(request: NextRequest): string | null {
  // Try auth header
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    // Use first 16 chars of token as identifier
    return authHeader.slice(7, 23)
  }

  // Try cookie
  const authCookie = request.cookies.get("access_token")?.value
  if (authCookie) {
    return authCookie.slice(0, 16)
  }

  // Try Supabase auth
  const supabaseCookie = request.cookies.get("sb-access-token")?.value
  if (supabaseCookie) {
    return supabaseCookie.slice(0, 16)
  }

  return null
}

/**
 * Default key generator: IP + user ID
 */
export function defaultKeyGenerator(request: NextRequest): string {
  const ip = extractIp(request)
  const userId = extractUserId(request)
  const path = request.nextUrl.pathname

  if (userId) {
    return `user:${userId}:${path}`
  }
  return `ip:${ip}:${path}`
}

/**
 * IP-only key generator
 */
export function ipKeyGenerator(request: NextRequest): string {
  const ip = extractIp(request)
  return `ip:${ip}`
}

/**
 * User-only key generator (falls back to IP)
 */
export function userKeyGenerator(request: NextRequest): string {
  const userId = extractUserId(request)
  if (userId) {
    return `user:${userId}`
  }
  return ipKeyGenerator(request)
}

/**
 * Endpoint-specific key generator
 */
export function endpointKeyGenerator(request: NextRequest): string {
  const ip = extractIp(request)
  const userId = extractUserId(request)
  const path = request.nextUrl.pathname
  const method = request.method

  const base = userId ? `user:${userId}` : `ip:${ip}`
  return `${base}:${method}:${path}`
}

// ============================================================
// SLIDING WINDOW ALGORITHM
// ============================================================

/**
 * Calculates rate limit using sliding window log algorithm
 */
function calculateSlidingWindow(
  data: SlidingWindowData,
  now: number,
  windowMs: number,
  limit: number,
  adaptiveMultiplier: number = 1
): RateLimitResult {
  const windowStart = Math.floor(now / windowMs) * windowMs
  const windowEnd = windowStart + windowMs
  const previousWindowStart = windowStart - windowMs

  // Initialize or reset window
  if (data.windowStart !== windowStart) {
    if (data.windowStart === previousWindowStart) {
      // Sliding from previous window
      data.previousCount = data.currentCount
      data.currentCount = 0
    } else {
      // Too old, reset everything
      data.previousCount = 0
      data.currentCount = 0
    }
    data.windowStart = windowStart
  }

  // Calculate weighted count using sliding window
  const elapsedInWindow = now - windowStart
  const previousWeight = 1 - elapsedInWindow / windowMs
  const weightedCount = Math.floor(
    data.previousCount * previousWeight + data.currentCount
  )

  // Apply adaptive multiplier (reduces effective limit)
  const effectiveLimit = Math.max(1, Math.floor(limit / adaptiveMultiplier))

  // Check if limited
  const limited = weightedCount >= effectiveLimit
  const remaining = Math.max(0, effectiveLimit - weightedCount - (limited ? 0 : 1))

  // Calculate reset time
  const resetAt = windowEnd

  // Calculate retry after (in ms)
  let retryAfter = 0
  if (limited) {
    // Estimate when a slot will be available
    const neededDecay = weightedCount - effectiveLimit + 1
    const decayRate = data.previousCount / windowMs
    retryAfter = decayRate > 0 ? Math.ceil(neededDecay / decayRate) : windowMs
  }

  // Increment current count if not limited
  if (!limited) {
    data.currentCount++
  }

  return {
    limited,
    limit: effectiveLimit,
    remaining,
    resetAt,
    retryAfter,
    currentCount: data.currentCount,
  }
}

// ============================================================
// ADAPTIVE RATE LIMITING
// ============================================================

/**
 * Calculates adaptive multiplier based on failures
 */
function calculateAdaptiveMultiplier(
  data: SlidingWindowData,
  config: AdaptiveConfig
): number {
  if (!config.enabled) {
    return 1
  }

  const failures = data.failures || 0
  const lastFailure = data.lastFailure || 0
  const failureWindow = config.failureWindowMs || 3600000 // 1 hour

  // Reset failures if outside window
  if (Date.now() - lastFailure > failureWindow) {
    data.failures = 0
    return 1
  }

  const multiplier = config.backoffMultiplier || 2
  const maxMultiplier = config.maxBackoffMultiplier || 16

  return Math.min(maxMultiplier, Math.pow(multiplier, failures))
}

/**
 * Records a failure for adaptive rate limiting
 */
export async function recordFailure(
  key: string,
  store?: RateLimitStore
): Promise<void> {
  const actualStore = store || getGlobalStore()
  const now = Date.now()

  let data = await actualStore.get(key)
  if (!data) {
    data = {
      previousCount: 0,
      currentCount: 0,
      windowStart: now,
      failures: 0,
    }
  }

  data.failures = (data.failures || 0) + 1
  data.lastFailure = now

  await actualStore.set(key, data, 3600000) // 1 hour TTL
}

/**
 * Resets failure count (call on successful action)
 */
export async function resetFailures(
  key: string,
  store?: RateLimitStore
): Promise<void> {
  const actualStore = store || getGlobalStore()
  const data = await actualStore.get(key)

  if (data) {
    data.failures = 0
    data.lastFailure = undefined
    await actualStore.set(key, data, 3600000)
  }
}

// ============================================================
// RATE LIMIT PRESETS
// ============================================================

export const RATE_LIMIT_PRESETS = {
  /** Standard API endpoints */
  standard: {
    limit: 60,
    windowMs: 60000,
    message: "Too many requests. Please try again later.",
  },
  /** Authentication endpoints (stricter) */
  auth: {
    limit: 5,
    windowMs: 60000,
    message: "Too many authentication attempts. Please try again later.",
    adaptive: {
      enabled: true,
      backoffMultiplier: 2,
      maxBackoffMultiplier: 32,
      failureWindowMs: 3600000,
    },
  },
  /** Voice/Media uploads (limited) */
  upload: {
    limit: 10,
    windowMs: 60000,
    message: "Too many upload requests. Please wait a moment.",
  },
  /** Export endpoints (heavy operations) */
  export: {
    limit: 5,
    windowMs: 60000,
    message: "Too many export requests. Please try again later.",
  },
  /** Stripe/Payment endpoints */
  payment: {
    limit: 10,
    windowMs: 60000,
    message: "Too many payment requests. Please try again later.",
  },
  /** Search endpoints */
  search: {
    limit: 30,
    windowMs: 60000,
    message: "Too many search requests. Please slow down.",
  },
  /** Relaxed for internal APIs */
  internal: {
    limit: 1000,
    windowMs: 60000,
    message: "Internal rate limit exceeded.",
  },
} as const satisfies Record<string, Partial<RateLimitConfig>>

// ============================================================
// MAIN RATE LIMITER
// ============================================================

export interface AdvancedRateLimiter {
  check(request: NextRequest): Promise<RateLimitResult & { response?: NextResponse }>
  recordFailure(request: NextRequest): Promise<void>
  resetFailures(request: NextRequest): Promise<void>
  getStats(): Promise<RateLimitStats>
}

export interface RateLimitStats {
  totalKeys: number
  activeKeys: number
  memoryEstimate: string
}

/**
 * Creates an advanced rate limiter
 */
export function createRateLimiter(config: RateLimitConfig): AdvancedRateLimiter {
  const {
    limit,
    windowMs,
    message = "Too many requests",
    keyGenerator = defaultKeyGenerator,
    skip,
    adaptive,
    store = getGlobalStore(),
  } = config

  return {
    async check(request: NextRequest) {
      // Check skip condition
      if (skip) {
        const shouldSkip = await Promise.resolve(skip(request))
        if (shouldSkip) {
          return {
            limited: false,
            limit,
            remaining: limit,
            resetAt: Date.now() + windowMs,
            retryAfter: 0,
            currentCount: 0,
          }
        }
      }

      const key = await Promise.resolve(keyGenerator(request))
      const now = Date.now()

      // Get or create data
      let data = await store.get(key)
      if (!data) {
        data = {
          previousCount: 0,
          currentCount: 0,
          windowStart: Math.floor(now / windowMs) * windowMs,
        }
      }

      // Calculate adaptive multiplier
      const adaptiveMultiplier = adaptive
        ? calculateAdaptiveMultiplier(data, adaptive)
        : 1

      // Calculate rate limit
      const result = calculateSlidingWindow(
        data,
        now,
        windowMs,
        limit,
        adaptiveMultiplier
      )

      // Store updated data
      await store.set(key, data, windowMs * 2)

      // Create response if limited
      if (result.limited) {
        const retryAfterSecs = Math.ceil(result.retryAfter / 1000)
        const response = NextResponse.json(
          {
            error: message,
            code: "RATE_LIMITED",
            retryAfter: retryAfterSecs,
            limit: result.limit,
            remaining: 0,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSecs),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(result.resetAt),
            },
          }
        )
        return { ...result, response }
      }

      return result
    },

    async recordFailure(request: NextRequest) {
      const key = await Promise.resolve(keyGenerator(request))
      await recordFailure(key, store)
    },

    async resetFailures(request: NextRequest) {
      const key = await Promise.resolve(keyGenerator(request))
      await resetFailures(key, store)
    },

    async getStats() {
      // Only works with InMemoryStore
      if (store instanceof InMemoryStore) {
        const memStore = store as InMemoryStore & { cache: LRUCache<string, SlidingWindowData> }
        const size = (memStore as unknown as { cache: { size: () => number } }).cache?.size?.() ?? 0
        const memoryBytes = size * 100
        return {
          totalKeys: size,
          activeKeys: size,
          memoryEstimate:
            memoryBytes > 1024 * 1024
              ? `${(memoryBytes / 1024 / 1024).toFixed(2)} MB`
              : `${(memoryBytes / 1024).toFixed(2)} KB`,
        }
      }
      return {
        totalKeys: 0,
        activeKeys: 0,
        memoryEstimate: "N/A (external store)",
      }
    },
  }
}

// ============================================================
// MIDDLEWARE FACTORY
// ============================================================

/**
 * Creates rate limit middleware for Next.js
 */
export function rateLimitMiddleware(
  config: RateLimitConfig = RATE_LIMIT_PRESETS.standard
) {
  const limiter = createRateLimiter(config)

  return async function middleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    const result = await limiter.check(request)

    if (result.response) {
      return result.response
    }

    return null
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Adds rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Remaining", String(result.remaining))
  response.headers.set("X-RateLimit-Reset", String(result.resetAt))
  return response
}

/**
 * Clears rate limit for a specific key
 */
export async function clearRateLimit(
  key: string,
  store?: RateLimitStore
): Promise<void> {
  const actualStore = store || getGlobalStore()
  await actualStore.delete(key)
}

/**
 * Clears all rate limit data
 */
export async function clearAllRateLimits(store?: RateLimitStore): Promise<void> {
  const actualStore = store || getGlobalStore()
  await actualStore.clear()
}

// ============================================================
// COMPOSITE RATE LIMITER
// ============================================================

export interface CompositeRateLimiterConfig {
  /** Global rate limit (applies to all requests) */
  global?: RateLimitConfig
  /** Per-IP rate limit */
  perIp?: RateLimitConfig
  /** Per-user rate limit */
  perUser?: RateLimitConfig
  /** Per-endpoint rate limit */
  perEndpoint?: RateLimitConfig
}

/**
 * Creates a composite rate limiter that checks multiple limits
 */
export function createCompositeRateLimiter(config: CompositeRateLimiterConfig) {
  const limiters: Array<{ name: string; limiter: AdvancedRateLimiter }> = []

  if (config.global) {
    limiters.push({
      name: "global",
      limiter: createRateLimiter({
        ...config.global,
        keyGenerator: () => "global",
      }),
    })
  }

  if (config.perIp) {
    limiters.push({
      name: "ip",
      limiter: createRateLimiter({
        ...config.perIp,
        keyGenerator: ipKeyGenerator,
      }),
    })
  }

  if (config.perUser) {
    limiters.push({
      name: "user",
      limiter: createRateLimiter({
        ...config.perUser,
        keyGenerator: userKeyGenerator,
      }),
    })
  }

  if (config.perEndpoint) {
    limiters.push({
      name: "endpoint",
      limiter: createRateLimiter({
        ...config.perEndpoint,
        keyGenerator: endpointKeyGenerator,
      }),
    })
  }

  return {
    async check(
      request: NextRequest
    ): Promise<RateLimitResult & { response?: NextResponse; limitedBy?: string }> {
      for (const { name, limiter } of limiters) {
        const result = await limiter.check(request)
        if (result.limited) {
          return { ...result, limitedBy: name }
        }
      }

      // All passed - return most restrictive remaining
      const results = await Promise.all(
        limiters.map(async ({ limiter }) => limiter.check(request))
      )

      const mostRestrictive = results.reduce(
        (min, result) => (result.remaining < min.remaining ? result : min),
        results[0]!
      )

      return mostRestrictive
    },
  }
}
