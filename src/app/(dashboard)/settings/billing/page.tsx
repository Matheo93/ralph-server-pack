import { redirect } from "next/navigation"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { getSubscriptionDetails } from "@/lib/stripe/checkout"
import { BillingContent } from "./billing-content"

export default async function BillingPage() {
  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
  `, [userId])

  if (!membership) {
    redirect("/onboarding")
  }

  // Get household subscription info
  const household = await queryOne<{
    id: string
    name: string
    subscription_status: string
    subscription_ends_at: string | null
    stripe_customer_id: string | null
  }>(`
    SELECT id, name, subscription_status, subscription_ends_at, stripe_customer_id
    FROM households
    WHERE id = $1
  `, [membership.household_id])

  if (!household) {
    redirect("/onboarding")
  }

  // Get subscription details from subscriptions table
  const subscription = await queryOne<{
    status: string
    plan: string
    amount: number
    currency: string
    current_period_start: string | null
    current_period_end: string | null
    trial_ends_at: string | null
    cancelled_at: string | null
  }>(`
    SELECT status, plan, amount, currency,
           current_period_start, current_period_end,
           trial_ends_at, cancelled_at
    FROM subscriptions
    WHERE household_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [household.id])

  // Get Stripe subscription details if available
  let stripeSubscription = null
  if (household.stripe_customer_id) {
    stripeSubscription = await getSubscriptionDetails(household.id)
  }

  return (
    <BillingContent
      household={{
        id: household.id,
        name: household.name,
        subscriptionStatus: (household.subscription_status ?? "trial") as "trial" | "active" | "past_due" | "cancelled",
        subscriptionEndsAt: household.subscription_ends_at
          ? new Date(household.subscription_ends_at)
          : null,
        hasStripeCustomer: !!household.stripe_customer_id,
      }}
      subscription={subscription ? {
        status: subscription.status as "trial" | "active" | "past_due" | "cancelled",
        amount: subscription.amount,
        currency: subscription.currency,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : null,
        trialEndsAt: subscription.trial_ends_at
          ? new Date(subscription.trial_ends_at)
          : null,
        cancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at)
          : null,
      } : null}
    />
  )
}
