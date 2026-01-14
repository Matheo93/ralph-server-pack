import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 100 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (entry.count >= RATE_LIMIT) {
    return true
  }

  entry.count++
  return false
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000)

const eventSchema = z.object({
  type: z.enum(["identify", "pageview", "event"]),
  timestamp: z.string().datetime(),
  event: z.string().optional(),
  path: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  householdId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const forwarded = request.headers.get("x-forwarded-for")
    const clientIp = forwarded ? forwarded.split(",")[0] : "unknown"
    const userId = await getUserId()
    const identifier = userId || clientIp || "anonymous"

    // Check rate limit
    if (isRateLimited(identifier)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const result = eventSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 }
      )
    }

    const event = result.data

    // In production, you would send this to your analytics backend
    // For now, we just log it (in development)
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics API]", event.type, event.event || event.path)
    }

    // Here you could:
    // 1. Send to Plausible/PostHog server-side
    // 2. Store in your own database
    // 3. Send to a data warehouse
    // 4. Forward to multiple providers

    // Example: Store in database (pseudo-code)
    // await db.analytics.create({
    //   type: event.type,
    //   event: event.event,
    //   path: event.path,
    //   properties: event.properties,
    //   userId: event.userId,
    //   timestamp: event.timestamp,
    //   userAgent: request.headers.get('user-agent'),
    //   ip: clientIp,
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Analytics API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check for analytics endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "analytics" })
}
