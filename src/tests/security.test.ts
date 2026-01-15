import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"

// ============================================================
// CSRF PROTECTION TESTS
// ============================================================

import {
  generateCsrfToken,
  generateSignedCsrfToken,
  verifySignedCsrfToken,
  timingSafeEqual,
  validateCsrfToken,
  extractCsrfToken,
  csrfProtection,
  CSRF_HEADER_NAME,
  CSRF_COOKIE_NAME,
} from "@/lib/security/csrf-protection"

describe("CSRF Protection", () => {
  describe("generateCsrfToken", () => {
    it("should generate a 64 character hex token", () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    })

    it("should generate unique tokens", () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe("generateSignedCsrfToken", () => {
    it("should generate a signed token with timestamp", async () => {
      const token = await generateSignedCsrfToken("test-secret")
      const parts = token.split(".")
      expect(parts).toHaveLength(3)

      const timestamp = parseInt(parts[0]!, 10)
      expect(timestamp).toBeGreaterThan(0)
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })

    it("should create verifiable tokens", async () => {
      const secret = "test-secret-123"
      const token = await generateSignedCsrfToken(secret)
      const result = await verifySignedCsrfToken(token, secret)
      expect(result.valid).toBe(true)
      expect(result.expired).toBe(false)
    })
  })

  describe("verifySignedCsrfToken", () => {
    it("should reject invalid format", async () => {
      const result = await verifySignedCsrfToken("invalid", "secret")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid token format")
    })

    it("should reject tampered tokens", async () => {
      const token = await generateSignedCsrfToken("secret")
      const parts = token.split(".")
      parts[2] = "tampered"
      const tamperedToken = parts.join(".")

      const result = await verifySignedCsrfToken(tamperedToken, "secret")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid signature")
    })

    it("should reject expired tokens", async () => {
      const token = await generateSignedCsrfToken("secret")
      const parts = token.split(".")
      // Set timestamp to 25 hours ago
      parts[0] = String(Date.now() - 25 * 60 * 60 * 1000)

      // Re-sign would be needed for valid signature, so this tests format
      const result = await verifySignedCsrfToken(parts.join("."), "secret", 1)
      expect(result.expired).toBe(true)
    })
  })

  describe("timingSafeEqual", () => {
    it("should return true for equal strings", () => {
      expect(timingSafeEqual("test", "test")).toBe(true)
    })

    it("should return false for different strings", () => {
      expect(timingSafeEqual("test", "test2")).toBe(false)
    })

    it("should handle different lengths", () => {
      expect(timingSafeEqual("short", "much longer string")).toBe(false)
    })

    it("should handle empty strings", () => {
      expect(timingSafeEqual("", "")).toBe(true)
      expect(timingSafeEqual("", "test")).toBe(false)
    })
  })

  describe("validateCsrfToken", () => {
    it("should fail when cookie is missing", () => {
      const result = validateCsrfToken("token", null)
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Missing CSRF cookie")
    })

    it("should fail when request token is missing", () => {
      const result = validateCsrfToken(null, "cookie-token")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Missing CSRF token in request")
    })

    it("should fail on mismatch", () => {
      const result = validateCsrfToken("token1", "token2")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("CSRF token mismatch")
    })

    it("should succeed on match", () => {
      const result = validateCsrfToken("same-token", "same-token")
      expect(result.valid).toBe(true)
    })
  })

  describe("extractCsrfToken", () => {
    it("should extract token from header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: { [CSRF_HEADER_NAME]: "test-token" },
      })
      expect(extractCsrfToken(request)).toBe("test-token")
    })

    it("should return null when no token", () => {
      const request = new NextRequest("http://localhost/api/test")
      expect(extractCsrfToken(request)).toBeNull()
    })
  })

  describe("csrfProtection middleware", () => {
    it("should skip GET requests", async () => {
      const middleware = csrfProtection()
      const request = new NextRequest("http://localhost/api/test", {
        method: "GET",
      })

      const result = await middleware(request)
      expect(result.valid).toBe(true)
    })

    it("should validate POST requests", async () => {
      const middleware = csrfProtection()
      const request = new NextRequest("http://localhost/api/test", {
        method: "POST",
      })

      const result = await middleware(request)
      expect(result.valid).toBe(false)
    })

    it("should skip excluded paths", async () => {
      const middleware = csrfProtection({
        excludePaths: ["/api/webhook*"],
      })
      const request = new NextRequest("http://localhost/api/webhook/stripe", {
        method: "POST",
      })

      const result = await middleware(request)
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================
// INPUT VALIDATION TESTS
// ============================================================

import {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeHtml,
  detectSqlInjection,
  detectNoSqlInjection,
  detectPathTraversal,
  detectCommandInjection,
  sanitizeUrl,
  validateUrl,
  validateFileUpload,
  validateFileMagicBytes,
  sanitizeFilename,
  sanitizeText,
  sanitizeMultilineText,
  safeJsonParse,
  sanitizeJsonKeys,
  validateInput,
  INPUT_LIMITS,
} from "@/lib/security/input-validation"

describe("Input Validation", () => {
  describe("XSS Sanitization", () => {
    it("should escape HTML entities", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
      )
    })

    it("should unescape HTML entities", () => {
      expect(unescapeHtml("&lt;div&gt;")).toBe("<div>")
    })

    it("should strip HTML tags", () => {
      expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World")
    })

    it("should sanitize HTML keeping safe tags", () => {
      const result = sanitizeHtml(
        '<p>Safe</p><script>alert("xss")</script><b>Bold</b>',
        { allowedTags: ["p", "b"] }
      )
      expect(result).not.toContain("<script>")
      expect(result).toContain("<p>")
    })

    it("should remove event handlers", () => {
      expect(sanitizeHtml('<div onclick="evil()">Test</div>')).not.toContain(
        "onclick"
      )
    })

    it("should remove javascript: URLs", () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">Link</a>')).not.toContain(
        "javascript:"
      )
    })
  })

  describe("SQL Injection Detection", () => {
    const sqliPatterns = [
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "' UNION SELECT * FROM passwords",
      "admin'/*",
      "1; DELETE FROM users",
      "' AND '1'='1",
      "1 OR '1'='1'",
      "' EXEC xp_cmdshell('dir') --",
      "SLEEP(5)--",
      "' WAITFOR DELAY '0:0:5'--",
    ]

    sqliPatterns.forEach((pattern) => {
      it(`should detect SQL injection: ${pattern.slice(0, 30)}...`, () => {
        expect(detectSqlInjection(pattern)).toBe(true)
      })
    })

    it("should not flag normal text", () => {
      expect(detectSqlInjection("Pick up Emma from school")).toBe(false)
      expect(detectSqlInjection("Buy groceries and eggs")).toBe(false)
      expect(detectSqlInjection("Meeting at 3pm")).toBe(false)
    })
  })

  describe("NoSQL Injection Detection", () => {
    it("should detect MongoDB operators", () => {
      expect(detectNoSqlInjection('{"$where": "function() {}"}}')).toBe(true)
      expect(detectNoSqlInjection('{"$gt": ""}}')).toBe(true)
      expect(detectNoSqlInjection('{"$ne": ""}}')).toBe(true)
    })

    it("should not flag normal JSON", () => {
      expect(detectNoSqlInjection('{"name": "test"}')).toBe(false)
    })
  })

  describe("Path Traversal Detection", () => {
    it("should detect path traversal patterns", () => {
      expect(detectPathTraversal("../../../etc/passwd")).toBe(true)
      expect(detectPathTraversal("..\\..\\windows\\system32")).toBe(true)
      expect(detectPathTraversal("%2e%2e%2f")).toBe(true)
    })

    it("should not flag normal paths", () => {
      expect(detectPathTraversal("documents/report.pdf")).toBe(false)
    })
  })

  describe("Command Injection Detection", () => {
    it("should detect command injection patterns", () => {
      expect(detectCommandInjection("file; rm -rf /")).toBe(true)
      expect(detectCommandInjection("$(whoami)")).toBe(true)
      expect(detectCommandInjection("`id`")).toBe(true)
      expect(detectCommandInjection("file | cat /etc/passwd")).toBe(true)
    })

    it("should not flag normal filenames", () => {
      expect(detectCommandInjection("my-file.txt")).toBe(false)
    })
  })

  describe("URL Validation", () => {
    it("should sanitize dangerous URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("")
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("")
      expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("")
    })

    it("should allow safe URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com")
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com")
      expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page")
      expect(sanitizeUrl("#anchor")).toBe("#anchor")
    })

    it("should validate URL format", () => {
      expect(validateUrl("https://example.com").valid).toBe(true)
      expect(validateUrl("not-a-url").valid).toBe(false)
    })

    it("should enforce HTTPS when required", () => {
      expect(
        validateUrl("http://example.com", { requireHttps: true }).valid
      ).toBe(false)
      expect(
        validateUrl("https://example.com", { requireHttps: true }).valid
      ).toBe(true)
    })

    it("should check domain allowlist", () => {
      expect(
        validateUrl("https://example.com", {
          allowedDomains: ["example.com"],
        }).valid
      ).toBe(true)
      expect(
        validateUrl("https://evil.com", { allowedDomains: ["example.com"] })
          .valid
      ).toBe(false)
    })
  })

  describe("File Upload Validation", () => {
    it("should validate file size", () => {
      const result = validateFileUpload({
        name: "test.jpg",
        type: "image/jpeg",
        size: 100 * 1024 * 1024, // 100MB
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain("exceeds maximum")
    })

    it("should validate file type", () => {
      const result = validateFileUpload({
        name: "test.exe",
        type: "application/x-msdownload",
        size: 1024,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain("type not allowed")
    })

    it("should sanitize filename", () => {
      const result = validateFileUpload({
        name: "../../../etc/passwd.jpg",
        type: "image/jpeg",
        size: 1024,
      })
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).not.toContain("..")
    })

    it("should accept valid files", () => {
      const result = validateFileUpload({
        name: "photo.jpg",
        type: "image/jpeg",
        size: 1024,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe("File Magic Bytes Validation", () => {
    it("should validate JPEG magic bytes", () => {
      const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      expect(validateFileMagicBytes(validJpeg, "image/jpeg")).toBe(true)

      const invalidJpeg = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      expect(validateFileMagicBytes(invalidJpeg, "image/jpeg")).toBe(false)
    })

    it("should validate PNG magic bytes", () => {
      const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      expect(validateFileMagicBytes(validPng, "image/png")).toBe(true)
    })

    it("should validate PDF magic bytes", () => {
      const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
      expect(validateFileMagicBytes(validPdf, "application/pdf")).toBe(true)
    })
  })

  describe("Filename Sanitization", () => {
    it("should remove path traversal", () => {
      expect(sanitizeFilename("../../../etc/passwd")).not.toContain("..")
    })

    it("should remove dangerous characters", () => {
      expect(sanitizeFilename("file<>:name.txt")).not.toContain("<")
      expect(sanitizeFilename("file<>:name.txt")).not.toContain(">")
    })

    it("should limit length", () => {
      const longName = "a".repeat(500) + ".txt"
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255)
    })
  })

  describe("Text Sanitization", () => {
    it("should sanitize text with XSS", () => {
      const result = sanitizeText("<script>alert('xss')</script>Hello")
      expect(result).not.toContain("<script>")
    })

    it("should normalize whitespace", () => {
      expect(sanitizeText("hello    world")).toBe("hello world")
    })

    it("should handle multiline text", () => {
      const result = sanitizeMultilineText("line1\n\nline2\n\n\n\nline3")
      expect(result).toBe("line1\n\nline2\n\nline3")
    })
  })

  describe("JSON Validation", () => {
    it("should parse valid JSON", () => {
      const result = safeJsonParse<{ name: string }>('{"name": "test"}')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("test")
      }
    })

    it("should reject oversized JSON", () => {
      const largeJson = JSON.stringify({ data: "x".repeat(2 * 1024 * 1024) })
      const result = safeJsonParse(largeJson)
      expect(result.success).toBe(false)
    })

    it("should sanitize dangerous keys", () => {
      const obj: Record<string, unknown> = {
        $where: "function(){}",
        safe: "value",
      }
      // Cannot test __proto__ as Object.keys() won't include it
      const sanitized = sanitizeJsonKeys(obj) as Record<string, unknown>
      expect("$where" in sanitized).toBe(false)
      expect("safe" in sanitized).toBe(true)
    })
  })

  describe("Composite Validation", () => {
    it("should detect all threats", () => {
      const result = validateInput("'; DROP TABLE users; --", {
        checkSql: true,
      })
      expect(result.valid).toBe(false)
      expect(result.threats.length).toBeGreaterThan(0)
    })

    it("should truncate long input", () => {
      const longInput = "x".repeat(1000)
      const result = validateInput(longInput, { maxLength: 100 })
      expect(result.sanitized.length).toBe(100)
      expect(result.errors).toContain("Input truncated to 100 characters")
    })

    it("should sanitize HTML by default", () => {
      const result = validateInput("<script>alert(1)</script>Hello")
      expect(result.sanitized).not.toContain("<script>")
    })
  })
})

// ============================================================
// RATE LIMITER TESTS
// ============================================================

import {
  createRateLimiter,
  RATE_LIMIT_PRESETS,
  extractIp,
  extractUserId,
  recordFailure,
  resetFailures,
  createCompositeRateLimiter,
} from "@/lib/security/rate-limiter-advanced"

describe("Advanced Rate Limiter", () => {
  describe("extractIp", () => {
    it("should extract IP from x-forwarded-for", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
      })
      expect(extractIp(request)).toBe("192.168.1.1")
    })

    it("should extract IP from x-real-ip", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: { "x-real-ip": "192.168.1.1" },
      })
      expect(extractIp(request)).toBe("192.168.1.1")
    })

    it("should return unknown when no IP headers", () => {
      const request = new NextRequest("http://localhost/api/test")
      expect(extractIp(request)).toBe("unknown")
    })
  })

  describe("extractUserId", () => {
    it("should extract from Bearer token", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: { authorization: "Bearer test-token-12345678" },
      })
      expect(extractUserId(request)).toBe("test-token-12345")
    })

    it("should return null when no auth", () => {
      const request = new NextRequest("http://localhost/api/test")
      expect(extractUserId(request)).toBeNull()
    })
  })

  describe("createRateLimiter", () => {
    it("should allow requests under limit", async () => {
      const limiter = createRateLimiter({
        limit: 10,
        windowMs: 60000,
        keyGenerator: () => "test-key-" + Math.random(),
      })

      const request = new NextRequest("http://localhost/api/test")
      const result = await limiter.check(request)

      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(9)
    })

    it("should block requests over limit", async () => {
      const key = "test-key-" + Math.random()
      const limiter = createRateLimiter({
        limit: 2,
        windowMs: 60000,
        keyGenerator: () => key,
      })

      const request = new NextRequest("http://localhost/api/test")

      await limiter.check(request)
      await limiter.check(request)
      const result = await limiter.check(request)

      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
      expect(result.response).toBeDefined()
    })

    it("should skip when skip function returns true", async () => {
      const limiter = createRateLimiter({
        limit: 1,
        windowMs: 60000,
        skip: () => true,
      })

      const request = new NextRequest("http://localhost/api/test")

      // Should not count
      await limiter.check(request)
      await limiter.check(request)
      const result = await limiter.check(request)

      expect(result.limited).toBe(false)
    })
  })

  describe("Adaptive Rate Limiting", () => {
    it("should increase backoff after failures", async () => {
      const key = "adaptive-test-" + Math.random()
      const limiter = createRateLimiter({
        limit: 10,
        windowMs: 60000,
        keyGenerator: () => key,
        adaptive: {
          enabled: true,
          backoffMultiplier: 2,
          maxBackoffMultiplier: 16,
        },
      })

      const request = new NextRequest("http://localhost/api/test")

      // Record failures
      await limiter.recordFailure(request)
      await limiter.recordFailure(request)

      const result = await limiter.check(request)

      // Effective limit should be reduced
      expect(result.limit).toBeLessThan(10)
    })

    it("should reset failures", async () => {
      const key = "adaptive-reset-" + Math.random()
      const limiter = createRateLimiter({
        limit: 10,
        windowMs: 60000,
        keyGenerator: () => key,
        adaptive: {
          enabled: true,
          backoffMultiplier: 2,
        },
      })

      const request = new NextRequest("http://localhost/api/test")

      await limiter.recordFailure(request)
      await limiter.resetFailures(request)

      const result = await limiter.check(request)
      expect(result.limit).toBe(10)
    })
  })

  describe("Composite Rate Limiter", () => {
    it("should check multiple limits", async () => {
      const limiter = createCompositeRateLimiter({
        global: { limit: 1000, windowMs: 60000 },
        perIp: { limit: 100, windowMs: 60000 },
      })

      const request = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "unique-ip-" + Math.random() },
      })

      const result = await limiter.check(request)
      expect(result.limited).toBe(false)
    })
  })

  describe("Presets", () => {
    it("should have correct preset values", () => {
      expect(RATE_LIMIT_PRESETS.auth.limit).toBe(5)
      expect(RATE_LIMIT_PRESETS.standard.limit).toBe(60)
      expect(RATE_LIMIT_PRESETS.upload.limit).toBe(10)
    })
  })
})

// ============================================================
// SESSION MANAGEMENT TESTS
// ============================================================

import {
  generateSessionId,
  signSessionId,
  verifySessionId,
  generateFingerprint,
  createSessionManager,
  forceLogout,
  checkForceLogout,
  getForceLogoutRegistry,
} from "@/lib/security/session-management"

describe("Session Management", () => {
  describe("generateSessionId", () => {
    it("should generate a 64 character hex ID", () => {
      const id = generateSessionId()
      expect(id).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(id)).toBe(true)
    })

    it("should generate unique IDs", () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()
      expect(id1).not.toBe(id2)
    })
  })

  describe("signSessionId", () => {
    it("should create a signed session ID", async () => {
      const id = generateSessionId()
      const signed = await signSessionId(id, "secret")

      expect(signed).toContain(id)
      expect(signed.split(".")).toHaveLength(2)
    })

    it("should create verifiable signatures", async () => {
      const id = generateSessionId()
      const signed = await signSessionId(id, "secret")
      const result = await verifySessionId(signed, "secret")

      expect(result.valid).toBe(true)
      expect(result.sessionId).toBe(id)
    })
  })

  describe("verifySessionId", () => {
    it("should reject invalid format", async () => {
      const result = await verifySessionId("invalid", "secret")
      expect(result.valid).toBe(false)
    })

    it("should reject tampered signatures", async () => {
      const id = generateSessionId()
      const signed = await signSessionId(id, "secret")
      const parts = signed.split(".")
      parts[1] = "tampered"

      const result = await verifySessionId(parts.join("."), "secret")
      expect(result.valid).toBe(false)
    })

    it("should reject wrong secret", async () => {
      const id = generateSessionId()
      const signed = await signSessionId(id, "secret1")
      const result = await verifySessionId(signed, "secret2")
      expect(result.valid).toBe(false)
    })
  })

  describe("generateFingerprint", () => {
    it("should generate consistent fingerprints", () => {
      const request1 = new NextRequest("http://localhost/test", {
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "text/html",
          "accept-language": "en-US",
        },
      })
      const request2 = new NextRequest("http://localhost/test", {
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "text/html",
          "accept-language": "en-US",
        },
      })

      const fp1 = generateFingerprint(request1)
      const fp2 = generateFingerprint(request2)
      expect(fp1).toBe(fp2)
    })

    it("should generate different fingerprints for different agents", () => {
      const request1 = new NextRequest("http://localhost/test", {
        headers: { "user-agent": "Chrome" },
      })
      const request2 = new NextRequest("http://localhost/test", {
        headers: { "user-agent": "Firefox" },
      })

      const fp1 = generateFingerprint(request1)
      const fp2 = generateFingerprint(request2)
      expect(fp1).not.toBe(fp2)
    })
  })

  describe("SessionManager", () => {
    it("should create sessions", async () => {
      const manager = createSessionManager({
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: {
          "user-agent": "Test Agent",
          "x-forwarded-for": "192.168.1.1",
        },
      })

      const session = await manager.createSession("user-123", request)

      expect(session.id).toBeDefined()
      expect(session.userId).toBe("user-123")
      expect(session.ipAddress).toBe("192.168.1.1")
    })

    it("should retrieve sessions", async () => {
      const manager = createSessionManager({
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      const created = await manager.createSession("user-123", request)
      const retrieved = await manager.getSession(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.userId).toBe("user-123")
    })

    it("should enforce concurrent session limits", async () => {
      const manager = createSessionManager({
        maxConcurrentSessions: 2,
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      // Create 3 sessions
      await manager.createSession("user-123", request)
      await manager.createSession("user-123", request)
      await manager.createSession("user-123", request)

      const sessions = await manager.getUserSessions("user-123")
      expect(sessions.length).toBeLessThanOrEqual(2)
    })

    it("should destroy sessions", async () => {
      const manager = createSessionManager({
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      const session = await manager.createSession("user-123", request)
      await manager.destroySession(session.id)

      const retrieved = await manager.getSession(session.id)
      expect(retrieved).toBeNull()
    })

    it("should destroy all user sessions", async () => {
      const manager = createSessionManager({
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      await manager.createSession("user-123", request)
      await manager.createSession("user-123", request)
      await manager.destroyAllSessions("user-123")

      const sessions = await manager.getUserSessions("user-123")
      expect(sessions.length).toBe(0)
    })

    it("should regenerate session IDs", async () => {
      const manager = createSessionManager({
        fixationProtection: true,
        fingerprintEnabled: false,
      })

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      const original = await manager.createSession("user-123", request)
      const regenerated = await manager.regenerateSession(original.id)

      expect(regenerated).toBeDefined()
      expect(regenerated?.id).not.toBe(original.id)
      expect(regenerated?.userId).toBe(original.userId)

      // Original should be destroyed
      const oldSession = await manager.getSession(original.id)
      expect(oldSession).toBeNull()
    })
  })

  describe("Force Logout", () => {
    it("should mark user for logout", async () => {
      const userId = "force-logout-test-" + Math.random()
      await forceLogout(userId)

      expect(checkForceLogout(userId)).toBe(true)
    })

    it("should clear logout marker", () => {
      const userId = "force-logout-clear-" + Math.random()
      getForceLogoutRegistry().markForLogout(userId)
      getForceLogoutRegistry().clearLogout(userId)

      expect(checkForceLogout(userId)).toBe(false)
    })

    it("should destroy sessions on force logout", async () => {
      const manager = createSessionManager({
        fingerprintEnabled: false,
      })
      const userId = "force-logout-sessions-" + Math.random()

      const request = new NextRequest("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      })

      await manager.createSession(userId, request)
      await forceLogout(userId, manager)

      const sessions = await manager.getUserSessions(userId)
      expect(sessions.length).toBe(0)
    })
  })
})

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe("Security Integration", () => {
  it("should handle complete CSRF flow", async () => {
    const secret = "integration-test-secret"

    // Generate token
    const token = await generateSignedCsrfToken(secret)

    // Verify token
    const verification = await verifySignedCsrfToken(token, secret)
    expect(verification.valid).toBe(true)

    // Validate request
    const result = validateCsrfToken(token, token)
    expect(result.valid).toBe(true)
  })

  it("should handle complete input validation flow", () => {
    const userInput = "<script>alert('xss')</script>Hello World"

    const result = validateInput(userInput, {
      maxLength: 100,
      checkSql: true,
      checkNoSql: true,
    })

    expect(result.valid).toBe(true)
    expect(result.sanitized).not.toContain("<script>")
    expect(result.sanitized).toContain("Hello")
  })

  it("should handle complete file upload flow", () => {
    // Validate metadata
    const metaResult = validateFileUpload({
      name: "../../../dangerous.jpg",
      type: "image/jpeg",
      size: 1024,
    })

    expect(metaResult.valid).toBe(true)
    expect(metaResult.sanitizedFilename).not.toContain("..")

    // Validate magic bytes
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(validateFileMagicBytes(jpegBytes, "image/jpeg")).toBe(true)
  })
})
