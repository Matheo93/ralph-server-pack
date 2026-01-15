/**
 * CSRF Protection Library
 *
 * Implements the Double Submit Cookie pattern for CSRF protection.
 * - Generates cryptographically secure tokens
 * - Validates tokens on state-changing requests
 * - Integrates with Next.js middleware
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// ============================================================
// CONSTANTS
// ============================================================

export const CSRF_COOKIE_NAME = "__csrf_token"
export const CSRF_HEADER_NAME = "x-csrf-token"
export const CSRF_FORM_FIELD = "_csrf"
export const CSRF_TOKEN_LENGTH = 32
export const CSRF_COOKIE_MAX_AGE = 24 * 60 * 60 // 24 hours in seconds

// ============================================================
// TOKEN GENERATION
// ============================================================

/**
 * Generates a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const buffer = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Creates an HMAC-based token with timestamp for additional security
 */
export async function generateSignedCsrfToken(secret: string): Promise<string> {
  const timestamp = Date.now()
  const randomPart = generateCsrfToken()
  const payload = `${timestamp}.${randomPart}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return `${payload}.${signatureHex}`
}

/**
 * Verifies an HMAC-based signed token
 */
export async function verifySignedCsrfToken(
  token: string,
  secret: string,
  maxAgeMs: number = CSRF_COOKIE_MAX_AGE * 1000
): Promise<{ valid: boolean; expired: boolean; error?: string }> {
  const parts = token.split(".")
  if (parts.length !== 3) {
    return { valid: false, expired: false, error: "Invalid token format" }
  }

  const [timestampStr, randomPart, providedSignature] = parts
  const timestamp = parseInt(timestampStr!, 10)

  if (isNaN(timestamp)) {
    return { valid: false, expired: false, error: "Invalid timestamp" }
  }

  // Check expiration
  if (Date.now() - timestamp > maxAgeMs) {
    return { valid: false, expired: true, error: "Token expired" }
  }

  // Verify signature
  const payload = `${timestamp}.${randomPart}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const expectedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  // Constant-time comparison
  if (!timingSafeEqual(providedSignature!, expectedHex)) {
    return { valid: false, expired: false, error: "Invalid signature" }
  }

  return { valid: true, expired: false }
}

// ============================================================
// TIMING-SAFE COMPARISON
// ============================================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare anyway to maintain constant time
    b = a
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0 && a.length === b.length
}

// ============================================================
// COOKIE OPERATIONS
// ============================================================

export interface CsrfCookieOptions {
  sameSite: "strict" | "lax" | "none"
  secure: boolean
  httpOnly: boolean
  path: string
  maxAge: number
}

export function getDefaultCookieOptions(): CsrfCookieOptions {
  const isProduction = process.env.NODE_ENV === "production"
  return {
    sameSite: "lax",
    secure: isProduction,
    httpOnly: true,
    path: "/",
    maxAge: CSRF_COOKIE_MAX_AGE,
  }
}

/**
 * Sets the CSRF token cookie on a response
 */
export function setCsrfCookie(
  response: NextResponse,
  token: string,
  options?: Partial<CsrfCookieOptions>
): NextResponse {
  const cookieOptions = { ...getDefaultCookieOptions(), ...options }

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    httpOnly: cookieOptions.httpOnly,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
  })

  return response
}

/**
 * Gets the CSRF token from cookies (server-side)
 */
export async function getCsrfTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Extracts CSRF token from request (header or body)
 */
export function extractCsrfToken(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken) {
    return headerToken
  }

  // For form submissions, we need to check the body
  // This is handled separately as body can only be read once
  return null
}

/**
 * Validates CSRF token from request against cookie
 */
export function validateCsrfToken(
  requestToken: string | null,
  cookieToken: string | null
): { valid: boolean; error?: string } {
  if (!cookieToken) {
    return { valid: false, error: "Missing CSRF cookie" }
  }

  if (!requestToken) {
    return { valid: false, error: "Missing CSRF token in request" }
  }

  if (!timingSafeEqual(requestToken, cookieToken)) {
    return { valid: false, error: "CSRF token mismatch" }
  }

  return { valid: true }
}

/**
 * Validates signed CSRF token
 */
export async function validateSignedCsrfToken(
  requestToken: string | null,
  cookieToken: string | null,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  if (!cookieToken) {
    return { valid: false, error: "Missing CSRF cookie" }
  }

  if (!requestToken) {
    return { valid: false, error: "Missing CSRF token in request" }
  }

  // First check token match
  if (!timingSafeEqual(requestToken, cookieToken)) {
    return { valid: false, error: "CSRF token mismatch" }
  }

  // Then verify signature
  const verification = await verifySignedCsrfToken(requestToken, secret)
  if (!verification.valid) {
    return { valid: false, error: verification.error }
  }

  return { valid: true }
}

// ============================================================
// MIDDLEWARE
// ============================================================

export interface CsrfMiddlewareConfig {
  /** Secret for signing tokens (required for signed mode) */
  secret?: string
  /** Use signed tokens (default: true if secret provided) */
  signed?: boolean
  /** Methods that require CSRF protection */
  methods?: string[]
  /** Paths to exclude from CSRF protection */
  excludePaths?: string[]
  /** Paths to include for CSRF protection (if set, only these paths are protected) */
  includePaths?: string[]
  /** Custom error handler */
  onError?: (request: NextRequest, error: string) => NextResponse
  /** Skip function for custom logic */
  skip?: (request: NextRequest) => boolean | Promise<boolean>
}

const DEFAULT_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"]

/**
 * Checks if a path matches any of the patterns
 */
function pathMatches(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return path.startsWith(pattern.slice(0, -1))
    }
    return path === pattern
  })
}

/**
 * Default error response for CSRF validation failure
 */
function defaultErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error: "CSRF validation failed",
      message: error,
      code: "CSRF_ERROR",
    },
    { status: 403 }
  )
}

/**
 * Creates CSRF protection middleware
 */
export function csrfProtection(config: CsrfMiddlewareConfig = {}) {
  const {
    secret,
    signed = !!secret,
    methods = DEFAULT_PROTECTED_METHODS,
    excludePaths = [],
    includePaths,
    onError,
    skip,
  } = config

  if (signed && !secret) {
    throw new Error("CSRF secret is required for signed tokens")
  }

  return async function csrfMiddleware(
    request: NextRequest
  ): Promise<{
    valid: boolean
    response?: NextResponse
    token?: string
    error?: string
  }> {
    const path = request.nextUrl.pathname
    const method = request.method.toUpperCase()

    // Check if we should skip
    if (skip) {
      const shouldSkip = await Promise.resolve(skip(request))
      if (shouldSkip) {
        return { valid: true }
      }
    }

    // Check excluded paths
    if (pathMatches(path, excludePaths)) {
      return { valid: true }
    }

    // Check included paths
    if (includePaths && !pathMatches(path, includePaths)) {
      return { valid: true }
    }

    // GET/HEAD/OPTIONS don't need CSRF protection
    if (!methods.includes(method)) {
      // Generate token for GET requests if cookie doesn't exist
      const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
      if (!existingToken && method === "GET") {
        const newToken = signed
          ? await generateSignedCsrfToken(secret!)
          : generateCsrfToken()
        return { valid: true, token: newToken }
      }
      return { valid: true }
    }

    // Validate CSRF token for protected methods
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null
    const requestToken = extractCsrfToken(request)

    const validation = signed
      ? await validateSignedCsrfToken(requestToken, cookieToken, secret!)
      : validateCsrfToken(requestToken, cookieToken)

    if (!validation.valid) {
      const errorResponse = onError
        ? onError(request, validation.error!)
        : defaultErrorResponse(validation.error!)
      return { valid: false, response: errorResponse, error: validation.error }
    }

    return { valid: true }
  }
}

// ============================================================
// HELPERS FOR CLIENT-SIDE
// ============================================================

/**
 * Gets CSRF token for use in fetch requests (call from client components)
 * Note: Client needs to read from a non-httpOnly cookie or API endpoint
 */
export function getCsrfHeaders(token: string): Record<string, string> {
  return {
    [CSRF_HEADER_NAME]: token,
  }
}

/**
 * Creates hidden form field for CSRF token
 */
export function getCsrfFormField(token: string): string {
  return `<input type="hidden" name="${CSRF_FORM_FIELD}" value="${token}" />`
}

// ============================================================
// API ENDPOINT FOR TOKEN RETRIEVAL
// ============================================================

/**
 * Handler for CSRF token endpoint
 * Use with: GET /api/csrf-token
 */
export async function handleCsrfTokenRequest(
  request: NextRequest,
  secret?: string
): Promise<NextResponse> {
  const signed = !!secret

  // Check for existing token in cookie
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  // Validate existing token if signed
  if (existingToken && signed) {
    const validation = await verifySignedCsrfToken(existingToken, secret!)
    if (validation.valid) {
      // Return existing valid token
      return NextResponse.json({ token: existingToken })
    }
  } else if (existingToken && !signed) {
    // Return existing token for non-signed mode
    return NextResponse.json({ token: existingToken })
  }

  // Generate new token
  const newToken = signed
    ? await generateSignedCsrfToken(secret!)
    : generateCsrfToken()

  const response = NextResponse.json({ token: newToken })

  // Set cookie with new token
  setCsrfCookie(response, newToken)

  return response
}

// ============================================================
// TYPES EXPORT
// ============================================================

export type {
  CsrfCookieOptions,
  CsrfMiddlewareConfig,
}
