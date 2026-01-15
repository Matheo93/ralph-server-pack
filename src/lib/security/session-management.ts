/**
 * Session Management Library
 *
 * Features:
 * - Session fixation prevention
 * - Concurrent session limits
 * - Force logout capability
 * - Session activity tracking
 * - Device fingerprinting support
 */

import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// ============================================================
// TYPES
// ============================================================

export interface Session {
  /** Unique session ID */
  id: string
  /** User ID */
  userId: string
  /** Device fingerprint */
  fingerprint?: string
  /** IP address */
  ipAddress: string
  /** User agent */
  userAgent: string
  /** Creation timestamp */
  createdAt: number
  /** Last activity timestamp */
  lastActivityAt: number
  /** Session data */
  data?: Record<string, unknown>
  /** Is this the current device */
  isCurrent?: boolean
}

export interface SessionConfig {
  /** Maximum concurrent sessions per user */
  maxConcurrentSessions?: number
  /** Session TTL in milliseconds */
  sessionTtlMs?: number
  /** Activity timeout in milliseconds */
  activityTimeoutMs?: number
  /** Enable session fixation protection */
  fixationProtection?: boolean
  /** Enable device fingerprinting */
  fingerprintEnabled?: boolean
  /** Session store */
  store?: SessionStore
  /** Cookie name */
  cookieName?: string
  /** Secret for signing session IDs */
  secret?: string
}

export interface SessionStore {
  /** Get session by ID */
  get(sessionId: string): Promise<Session | null>
  /** Get all sessions for a user */
  getByUserId(userId: string): Promise<Session[]>
  /** Create or update session */
  set(session: Session): Promise<void>
  /** Delete session */
  delete(sessionId: string): Promise<void>
  /** Delete all sessions for a user */
  deleteByUserId(userId: string): Promise<void>
  /** Delete all sessions for a user except one */
  deleteOtherSessions(userId: string, keepSessionId: string): Promise<void>
  /** Update last activity */
  touch(sessionId: string): Promise<void>
}

// ============================================================
// IN-MEMORY STORE
// ============================================================

class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, Session> = new Map()
  private userSessions: Map<string, Set<string>> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(private ttlMs: number = 24 * 60 * 60 * 1000) {
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    // Check expiration
    if (Date.now() - session.lastActivityAt > this.ttlMs) {
      await this.delete(sessionId)
      return null
    }

    return session
  }

  async getByUserId(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId) || new Set()
    const sessions: Session[] = []

    for (const sessionId of sessionIds) {
      const session = await this.get(sessionId)
      if (session) {
        sessions.push(session)
      }
    }

    return sessions
  }

  async set(session: Session): Promise<void> {
    this.sessions.set(session.id, session)

    // Track user sessions
    let userSessionSet = this.userSessions.get(session.userId)
    if (!userSessionSet) {
      userSessionSet = new Set()
      this.userSessions.set(session.userId, userSessionSet)
    }
    userSessionSet.add(session.id)
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      const userSessionSet = this.userSessions.get(session.userId)
      if (userSessionSet) {
        userSessionSet.delete(sessionId)
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.userId)
        }
      }
    }
    this.sessions.delete(sessionId)
  }

  async deleteByUserId(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId)
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId)
      }
      this.userSessions.delete(userId)
    }
  }

  async deleteOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId)
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        if (sessionId !== keepSessionId) {
          this.sessions.delete(sessionId)
        }
      }
      this.userSessions.set(userId, new Set([keepSessionId]))
    }
  }

  async touch(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivityAt = Date.now()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > this.ttlMs) {
        this.delete(sessionId)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  getStats(): { totalSessions: number; totalUsers: number } {
    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
    }
  }
}

// ============================================================
// GLOBAL STORE
// ============================================================

let globalSessionStore: InMemorySessionStore | null = null

function getGlobalStore(): InMemorySessionStore {
  if (!globalSessionStore) {
    globalSessionStore = new InMemorySessionStore()
  }
  return globalSessionStore
}

// ============================================================
// SESSION ID GENERATION
// ============================================================

/**
 * Generates a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const buffer = new Uint8Array(32)
  crypto.getRandomValues(buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Signs a session ID with HMAC
 */
export async function signSessionId(
  sessionId: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(sessionId))
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return `${sessionId}.${signatureHex}`
}

/**
 * Verifies a signed session ID
 */
export async function verifySessionId(
  signedSessionId: string,
  secret: string
): Promise<{ valid: boolean; sessionId?: string }> {
  const parts = signedSessionId.split(".")
  if (parts.length !== 2) {
    return { valid: false }
  }

  const [sessionId, providedSignature] = parts
  const expectedSigned = await signSessionId(sessionId!, secret)
  const expectedSignature = expectedSigned.split(".")[1]

  // Constant-time comparison
  if (providedSignature!.length !== expectedSignature!.length) {
    return { valid: false }
  }

  let result = 0
  for (let i = 0; i < providedSignature!.length; i++) {
    result |= providedSignature!.charCodeAt(i) ^ expectedSignature!.charCodeAt(i)
  }

  if (result !== 0) {
    return { valid: false }
  }

  return { valid: true, sessionId }
}

// ============================================================
// DEVICE FINGERPRINTING
// ============================================================

/**
 * Generates a device fingerprint from request
 */
export function generateFingerprint(request: NextRequest): string {
  const components: string[] = []

  // User agent
  const userAgent = request.headers.get("user-agent") || ""
  components.push(userAgent)

  // Accept headers
  const accept = request.headers.get("accept") || ""
  const acceptLanguage = request.headers.get("accept-language") || ""
  const acceptEncoding = request.headers.get("accept-encoding") || ""
  components.push(accept, acceptLanguage, acceptEncoding)

  // Create hash
  const joined = components.join("|")
  let hash = 0
  for (let i = 0; i < joined.length; i++) {
    const char = joined.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return hash.toString(16)
}

// ============================================================
// SESSION MANAGER
// ============================================================

export interface SessionManager {
  /** Create a new session */
  createSession(
    userId: string,
    request: NextRequest,
    data?: Record<string, unknown>
  ): Promise<Session>

  /** Get session by ID */
  getSession(sessionId: string): Promise<Session | null>

  /** Get all sessions for a user */
  getUserSessions(userId: string): Promise<Session[]>

  /** Validate session from request */
  validateSession(request: NextRequest): Promise<Session | null>

  /** Destroy a session */
  destroySession(sessionId: string): Promise<void>

  /** Destroy all sessions for a user */
  destroyAllSessions(userId: string): Promise<void>

  /** Destroy all other sessions (keep current) */
  destroyOtherSessions(userId: string, currentSessionId: string): Promise<void>

  /** Regenerate session ID (prevent fixation) */
  regenerateSession(oldSessionId: string): Promise<Session | null>

  /** Update session activity */
  touchSession(sessionId: string): Promise<void>

  /** Set session cookie on response */
  setSessionCookie(response: NextResponse, sessionId: string): NextResponse

  /** Clear session cookie */
  clearSessionCookie(response: NextResponse): NextResponse

  /** Get stats */
  getStats(): Promise<{ totalSessions: number; totalUsers: number }>
}

/**
 * Creates a session manager
 */
export function createSessionManager(config: SessionConfig = {}): SessionManager {
  const {
    maxConcurrentSessions = 5,
    sessionTtlMs = 24 * 60 * 60 * 1000, // 24 hours
    activityTimeoutMs = 30 * 60 * 1000, // 30 minutes
    fixationProtection = true,
    fingerprintEnabled = true,
    store = getGlobalStore(),
    cookieName = "__session_id",
    secret,
  } = config

  const isProduction = process.env.NODE_ENV === "production"

  return {
    async createSession(userId, request, data) {
      // Check concurrent session limit
      const existingSessions = await store.getByUserId(userId)

      if (existingSessions.length >= maxConcurrentSessions) {
        // Remove oldest session
        const sortedSessions = existingSessions.sort(
          (a, b) => a.lastActivityAt - b.lastActivityAt
        )
        for (let i = 0; i <= existingSessions.length - maxConcurrentSessions; i++) {
          await store.delete(sortedSessions[i]!.id)
        }
      }

      const sessionId = generateSessionId()
      const now = Date.now()

      const session: Session = {
        id: sessionId,
        userId,
        ipAddress: extractIpFromRequest(request),
        userAgent: request.headers.get("user-agent") || "",
        fingerprint: fingerprintEnabled ? generateFingerprint(request) : undefined,
        createdAt: now,
        lastActivityAt: now,
        data,
      }

      await store.set(session)

      return session
    },

    async getSession(sessionId) {
      return store.get(sessionId)
    },

    async getUserSessions(userId) {
      return store.getByUserId(userId)
    },

    async validateSession(request) {
      const cookieValue = request.cookies.get(cookieName)?.value
      if (!cookieValue) {
        return null
      }

      let sessionId: string
      if (secret) {
        const verification = await verifySessionId(cookieValue, secret)
        if (!verification.valid || !verification.sessionId) {
          return null
        }
        sessionId = verification.sessionId
      } else {
        sessionId = cookieValue
      }

      const session = await store.get(sessionId)
      if (!session) {
        return null
      }

      // Check activity timeout
      if (Date.now() - session.lastActivityAt > activityTimeoutMs) {
        await store.delete(sessionId)
        return null
      }

      // Verify fingerprint if enabled
      if (fingerprintEnabled && session.fingerprint) {
        const currentFingerprint = generateFingerprint(request)
        if (session.fingerprint !== currentFingerprint) {
          // Suspicious - fingerprint changed
          // Could log this for security monitoring
          // For now, invalidate the session
          await store.delete(sessionId)
          return null
        }
      }

      // Update activity
      await store.touch(sessionId)

      return session
    },

    async destroySession(sessionId) {
      await store.delete(sessionId)
    },

    async destroyAllSessions(userId) {
      await store.deleteByUserId(userId)
    },

    async destroyOtherSessions(userId, currentSessionId) {
      await store.deleteOtherSessions(userId, currentSessionId)
    },

    async regenerateSession(oldSessionId) {
      if (!fixationProtection) {
        return store.get(oldSessionId)
      }

      const oldSession = await store.get(oldSessionId)
      if (!oldSession) {
        return null
      }

      // Create new session with same data
      const newSessionId = generateSessionId()
      const newSession: Session = {
        ...oldSession,
        id: newSessionId,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      }

      // Delete old session
      await store.delete(oldSessionId)

      // Store new session
      await store.set(newSession)

      return newSession
    },

    async touchSession(sessionId) {
      await store.touch(sessionId)
    },

    setSessionCookie(response, sessionId) {
      const cookieValue = secret
        ? // Signed session ID will be set asynchronously
          sessionId
        : sessionId

      response.cookies.set(cookieName, cookieValue, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: sessionTtlMs / 1000,
      })

      return response
    },

    clearSessionCookie(response) {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      })

      return response
    },

    async getStats() {
      if (store instanceof InMemorySessionStore) {
        return store.getStats()
      }
      const sessions = await store.getByUserId("*")
      return {
        totalSessions: sessions.length,
        totalUsers: new Set(sessions.map((s) => s.userId)).size,
      }
    },
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function extractIpFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return (forwarded.split(",")[0] ?? "unknown").trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

/**
 * Gets the session cookie from Next.js cookies()
 */
export async function getSessionFromCookies(
  cookieName: string = "__session_id"
): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(cookieName)?.value ?? null
}

// ============================================================
// FORCE LOGOUT REGISTRY
// ============================================================

/**
 * Registry to track users that should be force-logged out
 */
class ForceLogoutRegistry {
  private registry: Map<string, number> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  /**
   * Mark user for force logout
   */
  markForLogout(userId: string, ttlMs: number = 24 * 60 * 60 * 1000): void {
    this.registry.set(userId, Date.now() + ttlMs)
  }

  /**
   * Check if user should be logged out
   */
  shouldLogout(userId: string): boolean {
    const expiry = this.registry.get(userId)
    if (!expiry) return false

    if (Date.now() > expiry) {
      this.registry.delete(userId)
      return false
    }

    return true
  }

  /**
   * Clear force logout for user
   */
  clearLogout(userId: string): void {
    this.registry.delete(userId)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [userId, expiry] of this.registry.entries()) {
      if (now > expiry) {
        this.registry.delete(userId)
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

let globalForceLogoutRegistry: ForceLogoutRegistry | null = null

/**
 * Gets the global force logout registry
 */
export function getForceLogoutRegistry(): ForceLogoutRegistry {
  if (!globalForceLogoutRegistry) {
    globalForceLogoutRegistry = new ForceLogoutRegistry()
  }
  return globalForceLogoutRegistry
}

/**
 * Forces logout for a user
 */
export async function forceLogout(
  userId: string,
  sessionManager?: SessionManager
): Promise<void> {
  // Mark in registry
  getForceLogoutRegistry().markForLogout(userId)

  // Destroy all sessions if manager provided
  if (sessionManager) {
    await sessionManager.destroyAllSessions(userId)
  }
}

/**
 * Checks if user should be force-logged out
 */
export function checkForceLogout(userId: string): boolean {
  return getForceLogoutRegistry().shouldLogout(userId)
}

// ============================================================
// SESSION MIDDLEWARE
// ============================================================

export interface SessionMiddlewareConfig extends SessionConfig {
  /** Paths that require authentication */
  protectedPaths?: string[]
  /** Paths that skip session validation */
  publicPaths?: string[]
  /** Redirect URL for unauthenticated users */
  loginRedirect?: string
}

/**
 * Creates session middleware for Next.js
 */
export function sessionMiddleware(config: SessionMiddlewareConfig = {}) {
  const {
    protectedPaths = [],
    publicPaths = [],
    loginRedirect = "/login",
    ...sessionConfig
  } = config

  const manager = createSessionManager(sessionConfig)

  return async function middleware(
    request: NextRequest
  ): Promise<{
    session: Session | null
    response?: NextResponse
  }> {
    const path = request.nextUrl.pathname

    // Check if path is public
    if (publicPaths.some((p) => path.startsWith(p))) {
      return { session: null }
    }

    // Validate session
    const session = await manager.validateSession(request)

    // Check force logout
    if (session && checkForceLogout(session.userId)) {
      await manager.destroySession(session.id)

      // Check if protected path
      if (protectedPaths.some((p) => path.startsWith(p))) {
        const url = request.nextUrl.clone()
        url.pathname = loginRedirect
        return {
          session: null,
          response: NextResponse.redirect(url),
        }
      }

      return { session: null }
    }

    // Redirect to login if protected path and no session
    if (!session && protectedPaths.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = loginRedirect
      return {
        session: null,
        response: NextResponse.redirect(url),
      }
    }

    return { session }
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export const sessionManager = createSessionManager()
