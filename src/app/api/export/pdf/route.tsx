import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { getChargeReportData, getTasksHistoryData } from "@/lib/services/export"
import { ChargeReportPDF, TasksHistoryPDF } from "@/lib/templates/pdf"
import { z } from "zod"

const ExportPDFRequestSchema = z.object({
  type: z.enum(["charge", "tasks-history"]),
  period: z.enum(["week", "month", "quarter"]).default("week"),
})

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Pas de foyer associé" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = ExportPDFRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 }
    )
  }

  const { type, period } = validation.data
  const householdId = membership.household_id

  try {
    let pdfBuffer: Buffer
    let filename: string

    if (type === "charge") {
      const data = await getChargeReportData(householdId, period)
      if (!data) {
        return NextResponse.json(
          { error: "Impossible de générer le rapport de charge" },
          { status: 500 }
        )
      }

      pdfBuffer = await renderToBuffer(<ChargeReportPDF data={data} />)
      filename = `familyload-charge-${period}-${data.period.end}.pdf`
    } else {
      const data = await getTasksHistoryData(householdId, period)
      if (!data) {
        return NextResponse.json(
          { error: "Impossible de générer l'historique des tâches" },
          { status: 500 }
        )
      }

      pdfBuffer = await renderToBuffer(<TasksHistoryPDF data={data} />)
      filename = `familyload-tasks-${period}-${data.period.end}.pdf`
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer)

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}
