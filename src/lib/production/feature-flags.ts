/**
 * Feature Flags Service
 *
 * Comprehensive feature flag management:
 * - Feature toggle system
 * - A/B testing support
 * - Gradual rollouts
 * - User targeting
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type FlagType = "boolean" | "string" | "number" | "json"
export type RolloutStrategy = "percentage" | "user_list" | "attribute" | "gradual" | "schedule"
export type VariantType = "control" | "variant_a" | "variant_b" | "variant_c"

export interface FeatureFlag {
  id: string
  name: string
  description: string
  type: FlagType
  defaultValue: FlagValue
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  environment: string[]
  targeting?: TargetingRules
  rollout?: RolloutConfig
  variants?: Variant[]
  metadata?: Record<string, unknown>
}

export type FlagValue = boolean | string | number | Record<string, unknown>

export interface TargetingRules {
  rules: TargetingRule[]
  defaultVariant?: string
}

export interface TargetingRule {
  id: string
  name: string
  conditions: Condition[]
  variant: string
  percentage?: number
  priority: number
}

export interface Condition {
  attribute: string
  operator: ConditionOperator
  value: unknown
}

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in"
  | "regex"
  | "starts_with"
  | "ends_with"

export interface RolloutConfig {
  strategy: RolloutStrategy
  percentage?: number // For percentage strategy
  userIds?: string[] // For user_list strategy
  attribute?: string // For attribute strategy
  schedule?: ScheduleConfig // For schedule strategy
  gradual?: GradualConfig // For gradual strategy
}

export interface ScheduleConfig {
  startDate: Date
  endDate?: Date
  timezone?: string
}

export interface GradualConfig {
  startPercentage: number
  endPercentage: number
  incrementPercentage: number
  incrementIntervalMs: number
  currentPercentage: number
  lastIncrementAt: Date
}

export interface Variant {
  id: string
  name: string
  value: FlagValue
  weight: number
  description?: string
}

export interface EvaluationContext {
  userId?: string
  sessionId?: string
  householdId?: string
  email?: string
  attributes?: Record<string, unknown>
  environment?: string
  timestamp?: Date
}

export interface EvaluationResult {
  flagId: string
  enabled: boolean
  value: FlagValue
  variant?: string
  reason: EvaluationReason
  metadata?: Record<string, unknown>
}

export type EvaluationReason =
  | "flag_disabled"
  | "default_value"
  | "targeting_match"
  | "rollout_included"
  | "rollout_excluded"
  | "variant_assigned"
  | "schedule_active"
  | "schedule_inactive"
  | "error"

export interface ABTest {
  id: string
  name: string
  description: string
  flagId: string
  variants: ABVariant[]
  startDate: Date
  endDate?: Date
  status: "draft" | "running" | "paused" | "completed"
  goal: string
  metrics: string[]
  results?: ABTestResults
}

export interface ABVariant {
  id: string
  name: string
  value: FlagValue
  weight: number
  conversions?: number
  impressions?: number
}

export interface ABTestResults {
  totalImpressions: number
  totalConversions: number
  conversionRate: number
  winner?: string
  confidence?: number
  variantResults: Map<string, VariantResult>
}

export interface VariantResult {
  variantId: string
  impressions: number
  conversions: number
  conversionRate: number
  improvement?: number
}

export interface FlagChangeLog {
  id: string
  flagId: string
  action: "created" | "updated" | "deleted" | "enabled" | "disabled"
  changedBy: string
  changedAt: Date
  previousValue?: Partial<FeatureFlag>
  newValue?: Partial<FeatureFlag>
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const FeatureFlagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(["boolean", "string", "number", "json"]),
  defaultValue: z.union([z.boolean(), z.string(), z.number(), z.record(z.string(), z.unknown())]),
  enabled: z.boolean(),
  environment: z.array(z.string()),
})

export const EvaluationContextSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  householdId: z.string().optional(),
  email: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  environment: z.string().optional(),
})

// =============================================================================
// DEFAULT FLAGS
// =============================================================================

export const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: "dark_mode",
    name: "Dark Mode",
    description: "Enable dark mode theme",
    type: "boolean",
    defaultValue: true,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: ["development", "staging", "production"],
  },
  {
    id: "new_dashboard",
    name: "New Dashboard",
    description: "Enable the redesigned dashboard",
    type: "boolean",
    defaultValue: false,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: ["development", "staging"],
    rollout: {
      strategy: "percentage",
      percentage: 20,
    },
  },
  {
    id: "ai_suggestions",
    name: "AI Suggestions",
    description: "Enable AI-powered task suggestions",
    type: "boolean",
    defaultValue: false,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: ["development"],
    rollout: {
      strategy: "gradual",
      gradual: {
        startPercentage: 0,
        endPercentage: 100,
        incrementPercentage: 10,
        incrementIntervalMs: 24 * 60 * 60 * 1000, // 1 day
        currentPercentage: 0,
        lastIncrementAt: new Date(),
      },
    },
  },
]

// =============================================================================
// FLAG CREATION
// =============================================================================

/**
 * Create feature flag
 */
export function createFeatureFlag(
  id: string,
  name: string,
  type: FlagType,
  defaultValue: FlagValue,
  options: {
    description?: string
    enabled?: boolean
    environment?: string[]
    targeting?: TargetingRules
    rollout?: RolloutConfig
    variants?: Variant[]
    metadata?: Record<string, unknown>
  } = {}
): FeatureFlag {
  return {
    id,
    name,
    description: options.description ?? "",
    type,
    defaultValue,
    enabled: options.enabled ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: options.environment ?? ["development", "staging", "production"],
    targeting: options.targeting,
    rollout: options.rollout,
    variants: options.variants,
    metadata: options.metadata,
  }
}

/**
 * Create boolean flag
 */
export function createBooleanFlag(
  id: string,
  name: string,
  defaultValue: boolean = false,
  options: Omit<Parameters<typeof createFeatureFlag>[4], "type"> = {}
): FeatureFlag {
  return createFeatureFlag(id, name, "boolean", defaultValue, options)
}

/**
 * Create string flag
 */
export function createStringFlag(
  id: string,
  name: string,
  defaultValue: string,
  options: Omit<Parameters<typeof createFeatureFlag>[4], "type"> = {}
): FeatureFlag {
  return createFeatureFlag(id, name, "string", defaultValue, options)
}

/**
 * Create number flag
 */
export function createNumberFlag(
  id: string,
  name: string,
  defaultValue: number,
  options: Omit<Parameters<typeof createFeatureFlag>[4], "type"> = {}
): FeatureFlag {
  return createFeatureFlag(id, name, "number", defaultValue, options)
}

// =============================================================================
// TARGETING
// =============================================================================

/**
 * Create targeting rule
 */
export function createTargetingRule(
  id: string,
  name: string,
  conditions: Condition[],
  variant: string,
  options: {
    percentage?: number
    priority?: number
  } = {}
): TargetingRule {
  return {
    id,
    name,
    conditions,
    variant,
    percentage: options.percentage,
    priority: options.priority ?? 100,
  }
}

/**
 * Create condition
 */
export function createCondition(
  attribute: string,
  operator: ConditionOperator,
  value: unknown
): Condition {
  return { attribute, operator, value }
}

/**
 * Evaluate single condition
 */
export function evaluateCondition(
  condition: Condition,
  context: EvaluationContext
): boolean {
  const attributeValue = getAttributeValue(condition.attribute, context)

  if (attributeValue === undefined) {
    return false
  }

  switch (condition.operator) {
    case "eq":
      return attributeValue === condition.value
    case "neq":
      return attributeValue !== condition.value
    case "gt":
      return typeof attributeValue === "number" && attributeValue > (condition.value as number)
    case "gte":
      return typeof attributeValue === "number" && attributeValue >= (condition.value as number)
    case "lt":
      return typeof attributeValue === "number" && attributeValue < (condition.value as number)
    case "lte":
      return typeof attributeValue === "number" && attributeValue <= (condition.value as number)
    case "contains":
      return typeof attributeValue === "string" && attributeValue.includes(String(condition.value))
    case "not_contains":
      return typeof attributeValue === "string" && !attributeValue.includes(String(condition.value))
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(attributeValue)
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(attributeValue)
    case "regex":
      try {
        const regex = new RegExp(String(condition.value))
        return typeof attributeValue === "string" && regex.test(attributeValue)
      } catch {
        return false
      }
    case "starts_with":
      return typeof attributeValue === "string" && attributeValue.startsWith(String(condition.value))
    case "ends_with":
      return typeof attributeValue === "string" && attributeValue.endsWith(String(condition.value))
    default:
      return false
  }
}

/**
 * Get attribute value from context
 */
export function getAttributeValue(
  attribute: string,
  context: EvaluationContext
): unknown {
  // Built-in attributes
  switch (attribute) {
    case "userId":
      return context.userId
    case "sessionId":
      return context.sessionId
    case "householdId":
      return context.householdId
    case "email":
      return context.email
    case "environment":
      return context.environment
    default:
      // Check custom attributes
      return context.attributes?.[attribute]
  }
}

/**
 * Evaluate all conditions in a rule
 */
export function evaluateRule(
  rule: TargetingRule,
  context: EvaluationContext
): boolean {
  // All conditions must match (AND logic)
  return rule.conditions.every(condition => evaluateCondition(condition, context))
}

/**
 * Find matching targeting rule
 */
export function findMatchingRule(
  rules: TargetingRule[],
  context: EvaluationContext
): TargetingRule | null {
  // Sort by priority (lower is higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    if (evaluateRule(rule, context)) {
      // Check percentage if specified
      if (rule.percentage !== undefined) {
        const hash = hashUserId(context.userId ?? context.sessionId ?? "anonymous")
        if (hash > rule.percentage) {
          continue
        }
      }
      return rule
    }
  }

  return null
}

// =============================================================================
// ROLLOUT STRATEGIES
// =============================================================================

/**
 * Hash user ID to percentage (0-100)
 */
export function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash % 100)
}

/**
 * Check if user is in rollout percentage
 */
export function isInRolloutPercentage(
  userId: string,
  percentage: number
): boolean {
  const hash = hashUserId(userId)
  return hash < percentage
}

/**
 * Check if user is in user list
 */
export function isInUserList(
  userId: string,
  userList: string[]
): boolean {
  return userList.includes(userId)
}

/**
 * Check if schedule is active
 */
export function isScheduleActive(
  schedule: ScheduleConfig,
  now: Date = new Date()
): boolean {
  if (now < schedule.startDate) {
    return false
  }
  if (schedule.endDate && now > schedule.endDate) {
    return false
  }
  return true
}

/**
 * Update gradual rollout percentage
 */
export function updateGradualRollout(
  gradual: GradualConfig,
  now: Date = new Date()
): GradualConfig {
  const timeSinceLastIncrement = now.getTime() - gradual.lastIncrementAt.getTime()
  const incrementsNeeded = Math.floor(timeSinceLastIncrement / gradual.incrementIntervalMs)

  if (incrementsNeeded <= 0 || gradual.currentPercentage >= gradual.endPercentage) {
    return gradual
  }

  const newPercentage = Math.min(
    gradual.currentPercentage + (incrementsNeeded * gradual.incrementPercentage),
    gradual.endPercentage
  )

  return {
    ...gradual,
    currentPercentage: newPercentage,
    lastIncrementAt: now,
  }
}

/**
 * Evaluate rollout strategy
 */
export function evaluateRollout(
  rollout: RolloutConfig,
  context: EvaluationContext
): { included: boolean; reason: EvaluationReason } {
  const userId = context.userId ?? context.sessionId ?? "anonymous"

  switch (rollout.strategy) {
    case "percentage":
      if (rollout.percentage === undefined) {
        return { included: false, reason: "rollout_excluded" }
      }
      const included = isInRolloutPercentage(userId, rollout.percentage)
      return {
        included,
        reason: included ? "rollout_included" : "rollout_excluded",
      }

    case "user_list":
      if (!rollout.userIds) {
        return { included: false, reason: "rollout_excluded" }
      }
      const inList = isInUserList(userId, rollout.userIds)
      return {
        included: inList,
        reason: inList ? "rollout_included" : "rollout_excluded",
      }

    case "schedule":
      if (!rollout.schedule) {
        return { included: false, reason: "rollout_excluded" }
      }
      const active = isScheduleActive(rollout.schedule, context.timestamp)
      return {
        included: active,
        reason: active ? "schedule_active" : "schedule_inactive",
      }

    case "gradual":
      if (!rollout.gradual) {
        return { included: false, reason: "rollout_excluded" }
      }
      const updatedGradual = updateGradualRollout(rollout.gradual, context.timestamp)
      const gradualIncluded = isInRolloutPercentage(userId, updatedGradual.currentPercentage)
      return {
        included: gradualIncluded,
        reason: gradualIncluded ? "rollout_included" : "rollout_excluded",
      }

    case "attribute":
      if (!rollout.attribute || !context.attributes) {
        return { included: false, reason: "rollout_excluded" }
      }
      const attrValue = context.attributes[rollout.attribute]
      return {
        included: Boolean(attrValue),
        reason: attrValue ? "rollout_included" : "rollout_excluded",
      }

    default:
      return { included: false, reason: "rollout_excluded" }
  }
}

// =============================================================================
// VARIANT SELECTION
// =============================================================================

/**
 * Select variant by weight
 */
export function selectVariantByWeight(
  variants: Variant[],
  userId: string
): Variant | null {
  if (variants.length === 0) return null

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  if (totalWeight === 0) return variants[0] ?? null

  const hash = hashUserId(userId)
  const target = (hash / 100) * totalWeight

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (target < cumulative) {
      return variant
    }
  }

  return variants[variants.length - 1] ?? null
}

/**
 * Assign user to variant
 */
export function assignVariant(
  flag: FeatureFlag,
  context: EvaluationContext
): { variant: Variant | null; reason: EvaluationReason } {
  if (!flag.variants || flag.variants.length === 0) {
    return { variant: null, reason: "default_value" }
  }

  const userId = context.userId ?? context.sessionId ?? "anonymous"
  const variant = selectVariantByWeight(flag.variants, userId)

  return {
    variant,
    reason: variant ? "variant_assigned" : "default_value",
  }
}

// =============================================================================
// FLAG EVALUATION
// =============================================================================

/**
 * Evaluate feature flag
 */
export function evaluateFlag(
  flag: FeatureFlag,
  context: EvaluationContext
): EvaluationResult {
  // Check if flag is disabled
  if (!flag.enabled) {
    return {
      flagId: flag.id,
      enabled: false,
      value: flag.defaultValue,
      reason: "flag_disabled",
    }
  }

  // Check environment
  if (context.environment && !flag.environment.includes(context.environment)) {
    return {
      flagId: flag.id,
      enabled: false,
      value: flag.defaultValue,
      reason: "flag_disabled",
    }
  }

  // Check targeting rules
  if (flag.targeting?.rules && flag.targeting.rules.length > 0) {
    const matchingRule = findMatchingRule(flag.targeting.rules, context)
    if (matchingRule) {
      const variant = flag.variants?.find(v => v.id === matchingRule.variant)
      return {
        flagId: flag.id,
        enabled: true,
        value: variant?.value ?? flag.defaultValue,
        variant: matchingRule.variant,
        reason: "targeting_match",
      }
    }
  }

  // Check rollout
  if (flag.rollout) {
    const rolloutResult = evaluateRollout(flag.rollout, context)
    if (!rolloutResult.included) {
      return {
        flagId: flag.id,
        enabled: false,
        value: flag.defaultValue,
        reason: rolloutResult.reason,
      }
    }
  }

  // Check variants
  if (flag.variants && flag.variants.length > 0) {
    const { variant, reason } = assignVariant(flag, context)
    if (variant) {
      return {
        flagId: flag.id,
        enabled: true,
        value: variant.value,
        variant: variant.id,
        reason,
      }
    }
  }

  // Return default value
  return {
    flagId: flag.id,
    enabled: true,
    value: flag.defaultValue,
    reason: "default_value",
  }
}

/**
 * Evaluate multiple flags
 */
export function evaluateFlags(
  flags: FeatureFlag[],
  context: EvaluationContext
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>()

  for (const flag of flags) {
    results.set(flag.id, evaluateFlag(flag, context))
  }

  return results
}

// =============================================================================
// A/B TESTING
// =============================================================================

/**
 * Create A/B test
 */
export function createABTest(
  id: string,
  name: string,
  flagId: string,
  variants: ABVariant[],
  options: {
    description?: string
    goal?: string
    metrics?: string[]
    startDate?: Date
    endDate?: Date
  } = {}
): ABTest {
  return {
    id,
    name,
    description: options.description ?? "",
    flagId,
    variants,
    startDate: options.startDate ?? new Date(),
    endDate: options.endDate,
    status: "draft",
    goal: options.goal ?? "",
    metrics: options.metrics ?? [],
  }
}

/**
 * Record A/B test impression
 */
export function recordImpression(
  test: ABTest,
  variantId: string
): ABTest {
  const variants = test.variants.map(v => {
    if (v.id === variantId) {
      return { ...v, impressions: (v.impressions ?? 0) + 1 }
    }
    return v
  })

  return { ...test, variants }
}

/**
 * Record A/B test conversion
 */
export function recordConversion(
  test: ABTest,
  variantId: string
): ABTest {
  const variants = test.variants.map(v => {
    if (v.id === variantId) {
      return { ...v, conversions: (v.conversions ?? 0) + 1 }
    }
    return v
  })

  return { ...test, variants }
}

/**
 * Calculate A/B test results
 */
export function calculateABTestResults(test: ABTest): ABTestResults {
  const variantResults = new Map<string, VariantResult>()

  let totalImpressions = 0
  let totalConversions = 0
  let bestConversionRate = 0
  let winner: string | undefined

  for (const variant of test.variants) {
    const impressions = variant.impressions ?? 0
    const conversions = variant.conversions ?? 0
    const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0

    totalImpressions += impressions
    totalConversions += conversions

    variantResults.set(variant.id, {
      variantId: variant.id,
      impressions,
      conversions,
      conversionRate,
    })

    if (conversionRate > bestConversionRate) {
      bestConversionRate = conversionRate
      winner = variant.id
    }
  }

  // Calculate improvement percentages
  const controlVariant = test.variants.find(v => v.id === "control")
  const controlConversionRate = controlVariant
    ? (controlVariant.impressions ?? 0) > 0
      ? ((controlVariant.conversions ?? 0) / (controlVariant.impressions ?? 1)) * 100
      : 0
    : 0

  for (const result of variantResults.values()) {
    if (result.variantId !== "control" && controlConversionRate > 0) {
      result.improvement = ((result.conversionRate - controlConversionRate) / controlConversionRate) * 100
    }
  }

  return {
    totalImpressions,
    totalConversions,
    conversionRate: totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0,
    winner,
    variantResults,
  }
}

// =============================================================================
// FLAG STORE
// =============================================================================

export interface FlagStore {
  flags: Map<string, FeatureFlag>
  get: (id: string) => FeatureFlag | undefined
  set: (flag: FeatureFlag) => void
  delete: (id: string) => boolean
  getAll: () => FeatureFlag[]
  evaluate: (id: string, context: EvaluationContext) => EvaluationResult
  evaluateAll: (context: EvaluationContext) => Map<string, EvaluationResult>
  isEnabled: (id: string, context: EvaluationContext) => boolean
  getValue: <T extends FlagValue>(id: string, context: EvaluationContext, defaultValue: T) => T
}

/**
 * Create flag store
 */
export function createFlagStore(initialFlags: FeatureFlag[] = []): FlagStore {
  const flags = new Map<string, FeatureFlag>()

  // Initialize with flags
  for (const flag of initialFlags) {
    flags.set(flag.id, flag)
  }

  return {
    flags,
    get(id) {
      return flags.get(id)
    },
    set(flag) {
      flags.set(flag.id, { ...flag, updatedAt: new Date() })
    },
    delete(id) {
      return flags.delete(id)
    },
    getAll() {
      return Array.from(flags.values())
    },
    evaluate(id, context) {
      const flag = flags.get(id)
      if (!flag) {
        return {
          flagId: id,
          enabled: false,
          value: false,
          reason: "flag_disabled",
        }
      }
      return evaluateFlag(flag, context)
    },
    evaluateAll(context) {
      return evaluateFlags(Array.from(flags.values()), context)
    },
    isEnabled(id, context) {
      const result = this.evaluate(id, context)
      return result.enabled && result.value === true
    },
    getValue<T extends FlagValue>(id: string, context: EvaluationContext, defaultValue: T): T {
      const result = this.evaluate(id, context)
      if (!result.enabled) {
        return defaultValue
      }
      return result.value as T
    },
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create percentage rollout
 */
export function createPercentageRollout(percentage: number): RolloutConfig {
  return {
    strategy: "percentage",
    percentage: Math.max(0, Math.min(100, percentage)),
  }
}

/**
 * Create user list rollout
 */
export function createUserListRollout(userIds: string[]): RolloutConfig {
  return {
    strategy: "user_list",
    userIds,
  }
}

/**
 * Create scheduled rollout
 */
export function createScheduledRollout(
  startDate: Date,
  endDate?: Date
): RolloutConfig {
  return {
    strategy: "schedule",
    schedule: { startDate, endDate },
  }
}

/**
 * Create gradual rollout
 */
export function createGradualRollout(
  startPercentage: number,
  endPercentage: number,
  incrementPercentage: number,
  incrementIntervalMs: number
): RolloutConfig {
  return {
    strategy: "gradual",
    gradual: {
      startPercentage,
      endPercentage,
      incrementPercentage,
      incrementIntervalMs,
      currentPercentage: startPercentage,
      lastIncrementAt: new Date(),
    },
  }
}

/**
 * Get flag statistics
 */
export function getFlagStatistics(flags: FeatureFlag[]): {
  total: number
  enabled: number
  disabled: number
  byType: Record<FlagType, number>
  byEnvironment: Record<string, number>
} {
  const byType: Record<FlagType, number> = {
    boolean: 0,
    string: 0,
    number: 0,
    json: 0,
  }

  const byEnvironment: Record<string, number> = {}

  let enabled = 0
  let disabled = 0

  for (const flag of flags) {
    if (flag.enabled) {
      enabled++
    } else {
      disabled++
    }

    byType[flag.type]++

    for (const env of flag.environment) {
      byEnvironment[env] = (byEnvironment[env] ?? 0) + 1
    }
  }

  return {
    total: flags.length,
    enabled,
    disabled,
    byType,
    byEnvironment,
  }
}
