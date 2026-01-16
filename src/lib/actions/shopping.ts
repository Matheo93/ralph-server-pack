"use server"

import { revalidatePath } from "next/cache"
import {
  ShoppingListCreateSchema,
  ShoppingListUpdateSchema,
  ShoppingItemCreateSchema,
  ShoppingItemUpdateSchema,
  ShoppingItemCheckSchema,
  ShoppingItemsBulkCheckSchema,
  ShoppingItemQuickAddSchema,
  type ShoppingListCreateInput,
  type ShoppingListUpdateInput,
  type ShoppingItemCreateInput,
  type ShoppingItemUpdateInput,
  type ShoppingItemCheckInput,
  type ShoppingItemsBulkCheckInput,
  type ShoppingItemQuickAddInput,
  type ShoppingCategory,
} from "@/lib/validations/shopping"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"

// ============================================================
// TYPES
// ============================================================

export interface ShoppingList {
  id: string
  household_id: string
  name: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  item_count?: number
  checked_count?: number
}

export interface ShoppingItem {
  id: string
  list_id: string
  name: string
  quantity: number
  unit: string | null
  category: string
  is_checked: boolean
  checked_by: string | null
  checked_by_name: string | null
  checked_at: string | null
  added_by: string
  added_by_name: string | null
  note: string | null
  priority: number
  created_at: string
  updated_at: string
}

export interface ShoppingSuggestion {
  item_name: string
  category: string
  frequency: number
}

export interface ShoppingActionResult<T = unknown> {
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

// ============================================================
// SHOPPING LISTS
// ============================================================

export async function createShoppingList(
  data: ShoppingListCreateInput
): Promise<ShoppingActionResult<{ listId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingListCreateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const listData = {
    ...validation.data,
    household_id: membership.household_id,
    created_by: userId,
  }

  const list = await insert<{ id: string }>("shopping_lists", listData)
  if (!list) {
    return { success: false, error: "Erreur lors de la creation de la liste" }
  }

  revalidatePath("/shopping")

  return { success: true, data: { listId: list.id } }
}

export async function updateShoppingList(
  data: ShoppingListUpdateInput
): Promise<ShoppingActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingListUpdateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const { id, ...updateData } = validation.data
  const keys = Object.keys(updateData)
  if (keys.length === 0) {
    return { success: false, error: "Aucune modification fournie" }
  }

  const values = Object.values(updateData)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")

  const result = await query(
    `UPDATE shopping_lists
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
       AND household_id = $${keys.length + 2}
     RETURNING id`,
    [...values, id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Liste introuvable ou non autorisee" }
  }

  revalidatePath("/shopping")

  return { success: true }
}

export async function deleteShoppingList(
  listId: string
): Promise<ShoppingActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `DELETE FROM shopping_lists
     WHERE id = $1 AND household_id = $2
     RETURNING id`,
    [listId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Liste introuvable ou non autorisee" }
  }

  revalidatePath("/shopping")

  return { success: true }
}

export async function getShoppingLists(): Promise<ShoppingList[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const lists = await query<ShoppingList>(`
    SELECT
      sl.id,
      sl.household_id,
      sl.name,
      sl.is_active,
      sl.created_by,
      sl.created_at::text,
      sl.updated_at::text,
      COUNT(si.id)::int as item_count,
      COUNT(si.id) FILTER (WHERE si.is_checked = true)::int as checked_count
    FROM shopping_lists sl
    LEFT JOIN shopping_items si ON sl.id = si.list_id
    WHERE sl.household_id = $1
    GROUP BY sl.id
    ORDER BY sl.is_active DESC, sl.updated_at DESC
  `, [membership.household_id])

  return lists
}

export async function getActiveShoppingList(): Promise<ShoppingList | null> {
  const userId = await getUserId()
  if (!userId) return null

  const membership = await getHouseholdForUser(userId)
  if (!membership) return null

  const list = await queryOne<ShoppingList>(`
    SELECT
      sl.id,
      sl.household_id,
      sl.name,
      sl.is_active,
      sl.created_by,
      sl.created_at::text,
      sl.updated_at::text,
      COUNT(si.id)::int as item_count,
      COUNT(si.id) FILTER (WHERE si.is_checked = true)::int as checked_count
    FROM shopping_lists sl
    LEFT JOIN shopping_items si ON sl.id = si.list_id
    WHERE sl.household_id = $1 AND sl.is_active = true
    GROUP BY sl.id
    ORDER BY sl.updated_at DESC
    LIMIT 1
  `, [membership.household_id])

  return list
}

export async function getOrCreateActiveList(): Promise<ShoppingList | null> {
  const userId = await getUserId()
  if (!userId) return null

  const membership = await getHouseholdForUser(userId)
  if (!membership) return null

  // Try to get active list
  let list = await getActiveShoppingList()

  // If no active list, create one
  if (!list) {
    const result = await createShoppingList({ name: "Liste principale" })
    if (result.success && result.data) {
      list = await queryOne<ShoppingList>(`
        SELECT
          sl.id,
          sl.household_id,
          sl.name,
          sl.is_active,
          sl.created_by,
          sl.created_at::text,
          sl.updated_at::text,
          0 as item_count,
          0 as checked_count
        FROM shopping_lists sl
        WHERE sl.id = $1
      `, [result.data.listId])
    }
  }

  return list
}

// ============================================================
// SHOPPING ITEMS
// ============================================================

export async function addShoppingItem(
  data: ShoppingItemCreateInput
): Promise<ShoppingActionResult<{ itemId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingItemCreateSchema.safeParse(data)
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

  const itemData = {
    ...validation.data,
    added_by: userId,
  }

  const item = await insert<{ id: string }>("shopping_items", itemData)
  if (!item) {
    return { success: false, error: "Erreur lors de l'ajout de l'article" }
  }

  // Update shopping history for suggestions
  await query(`
    INSERT INTO shopping_history (household_id, item_name, category, frequency, last_purchased_at)
    VALUES ($1, $2, $3, 1, NOW())
    ON CONFLICT (household_id, LOWER(item_name))
    DO UPDATE SET
      frequency = shopping_history.frequency + 1,
      last_purchased_at = NOW(),
      category = COALESCE($3, shopping_history.category)
  `, [membership.household_id, validation.data.name, validation.data.category])

  revalidatePath("/shopping")

  return { success: true, data: { itemId: item.id } }
}

export async function quickAddShoppingItem(
  data: ShoppingItemQuickAddInput
): Promise<ShoppingActionResult<{ itemId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingItemQuickAddSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  // Check if item exists in history for category auto-fill
  const history = await queryOne<{ category: string }>(`
    SELECT category FROM shopping_history
    WHERE household_id = $1 AND LOWER(item_name) = LOWER($2)
  `, [membership.household_id, validation.data.name])

  const fullData: ShoppingItemCreateInput = {
    list_id: validation.data.list_id,
    name: validation.data.name,
    quantity: 1,
    category: (history?.category as ShoppingCategory) ?? "Autres",
    priority: 0,
  }

  return addShoppingItem(fullData)
}

export async function updateShoppingItem(
  data: ShoppingItemUpdateInput
): Promise<ShoppingActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingItemUpdateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const { id, ...updateData } = validation.data
  const keys = Object.keys(updateData)
  if (keys.length === 0) {
    return { success: false, error: "Aucune modification fournie" }
  }

  const values = Object.values(updateData)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")

  const result = await query(
    `UPDATE shopping_items si
     SET ${setClause}, updated_at = NOW()
     FROM shopping_lists sl
     WHERE si.id = $${keys.length + 1}
       AND si.list_id = sl.id
       AND sl.household_id = $${keys.length + 2}
     RETURNING si.id`,
    [...values, id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Article introuvable ou non autorise" }
  }

  revalidatePath("/shopping")

  return { success: true }
}

export async function checkShoppingItem(
  data: ShoppingItemCheckInput
): Promise<ShoppingActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingItemCheckSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const { id, is_checked } = validation.data

  const result = await query(
    `UPDATE shopping_items si
     SET
       is_checked = $1,
       checked_by = CASE WHEN $1 THEN $2 ELSE NULL END,
       checked_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
       updated_at = NOW()
     FROM shopping_lists sl
     WHERE si.id = $3
       AND si.list_id = sl.id
       AND sl.household_id = $4
     RETURNING si.id`,
    [is_checked, userId, id, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Article introuvable ou non autorise" }
  }

  revalidatePath("/shopping")

  return { success: true }
}

export async function bulkCheckShoppingItems(
  data: ShoppingItemsBulkCheckInput
): Promise<ShoppingActionResult<{ updatedCount: number }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const validation = ShoppingItemsBulkCheckSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Donnees invalides",
    }
  }

  const { item_ids, is_checked } = validation.data

  const result = await query(
    `UPDATE shopping_items si
     SET
       is_checked = $1,
       checked_by = CASE WHEN $1 THEN $2 ELSE NULL END,
       checked_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
       updated_at = NOW()
     FROM shopping_lists sl
     WHERE si.id = ANY($3::uuid[])
       AND si.list_id = sl.id
       AND sl.household_id = $4
     RETURNING si.id`,
    [is_checked, userId, item_ids, membership.household_id]
  )

  revalidatePath("/shopping")

  return { success: true, data: { updatedCount: result.length } }
}

export async function deleteShoppingItem(
  itemId: string
): Promise<ShoppingActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `DELETE FROM shopping_items si
     USING shopping_lists sl
     WHERE si.id = $1
       AND si.list_id = sl.id
       AND sl.household_id = $2
     RETURNING si.id`,
    [itemId, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Article introuvable ou non autorise" }
  }

  revalidatePath("/shopping")

  return { success: true }
}

export async function getShoppingItems(
  listId: string
): Promise<ShoppingItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const items = await query<ShoppingItem>(`
    SELECT
      si.id,
      si.list_id,
      si.name,
      si.quantity::float,
      si.unit,
      si.category,
      si.is_checked,
      si.checked_by,
      u_checked.name as checked_by_name,
      si.checked_at::text,
      si.added_by,
      u_added.name as added_by_name,
      si.note,
      si.priority,
      si.created_at::text,
      si.updated_at::text
    FROM shopping_items si
    INNER JOIN shopping_lists sl ON si.list_id = sl.id
    LEFT JOIN users u_checked ON si.checked_by = u_checked.id
    LEFT JOIN users u_added ON si.added_by = u_added.id
    WHERE si.list_id = $1 AND sl.household_id = $2
    ORDER BY
      si.is_checked ASC,
      si.priority DESC,
      si.category ASC,
      si.created_at DESC
  `, [listId, membership.household_id])

  return items
}

// ============================================================
// SUGGESTIONS
// ============================================================

export async function getShoppingSuggestions(
  limit: number = 10
): Promise<ShoppingSuggestion[]> {
  const userId = await getUserId()
  if (!userId) return []

  const membership = await getHouseholdForUser(userId)
  if (!membership) return []

  const suggestions = await query<ShoppingSuggestion>(`
    SELECT
      item_name,
      category,
      frequency::int
    FROM shopping_history
    WHERE household_id = $1
    ORDER BY frequency DESC, last_purchased_at DESC
    LIMIT $2
  `, [membership.household_id, limit])

  return suggestions
}

// ============================================================
// CLEAR CHECKED ITEMS
// ============================================================

export async function clearCheckedItems(
  listId: string
): Promise<ShoppingActionResult<{ deletedCount: number }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `DELETE FROM shopping_items si
     USING shopping_lists sl
     WHERE si.list_id = $1
       AND si.list_id = sl.id
       AND sl.household_id = $2
       AND si.is_checked = true
     RETURNING si.id`,
    [listId, membership.household_id]
  )

  revalidatePath("/shopping")

  return { success: true, data: { deletedCount: result.length } }
}

// ============================================================
// UNCHECK ALL ITEMS
// ============================================================

export async function uncheckAllItems(
  listId: string
): Promise<ShoppingActionResult<{ updatedCount: number }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecte" }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  const result = await query(
    `UPDATE shopping_items si
     SET
       is_checked = false,
       checked_by = NULL,
       checked_at = NULL,
       updated_at = NOW()
     FROM shopping_lists sl
     WHERE si.list_id = $1
       AND si.list_id = sl.id
       AND sl.household_id = $2
       AND si.is_checked = true
     RETURNING si.id`,
    [listId, membership.household_id]
  )

  revalidatePath("/shopping")

  return { success: true, data: { updatedCount: result.length } }
}

// ============================================================
// STATS
// ============================================================

export async function getShoppingStats(): Promise<{
  totalItems: number
  checkedItems: number
  urgentItems: number
  categoriesCount: number
}> {
  const userId = await getUserId()
  if (!userId) {
    return { totalItems: 0, checkedItems: 0, urgentItems: 0, categoriesCount: 0 }
  }

  const membership = await getHouseholdForUser(userId)
  if (!membership) {
    return { totalItems: 0, checkedItems: 0, urgentItems: 0, categoriesCount: 0 }
  }

  const stats = await queryOne<{
    total_items: string
    checked_items: string
    urgent_items: string
    categories_count: string
  }>(`
    SELECT
      COUNT(si.id)::text as total_items,
      COUNT(si.id) FILTER (WHERE si.is_checked = true)::text as checked_items,
      COUNT(si.id) FILTER (WHERE si.priority = 1 AND si.is_checked = false)::text as urgent_items,
      COUNT(DISTINCT si.category)::text as categories_count
    FROM shopping_items si
    INNER JOIN shopping_lists sl ON si.list_id = sl.id
    WHERE sl.household_id = $1 AND sl.is_active = true
  `, [membership.household_id])

  return {
    totalItems: parseInt(stats?.total_items ?? "0", 10),
    checkedItems: parseInt(stats?.checked_items ?? "0", 10),
    urgentItems: parseInt(stats?.urgent_items ?? "0", 10),
    categoriesCount: parseInt(stats?.categories_count ?? "0", 10),
  }
}
