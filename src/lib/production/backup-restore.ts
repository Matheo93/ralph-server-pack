/**
 * Backup & Restore Module
 *
 * Production-grade backup and recovery system with:
 * - Point-in-time recovery
 * - Data export automation
 * - Disaster recovery
 * - Incremental backups
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export type BackupStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "verified"
  | "corrupted"

export type BackupType =
  | "full"
  | "incremental"
  | "differential"
  | "snapshot"

export type ExportFormat =
  | "json"
  | "csv"
  | "sql"
  | "parquet"

export type RecoveryStrategy =
  | "full_restore"
  | "point_in_time"
  | "table_restore"
  | "row_level"

export interface BackupMetadata {
  id: string
  type: BackupType
  status: BackupStatus
  startedAt: Date
  completedAt?: Date
  size: number
  checksum: string
  tables: string[]
  rowCounts: Record<string, number>
  parentBackupId?: string
  retentionDays: number
  encrypted: boolean
  compressed: boolean
  location: string
  metadata: Record<string, unknown>
}

export interface BackupConfig {
  type: BackupType
  tables?: string[]
  excludeTables?: string[]
  retentionDays: number
  encrypt: boolean
  compress: boolean
  location: string
  schedule?: BackupSchedule
}

export interface BackupSchedule {
  frequency: "hourly" | "daily" | "weekly" | "monthly"
  hour?: number
  dayOfWeek?: number
  dayOfMonth?: number
  timezone: string
}

export interface RestorePoint {
  id: string
  backupId: string
  timestamp: Date
  description: string
  type: "automatic" | "manual"
  tables: string[]
}

export interface RestoreConfig {
  backupId: string
  strategy: RecoveryStrategy
  targetTimestamp?: Date
  tables?: string[]
  rowFilter?: string
  dryRun: boolean
  overwrite: boolean
}

export interface RestoreResult {
  success: boolean
  strategy: RecoveryStrategy
  restoredTables: string[]
  restoredRows: Record<string, number>
  skippedTables: string[]
  errors: RestoreError[]
  startedAt: Date
  completedAt: Date
  duration: number
}

export interface RestoreError {
  table: string
  rowId?: string
  message: string
  recoverable: boolean
}

export interface ExportConfig {
  format: ExportFormat
  tables: string[]
  includeSchema: boolean
  includeData: boolean
  filters?: Record<string, unknown>
  dateRange?: {
    start: Date
    end: Date
  }
  location: string
}

export interface ExportResult {
  success: boolean
  format: ExportFormat
  files: ExportedFile[]
  totalRows: number
  totalSize: number
  duration: number
}

export interface ExportedFile {
  table: string
  path: string
  size: number
  rowCount: number
  checksum: string
}

export interface DisasterRecoveryPlan {
  id: string
  name: string
  description: string
  rto: number // Recovery Time Objective in minutes
  rpo: number // Recovery Point Objective in minutes
  steps: RecoveryStep[]
  contacts: EmergencyContact[]
  lastTested?: Date
  testResults?: DisasterRecoveryTestResult
}

export interface RecoveryStep {
  order: number
  name: string
  description: string
  automated: boolean
  estimatedMinutes: number
  dependencies: string[]
  script?: string
}

export interface EmergencyContact {
  name: string
  role: string
  email: string
  phone: string
  priority: number
}

export interface DisasterRecoveryTestResult {
  success: boolean
  actualRto: number
  actualRpo: number
  stepsCompleted: number
  totalSteps: number
  issues: string[]
  testedAt: Date
}

// Zod Schemas
export const BackupMetadataSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["full", "incremental", "differential", "snapshot"]),
  status: z.enum(["pending", "in_progress", "completed", "failed", "verified", "corrupted"]),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  size: z.number().nonnegative(),
  checksum: z.string(),
  tables: z.array(z.string()),
  rowCounts: z.record(z.string(), z.number()),
  parentBackupId: z.string().optional(),
  retentionDays: z.number().positive(),
  encrypted: z.boolean(),
  compressed: z.boolean(),
  location: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
})

export const BackupConfigSchema = z.object({
  type: z.enum(["full", "incremental", "differential", "snapshot"]),
  tables: z.array(z.string()).optional(),
  excludeTables: z.array(z.string()).optional(),
  retentionDays: z.number().positive(),
  encrypt: z.boolean(),
  compress: z.boolean(),
  location: z.string().min(1),
})

// =============================================================================
// BACKUP CREATION
// =============================================================================

/**
 * Create backup metadata
 */
export function createBackupMetadata(
  config: BackupConfig,
  tables: string[]
): BackupMetadata {
  return {
    id: `backup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: config.type,
    status: "pending",
    startedAt: new Date(),
    size: 0,
    checksum: "",
    tables,
    rowCounts: {},
    retentionDays: config.retentionDays,
    encrypted: config.encrypt,
    compressed: config.compress,
    location: config.location,
    metadata: {},
  }
}

/**
 * Start backup
 */
export function startBackup(backup: BackupMetadata): BackupMetadata {
  return {
    ...backup,
    status: "in_progress",
    startedAt: new Date(),
  }
}

/**
 * Update backup progress
 */
export function updateBackupProgress(
  backup: BackupMetadata,
  table: string,
  rowCount: number,
  sizeAdded: number
): BackupMetadata {
  return {
    ...backup,
    rowCounts: {
      ...backup.rowCounts,
      [table]: rowCount,
    },
    size: backup.size + sizeAdded,
  }
}

/**
 * Complete backup
 */
export function completeBackup(
  backup: BackupMetadata,
  checksum: string
): BackupMetadata {
  return {
    ...backup,
    status: "completed",
    completedAt: new Date(),
    checksum,
  }
}

/**
 * Fail backup
 */
export function failBackup(
  backup: BackupMetadata,
  reason: string
): BackupMetadata {
  return {
    ...backup,
    status: "failed",
    completedAt: new Date(),
    metadata: {
      ...backup.metadata,
      failureReason: reason,
    },
  }
}

/**
 * Verify backup
 */
export function verifyBackup(
  backup: BackupMetadata,
  valid: boolean
): BackupMetadata {
  return {
    ...backup,
    status: valid ? "verified" : "corrupted",
  }
}

// =============================================================================
// BACKUP CHAIN MANAGEMENT
// =============================================================================

/**
 * Create incremental backup chain link
 */
export function createIncrementalBackup(
  parentBackup: BackupMetadata,
  config: BackupConfig,
  tables: string[]
): BackupMetadata {
  const backup = createBackupMetadata(config, tables)
  return {
    ...backup,
    type: "incremental",
    parentBackupId: parentBackup.id,
  }
}

/**
 * Get backup chain
 */
export function getBackupChain(
  backups: BackupMetadata[],
  targetBackupId: string
): BackupMetadata[] {
  const chain: BackupMetadata[] = []
  let currentId: string | undefined = targetBackupId

  while (currentId) {
    const backup = backups.find(b => b.id === currentId)
    if (!backup) break

    chain.unshift(backup)

    if (backup.type === "full") break
    currentId = backup.parentBackupId
  }

  return chain
}

/**
 * Find latest full backup
 */
export function findLatestFullBackup(
  backups: BackupMetadata[]
): BackupMetadata | undefined {
  const fullBackups = backups
    .filter(b => b.type === "full" && b.status === "verified")
    .sort((a, b) => (b.startedAt.getTime()) - (a.startedAt.getTime()))

  return fullBackups[0]
}

/**
 * Get valid incremental chain from a full backup
 */
export function getIncrementalChainFromFull(
  backups: BackupMetadata[],
  fullBackupId: string
): BackupMetadata[] {
  const chain: BackupMetadata[] = []

  const fullBackup = backups.find(b => b.id === fullBackupId)
  if (!fullBackup || fullBackup.type !== "full") return chain

  chain.push(fullBackup)

  // Find all incrementals that depend on this full backup
  const incrementals = backups
    .filter(b =>
      b.type === "incremental" &&
      (b.status === "verified" || b.status === "completed")
    )
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  for (const inc of incrementals) {
    if (inc.parentBackupId === chain[chain.length - 1]?.id) {
      chain.push(inc)
    }
  }

  return chain
}

// =============================================================================
// RESTORE OPERATIONS
// =============================================================================

/**
 * Create restore point
 */
export function createRestorePoint(
  backupId: string,
  description: string,
  tables: string[],
  manual: boolean = true
): RestorePoint {
  return {
    id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    backupId,
    timestamp: new Date(),
    description,
    type: manual ? "manual" : "automatic",
    tables,
  }
}

/**
 * Find restore point for timestamp
 */
export function findRestorePointForTimestamp(
  restorePoints: RestorePoint[],
  targetTimestamp: Date
): RestorePoint | undefined {
  const validPoints = restorePoints
    .filter(rp => rp.timestamp <= targetTimestamp)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return validPoints[0]
}

/**
 * Create restore config
 */
export function createRestoreConfig(
  backupId: string,
  strategy: RecoveryStrategy,
  options: Partial<RestoreConfig> = {}
): RestoreConfig {
  return {
    backupId,
    strategy,
    dryRun: options.dryRun ?? false,
    overwrite: options.overwrite ?? false,
    targetTimestamp: options.targetTimestamp,
    tables: options.tables,
    rowFilter: options.rowFilter,
  }
}

/**
 * Validate restore config
 */
export function validateRestoreConfig(
  config: RestoreConfig,
  backups: BackupMetadata[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const backup = backups.find(b => b.id === config.backupId)
  if (!backup) {
    errors.push(`Backup ${config.backupId} not found`)
    return { valid: false, errors }
  }

  if (backup.status !== "verified" && backup.status !== "completed") {
    errors.push(`Backup ${config.backupId} is not in a valid state: ${backup.status}`)
  }

  if (config.strategy === "point_in_time" && !config.targetTimestamp) {
    errors.push("Point-in-time restore requires targetTimestamp")
  }

  if (config.strategy === "table_restore" && (!config.tables || config.tables.length === 0)) {
    errors.push("Table restore requires at least one table")
  }

  if (config.tables) {
    for (const table of config.tables) {
      if (!backup.tables.includes(table)) {
        errors.push(`Table ${table} not found in backup`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create restore result
 */
export function createRestoreResult(
  strategy: RecoveryStrategy,
  startTime: Date
): RestoreResult {
  return {
    success: false,
    strategy,
    restoredTables: [],
    restoredRows: {},
    skippedTables: [],
    errors: [],
    startedAt: startTime,
    completedAt: new Date(),
    duration: 0,
  }
}

/**
 * Complete restore result
 */
export function completeRestoreResult(
  result: RestoreResult,
  success: boolean
): RestoreResult {
  const completedAt = new Date()
  return {
    ...result,
    success,
    completedAt,
    duration: completedAt.getTime() - result.startedAt.getTime(),
  }
}

/**
 * Add restored table to result
 */
export function addRestoredTable(
  result: RestoreResult,
  table: string,
  rowCount: number
): RestoreResult {
  return {
    ...result,
    restoredTables: [...result.restoredTables, table],
    restoredRows: {
      ...result.restoredRows,
      [table]: rowCount,
    },
  }
}

/**
 * Add restore error
 */
export function addRestoreError(
  result: RestoreResult,
  error: RestoreError
): RestoreResult {
  return {
    ...result,
    errors: [...result.errors, error],
  }
}

// =============================================================================
// DATA EXPORT
// =============================================================================

/**
 * Create export config
 */
export function createExportConfig(
  format: ExportFormat,
  tables: string[],
  location: string,
  options: Partial<ExportConfig> = {}
): ExportConfig {
  return {
    format,
    tables,
    location,
    includeSchema: options.includeSchema ?? true,
    includeData: options.includeData ?? true,
    filters: options.filters,
    dateRange: options.dateRange,
  }
}

/**
 * Generate export file name
 */
export function generateExportFileName(
  table: string,
  format: ExportFormat,
  timestamp: Date = new Date()
): string {
  const dateStr = timestamp.toISOString().replace(/[:.]/g, "-")
  return `${table}_${dateStr}.${format}`
}

/**
 * Create export result
 */
export function createExportResult(format: ExportFormat): ExportResult {
  return {
    success: false,
    format,
    files: [],
    totalRows: 0,
    totalSize: 0,
    duration: 0,
  }
}

/**
 * Add exported file
 */
export function addExportedFile(
  result: ExportResult,
  file: ExportedFile
): ExportResult {
  return {
    ...result,
    files: [...result.files, file],
    totalRows: result.totalRows + file.rowCount,
    totalSize: result.totalSize + file.size,
  }
}

/**
 * Complete export result
 */
export function completeExportResult(
  result: ExportResult,
  duration: number,
  success: boolean
): ExportResult {
  return {
    ...result,
    success,
    duration,
  }
}

// =============================================================================
// FORMAT CONVERTERS
// =============================================================================

/**
 * Convert data to JSON export format
 */
export function toJsonExport(
  data: Record<string, unknown>[],
  pretty: boolean = true
): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
}

/**
 * Convert data to CSV export format
 */
export function toCsvExport(
  data: Record<string, unknown>[],
  headers?: string[]
): string {
  if (data.length === 0) return ""

  const actualHeaders = headers ?? Object.keys(data[0]!)
  const lines: string[] = []

  // Header row
  lines.push(actualHeaders.join(","))

  // Data rows
  for (const row of data) {
    const values = actualHeaders.map(h => {
      const value = row[h]
      if (value === null || value === undefined) return ""
      if (typeof value === "string") {
        // Escape quotes and wrap in quotes if contains special chars
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }
      return String(value)
    })
    lines.push(values.join(","))
  }

  return lines.join("\n")
}

/**
 * Convert data to SQL INSERT statements
 */
export function toSqlExport(
  data: Record<string, unknown>[],
  tableName: string
): string {
  if (data.length === 0) return ""

  const lines: string[] = []

  for (const row of data) {
    const columns = Object.keys(row)
    const values = Object.values(row).map(v => {
      if (v === null || v === undefined) return "NULL"
      if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE"
      if (v instanceof Date) return `'${v.toISOString()}'`
      return String(v)
    })

    lines.push(`INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`)
  }

  return lines.join("\n")
}

// =============================================================================
// DISASTER RECOVERY
// =============================================================================

/**
 * Create disaster recovery plan
 */
export function createDisasterRecoveryPlan(
  name: string,
  description: string,
  rto: number,
  rpo: number
): DisasterRecoveryPlan {
  return {
    id: `drp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    description,
    rto,
    rpo,
    steps: [],
    contacts: [],
  }
}

/**
 * Add recovery step
 */
export function addRecoveryStep(
  plan: DisasterRecoveryPlan,
  step: Omit<RecoveryStep, "order">
): DisasterRecoveryPlan {
  const order = plan.steps.length + 1
  return {
    ...plan,
    steps: [...plan.steps, { ...step, order }],
  }
}

/**
 * Add emergency contact
 */
export function addEmergencyContact(
  plan: DisasterRecoveryPlan,
  contact: EmergencyContact
): DisasterRecoveryPlan {
  return {
    ...plan,
    contacts: [...plan.contacts, contact].sort((a, b) => a.priority - b.priority),
  }
}

/**
 * Record DR test result
 */
export function recordDRTestResult(
  plan: DisasterRecoveryPlan,
  result: DisasterRecoveryTestResult
): DisasterRecoveryPlan {
  return {
    ...plan,
    lastTested: result.testedAt,
    testResults: result,
  }
}

/**
 * Check if DR plan meets objectives
 */
export function checkDRObjectives(
  plan: DisasterRecoveryPlan,
  testResult: DisasterRecoveryTestResult
): { meetsRto: boolean; meetsRpo: boolean; recommendations: string[] } {
  const meetsRto = testResult.actualRto <= plan.rto
  const meetsRpo = testResult.actualRpo <= plan.rpo
  const recommendations: string[] = []

  if (!meetsRto) {
    recommendations.push(
      `RTO exceeded by ${testResult.actualRto - plan.rto} minutes. Consider automating more recovery steps.`
    )
  }

  if (!meetsRpo) {
    recommendations.push(
      `RPO exceeded by ${testResult.actualRpo - plan.rpo} minutes. Consider increasing backup frequency.`
    )
  }

  if (!testResult.success) {
    recommendations.push(
      `Test did not complete successfully. Review issues: ${testResult.issues.join(", ")}`
    )
  }

  if (testResult.stepsCompleted < testResult.totalSteps) {
    const incomplete = testResult.totalSteps - testResult.stepsCompleted
    recommendations.push(
      `${incomplete} recovery steps could not be completed. Review and update procedures.`
    )
  }

  return { meetsRto, meetsRpo, recommendations }
}

/**
 * Calculate estimated recovery time
 */
export function calculateEstimatedRecoveryTime(
  plan: DisasterRecoveryPlan
): number {
  return plan.steps.reduce((total, step) => total + step.estimatedMinutes, 0)
}

/**
 * Get recovery step dependencies
 */
export function getStepDependencies(
  plan: DisasterRecoveryPlan,
  stepOrder: number
): RecoveryStep[] {
  const step = plan.steps.find(s => s.order === stepOrder)
  if (!step) return []

  return plan.steps.filter(s =>
    step.dependencies.includes(s.name)
  )
}

// =============================================================================
// BACKUP STORE
// =============================================================================

export interface BackupStore {
  backups: Map<string, BackupMetadata>
  restorePoints: RestorePoint[]
  drPlans: Map<string, DisasterRecoveryPlan>
  retentionPolicy: RetentionPolicy
}

export interface RetentionPolicy {
  dailyBackups: number
  weeklyBackups: number
  monthlyBackups: number
  yearlyBackups: number
}

/**
 * Create backup store
 */
export function createBackupStore(
  retentionPolicy: RetentionPolicy = {
    dailyBackups: 7,
    weeklyBackups: 4,
    monthlyBackups: 12,
    yearlyBackups: 3,
  }
): BackupStore {
  return {
    backups: new Map(),
    restorePoints: [],
    drPlans: new Map(),
    retentionPolicy,
  }
}

/**
 * Add backup to store
 */
export function addBackupToStore(
  store: BackupStore,
  backup: BackupMetadata
): BackupStore {
  const backups = new Map(store.backups)
  backups.set(backup.id, backup)

  return {
    ...store,
    backups,
  }
}

/**
 * Get backup from store
 */
export function getBackupFromStore(
  store: BackupStore,
  backupId: string
): BackupMetadata | undefined {
  return store.backups.get(backupId)
}

/**
 * List backups by type
 */
export function listBackupsByType(
  store: BackupStore,
  type: BackupType
): BackupMetadata[] {
  return Array.from(store.backups.values())
    .filter(b => b.type === type)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
}

/**
 * Add restore point to store
 */
export function addRestorePointToStore(
  store: BackupStore,
  restorePoint: RestorePoint
): BackupStore {
  return {
    ...store,
    restorePoints: [...store.restorePoints, restorePoint],
  }
}

/**
 * Add DR plan to store
 */
export function addDRPlanToStore(
  store: BackupStore,
  plan: DisasterRecoveryPlan
): BackupStore {
  const drPlans = new Map(store.drPlans)
  drPlans.set(plan.id, plan)

  return {
    ...store,
    drPlans,
  }
}

/**
 * Get expired backups
 */
export function getExpiredBackups(
  store: BackupStore,
  now: Date = new Date()
): BackupMetadata[] {
  const expired: BackupMetadata[] = []

  for (const backup of store.backups.values()) {
    const expirationDate = new Date(backup.startedAt)
    expirationDate.setDate(expirationDate.getDate() + backup.retentionDays)

    if (expirationDate < now) {
      expired.push(backup)
    }
  }

  return expired
}

/**
 * Remove backup from store
 */
export function removeBackupFromStore(
  store: BackupStore,
  backupId: string
): BackupStore {
  const backups = new Map(store.backups)
  backups.delete(backupId)

  // Also remove associated restore points
  const restorePoints = store.restorePoints.filter(
    rp => rp.backupId !== backupId
  )

  return {
    ...store,
    backups,
    restorePoints,
  }
}

// =============================================================================
// CHECKSUM & VERIFICATION
// =============================================================================

/**
 * Simple hash function for checksums
 */
export function simpleHash(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}

/**
 * Calculate checksum for data
 */
export function calculateChecksum(data: Record<string, unknown>[]): string {
  const jsonStr = JSON.stringify(data)
  return simpleHash(jsonStr)
}

/**
 * Verify backup checksum
 */
export function verifyChecksum(
  data: Record<string, unknown>[],
  expectedChecksum: string
): boolean {
  const actualChecksum = calculateChecksum(data)
  return actualChecksum === expectedChecksum
}

// =============================================================================
// BACKUP SCHEDULING
// =============================================================================

/**
 * Get next scheduled backup time
 */
export function getNextScheduledBackupTime(
  schedule: BackupSchedule,
  from: Date = new Date()
): Date {
  const next = new Date(from)

  switch (schedule.frequency) {
    case "hourly":
      next.setHours(next.getHours() + 1)
      next.setMinutes(0)
      next.setSeconds(0)
      next.setMilliseconds(0)
      break

    case "daily":
      next.setDate(next.getDate() + 1)
      next.setHours(schedule.hour ?? 0)
      next.setMinutes(0)
      next.setSeconds(0)
      next.setMilliseconds(0)
      break

    case "weekly":
      const daysUntilTarget = ((schedule.dayOfWeek ?? 0) - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntilTarget)
      next.setHours(schedule.hour ?? 0)
      next.setMinutes(0)
      next.setSeconds(0)
      next.setMilliseconds(0)
      break

    case "monthly":
      next.setMonth(next.getMonth() + 1)
      next.setDate(schedule.dayOfMonth ?? 1)
      next.setHours(schedule.hour ?? 0)
      next.setMinutes(0)
      next.setSeconds(0)
      next.setMilliseconds(0)
      break
  }

  return next
}

/**
 * Check if backup is due
 */
export function isBackupDue(
  schedule: BackupSchedule,
  lastBackupTime: Date | undefined,
  now: Date = new Date()
): boolean {
  if (!lastBackupTime) return true

  const nextScheduled = getNextScheduledBackupTime(schedule, lastBackupTime)
  return now >= nextScheduled
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format backup size
 */
export function formatBackupSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]!}`
}

/**
 * Calculate backup storage used
 */
export function calculateStorageUsed(backups: BackupMetadata[]): number {
  return backups.reduce((total, backup) => total + backup.size, 0)
}

/**
 * Generate backup report
 */
export function generateBackupReport(store: BackupStore): string {
  const lines: string[] = []
  const allBackups = Array.from(store.backups.values())

  lines.push("=== Backup Report ===")
  lines.push("")
  lines.push(`Total Backups: ${allBackups.length}`)
  lines.push(`Total Storage: ${formatBackupSize(calculateStorageUsed(allBackups))}`)
  lines.push("")

  const byType = {
    full: allBackups.filter(b => b.type === "full"),
    incremental: allBackups.filter(b => b.type === "incremental"),
    differential: allBackups.filter(b => b.type === "differential"),
    snapshot: allBackups.filter(b => b.type === "snapshot"),
  }

  for (const [type, backups] of Object.entries(byType)) {
    if (backups.length > 0) {
      lines.push(`${type}: ${backups.length} backups (${formatBackupSize(calculateStorageUsed(backups))})`)
    }
  }

  lines.push("")

  const byStatus = {
    verified: allBackups.filter(b => b.status === "verified"),
    completed: allBackups.filter(b => b.status === "completed"),
    failed: allBackups.filter(b => b.status === "failed"),
    corrupted: allBackups.filter(b => b.status === "corrupted"),
  }

  lines.push("Status:")
  for (const [status, backups] of Object.entries(byStatus)) {
    if (backups.length > 0) {
      lines.push(`  ${status}: ${backups.length}`)
    }
  }

  const expired = getExpiredBackups(store)
  if (expired.length > 0) {
    lines.push("")
    lines.push(`Expired Backups: ${expired.length} (ready for cleanup)`)
  }

  lines.push("")
  lines.push(`Restore Points: ${store.restorePoints.length}`)
  lines.push(`DR Plans: ${store.drPlans.size}`)

  return lines.join("\n")
}

/**
 * Generate restore instructions
 */
export function generateRestoreInstructions(
  backup: BackupMetadata,
  config: RestoreConfig
): string {
  const lines: string[] = []

  lines.push("=== Restore Instructions ===")
  lines.push("")
  lines.push(`Backup ID: ${backup.id}`)
  lines.push(`Backup Type: ${backup.type}`)
  lines.push(`Strategy: ${config.strategy}`)
  lines.push("")

  if (config.dryRun) {
    lines.push("MODE: DRY RUN (no changes will be made)")
    lines.push("")
  }

  lines.push("Tables to restore:")
  const tablesToRestore = config.tables ?? backup.tables
  for (const table of tablesToRestore) {
    const rowCount = backup.rowCounts[table] ?? 0
    lines.push(`  - ${table}: ${rowCount} rows`)
  }

  if (config.targetTimestamp) {
    lines.push("")
    lines.push(`Target Timestamp: ${config.targetTimestamp.toISOString()}`)
  }

  lines.push("")
  lines.push("Steps:")
  lines.push("1. Validate backup integrity")
  lines.push("2. Create pre-restore snapshot")

  if (backup.type === "incremental") {
    lines.push("3. Restore full backup base")
    lines.push("4. Apply incremental changes")
  } else {
    lines.push("3. Restore backup data")
  }

  lines.push("5. Verify restored data")
  lines.push("6. Update restore point")

  return lines.join("\n")
}
