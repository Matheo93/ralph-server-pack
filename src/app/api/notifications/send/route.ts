import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import { sendPushToUser, sendPushToHousehold } from "@/lib/services/notifications"
import { isFirebaseConfigured } from "@/lib/firebase"

const SendNotificationSchema = z.object({
  type: z.enum(["task_reminder", "deadline_warning", "streak_risk", "charge_alert", "custom"]),
  title: z.string().min(1, "Titre requis").max(100),
  body: z.string().max(500).optional(),
  target: z.enum(["user", "household"]),
  targetId: z.string().uuid().optional(),
  data: z.record(z.string()).optional(),
})

/**
 * POST /api/notifications/send
 * Send a push notification manually
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Notifications push non configurées" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = SendNotificationSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { type, title, body: notifBody, target, targetId, data } = validation.data

  try {
    // Verify user has access to send to target
    if (target === "household") {
      // Get user's household
      const membership = await queryOne<{ household_id: string }>(`
        SELECT household_id FROM household_members
        WHERE user_id = $1 AND is_active = true
      `, [userId])

      if (!membership) {
        return NextResponse.json(
          { error: "Vous n'appartenez à aucun foyer" },
          { status: 403 }
        )
      }

      const householdId = targetId || membership.household_id

      // Verify user is member of target household
      if (householdId !== membership.household_id) {
        return NextResponse.json(
          { error: "Accès non autorisé à ce foyer" },
          { status: 403 }
        )
      }

      const result = await sendPushToHousehold(
        householdId,
        title,
        notifBody || "",
        { type, ...data }
      )

      return NextResponse.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
      })
    }

    // Send to specific user or self
    const targetUserId = targetId || userId

    // Verify user can send to target user (must be in same household)
    if (targetUserId !== userId) {
      const sameHousehold = await queryOne<{ id: string }>(`
        SELECT hm1.id
        FROM household_members hm1
        JOIN household_members hm2 ON hm2.household_id = hm1.household_id
        WHERE hm1.user_id = $1 AND hm2.user_id = $2
          AND hm1.is_active = true AND hm2.is_active = true
      `, [userId, targetUserId])

      if (!sameHousehold) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé dans votre foyer" },
          { status: 403 }
        )
      }
    }

    const result = await sendPushToUser(
      targetUserId,
      title,
      notifBody || "",
      { type, ...data }
    )

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la notification" },
      { status: 500 }
    )
  }
}
