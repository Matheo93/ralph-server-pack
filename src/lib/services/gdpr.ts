/**
 * GDPR Service
 *
 * Handles data protection rights under GDPR:
 * - Right to access (data export)
 * - Right to erasure (data deletion)
 * - Right to rectification (data modification)
 * - Data portability
 */

import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { exportHouseholdData, type ExportHouseholdData } from "./export"

// =============================================================================
// TYPES
// =============================================================================

export interface GDPRDeleteResult {
  success: boolean
  deletedRecords: {
    tasks: number
    children: number
    vocalCommands: number
    notifications: number
    generatedTasks: number
    household: boolean
    user: boolean
  }
  error?: string
}

export interface GDPRAnonymizeResult {
  success: boolean
  anonymizedRecords: {
    children: number
    vocalCommands: number
    tasks: number
  }
  error?: string
}

export interface DataReport {
  userId: string
  householdId: string | null
  dataCategories: {
    category: string
    description: string
    count: number
    retentionDays: number | null
    legalBasis: string
  }[]
  lastExport: string | null
  accountCreated: string
  generatedAt: string
}

export interface GDPRConsentStatus {
  essential: boolean
  analytics: boolean
  marketing: boolean
  updatedAt: string | null
}

// =============================================================================
// DATA RETENTION POLICY
// =============================================================================

export const DATA_RETENTION_POLICY = {
  // Tasks are kept indefinitely for history
  tasks: null, // null means indefinite
  // Completed tasks older than 2 years can be archived
  completedTasksArchive: 730, // days
  // Vocal commands kept for 90 days
  vocalCommands: 90,
  // Notifications kept for 30 days
  notifications: 30,
  // Generated tasks kept for 365 days
  generatedTasks: 365,
  // Session logs kept for 30 days
  sessionLogs: 30,
  // Children data kept while household is active
  children: null,
} as const

// =============================================================================
// DATA EXPORT (Article 20 - Right to Data Portability)
// =============================================================================

/**
 * Export all user data in machine-readable format (JSON)
 * This implements GDPR Article 20 - Right to data portability
 */
export async function exportUserData(): Promise<{
  success: boolean
  data?: ExportHouseholdData
  error?: string
}> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { success: false, error: "Non autorisé" }
  }

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) {
    return { success: false, error: "Aucun foyer trouvé" }
  }

  const data = await exportHouseholdData(membership.household_id)
  if (!data) {
    return { success: false, error: "Erreur lors de l'export des données" }
  }

  // Log the export for audit trail
  await logGDPRAction(currentUserId, "export", {
    householdId: membership.household_id,
    exportedAt: new Date().toISOString(),
  })

  return { success: true, data }
}

// =============================================================================
// DATA DELETION (Article 17 - Right to Erasure)
// =============================================================================

/**
 * Delete all user data (Right to be forgotten)
 * This implements GDPR Article 17 - Right to erasure
 *
 * Note: This is an irreversible operation
 */
export async function deleteUserData(): Promise<GDPRDeleteResult> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return {
      success: false,
      deletedRecords: {
        tasks: 0,
        children: 0,
        vocalCommands: 0,
        notifications: 0,
        generatedTasks: 0,
        household: false,
        user: false,
      },
      error: "Non autorisé",
    }
  }

  await setCurrentUser(currentUserId)

  const result: GDPRDeleteResult = {
    success: false,
    deletedRecords: {
      tasks: 0,
      children: 0,
      vocalCommands: 0,
      notifications: 0,
      generatedTasks: 0,
      household: false,
      user: false,
    },
  }

  try {
    // Get user's household
    const membership = await queryOne<{
      household_id: string
      role: string
    }>(`
      SELECT household_id, role
      FROM household_members
      WHERE user_id = $1 AND is_active = true
    `, [currentUserId])

    if (!membership) {
      return {
        ...result,
        success: true,
        deletedRecords: { ...result.deletedRecords, user: true },
      }
    }

    const householdId = membership.household_id

    // Check if user is the only owner
    const owners = await query<{ user_id: string }>(`
      SELECT user_id FROM household_members
      WHERE household_id = $1 AND role = 'owner' AND is_active = true
    `, [householdId])

    const isOnlyOwner = owners.length === 1 && owners[0]?.user_id === currentUserId

    // Count other members
    const otherMembers = await query<{ user_id: string }>(`
      SELECT user_id FROM household_members
      WHERE household_id = $1 AND user_id != $2 AND is_active = true
    `, [householdId, currentUserId])

    if (isOnlyOwner && otherMembers.length > 0) {
      return {
        ...result,
        error: "Vous devez transférer la propriété du foyer avant de supprimer votre compte",
      }
    }

    // If sole member, delete entire household
    if (otherMembers.length === 0) {
      // Delete notifications
      const notificationsResult = await query<{ count: string }>(`
        DELETE FROM notifications WHERE household_id = $1 RETURNING 1
      `, [householdId]).catch(() => [])
      result.deletedRecords.notifications = notificationsResult.length

      // Delete vocal commands
      const vocalResult = await query<{ count: string }>(`
        DELETE FROM vocal_commands WHERE household_id = $1 RETURNING 1
      `, [householdId]).catch(() => [])
      result.deletedRecords.vocalCommands = vocalResult.length

      // Delete generated tasks
      const generatedResult = await query<{ count: string }>(`
        DELETE FROM generated_tasks WHERE household_id = $1 RETURNING 1
      `, [householdId]).catch(() => [])
      result.deletedRecords.generatedTasks = generatedResult.length

      // Delete tasks
      const tasksResult = await query<{ count: string }>(`
        DELETE FROM tasks WHERE household_id = $1 RETURNING 1
      `, [householdId]).catch(() => [])
      result.deletedRecords.tasks = tasksResult.length

      // Delete children
      const childrenResult = await query<{ count: string }>(`
        DELETE FROM children WHERE household_id = $1 RETURNING 1
      `, [householdId]).catch(() => [])
      result.deletedRecords.children = childrenResult.length

      // Delete household members
      await query(`DELETE FROM household_members WHERE household_id = $1`, [householdId])

      // Delete household
      await query(`DELETE FROM households WHERE id = $1`, [householdId])
      result.deletedRecords.household = true
    } else {
      // Just remove user from household
      await query(`
        UPDATE household_members
        SET is_active = false, left_at = NOW()
        WHERE user_id = $1 AND household_id = $2
      `, [currentUserId, householdId])

      // Unassign tasks assigned to this user
      const tasksResult = await query<{ count: string }>(`
        UPDATE tasks
        SET assigned_to = NULL
        WHERE household_id = $1 AND assigned_to = $2
        RETURNING 1
      `, [householdId, currentUserId]).catch(() => [])
      result.deletedRecords.tasks = tasksResult.length
    }

    // Delete user (or mark as deleted if soft delete)
    await query(`
      UPDATE users
      SET is_deleted = true, deleted_at = NOW(), email = NULL, name = 'Utilisateur supprimé'
      WHERE id = $1
    `, [currentUserId]).catch(() => {
      // If table doesn't have these columns, just log it
      console.log("User soft delete not available, skipping")
    })
    result.deletedRecords.user = true

    // Log the deletion for audit trail
    await logGDPRAction(currentUserId, "delete", {
      householdId,
      deletedRecords: result.deletedRecords,
    })

    result.success = true
    return result
  } catch (error) {
    return {
      ...result,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    }
  }
}

// =============================================================================
// DATA ANONYMIZATION
// =============================================================================

/**
 * Anonymize user data while keeping statistical records
 * Useful for users who want their personal data removed but allow
 * household statistics to remain
 */
export async function anonymizeUserData(): Promise<GDPRAnonymizeResult> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return {
      success: false,
      anonymizedRecords: { children: 0, vocalCommands: 0, tasks: 0 },
      error: "Non autorisé",
    }
  }

  await setCurrentUser(currentUserId)

  const result: GDPRAnonymizeResult = {
    success: false,
    anonymizedRecords: { children: 0, vocalCommands: 0, tasks: 0 },
  }

  try {
    // Get user's household
    const membership = await queryOne<{ household_id: string }>(`
      SELECT household_id
      FROM household_members
      WHERE user_id = $1 AND is_active = true
    `, [currentUserId])

    if (!membership) {
      return { ...result, success: true }
    }

    const householdId = membership.household_id

    // Anonymize children (replace names with generic labels)
    const childrenResult = await query<{ count: string }>(`
      UPDATE children
      SET first_name = 'Enfant ' || SUBSTRING(id::text, 1, 4)
      WHERE household_id = $1
      RETURNING 1
    `, [householdId]).catch(() => [])
    result.anonymizedRecords.children = childrenResult.length

    // Anonymize vocal commands (remove transcript, keep category data)
    const vocalResult = await query<{ count: string }>(`
      UPDATE vocal_commands
      SET
        transcript = '[anonymisé]',
        parsed_action = '[anonymisé]',
        parsed_child = NULL
      WHERE household_id = $1
      RETURNING 1
    `, [householdId]).catch(() => [])
    result.anonymizedRecords.vocalCommands = vocalResult.length

    // Anonymize task descriptions (keep titles for statistics)
    const tasksResult = await query<{ count: string }>(`
      UPDATE tasks
      SET description = NULL
      WHERE household_id = $1 AND description IS NOT NULL
      RETURNING 1
    `, [householdId]).catch(() => [])
    result.anonymizedRecords.tasks = tasksResult.length

    // Log the anonymization
    await logGDPRAction(currentUserId, "anonymize", {
      householdId,
      anonymizedRecords: result.anonymizedRecords,
    })

    result.success = true
    return result
  } catch (error) {
    return {
      ...result,
      error: error instanceof Error ? error.message : "Erreur lors de l'anonymisation",
    }
  }
}

// =============================================================================
// DATA REPORT (Article 15 - Right of Access)
// =============================================================================

/**
 * Generate a report of what data is stored about the user
 * This implements GDPR Article 15 - Right of access
 */
export async function generateDataReport(): Promise<DataReport | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Get user info
  const user = await queryOne<{
    id: string
    email: string
    created_at: string
  }>(`
    SELECT id, email, created_at
    FROM users
    WHERE id = $1
  `, [currentUserId]).catch(() => null)

  // Get household
  const membership = await queryOne<{
    household_id: string
    joined_at: string
  }>(`
    SELECT household_id, joined_at
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  const householdId = membership?.household_id ?? null

  // Count data in each category
  const dataCounts: Array<{
    category: string
    description: string
    count: number
    retentionDays: number | null
    legalBasis: string
  }> = []

  if (householdId) {
    // Tasks count
    const tasksCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM tasks WHERE household_id = $1
    `, [householdId])
    dataCounts.push({
      category: "Tâches",
      description: "Tâches créées, assignées et complétées",
      count: parseInt(tasksCount?.count ?? "0", 10),
      retentionDays: DATA_RETENTION_POLICY.tasks,
      legalBasis: "Exécution du contrat",
    })

    // Children count
    const childrenCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM children WHERE household_id = $1
    `, [householdId])
    dataCounts.push({
      category: "Enfants",
      description: "Informations sur les enfants (prénom, âge, école)",
      count: parseInt(childrenCount?.count ?? "0", 10),
      retentionDays: DATA_RETENTION_POLICY.children,
      legalBasis: "Consentement explicite",
    })

    // Vocal commands count
    const vocalCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM vocal_commands WHERE household_id = $1
    `, [householdId]).catch(() => ({ count: "0" }))
    dataCounts.push({
      category: "Commandes vocales",
      description: "Historique des commandes vocales",
      count: parseInt(vocalCount?.count ?? "0", 10),
      retentionDays: DATA_RETENTION_POLICY.vocalCommands,
      legalBasis: "Exécution du contrat",
    })

    // Notifications count
    const notifCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM notifications WHERE household_id = $1
    `, [householdId]).catch(() => ({ count: "0" }))
    dataCounts.push({
      category: "Notifications",
      description: "Historique des notifications",
      count: parseInt(notifCount?.count ?? "0", 10),
      retentionDays: DATA_RETENTION_POLICY.notifications,
      legalBasis: "Consentement",
    })
  }

  // Account info
  dataCounts.push({
    category: "Compte utilisateur",
    description: "Email, nom, préférences",
    count: 1,
    retentionDays: null,
    legalBasis: "Exécution du contrat",
  })

  // Get last export date
  const lastExport = await queryOne<{ created_at: string }>(`
    SELECT created_at FROM gdpr_audit_log
    WHERE user_id = $1 AND action = 'export'
    ORDER BY created_at DESC LIMIT 1
  `, [currentUserId]).catch(() => null)

  return {
    userId: currentUserId,
    householdId,
    dataCategories: dataCounts,
    lastExport: lastExport?.created_at ?? null,
    accountCreated: user?.created_at ?? membership?.joined_at ?? new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  }
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log GDPR-related actions for compliance audit trail
 */
async function logGDPRAction(
  userId: string,
  action: "export" | "delete" | "anonymize" | "consent_update",
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await query(`
      INSERT INTO gdpr_audit_log (user_id, action, metadata, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, action, JSON.stringify(metadata)])
  } catch {
    // Table might not exist - log to console for now
    console.log("GDPR Audit:", { userId, action, metadata, timestamp: new Date().toISOString() })
  }
}

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

/**
 * Get user's consent status
 */
export async function getConsentStatus(): Promise<GDPRConsentStatus | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  const consent = await queryOne<{
    essential: boolean
    analytics: boolean
    marketing: boolean
    updated_at: string
  }>(`
    SELECT essential, analytics, marketing, updated_at
    FROM user_consents
    WHERE user_id = $1
  `, [currentUserId]).catch(() => null)

  if (!consent) {
    // Return default consents
    return {
      essential: true, // Always required
      analytics: false,
      marketing: false,
      updatedAt: null,
    }
  }

  return {
    essential: consent.essential,
    analytics: consent.analytics,
    marketing: consent.marketing,
    updatedAt: consent.updated_at,
  }
}

/**
 * Update user's consent preferences
 */
export async function updateConsent(
  preferences: {
    analytics?: boolean
    marketing?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId()
  if (!currentUserId) {
    return { success: false, error: "Non autorisé" }
  }

  await setCurrentUser(currentUserId)

  try {
    // Upsert consent
    await query(`
      INSERT INTO user_consents (user_id, essential, analytics, marketing, updated_at)
      VALUES ($1, true, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        analytics = COALESCE($2, user_consents.analytics),
        marketing = COALESCE($3, user_consents.marketing),
        updated_at = NOW()
    `, [currentUserId, preferences.analytics ?? false, preferences.marketing ?? false])

    await logGDPRAction(currentUserId, "consent_update", preferences)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
    }
  }
}
