'use server'

import { query, queryOne, execute } from '@/lib/aws/database'
import { getKidsSession } from '@/lib/actions/kids-auth'
import type {
  Badge,
  ChildBadge,
  XpLevel,
  ChildAccount,
  Child,
  LeaderboardEntry,
} from '@/types/database'

// ============================================================
// TYPES
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface BadgeWithStatus extends Badge {
  unlocked: boolean
  unlocked_at: string | null
  seen: boolean
}

export interface BadgesPageData {
  badges: BadgeWithStatus[]
  totalXpFromBadges: number
  unlockedCount: number
}

// ============================================================
// SERVER ACTIONS
// ============================================================

/**
 * Récupère tous les badges avec leur statut pour l'enfant connecté
 */
export async function getBadgesForChild(): Promise<ActionResult<BadgesPageData>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer tous les badges actifs avec le statut pour cet enfant
    const badges = await query<BadgeWithStatus>(
      `SELECT b.*,
              CASE WHEN cb.id IS NOT NULL THEN true ELSE false END as unlocked,
              cb.unlocked_at,
              CASE WHEN cb.seen_at IS NOT NULL THEN true ELSE false END as seen
       FROM badges b
       LEFT JOIN child_badges cb ON cb.badge_id = b.id AND cb.child_id = $1
       WHERE b.is_active = true
       ORDER BY b.sort_order, b.name`,
      [childId]
    )

    // Calculer les stats
    const unlockedBadges = badges.filter(b => b.unlocked)
    const totalXpFromBadges = unlockedBadges.reduce((sum, b) => sum + b.xp_reward, 0)

    return {
      success: true,
      data: {
        badges,
        totalXpFromBadges,
        unlockedCount: unlockedBadges.length,
      },
    }
  } catch (error) {
    console.error('Erreur getBadgesForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère le leaderboard de la fratrie
 */
export async function getLeaderboard(): Promise<ActionResult<LeaderboardEntry[]>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer le household_id de l'enfant
    const child = await queryOne<{ household_id: string }>(
      'SELECT household_id FROM children WHERE id = $1',
      [childId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Récupérer tous les enfants du foyer avec leurs stats
    const leaderboard = await query<LeaderboardEntry>(
      `SELECT
         c.id as child_id,
         c.first_name,
         c.avatar_url,
         COALESCE(ca.current_xp, 0) as current_xp,
         COALESCE(ca.current_level, 1) as current_level,
         COALESCE(xl.name, 'Débutant') as level_name,
         COALESCE(xl.icon, '🌱') as level_icon,
         COALESCE(ca.total_tasks_completed, 0) as total_tasks_completed,
         COALESCE(ca.streak_current, 0) as streak_current,
         ROW_NUMBER() OVER (ORDER BY COALESCE(ca.current_xp, 0) DESC) as rank
       FROM children c
       LEFT JOIN child_accounts ca ON ca.child_id = c.id
       LEFT JOIN xp_levels xl ON xl.level = ca.current_level
       WHERE c.household_id = $1 AND c.is_active = true
       ORDER BY COALESCE(ca.current_xp, 0) DESC`,
      [child.household_id]
    )

    return { success: true, data: leaderboard }
  } catch (error) {
    console.error('Erreur getLeaderboard:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère le profil complet de l'enfant
 */
export async function getChildProfile(): Promise<ActionResult<{
  child: Pick<Child, 'id' | 'first_name' | 'avatar_url' | 'birthdate'>
  account: ChildAccount
  level: XpLevel
  nextLevel: XpLevel | null
  xpProgress: number
  badgesUnlocked: number
  badgesTotal: number
  rank: number
  totalSiblings: number
}>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer l'enfant
    const child = await queryOne<Pick<Child, 'id' | 'first_name' | 'avatar_url' | 'birthdate' | 'household_id'>>(
      'SELECT id, first_name, avatar_url, birthdate, household_id FROM children WHERE id = $1 AND is_active = true',
      [childId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Récupérer le compte
    const account = await queryOne<ChildAccount>(
      'SELECT * FROM child_accounts WHERE child_id = $1',
      [childId]
    )

    if (!account) {
      return { success: false, error: 'Compte non trouvé' }
    }

    // Récupérer le niveau actuel
    const level = await queryOne<XpLevel>(
      'SELECT * FROM xp_levels WHERE level = $1',
      [account.current_level]
    )

    // Récupérer le niveau suivant
    const nextLevel = await queryOne<XpLevel>(
      'SELECT * FROM xp_levels WHERE level = $1',
      [account.current_level + 1]
    )

    // Calculer la progression XP
    const currentLevelXp = level?.xp_required ?? 0
    const nextLevelXp = nextLevel?.xp_required ?? account.current_xp
    const xpProgress = nextLevel
      ? Math.round(((account.current_xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
      : 100

    // Compter les badges
    const badgesResult = await queryOne<{ unlocked: string; total: string }>(
      `SELECT
         (SELECT COUNT(*) FROM child_badges WHERE child_id = $1) as unlocked,
         (SELECT COUNT(*) FROM badges WHERE is_active = true) as total`,
      [childId]
    )

    // Calculer le rang
    const rankResult = await queryOne<{ rank: string; total: string }>(
      `WITH ranked AS (
         SELECT child_id, ROW_NUMBER() OVER (ORDER BY current_xp DESC) as rank
         FROM child_accounts ca
         JOIN children c ON c.id = ca.child_id
         WHERE c.household_id = $1 AND c.is_active = true
       )
       SELECT
         rank,
         (SELECT COUNT(*) FROM ranked) as total
       FROM ranked
       WHERE child_id = $2`,
      [child.household_id, childId]
    )

    return {
      success: true,
      data: {
        child: { id: child.id, first_name: child.first_name, avatar_url: child.avatar_url, birthdate: child.birthdate },
        account,
        level: level ?? { level: 1, name: 'Débutant', xp_required: 0, icon: '🌱' },
        nextLevel: nextLevel ?? null,
        xpProgress,
        badgesUnlocked: parseInt(badgesResult?.unlocked ?? '0', 10),
        badgesTotal: parseInt(badgesResult?.total ?? '0', 10),
        rank: parseInt(rankResult?.rank ?? '1', 10),
        totalSiblings: parseInt(rankResult?.total ?? '1', 10),
      },
    }
  } catch (error) {
    console.error('Erreur getChildProfile:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère l'historique XP récent
 */
export async function getXpHistory(
  limit: number = 20
): Promise<ActionResult<Array<{
  id: string
  amount: number
  reason: string
  task_title: string | null
  badge_name: string | null
  created_at: string
}>>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    const history = await query<{
      id: string
      amount: number
      reason: string
      task_title: string | null
      badge_name: string | null
      created_at: string
    }>(
      `SELECT
         xt.id,
         xt.amount,
         xt.reason,
         t.title as task_title,
         b.name as badge_name,
         xt.created_at
       FROM xp_transactions xt
       LEFT JOIN tasks t ON t.id = xt.task_id
       LEFT JOIN badges b ON b.id = xt.badge_id
       WHERE xt.child_id = $1
       ORDER BY xt.created_at DESC
       LIMIT $2`,
      [childId, limit]
    )

    return { success: true, data: history }
  } catch (error) {
    console.error('Erreur getXpHistory:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}
