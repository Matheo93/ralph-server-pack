/**
 * Metrics API Route
 * Exposes Prometheus-format metrics and health check endpoints
 */

import { NextResponse } from "next/server"
import { metrics } from "@/lib/monitoring/metrics"
import {
  healthChecks,
  readinessCheck,
  livenessCheck,
  formatHealthResponse,
} from "@/lib/monitoring/health-checks"

// ============================================================================
// GET /api/metrics
// Returns metrics in Prometheus format
// ============================================================================

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const format = url.searchParams.get("format") ?? "prometheus"

  // Track request metrics
  const startTime = performance.now()

  try {
    let body: string
    let contentType: string

    if (format === "json") {
      body = JSON.stringify(metrics.toJSON(), null, 2)
      contentType = "application/json"
    } else {
      body = metrics.toPrometheusFormat()
      contentType = "text/plain; charset=utf-8"
    }

    const duration = performance.now() - startTime
    metrics.observeHistogram("http_request_duration_seconds", duration / 1000, {
      method: "GET",
      path: "/api/metrics",
    })
    metrics.incrementCounter("http_requests_total", {
      method: "GET",
      path: "/api/metrics",
      status: "200",
    })

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    metrics.observeHistogram("http_request_duration_seconds", duration / 1000, {
      method: "GET",
      path: "/api/metrics",
    })
    metrics.incrementCounter("http_requests_total", {
      method: "GET",
      path: "/api/metrics",
      status: "500",
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
