import { NextRequest, NextResponse } from "next/server"
import { checkAndGenerateTasks } from "@/lib/services/scheduler"

// API key for cron job authentication
const CRON_SECRET = process.env["CRON_SECRET"] || process.env["VERCEL_CRON_SECRET"]

/**
 * POST /api/templates/generate
 *
 * Endpoint to trigger automatic task generation from templates.
 * Called by cron job (daily).
 *
 * Auth: Bearer token or Vercel cron header
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-vercel-cron-signature")

  // Check Bearer token
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")
    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
  }
  // Check Vercel cron signature
  else if (!cronHeader && CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await checkAndGenerateTasks()

    return NextResponse.json({
      success: true,
      message: "Task generation completed",
      stats: {
        householdsProcessed: result.householdsProcessed,
        tasksGenerated: result.totalGenerated,
        tasksSkipped: result.totalSkipped,
        errors: result.totalErrors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in template generation:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/templates/generate
 *
 * Health check for the generation endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/templates/generate",
    description: "Automatic task generation from templates",
    method: "POST",
    auth: "Bearer token required",
  })
}
