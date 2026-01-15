import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent, routeWebhookEvent } from "@/lib/stripe/webhooks"
import { createApiLogger, createRequestTimer } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const logger = createApiLogger()
  const getElapsed = createRequestTimer()

  try {
    // Get raw body for signature verification
    const payload = await request.text()

    // Get Stripe signature header
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      logger.warn("Stripe webhook: Missing signature header")
      logger.request("POST", "/api/stripe/webhook", 400, getElapsed())
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      )
    }

    // Get webhook secret
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]
    if (!webhookSecret) {
      logger.error("Stripe webhook: Missing STRIPE_WEBHOOK_SECRET")
      logger.request("POST", "/api/stripe/webhook", 500, getElapsed())
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      )
    }

    // Construct and verify the event
    const event = constructWebhookEvent(payload, signature, webhookSecret)
    if (!event) {
      logger.warn("Stripe webhook: Invalid signature")
      logger.request("POST", "/api/stripe/webhook", 400, getElapsed())
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }

    // Route to appropriate handler
    const result = await routeWebhookEvent(event)

    if (!result.success) {
      logger.error(`Stripe webhook handler error for ${event.type}`, {
        eventType: event.type,
        eventId: event.id,
        error: result.error,
      })
      // Return 200 anyway to prevent Stripe from retrying indefinitely
      // The error is logged for investigation
    } else {
      logger.info(`Stripe webhook processed: ${event.type}`, {
        eventType: event.type,
        eventId: event.id,
      })
    }

    logger.request("POST", "/api/stripe/webhook", 200, getElapsed(), {
      eventType: event.type,
      success: result.success,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.errorWithStack(
      "Stripe webhook error",
      error instanceof Error ? error : new Error(String(error))
    )
    logger.request("POST", "/api/stripe/webhook", 500, getElapsed())
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 }
    )
  }
}

// Note: Body parsing is automatically disabled in App Router when using request.text()
