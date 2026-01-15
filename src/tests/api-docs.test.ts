/**
 * API Documentation Tests
 *
 * Unit tests for OpenAPI schema generation, error codes, and rate limits.
 */

import { describe, it, expect } from "vitest"

// =============================================================================
// OPENAPI SPEC TESTS
// =============================================================================

describe("OpenAPI Specification", () => {
  it("should generate valid OpenAPI 3.1 spec", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()

    expect(spec.openapi).toBe("3.1.0")
    expect(spec.info).toBeDefined()
    expect(spec.info.title).toBe("FamilyLoad API")
    expect(spec.info.version).toBeDefined()
    expect(spec.servers).toBeDefined()
    expect(Array.isArray(spec.servers)).toBe(true)
    expect(spec.servers.length).toBeGreaterThanOrEqual(1)
  })

  it("should have complete info section", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const { info } = spec

    expect(info.title).toBeDefined()
    expect(info.description).toBeDefined()
    expect(info.description.length).toBeGreaterThan(50)
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(info.contact).toBeDefined()
    expect(info.contact.email).toContain("@familyload")
    expect(info.license).toBeDefined()
  })

  it("should have correct servers configuration", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const { servers } = spec

    expect(servers.length).toBeGreaterThanOrEqual(2)

    // Production server
    const prodServer = servers.find((s) => s.description.toLowerCase().includes("production"))
    expect(prodServer).toBeDefined()

    // Development server
    const devServer = servers.find((s) => s.description.toLowerCase().includes("development"))
    expect(devServer).toBeDefined()
    expect(devServer?.url).toContain("localhost")
  })

  it("should have security schemes defined", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const { securitySchemes } = spec.components

    expect(securitySchemes).toBeDefined()
    expect(securitySchemes["bearerAuth"]).toBeDefined()
    expect(securitySchemes["bearerAuth"]?.type).toBe("http")
    expect(securitySchemes["bearerAuth"]?.scheme).toBe("bearer")
    expect(securitySchemes["bearerAuth"]?.bearerFormat).toBe("JWT")
  })

  it("should have all required tags", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const tagNames = spec.tags.map((t) => t.name)

    expect(tagNames).toContain("Tasks")
    expect(tagNames).toContain("Mobile")
    expect(tagNames).toContain("Notifications")
    expect(tagNames).toContain("Billing")

    // Each tag should have a description
    spec.tags.forEach((tag) => {
      expect(tag.description).toBeDefined()
      expect(tag.description.length).toBeGreaterThan(10)
    })
  })
})

// =============================================================================
// API PATHS TESTS
// =============================================================================

describe("API Paths", () => {
  it("should define task endpoints", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    expect(apiPaths["/api/v1/tasks"]).toBeDefined()
    expect(apiPaths["/api/v1/tasks"]?.get).toBeDefined()
    expect(apiPaths["/api/v1/tasks"]?.post).toBeDefined()
    expect(apiPaths["/api/v1/tasks/{id}"]).toBeDefined()
    expect(apiPaths["/api/v1/tasks/{id}"]?.get).toBeDefined()
    expect(apiPaths["/api/v1/tasks/{id}"]?.patch).toBeDefined()
    expect(apiPaths["/api/v1/tasks/{id}"]?.delete).toBeDefined()
  })

  it("should define mobile endpoints", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    expect(apiPaths["/api/mobile/register-device"]).toBeDefined()
    expect(apiPaths["/api/mobile/register-device"]?.post).toBeDefined()
    expect(apiPaths["/api/mobile/sync"]).toBeDefined()
    expect(apiPaths["/api/mobile/sync"]?.get).toBeDefined()
    expect(apiPaths["/api/mobile/health"]).toBeDefined()
    expect(apiPaths["/api/mobile/health"]?.get).toBeDefined()
  })

  it("should define notification endpoints", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    expect(apiPaths["/api/notifications/subscribe"]).toBeDefined()
    expect(apiPaths["/api/notifications/subscribe"]?.post).toBeDefined()
    expect(apiPaths["/api/notifications/subscribe"]?.delete).toBeDefined()
  })

  it("should define billing endpoints", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    expect(apiPaths["/api/billing/checkout"]).toBeDefined()
    expect(apiPaths["/api/billing/checkout"]?.post).toBeDefined()
    expect(apiPaths["/api/billing/portal"]).toBeDefined()
    expect(apiPaths["/api/billing/portal"]?.post).toBeDefined()
    expect(apiPaths["/api/billing/invoices"]).toBeDefined()
    expect(apiPaths["/api/billing/invoices"]?.get).toBeDefined()
  })

  it("should have valid operation definitions", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    // Check a sample endpoint (v1 tasks)
    const taskPost = apiPaths["/api/v1/tasks"]?.post

    expect(taskPost?.tags).toBeDefined()
    expect(taskPost?.tags).toContain("Tasks")
    expect(taskPost?.summary).toBeDefined()
    expect(taskPost?.description).toBeDefined()
    expect(taskPost?.operationId).toBeDefined()
    expect(taskPost?.operationId).toBe("createTask")
    expect(taskPost?.responses).toBeDefined()
    expect(taskPost?.responses["201"]).toBeDefined()
    expect(taskPost?.responses["400"]).toBeDefined()
  })

  it("should require authentication for protected endpoints", async () => {
    const { apiPaths } = await import("@/lib/openapi/schema")

    // Tasks should require auth
    expect(apiPaths["/api/v1/tasks"]?.get?.security).toBeDefined()
    expect(apiPaths["/api/v1/tasks"]?.post?.security).toBeDefined()

    // Health check should not require auth
    expect(apiPaths["/api/mobile/health"]?.get?.security).toBeUndefined()
  })
})

// =============================================================================
// COMMON SCHEMAS TESTS
// =============================================================================

describe("Common Schemas", () => {
  it("should define all required schemas", async () => {
    const { commonSchemas } = await import("@/lib/openapi/schema")

    expect(commonSchemas["Error"]).toBeDefined()
    expect(commonSchemas["Success"]).toBeDefined()
    expect(commonSchemas["Task"]).toBeDefined()
    expect(commonSchemas["Child"]).toBeDefined()
    expect(commonSchemas["Household"]).toBeDefined()
    expect(commonSchemas["User"]).toBeDefined()
    expect(commonSchemas["DeviceToken"]).toBeDefined()
    expect(commonSchemas["Invoice"]).toBeDefined()
  })

  it("should have valid Error schema", async () => {
    const { commonSchemas } = await import("@/lib/openapi/schema")

    const errorSchema = commonSchemas["Error"]
    expect(errorSchema?.type).toBe("object")
    expect(errorSchema?.properties?.["error"]).toBeDefined()
    expect(errorSchema?.required).toContain("error")
  })

  it("should have valid Task schema with all fields", async () => {
    const { commonSchemas } = await import("@/lib/openapi/schema")

    const taskSchema = commonSchemas["Task"]
    expect(taskSchema?.type).toBe("object")
    expect(taskSchema?.properties?.["id"]).toBeDefined()
    expect(taskSchema?.properties?.["title"]).toBeDefined()
    expect(taskSchema?.properties?.["status"]).toBeDefined()
    expect(taskSchema?.properties?.["status"]?.enum).toContain("pending")
    expect(taskSchema?.properties?.["status"]?.enum).toContain("completed")
    expect(taskSchema?.required).toContain("id")
    expect(taskSchema?.required).toContain("title")
    expect(taskSchema?.required).toContain("status")
  })

  it("should have valid Invoice schema", async () => {
    const { commonSchemas } = await import("@/lib/openapi/schema")

    const invoiceSchema = commonSchemas["Invoice"]
    expect(invoiceSchema?.type).toBe("object")
    expect(invoiceSchema?.properties?.["id"]).toBeDefined()
    expect(invoiceSchema?.properties?.["amountDue"]).toBeDefined()
    expect(invoiceSchema?.properties?.["amountDue"]?.description).toContain("cents")
    expect(invoiceSchema?.properties?.["status"]?.enum).toContain("paid")
    expect(invoiceSchema?.properties?.["status"]?.enum).toContain("open")
  })
})

// =============================================================================
// ERROR CODES TESTS
// =============================================================================

describe("Error Codes", () => {
  it("should define all error code categories", async () => {
    const { ERROR_CODES } = await import("@/lib/openapi/schema")

    // Authentication errors
    expect(ERROR_CODES.AUTH_REQUIRED).toBeDefined()
    expect(ERROR_CODES.AUTH_INVALID_TOKEN).toBeDefined()
    expect(ERROR_CODES.AUTH_EXPIRED_TOKEN).toBeDefined()

    // Validation errors
    expect(ERROR_CODES.VALIDATION_ERROR).toBeDefined()
    expect(ERROR_CODES.INVALID_INPUT).toBeDefined()

    // Resource errors
    expect(ERROR_CODES.NOT_FOUND).toBeDefined()
    expect(ERROR_CODES.ALREADY_EXISTS).toBeDefined()

    // Permission errors
    expect(ERROR_CODES.FORBIDDEN).toBeDefined()

    // Rate limiting
    expect(ERROR_CODES.RATE_LIMITED).toBeDefined()

    // Server errors
    expect(ERROR_CODES.INTERNAL_ERROR).toBeDefined()

    // Billing errors
    expect(ERROR_CODES.PAYMENT_REQUIRED).toBeDefined()
    expect(ERROR_CODES.SUBSCRIPTION_EXPIRED).toBeDefined()
  })

  it("should have unique error codes", async () => {
    const { ERROR_CODES } = await import("@/lib/openapi/schema")

    const values = Object.values(ERROR_CODES)
    const uniqueValues = new Set(values)

    expect(values.length).toBe(uniqueValues.size)
  })

  it("should follow snake_case naming convention", async () => {
    const { ERROR_CODES } = await import("@/lib/openapi/schema")

    Object.values(ERROR_CODES).forEach((code) => {
      expect(code).toMatch(/^[a-z_]+$/)
    })
  })
})

// =============================================================================
// RATE LIMITS TESTS
// =============================================================================

describe("Rate Limits", () => {
  it("should define rate limits for different endpoints", async () => {
    const { RATE_LIMITS } = await import("@/lib/openapi/schema")

    expect(RATE_LIMITS.default).toBeDefined()
    expect(RATE_LIMITS.auth).toBeDefined()
    expect(RATE_LIMITS.voice).toBeDefined()
    expect(RATE_LIMITS.sync).toBeDefined()
    expect(RATE_LIMITS.publicEndpoints).toBeDefined()
  })

  it("should have reasonable rate limit values", async () => {
    const { RATE_LIMITS } = await import("@/lib/openapi/schema")

    // Default should be reasonable
    expect(RATE_LIMITS.default).toBeGreaterThanOrEqual(30)
    expect(RATE_LIMITS.default).toBeLessThanOrEqual(120)

    // Auth should be more restrictive
    expect(RATE_LIMITS.auth).toBeLessThan(RATE_LIMITS.default)

    // Signup should be very restrictive
    expect(RATE_LIMITS.signup).toBeLessThanOrEqual(10)
  })

  it("should have numeric values only", async () => {
    const { RATE_LIMITS } = await import("@/lib/openapi/schema")

    Object.values(RATE_LIMITS).forEach((limit) => {
      expect(typeof limit).toBe("number")
      expect(limit).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// SPEC SERIALIZATION TESTS
// =============================================================================

describe("Spec Serialization", () => {
  it("should serialize to valid JSON", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const json = JSON.stringify(spec)

    expect(() => JSON.parse(json)).not.toThrow()
  })

  it("should not contain undefined values", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec = getOpenAPISpec()
    const json = JSON.stringify(spec)

    // undefined values are stripped by JSON.stringify
    // but we should verify the spec doesn't have explicit undefined
    expect(json).not.toContain("undefined")
  })

  it("should produce consistent output", async () => {
    const { getOpenAPISpec } = await import("@/lib/openapi/schema")

    const spec1 = getOpenAPISpec()
    const spec2 = getOpenAPISpec()

    expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2))
  })
})
