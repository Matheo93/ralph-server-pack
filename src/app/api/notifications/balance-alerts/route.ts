import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  checkAndSendBalanceAlerts,
  getHouseholdsForBalanceAlerts,
  getHouseholdAlerts,
} from "@/lib/services/alerts"

// Cron job secret for scheduled calls
const CRON_SECRET = process.env["CRON_SECRET"] || ""

/**
 * GET /api/notifications/balance-alerts
 * Get current balance alerts for the user's household
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'avez pas de foyer" },
      { status: 404 }
    )
  }

  try {
    const alerts = await getHouseholdAlerts(membership.household_id)

    return NextResponse.json({
      alerts,
      count: alerts.length,
      hasCritical: alerts.some(a => a.severity === "critical"),
    })
  } catch (error) {
    console.error("Error getting balance alerts:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des alertes" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/balance-alerts
 * Trigger balance alert check for user's household (manual trigger)
 */
export async function POST() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'avez pas de foyer" },
      { status: 404 }
    )
  }

  try {
    const result = await checkAndSendBalanceAlerts(membership.household_id)

    return NextResponse.json({
      success: true,
      imbalanceAlertSent: result.imbalanceSent,
      overloadAlertsSent: result.overloadsSent,
      ratio: result.ratio,
      message: result.imbalanceSent || result.overloadsSent > 0
        ? "Alertes envoyées"
        : "Aucune alerte à envoyer (charge équilibrée ou déjà notifié aujourd'hui)",
    })
  } catch (error) {
    console.error("Error sending balance alerts:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des alertes" },
      { status: 500 }
    )
  }
}

const CronRequestSchema = z.object({
  secret: z.string(),
})

/**
 * PUT /api/notifications/balance-alerts
 * Cron job endpoint to check all households (called by scheduler)
 * Requires CRON_SECRET for authentication
 */
export async function PUT(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = CronRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: "Données invalides" },
      { status: 400 }
    )
  }

  // Verify cron secret
  if (!CRON_SECRET || validation.data.secret !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Non autorisé" },
      { status: 401 }
    )
  }

  try {
    // Get all households with balance alerts enabled
    const householdIds = await getHouseholdsForBalanceAlerts()

    let totalImbalanceAlerts = 0
    let totalOverloadAlerts = 0
    const errors: string[] = []

    for (const householdId of householdIds) {
      try {
        const result = await checkAndSendBalanceAlerts(householdId)
        if (result.imbalanceSent) totalImbalanceAlerts++
        totalOverloadAlerts += result.overloadsSent
      } catch (error) {
        console.error(`Error checking household ${householdId}:`, error)
        errors.push(householdId)
      }
    }

    return NextResponse.json({
      success: true,
      householdsChecked: householdIds.length,
      imbalanceAlertsSent: totalImbalanceAlerts,
      overloadAlertsSent: totalOverloadAlerts,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in balance alerts cron:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement" },
      { status: 500 }
    )
  }
}
