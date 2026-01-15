/**
 * Mobile Health Check API
 *
 * GET: Check API and service health
 *
 * This endpoint is unauthenticated and used by mobile apps
 * to verify API availability before other operations.
 */

import { NextRequest, NextResponse } from "next/server"
import { checkHealth, HealthStatus } from "@/lib/services/mobile-api"

/**
 * GET /api/mobile/health
 * Get health status of the API and dependent services
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const health = await checkHealth()
    const responseTime = Date.now() - startTime

    // Determine HTTP status based on health
    const httpStatus = health.status === "healthy"
      ? 200
      : health.status === "degraded"
        ? 200
        : 503

    return NextResponse.json(
      {
        success: health.status !== "unhealthy",
        status: health.status,
        timestamp: health.timestamp,
        version: health.version,
        services: health.services,
        latency: {
          ...health.latency,
          total: responseTime,
        },
        uptime: process.uptime(),
      },
      {
        status: httpStatus,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Response-Time": `${responseTime}ms`,
        },
      }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        success: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: errorMessage,
        latency: {
          total: responseTime,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Response-Time": `${responseTime}ms`,
        },
      }
    )
  }
}

/**
 * HEAD /api/mobile/health
 * Quick health check (just returns 200 if API is running)
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
