"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { childSchema, updateChildSchema } from "@/lib/validations/child"
import type { ChildInput, UpdateChildInput } from "@/lib/validations/child"

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export async function createChild(
  data: ChildInput
): Promise<ActionResult<{ childId: string }>> {
  const validation = childSchema.safeParse(data)
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

  const { data: child, error } = await supabase
    .from("children")
    .insert({
      household_id: membership.household_id,
      first_name: validation.data.first_name,
      birthdate: validation.data.birthdate,
      gender: validation.data.gender ?? null,
      school_name: validation.data.school_name ?? null,
      school_level: validation.data.school_level ?? null,
      school_class: validation.data.school_class ?? null,
      tags: validation.data.tags,
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath("/children")
  redirect("/children")
}

export async function updateChild(
  data: UpdateChildInput
): Promise<ActionResult> {
  const validation = updateChildSchema.safeParse(data)
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

  // Verify child belongs to user's household
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

  const { id, ...updateData } = validation.data

  const { error } = await supabase
    .from("children")
    .update(updateData)
    .eq("id", id)
    .eq("household_id", membership.household_id)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath("/children")

  return {
    success: true,
  }
}

export async function deleteChild(childId: string): Promise<ActionResult> {
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

  // Verify child belongs to user's household
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

  // Soft delete - mark as inactive
  const { error } = await supabase
    .from("children")
    .update({ is_active: false })
    .eq("id", childId)
    .eq("household_id", membership.household_id)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath("/children")

  return {
    success: true,
  }
}

export async function getChildren() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // Get user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!membership) return []

  const { data: children, error } = await supabase
    .from("children")
    .select("*")
    .eq("household_id", membership.household_id)
    .eq("is_active", true)
    .order("birthdate", { ascending: true })

  if (error) {
    return []
  }

  return children ?? []
}

export async function getChild(childId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!membership) return null

  const { data: child, error } = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("household_id", membership.household_id)
    .eq("is_active", true)
    .single()

  if (error) {
    return null
  }

  return child
}
