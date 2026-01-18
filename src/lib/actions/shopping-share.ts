"use server"

import { randomBytes } from "crypto"
import {
  ShoppingListShareCreateSchema,
  ShoppingListShareRevokeSchema,
  type ShoppingListShareCreateInput,
  type ShoppingListShareRevokeInput,
} from "@/lib/validations/shopping"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"

// ============================================================
// TYPES
// ============================================================

export interface ShoppingListShare {
  id: string
  list_id: string
  share_token: string
  shared_by: string
  shared_by_name: string | null
  shared_at: string
  expires_at: string | null
  is_active: boolean
  access_count: number
  last_accessed_at: string | null
  list_name: string
}

export interface SharedShoppingList {
  id: string
  name: string
  household_name: string | null
  item_count: number
  checked_count: number
  updated_at: string
}

export interface SharedShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  category: string
  is_checked: boolean
  note: string | null
  priority: number
  sort_order: number
}

export interface ShoppingShareActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface HouseholdMembership {
  household_id: string
  role: string
}

// ============================================================
// HELPERS
// ============================================================

async function getHouseholdForUser(userId: string): Promise<HouseholdMembership | null> {
  await setCurrentUser(userId)
  return queryOne<HouseholdMembership>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])
}

function generateShareToken(): string {
  return randomBytes(12).toString("base64url").slice(0, 16)
}

// ============================================================
// SHARE MANAGEMENT
// ============================================================

export async function createShoppingListShare(
  data: ShoppingListShareCreateInput
): Promise<ShoppingShareActionResult<{ shareToken: string; shareUrl: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingListShareCreateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  // Verify list belongs to household
  const listCheck = await queryOne<{ id: string }>(`
    SELECT id FROM shopping_lists
    WHERE id = $1 AND household_id = $2
  `, [validation.data.list_id, membership.household_id])

  if (!listCheck) {
    return { success: false, error: "Liste introuvable" }
  }

  // Check if there's already an active share for this list
  const existingShare = await queryOne<{ share_token: string }>(`
    SELECT share_token FROM shopping_list_shares
    WHERE list_id = $1 AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  `, [validation.data.list_id])

  if (existingShare) {
    // Return existing share
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "https://familyload.ca"
    return {
      success: true,
      data: {
        shareToken: existingShare.share_token,
        shareUrl: `${baseUrl}/shared/shopping/${existingShare.share_token}`,
      },
    }
  }

  // Generate unique token
  const shareToken = generateShareToken()

  // Calculate expiration
  let expiresAt: Date | null = null
  if (validation.data.expires_in_days) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validation.data.expires_in_days)
  }

  const shareData = {
    list_id: validation.data.list_id,
    share_token: shareToken,
    shared_by: userId,
    expires_at: expiresAt,
  }

  const share = await insert<{ id: string }>("shopping_list_shares", shareData)
  if (!share) {
    return { success: false, error: "Erreur lors de la creation du partage" }
  }

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "https://familyload.ca"

  return {
    success: true,
    data: {
      shareToken,
      shareUrl: `${baseUrl}/shared/shopping/${shareToken}`,
    },
  }
}

export async function getShoppingListShares(
  listId: string
): Promise<ShoppingListShare[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const shares = await query<ShoppingListShare>(`
    SELECT
      sls.id,
      sls.list_id,
      sls.share_token,
      sls.shared_by,
      u.name as shared_by_name,
      sls.shared_at::text,
      sls.expires_at::text,
      sls.is_active,
      sls.access_count,
      sls.last_accessed_at::text,
      sl.name as list_name
    FROM shopping_list_shares sls
    INNER JOIN shopping_lists sl ON sls.list_id = sl.id
    LEFT JOIN users u ON sls.shared_by = u.id
    WHERE sls.list_id = $1 AND sl.household_id = $2
    ORDER BY sls.shared_at DESC
  `, [listId, membership.household_id])

  return shares
}

export async function revokeShoppingListShare(
  data: ShoppingListShareRevokeInput
): Promise<ShoppingShareActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingListShareRevokeSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const result = await query(
    `UPDATE shopping_list_shares sls
     SET is_active = false
     FROM shopping_lists sl
     WHERE sls.id = $1
       AND sls.list_id = sl.id
       AND sl.household_id = $2
     RETURNING sls.id`,
    [validation.data.share_id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Partage introuvable ou non autorise" }
  }

  return { success: true }
}

// ============================================================
// PUBLIC ACCESS (for shared links - no auth required)
// ============================================================

export async function getSharedShoppingList(
  shareToken: string
): Promise<ShoppingShareActionResult<{ list: SharedShoppingList; items: SharedShoppingItem[] }>> {
  // Validate token format
  if (!shareToken || shareToken.length < 8 || shareToken.length > 32) {
    return { success: false, error: "Lien de partage invalide" }
  }

  // Get share info and verify it's active
  const share = await queryOne<{ list_id: string; is_active: boolean; expires_at: string | null }>(`
    SELECT list_id, is_active, expires_at::text
    FROM shopping_list_shares
    WHERE share_token = $1
  `, [shareToken])

  if (!share) {
    return { success: false, error: "Lien de partage introuvable" }
  }

  if (!share.is_active) {
    return { success: false, error: "Ce lien de partage a ete desactive" }
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { success: false, error: "Ce lien de partage a expire" }
  }

  // Get list info
  const list = await queryOne<SharedShoppingList>(`
    SELECT
      sl.id,
      sl.name,
      h.name as household_name,
      COUNT(si.id)::int as item_count,
      COUNT(si.id) FILTER (WHERE si.is_checked = true)::int as checked_count,
      sl.updated_at::text
    FROM shopping_lists sl
    LEFT JOIN households h ON sl.household_id = h.id
    LEFT JOIN shopping_items si ON sl.id = si.list_id
    WHERE sl.id = $1
    GROUP BY sl.id, h.name
  `, [share.list_id])

  if (!list) {
    return { success: false, error: "Liste introuvable" }
  }

  // Get items
  const items = await query<SharedShoppingItem>(`
    SELECT
      si.id,
      si.name,
      si.quantity::float,
      si.unit,
      si.category,
      si.is_checked,
      si.note,
      si.priority,
      COALESCE(si.sort_order, 0) as sort_order
    FROM shopping_items si
    WHERE si.list_id = $1
    ORDER BY
      si.is_checked ASC,
      COALESCE(si.sort_order, 0) ASC,
      si.priority DESC,
      si.created_at DESC
  `, [share.list_id])

  // Increment access count (fire and forget)
  query(`
    UPDATE shopping_list_shares
    SET access_count = access_count + 1, last_accessed_at = NOW()
    WHERE share_token = $1
  `, [shareToken]).catch(() => {
    // Ignore errors for analytics update
  })

  return {
    success: true,
    data: { list, items },
  }
}

export async function getActiveShareForList(
  listId: string
): Promise<ShoppingListShare | null> {
  const userId = await getUserId()
  if (!userId) return null

  const membership = await getHouseholdForUser(userId)
  if (!membership) return null

  const share = await queryOne<ShoppingListShare>(`
    SELECT
      sls.id,
      sls.list_id,
      sls.share_token,
      sls.shared_by,
      u.name as shared_by_name,
      sls.shared_at::text,
      sls.expires_at::text,
      sls.is_active,
      sls.access_count,
      sls.last_accessed_at::text,
      sl.name as list_name
    FROM shopping_list_shares sls
    INNER JOIN shopping_lists sl ON sls.list_id = sl.id
    LEFT JOIN users u ON sls.shared_by = u.id
    WHERE sls.list_id = $1
      AND sl.household_id = $2
      AND sls.is_active = true
      AND (sls.expires_at IS NULL OR sls.expires_at > NOW())
    ORDER BY sls.shared_at DESC
    LIMIT 1
  `, [listId, membership.household_id])

  return share
}
