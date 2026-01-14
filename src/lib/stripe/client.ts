import Stripe from "stripe"

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

// Environment variables validation
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID",
  ]
  const optional = ["STRIPE_PUBLISHABLE_KEY"]

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

// Price configuration
export const PRICE_CONFIG = {
  id: process.env.STRIPE_PRICE_ID ?? "",
  amount: 400, // 4€ in cents
  currency: "eur",
  interval: "month" as const,
  trialDays: 14,
}

// Checkout session configuration
export const CHECKOUT_CONFIG = {
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/billing?success=true`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/billing?canceled=true`,
  billingAddressCollection: "required" as const,
  allowPromotionCodes: true,
}

// Portal configuration
export const PORTAL_CONFIG = {
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/billing`,
}
