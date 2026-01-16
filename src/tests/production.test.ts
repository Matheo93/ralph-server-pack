/**
 * Production Hardening Tests
 *
 * Comprehensive tests for:
 * - Graceful shutdown
 * - Feature flags
 * - Data integrity
 * - Backup & restore
 */

import { describe, it, expect, beforeEach } from "vitest"

// Graceful Shutdown imports
import {
  createShutdownManager,
  createShutdownState,
  createShutdownHook,
  createManagedResource,
  sortResourcesByPriority,
  isShuttingDown,
  startDraining,
  startCleanup,
  markTerminated,
  updateConnectionCount,
  type ShutdownManager,
  type ShutdownState,
} from "../lib/production/graceful-shutdown"

// Feature Flags imports
import {
  createFeatureFlag,
  createTargetingRule,
  createFlagStore,
  evaluateFlag,
  createABTest,
  assignVariant,
  evaluateRule,
  evaluateCondition,
  createCondition,
  createPercentageRollout,
  type FeatureFlag,
  type FlagStore,
  type ABTest,
  type EvaluationContext,
} from "../lib/production/feature-flags"

// Data Integrity imports
import {
  createTransaction,
  addOperation,
  commitTransaction,
  rollbackTransaction,
  failTransaction,
  generateRollbackOperations,
  createValidationRule,
  validateData,
  isValidationPassed,
  requiredValidator,
  emailValidator,
  createRangeValidator,
  createLengthValidator,
  createPatternValidator,
  createEnumValidator,
  createConsistencyCheck,
  createReferentialIntegrityCheck,
  createUniquenessCheck,
  createNotNullCheck,
  createRangeCheck,
  runConsistencyCheck,
  generateIntegrityReport,
  createDataSnapshot,
  compareSnapshots,
  createIntegrityStore,
  registerValidationRules,
  sanitizeString,
  sanitizeHtml,
  hasDataChanged,
  getChangedFields,
  type Transaction,
  type ConsistencyCheckData,
} from "../lib/production/data-integrity"

// Backup & Restore imports
import {
  createBackupMetadata,
  startBackup,
  updateBackupProgress,
  completeBackup,
  failBackup,
  verifyBackup,
  createIncrementalBackup,
  getBackupChain,
  findLatestFullBackup,
  createRestorePoint,
  findRestorePointForTimestamp,
  createRestoreConfig,
  validateRestoreConfig,
  createExportConfig,
  generateExportFileName,
  toJsonExport,
  toCsvExport,
  toSqlExport,
  createDisasterRecoveryPlan,
  addRecoveryStep,
  addEmergencyContact,
  checkDRObjectives,
  calculateEstimatedRecoveryTime,
  createBackupStore,
  addBackupToStore,
  getExpiredBackups,
  calculateChecksum,
  verifyChecksum,
  getNextScheduledBackupTime,
  isBackupDue,
  formatBackupSize,
  type BackupMetadata,
  type BackupConfig,
} from "../lib/production/backup-restore"

// =============================================================================
// GRACEFUL SHUTDOWN TESTS
// =============================================================================

describe("Graceful Shutdown", () => {
  let manager: ShutdownManager
  let state: ShutdownState

  beforeEach(() => {
    manager = createShutdownManager()
    state = createShutdownState()
  })

  describe("createShutdownManager", () => {
    it("should create manager with default state", () => {
      expect(manager.state.phase).toBe("idle")
      expect(manager.hooks.length).toBe(0)
      expect(manager.resources.length).toBe(0)
    })

    it("should accept custom config", () => {
      const customManager = createShutdownManager({ drainTimeout: 60000 })
      expect(customManager.config.drainTimeout).toBe(60000)
    })
  })

  describe("createShutdownState", () => {
    it("should create state with idle phase", () => {
      expect(state.phase).toBe("idle")
      expect(state.startedAt).toBeUndefined()
    })
  })

  describe("registerShutdownHook", () => {
    it("should register hook with priority", () => {
      const hook = createShutdownHook("hook-1", "test-hook", async () => {}, { priority: 1 })
      manager.registerHook(hook)

      expect(manager.hooks.length).toBe(1)
      expect(manager.hooks[0]!.name).toBe("test-hook")
    })
  })

  describe("registerResource", () => {
    it("should register resource for cleanup", () => {
      const resource = createManagedResource("db-1", "database", "postgres", async () => {}, { priority: 1 })
      manager.registerResource(resource)

      expect(manager.resources.length).toBe(1)
      expect(manager.resources[0]!.type).toBe("database")
    })
  })

  describe("shutdown state transitions", () => {
    it("should transition to draining state", () => {
      const draining = startDraining(state, "SIGTERM")
      expect(draining.phase).toBe("draining")
      expect(draining.signal).toBe("SIGTERM")
    })

    it("should transition to cleanup state", () => {
      let s = startDraining(state, "SIGTERM")
      s = startCleanup(s)
      expect(s.phase).toBe("cleanup")
    })

    it("should transition to terminated state", () => {
      let s = startDraining(state, "SIGTERM")
      s = startCleanup(s)
      s = markTerminated(s)
      expect(s.phase).toBe("terminated")
    })
  })

  describe("connection tracking", () => {
    it("should track active connections", () => {
      let s = updateConnectionCount(state, 5)
      expect(s.activeConnections).toBe(5)

      s = updateConnectionCount(s, 3)
      expect(s.activeConnections).toBe(3)
    })
  })

  describe("isShuttingDown", () => {
    it("should return false when idle", () => {
      expect(isShuttingDown(state)).toBe(false)
    })

    it("should return true when draining", () => {
      const draining = startDraining(state, "SIGTERM")
      expect(isShuttingDown(draining)).toBe(true)
    })

    it("should return true when in cleanup", () => {
      let s = startDraining(state, "SIGTERM")
      s = startCleanup(s)
      expect(isShuttingDown(s)).toBe(true)
    })
  })

  describe("sortResourcesByPriority", () => {
    it("should order resources by priority (lower number = higher priority)", () => {
      const resources = [
        createManagedResource("cache-1", "cache", "redis", async () => {}, { priority: 3 }),
        createManagedResource("db-1", "database", "postgres", async () => {}, { priority: 1 }),
        createManagedResource("queue-1", "queue", "rabbitmq", async () => {}, { priority: 2 }),
      ]

      const sorted = sortResourcesByPriority(resources)
      expect(sorted[0]!.type).toBe("database") // priority 1
      expect(sorted[1]!.type).toBe("queue")    // priority 2
      expect(sorted[2]!.type).toBe("cache")    // priority 3
    })
  })
})

// =============================================================================
// FEATURE FLAGS TESTS
// =============================================================================

describe("Feature Flags", () => {
  let store: FlagStore

  beforeEach(() => {
    store = createFlagStore()
  })

  describe("createFeatureFlag", () => {
    it("should create feature flag with defaults", () => {
      const flag = createFeatureFlag("dark-mode", "Dark Mode", "boolean", false)

      expect(flag.id).toBe("dark-mode")
      expect(flag.type).toBe("boolean")
      expect(flag.defaultValue).toBe(false)
      expect(flag.enabled).toBe(true)
    })

    it("should create string feature flag", () => {
      const flag = createFeatureFlag("theme", "Theme Setting", "string", "light")

      expect(flag.type).toBe("string")
      expect(flag.defaultValue).toBe("light")
    })
  })

  describe("evaluateFlag", () => {
    it("should return disabled result when flag disabled", () => {
      const flag = createFeatureFlag("test-flag", "Test Flag", "boolean", true)
      flag.enabled = false
      store.set(flag)

      const context: EvaluationContext = { userId: "user-1" }
      const result = store.evaluate("test-flag", context)
      expect(result.enabled).toBe(false)
    })

    it("should evaluate enabled flag", () => {
      const flag = createFeatureFlag("test-flag", "Test Flag", "boolean", false)
      store.set(flag)

      const context: EvaluationContext = { userId: "user-1" }
      const result = store.evaluate("test-flag", context)
      expect(result.enabled).toBe(true)
    })
  })

  describe("evaluateFlagWithContext", () => {
    it("should evaluate flag with user context", () => {
      const flag = createFeatureFlag("premium-feature", "Premium Feature", "boolean", false)
      store.set(flag)

      const context: EvaluationContext = { userId: "user-1", attributes: { plan: "premium" } }
      const result = store.evaluate("premium-feature", context)

      expect(typeof result.enabled).toBe("boolean")
    })
  })

  describe("targeting rules", () => {
    it("should create targeting rule", () => {
      const rule = createTargetingRule(
        "rule-1",
        "premium-users",
        [createCondition("plan", "eq", "premium")],
        "variant-a"
      )

      expect(rule.name).toBe("premium-users")
      expect(rule.variant).toBe("variant-a")
    })

    it("should evaluate equals condition", () => {
      const condition = createCondition("country", "eq", "US")
      const context: EvaluationContext = { userId: "user-1", attributes: { country: "US" } }

      const result = evaluateCondition(condition, context)
      expect(result).toBe(true)
    })

    it("should evaluate contains condition", () => {
      const condition = createCondition("email", "contains", "@company.com")
      const context: EvaluationContext = { userId: "user-1", email: "user@company.com" }

      const result = evaluateCondition(condition, context)
      expect(result).toBe(true)
    })

    it("should evaluate targeting rule with multiple conditions", () => {
      const rule = createTargetingRule(
        "rule-1",
        "premium-us-users",
        [
          createCondition("plan", "eq", "premium"),
          createCondition("country", "eq", "US"),
        ],
        "variant-a"
      )
      const context: EvaluationContext = {
        userId: "user-1",
        attributes: { plan: "premium", country: "US" }
      }

      const result = evaluateRule(rule, context)
      expect(result).toBe(true)
    })
  })

  describe("rollout percentage", () => {
    it("should create percentage rollout config", () => {
      const rollout = createPercentageRollout(50)
      expect(rollout.strategy).toBe("percentage")
      expect(rollout.percentage).toBe(50)
    })

    it("should clamp rollout percentage to valid range", () => {
      const rollout1 = createPercentageRollout(150)
      expect(rollout1.percentage).toBe(100)

      const rollout2 = createPercentageRollout(-10)
      expect(rollout2.percentage).toBe(0)
    })
  })

  describe("A/B testing", () => {
    it("should create A/B test", () => {
      const test = createABTest("test-1", "homepage-test", "button-color-flag", [
        { id: "control", name: "Control", value: "blue", weight: 50 },
        { id: "variant-a", name: "Variant A", value: "green", weight: 50 },
      ])

      expect(test.name).toBe("homepage-test")
      expect(test.variants.length).toBe(2)
    })

    it("should assign consistent variant to user", () => {
      // Create a feature flag with variants for testing assignment
      const flag = createFeatureFlag("button-flag", "Button Color", "string", "blue")
      const flagWithVariants: FeatureFlag = {
        ...flag,
        variants: [
          { id: "a", name: "Blue", value: "blue", weight: 50 },
          { id: "b", name: "Green", value: "green", weight: 50 },
        ],
      }

      const context: EvaluationContext = { userId: "user-123" }
      const result1 = assignVariant(flagWithVariants, context)
      const result2 = assignVariant(flagWithVariants, context)

      expect(result1.variant?.id).toBe(result2.variant?.id) // Same user = same variant
    })
  })
})

// =============================================================================
// DATA INTEGRITY TESTS
// =============================================================================

describe("Data Integrity", () => {
  describe("Transaction Management", () => {
    let transaction: Transaction

    beforeEach(() => {
      transaction = createTransaction()
    })

    it("should create transaction with pending status", () => {
      expect(transaction.status).toBe("pending")
      expect(transaction.operations.length).toBe(0)
    })

    it("should add operations to transaction", () => {
      transaction = addOperation(transaction, {
        type: "insert",
        table: "users",
        data: { name: "John" },
      })

      expect(transaction.status).toBe("in_progress")
      expect(transaction.operations.length).toBe(1)
    })

    it("should commit transaction", () => {
      transaction = addOperation(transaction, {
        type: "insert",
        table: "users",
        data: { name: "John" },
      })
      transaction = commitTransaction(transaction)

      expect(transaction.status).toBe("committed")
      expect(transaction.completedAt).toBeDefined()
    })

    it("should rollback transaction", () => {
      transaction = addOperation(transaction, {
        type: "insert",
        table: "users",
        data: { name: "John" },
      })
      transaction = rollbackTransaction(transaction)

      expect(transaction.status).toBe("rolled_back")
      expect(transaction.operations.length).toBe(0)
    })

    it("should fail transaction with reason", () => {
      transaction = addOperation(transaction, {
        type: "insert",
        table: "users",
        data: { name: "John" },
      })
      transaction = failTransaction(transaction, "Database connection lost")

      expect(transaction.status).toBe("failed")
      expect(transaction.metadata["failureReason"]).toBe("Database connection lost")
    })

    it("should generate rollback operations", () => {
      transaction = addOperation(transaction, {
        type: "insert",
        table: "users",
        data: { id: "1", name: "John" },
      })
      transaction = addOperation(transaction, {
        type: "update",
        table: "users",
        data: { id: "1", name: "Jane" },
        previousData: { id: "1", name: "John" },
      })

      const rollbackOps = generateRollbackOperations(transaction)

      expect(rollbackOps.length).toBe(2)
      expect(rollbackOps[0]!.type).toBe("update") // Rollback update first (reverse order)
      expect(rollbackOps[1]!.type).toBe("delete") // Then rollback insert
    })
  })

  describe("Data Validation", () => {
    it("should validate required fields", () => {
      expect(requiredValidator("test")).toBe(true)
      expect(requiredValidator("")).toBe(false)
      expect(requiredValidator(null)).toBe(false)
      expect(requiredValidator(undefined)).toBe(false)
    })

    it("should validate email format", () => {
      expect(emailValidator("test@example.com")).toBe(true)
      expect(emailValidator("invalid-email")).toBe(false)
      expect(emailValidator("@example.com")).toBe(false)
    })

    it("should validate with range validator", () => {
      const validator = createRangeValidator(0, 100)
      expect(validator(50)).toBe(true)
      expect(validator(150)).toBe(false)
      expect(validator(-10)).toBe(false)
    })

    it("should validate with length validator", () => {
      const validator = createLengthValidator(3, 10)
      expect(validator("hello")).toBe(true)
      expect(validator("hi")).toBe(false)
      expect(validator("hello world!")).toBe(false)
    })

    it("should validate with pattern validator", () => {
      const validator = createPatternValidator(/^[A-Z]{2}\d{4}$/)
      expect(validator("AB1234")).toBe(true)
      expect(validator("abc1234")).toBe(false)
    })

    it("should validate with enum validator", () => {
      const validator = createEnumValidator(["active", "inactive", "pending"])
      expect(validator("active")).toBe(true)
      expect(validator("unknown")).toBe(false)
    })

    it("should validate data against rules", () => {
      const rules = [
        createValidationRule("req-name", "Required Name", "name", requiredValidator, "Name is required"),
        createValidationRule("valid-email", "Valid Email", "email", emailValidator, "Invalid email"),
      ]

      const validData = { name: "John", email: "john@example.com" }
      const invalidData = { name: "", email: "invalid" }

      expect(validateData(validData, rules).length).toBe(0)
      expect(validateData(invalidData, rules).length).toBe(2)
    })

    it("should check validation passed", () => {
      const noErrors: any[] = []
      const withErrors = [{ valid: false, severity: "error" as const, message: "Error", code: "E1" }]
      const withWarnings = [{ valid: false, severity: "warning" as const, message: "Warning", code: "W1" }]

      expect(isValidationPassed(noErrors)).toBe(true)
      expect(isValidationPassed(withErrors)).toBe(false)
      expect(isValidationPassed(withWarnings, true)).toBe(true)
      expect(isValidationPassed(withWarnings, false)).toBe(false)
    })
  })

  describe("Consistency Checks", () => {
    it("should check referential integrity", () => {
      const check = createReferentialIntegrityCheck(
        "user-household",
        "User Household FK",
        "users",
        "household_id",
        "households",
        "id"
      )

      const data: ConsistencyCheckData = {
        tables: new Map([
          ["users", [{ id: "u1", household_id: "h1" }, { id: "u2", household_id: "h99" }]],
          ["households", [{ id: "h1", name: "Smith" }]],
        ]),
      }

      const result = runConsistencyCheck(check, data)
      expect(result.passed).toBe(false)
      expect(result.violations.length).toBe(1)
      expect(result.violations[0]!.recordId).toBe("u2")
    })

    it("should check uniqueness", () => {
      const check = createUniquenessCheck("unique-email", "Unique Email", "users", "email")

      const data: ConsistencyCheckData = {
        tables: new Map([
          ["users", [
            { id: "u1", email: "a@example.com" },
            { id: "u2", email: "b@example.com" },
            { id: "u3", email: "a@example.com" }, // Duplicate
          ]],
        ]),
      }

      const result = runConsistencyCheck(check, data)
      expect(result.passed).toBe(false)
      expect(result.violations.length).toBe(2) // Both records with duplicate
    })

    it("should check not-null constraint", () => {
      const check = createNotNullCheck("not-null-name", "Name Required", "users", "name")

      const data: ConsistencyCheckData = {
        tables: new Map([
          ["users", [
            { id: "u1", name: "John" },
            { id: "u2", name: null },
          ]],
        ]),
      }

      const result = runConsistencyCheck(check, data)
      expect(result.passed).toBe(false)
      expect(result.violations.length).toBe(1)
    })

    it("should check range constraint", () => {
      const check = createRangeCheck("age-range", "Valid Age", "users", "age", 0, 150)

      const data: ConsistencyCheckData = {
        tables: new Map([
          ["users", [
            { id: "u1", age: 25 },
            { id: "u2", age: 200 }, // Out of range
          ]],
        ]),
      }

      const result = runConsistencyCheck(check, data)
      expect(result.passed).toBe(false)
    })

    it("should generate integrity report", () => {
      const results = [
        { passed: true, checkId: "c1", violations: [], checkedAt: new Date(), duration: 10 },
        { passed: false, checkId: "c2", violations: [
          { table: "users", recordId: "u1", message: "Error", severity: "error" as const }
        ], checkedAt: new Date(), duration: 15 },
      ]

      const report = generateIntegrityReport(results)
      expect(report.overallStatus).toBe("errors")
      expect(report.checksRun).toBe(2)
      expect(report.checksPassed).toBe(1)
      expect(report.checksFailed).toBe(1)
    })
  })

  describe("Data Snapshots", () => {
    it("should create data snapshot", () => {
      const tables = new Map([
        ["users", [{ id: "u1", name: "John" }]],
      ])

      const snapshot = createDataSnapshot(tables)
      expect(snapshot.id).toContain("snap_")
      expect(snapshot.tables.get("users")!.length).toBe(1)
    })

    it("should compare snapshots", () => {
      const before = createDataSnapshot(new Map([
        ["users", [{ id: "u1", name: "John" }]],
      ]))

      const after = createDataSnapshot(new Map([
        ["users", [
          { id: "u1", name: "Jane" }, // Modified
          { id: "u2", name: "Bob" },  // Added
        ]],
      ]))

      const diff = compareSnapshots(before, after)
      expect(diff.added.get("users")!.length).toBe(1)
      expect(diff.modified.get("users")!.length).toBe(1)
    })
  })

  describe("Sanitization", () => {
    it("should sanitize strings", () => {
      expect(sanitizeString("  hello  ")).toBe("hello")
      expect(sanitizeString("hello\x00world")).toBe("helloworld")
    })

    it("should sanitize HTML", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
      )
    })

    it("should detect changed data", () => {
      const before = { name: "John", age: 25 }
      const after = { name: "Jane", age: 25 }

      expect(hasDataChanged(before, after)).toBe(true)
      expect(hasDataChanged(before, before)).toBe(false)
    })

    it("should get changed fields", () => {
      const before = { name: "John", age: 25 }
      const after = { name: "Jane", age: 25 }

      const changed = getChangedFields(before, after)
      expect(changed).toContain("name")
      expect(changed).not.toContain("age")
    })
  })
})

// =============================================================================
// BACKUP & RESTORE TESTS
// =============================================================================

describe("Backup & Restore", () => {
  const defaultConfig: BackupConfig = {
    type: "full",
    retentionDays: 30,
    encrypt: true,
    compress: true,
    location: "/backups",
  }

  describe("Backup Creation", () => {
    it("should create backup metadata", () => {
      const backup = createBackupMetadata(defaultConfig, ["users", "tasks"])

      expect(backup.id).toContain("backup_")
      expect(backup.status).toBe("pending")
      expect(backup.tables).toContain("users")
      expect(backup.encrypted).toBe(true)
    })

    it("should start backup", () => {
      let backup = createBackupMetadata(defaultConfig, ["users"])
      backup = startBackup(backup)

      expect(backup.status).toBe("in_progress")
    })

    it("should update backup progress", () => {
      let backup = createBackupMetadata(defaultConfig, ["users"])
      backup = startBackup(backup)
      backup = updateBackupProgress(backup, "users", 1000, 50000)

      expect(backup.rowCounts["users"]).toBe(1000)
      expect(backup.size).toBe(50000)
    })

    it("should complete backup with checksum", () => {
      let backup = createBackupMetadata(defaultConfig, ["users"])
      backup = startBackup(backup)
      backup = completeBackup(backup, "abc123")

      expect(backup.status).toBe("completed")
      expect(backup.checksum).toBe("abc123")
      expect(backup.completedAt).toBeDefined()
    })

    it("should fail backup with reason", () => {
      let backup = createBackupMetadata(defaultConfig, ["users"])
      backup = startBackup(backup)
      backup = failBackup(backup, "Disk full")

      expect(backup.status).toBe("failed")
      expect(backup.metadata["failureReason"]).toBe("Disk full")
    })

    it("should verify backup", () => {
      let backup = createBackupMetadata(defaultConfig, ["users"])
      backup = startBackup(backup)
      backup = completeBackup(backup, "abc123")
      backup = verifyBackup(backup, true)

      expect(backup.status).toBe("verified")
    })
  })

  describe("Incremental Backups", () => {
    it("should create incremental backup from parent", () => {
      const fullBackup = createBackupMetadata(defaultConfig, ["users"])
      const incBackup = createIncrementalBackup(fullBackup, defaultConfig, ["users"])

      expect(incBackup.type).toBe("incremental")
      expect(incBackup.parentBackupId).toBe(fullBackup.id)
    })

    it("should get backup chain", () => {
      const full = createBackupMetadata({ ...defaultConfig, type: "full" }, ["users"])
      const inc1 = createIncrementalBackup(full, defaultConfig, ["users"])
      const inc2 = { ...createIncrementalBackup(inc1, defaultConfig, ["users"]), parentBackupId: inc1.id }

      const chain = getBackupChain([full, inc1, inc2], inc2.id)
      expect(chain.length).toBe(3)
      expect(chain[0]!.id).toBe(full.id)
    })

    it("should find latest full backup", () => {
      const old = { ...createBackupMetadata(defaultConfig, ["users"]), status: "verified" as const }
      const newer = { ...createBackupMetadata(defaultConfig, ["users"]), status: "verified" as const }

      const latest = findLatestFullBackup([old, newer])
      expect(latest).toBeDefined()
    })
  })

  describe("Restore Operations", () => {
    it("should create restore point", () => {
      const rp = createRestorePoint("backup-1", "Pre-migration snapshot", ["users"])

      expect(rp.id).toContain("rp_")
      expect(rp.type).toBe("manual")
    })

    it("should find restore point for timestamp", () => {
      const now = new Date()
      const old = createRestorePoint("backup-1", "Old", ["users"])
      old.timestamp = new Date(now.getTime() - 3600000) // 1 hour ago

      const recent = createRestorePoint("backup-2", "Recent", ["users"])
      recent.timestamp = new Date(now.getTime() - 600000) // 10 min ago

      const found = findRestorePointForTimestamp([old, recent], now)
      expect(found!.id).toBe(recent.id)
    })

    it("should create restore config", () => {
      const config = createRestoreConfig("backup-1", "full_restore", { dryRun: true })

      expect(config.backupId).toBe("backup-1")
      expect(config.strategy).toBe("full_restore")
      expect(config.dryRun).toBe(true)
    })

    it("should validate restore config", () => {
      const backup = { ...createBackupMetadata(defaultConfig, ["users"]), status: "verified" as const }
      const config = createRestoreConfig(backup.id, "full_restore")

      const validation = validateRestoreConfig(config, [backup])
      expect(validation.valid).toBe(true)
    })

    it("should reject invalid restore config", () => {
      const config = createRestoreConfig("nonexistent", "full_restore")

      const validation = validateRestoreConfig(config, [])
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe("Data Export", () => {
    it("should create export config", () => {
      const config = createExportConfig("json", ["users", "tasks"], "/exports")

      expect(config.format).toBe("json")
      expect(config.tables.length).toBe(2)
      expect(config.includeSchema).toBe(true)
    })

    it("should generate export file name", () => {
      const fileName = generateExportFileName("users", "json")

      expect(fileName).toContain("users_")
      expect(fileName).toContain(".json")
    })

    it("should convert to JSON export", () => {
      const data = [{ id: 1, name: "John" }, { id: 2, name: "Jane" }]
      const json = toJsonExport(data)

      expect(json).toContain('"name": "John"')
    })

    it("should convert to CSV export", () => {
      const data = [{ id: 1, name: "John" }, { id: 2, name: "Jane" }]
      const csv = toCsvExport(data)

      expect(csv).toContain("id,name")
      expect(csv).toContain("1,John")
    })

    it("should handle CSV special characters", () => {
      const data = [{ name: 'John "Doe"', note: "Hello, world" }]
      const csv = toCsvExport(data)

      expect(csv).toContain('"John ""Doe"""')
      expect(csv).toContain('"Hello, world"')
    })

    it("should convert to SQL export", () => {
      const data = [{ id: 1, name: "John" }]
      const sql = toSqlExport(data, "users")

      expect(sql).toContain("INSERT INTO users")
      expect(sql).toContain("'John'")
    })
  })

  describe("Disaster Recovery", () => {
    it("should create DR plan", () => {
      const plan = createDisasterRecoveryPlan(
        "Main DR Plan",
        "Recovery plan for production database",
        60, // RTO: 60 minutes
        15  // RPO: 15 minutes
      )

      expect(plan.id).toContain("drp_")
      expect(plan.rto).toBe(60)
      expect(plan.rpo).toBe(15)
    })

    it("should add recovery steps", () => {
      let plan = createDisasterRecoveryPlan("Test Plan", "Test", 60, 15)
      plan = addRecoveryStep(plan, {
        name: "Restore Database",
        description: "Restore from latest backup",
        automated: true,
        estimatedMinutes: 15,
        dependencies: [],
      })

      expect(plan.steps.length).toBe(1)
      expect(plan.steps[0]!.order).toBe(1)
    })

    it("should add emergency contacts", () => {
      let plan = createDisasterRecoveryPlan("Test Plan", "Test", 60, 15)
      plan = addEmergencyContact(plan, {
        name: "John Doe",
        role: "DBA",
        email: "john@example.com",
        phone: "+1234567890",
        priority: 1,
      })

      expect(plan.contacts.length).toBe(1)
    })

    it("should calculate estimated recovery time", () => {
      let plan = createDisasterRecoveryPlan("Test Plan", "Test", 60, 15)
      plan = addRecoveryStep(plan, {
        name: "Step 1",
        description: "First step",
        automated: true,
        estimatedMinutes: 10,
        dependencies: [],
      })
      plan = addRecoveryStep(plan, {
        name: "Step 2",
        description: "Second step",
        automated: false,
        estimatedMinutes: 20,
        dependencies: [],
      })

      const totalTime = calculateEstimatedRecoveryTime(plan)
      expect(totalTime).toBe(30)
    })

    it("should check DR objectives", () => {
      const plan = createDisasterRecoveryPlan("Test Plan", "Test", 60, 15)
      const goodResult = {
        success: true,
        actualRto: 45,
        actualRpo: 10,
        stepsCompleted: 5,
        totalSteps: 5,
        issues: [],
        testedAt: new Date(),
      }

      const check = checkDRObjectives(plan, goodResult)
      expect(check.meetsRto).toBe(true)
      expect(check.meetsRpo).toBe(true)
      expect(check.recommendations.length).toBe(0)
    })

    it("should identify DR objective failures", () => {
      const plan = createDisasterRecoveryPlan("Test Plan", "Test", 60, 15)
      const badResult = {
        success: false,
        actualRto: 90,
        actualRpo: 30,
        stepsCompleted: 3,
        totalSteps: 5,
        issues: ["Database restore failed"],
        testedAt: new Date(),
      }

      const check = checkDRObjectives(plan, badResult)
      expect(check.meetsRto).toBe(false)
      expect(check.meetsRpo).toBe(false)
      expect(check.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe("Backup Store", () => {
    it("should create backup store", () => {
      const store = createBackupStore()

      expect(store.backups.size).toBe(0)
      expect(store.restorePoints.length).toBe(0)
    })

    it("should add backup to store", () => {
      let store = createBackupStore()
      const backup = createBackupMetadata(defaultConfig, ["users"])
      store = addBackupToStore(store, backup)

      expect(store.backups.size).toBe(1)
    })

    it("should find expired backups", () => {
      let store = createBackupStore()

      // Create expired backup
      let expired = createBackupMetadata({ ...defaultConfig, retentionDays: 1 }, ["users"])
      expired.startedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      store = addBackupToStore(store, expired)

      // Create valid backup
      const valid = createBackupMetadata(defaultConfig, ["users"])
      store = addBackupToStore(store, valid)

      const expiredBackups = getExpiredBackups(store)
      expect(expiredBackups.length).toBe(1)
    })
  })

  describe("Checksum & Verification", () => {
    it("should calculate checksum", () => {
      const data = [{ id: 1, name: "John" }]
      const checksum = calculateChecksum(data)

      expect(checksum.length).toBe(8)
    })

    it("should verify valid checksum", () => {
      const data = [{ id: 1, name: "John" }]
      const checksum = calculateChecksum(data)

      expect(verifyChecksum(data, checksum)).toBe(true)
    })

    it("should reject invalid checksum", () => {
      const data = [{ id: 1, name: "John" }]

      expect(verifyChecksum(data, "invalid")).toBe(false)
    })
  })

  describe("Backup Scheduling", () => {
    it("should calculate next daily backup time", () => {
      const schedule = {
        frequency: "daily" as const,
        hour: 2,
        timezone: "UTC",
      }

      const now = new Date("2024-01-15T10:00:00Z")
      const next = getNextScheduledBackupTime(schedule, now)

      expect(next.getHours()).toBe(2)
      expect(next > now).toBe(true)
    })

    it("should check if backup is due", () => {
      const schedule = {
        frequency: "daily" as const,
        hour: 2,
        timezone: "UTC",
      }

      const lastBackup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      expect(isBackupDue(schedule, lastBackup)).toBe(true)

      const recentBackup = new Date() // Just now
      expect(isBackupDue(schedule, recentBackup)).toBe(false)
    })

    it("should return true if no last backup", () => {
      const schedule = {
        frequency: "daily" as const,
        hour: 2,
        timezone: "UTC",
      }

      expect(isBackupDue(schedule, undefined)).toBe(true)
    })
  })

  describe("Utility Functions", () => {
    it("should format backup size", () => {
      expect(formatBackupSize(500)).toBe("500.00 B")
      expect(formatBackupSize(1024)).toBe("1.00 KB")
      expect(formatBackupSize(1024 * 1024)).toBe("1.00 MB")
      expect(formatBackupSize(1024 * 1024 * 1024)).toBe("1.00 GB")
    })
  })
})
