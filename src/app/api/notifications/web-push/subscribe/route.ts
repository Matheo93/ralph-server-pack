/**
 * Web Push Subscription API
 *
 * POST: Subscribe to web push notifications
 * DELETE: Unsubscribe from web push notifications
 * GET: Get current subscription status
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import { isWebPushConfigured, WebPushSubscriptionSchema } from "@/lib/web-push"

const SubscribeRequestSchema = z.object({
  subscription: WebPushSubscriptionSchema,
  resubscribe: z.boolean().optional(),
})

interface WebPushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  enabled: boolean
  created_at: string
}

/**
 * POST /api/notifications/web-push/subscribe
 * Subscribe to web push notifications
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push non configuré" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = SubscribeRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { subscription, resubscribe } = validation.data

  try {
    // Check if subscription already exists (by endpoint)
    const existing = await queryOne<{ id: string; user_id: string }>(`
      SELECT id, user_id FROM web_push_subscriptions WHERE endpoint = $1
    `, [subscription.endpoint])

    if (existing) {
      // Update existing subscription
      await query(`
        UPDATE web_push_subscriptions SET
          user_id = $1,
          p256dh = $2,
          auth = $3,
          enabled = true,
          updated_at = NOW()
        WHERE id = $4
      `, [userId, subscription.keys.p256dh, subscription.keys.auth, existing.id])

      return NextResponse.json({
        success: true,
        subscribed: true,
        subscriptionId: existing.id,
        message: resubscribe
          ? "Subscription réactivée"
          : "Subscription mise à jour",
      })
    }

    // Create new subscription
    const result = await query<{ id: string }>(`
      INSERT INTO web_push_subscriptions (
        user_id, endpoint, p256dh, auth, enabled, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING id
    `, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth])

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Échec de l'inscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscribed: true,
      subscriptionId: result[0]!.id,
      message: "Inscrit aux notifications push",
    })
  } catch (error) {
    console.error("Error subscribing to web push:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/web-push/subscribe
 * Unsubscribe from web push notifications
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const endpoint = request.nextUrl.searchParams.get("endpoint")
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint manquant" }, { status: 400 })
  }

  try {
    const result = await query<{ id: string }>(`
      DELETE FROM web_push_subscriptions
      WHERE user_id = $1 AND endpoint = $2
      RETURNING id
    `, [userId, endpoint])

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Subscription non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      unsubscribed: true,
      message: "Désinscrit des notifications push",
    })
  } catch (error) {
    console.error("Error unsubscribing from web push:", error)
    return NextResponse.json(
      { error: "Erreur lors de la désinscription" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/web-push/subscribe
 * Get current subscription status
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    const subscriptions = await query<WebPushSubscriptionRecord>(`
      SELECT id, endpoint, enabled, created_at::text
      FROM web_push_subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId])

    return NextResponse.json({
      configured: isWebPushConfigured(),
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + "...",
        enabled: s.enabled,
        createdAt: s.created_at,
      })),
      count: subscriptions.length,
    })
  } catch (error) {
    console.error("Error getting web push subscriptions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
