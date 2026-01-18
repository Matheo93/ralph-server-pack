'use server'

import { query, queryOne, execute, transaction } from '@/lib/aws/database'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { calculateTaskXp, calculateStreakBonus, isEarlyBird, isNightOwl, isWeekend } from '@/lib/validations/kids'
import type {
  Task,
  Child,
  ChildAccount,
  XpLevel,
  TaskProof,
  Badge,
  ChildBadge,
} from '@/types/database'

// ============================================================
// TYPES
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface KidsTask extends Task {
  category_name?: string
  category_icon?: string
  xp_value: number
  proof_status?: 'pending' | 'approved' | 'rejected' | null
}

export interface KidsDashboardData {
  child: Pick<Child, 'id' | 'first_name' | 'avatar_url'>
  account: ChildAccount
  level: XpLevel
  nextLevel: XpLevel | null
  todayTasks: KidsTask[]
  completedToday: number
  pendingProofs: number
  newBadges: Array<Badge & { unlocked_at: string }>
}

// ============================================================
// HELPERS
// ============================================================

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

// ============================================================
// SERVER ACTIONS
// ============================================================

/**
 * Récupère les données du dashboard enfant
 */
export async function getKidsDashboard(): Promise<ActionResult<KidsDashboardData>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Récupérer l'enfant
    const child = await queryOne<Pick<Child, 'id' | 'first_name' | 'avatar_url' | 'household_id'>>(
      'SELECT id, first_name, avatar_url, household_id FROM children WHERE id = $1 AND is_active = true',
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

    // Récupérer les tâches du jour assignées à l'enfant
    const today = getTodayDateString()
    const todayTasks = await query<KidsTask>(
      `SELECT t.*,
              tc.name_fr as category_name,
              tc.icon as category_icon,
              t.load_weight * 5 as xp_value,
              tp.status as proof_status
       FROM tasks t
       LEFT JOIN task_categories tc ON tc.id = t.category_id
       LEFT JOIN task_proofs tp ON tp.task_id = t.id AND tp.child_id = $1
       WHERE t.child_id = $1
         AND t.household_id = $2
         AND t.status IN ('pending', 'done')
         AND (t.deadline IS NULL OR t.deadline >= $3)
       ORDER BY
         CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
         t.priority DESC,
         t.deadline ASC NULLS LAST`,
      [childId, child.household_id, today]
    )

    // Compter les tâches complétées aujourd'hui
    const completedTodayResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM task_proofs
       WHERE child_id = $1 AND status = 'approved'
       AND DATE(created_at) = $2`,
      [childId, today]
    )

    // Compter les preuves en attente
    const pendingProofsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM task_proofs
       WHERE child_id = $1 AND status = 'pending'`,
      [childId]
    )

    // Récupérer les nouveaux badges non vus
    const newBadges = await query<Badge & { unlocked_at: string }>(
      `SELECT b.*, cb.unlocked_at
       FROM child_badges cb
       JOIN badges b ON b.id = cb.badge_id
       WHERE cb.child_id = $1 AND cb.seen_at IS NULL
       ORDER BY cb.unlocked_at DESC`,
      [childId]
    )

    return {
      success: true,
      data: {
        child: { id: child.id, first_name: child.first_name, avatar_url: child.avatar_url },
        account,
        level: level ?? { level: 1, name: 'Débutant', xp_required: 0, icon: '🌱' },
        nextLevel: nextLevel ?? null,
        todayTasks,
        completedToday: parseInt(completedTodayResult?.count ?? '0', 10),
        pendingProofs: parseInt(pendingProofsResult?.count ?? '0', 10),
        newBadges,
      },
    }
  } catch (error) {
    console.error('Erreur getKidsDashboard:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Soumet une preuve photo pour une tâche
 */
export async function submitTaskProof(
  taskId: string,
  photoUrl: string
): Promise<ActionResult<{ xpAwarded: number; newBadges: Badge[] }>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    const { childId } = session

    // Vérifier que la tâche existe et est assignée à l'enfant
    const task = await queryOne<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND child_id = $2 AND status = \'pending\'',
      [taskId, childId]
    )

    if (!task) {
      return { success: false, error: 'Tâche non trouvée ou déjà complétée' }
    }

    // Vérifier qu'une preuve n'existe pas déjà
    const existingProof = await queryOne<TaskProof>(
      'SELECT * FROM task_proofs WHERE task_id = $1 AND child_id = $2',
      [taskId, childId]
    )

    if (existingProof) {
      return { success: false, error: 'Une preuve existe déjà pour cette tâche' }
    }

    // Calculer l'XP de base
    const xpValue = calculateTaskXp(task.load_weight)

    // Créer la preuve photo
    await execute(
      `INSERT INTO task_proofs (task_id, child_id, photo_url, xp_awarded)
       VALUES ($1, $2, $3, $4)`,
      [taskId, childId, photoUrl, xpValue]
    )

    return {
      success: true,
      data: { xpAwarded: xpValue, newBadges: [] },
    }
  } catch (error) {
    console.error('Erreur submitTaskProof:', error)
    return { success: false, error: 'Erreur lors de l\'envoi de la preuve' }
  }
}

/**
 * Approuve une preuve photo (appelé par parent)
 * Attribue les XP et vérifie les badges
 */
export async function approveTaskProof(
  proofId: string,
  parentUserId: string
): Promise<ActionResult<{ xpAwarded: number; newBadges: Badge[]; levelUp: boolean }>> {
  try {
    // Récupérer la preuve
    const proof = await queryOne<TaskProof & { load_weight: number }>(
      `SELECT tp.*, t.load_weight FROM task_proofs tp
       JOIN tasks t ON t.id = tp.task_id
       WHERE tp.id = $1 AND tp.status = 'pending'`,
      [proofId]
    )

    if (!proof) {
      return { success: false, error: 'Preuve non trouvée' }
    }

    const childId = proof.child_id
    const now = new Date()

    // Récupérer le compte enfant
    const account = await queryOne<ChildAccount>(
      'SELECT * FROM child_accounts WHERE child_id = $1',
      [childId]
    )

    if (!account) {
      return { success: false, error: 'Compte non trouvé' }
    }

    // Calculer XP total avec bonus
    let totalXp = proof.xp_awarded ?? calculateTaskXp(proof.load_weight)
    const streakBonus = calculateStreakBonus(account.streak_current)
    let specialBonuses = 0

    // Bonus early bird
    if (isEarlyBird(now)) {
      specialBonuses += 5
    }
    // Bonus night owl
    if (isNightOwl(now)) {
      specialBonuses += 5
    }
    // Bonus weekend
    if (isWeekend(now)) {
      specialBonuses += 10
    }

    totalXp += streakBonus + specialBonuses
    const newXp = account.current_xp + totalXp
    const newTotalTasks = account.total_tasks_completed + 1

    // Calculer le nouveau niveau
    const newLevel = await queryOne<XpLevel>(
      `SELECT * FROM xp_levels WHERE xp_required <= $1 ORDER BY level DESC LIMIT 1`,
      [newXp]
    )
    const levelUp = newLevel && newLevel.level > account.current_level

    // Mettre à jour le streak si dernière activité pas aujourd'hui
    const today = getTodayDateString()
    const lastActivityDate = account.last_activity_at
      ? new Date(account.last_activity_at).toISOString().split('T')[0]
      : null

    let newStreak = account.streak_current
    let newBestStreak = account.streak_best

    if (lastActivityDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastActivityDate === yesterdayStr) {
        // Continuité du streak
        newStreak = account.streak_current + 1
      } else {
        // Reset du streak
        newStreak = 1
      }

      if (newStreak > newBestStreak) {
        newBestStreak = newStreak
      }
    }

    // Transaction pour tout mettre à jour
    await transaction(async () => {
      // Mettre à jour la preuve
      await execute(
        `UPDATE task_proofs
         SET status = 'approved', validated_by = $1, validated_at = NOW(), xp_awarded = $2
         WHERE id = $3`,
        [parentUserId, totalXp, proofId]
      )

      // Mettre à jour la tâche
      await execute(
        `UPDATE tasks SET status = 'done', completed_at = NOW() WHERE id = $1`,
        [proof.task_id]
      )

      // Mettre à jour le compte enfant
      await execute(
        `UPDATE child_accounts
         SET current_xp = $1, current_level = $2, streak_current = $3, streak_best = $4,
             last_activity_at = NOW(), total_tasks_completed = $5
         WHERE child_id = $6`,
        [newXp, newLevel?.level ?? account.current_level, newStreak, newBestStreak, newTotalTasks, childId]
      )

      // Ajouter la transaction XP
      await execute(
        `INSERT INTO xp_transactions (child_id, amount, reason, task_id)
         VALUES ($1, $2, 'task_completed', $3)`,
        [childId, totalXp, proof.task_id]
      )
    })

    // Vérifier les nouveaux badges
    const newBadges = await checkAndAwardBadges(childId, newTotalTasks, newStreak, newLevel?.level ?? account.current_level)

    return {
      success: true,
      data: { xpAwarded: totalXp, newBadges, levelUp: levelUp ?? false },
    }
  } catch (error) {
    console.error('Erreur approveTaskProof:', error)
    return { success: false, error: 'Erreur lors de l\'approbation' }
  }
}

/**
 * Rejette une preuve photo
 */
export async function rejectTaskProof(
  proofId: string,
  parentUserId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const result = await execute(
      `UPDATE task_proofs
       SET status = 'rejected', validated_by = $1, validated_at = NOW(), rejection_reason = $2
       WHERE id = $3 AND status = 'pending'`,
      [parentUserId, reason, proofId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Preuve non trouvée' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur rejectTaskProof:', error)
    return { success: false, error: 'Erreur lors du rejet' }
  }
}

/**
 * Vérifie et attribue les badges mérités
 */
async function checkAndAwardBadges(
  childId: string,
  totalTasks: number,
  streak: number,
  level: number
): Promise<Badge[]> {
  const newBadges: Badge[] = []

  try {
    // Récupérer tous les badges non débloqués
    const availableBadges = await query<Badge>(
      `SELECT b.* FROM badges b
       LEFT JOIN child_badges cb ON cb.badge_id = b.id AND cb.child_id = $1
       WHERE cb.id IS NULL AND b.is_active = true`,
      [childId]
    )

    for (const badge of availableBadges) {
      let earned = false

      switch (badge.condition_type) {
        case 'tasks_completed':
          earned = totalTasks >= badge.condition_value
          break
        case 'streak_days':
          earned = streak >= badge.condition_value
          break
        case 'level_reached':
          earned = level >= badge.condition_value
          break
        case 'special':
          // Les badges spéciaux sont gérés séparément
          break
      }

      if (earned) {
        // Attribuer le badge
        await execute(
          `INSERT INTO child_badges (child_id, badge_id) VALUES ($1, $2)`,
          [childId, badge.id]
        )

        // Ajouter l'XP du badge
        if (badge.xp_reward > 0) {
          await execute(
            `UPDATE child_accounts SET current_xp = current_xp + $1 WHERE child_id = $2`,
            [badge.xp_reward, childId]
          )
          await execute(
            `INSERT INTO xp_transactions (child_id, amount, reason, badge_id) VALUES ($1, $2, 'badge_earned', $3)`,
            [childId, badge.xp_reward, badge.id]
          )
        }

        newBadges.push(badge)
      }
    }
  } catch (error) {
    console.error('Erreur checkAndAwardBadges:', error)
  }

  return newBadges
}

/**
 * Récupère les preuves en attente de validation (pour parent)
 */
export async function getPendingProofs(): Promise<ActionResult<Array<TaskProof & { task_title: string; child_name: string; child_avatar: string | null }>>> {
  try {
    const userId = await import('@/lib/auth/actions').then(m => m.getUserId())
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    const proofs = await query<TaskProof & { task_title: string; child_name: string; child_avatar: string | null }>(
      `SELECT tp.*, t.title as task_title, c.first_name as child_name, c.avatar_url as child_avatar
       FROM task_proofs tp
       JOIN tasks t ON t.id = tp.task_id
       JOIN children c ON c.id = tp.child_id
       JOIN household_members hm ON hm.household_id = t.household_id
       WHERE hm.user_id = $1 AND tp.status = 'pending'
       ORDER BY tp.created_at DESC`,
      [userId]
    )

    return { success: true, data: proofs }
  } catch (error) {
    console.error('Erreur getPendingProofs:', error)
    return { success: false, error: 'Erreur lors de la récupération' }
  }
}

/**
 * Marque un badge comme vu
 */
export async function markBadgeSeen(badgeId: string): Promise<ActionResult> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    await execute(
      `UPDATE child_badges SET seen_at = NOW() WHERE child_id = $1 AND badge_id = $2`,
      [session.childId, badgeId]
    )

    return { success: true }
  } catch (error) {
    console.error('Erreur markBadgeSeen:', error)
    return { success: false, error: 'Erreur' }
  }
}

/**
 * Récupère les tâches pour la roadmap (triées par priorité + deadline)
 */
export async function getKidsRoadmap(childId: string): Promise<ActionResult<{
  tasks: Array<{
    id: string
    title: string
    description: string | null
    deadline: string | null
    status: "pending" | "done"
    priority: string
    proof_status: "pending" | "approved" | "rejected" | null
    reward_type: "xp" | "immediate"
    reward_xp: number
    reward_immediate_text: string | null
    category_icon: string | null
    completed_at: string | null
  }>
  pendingReward: {
    taskId: string
    taskTitle: string
    rewardType: "xp" | "immediate"
    xpAmount: number
    immediateText: string | null
    levelUp: boolean
    newLevel: number | null
    newLevelName: string | null
  } | null
}>> {
  try {
    const session = await getKidsSession()
    if (!session) {
      return { success: false, error: 'Non connecté' }
    }

    if (session.childId !== childId) {
      return { success: false, error: 'Accès non autorisé' }
    }

    // Récupérer l'enfant et son foyer
    const child = await queryOne<{ household_id: string }>(
      'SELECT household_id FROM children WHERE id = $1 AND is_active = true',
      [childId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Récupérer les tâches triées par priorité puis deadline
    const tasks = await query<{
      id: string
      title: string
      description: string | null
      deadline: string | null
      status: string
      priority: string
      load_weight: number
      reward_type: string | null
      reward_immediate_text: string | null
      reward_xp_override: number | null
      category_icon: string | null
      completed_at: string | null
      proof_status: string | null
    }>(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.deadline::text,
        t.status,
        t.priority,
        t.load_weight,
        COALESCE(t.reward_type, 'xp') as reward_type,
        t.reward_immediate_text,
        t.reward_xp_override,
        tc.icon as category_icon,
        t.completed_at::text,
        tp.status as proof_status
      FROM tasks t
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      LEFT JOIN task_proofs tp ON tp.task_id = t.id AND tp.child_id = $1
      WHERE t.child_id = $1
        AND t.household_id = $2
        AND t.status IN ('pending', 'done')
      ORDER BY
        CASE t.status WHEN 'pending' THEN 0 ELSE 1 END,
        CASE t.priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.deadline ASC NULLS LAST,
        t.created_at ASC
      LIMIT 50
    `, [childId, child.household_id])

    // Transformer avec XP calculé
    const transformedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      status: t.status as "pending" | "done",
      priority: t.priority,
      proof_status: t.proof_status as "pending" | "approved" | "rejected" | null,
      reward_type: (t.reward_type || 'xp') as "xp" | "immediate",
      reward_xp: t.reward_xp_override ?? calculateTaskXp(t.load_weight),
      reward_immediate_text: t.status === 'done' && t.proof_status === 'approved' ? t.reward_immediate_text : null,
      category_icon: t.category_icon,
      completed_at: t.completed_at,
    }))

    // Vérifier s'il y a une récompense à afficher (tâche récemment validée)
    const recentlyApproved = await queryOne<{
      task_id: string
      task_title: string
      reward_type: string
      xp_awarded: number
      reward_immediate_text: string | null
      validated_at: string
    }>(`
      SELECT 
        tp.task_id,
        t.title as task_title,
        COALESCE(t.reward_type, 'xp') as reward_type,
        tp.xp_awarded,
        t.reward_immediate_text,
        tp.validated_at::text
      FROM task_proofs tp
      JOIN tasks t ON t.id = tp.task_id
      WHERE tp.child_id = $1
        AND tp.status = 'approved'
        AND tp.validated_at > NOW() - INTERVAL '5 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM reward_notifications rn 
          WHERE rn.task_proof_id = tp.id AND rn.seen = true
        )
      ORDER BY tp.validated_at DESC
      LIMIT 1
    `, [childId])

    let pendingReward = null
    if (recentlyApproved) {
      // Récupérer l'XP et le niveau actuel de l'enfant
      const account = await queryOne<{ current_xp: number; current_level: number }>(
        'SELECT current_xp, current_level FROM child_accounts WHERE child_id = $1',
        [childId]
      )

      const currentXp = account?.current_xp ?? 0
      const currentLevel = account?.current_level ?? 1
      const xpAwarded = recentlyApproved.xp_awarded ?? 0

      // Calculer l'XP qu'il avait AVANT cette tâche
      const xpBeforeTask = currentXp - xpAwarded

      // Déterminer le niveau qu'il avait AVANT (en utilisant la fonction SQL via une requête)
      const previousLevelResult = await queryOne<{ level: number }>(
        'SELECT level FROM xp_levels WHERE xp_required <= $1 ORDER BY level DESC LIMIT 1',
        [Math.max(0, xpBeforeTask)]
      )
      const previousLevel = previousLevelResult?.level ?? 1

      // Level up si le niveau actuel est supérieur au niveau précédent
      const levelUp = currentLevel > previousLevel

      // Récupérer le nom du niveau actuel
      const level = await queryOne<{ name: string }>(
        'SELECT name FROM xp_levels WHERE level = $1',
        [currentLevel]
      )

      pendingReward = {
        taskId: recentlyApproved.task_id,
        taskTitle: recentlyApproved.task_title,
        rewardType: recentlyApproved.reward_type as "xp" | "immediate",
        xpAmount: xpAwarded,
        immediateText: recentlyApproved.reward_immediate_text,
        levelUp,
        newLevel: levelUp ? currentLevel : null,
        newLevelName: levelUp ? (level?.name ?? null) : null,
      }
    }

    return {
      success: true,
      data: {
        tasks: transformedTasks,
        pendingReward,
      },
    }
  } catch (error) {
    console.error('Erreur getKidsRoadmap:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}
