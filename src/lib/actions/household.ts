"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { householdSchema, invitationSchema } from "@/lib/validations/household"
import type { HouseholdInput, InvitationInput } from "@/lib/validations/household"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, transaction, setCurrentUser } from "@/lib/aws/database"
import crypto from "crypto"

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

interface Household {
  id: string
  name: string
  country: string
  timezone: string
  streak_current: number
  streak_best: number
  subscription_status: string
  created_at: string
}

interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
}

interface Invitation {
  id: string
  household_id: string
  email: string
  role: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export async function createHousehold(
  data: HouseholdInput
): Promise<ActionResult<{ householdId: string }>> {
  const validation = householdSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  try {
    await transaction(async (client) => {
      // Create household
      const householdResult = await client.query<Household>(
        `INSERT INTO households (name, country, timezone)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [validation.data.name, validation.data.country, validation.data.timezone]
      )
      const household = householdResult.rows[0]

      if (!household) {
        throw new Error("Erreur lors de la création du foyer")
      }

      // Add user as parent_principal
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [household.id, userId, "parent_principal"]
      )

      return household
    })

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      error: err.message || "Erreur lors de la création du foyer",
    }
  }
}

export async function getHousehold() {
  const userId = await getUserId()
  if (!userId) return null

  await setCurrentUser(userId)

  interface MembershipResult {
    household_id: string
    role: string
    household_name: string
    country: string
    timezone: string
    streak_current: number
    streak_best: number
    subscription_status: string
    subscription_ends_at: string | null
  }

  const membership = await queryOne<MembershipResult>(`
    SELECT
      hm.household_id,
      hm.role,
      h.name as household_name,
      h.country,
      h.timezone,
      h.streak_current,
      h.streak_best,
      h.subscription_status,
      h.subscription_ends_at
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = $1 AND hm.is_active = true
  `, [userId])

  if (!membership) return null

  return {
    household_id: membership.household_id,
    role: membership.role,
    households: {
      id: membership.household_id,
      name: membership.household_name,
      country: membership.country,
      timezone: membership.timezone,
      streak_current: membership.streak_current,
      streak_best: membership.streak_best,
      subscription_status: membership.subscription_status,
      subscription_ends_at: membership.subscription_ends_at,
    },
  }
}

export async function getHouseholdMembers(householdId: string) {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  interface MemberResult {
    id: string
    role: string
    joined_at: string
    is_active: boolean
    user_id: string
    user_email: string
    avatar_url: string | null
  }

  const members = await query<MemberResult>(`
    SELECT
      hm.id,
      hm.role,
      hm.joined_at,
      hm.is_active,
      hm.user_id,
      u.email as user_email,
      u.avatar_url
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  return members.map((m) => ({
    id: m.id,
    role: m.role,
    joined_at: m.joined_at,
    is_active: m.is_active,
    users: {
      id: m.user_id,
      email: m.user_email,
      avatar_url: m.avatar_url,
    },
  }))
}

export async function inviteCoParent(
  data: InvitationInput
): Promise<ActionResult<{ invitationId: string; token: string }>> {
  const validation = invitationSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return {
      success: false,
      error: "Vous n'avez pas de foyer",
    }
  }

  // Check if email is already a member
  const existingMember = await queryOne<{ id: string }>(`
    SELECT hm.id
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND u.email = $2
  `, [membership.household_id, validation.data.email])

  if (existingMember) {
    return {
      success: false,
      error: "Cette personne est déjà membre du foyer",
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await queryOne<{ id: string }>(`
    SELECT id
    FROM invitations
    WHERE household_id = $1
      AND email = $2
      AND accepted_at IS NULL
      AND expires_at > NOW()
  `, [membership.household_id, validation.data.email])

  if (existingInvitation) {
    return {
      success: false,
      error: "Une invitation est déjà en attente pour cette adresse",
    }
  }

  // Generate unique token
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

  const invitation = await insert<Invitation>("invitations", {
    household_id: membership.household_id,
    email: validation.data.email,
    role: validation.data.role,
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (!invitation) {
    return {
      success: false,
      error: "Erreur lors de la création de l'invitation",
    }
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/settings/household")

  return {
    success: true,
    data: { invitationId: invitation.id, token },
  }
}

export async function acceptInvitation(
  token: string
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Vous devez être connecté pour accepter l'invitation",
    }
  }

  await setCurrentUser(userId)

  // Find invitation
  const invitation = await queryOne<Invitation>(`
    SELECT *
    FROM invitations
    WHERE token = $1
      AND accepted_at IS NULL
      AND expires_at > NOW()
  `, [token])

  if (!invitation) {
    return {
      success: false,
      error: "Invitation invalide ou expirée",
    }
  }

  // Check if user already has a household
  const existingMembership = await queryOne<{ id: string }>(`
    SELECT id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (existingMembership) {
    return {
      success: false,
      error: "Vous faites déjà partie d'un foyer",
    }
  }

  try {
    await transaction(async (client) => {
      // Add user to household
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [invitation.household_id, userId, invitation.role]
      )

      // Mark invitation as accepted
      await client.query(
        `UPDATE invitations SET accepted_at = NOW() WHERE id = $1`,
        [invitation.id]
      )
    })

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      error: err.message || "Erreur lors de l'acceptation de l'invitation",
    }
  }
}

export async function getPendingInvitations(householdId: string) {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  const invitations = await query<Invitation>(`
    SELECT *
    FROM invitations
    WHERE household_id = $1
      AND accepted_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
  `, [householdId])

  return invitations
}

export async function cancelInvitation(
  invitationId: string
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  await setCurrentUser(userId)

  // Verify user is member of the household
  const invitation = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM invitations
    WHERE id = $1
  `, [invitationId])

  if (!invitation) {
    return {
      success: false,
      error: "Invitation introuvable",
    }
  }

  const membership = await queryOne<{ id: string }>(`
    SELECT id
    FROM household_members
    WHERE household_id = $1
      AND user_id = $2
      AND is_active = true
  `, [invitation.household_id, userId])

  if (!membership) {
    return {
      success: false,
      error: "Vous n'êtes pas autorisé à annuler cette invitation",
    }
  }

  await query(`DELETE FROM invitations WHERE id = $1`, [invitationId])

  revalidatePath("/dashboard/settings")

  return {
    success: true,
  }
}
