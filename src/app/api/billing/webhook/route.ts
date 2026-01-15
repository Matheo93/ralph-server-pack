/**
 * Stripe Webhook API
 *
 * Handle Stripe webhook events for subscription lifecycle.
 */

import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent, routeWebhookEvent } from "@/lib/stripe/webhooks"

const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    )
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let payload: string
  try {
    payload = await request.text()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  // Verify and construct event
  const event = constructWebhookEvent(payload, signature, webhookSecret)
  if (!event) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  // Route to appropriate handler
  const result = await routeWebhookEvent(event)

  if (!result.success) {
    console.error(`Webhook handler error for ${event.type}:`, result.error)
    // Return 200 anyway to acknowledge receipt
    // Stripe will retry if we return non-2xx
  }

  return NextResponse.json({ received: true })
}
