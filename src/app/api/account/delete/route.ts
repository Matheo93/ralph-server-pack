import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, transaction } from "@/lib/aws/database"
import { sendEmail } from "@/lib/aws/ses"
import { z } from "zod"
import type { PoolClient } from "pg"

const DeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
})

/**
 * DELETE /api/account/delete
 * Permanently delete user account and all associated data
 * GDPR Article 17 - Right to erasure
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

  const validation = DeleteAccountSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: "Confirmation requise: 'DELETE MY ACCOUNT'" },
      { status: 400 }
    )
  }

  try {
    // Get user details before deletion for confirmation email
    const user = await queryOne<{ email: string }>(`
      SELECT email FROM users WHERE id = $1
    `, [userId])

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Get households where user is the only member (these will be deleted)
    const soloHouseholds = await query<{ household_id: string }>(`
      SELECT hm1.household_id
      FROM household_members hm1
      WHERE hm1.user_id = $1 AND hm1.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM household_members hm2
        WHERE hm2.household_id = hm1.household_id
        AND hm2.user_id != $1
        AND hm2.is_active = true
      )
    `, [userId])

    // Perform deletion in a transaction
    await transaction(async (client: PoolClient) => {
      // 1. Delete user's device tokens
      await client.query(`
        DELETE FROM device_tokens WHERE user_id = $1
      `, [userId])

      // 2. Delete user preferences
      await client.query(`
        DELETE FROM user_preferences WHERE user_id = $1
      `, [userId])

      // 3. For solo households, delete all associated data
      for (const { household_id } of soloHouseholds) {
        // Delete tasks
        await client.query(`
          DELETE FROM tasks WHERE household_id = $1
        `, [household_id])

        // Delete children
        await client.query(`
          DELETE FROM children WHERE household_id = $1
        `, [household_id])

        // Delete invitations
        await client.query(`
          DELETE FROM invitations WHERE household_id = $1
        `, [household_id])

        // Delete household members
        await client.query(`
          DELETE FROM household_members WHERE household_id = $1
        `, [household_id])

        // Delete household
        await client.query(`
          DELETE FROM households WHERE id = $1
        `, [household_id])
      }

      // 4. For shared households, just remove user membership
      await client.query(`
        DELETE FROM household_members WHERE user_id = $1
      `, [userId])

      // 5. Nullify user references in tasks (assigned_to, created_by)
      await client.query(`
        UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1
      `, [userId])

      await client.query(`
        UPDATE tasks SET created_by = NULL WHERE created_by = $1
      `, [userId])

      // 6. Delete the user
      await client.query(`
        DELETE FROM users WHERE id = $1
      `, [userId])
    })

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Confirmation de suppression de compte - FamilyLoad",
      html: `
        <h1>Compte supprimé</h1>
        <p>Votre compte FamilyLoad et toutes les données associées ont été supprimés conformément à votre demande.</p>
        <p>Cette action est irréversible.</p>
        <p>Si vous n'avez pas demandé cette suppression, veuillez nous contacter immédiatement.</p>
        <br>
        <p>L'équipe FamilyLoad</p>
      `,
      text: `
        Compte supprimé

        Votre compte FamilyLoad et toutes les données associées ont été supprimés conformément à votre demande.
        Cette action est irréversible.
        Si vous n'avez pas demandé cette suppression, veuillez nous contacter immédiatement.

        L'équipe FamilyLoad
      `,
    })

    return NextResponse.json({
      success: true,
      message: "Compte supprimé avec succès",
    })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte" },
      { status: 500 }
    )
  }
}
