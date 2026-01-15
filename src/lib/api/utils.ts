/**
 * API Utilities for Mobile REST API
 *
 * Common functions for authentication, validation, and response formatting.
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"

// Rate limit store (in-memory for now, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limit config
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // requests per window

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

/**
 * Create success response
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiResponse["meta"]
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
  })
}

/**
 * Create error response
 */
export function apiError(
  message: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  )
}

/**
 * Validate Bearer token and get user ID
 */
export async function validateBearerToken(
  request: NextRequest
): Promise<{ userId: string; error?: never } | { userId?: never; error: string }> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Token manquant ou invalide" }
  }

  const token = authHeader.slice(7)

  if (!token || token.length < 10) {
    return { error: "Token invalide" }
  }

  // Validate token against database
  const session = await queryOne<{ user_id: string; expires_at: string }>(`
    SELECT user_id, expires_at
    FROM user_sessions
    WHERE token = $1 AND is_active = true
  `, [token])

  if (!session) {
    return { error: "Session invalide ou expirée" }
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Deactivate expired session
    await query(`
      UPDATE user_sessions SET is_active = false WHERE token = $1
    `, [token])
    return { error: "Session expirée" }
  }

  // Update last used timestamp
  await query(`
    UPDATE user_sessions SET last_used_at = NOW() WHERE token = $1
  `, [token])

  return { userId: session.user_id }
}

/**
 * Check rate limit for a user
 */
export function checkRateLimit(
  userId: string
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const key = `rate:${userId}`
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetIn: RATE_LIMIT_WINDOW_MS,
    }
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: existing.resetAt - now,
    }
  }

  existing.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetIn: existing.resetAt - now,
  }
}

/**
 * Middleware helper to authenticate and authorize API requests
 */
export async function withAuth(
  request: NextRequest,
  handler: (userId: string, householdId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  // Validate token
  const authResult = await validateBearerToken(request)
  if (authResult.error) {
    return apiError(authResult.error, 401)
  }

  const userId = authResult.userId

  // Check rate limit
  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    const response = apiError("Trop de requêtes. Réessayez plus tard.", 429)
    response.headers.set("X-RateLimit-Remaining", "0")
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)))
    return response
  }

  // Set current user for RLS
  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
  `, [userId])

  if (!membership) {
    return apiError("Utilisateur sans foyer", 403)
  }

  // Call handler
  const response = await handler(userId, membership.household_id)

  // Add rate limit headers
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining))
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)))

  return response
}

/**
 * Parse and validate JSON body
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: string }> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { error: "JSON invalide" }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Données invalides" }
  }

  return { data: result.data }
}

/**
 * Parse pagination parameters
 */
export function parsePagination(
  searchParams: URLSearchParams
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Generate pagination metadata
 */
export function paginationMeta(
  page: number,
  limit: number,
  total: number
): NonNullable<ApiResponse["meta"]> {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}
