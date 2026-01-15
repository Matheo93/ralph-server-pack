/**
 * Billing Portal API
 *
 * Create Stripe customer portal sessions for subscription management.
 */

import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { createPortalSession } from "@/lib/stripe/checkout"

/**
 * POST /api/billing/portal
 * Create a customer portal session for the user's household
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
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  try {
    const result = await createPortalSession(membership.household_id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Erreur lors de la création du portail" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      url: result.url,
    })
  } catch (error) {
    console.error("Portal error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du portail de facturation" },
      { status: 500 }
    )
  }
}
