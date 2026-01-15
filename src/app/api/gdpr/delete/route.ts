/**
 * GDPR Data Deletion API
 *
 * Implements GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 * Allows users to permanently delete all their data
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser, queryOne } from "@/lib/aws/database"
import { deleteUserData } from "@/lib/services/gdpr"

// =============================================================================
// SCHEMAS
// =============================================================================

const DeleteConfirmationSchema = z.object({
  confirmation: z.literal("DELETE_MY_DATA"),
  understand_irreversible: z.literal(true),
})

// =============================================================================
// GET - Get deletion preview
// =============================================================================

/**
 * GET /api/gdpr/delete
 *
 * Returns a preview of what data will be deleted
 * Does NOT perform any deletion
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{
    household_id: string
    role: string
  }>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({
      success: true,
      preview: {
        has_household: false,
        is_owner: false,
        other_members: 0,
        will_delete: {
          account: true,
          household: false,
          tasks: 0,
          children: 0,
          vocal_commands: 0,
          notifications: 0,
        },
      },
      confirmation_required: "DELETE_MY_DATA",
    })
  }

  // Count other members
  const otherMembers = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM household_members
    WHERE household_id = $1 AND user_id != $2 AND is_active = true
  `, [membership.household_id, userId])

  const otherMemberCount = parseInt(otherMembers?.count ?? "0", 10)
  const isOwner = membership.role === "owner"
  const isSoleMember = otherMemberCount === 0

  // Count data that will be deleted
  let tasksCount = 0
  let childrenCount = 0
  let vocalCount = 0
  let notifCount = 0

  if (isSoleMember) {
    const tasks = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM tasks WHERE household_id = $1
    `, [membership.household_id])
    tasksCount = parseInt(tasks?.count ?? "0", 10)

    const children = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM children WHERE household_id = $1
    `, [membership.household_id])
    childrenCount = parseInt(children?.count ?? "0", 10)

    const vocal = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM vocal_commands WHERE household_id = $1
    `, [membership.household_id]).catch(() => null)
    vocalCount = parseInt(vocal?.count ?? "0", 10)

    const notif = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM notifications WHERE household_id = $1
    `, [membership.household_id]).catch(() => null)
    notifCount = parseInt(notif?.count ?? "0", 10)
  }

  // Check if deletion is blocked
  const blocked = isOwner && !isSoleMember

  return NextResponse.json({
    success: true,
    preview: {
      has_household: true,
      is_owner: isOwner,
      other_members: otherMemberCount,
      will_delete: {
        account: true,
        household: isSoleMember,
        tasks: isSoleMember ? tasksCount : 0,
        children: isSoleMember ? childrenCount : 0,
        vocal_commands: isSoleMember ? vocalCount : 0,
        notifications: isSoleMember ? notifCount : 0,
      },
    },
    blocked: blocked
      ? "Vous devez transférer la propriété du foyer avant de supprimer votre compte"
      : null,
    confirmation_required: blocked ? null : "DELETE_MY_DATA",
  })
}

// =============================================================================
// POST - Perform deletion
// =============================================================================

/**
 * POST /api/gdpr/delete
 *
 * Permanently delete all user data
 *
 * Body:
 * {
 *   "confirmation": "DELETE_MY_DATA",
 *   "understand_irreversible": true
 * }
 */
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse and validate request body
  let body: z.infer<typeof DeleteConfirmationSchema>
  try {
    const json = await request.json()
    body = DeleteConfirmationSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Confirmation invalide",
          details: error.issues,
          required: {
            confirmation: "DELETE_MY_DATA",
            understand_irreversible: true,
          },
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Format de requête invalide" },
      { status: 400 }
    )
  }

  // Double-check confirmation
  if (body.confirmation !== "DELETE_MY_DATA" || !body.understand_irreversible) {
    return NextResponse.json(
      { error: "Confirmation requise" },
      { status: 400 }
    )
  }

  // Perform deletion
  const result = await deleteUserData()

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        deletedRecords: result.deletedRecords,
      },
      { status: result.error?.includes("transférer") ? 403 : 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Toutes vos données ont été supprimées",
    deletedRecords: result.deletedRecords,
    deleted_at: new Date().toISOString(),
  })
}
