import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, insert } from "@/lib/aws/database"
import { z } from "zod"

const RegisterTokenSchema = z.object({
  token: z.string().min(1, "Token requis"),
  platform: z.enum(["web", "android", "ios"]).default("web"),
})

const UnregisterTokenSchema = z.object({
  token: z.string().min(1, "Token requis"),
})

/**
 * POST /api/notifications/register-token
 * Register a device token for push notifications
 */
export async function POST(request: NextRequest) {
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

  const validation = RegisterTokenSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { token, platform } = validation.data

  try {
    // Check if this token already exists for this user
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM device_tokens
      WHERE user_id = $1 AND token = $2
    `, [userId, token])

    if (existing) {
      // Token already registered - update last_used
      await query(`
        UPDATE device_tokens
        SET last_used = NOW(), platform = $3
        WHERE user_id = $1 AND token = $2
      `, [userId, token, platform])

      return NextResponse.json({
        success: true,
        message: "Token mis à jour",
      })
    }

    // Insert new token
    await insert<{ id: string }>("device_tokens", {
      user_id: userId,
      token,
      platform,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Token enregistré",
    })
  } catch (error) {
    console.error("Error registering device token:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du token" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/register-token
 * Unregister a device token
 */
export async function DELETE(request: NextRequest) {
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

  const validation = UnregisterTokenSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { token } = validation.data

  try {
    // Delete the token - query returns empty array for DELETE
    await query(`
      DELETE FROM device_tokens
      WHERE user_id = $1 AND token = $2
    `, [userId, token])

    // Always return success - if token didn't exist, it's still "deleted"
    return NextResponse.json({
      success: true,
      message: "Token supprimé",
    })
  } catch (error) {
    console.error("Error unregistering device token:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du token" },
      { status: 500 }
    )
  }
}
