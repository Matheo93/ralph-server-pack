/**
 * Billing Status API
 *
 * Get subscription status for a household.
 */

import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { getSubscriptionDetails } from "@/lib/stripe/checkout"

interface SubscriptionStatusResponse {
  status: "active" | "trial" | "past_due" | "cancelled" | "none"
  plan: "free" | "premium"
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
  daysRemaining: number | null
}

/**
 * GET /api/billing/status
 * Get subscription status for the user's household
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{
    household_id: string
    subscription_status: string | null
    subscription_ends_at: string | null
  }>(`
    SELECT
      hm.household_id,
      h.subscription_status,
      h.subscription_ends_at
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = $1 AND hm.is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  // Get detailed subscription from Stripe
  const subscription = await getSubscriptionDetails(membership.household_id)

  let response: SubscriptionStatusResponse

  if (!subscription) {
    response = {
      status: "none",
      plan: "free",
      currentPeriodEnd: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      daysRemaining: null,
    }
  } else {
    const now = new Date()
    // Access timestamp fields via bracket notation for new Stripe API
    const sub = subscription as unknown as Record<string, unknown>
    const periodEndTs = sub["current_period_end"] as number
    const trialEndTs = sub["trial_end"] as number | null

    const periodEnd = new Date(periodEndTs * 1000)
    const daysRemaining = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    const trialEnd = trialEndTs
      ? new Date(trialEndTs * 1000)
      : null

    response = {
      status:
        subscription.status === "trialing"
          ? "trial"
          : subscription.status === "active"
          ? "active"
          : subscription.status === "past_due"
          ? "past_due"
          : subscription.status === "canceled"
          ? "cancelled"
          : "none",
      plan: "premium",
      currentPeriodEnd: periodEnd.toISOString(),
      trialEnd: trialEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      daysRemaining,
    }
  }

  return NextResponse.json(response)
}
