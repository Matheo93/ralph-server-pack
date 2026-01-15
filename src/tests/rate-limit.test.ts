import { describe, it, expect, beforeEach } from "vitest"
import {
  checkRateLimit,
  clearRateLimitStorage,
  getRateLimitStats,
  RATE_LIMITS,
} from "@/lib/rate-limit"

describe("Rate Limiting", () => {
  beforeEach(() => {
    clearRateLimitStorage()
  })

  describe("checkRateLimit", () => {
    it("should allow requests under the limit", () => {
      const config = { limit: 5, windowMs: 60000 }
      const result1 = checkRateLimit("test-key-1", config)
      expect(result1.limited).toBe(false)
      expect(result1.remaining).toBe(4)

      const result2 = checkRateLimit("test-key-1", config)
      expect(result2.limited).toBe(false)
      expect(result2.remaining).toBe(3)
    })

    it("should block requests over the limit", () => {
      const config = { limit: 3, windowMs: 60000 }
      checkRateLimit("test-key-2", config)
      checkRateLimit("test-key-2", config)
      checkRateLimit("test-key-2", config)
      const result = checkRateLimit("test-key-2", config)
      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it("should track different keys separately", () => {
      const config = { limit: 2, windowMs: 60000 }
      checkRateLimit("key-a", config)
      checkRateLimit("key-a", config)
      const resultA = checkRateLimit("key-a", config)
      expect(resultA.limited).toBe(true)

      const resultB = checkRateLimit("key-b", config)
      expect(resultB.limited).toBe(false)
      expect(resultB.remaining).toBe(1)
    })
  })

  describe("RATE_LIMITS configurations", () => {
    it("should have vocal limit of 10 per minute", () => {
      expect(RATE_LIMITS.vocal.limit).toBe(10)
      expect(RATE_LIMITS.vocal.windowMs).toBe(60000)
    })

    it("should have auth limit of 5 per minute", () => {
      expect(RATE_LIMITS.auth.limit).toBe(5)
    })

    it("should have stripe limit of 20 per minute", () => {
      expect(RATE_LIMITS.stripe.limit).toBe(20)
    })

    it("should have export limit of 5 per minute", () => {
      expect(RATE_LIMITS.export.limit).toBe(5)
    })
  })

  describe("getRateLimitStats", () => {
    it("should return stats about rate limit storage", () => {
      checkRateLimit("key-1", { limit: 10, windowMs: 60000 })
      checkRateLimit("key-2", { limit: 10, windowMs: 60000 })
      const stats = getRateLimitStats()
      expect(stats.totalEntries).toBe(2)
      expect(stats.activeEntries).toBe(2)
    })
  })
})
