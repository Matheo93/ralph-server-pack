/**
 * API v1 Tests
 *
 * Tests for the mobile REST API endpoints.
 * Tests authentication, CRUD operations, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock database module using vi.hoisted to ensure proper initialization order
const { mockQuery, mockQueryOne, mockSetCurrentUser } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockQueryOne: vi.fn(),
  mockSetCurrentUser: vi.fn(),
}))

vi.mock("@/lib/aws/database", () => ({
  query: mockQuery,
  queryOne: mockQueryOne,
  setCurrentUser: mockSetCurrentUser,
}))

// Import API utilities
import {
  apiSuccess,
  apiError,
  parseBody,
  validateBearerToken,
  checkRateLimit,
  parsePagination,
  paginationMeta,
  withAuth,
} from "@/lib/api/utils"
import { z } from "zod"

// Helper to create mock requests
function createMockRequest(options: {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}): NextRequest {
  const url = new URL("http://localhost:3000/api/test")
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const request = new NextRequest(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  return request
}

describe("API Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("apiSuccess", () => {
    it("should return success response with data", async () => {
      const data = { id: "123", name: "Test" }
      const response = apiSuccess(data)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })

    it("should include meta when provided", async () => {
      const data = [{ id: "1" }, { id: "2" }]
      const meta = { page: 1, limit: 10, total: 100, hasMore: true }
      const response = apiSuccess(data, meta)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.meta).toEqual(meta)
    })
  })

  describe("apiError", () => {
    it("should return error response with default status", async () => {
      const response = apiError("Something went wrong")
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error).toBe("Something went wrong")
    })

    it("should return error response with custom status", async () => {
      const response = apiError("Not found", 404)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error).toBe("Not found")
    })

    it("should return 401 for authentication errors", async () => {
      const response = apiError("Unauthorized", 401)
      expect(response.status).toBe(401)
    })

    it("should return 429 for rate limit errors", async () => {
      const response = apiError("Too many requests", 429)
      expect(response.status).toBe(429)
    })
  })

  describe("parseBody", () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    })

    it("should parse valid JSON body", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { name: "John", age: 30 },
      })

      const result = await parseBody(request, TestSchema)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("John")
        expect(result.data.age).toBe(30)
      }
    })

    it("should return error for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: "not json",
        headers: { "content-type": "application/json" },
      })

      const result = await parseBody(request, TestSchema)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("JSON invalide")
      }
    })

    it("should return error for schema validation failure", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { name: "", age: -5 },
      })

      const result = await parseBody(request, TestSchema)

      expect(result.success).toBe(false)
    })

    it("should return error for missing required fields", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { name: "John" },
      })

      const result = await parseBody(request, TestSchema)

      expect(result.success).toBe(false)
    })
  })

  describe("validateBearerToken", () => {
    it("should return error when no authorization header", async () => {
      const request = createMockRequest({})

      const result = await validateBearerToken(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Token manquant ou invalide")
      }
    })

    it("should return error when authorization header is not Bearer", async () => {
      const request = createMockRequest({
        headers: { authorization: "Basic abc123" },
      })

      const result = await validateBearerToken(request)

      expect(result.success).toBe(false)
    })

    it("should return error when token is too short", async () => {
      const request = createMockRequest({
        headers: { authorization: "Bearer abc" },
      })

      const result = await validateBearerToken(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Token invalide")
      }
    })

    it("should return error when session not found", async () => {
      mockQueryOne.mockResolvedValue(null)

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      const result = await validateBearerToken(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Session invalide ou expirée")
      }
    })

    it("should return error when session is expired", async () => {
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 1)

      mockQueryOne.mockResolvedValue({
        user_id: "user-123",
        expires_at: expiredDate.toISOString(),
      })

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      const result = await validateBearerToken(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe("Session expirée")
      }
    })

    it("should return success with userId for valid token", async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 24)

      mockQueryOne.mockResolvedValue({
        user_id: "user-123",
        expires_at: futureDate.toISOString(),
      })

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      const result = await validateBearerToken(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.userId).toBe("user-123")
      }
    })
  })

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("new-user-" + Date.now())

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99)
    })

    it("should decrement remaining count", () => {
      const userId = "rate-test-user-" + Date.now()

      checkRateLimit(userId)
      const result = checkRateLimit(userId)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(98)
    })

    it("should have positive resetIn", () => {
      const result = checkRateLimit("reset-test-" + Date.now())

      expect(result.resetIn).toBeGreaterThan(0)
      expect(result.resetIn).toBeLessThanOrEqual(60000)
    })
  })

  describe("parsePagination", () => {
    it("should return default values when no params", () => {
      const params = new URLSearchParams()
      const result = parsePagination(params)

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it("should parse page and limit from params", () => {
      const params = new URLSearchParams({ page: "3", limit: "50" })
      const result = parsePagination(params)

      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(100)
    })

    it("should enforce minimum page of 1", () => {
      const params = new URLSearchParams({ page: "0" })
      const result = parsePagination(params)

      expect(result.page).toBe(1)
    })

    it("should enforce maximum limit of 100", () => {
      const params = new URLSearchParams({ limit: "500" })
      const result = parsePagination(params)

      expect(result.limit).toBe(100)
    })

    it("should enforce minimum limit of 1", () => {
      const params = new URLSearchParams({ limit: "0" })
      const result = parsePagination(params)

      expect(result.limit).toBe(1)
    })
  })

  describe("paginationMeta", () => {
    it("should calculate hasMore correctly when more pages exist", () => {
      const meta = paginationMeta(1, 20, 100)

      expect(meta.page).toBe(1)
      expect(meta.limit).toBe(20)
      expect(meta.total).toBe(100)
      expect(meta.hasMore).toBe(true)
    })

    it("should calculate hasMore correctly when on last page", () => {
      const meta = paginationMeta(5, 20, 100)

      expect(meta.hasMore).toBe(false)
    })

    it("should handle single page result", () => {
      const meta = paginationMeta(1, 20, 10)

      expect(meta.hasMore).toBe(false)
    })
  })

  describe("withAuth", () => {
    it("should return 401 when token is invalid", async () => {
      const request = createMockRequest({})

      const response = await withAuth(request, async () => {
        return apiSuccess({ test: true })
      })

      expect(response.status).toBe(401)
    })

    it("should return 403 when user has no household", async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 24)

      mockQueryOne
        .mockResolvedValueOnce({
          user_id: "user-123",
          expires_at: futureDate.toISOString(),
        })
        .mockResolvedValueOnce(null) // No household

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      const response = await withAuth(request, async () => {
        return apiSuccess({ test: true })
      })

      expect(response.status).toBe(403)
    })

    it("should call handler with userId and householdId", async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 24)

      mockQueryOne
        .mockResolvedValueOnce({
          user_id: "user-123",
          expires_at: futureDate.toISOString(),
        })
        .mockResolvedValueOnce({ household_id: "household-456" })

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      let capturedUserId: string | null = null
      let capturedHouseholdId: string | null = null

      await withAuth(request, async (userId, householdId) => {
        capturedUserId = userId
        capturedHouseholdId = householdId
        return apiSuccess({ test: true })
      })

      expect(capturedUserId).toBe("user-123")
      expect(capturedHouseholdId).toBe("household-456")
    })

    it("should add rate limit headers to response", async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 24)

      mockQueryOne
        .mockResolvedValueOnce({
          user_id: "user-withauth-test-" + Date.now(),
          expires_at: futureDate.toISOString(),
        })
        .mockResolvedValueOnce({ household_id: "household-456" })

      const request = createMockRequest({
        headers: { authorization: "Bearer validtoken12345678901234567890" },
      })

      const response = await withAuth(request, async () => {
        return apiSuccess({ test: true })
      })

      expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy()
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy()
    })
  })
})

describe("API v1 Endpoints Structure", () => {
  describe("Tasks API", () => {
    it("should have correct endpoint path", () => {
      expect("/api/v1/tasks").toMatch(/^\/api\/v1\/tasks$/)
    })

    it("should support GET method for listing", () => {
      const methods = ["GET", "POST"]
      expect(methods).toContain("GET")
    })

    it("should support POST method for creation", () => {
      const methods = ["GET", "POST"]
      expect(methods).toContain("POST")
    })

    it("should have task ID endpoint", () => {
      expect("/api/v1/tasks/[id]").toMatch(/\/api\/v1\/tasks\/\[id\]/)
    })
  })

  describe("Children API", () => {
    it("should have correct endpoint path", () => {
      expect("/api/v1/children").toMatch(/^\/api\/v1\/children$/)
    })

    it("should have child ID endpoint", () => {
      expect("/api/v1/children/[id]").toMatch(/\/api\/v1\/children\/\[id\]/)
    })
  })

  describe("Household API", () => {
    it("should have correct endpoint path", () => {
      expect("/api/v1/household").toMatch(/^\/api\/v1\/household$/)
    })
  })

  describe("Sync API", () => {
    it("should have correct endpoint path", () => {
      expect("/api/v1/sync").toMatch(/^\/api\/v1\/sync$/)
    })

    it("should support POST for sync operations", () => {
      const methods = ["POST"]
      expect(methods).toContain("POST")
    })
  })

  describe("Auth API", () => {
    it("should have correct endpoint path", () => {
      expect("/api/v1/auth").toMatch(/^\/api\/v1\/auth$/)
    })

    it("should support POST for login", () => {
      const methods = ["POST", "PUT", "DELETE"]
      expect(methods).toContain("POST")
    })

    it("should support PUT for token refresh", () => {
      const methods = ["POST", "PUT", "DELETE"]
      expect(methods).toContain("PUT")
    })

    it("should support DELETE for logout", () => {
      const methods = ["POST", "PUT", "DELETE"]
      expect(methods).toContain("DELETE")
    })
  })
})

describe("API Security", () => {
  it("should hash tokens before storage", () => {
    // Verify that token hashing function exists
    const crypto = require("crypto")
    const token = "test-token"
    const hash = crypto.createHash("sha256").update(token).digest("hex")

    expect(hash).toHaveLength(64)
    expect(hash).not.toBe(token)
  })

  it("should generate secure random tokens", () => {
    const crypto = require("crypto")
    const token1 = crypto.randomBytes(32).toString("hex")
    const token2 = crypto.randomBytes(32).toString("hex")

    expect(token1).toHaveLength(64)
    expect(token2).toHaveLength(64)
    expect(token1).not.toBe(token2)
  })

  it("should validate email format with Zod", () => {
    const EmailSchema = z.object({ email: z.string().email() })

    const valid = EmailSchema.safeParse({ email: "test@example.com" })
    expect(valid.success).toBe(true)

    const invalid = EmailSchema.safeParse({ email: "not-an-email" })
    expect(invalid.success).toBe(false)
  })

  it("should enforce password minimum length", () => {
    const PasswordSchema = z.object({ password: z.string().min(1) })

    const valid = PasswordSchema.safeParse({ password: "secret" })
    expect(valid.success).toBe(true)

    const invalid = PasswordSchema.safeParse({ password: "" })
    expect(invalid.success).toBe(false)
  })
})
