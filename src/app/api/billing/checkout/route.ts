/**
 * Billing Checkout API
 *
 * Create Stripe checkout sessions for subscription.
 */

import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { createCheckoutSession } from "@/lib/stripe/checkout"

/**
 * POST /api/billing/checkout
 * Create a checkout session for the user's household
 */
export async function POST() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user and household info
  const user = await queryOne<{
    email: string
    household_id: string
  }>(`
    SELECT u.email, hm.household_id
    FROM users u
    JOIN household_members hm ON hm.user_id = u.id AND hm.is_active = true
    WHERE u.id = $1
  `, [userId])

  if (!user) {
    return NextResponse.json(
      { error: "Utilisateur ou foyer non trouvé" },
      { status: 404 }
    )
  }

  try {
    const result = await createCheckoutSession(user.household_id, user.email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Erreur lors de la création de la session" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      url: result.url,
    })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    )
  }
}
