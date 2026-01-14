/**
 * Rate Limiting Library
 *
 * Implements sliding window rate limiting with configurable limits per endpoint.
 * Uses in-memory storage with automatic cleanup.
 */

import { NextRequest, NextResponse } from "next/server"

// ============================================================
// TYPES
// ============================================================

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Custom identifier function (default: IP + userId) */
  keyGenerator?: (request: NextRequest) => Promise<string>
  /** Message to return when rate limited */
  message?: string
  /** Skip rate limiting for certain requests */
  skip?: (request: NextRequest) => Promise<boolean>
}

interface RateLimitEntry {
  timestamps: number[]
  lastAccessed: number
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  resetIn: number
  limit: number
}

// ============================================================
// STORAGE
// ============================================================

const storage = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60 * 1000
const ENTRY_TTL = 10 * 60 * 1000

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of storage.entries()) {
      if (now - entry.lastAccessed > ENTRY_TTL) {
        storage.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// ============================================================
// DEFAULT CONFIGURATIONS
// ============================================================

export const RATE_LIMITS = {
  vocal: {
    limit: 10,
    windowMs: 60 * 1000,
    message: "Trop de requêtes vocales. Réessayez dans une minute.",
  },
  auth: {
    limit: 5,
    windowMs: 60 * 1000,
    message: "Trop de tentatives. Réessayez dans une minute.",
  },
  stripe: {
    limit: 20,
    windowMs: 60 * 1000,
    message: "Trop de requêtes de paiement. Réessayez dans une minute.",
  },
  export: {
    limit: 5,
    windowMs: 60 * 1000,
    message: "Trop d'exports. Réessayez dans une minute.",
  },
  analytics: {
    limit: 100,
    windowMs: 60 * 1000,
    message: "Trop de requêtes analytics.",
  },
  default: {
    limit: 60,
    windowMs: 60 * 1000,
    message: "Trop de requêtes. Réessayez dans une minute.",
  },
} as const satisfies Record<string, RateLimitConfig>

// ============================================================
// CORE FUNCTIONS
// ============================================================

export async function getDefaultIdentifier(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded
    ? (forwarded.split(",")[0] ?? "unknown").trim()
    : realIp || "unknown"

  const authCookie = request.cookies.get("access_token")?.value
  const userId = authCookie ? `user:${authCookie.slice(0, 16)}` : ""

  return `${ip}:${userId}`
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = storage.get(key)
  if (!entry) {
    entry = { timestamps: [], lastAccessed: now }
    storage.set(key, entry)
  }

  entry.lastAccessed = now
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

  const limited = entry.timestamps.length >= config.limit

  if (!limited) {
    entry.timestamps.push(now)
  }

  const oldestTimestamp = entry.timestamps[0] || now
  const resetIn = Math.max(0, oldestTimestamp + config.windowMs - now)

  return {
    limited,
    remaining: Math.max(0, config.limit - entry.timestamps.length),
    resetIn,
    limit: config.limit,
  }
}

export function rateLimit(config: RateLimitConfig = RATE_LIMITS.default) {
  return async function rateLimitMiddleware(
    request: NextRequest
  ): Promise<RateLimitResult & { response?: NextResponse }> {
    if (config.skip && await config.skip(request)) {
      return {
        limited: false,
        remaining: config.limit,
        resetIn: 0,
        limit: config.limit,
      }
    }

    const keyGenerator = config.keyGenerator || getDefaultIdentifier
    const key = await keyGenerator(request)

    const result = checkRateLimit(key, config)

    if (result.limited) {
      const response = NextResponse.json(
        {
          error: config.message || "Too many requests",
          retryAfter: Math.ceil(result.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.resetIn / 1000)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + result.resetIn),
          },
        }
      )
      return { ...result, response }
    }

    return result
  }
}

export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Remaining", String(result.remaining))
  response.headers.set("X-RateLimit-Reset", String(Date.now() + result.resetIn))
  return response
}

// ============================================================
// STATISTICS
// ============================================================

export function getRateLimitStats(): {
  totalEntries: number
  activeEntries: number
  memoryUsage: string
} {
  const now = Date.now()
  let activeEntries = 0

  for (const entry of storage.values()) {
    if (now - entry.lastAccessed < ENTRY_TTL) {
      activeEntries++
    }
  }

  const memoryBytes = storage.size * 200
  const memoryUsage = memoryBytes > 1024 * 1024
    ? `${(memoryBytes / 1024 / 1024).toFixed(2)} MB`
    : `${(memoryBytes / 1024).toFixed(2)} KB`

  return {
    totalEntries: storage.size,
    activeEntries,
    memoryUsage,
  }
}

export function clearRateLimitStorage(): void {
  storage.clear()
}
