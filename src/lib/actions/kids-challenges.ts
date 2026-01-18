'use server'

import { query, queryOne } from '@/lib/aws/database'
import { getKidsSession } from '@/lib/actions/kids-auth'
import type {
  Challenge,
  ChallengeForChild,
  CompletedChallenge,
} from '@/types/database'

// ============================================================
// TYPES
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================
// SERVER ACTIONS - KIDS CHALLENGES
// ============================================================

/**
 * Récupère les défis actifs de l'enfant connecté
 */
export async function getActiveChallengesForChild(): Promise<ActionResult<ChallengeForChild[]>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Get active challenges where this child is included
    const challenges = await query<Challenge & {
      current_count: number
      is_completed: boolean
      completed_at: string | null
      progress_id: string
    }>(
      `SELECT
         ch.*,
         cp.id as progress_id,
         COALESCE(cp.current_count, 0) as current_count,
         COALESCE(cp.is_completed, false) as is_completed,
         cp.completed_at
       FROM challenges ch
       LEFT JOIN challenge_progress cp ON cp.challenge_id = ch.id AND cp.child_id = $1
       WHERE $1 = ANY(ch.child_ids)
         AND ch.is_active = true
         AND (ch.expires_at IS NULL OR ch.expires_at > NOW())
         AND (cp.is_completed IS NULL OR cp.is_completed = false)
       ORDER BY ch.created_at DESC`,
      [childId]
    )

    const result: ChallengeForChild[] = challenges.map(ch => {
      const progressPercentage = Math.round((ch.current_count / ch.required_count) * 100)
      const remainingCount = Math.max(0, ch.required_count - ch.current_count)

      let daysRemaining: number | null = null
      if (ch.expires_at) {
        const now = new Date()
        const expDate = new Date(ch.expires_at)
        const diffMs = expDate.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      }

      return {
        ...ch,
        progress: {
          id: ch.progress_id,
          challenge_id: ch.id,
          child_id: childId,
          current_count: ch.current_count,
          is_completed: ch.is_completed,
          completed_at: ch.completed_at,
          xp_awarded: null,
          badge_awarded_id: null,
          last_task_id: null,
          last_progress_at: null,
          created_at: '',
          updated_at: '',
        },
        progressPercentage,
        remainingCount,
        daysRemaining,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Erreur getActiveChallengesForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère les défis complétés de l'enfant connecté
 */
export async function getCompletedChallengesForChild(
  limit: number = 10
): Promise<ActionResult<CompletedChallenge[]>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    const challenges = await query<Challenge & {
      progress_id: string
      current_count: number
      is_completed: boolean
      completed_at: string
      xp_awarded: number
      badge_awarded_id: string | null
      badge_name: string | null
      badge_icon: string | null
      badge_description: string | null
    }>(
      `SELECT
         ch.*,
         cp.id as progress_id,
         cp.current_count,
         cp.is_completed,
         cp.completed_at,
         cp.xp_awarded,
         cp.badge_awarded_id,
         b.name as badge_name,
         b.icon as badge_icon,
         b.description as badge_description
       FROM challenges ch
       JOIN challenge_progress cp ON cp.challenge_id = ch.id AND cp.child_id = $1
       LEFT JOIN badges b ON b.id = cp.badge_awarded_id
       WHERE $1 = ANY(ch.child_ids)
         AND cp.is_completed = true
       ORDER BY cp.completed_at DESC
       LIMIT $2`,
      [childId, limit]
    )

    const result: CompletedChallenge[] = challenges.map(ch => ({
      ...ch,
      progress: {
        id: ch.progress_id,
        challenge_id: ch.id,
        child_id: childId,
        current_count: ch.current_count,
        is_completed: ch.is_completed,
        completed_at: ch.completed_at,
        xp_awarded: ch.xp_awarded,
        badge_awarded_id: ch.badge_awarded_id,
        last_task_id: null,
        last_progress_at: null,
        created_at: '',
        updated_at: '',
      },
      badge: ch.badge_awarded_id ? {
        id: ch.badge_awarded_id,
        slug: '',
        name: ch.badge_name ?? '',
        description: ch.badge_description,
        icon: ch.badge_icon,
        condition_type: 'special' as const,
        condition_value: 0,
        xp_reward: 0,
        is_active: true,
        sort_order: 0,
        created_at: '',
      } : null,
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('Erreur getCompletedChallengesForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère le détail d'un défi pour l'enfant
 */
export async function getChallengeDetailForChild(
  challengeId: string
): Promise<ActionResult<ChallengeForChild | null>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    const challenge = await queryOne<Challenge & {
      progress_id: string
      current_count: number
      is_completed: boolean
      completed_at: string | null
    }>(
      `SELECT
         ch.*,
         cp.id as progress_id,
         COALESCE(cp.current_count, 0) as current_count,
         COALESCE(cp.is_completed, false) as is_completed,
         cp.completed_at
       FROM challenges ch
       LEFT JOIN challenge_progress cp ON cp.challenge_id = ch.id AND cp.child_id = $1
       WHERE ch.id = $2 AND $1 = ANY(ch.child_ids)`,
      [childId, challengeId]
    )

    if (!challenge) {
      return { success: true, data: null }
    }

    const progressPercentage = Math.round((challenge.current_count / challenge.required_count) * 100)
    const remainingCount = Math.max(0, challenge.required_count - challenge.current_count)

    let daysRemaining: number | null = null
    if (challenge.expires_at) {
      const now = new Date()
      const expDate = new Date(challenge.expires_at)
      const diffMs = expDate.getTime() - now.getTime()
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    return {
      success: true,
      data: {
        ...challenge,
        progress: {
          id: challenge.progress_id,
          challenge_id: challenge.id,
          child_id: childId,
          current_count: challenge.current_count,
          is_completed: challenge.is_completed,
          completed_at: challenge.completed_at,
          xp_awarded: null,
          badge_awarded_id: null,
          last_task_id: null,
          last_progress_at: null,
          created_at: '',
          updated_at: '',
        },
        progressPercentage,
        remainingCount,
        daysRemaining,
      },
    }
  } catch (error) {
    console.error('Erreur getChallengeDetailForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère l'historique de progression d'un défi
 */
export async function getChallengeProgressHistory(
  challengeId: string
): Promise<ActionResult<Array<{
  id: string
  task_title: string | null
  count_added: number
  created_at: string
}>>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Verify child has access to this challenge
    const progress = await queryOne<{ id: string }>(
      `SELECT cp.id FROM challenge_progress cp
       JOIN challenges ch ON ch.id = cp.challenge_id
       WHERE cp.challenge_id = $1 AND cp.child_id = $2 AND $2 = ANY(ch.child_ids)`,
      [challengeId, childId]
    )

    if (!progress) {
      return { success: false, error: 'Accès refusé' }
    }

    const history = await query<{
      id: string
      task_title: string | null
      count_added: number
      created_at: string
    }>(
      `SELECT id, task_title, count_added, created_at
       FROM challenge_progress_log
       WHERE challenge_progress_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [progress.id]
    )

    return { success: true, data: history }
  } catch (error) {
    console.error('Erreur getChallengeProgressHistory:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère les défis de cette semaine (expire dans les 7 prochains jours ou créé cette semaine)
 */
export async function getThisWeekChallengesForChild(): Promise<ActionResult<ChallengeForChild[]>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Get challenges that either:
    // 1. Expire within the next 7 days
    // 2. Started this week (for challenges without expiry)
    const challenges = await query<Challenge & {
      current_count: number
      is_completed: boolean
      completed_at: string | null
      progress_id: string
    }>(
      `SELECT
         ch.*,
         cp.id as progress_id,
         COALESCE(cp.current_count, 0) as current_count,
         COALESCE(cp.is_completed, false) as is_completed,
         cp.completed_at
       FROM challenges ch
       LEFT JOIN challenge_progress cp ON cp.challenge_id = ch.id AND cp.child_id = $1
       WHERE $1 = ANY(ch.child_ids)
         AND ch.is_active = true
         AND (cp.is_completed IS NULL OR cp.is_completed = false)
         AND (
           (ch.expires_at IS NOT NULL AND ch.expires_at > NOW() AND ch.expires_at <= NOW() + INTERVAL '7 days')
           OR (ch.expires_at IS NULL AND ch.started_at >= DATE_TRUNC('week', CURRENT_DATE))
           OR (ch.timeframe_days IS NOT NULL AND ch.timeframe_days <= 7)
         )
       ORDER BY
         CASE WHEN ch.expires_at IS NOT NULL THEN ch.expires_at ELSE ch.started_at + INTERVAL '7 days' END ASC`,
      [childId]
    )

    const result: ChallengeForChild[] = challenges.map(ch => {
      const progressPercentage = Math.round((ch.current_count / ch.required_count) * 100)
      const remainingCount = Math.max(0, ch.required_count - ch.current_count)

      let daysRemaining: number | null = null
      if (ch.expires_at) {
        const now = new Date()
        const expDate = new Date(ch.expires_at)
        const diffMs = expDate.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      } else if (ch.timeframe_days) {
        const startDate = new Date(ch.started_at)
        const expDate = new Date(startDate.getTime() + ch.timeframe_days * 24 * 60 * 60 * 1000)
        const now = new Date()
        const diffMs = expDate.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      }

      return {
        ...ch,
        progress: {
          id: ch.progress_id,
          challenge_id: ch.id,
          child_id: childId,
          current_count: ch.current_count,
          is_completed: ch.is_completed,
          completed_at: ch.completed_at,
          xp_awarded: null,
          badge_awarded_id: null,
          last_task_id: null,
          last_progress_at: null,
          created_at: '',
          updated_at: '',
        },
        progressPercentage,
        remainingCount,
        daysRemaining,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Erreur getThisWeekChallengesForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Stats des défis pour le dashboard enfant
 */
export async function getChallengeStatsForChild(): Promise<ActionResult<{
  activeCount: number
  completedCount: number
  totalXpEarned: number
  currentStreak: number
}>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    const stats = await queryOne<{
      active_count: string
      completed_count: string
      total_xp_earned: string
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE cp.is_completed = false AND ch.is_active = true) as active_count,
         COUNT(*) FILTER (WHERE cp.is_completed = true) as completed_count,
         COALESCE(SUM(cp.xp_awarded) FILTER (WHERE cp.is_completed = true), 0) as total_xp_earned
       FROM challenge_progress cp
       JOIN challenges ch ON ch.id = cp.challenge_id
       WHERE cp.child_id = $1`,
      [childId]
    )

    // Calculate current streak (consecutive completed challenges in last 7 days)
    const recentCompletions = await query<{ completed_at: string }>(
      `SELECT completed_at::date as completed_at
       FROM challenge_progress
       WHERE child_id = $1 AND is_completed = true
       AND completed_at > NOW() - INTERVAL '7 days'
       GROUP BY completed_at::date
       ORDER BY completed_at DESC`,
      [childId]
    )

    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]

      if (recentCompletions.some(c => c.completed_at === dateStr)) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }

    return {
      success: true,
      data: {
        activeCount: parseInt(stats?.active_count ?? '0', 10),
        completedCount: parseInt(stats?.completed_count ?? '0', 10),
        totalXpEarned: parseInt(stats?.total_xp_earned ?? '0', 10),
        currentStreak,
      },
    }
  } catch (error) {
    console.error('Erreur getChallengeStatsForChild:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}
