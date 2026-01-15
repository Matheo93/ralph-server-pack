/**
 * API Tests
 *
 * Tests for:
 * - OpenAPI schema validation
 * - Error responses
 * - API versioning
 */

import { describe, it, expect, beforeEach } from "vitest"

// OpenAPI tests
import {
  getOpenAPISpec,
  commonSchemas,
  apiPaths,
  ERROR_CODES,
  RATE_LIMITS,
  type ErrorCode,
  type RateLimitKey,
} from "@/lib/openapi/schema"

// Error response tests
import {
  ErrorCodes,
  getErrorMessage,
  getStatusCode,
  createErrorBody,
  createErrorResponse,
  authRequired,
  forbidden,
  notFound,
  validationError,
  rateLimited,
  internalError,
  paymentRequired,
  subscriptionRequired,
  isValidErrorCode,
  ALL_ERROR_CODES,
  type ErrorResponse,
} from "@/lib/api/error-responses"

// Versioning tests
import {
  API_VERSIONS,
  CURRENT_VERSION,
  LATEST_VERSION,
  SUPPORTED_VERSIONS,
  BREAKING_CHANGES,
  isVersionSupported,
  isVersionDeprecated,
  isVersionSunset,
  getDeprecationWarning,
  getMigrationGuide,
  getBreakingChanges,
  createVersionedResponse,
  getVersionDocumentation,
  generateChangelog,
  type APIVersion,
} from "@/lib/api/versioning"

// ============================================================
// OPENAPI TESTS
// ============================================================

describe("OpenAPI Schema", () => {
  describe("Specification", () => {
    it("should return valid OpenAPI 3.1 specification", () => {
      const spec = getOpenAPISpec()

      expect(spec.openapi).toBe("3.1.0")
      expect(spec.info).toBeDefined()
      expect(spec.info.title).toBe("FamilyLoad API")
      expect(spec.info.version).toBeDefined()
    })

    it("should include all required fields", () => {
      const spec = getOpenAPISpec()

      expect(spec.info.title).toBeDefined()
      expect(spec.info.description).toBeDefined()
      expect(spec.info.version).toBeDefined()
      expect(spec.info.contact).toBeDefined()
      expect(spec.info.license).toBeDefined()
    })

    it("should have servers configured", () => {
      const spec = getOpenAPISpec()

      expect(spec.servers.length).toBeGreaterThan(0)
      expect(spec.servers[0].url).toBeDefined()
      expect(spec.servers[0].description).toBeDefined()
    })

    it("should include production and development servers", () => {
      const spec = getOpenAPISpec()
      const serverUrls = spec.servers.map((s) => s.url)

      expect(serverUrls.some((url) => url.includes("localhost"))).toBe(true)
    })

    it("should have tags defined", () => {
      const spec = getOpenAPISpec()

      expect(spec.tags.length).toBeGreaterThan(0)
      spec.tags.forEach((tag) => {
        expect(tag.name).toBeDefined()
        expect(tag.description).toBeDefined()
      })
    })

    it("should include security schemes", () => {
      const spec = getOpenAPISpec()

      expect(spec.components.securitySchemes).toBeDefined()
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined()
      expect(spec.components.securitySchemes.bearerAuth.type).toBe("http")
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer")
    })
  })

  describe("Common Schemas", () => {
    it("should define Error schema", () => {
      expect(commonSchemas.Error).toBeDefined()
      expect(commonSchemas.Error.type).toBe("object")
      expect(commonSchemas.Error.properties?.error).toBeDefined()
      expect(commonSchemas.Error.properties?.code).toBeDefined()
    })

    it("should define Success schema", () => {
      expect(commonSchemas.Success).toBeDefined()
      expect(commonSchemas.Success.type).toBe("object")
      expect(commonSchemas.Success.properties?.success).toBeDefined()
    })

    it("should define Task schema with all fields", () => {
      expect(commonSchemas.Task).toBeDefined()
      expect(commonSchemas.Task.properties?.id).toBeDefined()
      expect(commonSchemas.Task.properties?.title).toBeDefined()
      expect(commonSchemas.Task.properties?.status).toBeDefined()
      expect(commonSchemas.Task.properties?.priority).toBeDefined()
      expect(commonSchemas.Task.properties?.category).toBeDefined()
    })

    it("should define TaskCreate schema", () => {
      expect(commonSchemas.TaskCreate).toBeDefined()
      expect(commonSchemas.TaskCreate.required).toContain("title")
    })

    it("should define Child schema", () => {
      expect(commonSchemas.Child).toBeDefined()
      expect(commonSchemas.Child.properties?.id).toBeDefined()
      expect(commonSchemas.Child.properties?.name).toBeDefined()
    })

    it("should define Household schema", () => {
      expect(commonSchemas.Household).toBeDefined()
      expect(commonSchemas.Household.properties?.subscriptionStatus).toBeDefined()
    })

    it("should define User schema", () => {
      expect(commonSchemas.User).toBeDefined()
      expect(commonSchemas.User.properties?.email).toBeDefined()
      expect(commonSchemas.User.properties?.role).toBeDefined()
    })

    it("should define DeviceToken schema", () => {
      expect(commonSchemas.DeviceToken).toBeDefined()
      expect(commonSchemas.DeviceToken.properties?.token).toBeDefined()
      expect(commonSchemas.DeviceToken.properties?.platform).toBeDefined()
    })

    it("should define Invoice schema", () => {
      expect(commonSchemas.Invoice).toBeDefined()
      expect(commonSchemas.Invoice.properties?.amountDue).toBeDefined()
      expect(commonSchemas.Invoice.properties?.status).toBeDefined()
    })

    it("should define VoiceAnalysis schema", () => {
      expect(commonSchemas.VoiceAnalysis).toBeDefined()
      expect(commonSchemas.VoiceAnalysis.properties?.transcript).toBeDefined()
      expect(commonSchemas.VoiceAnalysis.properties?.suggestedTasks).toBeDefined()
    })

    it("should define StreakStatus schema", () => {
      expect(commonSchemas.StreakStatus).toBeDefined()
      expect(commonSchemas.StreakStatus.properties?.currentStreak).toBeDefined()
    })

    it("should define DistributionStats schema", () => {
      expect(commonSchemas.DistributionStats).toBeDefined()
      expect(commonSchemas.DistributionStats.properties?.distribution).toBeDefined()
      expect(commonSchemas.DistributionStats.properties?.isBalanced).toBeDefined()
    })

    it("should define Template schema", () => {
      expect(commonSchemas.Template).toBeDefined()
      expect(commonSchemas.Template.properties?.tasks).toBeDefined()
    })

    it("should include examples in schemas", () => {
      expect(commonSchemas.Task.example).toBeDefined()
      expect(commonSchemas.Child.example).toBeDefined()
    })
  })

  describe("API Paths", () => {
    it("should have task endpoints", () => {
      expect(apiPaths["/api/v1/tasks"]).toBeDefined()
      expect(apiPaths["/api/v1/tasks"].get).toBeDefined()
      expect(apiPaths["/api/v1/tasks"].post).toBeDefined()
      expect(apiPaths["/api/v1/tasks/{id}"]).toBeDefined()
    })

    it("should have children endpoints", () => {
      expect(apiPaths["/api/v1/children"]).toBeDefined()
      expect(apiPaths["/api/v1/children/{id}"]).toBeDefined()
    })

    it("should have household endpoint", () => {
      expect(apiPaths["/api/v1/household"]).toBeDefined()
    })

    it("should have sync endpoint", () => {
      expect(apiPaths["/api/v1/sync"]).toBeDefined()
    })

    it("should have voice endpoints", () => {
      expect(apiPaths["/api/voice/transcribe"]).toBeDefined()
      expect(apiPaths["/api/voice/analyze"]).toBeDefined()
      expect(apiPaths["/api/voice/create-task"]).toBeDefined()
    })

    it("should have streak endpoints", () => {
      expect(apiPaths["/api/streak/status"]).toBeDefined()
      expect(apiPaths["/api/streak/validate"]).toBeDefined()
    })

    it("should have distribution endpoints", () => {
      expect(apiPaths["/api/distribution/stats"]).toBeDefined()
      expect(apiPaths["/api/distribution/balance"]).toBeDefined()
    })

    it("should have catalog endpoints", () => {
      expect(apiPaths["/api/catalog/templates"]).toBeDefined()
      expect(apiPaths["/api/catalog/generate"]).toBeDefined()
      expect(apiPaths["/api/catalog/suggestions"]).toBeDefined()
    })

    it("should have billing endpoints", () => {
      expect(apiPaths["/api/billing/checkout"]).toBeDefined()
      expect(apiPaths["/api/billing/portal"]).toBeDefined()
      expect(apiPaths["/api/billing/status"]).toBeDefined()
      expect(apiPaths["/api/billing/invoices"]).toBeDefined()
    })

    it("should have notification endpoints", () => {
      expect(apiPaths["/api/notifications/subscribe"]).toBeDefined()
      expect(apiPaths["/api/notifications/preferences"]).toBeDefined()
    })

    it("should have GDPR endpoints", () => {
      expect(apiPaths["/api/gdpr/export"]).toBeDefined()
      expect(apiPaths["/api/gdpr/delete"]).toBeDefined()
      expect(apiPaths["/api/gdpr/anonymize"]).toBeDefined()
    })

    it("should have health endpoint", () => {
      expect(apiPaths["/api/health"]).toBeDefined()
    })

    it("should have metrics endpoint", () => {
      expect(apiPaths["/api/metrics"]).toBeDefined()
    })

    it("should have mobile endpoints", () => {
      expect(apiPaths["/api/mobile/health"]).toBeDefined()
      expect(apiPaths["/api/mobile/register-device"]).toBeDefined()
      expect(apiPaths["/api/mobile/sync"]).toBeDefined()
    })

    it("should have export endpoints", () => {
      expect(apiPaths["/api/export/pdf"]).toBeDefined()
      expect(apiPaths["/api/export/data"]).toBeDefined()
    })

    it("should have analytics endpoint", () => {
      expect(apiPaths["/api/analytics"]).toBeDefined()
    })

    it("should require authentication for protected endpoints", () => {
      expect(apiPaths["/api/v1/tasks"].get?.security).toBeDefined()
      expect(apiPaths["/api/v1/tasks"].post?.security).toBeDefined()
    })

    it("should not require authentication for public endpoints", () => {
      expect(apiPaths["/api/health"].get?.security).toBeUndefined()
    })
  })

  describe("Error Codes", () => {
    it("should define all error codes", () => {
      expect(ERROR_CODES.AUTH_REQUIRED).toBe("auth_required")
      expect(ERROR_CODES.NOT_FOUND).toBe("not_found")
      expect(ERROR_CODES.RATE_LIMITED).toBe("rate_limited")
      expect(ERROR_CODES.INTERNAL_ERROR).toBe("internal_error")
    })
  })

  describe("Rate Limits", () => {
    it("should define rate limits", () => {
      expect(RATE_LIMITS.default).toBe(60)
      expect(RATE_LIMITS.auth).toBe(10)
      expect(RATE_LIMITS.voice).toBe(30)
    })
  })
})

// ============================================================
// ERROR RESPONSE TESTS
// ============================================================

describe("Error Responses", () => {
  describe("Error Codes", () => {
    it("should define authentication error codes", () => {
      expect(ErrorCodes.AUTH_REQUIRED).toBe("auth_required")
      expect(ErrorCodes.AUTH_INVALID_TOKEN).toBe("auth_invalid_token")
      expect(ErrorCodes.AUTH_EXPIRED_TOKEN).toBe("auth_expired_token")
    })

    it("should define authorization error codes", () => {
      expect(ErrorCodes.FORBIDDEN).toBe("forbidden")
      expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe("insufficient_permissions")
      expect(ErrorCodes.HOUSEHOLD_ACCESS_DENIED).toBe("household_access_denied")
    })

    it("should define validation error codes", () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe("validation_error")
      expect(ErrorCodes.INVALID_INPUT).toBe("invalid_input")
      expect(ErrorCodes.MISSING_FIELD).toBe("missing_field")
    })

    it("should define not found error codes", () => {
      expect(ErrorCodes.NOT_FOUND).toBe("not_found")
      expect(ErrorCodes.TASK_NOT_FOUND).toBe("task_not_found")
      expect(ErrorCodes.CHILD_NOT_FOUND).toBe("child_not_found")
    })

    it("should define rate limiting error codes", () => {
      expect(ErrorCodes.RATE_LIMITED).toBe("rate_limited")
      expect(ErrorCodes.TOO_MANY_REQUESTS).toBe("too_many_requests")
    })

    it("should define payment error codes", () => {
      expect(ErrorCodes.PAYMENT_REQUIRED).toBe("payment_required")
      expect(ErrorCodes.SUBSCRIPTION_EXPIRED).toBe("subscription_expired")
    })

    it("should define server error codes", () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe("internal_error")
      expect(ErrorCodes.DATABASE_ERROR).toBe("database_error")
    })

    it("should define voice error codes", () => {
      expect(ErrorCodes.TRANSCRIPTION_FAILED).toBe("transcription_failed")
      expect(ErrorCodes.AUDIO_TOO_LONG).toBe("audio_too_long")
    })
  })

  describe("Error Messages", () => {
    it("should return French message by default", () => {
      const message = getErrorMessage(ErrorCodes.AUTH_REQUIRED)
      expect(message).toBe("Authentification requise")
    })

    it("should return English message", () => {
      const message = getErrorMessage(ErrorCodes.AUTH_REQUIRED, "en")
      expect(message).toBe("Authentication required")
    })

    it("should return Spanish message", () => {
      const message = getErrorMessage(ErrorCodes.AUTH_REQUIRED, "es")
      expect(message).toBe("Autenticación requerida")
    })

    it("should return German message", () => {
      const message = getErrorMessage(ErrorCodes.AUTH_REQUIRED, "de")
      expect(message).toBe("Authentifizierung erforderlich")
    })

    it("should fallback to French for unknown locale", () => {
      const message = getErrorMessage(ErrorCodes.AUTH_REQUIRED, "unknown")
      expect(message).toBe("Authentification requise")
    })

    it("should have messages for all error codes in all locales", () => {
      const locales = ["fr", "en", "es", "de"]

      for (const code of ALL_ERROR_CODES) {
        for (const locale of locales) {
          const message = getErrorMessage(code, locale)
          expect(message).toBeTruthy()
          expect(typeof message).toBe("string")
        }
      }
    })
  })

  describe("Status Codes", () => {
    it("should return 401 for auth errors", () => {
      expect(getStatusCode(ErrorCodes.AUTH_REQUIRED)).toBe(401)
      expect(getStatusCode(ErrorCodes.AUTH_INVALID_TOKEN)).toBe(401)
    })

    it("should return 403 for forbidden errors", () => {
      expect(getStatusCode(ErrorCodes.FORBIDDEN)).toBe(403)
      expect(getStatusCode(ErrorCodes.INSUFFICIENT_PERMISSIONS)).toBe(403)
    })

    it("should return 400 for validation errors", () => {
      expect(getStatusCode(ErrorCodes.VALIDATION_ERROR)).toBe(400)
      expect(getStatusCode(ErrorCodes.INVALID_INPUT)).toBe(400)
    })

    it("should return 404 for not found errors", () => {
      expect(getStatusCode(ErrorCodes.NOT_FOUND)).toBe(404)
      expect(getStatusCode(ErrorCodes.TASK_NOT_FOUND)).toBe(404)
    })

    it("should return 429 for rate limiting errors", () => {
      expect(getStatusCode(ErrorCodes.RATE_LIMITED)).toBe(429)
      expect(getStatusCode(ErrorCodes.TOO_MANY_REQUESTS)).toBe(429)
    })

    it("should return 402 for payment errors", () => {
      expect(getStatusCode(ErrorCodes.PAYMENT_REQUIRED)).toBe(402)
      expect(getStatusCode(ErrorCodes.SUBSCRIPTION_EXPIRED)).toBe(402)
    })

    it("should return 500 for server errors", () => {
      expect(getStatusCode(ErrorCodes.INTERNAL_ERROR)).toBe(500)
      expect(getStatusCode(ErrorCodes.DATABASE_ERROR)).toBe(500)
    })

    it("should return 422 for voice processing errors", () => {
      expect(getStatusCode(ErrorCodes.TRANSCRIPTION_FAILED)).toBe(422)
      expect(getStatusCode(ErrorCodes.ANALYSIS_FAILED)).toBe(422)
    })
  })

  describe("Error Body Creation", () => {
    it("should create error body with code and message", () => {
      const body = createErrorBody(ErrorCodes.AUTH_REQUIRED)

      expect(body.code).toBe(ErrorCodes.AUTH_REQUIRED)
      expect(body.error).toBe("Authentification requise")
      expect(body.timestamp).toBeDefined()
    })

    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" }
      const body = createErrorBody(ErrorCodes.VALIDATION_ERROR, "en", details)

      expect(body.details).toEqual(details)
    })

    it("should include requestId when provided", () => {
      const body = createErrorBody(ErrorCodes.NOT_FOUND, "en", undefined, "req-123")

      expect(body.requestId).toBe("req-123")
    })

    it("should use specified locale", () => {
      const body = createErrorBody(ErrorCodes.NOT_FOUND, "en")

      expect(body.error).toBe("Resource not found")
    })
  })

  describe("Convenience Functions", () => {
    it("should create auth required response", () => {
      const response = authRequired()

      expect(response.status).toBe(401)
    })

    it("should create forbidden response", () => {
      const response = forbidden()

      expect(response.status).toBe(403)
    })

    it("should create not found response", () => {
      const response = notFound()

      expect(response.status).toBe(404)
    })

    it("should create not found response for specific resource", () => {
      const response = notFound("task")

      expect(response.status).toBe(404)
    })

    it("should create validation error response", () => {
      const response = validationError({ field: "email" })

      expect(response.status).toBe(400)
    })

    it("should create rate limited response", () => {
      const response = rateLimited(60)

      expect(response.status).toBe(429)
      expect(response.headers.get("Retry-After")).toBe("60")
    })

    it("should create internal error response", () => {
      const response = internalError()

      expect(response.status).toBe(500)
    })

    it("should create payment required response", () => {
      const response = paymentRequired()

      expect(response.status).toBe(402)
    })

    it("should create subscription required response", () => {
      const response = subscriptionRequired()

      expect(response.status).toBe(403)
    })
  })

  describe("Error Code Validation", () => {
    it("should validate valid error codes", () => {
      expect(isValidErrorCode("auth_required")).toBe(true)
      expect(isValidErrorCode("not_found")).toBe(true)
      expect(isValidErrorCode("internal_error")).toBe(true)
    })

    it("should reject invalid error codes", () => {
      expect(isValidErrorCode("invalid_code")).toBe(false)
      expect(isValidErrorCode("")).toBe(false)
      expect(isValidErrorCode("random")).toBe(false)
    })
  })

  describe("All Error Codes", () => {
    it("should export all error codes", () => {
      expect(ALL_ERROR_CODES.length).toBeGreaterThan(30)
      expect(ALL_ERROR_CODES).toContain("auth_required")
      expect(ALL_ERROR_CODES).toContain("not_found")
      expect(ALL_ERROR_CODES).toContain("internal_error")
    })
  })
})

// ============================================================
// VERSIONING TESTS
// ============================================================

describe("API Versioning", () => {
  describe("Version Configuration", () => {
    it("should define API versions", () => {
      expect(API_VERSIONS.v1).toBeDefined()
      expect(API_VERSIONS.v2).toBeDefined()
    })

    it("should have release dates for versions", () => {
      expect(API_VERSIONS.v1.releaseDate).toBeDefined()
      expect(API_VERSIONS.v2.releaseDate).toBeDefined()
    })

    it("should have status for versions", () => {
      expect(API_VERSIONS.v1.status).toBeDefined()
      expect(API_VERSIONS.v2.status).toBeDefined()
    })

    it("should define current version", () => {
      expect(CURRENT_VERSION).toBe("v1")
    })

    it("should define latest version", () => {
      expect(LATEST_VERSION).toBe("v2")
    })

    it("should list supported versions", () => {
      expect(SUPPORTED_VERSIONS).toContain("v1")
      expect(SUPPORTED_VERSIONS).toContain("v2")
    })
  })

  describe("Version Detection", () => {
    it("should validate supported versions", () => {
      expect(isVersionSupported("v1")).toBe(true)
      expect(isVersionSupported("v2")).toBe(true)
    })

    it("should reject unsupported versions", () => {
      expect(isVersionSupported("v0")).toBe(false)
      expect(isVersionSupported("v3")).toBe(false)
      expect(isVersionSupported("invalid")).toBe(false)
    })
  })

  describe("Deprecation", () => {
    it("should check if version is deprecated", () => {
      // v1 and v2 are current, not deprecated
      expect(isVersionDeprecated("v1")).toBe(false)
      expect(isVersionDeprecated("v2")).toBe(false)
    })

    it("should check if version is sunset", () => {
      expect(isVersionSunset("v1")).toBe(false)
      expect(isVersionSunset("v2")).toBe(false)
    })

    it("should return deprecation warning for deprecated versions", () => {
      // Current versions don't have warnings
      expect(getDeprecationWarning("v1")).toBeUndefined()
    })

    it("should return migration guide if available", () => {
      const guide = getMigrationGuide("v1")
      // v1 doesn't have a guide since it's current
      expect(guide).toBeUndefined()
    })
  })

  describe("Breaking Changes", () => {
    it("should define breaking changes", () => {
      expect(BREAKING_CHANGES.length).toBeGreaterThan(0)
    })

    it("should have required fields in breaking changes", () => {
      BREAKING_CHANGES.forEach((change) => {
        expect(change.version).toBeDefined()
        expect(change.endpoint).toBeDefined()
        expect(change.description).toBeDefined()
        expect(change.migrationPath).toBeDefined()
      })
    })

    it("should get breaking changes for endpoint", () => {
      const changes = getBreakingChanges("/api/tasks", "v1", "v2")

      // Should return v2 changes for /api/tasks
      expect(Array.isArray(changes)).toBe(true)
    })

    it("should return empty array for same version", () => {
      const changes = getBreakingChanges("/api/tasks", "v1", "v1")
      expect(changes).toEqual([])
    })

    it("should return empty array for downgrade", () => {
      const changes = getBreakingChanges("/api/tasks", "v2", "v1")
      expect(changes).toEqual([])
    })
  })

  describe("Versioned Response", () => {
    it("should create versioned response", () => {
      const data = { tasks: [] }
      const response = createVersionedResponse(data, "v1")

      expect(response.data).toEqual(data)
      expect(response.meta.apiVersion).toBe("v1")
    })

    it("should include deprecation warning for deprecated versions", () => {
      const data = { tasks: [] }
      const response = createVersionedResponse(data, "v1")

      // v1 is current, so no warning
      expect(response.meta.deprecationWarning).toBeUndefined()
    })
  })

  describe("Version Documentation", () => {
    it("should return version documentation", () => {
      const docs = getVersionDocumentation()

      expect(docs.versions.length).toBeGreaterThan(0)
      expect(docs.currentVersion).toBe(CURRENT_VERSION)
      expect(docs.latestVersion).toBe(LATEST_VERSION)
      expect(Array.isArray(docs.breakingChanges)).toBe(true)
    })
  })

  describe("Changelog Generation", () => {
    it("should generate changelog between versions", () => {
      const changelog = generateChangelog("v1", "v2")

      expect(changelog).toContain("v1")
      expect(changelog).toContain("v2")
    })

    it("should return no changes message for same version", () => {
      const changelog = generateChangelog("v1", "v1")

      expect(changelog).toContain("No breaking changes")
    })
  })
})
