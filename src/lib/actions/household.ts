"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { householdSchema, invitationSchema } from "@/lib/validations/household"
import type { HouseholdInput, InvitationInput } from "@/lib/validations/household"
import crypto from "crypto"

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  // Create household
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: validation.data.name,
      country: validation.data.country,
      timezone: validation.data.timezone,
    })
    .select()
    .single()

  if (householdError) {
    return {
      success: false,
      error: householdError.message,
    }
  }

  // Add user as parent_principal
  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "parent_principal",
  })

  if (memberError) {
    // Rollback household creation
    await supabase.from("households").delete().eq("id", household.id)
    return {
      success: false,
      error: memberError.message,
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function getHousehold() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: membership } = await supabase
    .from("household_members")
    .select(
      `
      household_id,
      role,
      households (
        id,
        name,
        country,
        timezone,
        streak_current,
        streak_best,
        subscription_status
      )
    `
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  return membership
}

export async function getHouseholdMembers(householdId: string) {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from("household_members")
    .select(
      `
      id,
      role,
      joined_at,
      is_active,
      users (
        id,
        email,
        avatar_url
      )
    `
    )
    .eq("household_id", householdId)
    .eq("is_active", true)

  if (error) {
    return []
  }

  return members ?? []
}

export async function inviteCoParent(
  data: InvitationInput
): Promise<ActionResult<{ invitationId: string }>> {
  const validation = invitationSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  // Get user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!membership) {
    return {
      success: false,
      error: "Vous n'avez pas de foyer",
    }
  }

  // Check if email is already a member
  const { data: existingMember } = await supabase
    .from("household_members")
    .select("id, users!inner(email)")
    .eq("household_id", membership.household_id)
    .eq("users.email", validation.data.email)
    .single()

  if (existingMember) {
    return {
      success: false,
      error: "Cette personne est déjà membre du foyer",
    }
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from("invitations")
    .select("id")
    .eq("household_id", membership.household_id)
    .eq("email", validation.data.email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single()

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

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      household_id: membership.household_id,
      email: validation.data.email,
      role: validation.data.role,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  // TODO: Send invitation email via SES or Supabase email
  // For now, just return success - the invitation link can be shared manually

  revalidatePath("/dashboard/settings")

  return {
    success: true,
    data: { invitationId: invitation.id },
  }
}

export async function acceptInvitation(
  token: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Vous devez être connecté pour accepter l'invitation",
    }
  }

  // Find invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (inviteError || !invitation) {
    return {
      success: false,
      error: "Invitation invalide ou expirée",
    }
  }

  // Check if user already has a household
  const { data: existingMembership } = await supabase
    .from("household_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (existingMembership) {
    return {
      success: false,
      error: "Vous faites déjà partie d'un foyer",
    }
  }

  // Add user to household
  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: invitation.household_id,
    user_id: user.id,
    role: invitation.role,
  })

  if (memberError) {
    return {
      success: false,
      error: memberError.message,
    }
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function getPendingInvitations(householdId: string) {
  const supabase = await createClient()

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("household_id", householdId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  return invitations ?? []
}

export async function cancelInvitation(
  invitationId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  // Verify user is member of the household
  const { data: invitation } = await supabase
    .from("invitations")
    .select("household_id")
    .eq("id", invitationId)
    .single()

  if (!invitation) {
    return {
      success: false,
      error: "Invitation introuvable",
    }
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", invitation.household_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!membership) {
    return {
      success: false,
      error: "Vous n'êtes pas autorisé à annuler cette invitation",
    }
  }

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath("/dashboard/settings")

  return {
    success: true,
  }
}
