"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { childSchema, updateChildSchema } from "@/lib/validations/child"
import type { ChildInput, UpdateChildInput } from "@/lib/validations/child"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, update, setCurrentUser } from "@/lib/aws/database"

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

interface Child {
  id: string
  household_id: string
  first_name: string
  birthdate: string
  gender: string | null
  school_name: string | null
  school_level: string | null
  school_class: string | null
  tags: string[]
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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

  const child = await insert<Child>("children", {
    household_id: membership.household_id,
    first_name: validation.data.first_name,
    birthdate: validation.data.birthdate,
    gender: validation.data.gender ?? null,
    school_name: validation.data.school_name ?? null,
    school_level: validation.data.school_level ?? null,
    school_class: validation.data.school_class ?? null,
    tags: validation.data.tags ?? [],
  })

  if (!child) {
    return {
      success: false,
      error: "Erreur lors de la création de l'enfant",
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

  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  await setCurrentUser(userId)

  // Verify child belongs to user's household
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

  const { id, ...updateData } = validation.data

  // Build update query dynamically
  const keys = Object.keys(updateData)
  const values = Object.values(updateData)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")

  const result = await query(
    `UPDATE children
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
       AND household_id = $${keys.length + 2}
     RETURNING id`,
    [...values, id, membership.household_id]
  )

  if (result.length === 0) {
    return {
      success: false,
      error: "Enfant introuvable ou non autorisé",
    }
  }

  revalidatePath("/children")

  return {
    success: true,
  }
}

export async function deleteChild(childId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  await setCurrentUser(userId)

  // Verify child belongs to user's household
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

  // Soft delete - mark as inactive
  const result = await query(
    `UPDATE children
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
       AND household_id = $2
     RETURNING id`,
    [childId, membership.household_id]
  )

  if (result.length === 0) {
    return {
      success: false,
      error: "Enfant introuvable ou non autorisé",
    }
  }

  revalidatePath("/children")

  return {
    success: true,
  }
}

export async function getChildren() {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return []

  const children = await query<Child>(`
    SELECT *
    FROM children
    WHERE household_id = $1
      AND is_active = true
    ORDER BY birthdate ASC
  `, [membership.household_id])

  return children
}

export async function getChild(childId: string) {
  const userId = await getUserId()
  if (!userId) return null

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return null

  const child = await queryOne<Child>(`
    SELECT *
    FROM children
    WHERE id = $1
      AND household_id = $2
      AND is_active = true
  `, [childId, membership.household_id])

  return child
}
