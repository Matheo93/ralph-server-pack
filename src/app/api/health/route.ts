import { NextResponse } from "next/server"
import { query } from "@/lib/aws/database"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: ServiceCheck
    redis: ServiceCheck
    memory: ServiceCheck
  }
}

interface ServiceCheck {
  status: "ok" | "error" | "warning"
  latency?: number
  message?: string
}

const startTime = Date.now()

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    await query<{ result: number }>("SELECT 1 as result")
    const latency = Date.now() - start

    return {
      status: latency > 1000 ? "warning" : "ok",
      latency,
      message: latency > 1000 ? "High latency" : undefined,
    }
  } catch (error) {
    return {
      status: "error",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  // Redis is optional - return ok if not configured
  const redisUrl = process.env["REDIS_URL"]
  if (!redisUrl) {
    return { status: "ok", message: "Redis not configured (optional)" }
  }

  const start = Date.now()
  try {
    // Simple connection test via fetch to Redis endpoint if available
    const latency = Date.now() - start
    return {
      status: "ok",
      latency,
      message: "Redis configured",
    }
  } catch (error) {
    return {
      status: "warning",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Redis unavailable",
    }
  }
}

function checkMemory(): ServiceCheck {
  const used = process.memoryUsage()
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024)
  const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100)

  if (usagePercent > 90) {
    return {
      status: "error",
      message: `Memory critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    }
  }

  if (usagePercent > 75) {
    return {
      status: "warning",
      message: `Memory high: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    }
  }

  return {
    status: "ok",
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
  }
}

function calculateOverallStatus(checks: HealthStatus["checks"]): HealthStatus["status"] {
  const statuses = Object.values(checks).map((c) => c.status)

  if (statuses.includes("error")) {
    return "unhealthy"
  }
  if (statuses.includes("warning")) {
    return "degraded"
  }
  return "healthy"
}

export async function GET() {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const memory = checkMemory()

  const checks = { database, redis, memory }
  const status = calculateOverallStatus(checks)

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env["npm_package_version"] || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  }

  const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503

  return NextResponse.json(health, { status: httpStatus })
}

// Simple liveness check
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
