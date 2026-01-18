'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { query, queryOne, execute, setCurrentUser, transaction } from '@/lib/aws/database'
import { getUserId } from '@/lib/auth/actions'
import {
  createChildAccountSchema,
  verifyPinSchema,
  resetPinSchema,
  type CreateChildAccountInput,
  type VerifyPinInput,
  type ResetPinInput,
} from '@/lib/validations/kids'
import type {
  ChildAccount,
  ChildAccountInsert,
  Child,
  XpLevel,
} from '@/types/database'

// ============================================================
// CONSTANTS
// ============================================================

const KIDS_SESSION_COOKIE = 'kids_session'
const SESSION_MAX_AGE = 60 * 60 * 4 // 4 heures
const MAX_PIN_ATTEMPTS = 5
const PIN_LOCKOUT_MINUTES = 15
const SALT_ROUNDS = 10

// Cache pour rate limiting (en mémoire pour simplifier)
const pinAttempts = new Map<string, { count: number; lastAttempt: Date }>()

// ============================================================
// HELPERS
// ============================================================

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

function checkRateLimit(childId: string): { allowed: boolean; remainingAttempts: number; lockoutUntil?: Date } {
  const attempts = pinAttempts.get(childId)

  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS }
  }

  const now = new Date()
  const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime()
  const lockoutMs = PIN_LOCKOUT_MINUTES * 60 * 1000

  // Reset après lockout
  if (attempts.count >= MAX_PIN_ATTEMPTS && timeSinceLastAttempt > lockoutMs) {
    pinAttempts.delete(childId)
    return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS }
  }

  // Toujours en lockout
  if (attempts.count >= MAX_PIN_ATTEMPTS) {
    const lockoutUntil = new Date(attempts.lastAttempt.getTime() + lockoutMs)
    return { allowed: false, remainingAttempts: 0, lockoutUntil }
  }

  return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS - attempts.count }
}

function recordFailedAttempt(childId: string): void {
  const attempts = pinAttempts.get(childId)

  if (attempts) {
    attempts.count++
    attempts.lastAttempt = new Date()
  } else {
    pinAttempts.set(childId, { count: 1, lastAttempt: new Date() })
  }
}

function resetAttempts(childId: string): void {
  pinAttempts.delete(childId)
}

// ============================================================
// SERVER ACTIONS
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Crée un compte enfant avec un PIN
 * (Appelé par un parent authentifié)
 */
export async function createChildAccount(
  input: CreateChildAccountInput
): Promise<ActionResult<ChildAccount>> {
  try {
    // Valider l'input
    const validated = createChildAccountSchema.parse(input)

    // Vérifier l'authentification parent
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Vérifier que l'enfant existe et appartient au foyer du parent
    const child = await queryOne<Child & { household_id: string }>(
      `SELECT c.* FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE c.id = $1 AND hm.user_id = $2 AND c.is_active = true`,
      [validated.childId, userId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Vérifier qu'un compte n'existe pas déjà
    const existingAccount = await queryOne<ChildAccount>(
      'SELECT * FROM child_accounts WHERE child_id = $1',
      [validated.childId]
    )

    if (existingAccount) {
      return { success: false, error: 'Un compte existe déjà pour cet enfant' }
    }

    // Hash du PIN
    const pinHash = await hashPin(validated.pin)

    // Créer le compte
    const [newAccount] = await query<ChildAccount>(
      `INSERT INTO child_accounts (child_id, pin_hash)
       VALUES ($1, $2)
       RETURNING *`,
      [validated.childId, pinHash]
    )

    return { success: true, data: newAccount }
  } catch (error) {
    console.error('Erreur createChildAccount:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Erreur lors de la création du compte' }
  }
}

/**
 * Vérifie le PIN et crée une session enfant
 */
export async function verifyChildPin(
  input: VerifyPinInput
): Promise<ActionResult<{ childId: string; firstName: string }>> {
  try {
    // Valider l'input
    const validated = verifyPinSchema.parse(input)

    // Rate limiting
    const rateLimit = checkRateLimit(validated.childId)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.lockoutUntil!.getTime() - Date.now()) / 60000
      )
      return {
        success: false,
        error: `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      }
    }

    // Récupérer le compte et l'enfant
    const result = await queryOne<ChildAccount & { first_name: string; is_active: boolean }>(
      `SELECT ca.*, c.first_name, c.is_active
       FROM child_accounts ca
       JOIN children c ON c.id = ca.child_id
       WHERE ca.child_id = $1`,
      [validated.childId]
    )

    if (!result || !result.is_active) {
      recordFailedAttempt(validated.childId)
      return {
        success: false,
        error: `PIN incorrect. ${rateLimit.remainingAttempts - 1} tentative${
          rateLimit.remainingAttempts - 1 > 1 ? 's' : ''
        } restante${rateLimit.remainingAttempts - 1 > 1 ? 's' : ''}.`,
      }
    }

    // Vérifier le PIN
    const isValid = await verifyPinHash(validated.pin, result.pin_hash)

    if (!isValid) {
      recordFailedAttempt(validated.childId)
      return {
        success: false,
        error: `PIN incorrect. ${rateLimit.remainingAttempts - 1} tentative${
          rateLimit.remainingAttempts - 1 > 1 ? 's' : ''
        } restante${rateLimit.remainingAttempts - 1 > 1 ? 's' : ''}.`,
      }
    }

    // Reset les tentatives
    resetAttempts(validated.childId)

    // Mettre à jour last_activity_at
    await execute(
      'UPDATE child_accounts SET last_activity_at = NOW() WHERE child_id = $1',
      [validated.childId]
    )

    // Créer la session enfant
    const sessionData = {
      childId: validated.childId,
      firstName: result.first_name,
      createdAt: Date.now(),
    }

    const cookieStore = await cookies()
    cookieStore.set(KIDS_SESSION_COOKIE, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/kids',
    })

    return {
      success: true,
      data: { childId: validated.childId, firstName: result.first_name },
    }
  } catch (error) {
    console.error('Erreur verifyChildPin:', error)
    return { success: false, error: 'Erreur lors de la vérification' }
  }
}

/**
 * Réinitialise le PIN d'un enfant (par un parent)
 */
export async function resetChildPin(
  input: ResetPinInput
): Promise<ActionResult> {
  try {
    // Valider l'input
    const validated = resetPinSchema.parse(input)

    // Vérifier l'authentification parent
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Vérifier que l'enfant appartient au foyer du parent
    const child = await queryOne<Child>(
      `SELECT c.* FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE c.id = $1 AND hm.user_id = $2 AND c.is_active = true`,
      [validated.childId, userId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Hash du nouveau PIN
    const pinHash = await hashPin(validated.newPin)

    // Mettre à jour le PIN
    const result = await execute(
      'UPDATE child_accounts SET pin_hash = $1, updated_at = NOW() WHERE child_id = $2',
      [pinHash, validated.childId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Compte non trouvé' }
    }

    // Reset les tentatives (au cas où il y avait un lockout)
    resetAttempts(validated.childId)

    return { success: true }
  } catch (error) {
    console.error('Erreur resetChildPin:', error)
    return { success: false, error: 'Erreur lors de la réinitialisation' }
  }
}

/**
 * Déconnecte l'enfant (supprime la session)
 */
export async function logoutChild(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(KIDS_SESSION_COOKIE)
    return { success: true }
  } catch (error) {
    console.error('Erreur logoutChild:', error)
    return { success: false, error: 'Erreur lors de la déconnexion' }
  }
}

/**
 * Récupère la session enfant actuelle
 */
export async function getKidsSession(): Promise<{
  childId: string
  firstName: string
} | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(KIDS_SESSION_COOKIE)

    if (!sessionCookie?.value) {
      return null
    }

    const session = JSON.parse(sessionCookie.value) as {
      childId: string
      firstName: string
      createdAt: number
    }

    // Vérifier l'expiration
    if (Date.now() - session.createdAt > SESSION_MAX_AGE * 1000) {
      cookieStore.delete(KIDS_SESSION_COOKIE)
      return null
    }

    return { childId: session.childId, firstName: session.firstName }
  } catch (error) {
    console.error('Erreur getKidsSession:', error)
    return null
  }
}

/**
 * Vérifie si un enfant a un compte
 */
export async function hasChildAccount(childId: string): Promise<boolean> {
  try {
    const account = await queryOne<{ id: string }>(
      'SELECT id FROM child_accounts WHERE child_id = $1',
      [childId]
    )
    return !!account
  } catch (error) {
    console.error('Erreur hasChildAccount:', error)
    return false
  }
}

/**
 * Récupère les enfants du foyer avec leurs comptes
 */
export async function getChildrenWithAccounts(): Promise<
  ActionResult<Array<Child & { has_account: boolean }>>
> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    const children = await query<Child & { has_account: boolean }>(
      `SELECT c.*,
              CASE WHEN ca.id IS NOT NULL THEN true ELSE false END as has_account
       FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       LEFT JOIN child_accounts ca ON ca.child_id = c.id
       WHERE hm.user_id = $1 AND c.is_active = true
       ORDER BY c.first_name`,
      [userId]
    )

    return { success: true, data: children }
  } catch (error) {
    console.error('Erreur getChildrenWithAccounts:', error)
    return { success: false, error: 'Erreur lors de la récupération des enfants' }
  }
}

/**
 * Récupère le compte enfant complet avec les infos de niveau
 */
export async function getChildAccountWithLevel(
  childId: string
): Promise<ActionResult<ChildAccount & { level: XpLevel; next_level: XpLevel | null }>> {
  try {
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

    return {
      success: true,
      data: {
        ...account,
        level: level!,
        next_level: nextLevel || null,
      },
    }
  } catch (error) {
    console.error('Erreur getChildAccountWithLevel:', error)
    return { success: false, error: 'Erreur lors de la récupération du compte' }
  }
}

/**
 * Récupère les enfants du foyer pour la page de sélection /kids
 * (Sans authentification parent - seulement pour affichage)
 */
export async function getHouseholdChildrenForSelection(
  householdId: string
): Promise<ActionResult<Array<Pick<Child, 'id' | 'first_name' | 'avatar_url'> & { has_account: boolean }>>> {
  try {
    const children = await query<Pick<Child, 'id' | 'first_name' | 'avatar_url'> & { has_account: boolean }>(
      `SELECT c.id, c.first_name, c.avatar_url,
              CASE WHEN ca.id IS NOT NULL THEN true ELSE false END as has_account
       FROM children c
       LEFT JOIN child_accounts ca ON ca.child_id = c.id
       WHERE c.household_id = $1 AND c.is_active = true
       ORDER BY c.first_name`,
      [householdId]
    )

    return { success: true, data: children }
  } catch (error) {
    console.error('Erreur getHouseholdChildrenForSelection:', error)
    return { success: false, error: 'Erreur lors de la récupération des enfants' }
  }
}

/**
 * Récupère les infos d'un enfant pour la page login
 */
export async function getChildForLogin(
  childId: string
): Promise<ActionResult<Pick<Child, 'id' | 'first_name' | 'avatar_url'>>> {
  try {
    const child = await queryOne<Pick<Child, 'id' | 'first_name' | 'avatar_url'>>(
      `SELECT c.id, c.first_name, c.avatar_url
       FROM children c
       JOIN child_accounts ca ON ca.child_id = c.id
       WHERE c.id = $1 AND c.is_active = true`,
      [childId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé ou pas de compte' }
    }

    return { success: true, data: child }
  } catch (error) {
    console.error('Erreur getChildForLogin:', error)
    return { success: false, error: 'Erreur lors de la récupération des infos' }
  }
}

/**
 * Supprime un compte enfant (par un parent)
 */
export async function deleteChildAccount(
  childId: string
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Vérifier que l'enfant appartient au foyer du parent
    const child = await queryOne<Child>(
      `SELECT c.* FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE c.id = $1 AND hm.user_id = $2`,
      [childId, userId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Supprimer le compte (les données liées seront supprimées en cascade)
    await execute(
      'DELETE FROM child_accounts WHERE child_id = $1',
      [childId]
    )

    return { success: true }
  } catch (error) {
    console.error('Erreur deleteChildAccount:', error)
    return { success: false, error: 'Erreur lors de la suppression' }
  }
}

/**
 * Configure ou met à jour le PIN d'un enfant (par un parent)
 * Crée le compte si il n'existe pas, ou met à jour le PIN existant
 */
export async function setupChildPin(
  childId: string,
  pin: string
): Promise<ActionResult> {
  try {
    // Valider le PIN
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'Le PIN doit contenir exactement 4 chiffres' }
    }

    // Vérifier l'authentification parent
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    await setCurrentUser(userId)

    // Vérifier que l'enfant appartient au foyer du parent
    const child = await queryOne<Child>(
      `SELECT c.* FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id
       WHERE c.id = $1 AND hm.user_id = $2 AND c.is_active = true`,
      [childId, userId]
    )

    if (!child) {
      return { success: false, error: 'Enfant non trouvé' }
    }

    // Hash du PIN
    const pinHash = await hashPin(pin)

    // Vérifier si un compte existe déjà
    const existingAccount = await queryOne<{ child_id: string }>(
      'SELECT child_id FROM child_accounts WHERE child_id = $1',
      [childId]
    )

    if (existingAccount) {
      // Mettre à jour le PIN existant
      await execute(
        'UPDATE child_accounts SET pin_hash = $1, updated_at = NOW() WHERE child_id = $2',
        [pinHash, childId]
      )
    } else {
      // Créer un nouveau compte
      await execute(
        `INSERT INTO child_accounts (child_id, pin_hash)
         VALUES ($1, $2)`,
        [childId, pinHash]
      )
    }

    // Reset les tentatives (au cas où il y avait un lockout)
    resetAttempts(childId)

    return { success: true }
  } catch (error) {
    console.error('Erreur setupChildPin:', error)
    return { success: false, error: 'Erreur lors de la configuration du PIN' }
  }
}
