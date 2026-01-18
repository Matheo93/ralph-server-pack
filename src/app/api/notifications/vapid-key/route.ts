/**
 * VAPID Public Key API
 *
 * GET: Get the VAPID public key for web push subscription
 */

import { NextResponse } from "next/server"
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push"

/**
 * GET /api/notifications/vapid-key
 * Returns the VAPID public key for client-side push subscription
 */
export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push not configured" },
      { status: 503 }
    )
  }

  const publicKey = getVapidPublicKey()

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key not available" },
      { status: 503 }
    )
  }

  return NextResponse.json({
    publicKey,
  })
}
