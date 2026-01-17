'use server'

import { revalidatePath } from 'next/cache'
import { query, queryOne, insert, update, execute, setCurrentUser } from '@/lib/aws/database'
import { getUserId } from '@/lib/auth/actions'
import { z } from 'zod'
import type {
  Challenge,
  ChallengeTemplate,
  ChallengeProgress,
  ChallengeWithProgress,
  ChallengeTriggerType,
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
// VALIDATION SCHEMAS
// ============================================================

const createChallengeSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional().default('🎯'),
  triggerType: z.enum(['task_category', 'task_any', 'specific_task']),
  triggerCategoryCode: z.string().max(50).optional(),
  triggerTaskKeyword: z.string().max(100).optional(),
  requiredCount: z.number().int().min(1).max(100).default(1),
  timeframeDays: z.number().int().min(1).max(365).optional(),
  rewardXp: z.number().int().min(1).max(1000).default(50),
  rewardBadgeId: z.string().uuid().optional(),
  rewardCustom: z.string().max(200).optional(),
  childIds: z.array(z.string().uuid()).min(1, 'Au moins un enfant requis'),
})

const updateChallengeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  requiredCount: z.number().int().min(1).max(100).optional(),
  timeframeDays: z.number().int().min(1).max(365).optional().nullable(),
  rewardXp: z.number().int().min(1).max(1000).optional(),
  rewardCustom: z.string().max(200).optional().nullable(),
  childIds: z.array(z.string().uuid()).min(1).optional(),
  isActive: z.boolean().optional(),
})

type CreateChallengeInput = z.infer<typeof createChallengeSchema>
type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getHouseholdId(userId: string): Promise<string | null> {
  const membership = await queryOne<{ household_id: string }>(
    `SELECT household_id FROM household_members WHERE user_id = $1 AND is_active = true`,
    [userId]
  )
  return membership?.household_id ?? null
}

// ============================================================
// SERVER ACTIONS - TEMPLATES
// ============================================================

/**
 * Récupère tous les templates de challenges actifs
 */
export async function getChallengeTemplates(): Promise<ActionResult<ChallengeTemplate[]>> {
  try {
    const templates = await query<ChallengeTemplate>(
      `SELECT * FROM challenge_templates WHERE is_active = true ORDER BY sort_order, name_fr`
    )
    return { success: true, data: templates }
  } catch (error) {
    console.error('Erreur getChallengeTemplates:', error)
    return { success: false, error: 'Erreur lors du chargement des templates' }
  }
}

/**
 * Récupère un template par son slug
 */
export async function getChallengeTemplateBySlug(
  slug: string
): Promise<ActionResult<ChallengeTemplate | null>> {
  try {
    const template = await queryOne<ChallengeTemplate>(
      `SELECT * FROM challenge_templates WHERE slug = $1 AND is_active = true`,
      [slug]
    )
    return { success: true, data: template ?? null }
  } catch (error) {
    console.error('Erreur getChallengeTemplateBySlug:', error)
    return { success: false, error: 'Erreur lors du chargement du template' }
  }
}

// ============================================================
// SERVER ACTIONS - CHALLENGES (CRUD)
// ============================================================

/**
 * Crée un nouveau challenge (custom ou depuis template)
 */
export async function createChallenge(
  input: CreateChallengeInput
): Promise<ActionResult<{ challengeId: string }>> {
  const validation = createChallengeSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Données invalides' }
  }

  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  const data = validation.data

  // Verify all children belong to this household
  const childrenCheck = await query<{ id: string }>(
    `SELECT id FROM children WHERE id = ANY($1) AND household_id = $2 AND is_active = true`,
    [data.childIds, householdId]
  )

  if (childrenCheck.length !== data.childIds.length) {
    return { success: false, error: 'Un ou plusieurs enfants invalides' }
  }

  // Calculate expires_at if timeframe is set
  let expiresAt: string | null = null
  if (data.timeframeDays) {
    const expDate = new Date()
    expDate.setDate(expDate.getDate() + data.timeframeDays)
    expiresAt = expDate.toISOString()
  }

  try {
    const challenge = await insert<Challenge>('challenges', {
      household_id: householdId,
      template_id: data.templateId ?? null,
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? '🎯',
      trigger_type: data.triggerType as ChallengeTriggerType,
      trigger_category_code: data.triggerCategoryCode ?? null,
      trigger_task_keyword: data.triggerTaskKeyword ?? null,
      required_count: data.requiredCount,
      timeframe_days: data.timeframeDays ?? null,
      reward_xp: data.rewardXp,
      reward_badge_id: data.rewardBadgeId ?? null,
      reward_custom: data.rewardCustom ?? null,
      child_ids: data.childIds,
      expires_at: expiresAt,
      created_by: userId,
    })

    if (!challenge) {
      return { success: false, error: 'Erreur lors de la création' }
    }

    // Create initial progress records for each child
    for (const childId of data.childIds) {
      await insert('challenge_progress', {
        challenge_id: challenge.id,
        child_id: childId,
        current_count: 0,
      })
    }

    revalidatePath('/challenges')
    return { success: true, data: { challengeId: challenge.id } }
  } catch (error) {
    console.error('Erreur createChallenge:', error)
    return { success: false, error: 'Erreur lors de la création du défi' }
  }
}

/**
 * Crée un challenge depuis un template
 */
export async function createChallengeFromTemplate(
  templateSlug: string,
  childIds: string[]
): Promise<ActionResult<{ challengeId: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  // Get template
  const template = await queryOne<ChallengeTemplate>(
    `SELECT * FROM challenge_templates WHERE slug = $1 AND is_active = true`,
    [templateSlug]
  )

  if (!template) {
    return { success: false, error: 'Template introuvable' }
  }

  // Create challenge from template
  return createChallenge({
    templateId: template.id,
    name: template.name_fr,
    description: template.description_fr ?? undefined,
    icon: template.icon,
    triggerType: template.trigger_type,
    triggerCategoryCode: template.trigger_category_code ?? undefined,
    triggerTaskKeyword: template.trigger_task_keyword ?? undefined,
    requiredCount: template.required_count,
    timeframeDays: template.timeframe_days ?? undefined,
    rewardXp: template.reward_xp,
    rewardBadgeId: template.reward_badge_id ?? undefined,
    childIds,
  })
}

/**
 * Récupère tous les challenges du foyer
 */
export async function getChallenges(
  includeInactive = false
): Promise<ActionResult<ChallengeWithProgress[]>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  try {
    const whereClause = includeInactive ? '' : 'AND ch.is_active = true'

    const challenges = await query<Challenge>(
      `SELECT ch.* FROM challenges ch
       WHERE ch.household_id = $1 ${whereClause}
       ORDER BY ch.created_at DESC`,
      [householdId]
    )

    // Get progress for each challenge
    const result: ChallengeWithProgress[] = []

    for (const challenge of challenges) {
      // Get children with progress
      const childrenProgress = await query<{
        id: string
        first_name: string
        avatar_url: string | null
        progress_id: string | null
        current_count: number | null
        is_completed: boolean | null
        completed_at: string | null
      }>(
        `SELECT
           c.id,
           c.first_name,
           c.avatar_url,
           cp.id as progress_id,
           cp.current_count,
           cp.is_completed,
           cp.completed_at
         FROM children c
         LEFT JOIN challenge_progress cp ON cp.child_id = c.id AND cp.challenge_id = $1
         WHERE c.id = ANY($2) AND c.is_active = true`,
        [challenge.id, challenge.child_ids]
      )

      result.push({
        ...challenge,
        progress: null,
        children: childrenProgress.map(cp => ({
          id: cp.id,
          first_name: cp.first_name,
          avatar_url: cp.avatar_url,
          progress: cp.progress_id ? {
            id: cp.progress_id,
            challenge_id: challenge.id,
            child_id: cp.id,
            current_count: cp.current_count ?? 0,
            is_completed: cp.is_completed ?? false,
            completed_at: cp.completed_at,
            xp_awarded: null,
            badge_awarded_id: null,
            last_task_id: null,
            last_progress_at: null,
            created_at: '',
            updated_at: '',
          } : null,
        })),
      })
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Erreur getChallenges:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Récupère un challenge par son ID
 */
export async function getChallengeById(
  challengeId: string
): Promise<ActionResult<ChallengeWithProgress | null>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  try {
    const challenge = await queryOne<Challenge>(
      `SELECT * FROM challenges WHERE id = $1 AND household_id = $2`,
      [challengeId, householdId]
    )

    if (!challenge) {
      return { success: true, data: null }
    }

    // Get children with progress
    const childrenProgress = await query<{
      id: string
      first_name: string
      avatar_url: string | null
      progress_id: string | null
      current_count: number | null
      is_completed: boolean | null
      completed_at: string | null
      xp_awarded: number | null
      badge_awarded_id: string | null
      last_task_id: string | null
      last_progress_at: string | null
    }>(
      `SELECT
         c.id,
         c.first_name,
         c.avatar_url,
         cp.id as progress_id,
         cp.current_count,
         cp.is_completed,
         cp.completed_at,
         cp.xp_awarded,
         cp.badge_awarded_id,
         cp.last_task_id,
         cp.last_progress_at
       FROM children c
       LEFT JOIN challenge_progress cp ON cp.child_id = c.id AND cp.challenge_id = $1
       WHERE c.id = ANY($2) AND c.is_active = true`,
      [challenge.id, challenge.child_ids]
    )

    return {
      success: true,
      data: {
        ...challenge,
        progress: null,
        children: childrenProgress.map(cp => ({
          id: cp.id,
          first_name: cp.first_name,
          avatar_url: cp.avatar_url,
          progress: cp.progress_id ? {
            id: cp.progress_id,
            challenge_id: challenge.id,
            child_id: cp.id,
            current_count: cp.current_count ?? 0,
            is_completed: cp.is_completed ?? false,
            completed_at: cp.completed_at,
            xp_awarded: cp.xp_awarded,
            badge_awarded_id: cp.badge_awarded_id,
            last_task_id: cp.last_task_id,
            last_progress_at: cp.last_progress_at,
            created_at: '',
            updated_at: '',
          } : null,
        })),
      },
    }
  } catch (error) {
    console.error('Erreur getChallengeById:', error)
    return { success: false, error: 'Erreur lors du chargement' }
  }
}

/**
 * Met a jour un challenge
 */
export async function updateChallenge(
  input: UpdateChallengeInput
): Promise<ActionResult> {
  const validation = updateChallengeSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Données invalides' }
  }

  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  const data = validation.data

  // Verify challenge belongs to household
  const existing = await queryOne<Challenge>(
    `SELECT * FROM challenges WHERE id = $1 AND household_id = $2`,
    [data.id, householdId]
  )

  if (!existing) {
    return { success: false, error: 'Défi introuvable' }
  }

  try {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData['name'] = data.name
    if (data.description !== undefined) updateData['description'] = data.description
    if (data.icon !== undefined) updateData['icon'] = data.icon
    if (data.requiredCount !== undefined) updateData['required_count'] = data.requiredCount
    if (data.timeframeDays !== undefined) updateData['timeframe_days'] = data.timeframeDays
    if (data.rewardXp !== undefined) updateData['reward_xp'] = data.rewardXp
    if (data.rewardCustom !== undefined) updateData['reward_custom'] = data.rewardCustom
    if (data.isActive !== undefined) updateData['is_active'] = data.isActive

    if (data.childIds !== undefined) {
      // Verify children
      const childrenCheck = await query<{ id: string }>(
        `SELECT id FROM children WHERE id = ANY($1) AND household_id = $2 AND is_active = true`,
        [data.childIds, householdId]
      )
      if (childrenCheck.length !== data.childIds.length) {
        return { success: false, error: 'Un ou plusieurs enfants invalides' }
      }
      updateData['child_ids'] = data.childIds

      // Create progress records for new children
      const newChildIds = data.childIds.filter(id => !existing.child_ids.includes(id))
      for (const childId of newChildIds) {
        await insert('challenge_progress', {
          challenge_id: data.id,
          child_id: childId,
          current_count: 0,
        })
      }
    }

    await update('challenges', data.id, updateData)

    revalidatePath('/challenges')
    revalidatePath(`/challenges/${data.id}`)
    return { success: true }
  } catch (error) {
    console.error('Erreur updateChallenge:', error)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }
}

/**
 * Supprime un challenge
 */
export async function deleteChallenge(challengeId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  try {
    // Verify challenge belongs to household
    const existing = await queryOne<Challenge>(
      `SELECT id FROM challenges WHERE id = $1 AND household_id = $2`,
      [challengeId, householdId]
    )

    if (!existing) {
      return { success: false, error: 'Défi introuvable' }
    }

    // Delete challenge (cascade deletes progress)
    await execute(
      `DELETE FROM challenges WHERE id = $1`,
      [challengeId]
    )

    revalidatePath('/challenges')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteChallenge:', error)
    return { success: false, error: 'Erreur lors de la suppression' }
  }
}

/**
 * Desactive un challenge (soft delete)
 */
export async function deactivateChallenge(challengeId: string): Promise<ActionResult> {
  return updateChallenge({ id: challengeId, isActive: false })
}

// ============================================================
// SERVER ACTIONS - PROGRESS
// ============================================================

/**
 * Met a jour manuellement la progression d'un challenge
 * (pour tests ou corrections)
 */
export async function updateChallengeProgress(
  challengeId: string,
  childId: string,
  increment: number = 1
): Promise<ActionResult<ChallengeProgress>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  try {
    // Verify challenge
    const challenge = await queryOne<Challenge>(
      `SELECT * FROM challenges WHERE id = $1 AND household_id = $2 AND is_active = true`,
      [challengeId, householdId]
    )

    if (!challenge) {
      return { success: false, error: 'Défi introuvable ou inactif' }
    }

    // Verify child is in challenge
    if (!challenge.child_ids.includes(childId)) {
      return { success: false, error: 'Enfant non assigné à ce défi' }
    }

    // Get or create progress
    let progress = await queryOne<ChallengeProgress>(
      `SELECT * FROM challenge_progress WHERE challenge_id = $1 AND child_id = $2`,
      [challengeId, childId]
    )

    if (!progress) {
      progress = await insert<ChallengeProgress>('challenge_progress', {
        challenge_id: challengeId,
        child_id: childId,
        current_count: 0,
      })
    }

    if (!progress) {
      return { success: false, error: 'Erreur création progression' }
    }

    // Don't update if already completed
    if (progress.is_completed) {
      return { success: true, data: progress }
    }

    // Update progress
    const newCount = Math.min(progress.current_count + increment, challenge.required_count)
    const isCompleted = newCount >= challenge.required_count

    await update('challenge_progress', progress.id, {
      current_count: newCount,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      xp_awarded: isCompleted ? challenge.reward_xp : null,
      badge_awarded_id: isCompleted ? challenge.reward_badge_id : null,
      last_progress_at: new Date().toISOString(),
    })

    // If completed, award XP
    if (isCompleted && !progress.is_completed) {
      await execute(
        `UPDATE child_accounts SET current_xp = current_xp + $1 WHERE child_id = $2`,
        [challenge.reward_xp, childId]
      )

      await insert('xp_transactions', {
        child_id: childId,
        amount: challenge.reward_xp,
        reason: 'challenge_completed',
      })

      // Award badge if specified
      if (challenge.reward_badge_id) {
        await execute(
          `INSERT INTO child_badges (child_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [childId, challenge.reward_badge_id]
        )
      }
    }

    // Get updated progress
    const updatedProgress = await queryOne<ChallengeProgress>(
      `SELECT * FROM challenge_progress WHERE id = $1`,
      [progress.id]
    )

    revalidatePath('/challenges')
    revalidatePath(`/challenges/${challengeId}`)

    return { success: true, data: updatedProgress! }
  } catch (error) {
    console.error('Erreur updateChallengeProgress:', error)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }
}

/**
 * Marque un challenge comme complete manuellement
 */
export async function completeChallenge(
  challengeId: string,
  childId: string
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Non connecté' }
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return { success: false, error: 'Pas de foyer' }
  }

  try {
    // Get challenge
    const challenge = await queryOne<Challenge>(
      `SELECT * FROM challenges WHERE id = $1 AND household_id = $2`,
      [challengeId, householdId]
    )

    if (!challenge) {
      return { success: false, error: 'Défi introuvable' }
    }

    // Get progress
    const progress = await queryOne<ChallengeProgress>(
      `SELECT * FROM challenge_progress WHERE challenge_id = $1 AND child_id = $2`,
      [challengeId, childId]
    )

    if (!progress) {
      return { success: false, error: 'Progression introuvable' }
    }

    if (progress.is_completed) {
      return { success: true }
    }

    // Mark as completed
    await update('challenge_progress', progress.id, {
      current_count: challenge.required_count,
      is_completed: true,
      completed_at: new Date().toISOString(),
      xp_awarded: challenge.reward_xp,
      badge_awarded_id: challenge.reward_badge_id,
    })

    // Award XP
    await execute(
      `UPDATE child_accounts SET current_xp = current_xp + $1 WHERE child_id = $2`,
      [challenge.reward_xp, childId]
    )

    await insert('xp_transactions', {
      child_id: childId,
      amount: challenge.reward_xp,
      reason: 'challenge_completed',
    })

    // Award badge if specified
    if (challenge.reward_badge_id) {
      await execute(
        `INSERT INTO child_badges (child_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [childId, challenge.reward_badge_id]
      )
    }

    revalidatePath('/challenges')
    return { success: true }
  } catch (error) {
    console.error('Erreur completeChallenge:', error)
    return { success: false, error: 'Erreur lors de la completion' }
  }
}
