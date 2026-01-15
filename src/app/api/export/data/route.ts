import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { exportHouseholdData } from "@/lib/services/export"

/**
 * GET /api/export/data
 * Export all user data in JSON format for GDPR compliance
 * GDPR Article 20 - Right to data portability
 */
export async function GET(_request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    // Get user's household
    const membership = await queryOne<{ household_id: string }>(`
      SELECT household_id
      FROM household_members
      WHERE user_id = $1 AND is_active = true
    `, [userId])

    if (!membership) {
      return NextResponse.json(
        { error: "Pas de foyer associé" },
        { status: 400 }
      )
    }

    // Export all household data
    const data = await exportHouseholdData(membership.household_id)

    if (!data) {
      return NextResponse.json(
        { error: "Impossible d'exporter les données" },
        { status: 500 }
      )
    }

    // Return JSON with proper headers
    const jsonData = JSON.stringify(data, null, 2)
    const filename = `familyload-export-${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(jsonData).toString(),
      },
    })
  } catch (error) {
    console.error("Data export error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'export des données" },
      { status: 500 }
    )
  }
}
