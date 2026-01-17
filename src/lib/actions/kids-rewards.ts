'use server'

import { query, queryOne, execute, transaction } from '@/lib/aws/database'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { getUserId } from '@/lib/auth/actions'
import { setCurrentUser } from '@/lib/aws/database'
import {
  createRewardSchema,
  updateRewardSchema,
  type CreateRewardInput,
  type UpdateRewardInput,
} from '@/lib/validations/kids'
import type {
  Reward,
  RewardInsert,
  RewardRedemption,
  ChildAccount,
} from '@/types/database'

// ============================================================
// TYPES
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface RewardWithRedemptions extends Reward {
  redemptions_this_week: number
}

export interface RedemptionWithDetails extends RewardRedemption {
  child_name: string
  child_avatar: string | null
  reward_name: string
  reward_icon: string
}

// ============================================================
// PARENT ACTIONS - CRUD Récompenses
// ============================================================

/**
 * Crée une nouvelle récompense (parent)
 */
export async function createReward(
  input: CreateRewardInput
): Promise<ActionResult<Reward>> {
  try {
    const validated = createRewardSchema.parse(input)

    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Récupérer le household_id du parent
    const member = await queryOne<{ household_id: string }>(
      'SELECT household_id FROM household_members WHERE user_id = $1 AND is_active = true',
      [userId]
    )

    if (!member) {
      return { success: false, error: 'Foyer non trouvé' }
    }

    const [reward] = await query<Reward>(
      `INSERT INTO rewards (
        household_id, name, description, xp_cost, reward_type,
        icon, screen_time_minutes, money_amount, max_redemptions_per_week, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        member.household_id,
        validated.name,
        validated.description ?? null,
        validated.xpCost,
        validated.rewardType,
        validated.icon ?? '🎁',
        validated.screenTimeMinutes ?? null,
        validated.moneyAmount ?? null,
        validated.maxRedemptionsPerWeek ?? null,
        userId,
      ]
    )

    return { success: true, data: reward }
  } catch (error) {
    console.error('Erreur createReward:', error)
    return { success: false, error: 'Erreur lors de la création' }
  }
}

/**
 * Met à jour une récompense (parent)
 */
export async function updateReward(
  input: UpdateRewardInput
): Promise<ActionResult<Reward>> {
  try {
    const validated = updateRewardSchema.parse(input)

    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Vérifier que la récompense appartient au foyer du parent
    const reward = await queryOne<Reward>(
      `SELECT r.* FROM rewards r
       JOIN household_members hm ON hm.household_id = r.household_id
       WHERE r.id = $1 AND hm.user_id = $2`,
      [validated.id, userId]
    )

    if (!reward) {
      return { success: false, error: 'Récompense non trouvée' }
    }

    // Construire la requête de mise à jour
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (validated.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(validated.name)
    }
    if (validated.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(validated.description)
    }
    if (validated.xpCost !== undefined) {
      updates.push(`xp_cost = $${paramIndex++}`)
      values.push(validated.xpCost)
    }
    if (validated.rewardType !== undefined) {
      updates.push(`reward_type = $${paramIndex++}`)
      values.push(validated.rewardType)
    }
    if (validated.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`)
      values.push(validated.icon)
    }
    if (validated.screenTimeMinutes !== undefined) {
      updates.push(`screen_time_minutes = $${paramIndex++}`)
      values.push(validated.screenTimeMinutes)
    }
    if (validated.moneyAmount !== undefined) {
      updates.push(`money_amount = $${paramIndex++}`)
      values.push(validated.moneyAmount)
    }
    if (validated.maxRedemptionsPerWeek !== undefined) {
      updates.push(`max_redemptions_per_week = $${paramIndex++}`)
      values.push(validated.maxRedemptionsPerWeek)
    }

    if (updates.length === 0) {
      return { success: true, data: reward }
    }

    values.push(validated.id)
    const [updated] = await query<Reward>(
      `UPDATE rewards SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    return { success: true, data: updated }
  } catch (error) {
    console.error('Erreur updateReward:', error)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }
}

/**
 * Supprime une récompense (parent)
 */
export async function deleteReward(rewardId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Désactiver plutôt que supprimer (soft delete)
    const result = await execute(
      `UPDATE rewards SET is_active = false, updated_at = NOW()
       WHERE id = $1
       AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $2)`,
      [rewardId, userId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Récompense non trouvée' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur deleteReward:', error)
    return { success: false, error: 'Erreur lors de la suppression' }
  }
}

/**
 * Récupère les récompenses du foyer (parent)
 */
export async function getHouseholdRewards(): Promise<ActionResult<RewardWithRedemptions[]>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Calculer le début de la semaine (lundi)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(monday.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const rewards = await query<RewardWithRedemptions>(
      `SELECT r.*,
              COALESCE((
                SELECT COUNT(*)
                FROM reward_redemptions rr
                WHERE rr.reward_id = r.id
                  AND rr.requested_at >= $2
                  AND rr.status != 'rejected'
              ), 0) as redemptions_this_week
       FROM rewards r
       JOIN household_members hm ON hm.household_id = r.household_id
       WHERE hm.user_id = $1 AND r.is_active = true
       ORDER BY r.created_at DESC`,
      [userId, monday.toISOString()]
    )

    return { success: true, data: rewards }
  } catch (error) {
    console.error('Erreur getHouseholdRewards:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

// ============================================================
// CHILD ACTIONS - Boutique
// ============================================================

/**
 * Récupère les récompenses disponibles pour l'enfant
 */
export async function getAvailableRewards(): Promise<ActionResult<{
  rewards: RewardWithRedemptions[]
  currentXp: number
}>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer le household_id et les XP de l'enfant
    const child = await queryOne<{ household_id: string; current_xp: number }>(
      `SELECT c.household_id, COALESCE(ca.current_xp, 0) as current_xp
       FROM children c
       LEFT JOIN child_accounts ca ON ca.child_id = c.id
       WHERE c.id = $1`,
      [childId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Calculer le début de la semaine
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(monday.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const rewards = await query<RewardWithRedemptions>(
      `SELECT r.*,
              COALESCE((
                SELECT COUNT(*)
                FROM reward_redemptions rr
                WHERE rr.reward_id = r.id
                  AND rr.child_id = $2
                  AND rr.requested_at >= $3
                  AND rr.status != 'rejected'
              ), 0) as redemptions_this_week
       FROM rewards r
       WHERE r.household_id = $1 AND r.is_active = true
       ORDER BY r.xp_cost ASC`,
      [child.household_id, childId, monday.toISOString()]
    )

    return { success: true, data: { rewards, currentXp: child.current_xp } }
  } catch (error) {
    console.error('Erreur getAvailableRewards:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Échange une récompense (enfant)
 */
export async function redeemReward(rewardId: string): Promise<ActionResult<{
  redemption: RewardRedemption
  remainingXp: number
}>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer la récompense et le compte enfant
    const [reward, account] = await Promise.all([
      queryOne<Reward>(
        `SELECT r.* FROM rewards r
         JOIN children c ON c.household_id = r.household_id
         WHERE r.id = $1 AND c.id = $2 AND r.is_active = true`,
        [rewardId, childId]
      ),
      queryOne<ChildAccount>(
        'SELECT * FROM child_accounts WHERE child_id = $1',
        [childId]
      ),
    ])

    if (!reward) {
      return { success: false, error: 'Récompense non trouvée' }
    }

    if (!account) {
      return { success: false, error: 'Compte non trouvé' }
    }

    // Vérifier les XP suffisants
    if (account.current_xp < reward.xp_cost) {
      return { success: false, error: 'XP insuffisants' }
    }

    // Vérifier la limite hebdomadaire
    if (reward.max_redemptions_per_week !== null) {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(monday.getDate() + mondayOffset)
      monday.setHours(0, 0, 0, 0)

      const redemptionsThisWeek = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM reward_redemptions
         WHERE reward_id = $1 AND child_id = $2
         AND requested_at >= $3 AND status != 'rejected'`,
        [rewardId, childId, monday.toISOString()]
      )

      if (parseInt(redemptionsThisWeek?.count ?? '0', 10) >= reward.max_redemptions_per_week) {
        return { success: false, error: 'Limite hebdomadaire atteinte' }
      }
    }

    // Créer la demande et débiter les XP
    let redemption: RewardRedemption | undefined

    await transaction(async () => {
      // Créer la demande de récompense
      const [newRedemption] = await query<RewardRedemption>(
        `INSERT INTO reward_redemptions (reward_id, child_id, reward_snapshot, xp_spent)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          rewardId,
          childId,
          JSON.stringify({
            name: reward.name,
            description: reward.description,
            icon: reward.icon,
            reward_type: reward.reward_type,
            screen_time_minutes: reward.screen_time_minutes,
            money_amount: reward.money_amount,
          }),
          reward.xp_cost,
        ]
      )
      redemption = newRedemption

      // Débiter les XP
      await execute(
        'UPDATE child_accounts SET current_xp = current_xp - $1 WHERE child_id = $2',
        [reward.xp_cost, childId]
      )

      // Enregistrer la transaction XP
      await execute(
        `INSERT INTO xp_transactions (child_id, amount, reason)
         VALUES ($1, $2, 'reward_spent')`,
        [childId, -reward.xp_cost]
      )
    })

    const newXp = account.current_xp - reward.xp_cost

    return {
      success: true,
      data: { redemption: redemption!, remainingXp: newXp },
    }
  } catch (error) {
    console.error('Erreur redeemReward:', error)
    return { success: false, error: 'Erreur lors de l\'échange' }
  }
}

// ============================================================
// PARENT ACTIONS - Validation
// ============================================================

/**
 * Récupère les demandes de récompenses en attente (parent)
 */
export async function getPendingRedemptions(): Promise<ActionResult<RedemptionWithDetails[]>> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    const redemptions = await query<RedemptionWithDetails>(
      `SELECT rr.*,
              c.first_name as child_name,
              c.avatar_url as child_avatar,
              (rr.reward_snapshot->>'name')::text as reward_name,
              (rr.reward_snapshot->>'icon')::text as reward_icon
       FROM reward_redemptions rr
       JOIN children c ON c.id = rr.child_id
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE hm.user_id = $1 AND rr.status = 'pending'
       ORDER BY rr.requested_at DESC`,
      [userId]
    )

    return { success: true, data: redemptions }
  } catch (error) {
    console.error('Erreur getPendingRedemptions:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Approuve une demande de récompense (parent)
 */
export async function approveRedemption(redemptionId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    const result = await execute(
      `UPDATE reward_redemptions rr
       SET status = 'approved', validated_by = $1, validated_at = NOW()
       FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE rr.id = $2 AND rr.child_id = c.id AND hm.user_id = $1 AND rr.status = 'pending'`,
      [userId, redemptionId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Demande non trouvée' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur approveRedemption:', error)
    return { success: false, error: 'Erreur lors de l\'approbation' }
  }
}

/**
 * Marque une récompense comme livrée (parent)
 */
export async function deliverRedemption(redemptionId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    const result = await execute(
      `UPDATE reward_redemptions rr
       SET status = 'delivered', delivered_at = NOW()
       FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE rr.id = $1 AND rr.child_id = c.id AND hm.user_id = $2
       AND rr.status IN ('pending', 'approved')`,
      [redemptionId, userId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Demande non trouvée' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur deliverRedemption:', error)
    return { success: false, error: 'Erreur lors de la livraison' }
  }
}

/**
 * Rejette une demande et rembourse les XP (parent)
 */
export async function rejectRedemption(
  redemptionId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Récupérer la demande
    const redemption = await queryOne<RewardRedemption & { household_id: string }>(
      `SELECT rr.*, c.household_id
       FROM reward_redemptions rr
       JOIN children c ON c.id = rr.child_id
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE rr.id = $1 AND hm.user_id = $2 AND rr.status = 'pending'`,
      [redemptionId, userId]
    )

    if (!redemption) {
      return { success: false, error: 'Demande non trouvée' }
    }

    await transaction(async () => {
      // Rejeter la demande
      await execute(
        `UPDATE reward_redemptions
         SET status = 'rejected', validated_by = $1, validated_at = NOW(), rejection_reason = $2
         WHERE id = $3`,
        [userId, reason, redemptionId]
      )

      // Rembourser les XP
      await execute(
        'UPDATE child_accounts SET current_xp = current_xp + $1 WHERE child_id = $2',
        [redemption.xp_spent, redemption.child_id]
      )

      // Enregistrer le remboursement
      await execute(
        `INSERT INTO xp_transactions (child_id, amount, reason)
         VALUES ($1, $2, 'reward_refund')`,
        [redemption.child_id, redemption.xp_spent]
      )
    })

    return { success: true }
  } catch (error) {
    console.error('Erreur rejectRedemption:', error)
    return { success: false, error: 'Erreur lors du rejet' }
  }
}

/**
 * Récupère les échanges récents d'un enfant (pour le profil)
 */
export async function getChildRedemptions(): Promise<ActionResult<RedemptionWithDetails[]>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const redemptions = await query<RedemptionWithDetails>(
      `SELECT rr.*,
              '' as child_name,
              NULL as child_avatar,
              (rr.reward_snapshot->>'name')::text as reward_name,
              (rr.reward_snapshot->>'icon')::text as reward_icon
       FROM reward_redemptions rr
       WHERE rr.child_id = $1
       ORDER BY rr.requested_at DESC
       LIMIT 10`,
      [session.childId]
    )

    return { success: true, data: redemptions }
  } catch (error) {
    console.error('Erreur getChildRedemptions:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}
