import { stripe, PRICE_CONFIG, CHECKOUT_CONFIG, PORTAL_CONFIG } from "./client"
import { queryOne, query } from "@/lib/aws/database"
import type Stripe from "stripe"

interface CheckoutResult {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
}

interface PortalResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Create a Stripe checkout session for a household
 */
export async function createCheckoutSession(
  householdId: string,
  userEmail: string
): Promise<CheckoutResult> {
  try {
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(householdId, userEmail)

    if (!customerId) {
      return { success: false, error: "Failed to create customer" }
    }

    // Check if already has active subscription
    const existing = await checkExistingSubscription(customerId)
    if (existing) {
      return {
        success: false,
        error: "Already has an active subscription",
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: PRICE_CONFIG.id,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: PRICE_CONFIG.trialDays,
        metadata: {
          household_id: householdId,
        },
      },
      success_url: CHECKOUT_CONFIG.successUrl,
      cancel_url: CHECKOUT_CONFIG.cancelUrl,
      billing_address_collection: CHECKOUT_CONFIG.billingAddressCollection,
      allow_promotion_codes: CHECKOUT_CONFIG.allowPromotionCodes,
      metadata: {
        household_id: householdId,
      },
    })

    return {
      success: true,
      sessionId: session.id,
      url: session.url ?? undefined,
    }
  } catch (error) {
    console.error("Checkout session creation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(
  householdId: string
): Promise<PortalResult> {
  try {
    // Get customer ID from household
    const household = await queryOne<{ stripe_customer_id: string | null }>(`
      SELECT stripe_customer_id
      FROM households
      WHERE id = $1
    `, [householdId])

    if (!household?.stripe_customer_id) {
      return { success: false, error: "No Stripe customer found" }
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: household.stripe_customer_id,
      return_url: PORTAL_CONFIG.returnUrl,
    })

    return {
      success: true,
      url: session.url,
    }
  } catch (error) {
    console.error("Portal session creation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get or create a Stripe customer for a household
 */
async function getOrCreateCustomer(
  householdId: string,
  email: string
): Promise<string | null> {
  // Check if household already has a customer
  const household = await queryOne<{
    stripe_customer_id: string | null
    name: string
  }>(`
    SELECT stripe_customer_id, name
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) {
    return null
  }

  if (household.stripe_customer_id) {
    return household.stripe_customer_id
  }

  // Create new customer
  try {
    const customer = await stripe.customers.create({
      email,
      name: household.name,
      metadata: {
        household_id: householdId,
      },
    })

    // Save customer ID to household
    await query(`
      UPDATE households
      SET stripe_customer_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [customer.id, householdId])

    return customer.id
  } catch (error) {
    console.error("Customer creation error:", error)
    return null
  }
}

/**
 * Check if customer already has an active subscription
 */
async function checkExistingSubscription(
  customerId: string
): Promise<boolean> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    })

    return subscriptions.data.length > 0
  } catch {
    return false
  }
}

/**
 * Get subscription details for a household
 */
export async function getSubscriptionDetails(
  householdId: string
): Promise<Stripe.Subscription | null> {
  const household = await queryOne<{ stripe_customer_id: string | null }>(`
    SELECT stripe_customer_id
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household?.stripe_customer_id) {
    return null
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: household.stripe_customer_id,
      limit: 1,
      expand: ["data.default_payment_method"],
    })

    return subscriptions.data[0] ?? null
  } catch {
    return null
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentItem = subscription.items.data[0]

    if (!currentItem) {
      return { success: false, error: "No subscription items found" }
    }

    // Update the subscription item with new price
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get upcoming invoice (preview of next charge)
 */
export async function getUpcomingInvoice(
  householdId: string
): Promise<{
  success: boolean
  amount?: number
  currency?: string
  nextPaymentDate?: Date
  error?: string
}> {
  const household = await queryOne<{ stripe_customer_id: string | null }>(`
    SELECT stripe_customer_id
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household?.stripe_customer_id) {
    return { success: false, error: "No Stripe customer found" }
  }

  try {
    const upcoming = await stripe.invoices.createPreview({
      customer: household.stripe_customer_id,
    })

    return {
      success: true,
      amount: upcoming.amount_due,
      currency: upcoming.currency,
      nextPaymentDate: upcoming.next_payment_attempt
        ? new Date(upcoming.next_payment_attempt * 1000)
        : undefined,
    }
  } catch (error) {
    // No upcoming invoice (no active subscription)
    return {
      success: false,
      error: error instanceof Error ? error.message : "No upcoming invoice",
    }
  }
}

/**
 * Extend trial period
 */
export async function extendTrial(
  subscriptionId: string,
  additionalDays: number
): Promise<{ success: boolean; newTrialEnd?: Date; error?: string }> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (subscription.status !== "trialing") {
      return { success: false, error: "Subscription is not in trial" }
    }

    // Access trial_end via bracket notation
    const sub = subscription as unknown as Record<string, unknown>
    const currentTrialEnd = sub["trial_end"] as number | null

    if (!currentTrialEnd) {
      return { success: false, error: "No trial end date found" }
    }

    const newTrialEnd = new Date(currentTrialEnd * 1000)
    newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays)

    await stripe.subscriptions.update(subscriptionId, {
      trial_end: Math.floor(newTrialEnd.getTime() / 1000),
    })

    return { success: true, newTrialEnd }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get payment method details
 */
export async function getPaymentMethod(
  householdId: string
): Promise<{
  success: boolean
  paymentMethod?: {
    type: string
    brand?: string
    last4?: string
    expMonth?: number
    expYear?: number
  }
  error?: string
}> {
  const household = await queryOne<{ stripe_customer_id: string | null }>(`
    SELECT stripe_customer_id
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household?.stripe_customer_id) {
    return { success: false, error: "No Stripe customer found" }
  }

  try {
    const customer = await stripe.customers.retrieve(household.stripe_customer_id)

    if (customer.deleted) {
      return { success: false, error: "Customer deleted" }
    }

    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method

    if (!defaultPaymentMethodId || typeof defaultPaymentMethodId !== "string") {
      return { success: false, error: "No default payment method" }
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId)

    if (paymentMethod.type === "card" && paymentMethod.card) {
      return {
        success: true,
        paymentMethod: {
          type: "card",
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        },
      }
    }

    return {
      success: true,
      paymentMethod: {
        type: paymentMethod.type,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
