import Stripe from "stripe"

// Server-side Stripe instance (lazy initialization to avoid errors in tests)
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env["STRIPE_SECRET_KEY"]
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY not configured")
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  }
  return _stripe
}

// Export a proxy that lazily initializes Stripe
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

// Environment variables validation
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID",
  ]

  const missing = required.filter((key) => !process.env[key])

  return {
    valid: missing.length === 0,
    missing,
  }
}

// Stripe types for the application
export interface StripeCustomerData {
  householdId: string
  email: string
  name: string
}

export interface StripeSubscriptionData {
  customerId: string
  subscriptionId: string
  status: SubscriptionStatus
  priceId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd: Date | null
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"

// Map Stripe status to our simplified status
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "trial" | "past_due" | "cancelled" {
  switch (stripeStatus) {
    case "trialing":
      return "trial"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled"
    default:
      return "active"
  }
}

// Get config values safely
function getEnvVar(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback
}

// Price configuration
export const PRICE_CONFIG = {
  id: getEnvVar("STRIPE_PRICE_ID"),
  amount: 400, // 4€ in cents
  currency: "eur",
  interval: "month" as const,
  trialDays: 14,
}

// Checkout session configuration
export const CHECKOUT_CONFIG = {
  successUrl: `${getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000")}/settings/billing?success=true`,
  cancelUrl: `${getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000")}/settings/billing?canceled=true`,
  billingAddressCollection: "required" as const,
  allowPromotionCodes: true,
}

// Portal configuration
export const PORTAL_CONFIG = {
  returnUrl: `${getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000")}/settings/billing`,
}
