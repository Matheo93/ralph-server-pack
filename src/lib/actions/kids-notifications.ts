'use server'

import { queryOne } from '@/lib/aws/database'
import { getUserId } from '@/lib/auth/actions'

export interface KidsPendingCounts {
  pendingProofs: number
  pendingRedemptions: number
  total: number
}

/**
 * Récupère le nombre de demandes enfants en attente pour le parent
 */
export async function getKidsPendingCounts(): Promise<KidsPendingCounts> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { pendingProofs: 0, pendingRedemptions: 0, total: 0 }
    }

    const result = await queryOne<{ proofs: string; redemptions: string }>(
      `SELECT
         COALESCE((
           SELECT COUNT(*)
           FROM task_proofs tp
           JOIN tasks t ON t.id = tp.task_id
           JOIN household_members hm ON hm.household_id = t.household_id
           WHERE hm.user_id = $1 AND tp.status = 'pending'
         ), 0) as proofs,
         COALESCE((
           SELECT COUNT(*)
           FROM reward_redemptions rr
           JOIN children c ON c.id = rr.child_id
           JOIN household_members hm ON hm.household_id = c.household_id
           WHERE hm.user_id = $1 AND rr.status = 'pending'
         ), 0) as redemptions`,
      [userId]
    )

    const pendingProofs = parseInt(result?.proofs ?? '0', 10)
    const pendingRedemptions = parseInt(result?.redemptions ?? '0', 10)

    return {
      pendingProofs,
      pendingRedemptions,
      total: pendingProofs + pendingRedemptions,
    }
  } catch (error) {
    console.error('Erreur getKidsPendingCounts:', error)
    return { pendingProofs: 0, pendingRedemptions: 0, total: 0 }
  }
}
