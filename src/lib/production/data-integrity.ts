/**
 * Data Integrity Module
 *
 * Production-grade data integrity system with:
 * - Transaction management
 * - Data validation layers
 * - Consistency checks
 * - Rollback capabilities
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export type TransactionStatus =
  | "pending"
  | "in_progress"
  | "committed"
  | "rolled_back"
  | "failed"

export type ValidationSeverity = "error" | "warning" | "info"

export type ConsistencyCheckType =
  | "referential_integrity"
  | "data_format"
  | "business_rule"
  | "uniqueness"
  | "range"
  | "dependency"

export interface TransactionOperation {
  id: string
  type: "insert" | "update" | "delete"
  table: string
  data: Record<string, unknown>
  previousData?: Record<string, unknown>
  timestamp: Date
}

export interface Transaction {
  id: string
  status: TransactionStatus
  operations: TransactionOperation[]
  startedAt: Date
  completedAt?: Date
  rollbackPoint?: string
  metadata: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  field?: string
  message: string
  severity: ValidationSeverity
  code: string
  context?: Record<string, unknown>
}

export interface ValidationRule {
  id: string
  name: string
  field: string
  validator: (value: unknown, context: Record<string, unknown>) => boolean
  message: string
  severity: ValidationSeverity
}

export interface ConsistencyCheck {
  id: string
  type: ConsistencyCheckType
  name: string
  description: string
  tables: string[]
  check: (data: ConsistencyCheckData) => ConsistencyCheckResult
}

export interface ConsistencyCheckData {
  tables: Map<string, Record<string, unknown>[]>
  context?: Record<string, unknown>
}

export interface ConsistencyCheckResult {
  passed: boolean
  checkId: string
  violations: ConsistencyViolation[]
  checkedAt: Date
  duration: number
}

export interface ConsistencyViolation {
  table: string
  recordId: string
  field?: string
  message: string
  severity: ValidationSeverity
  suggestedFix?: string
}

export interface IntegrityReport {
  overallStatus: "healthy" | "warnings" | "errors"
  checksRun: number
  checksPassed: number
  checksFailed: number
  totalViolations: number
  violationsBySeverity: Record<ValidationSeverity, number>
  results: ConsistencyCheckResult[]
  generatedAt: Date
  duration: number
}

export interface DataSnapshot {
  id: string
  tables: Map<string, Record<string, unknown>[]>
  createdAt: Date
  metadata: Record<string, unknown>
}

// Zod Schemas
export const TransactionOperationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["insert", "update", "delete"]),
  table: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  previousData: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.date(),
})

export const TransactionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "in_progress", "committed", "rolled_back", "failed"]),
  operations: z.array(TransactionOperationSchema),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  rollbackPoint: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
})

// =============================================================================
// TRANSACTION MANAGEMENT
// =============================================================================

/**
 * Create a new transaction
 */
export function createTransaction(metadata: Record<string, unknown> = {}): Transaction {
  return {
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: "pending",
    operations: [],
    startedAt: new Date(),
    metadata,
  }
}

/**
 * Add operation to transaction
 */
export function addOperation(
  transaction: Transaction,
  operation: Omit<TransactionOperation, "id" | "timestamp">
): Transaction {
  if (transaction.status !== "pending" && transaction.status !== "in_progress") {
    throw new Error(`Cannot add operation to transaction with status: ${transaction.status}`)
  }

  const newOperation: TransactionOperation = {
    ...operation,
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
  }

  return {
    ...transaction,
    status: "in_progress",
    operations: [...transaction.operations, newOperation],
  }
}

/**
 * Set rollback point in transaction
 */
export function setRollbackPoint(
  transaction: Transaction,
  pointId?: string
): Transaction {
  if (transaction.status !== "in_progress") {
    throw new Error("Can only set rollback point in in_progress transaction")
  }

  const rollbackPoint = pointId || `rbp_${Date.now()}`

  return {
    ...transaction,
    rollbackPoint,
  }
}

/**
 * Commit transaction
 */
export function commitTransaction(transaction: Transaction): Transaction {
  if (transaction.status !== "in_progress") {
    throw new Error(`Cannot commit transaction with status: ${transaction.status}`)
  }

  return {
    ...transaction,
    status: "committed",
    completedAt: new Date(),
  }
}

/**
 * Rollback transaction
 */
export function rollbackTransaction(
  transaction: Transaction,
  toPoint?: string
): Transaction {
  if (transaction.status !== "in_progress") {
    throw new Error(`Cannot rollback transaction with status: ${transaction.status}`)
  }

  let operationsToKeep = transaction.operations

  if (toPoint) {
    const pointIndex = operationsToKeep.findIndex(op => op.id === toPoint)
    if (pointIndex >= 0) {
      operationsToKeep = operationsToKeep.slice(0, pointIndex)
    }
  } else {
    operationsToKeep = []
  }

  return {
    ...transaction,
    status: "rolled_back",
    operations: operationsToKeep,
    completedAt: new Date(),
  }
}

/**
 * Mark transaction as failed
 */
export function failTransaction(
  transaction: Transaction,
  reason: string
): Transaction {
  return {
    ...transaction,
    status: "failed",
    completedAt: new Date(),
    metadata: {
      ...transaction.metadata,
      failureReason: reason,
    },
  }
}

/**
 * Generate rollback operations for a transaction
 */
export function generateRollbackOperations(
  transaction: Transaction
): TransactionOperation[] {
  const rollbackOps: TransactionOperation[] = []

  // Process operations in reverse order
  for (let i = transaction.operations.length - 1; i >= 0; i--) {
    const op = transaction.operations[i]!

    switch (op.type) {
      case "insert":
        // Rollback insert by deleting
        rollbackOps.push({
          id: `rollback_${op.id}`,
          type: "delete",
          table: op.table,
          data: op.data,
          timestamp: new Date(),
        })
        break

      case "delete":
        // Rollback delete by re-inserting
        if (op.previousData) {
          rollbackOps.push({
            id: `rollback_${op.id}`,
            type: "insert",
            table: op.table,
            data: op.previousData,
            timestamp: new Date(),
          })
        }
        break

      case "update":
        // Rollback update by restoring previous data
        if (op.previousData) {
          rollbackOps.push({
            id: `rollback_${op.id}`,
            type: "update",
            table: op.table,
            data: op.previousData,
            previousData: op.data,
            timestamp: new Date(),
          })
        }
        break
    }
  }

  return rollbackOps
}

// =============================================================================
// DATA VALIDATION
// =============================================================================

/**
 * Create validation rule
 */
export function createValidationRule(
  id: string,
  name: string,
  field: string,
  validator: (value: unknown, context: Record<string, unknown>) => boolean,
  message: string,
  severity: ValidationSeverity = "error"
): ValidationRule {
  return {
    id,
    name,
    field,
    validator,
    message,
    severity,
  }
}

/**
 * Validate data against rules
 */
export function validateData(
  data: Record<string, unknown>,
  rules: ValidationRule[],
  context: Record<string, unknown> = {}
): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const rule of rules) {
    const value = data[rule.field]
    const isValid = rule.validator(value, context)

    if (!isValid) {
      results.push({
        valid: false,
        field: rule.field,
        message: rule.message,
        severity: rule.severity,
        code: rule.id,
        context: { value, ...context },
      })
    }
  }

  return results
}

/**
 * Check if validation passed
 */
export function isValidationPassed(
  results: ValidationResult[],
  allowWarnings: boolean = true
): boolean {
  if (allowWarnings) {
    return results.every(r => r.severity !== "error")
  }
  return results.length === 0
}

// =============================================================================
// BUILT-IN VALIDATORS
// =============================================================================

/**
 * Required field validator
 */
export function requiredValidator(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  return true
}

/**
 * Email validator
 */
export function emailValidator(value: unknown): boolean {
  if (typeof value !== "string") return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Range validator factory
 */
export function createRangeValidator(min: number, max: number) {
  return (value: unknown): boolean => {
    if (typeof value !== "number") return false
    return value >= min && value <= max
  }
}

/**
 * String length validator factory
 */
export function createLengthValidator(minLength: number, maxLength: number) {
  return (value: unknown): boolean => {
    if (typeof value !== "string") return false
    return value.length >= minLength && value.length <= maxLength
  }
}

/**
 * Pattern validator factory
 */
export function createPatternValidator(pattern: RegExp) {
  return (value: unknown): boolean => {
    if (typeof value !== "string") return false
    return pattern.test(value)
  }
}

/**
 * Enum validator factory
 */
export function createEnumValidator<T>(allowedValues: T[]) {
  return (value: unknown): boolean => {
    return allowedValues.includes(value as T)
  }
}

/**
 * Date validator
 */
export function dateValidator(value: unknown): boolean {
  if (value instanceof Date) return !isNaN(value.getTime())
  if (typeof value === "string") {
    const date = new Date(value)
    return !isNaN(date.getTime())
  }
  return false
}

/**
 * Future date validator
 */
export function futureDateValidator(value: unknown): boolean {
  if (!dateValidator(value)) return false
  const date = value instanceof Date ? value : new Date(value as string)
  return date > new Date()
}

/**
 * UUID validator
 */
export function uuidValidator(value: unknown): boolean {
  if (typeof value !== "string") return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

// =============================================================================
// CONSISTENCY CHECKS
// =============================================================================

/**
 * Create consistency check
 */
export function createConsistencyCheck(
  id: string,
  type: ConsistencyCheckType,
  name: string,
  description: string,
  tables: string[],
  check: (data: ConsistencyCheckData) => ConsistencyCheckResult
): ConsistencyCheck {
  return {
    id,
    type,
    name,
    description,
    tables,
    check,
  }
}

/**
 * Run consistency check
 */
export function runConsistencyCheck(
  check: ConsistencyCheck,
  data: ConsistencyCheckData
): ConsistencyCheckResult {
  const start = Date.now()
  const result = check.check(data)
  return {
    ...result,
    duration: Date.now() - start,
  }
}

/**
 * Run multiple consistency checks
 */
export function runConsistencyChecks(
  checks: ConsistencyCheck[],
  data: ConsistencyCheckData
): ConsistencyCheckResult[] {
  return checks.map(check => runConsistencyCheck(check, data))
}

/**
 * Generate integrity report
 */
export function generateIntegrityReport(
  results: ConsistencyCheckResult[]
): IntegrityReport {
  const start = Date.now()

  const violationsBySeverity: Record<ValidationSeverity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  }

  let totalViolations = 0

  for (const result of results) {
    for (const violation of result.violations) {
      violationsBySeverity[violation.severity]++
      totalViolations++
    }
  }

  const checksPassed = results.filter(r => r.passed).length
  const checksFailed = results.length - checksPassed

  let overallStatus: IntegrityReport["overallStatus"]
  if (violationsBySeverity.error > 0) {
    overallStatus = "errors"
  } else if (violationsBySeverity.warning > 0) {
    overallStatus = "warnings"
  } else {
    overallStatus = "healthy"
  }

  return {
    overallStatus,
    checksRun: results.length,
    checksPassed,
    checksFailed,
    totalViolations,
    violationsBySeverity,
    results,
    generatedAt: new Date(),
    duration: Date.now() - start,
  }
}

// =============================================================================
// BUILT-IN CONSISTENCY CHECKS
// =============================================================================

/**
 * Create referential integrity check
 */
export function createReferentialIntegrityCheck(
  id: string,
  name: string,
  sourceTable: string,
  sourceField: string,
  targetTable: string,
  targetField: string
): ConsistencyCheck {
  return createConsistencyCheck(
    id,
    "referential_integrity",
    name,
    `Checks that all ${sourceField} values in ${sourceTable} exist in ${targetTable}.${targetField}`,
    [sourceTable, targetTable],
    (data: ConsistencyCheckData) => {
      const violations: ConsistencyViolation[] = []
      const sourceRecords = data.tables.get(sourceTable) ?? []
      const targetRecords = data.tables.get(targetTable) ?? []

      const targetIds = new Set(targetRecords.map(r => r[targetField]))

      for (const record of sourceRecords) {
        const foreignKey = record[sourceField]
        if (foreignKey && !targetIds.has(foreignKey)) {
          violations.push({
            table: sourceTable,
            recordId: String(record["id"] ?? "unknown"),
            field: sourceField,
            message: `Reference to non-existent ${targetTable}.${targetField}: ${foreignKey}`,
            severity: "error",
            suggestedFix: `Remove orphan record or create missing ${targetTable} record`,
          })
        }
      }

      return {
        passed: violations.length === 0,
        checkId: id,
        violations,
        checkedAt: new Date(),
        duration: 0,
      }
    }
  )
}

/**
 * Create uniqueness check
 */
export function createUniquenessCheck(
  id: string,
  name: string,
  table: string,
  field: string
): ConsistencyCheck {
  return createConsistencyCheck(
    id,
    "uniqueness",
    name,
    `Checks that all ${field} values in ${table} are unique`,
    [table],
    (data: ConsistencyCheckData) => {
      const violations: ConsistencyViolation[] = []
      const records = data.tables.get(table) ?? []

      const seen = new Map<unknown, string[]>()

      for (const record of records) {
        const value = record[field]
        const recordId = String(record["id"] ?? "unknown")

        if (value !== null && value !== undefined) {
          const existing = seen.get(value) ?? []
          existing.push(recordId)
          seen.set(value, existing)
        }
      }

      for (const [value, recordIds] of seen.entries()) {
        if (recordIds.length > 1) {
          for (const recordId of recordIds) {
            violations.push({
              table,
              recordId,
              field,
              message: `Duplicate value '${value}' found in ${recordIds.length} records`,
              severity: "error",
              suggestedFix: `Update or remove duplicate records`,
            })
          }
        }
      }

      return {
        passed: violations.length === 0,
        checkId: id,
        violations,
        checkedAt: new Date(),
        duration: 0,
      }
    }
  )
}

/**
 * Create not-null check
 */
export function createNotNullCheck(
  id: string,
  name: string,
  table: string,
  field: string
): ConsistencyCheck {
  return createConsistencyCheck(
    id,
    "data_format",
    name,
    `Checks that ${field} is not null in ${table}`,
    [table],
    (data: ConsistencyCheckData) => {
      const violations: ConsistencyViolation[] = []
      const records = data.tables.get(table) ?? []

      for (const record of records) {
        const value = record[field]
        const recordId = String(record["id"] ?? "unknown")

        if (value === null || value === undefined) {
          violations.push({
            table,
            recordId,
            field,
            message: `Required field ${field} is null`,
            severity: "error",
            suggestedFix: `Provide a value for ${field}`,
          })
        }
      }

      return {
        passed: violations.length === 0,
        checkId: id,
        violations,
        checkedAt: new Date(),
        duration: 0,
      }
    }
  )
}

/**
 * Create range check
 */
export function createRangeCheck(
  id: string,
  name: string,
  table: string,
  field: string,
  min: number,
  max: number
): ConsistencyCheck {
  return createConsistencyCheck(
    id,
    "range",
    name,
    `Checks that ${field} in ${table} is between ${min} and ${max}`,
    [table],
    (data: ConsistencyCheckData) => {
      const violations: ConsistencyViolation[] = []
      const records = data.tables.get(table) ?? []

      for (const record of records) {
        const value = record[field]
        const recordId = String(record["id"] ?? "unknown")

        if (typeof value === "number" && (value < min || value > max)) {
          violations.push({
            table,
            recordId,
            field,
            message: `Value ${value} is outside allowed range [${min}, ${max}]`,
            severity: "error",
            suggestedFix: `Update value to be within range [${min}, ${max}]`,
          })
        }
      }

      return {
        passed: violations.length === 0,
        checkId: id,
        violations,
        checkedAt: new Date(),
        duration: 0,
      }
    }
  )
}

// =============================================================================
// DATA SNAPSHOT & RECOVERY
// =============================================================================

/**
 * Create data snapshot
 */
export function createDataSnapshot(
  tables: Map<string, Record<string, unknown>[]>,
  metadata: Record<string, unknown> = {}
): DataSnapshot {
  // Deep clone the tables to prevent mutation
  const clonedTables = new Map<string, Record<string, unknown>[]>()
  for (const [tableName, records] of tables.entries()) {
    clonedTables.set(tableName, records.map(r => ({ ...r })))
  }

  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tables: clonedTables,
    createdAt: new Date(),
    metadata,
  }
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(
  before: DataSnapshot,
  after: DataSnapshot
): {
  added: Map<string, Record<string, unknown>[]>
  modified: Map<string, { before: Record<string, unknown>; after: Record<string, unknown> }[]>
  deleted: Map<string, Record<string, unknown>[]>
} {
  const added = new Map<string, Record<string, unknown>[]>()
  const modified = new Map<string, { before: Record<string, unknown>; after: Record<string, unknown> }[]>()
  const deleted = new Map<string, Record<string, unknown>[]>()

  // Get all table names
  const allTables = new Set([...before.tables.keys(), ...after.tables.keys()])

  for (const tableName of allTables) {
    const beforeRecords = before.tables.get(tableName) ?? []
    const afterRecords = after.tables.get(tableName) ?? []

    const beforeMap = new Map(beforeRecords.map(r => [r["id"], r]))
    const afterMap = new Map(afterRecords.map(r => [r["id"], r]))

    const tableAdded: Record<string, unknown>[] = []
    const tableModified: { before: Record<string, unknown>; after: Record<string, unknown> }[] = []
    const tableDeleted: Record<string, unknown>[] = []

    // Find added and modified
    for (const [id, afterRecord] of afterMap.entries()) {
      const beforeRecord = beforeMap.get(id)
      if (!beforeRecord) {
        tableAdded.push(afterRecord)
      } else if (JSON.stringify(beforeRecord) !== JSON.stringify(afterRecord)) {
        tableModified.push({ before: beforeRecord, after: afterRecord })
      }
    }

    // Find deleted
    for (const [id, beforeRecord] of beforeMap.entries()) {
      if (!afterMap.has(id)) {
        tableDeleted.push(beforeRecord)
      }
    }

    if (tableAdded.length > 0) added.set(tableName, tableAdded)
    if (tableModified.length > 0) modified.set(tableName, tableModified)
    if (tableDeleted.length > 0) deleted.set(tableName, tableDeleted)
  }

  return { added, modified, deleted }
}

/**
 * Generate diff summary
 */
export function generateDiffSummary(
  comparison: ReturnType<typeof compareSnapshots>
): string {
  const lines: string[] = []

  lines.push("=== Data Diff Summary ===")
  lines.push("")

  for (const [table, records] of comparison.added.entries()) {
    lines.push(`+ ${table}: ${records.length} records added`)
  }

  for (const [table, changes] of comparison.modified.entries()) {
    lines.push(`~ ${table}: ${changes.length} records modified`)
  }

  for (const [table, records] of comparison.deleted.entries()) {
    lines.push(`- ${table}: ${records.length} records deleted`)
  }

  if (lines.length === 2) {
    lines.push("No changes detected")
  }

  return lines.join("\n")
}

// =============================================================================
// INTEGRITY STORE
// =============================================================================

export interface IntegrityStore {
  transactions: Map<string, Transaction>
  validationRules: Map<string, ValidationRule[]>
  consistencyChecks: ConsistencyCheck[]
  snapshots: DataSnapshot[]
  maxSnapshots: number
}

/**
 * Create integrity store
 */
export function createIntegrityStore(
  maxSnapshots: number = 10
): IntegrityStore {
  return {
    transactions: new Map(),
    validationRules: new Map(),
    consistencyChecks: [],
    snapshots: [],
    maxSnapshots,
  }
}

/**
 * Register transaction
 */
export function registerTransaction(
  store: IntegrityStore,
  transaction: Transaction
): IntegrityStore {
  const transactions = new Map(store.transactions)
  transactions.set(transaction.id, transaction)

  return {
    ...store,
    transactions,
  }
}

/**
 * Get transaction
 */
export function getTransaction(
  store: IntegrityStore,
  transactionId: string
): Transaction | undefined {
  return store.transactions.get(transactionId)
}

/**
 * Register validation rules for a table
 */
export function registerValidationRules(
  store: IntegrityStore,
  table: string,
  rules: ValidationRule[]
): IntegrityStore {
  const validationRules = new Map(store.validationRules)
  const existing = validationRules.get(table) ?? []
  validationRules.set(table, [...existing, ...rules])

  return {
    ...store,
    validationRules,
  }
}

/**
 * Register consistency check
 */
export function registerConsistencyCheck(
  store: IntegrityStore,
  check: ConsistencyCheck
): IntegrityStore {
  return {
    ...store,
    consistencyChecks: [...store.consistencyChecks, check],
  }
}

/**
 * Add snapshot to store
 */
export function addSnapshot(
  store: IntegrityStore,
  snapshot: DataSnapshot
): IntegrityStore {
  const snapshots = [...store.snapshots, snapshot]

  // Keep only the most recent snapshots
  while (snapshots.length > store.maxSnapshots) {
    snapshots.shift()
  }

  return {
    ...store,
    snapshots,
  }
}

/**
 * Get latest snapshot
 */
export function getLatestSnapshot(
  store: IntegrityStore
): DataSnapshot | undefined {
  return store.snapshots[store.snapshots.length - 1]
}

/**
 * Validate table data
 */
export function validateTableData(
  store: IntegrityStore,
  table: string,
  data: Record<string, unknown>
): ValidationResult[] {
  const rules = store.validationRules.get(table) ?? []
  return validateData(data, rules)
}

/**
 * Run all consistency checks
 */
export function runAllConsistencyChecks(
  store: IntegrityStore,
  data: ConsistencyCheckData
): IntegrityReport {
  const results = runConsistencyChecks(store.consistencyChecks, data)
  return generateIntegrityReport(results)
}

// =============================================================================
// BUSINESS RULE VALIDATION
// =============================================================================

export interface BusinessRule {
  id: string
  name: string
  description: string
  validate: (data: Record<string, unknown>, context: Record<string, unknown>) => ValidationResult | null
}

/**
 * Create business rule
 */
export function createBusinessRule(
  id: string,
  name: string,
  description: string,
  validate: (data: Record<string, unknown>, context: Record<string, unknown>) => ValidationResult | null
): BusinessRule {
  return {
    id,
    name,
    description,
    validate,
  }
}

/**
 * Apply business rules
 */
export function applyBusinessRules(
  data: Record<string, unknown>,
  rules: BusinessRule[],
  context: Record<string, unknown> = {}
): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const rule of rules) {
    const result = rule.validate(data, context)
    if (result) {
      results.push(result)
    }
  }

  return results
}

// =============================================================================
// DATA SANITIZATION
// =============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return ""
  // Remove control characters and trim
  return input.replace(/[\x00-\x1F\x7F]/g, "").trim()
}

/**
 * Sanitize HTML
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

/**
 * Deep sanitize object
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  sanitizers: Record<string, (value: unknown) => unknown> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const sanitizer = sanitizers[key]
    if (sanitizer) {
      result[key] = sanitizer(value)
    } else if (typeof value === "string") {
      result[key] = sanitizeString(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, sanitizers)
    } else {
      result[key] = value
    }
  }

  return result
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if data has changed
 */
export function hasDataChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): boolean {
  return JSON.stringify(before) !== JSON.stringify(after)
}

/**
 * Get changed fields
 */
export function getChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key)
    }
  }

  return changed
}

/**
 * Merge with validation
 */
export function mergeWithValidation(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  rules: ValidationRule[]
): { result: Record<string, unknown>; validationErrors: ValidationResult[] } {
  const merged = { ...target, ...source }
  const validationErrors = validateData(merged, rules)

  return {
    result: merged,
    validationErrors,
  }
}

/**
 * Generate transaction log entry
 */
export function generateTransactionLogEntry(transaction: Transaction): string {
  const lines: string[] = []

  lines.push(`Transaction: ${transaction.id}`)
  lines.push(`Status: ${transaction.status}`)
  lines.push(`Started: ${transaction.startedAt.toISOString()}`)

  if (transaction.completedAt) {
    lines.push(`Completed: ${transaction.completedAt.toISOString()}`)
    const duration = transaction.completedAt.getTime() - transaction.startedAt.getTime()
    lines.push(`Duration: ${duration}ms`)
  }

  lines.push(`Operations: ${transaction.operations.length}`)

  for (const op of transaction.operations) {
    lines.push(`  - ${op.type} on ${op.table} at ${op.timestamp.toISOString()}`)
  }

  return lines.join("\n")
}
