/**
 * GDPR Data Export API
 *
 * Implements GDPR Article 20 - Right to Data Portability
 * Allows users to export all their data in machine-readable format (JSON)
 */

import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser } from "@/lib/aws/database"
import { exportUserData, generateDataReport } from "@/lib/services/gdpr"

// =============================================================================
// GET - Export user data or generate report
// =============================================================================

/**
 * GET /api/gdpr/export
 *
 * Query params:
 * - format: "json" (default) | "report" (summary only)
 *
 * Returns full data export or data report depending on format
 */
export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse query params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "json"

  if (format === "report") {
    // Return just the data report (what data we have)
    const report = await generateDataReport()
    if (!report) {
      return NextResponse.json(
        { error: "Erreur lors de la génération du rapport" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report,
    })
  }

  // Full data export
  const result = await exportUserData()

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Erreur lors de l'export" },
      { status: 500 }
    )
  }

  // Return as downloadable JSON
  const dataStr = JSON.stringify(result.data, null, 2)
  const timestamp = new Date().toISOString().split("T")[0]

  return new NextResponse(dataStr, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="familyload-export-${timestamp}.json"`,
      "Cache-Control": "no-store",
    },
  })
}

// =============================================================================
// POST - Request data export (for async processing)
// =============================================================================

/**
 * POST /api/gdpr/export
 *
 * Request a data export to be processed asynchronously
 * For large data sets that can't be exported immediately
 *
 * Body:
 * - notify_email?: boolean - Send notification when ready
 */
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // For now, we do synchronous export
  // In the future, this could queue a background job for large exports
  const result = await exportUserData()

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error ?? "Erreur lors de l'export",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Export prêt",
    data: result.data,
    exported_at: new Date().toISOString(),
  })
}
