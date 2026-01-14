import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent, routeWebhookEvent } from "@/lib/stripe/webhooks"

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text()

    // Get Stripe signature header
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      console.error("Missing stripe-signature header")
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      )
    }

    // Get webhook secret
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      )
    }

    // Construct and verify the event
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
      // Return 200 anyway to prevent Stripe from retrying indefinitely
      // The error is logged for investigation
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 }
    )
  }
}

// Disable body parsing for raw body access (required for signature verification)
export const config = {
  api: {
    bodyParser: false,
  },
}
