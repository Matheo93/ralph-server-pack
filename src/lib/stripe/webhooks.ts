import type Stripe from "stripe"
import { stripe, mapStripeStatus } from "./client"
import { query, queryOne } from "@/lib/aws/database"

type WebhookResult = {
  success: boolean
  error?: string
}

/**
 * Verify and construct Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return null
  }
}

/**
 * Helper to safely get subscription timestamps
 */
function getSubscriptionTimestamp(
  subscription: Stripe.Subscription,
  field: "current_period_start" | "current_period_end" | "trial_end" | "canceled_at"
): number | null {
  // Access via bracket notation to handle the new Stripe types
  const value = (subscription as unknown as Record<string, unknown>)[field]
  if (typeof value === "number") {
    return value
  }
  return null
}

/**
 * Handle checkout.session.completed event
 * Called when a customer completes checkout
 */
export async function handleCheckoutCompleted(
  event: Stripe.CheckoutSessionCompletedEvent
): Promise<WebhookResult> {
  const session = event.data.object

  try {
    const householdId = session.metadata?.["household_id"]
    if (!householdId) {
      return { success: false, error: "Missing household_id in metadata" }
    }

    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const periodEnd = getSubscriptionTimestamp(subscription, "current_period_end")

    // Update household with subscription info
    await query(`
      UPDATE households
      SET
        stripe_customer_id = $1,
        subscription_status = $2,
        subscription_ends_at = to_timestamp($3),
        updated_at = NOW()
      WHERE id = $4
    `, [
      customerId,
      mapStripeStatus(subscription.status),
      periodEnd,
      householdId,
    ])

    // Create or update subscription record
    await upsertSubscription(householdId, subscription)

    return { success: true }
  } catch (error) {
    console.error("handleCheckoutCompleted error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Handle customer.subscription.updated event
 * Called when subscription is renewed, changed, or cancelled
 */
export async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent
): Promise<WebhookResult> {
  const subscription = event.data.object

  try {
    // Find household by customer ID
    const household = await queryOne<{ id: string }>(`
      SELECT id
      FROM households
      WHERE stripe_customer_id = $1
    `, [subscription.customer as string])

    if (!household) {
      return { success: false, error: "Household not found for customer" }
    }

    // Update household subscription status
    const status = mapStripeStatus(subscription.status)
    const periodEnd = getSubscriptionTimestamp(subscription, "current_period_end")
    const trialEnd = getSubscriptionTimestamp(subscription, "trial_end")

    const endDate = subscription.cancel_at_period_end
      ? periodEnd
      : subscription.status === "trialing"
        ? trialEnd
        : periodEnd

    await query(`
      UPDATE households
      SET
        subscription_status = $1,
        subscription_ends_at = to_timestamp($2),
        updated_at = NOW()
      WHERE id = $3
    `, [status, endDate, household.id])

    // Update subscription record
    await upsertSubscription(household.id, subscription)

    return { success: true }
  } catch (error) {
    console.error("handleSubscriptionUpdated error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Handle customer.subscription.deleted event
 * Called when subscription is fully cancelled
 */
export async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent
): Promise<WebhookResult> {
  const subscription = event.data.object

  try {
    // Find household by customer ID
    const household = await queryOne<{ id: string }>(`
      SELECT id
      FROM households
      WHERE stripe_customer_id = $1
    `, [subscription.customer as string])

    if (!household) {
      return { success: false, error: "Household not found for customer" }
    }

    // Update household to cancelled status
    await query(`
      UPDATE households
      SET
        subscription_status = 'cancelled',
        subscription_ends_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [household.id])

    // Update subscription record
    await query(`
      UPDATE subscriptions
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE household_id = $1 AND stripe_subscription_id = $2
    `, [household.id, subscription.id])

    return { success: true }
  } catch (error) {
    console.error("handleSubscriptionDeleted error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Handle invoice.payment_failed event
 * Called when a subscription payment fails
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent
): Promise<WebhookResult> {
  const invoice = event.data.object

  try {
    const customerId = invoice.customer as string

    // Find household by customer ID
    const household = await queryOne<{ id: string }>(`
      SELECT id
      FROM households
      WHERE stripe_customer_id = $1
    `, [customerId])

    if (!household) {
      return { success: false, error: "Household not found for customer" }
    }

    // Update subscription status to past_due
    await query(`
      UPDATE households
      SET
        subscription_status = 'past_due',
        updated_at = NOW()
      WHERE id = $1
    `, [household.id])

    return { success: true }
  } catch (error) {
    console.error("handleInvoicePaymentFailed error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Upsert subscription record
 */
async function upsertSubscription(
  householdId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const status = mapStripeStatus(subscription.status)
  const price = subscription.items.data[0]?.price

  const periodStart = getSubscriptionTimestamp(subscription, "current_period_start")
  const periodEnd = getSubscriptionTimestamp(subscription, "current_period_end")
  const trialEnd = getSubscriptionTimestamp(subscription, "trial_end")
  const canceledAt = getSubscriptionTimestamp(subscription, "canceled_at")

  // Check if subscription exists
  const existing = await queryOne<{ id: string }>(`
    SELECT id
    FROM subscriptions
    WHERE household_id = $1
    LIMIT 1
  `, [householdId])

  if (existing) {
    // Update existing
    await query(`
      UPDATE subscriptions
      SET
        stripe_subscription_id = $1,
        stripe_customer_id = $2,
        status = $3,
        plan = $4,
        amount = $5,
        current_period_start = to_timestamp($6),
        current_period_end = to_timestamp($7),
        trial_ends_at = $8,
        cancelled_at = $9,
        updated_at = NOW()
      WHERE id = $10
    `, [
      subscription.id,
      subscription.customer as string,
      status,
      price?.id ?? "unknown",
      price?.unit_amount ?? 0,
      periodStart,
      periodEnd,
      trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      canceledAt ? new Date(canceledAt * 1000).toISOString() : null,
      existing.id,
    ])
  } else {
    // Insert new
    await query(`
      INSERT INTO subscriptions (
        household_id,
        stripe_subscription_id,
        stripe_customer_id,
        status,
        plan,
        amount,
        currency,
        current_period_start,
        current_period_end,
        trial_ends_at,
        cancelled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8), to_timestamp($9), $10, $11)
    `, [
      householdId,
      subscription.id,
      subscription.customer as string,
      status,
      price?.id ?? "unknown",
      price?.unit_amount ?? 0,
      price?.currency ?? "eur",
      periodStart,
      periodEnd,
      trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      canceledAt ? new Date(canceledAt * 1000).toISOString() : null,
    ])
  }
}

/**
 * Route webhook event to appropriate handler
 */
export async function routeWebhookEvent(
  event: Stripe.Event
): Promise<WebhookResult> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event as Stripe.CheckoutSessionCompletedEvent)

    case "customer.subscription.updated":
      return handleSubscriptionUpdated(event as Stripe.CustomerSubscriptionUpdatedEvent)

    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event as Stripe.CustomerSubscriptionDeletedEvent)

    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event as Stripe.InvoicePaymentFailedEvent)

    default:
      // Unhandled event type - ignore silently
      return { success: true }
  }
}
