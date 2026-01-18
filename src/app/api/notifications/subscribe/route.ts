/**
 * Push Notifications Subscribe API
 *
 * POST: Subscribe a device to push notifications
 * DELETE: Unsubscribe a device from push notifications
 * PUT: Update subscription preferences
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import { isFirebaseConfigured } from "@/lib/firebase"

const SubscribeSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["ios", "apns", "android", "fcm", "web"]),
  deviceName: z.string().max(100).optional(),
  deviceModel: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
})

const UpdateSubscriptionSchema = z.object({
  token: z.string().min(10).max(500),
  enabled: z.boolean(),
  topics: z.array(z.enum([
    "task_reminder",
    "deadline_warning",
    "streak_risk",
    "charge_alert",
    "task_completed",
    "daily_digest",
    "weekly_summary",
  ])).optional(),
})

// Query parameter schema for DELETE
const DeleteSubscriptionQuerySchema = z.object({
  token: z.string().min(1, "Token manquant"),
})

interface DeviceToken {
  id: string
  user_id: string
  token: string
  platform: string
  enabled: boolean
  topics: string[]
}

/**
 * POST /api/notifications/subscribe
 * Subscribe a device to push notifications
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Push notifications non configurées" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = SubscribeSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { token, platform, deviceName, deviceModel, osVersion, appVersion } = validation.data

  try {
    // Check if token already exists
    const existing = await queryOne<{ id: string; user_id: string }>(`
      SELECT id, user_id FROM device_tokens WHERE token = $1
    `, [token])

    if (existing) {
      // Update existing token
      if (existing.user_id !== userId) {
        // Token transferred to new user
        await query(`
          UPDATE device_tokens SET
            user_id = $1,
            platform = $2,
            device_name = $3,
            device_model = $4,
            os_version = $5,
            app_version = $6,
            enabled = true,
            last_used = NOW(),
            updated_at = NOW()
          WHERE id = $7
        `, [userId, platform, deviceName ?? null, deviceModel ?? null, osVersion ?? null, appVersion ?? null, existing.id])
      } else {
        // Same user - update metadata
        await query(`
          UPDATE device_tokens SET
            platform = $1,
            device_name = $2,
            device_model = $3,
            os_version = $4,
            app_version = $5,
            enabled = true,
            last_used = NOW(),
            updated_at = NOW()
          WHERE id = $6
        `, [platform, deviceName ?? null, deviceModel ?? null, osVersion ?? null, appVersion ?? null, existing.id])
      }

      return NextResponse.json({
        success: true,
        subscribed: true,
        tokenId: existing.id,
        message: "Inscription aux notifications mise à jour",
      })
    }

    // Create new token
    const result = await query<{ id: string }>(`
      INSERT INTO device_tokens (
        user_id, token, platform, device_name, device_model,
        os_version, app_version, enabled, last_used, topics
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), $8)
      RETURNING id
    `, [
      userId,
      token,
      platform,
      deviceName ?? null,
      deviceModel ?? null,
      osVersion ?? null,
      appVersion ?? null,
      JSON.stringify([
        "task_reminder",
        "deadline_warning",
        "streak_risk",
        "charge_alert",
      ]),
    ])

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Échec de l'inscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscribed: true,
      tokenId: result[0]!.id,
      message: "Inscrit aux notifications push",
    })
  } catch (error) {
    console.error("Error subscribing to notifications:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe a device from push notifications
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const queryValidation = DeleteSubscriptionQuerySchema.safeParse({
    token: request.nextUrl.searchParams.get("token"),
  })

  if (!queryValidation.success) {
    return NextResponse.json(
      { error: queryValidation.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 }
    )
  }

  const { token } = queryValidation.data

  try {
    const result = await query<{ id: string }>(`
      DELETE FROM device_tokens
      WHERE user_id = $1 AND token = $2
      RETURNING id
    `, [userId, token])

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Token non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      unsubscribed: true,
      message: "Désinscrit des notifications push",
    })
  } catch (error) {
    console.error("Error unsubscribing from notifications:", error)
    return NextResponse.json(
      { error: "Erreur lors de la désinscription" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/subscribe
 * Update subscription preferences (enable/disable, topics)
 */
export async function PUT(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = UpdateSubscriptionSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { token, enabled, topics } = validation.data

  try {
    const updateFields: string[] = ["enabled = $2", "updated_at = NOW()"]
    const params: unknown[] = [token, enabled]

    if (topics) {
      params.push(JSON.stringify(topics))
      updateFields.push(`topics = $${params.length}`)
    }

    const result = await query<{ id: string }>(`
      UPDATE device_tokens
      SET ${updateFields.join(", ")}
      WHERE token = $1 AND user_id = $${params.length + 1}
      RETURNING id
    `, [...params, userId])

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Token non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      updated: true,
      enabled,
      topics: topics ?? null,
      message: enabled ? "Notifications activées" : "Notifications désactivées",
    })
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/subscribe
 * Get subscription status for current user
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  try {
    const tokens = await query<{
      id: string
      token: string
      platform: string
      device_name: string | null
      enabled: boolean
      topics: string | null
      last_used: string
    }>(`
      SELECT id, token, platform, device_name, enabled, topics, last_used::text
      FROM device_tokens
      WHERE user_id = $1
      ORDER BY last_used DESC
    `, [userId])

    return NextResponse.json({
      pushEnabled: isFirebaseConfigured(),
      subscriptions: tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        deviceName: t.device_name,
        enabled: t.enabled,
        topics: t.topics ? JSON.parse(t.topics) : [],
        lastUsed: t.last_used,
      })),
      count: tokens.length,
    })
  } catch (error) {
    console.error("Error getting subscriptions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
