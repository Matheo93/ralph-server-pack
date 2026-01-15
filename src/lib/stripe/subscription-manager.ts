/**
 * Subscription Manager - Advanced subscription lifecycle management
 * Functional, immutable approach to subscription operations
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const PlanTier = z.enum(["free", "starter", "family", "premium"])
export type PlanTier = z.infer<typeof PlanTier>

export const BillingInterval = z.enum(["month", "year"])
export type BillingInterval = z.infer<typeof BillingInterval>

export const SubscriptionState = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "paused",
])
export type SubscriptionState = z.infer<typeof SubscriptionState>

export const PlanConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: PlanTier,
  interval: BillingInterval,
  price: z.number(), // in cents
  currency: z.string().default("eur"),
  features: z.array(z.string()),
  limits: z.object({
    maxMembers: z.number(),
    maxTasksPerMonth: z.number(),
    maxStorageMb: z.number(),
    hasAnalytics: z.boolean(),
    hasPrioritySupport: z.boolean(),
    hasCustomReminders: z.boolean(),
    hasExport: z.boolean(),
  }),
  stripePriceId: z.string().optional(),
})
export type PlanConfig = z.infer<typeof PlanConfigSchema>

export const SubscriptionSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  customerId: z.string(),
  plan: PlanConfigSchema,
  status: SubscriptionState,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.date().nullable(),
  pausedAt: z.date().nullable(),
  resumeAt: z.date().nullable(),
  metadata: z.record(z.string()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>

export const UsageRecordSchema = z.object({
  householdId: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  tasks: z.object({
    created: z.number(),
    completed: z.number(),
    active: z.number(),
  }),
  members: z.object({
    total: z.number(),
    active: z.number(),
  }),
  storage: z.object({
    usedMb: z.number(),
    limitMb: z.number(),
  }),
  notifications: z.object({
    sent: z.number(),
    limit: z.number(),
  }),
})
export type UsageRecord = z.infer<typeof UsageRecordSchema>

export const ProrationMode = z.enum([
  "create_prorations", // Prorate immediately
  "none", // No prorations
  "always_invoice", // Invoice immediately
])
export type ProrationMode = z.infer<typeof ProrationMode>

// =============================================================================
// PLAN DEFINITIONS
// =============================================================================

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Gratuit",
    tier: "free",
    interval: "month",
    price: 0,
    currency: "eur",
    features: [
      "Jusqu'à 3 membres",
      "Tâches de base",
      "Rappels par email",
    ],
    limits: {
      maxMembers: 3,
      maxTasksPerMonth: 50,
      maxStorageMb: 100,
      hasAnalytics: false,
      hasPrioritySupport: false,
      hasCustomReminders: false,
      hasExport: false,
    },
  },
  starter_monthly: {
    id: "starter_monthly",
    name: "Starter Mensuel",
    tier: "starter",
    interval: "month",
    price: 299, // 2.99€
    currency: "eur",
    features: [
      "Jusqu'à 5 membres",
      "Tâches illimitées",
      "Rappels personnalisés",
      "Statistiques de base",
    ],
    limits: {
      maxMembers: 5,
      maxTasksPerMonth: 500,
      maxStorageMb: 500,
      hasAnalytics: true,
      hasPrioritySupport: false,
      hasCustomReminders: true,
      hasExport: false,
    },
    stripePriceId: process.env["STRIPE_STARTER_MONTHLY_PRICE_ID"],
  },
  family_monthly: {
    id: "family_monthly",
    name: "Family Mensuel",
    tier: "family",
    interval: "month",
    price: 499, // 4.99€
    currency: "eur",
    features: [
      "Jusqu'à 10 membres",
      "Tâches illimitées",
      "Rappels intelligents",
      "Statistiques avancées",
      "Export des données",
    ],
    limits: {
      maxMembers: 10,
      maxTasksPerMonth: -1, // unlimited
      maxStorageMb: 2000,
      hasAnalytics: true,
      hasPrioritySupport: false,
      hasCustomReminders: true,
      hasExport: true,
    },
    stripePriceId: process.env["STRIPE_FAMILY_MONTHLY_PRICE_ID"],
  },
  family_yearly: {
    id: "family_yearly",
    name: "Family Annuel",
    tier: "family",
    interval: "year",
    price: 4990, // 49.90€ (2 mois gratuits)
    currency: "eur",
    features: [
      "Jusqu'à 10 membres",
      "Tâches illimitées",
      "Rappels intelligents",
      "Statistiques avancées",
      "Export des données",
      "2 mois gratuits",
    ],
    limits: {
      maxMembers: 10,
      maxTasksPerMonth: -1,
      maxStorageMb: 2000,
      hasAnalytics: true,
      hasPrioritySupport: false,
      hasCustomReminders: true,
      hasExport: true,
    },
    stripePriceId: process.env["STRIPE_FAMILY_YEARLY_PRICE_ID"],
  },
  premium_monthly: {
    id: "premium_monthly",
    name: "Premium Mensuel",
    tier: "premium",
    interval: "month",
    price: 999, // 9.99€
    currency: "eur",
    features: [
      "Membres illimités",
      "Tâches illimitées",
      "IA pour suggestions",
      "Support prioritaire",
      "API access",
      "Intégrations avancées",
    ],
    limits: {
      maxMembers: -1, // unlimited
      maxTasksPerMonth: -1,
      maxStorageMb: 10000,
      hasAnalytics: true,
      hasPrioritySupport: true,
      hasCustomReminders: true,
      hasExport: true,
    },
    stripePriceId: process.env["STRIPE_PREMIUM_MONTHLY_PRICE_ID"],
  },
  premium_yearly: {
    id: "premium_yearly",
    name: "Premium Annuel",
    tier: "premium",
    interval: "year",
    price: 9990, // 99.90€ (2 mois gratuits)
    currency: "eur",
    features: [
      "Membres illimités",
      "Tâches illimitées",
      "IA pour suggestions",
      "Support prioritaire",
      "API access",
      "Intégrations avancées",
      "2 mois gratuits",
    ],
    limits: {
      maxMembers: -1,
      maxTasksPerMonth: -1,
      maxStorageMb: 10000,
      hasAnalytics: true,
      hasPrioritySupport: true,
      hasCustomReminders: true,
      hasExport: true,
    },
    stripePriceId: process.env["STRIPE_PREMIUM_YEARLY_PRICE_ID"],
  },
}

// =============================================================================
// PLAN OPERATIONS
// =============================================================================

/**
 * Get plan by ID
 */
export function getPlan(planId: string): PlanConfig | null {
  return PLANS[planId] ?? null
}

/**
 * Get all plans for a specific tier
 */
export function getPlansByTier(tier: PlanTier): PlanConfig[] {
  return Object.values(PLANS).filter((p) => p.tier === tier)
}

/**
 * Get available upgrade paths from current plan
 */
export function getUpgradePaths(currentPlanId: string): PlanConfig[] {
  const current = getPlan(currentPlanId)
  if (!current) return []

  const tierOrder: PlanTier[] = ["free", "starter", "family", "premium"]
  const currentIndex = tierOrder.indexOf(current.tier)

  return Object.values(PLANS).filter((p) => {
    const planIndex = tierOrder.indexOf(p.tier)
    // Higher tier, or same tier with different interval
    return planIndex > currentIndex ||
      (planIndex === currentIndex && p.interval !== current.interval)
  })
}

/**
 * Get available downgrade paths from current plan
 */
export function getDowngradePaths(currentPlanId: string): PlanConfig[] {
  const current = getPlan(currentPlanId)
  if (!current) return []

  const tierOrder: PlanTier[] = ["free", "starter", "family", "premium"]
  const currentIndex = tierOrder.indexOf(current.tier)

  return Object.values(PLANS).filter((p) => {
    const planIndex = tierOrder.indexOf(p.tier)
    return planIndex < currentIndex
  })
}

/**
 * Compare two plans
 */
export function comparePlans(
  planA: PlanConfig,
  planB: PlanConfig
): {
  isUpgrade: boolean
  isDowngrade: boolean
  isSameTier: boolean
  priceDifference: number
  featuresDiff: { added: string[]; removed: string[] }
} {
  const tierOrder: PlanTier[] = ["free", "starter", "family", "premium"]
  const indexA = tierOrder.indexOf(planA.tier)
  const indexB = tierOrder.indexOf(planB.tier)

  const isUpgrade = indexB > indexA ||
    (indexB === indexA && planB.price > planA.price)
  const isDowngrade = indexB < indexA ||
    (indexB === indexA && planB.price < planA.price)
  const isSameTier = indexA === indexB

  // Normalize to monthly for comparison
  const normalizedPriceA = planA.interval === "year" ? planA.price / 12 : planA.price
  const normalizedPriceB = planB.interval === "year" ? planB.price / 12 : planB.price
  const priceDifference = normalizedPriceB - normalizedPriceA

  const featuresA = new Set(planA.features)
  const featuresB = new Set(planB.features)

  const added = planB.features.filter((f) => !featuresA.has(f))
  const removed = planA.features.filter((f) => !featuresB.has(f))

  return {
    isUpgrade,
    isDowngrade,
    isSameTier,
    priceDifference,
    featuresDiff: { added, removed },
  }
}

// =============================================================================
// SUBSCRIPTION STORE
// =============================================================================

export interface SubscriptionStore {
  readonly subscriptions: ReadonlyMap<string, Subscription>
  readonly byHousehold: ReadonlyMap<string, string>
  readonly byCustomer: ReadonlyMap<string, string>
}

/**
 * Create empty subscription store
 */
export function createSubscriptionStore(): SubscriptionStore {
  return {
    subscriptions: new Map(),
    byHousehold: new Map(),
    byCustomer: new Map(),
  }
}

/**
 * Add subscription to store
 */
export function addSubscription(
  store: SubscriptionStore,
  subscription: Subscription
): SubscriptionStore {
  const subscriptions = new Map(store.subscriptions)
  const byHousehold = new Map(store.byHousehold)
  const byCustomer = new Map(store.byCustomer)

  subscriptions.set(subscription.id, subscription)
  byHousehold.set(subscription.householdId, subscription.id)
  byCustomer.set(subscription.customerId, subscription.id)

  return { subscriptions, byHousehold, byCustomer }
}

/**
 * Get subscription by ID
 */
export function getSubscription(
  store: SubscriptionStore,
  subscriptionId: string
): Subscription | null {
  return store.subscriptions.get(subscriptionId) ?? null
}

/**
 * Get subscription by household ID
 */
export function getSubscriptionByHousehold(
  store: SubscriptionStore,
  householdId: string
): Subscription | null {
  const subId = store.byHousehold.get(householdId)
  if (!subId) return null
  return store.subscriptions.get(subId) ?? null
}

/**
 * Get subscription by customer ID
 */
export function getSubscriptionByCustomer(
  store: SubscriptionStore,
  customerId: string
): Subscription | null {
  const subId = store.byCustomer.get(customerId)
  if (!subId) return null
  return store.subscriptions.get(subId) ?? null
}

// =============================================================================
// SUBSCRIPTION LIFECYCLE
// =============================================================================

/**
 * Create new subscription
 */
export function createSubscription(params: {
  householdId: string
  customerId: string
  plan: PlanConfig
  trialDays?: number
}): Subscription {
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + (params.plan.interval === "year" ? 12 : 1))

  const trialEnd = params.trialDays && params.trialDays > 0
    ? new Date(now.getTime() + params.trialDays * 24 * 60 * 60 * 1000)
    : null

  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    householdId: params.householdId,
    customerId: params.customerId,
    plan: params.plan,
    status: trialEnd ? "trialing" : "active",
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd ?? periodEnd,
    trialStart: trialEnd ? now : null,
    trialEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    pausedAt: null,
    resumeAt: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update subscription status
 */
export function updateSubscriptionStatus(
  subscription: Subscription,
  status: SubscriptionState
): Subscription {
  return {
    ...subscription,
    status,
    updatedAt: new Date(),
  }
}

/**
 * Schedule cancellation at period end
 */
export function scheduleCancellation(subscription: Subscription): Subscription {
  return {
    ...subscription,
    cancelAtPeriodEnd: true,
    updatedAt: new Date(),
  }
}

/**
 * Cancel subscription immediately
 */
export function cancelImmediately(subscription: Subscription): Subscription {
  const now = new Date()
  return {
    ...subscription,
    status: "canceled",
    cancelAtPeriodEnd: false,
    canceledAt: now,
    currentPeriodEnd: now,
    updatedAt: now,
  }
}

/**
 * Resume cancelled subscription
 */
export function resumeSubscription(subscription: Subscription): Subscription {
  if (subscription.status === "canceled") {
    return subscription // Cannot resume fully cancelled
  }

  return {
    ...subscription,
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  }
}

/**
 * Pause subscription
 */
export function pauseSubscription(
  subscription: Subscription,
  resumeDate?: Date
): Subscription {
  const now = new Date()
  return {
    ...subscription,
    status: "paused",
    pausedAt: now,
    resumeAt: resumeDate ?? null,
    updatedAt: now,
  }
}

/**
 * Resume paused subscription
 */
export function resumePausedSubscription(subscription: Subscription): Subscription {
  if (subscription.status !== "paused") {
    return subscription
  }

  return {
    ...subscription,
    status: "active",
    pausedAt: null,
    resumeAt: null,
    updatedAt: new Date(),
  }
}

/**
 * Change subscription plan
 */
export function changePlan(
  subscription: Subscription,
  newPlan: PlanConfig
): Subscription {
  return {
    ...subscription,
    plan: newPlan,
    updatedAt: new Date(),
  }
}

/**
 * Extend trial period
 */
export function extendTrialPeriod(
  subscription: Subscription,
  additionalDays: number
): Subscription {
  if (!subscription.trialEnd) {
    return subscription
  }

  const newTrialEnd = new Date(subscription.trialEnd)
  newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays)

  return {
    ...subscription,
    trialEnd: newTrialEnd,
    currentPeriodEnd: newTrialEnd,
    updatedAt: new Date(),
  }
}

/**
 * Renew subscription for next period
 */
export function renewSubscription(subscription: Subscription): Subscription {
  const now = new Date()
  const newPeriodEnd = new Date(subscription.currentPeriodEnd)

  if (subscription.plan.interval === "year") {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
  }

  return {
    ...subscription,
    status: "active",
    currentPeriodStart: subscription.currentPeriodEnd,
    currentPeriodEnd: newPeriodEnd,
    trialStart: null,
    trialEnd: null,
    updatedAt: now,
  }
}

// =============================================================================
// PRORATION CALCULATIONS
// =============================================================================

export interface ProrationResult {
  creditAmount: number
  chargeAmount: number
  netAmount: number
  daysRemaining: number
  totalDays: number
  effectiveDate: Date
}

/**
 * Calculate proration for plan change
 */
export function calculateProration(
  subscription: Subscription,
  newPlan: PlanConfig,
  effectiveDate: Date = new Date()
): ProrationResult {
  const periodStart = subscription.currentPeriodStart.getTime()
  const periodEnd = subscription.currentPeriodEnd.getTime()
  const effective = effectiveDate.getTime()

  const totalDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000))
  const daysUsed = Math.ceil((effective - periodStart) / (24 * 60 * 60 * 1000))
  const daysRemaining = totalDays - daysUsed

  // Daily rate of current plan
  const currentDailyRate = subscription.plan.price / totalDays
  const creditAmount = Math.round(currentDailyRate * daysRemaining)

  // Daily rate of new plan
  const newTotalDays = newPlan.interval === "year" ? 365 : 30
  const newDailyRate = newPlan.price / newTotalDays
  const chargeAmount = Math.round(newDailyRate * daysRemaining)

  return {
    creditAmount,
    chargeAmount,
    netAmount: chargeAmount - creditAmount,
    daysRemaining,
    totalDays,
    effectiveDate,
  }
}

/**
 * Preview plan change cost
 */
export function previewPlanChange(
  subscription: Subscription,
  newPlanId: string
): {
  success: boolean
  newPlan?: PlanConfig
  proration?: ProrationResult
  comparison?: ReturnType<typeof comparePlans>
  error?: string
} {
  const newPlan = getPlan(newPlanId)
  if (!newPlan) {
    return { success: false, error: "Plan not found" }
  }

  const proration = calculateProration(subscription, newPlan)
  const comparison = comparePlans(subscription.plan, newPlan)

  return {
    success: true,
    newPlan,
    proration,
    comparison,
  }
}

// =============================================================================
// USAGE & LIMITS
// =============================================================================

/**
 * Check if household is within plan limits
 */
export function checkLimits(
  subscription: Subscription,
  usage: UsageRecord
): {
  withinLimits: boolean
  violations: string[]
  warnings: string[]
} {
  const limits = subscription.plan.limits
  const violations: string[] = []
  const warnings: string[] = []

  // Check members limit
  if (limits.maxMembers > 0 && usage.members.total > limits.maxMembers) {
    violations.push(`Limite de membres dépassée: ${usage.members.total}/${limits.maxMembers}`)
  } else if (limits.maxMembers > 0 && usage.members.total >= limits.maxMembers * 0.9) {
    warnings.push(`Proche de la limite de membres: ${usage.members.total}/${limits.maxMembers}`)
  }

  // Check tasks limit
  if (limits.maxTasksPerMonth > 0 && usage.tasks.created > limits.maxTasksPerMonth) {
    violations.push(`Limite de tâches dépassée: ${usage.tasks.created}/${limits.maxTasksPerMonth}`)
  } else if (limits.maxTasksPerMonth > 0 && usage.tasks.created >= limits.maxTasksPerMonth * 0.8) {
    warnings.push(`Proche de la limite de tâches: ${usage.tasks.created}/${limits.maxTasksPerMonth}`)
  }

  // Check storage limit
  if (limits.maxStorageMb > 0 && usage.storage.usedMb > limits.maxStorageMb) {
    violations.push(`Limite de stockage dépassée: ${usage.storage.usedMb}MB/${limits.maxStorageMb}MB`)
  } else if (limits.maxStorageMb > 0 && usage.storage.usedMb >= limits.maxStorageMb * 0.9) {
    warnings.push(`Proche de la limite de stockage: ${usage.storage.usedMb}MB/${limits.maxStorageMb}MB`)
  }

  return {
    withinLimits: violations.length === 0,
    violations,
    warnings,
  }
}

/**
 * Check if feature is available in plan
 */
export function hasFeature(
  subscription: Subscription,
  feature: keyof PlanConfig["limits"]
): boolean {
  const value = subscription.plan.limits[feature]
  if (typeof value === "boolean") {
    return value
  }
  return value !== 0
}

/**
 * Get remaining quota for a limit
 */
export function getRemainingQuota(
  subscription: Subscription,
  usage: UsageRecord,
  limitType: "members" | "tasks" | "storage"
): { remaining: number; total: number; percentage: number } {
  const limits = subscription.plan.limits

  let used: number
  let total: number

  switch (limitType) {
    case "members":
      used = usage.members.total
      total = limits.maxMembers
      break
    case "tasks":
      used = usage.tasks.created
      total = limits.maxTasksPerMonth
      break
    case "storage":
      used = usage.storage.usedMb
      total = limits.maxStorageMb
      break
  }

  // -1 means unlimited
  if (total < 0) {
    return { remaining: -1, total: -1, percentage: 0 }
  }

  const remaining = Math.max(0, total - used)
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  return { remaining, total, percentage }
}

// =============================================================================
// TRIAL MANAGEMENT
// =============================================================================

/**
 * Check if subscription is in trial
 */
export function isInTrial(subscription: Subscription): boolean {
  return subscription.status === "trialing" && subscription.trialEnd !== null
}

/**
 * Get trial days remaining
 */
export function getTrialDaysRemaining(subscription: Subscription): number {
  if (!subscription.trialEnd) return 0

  const now = Date.now()
  const trialEnd = subscription.trialEnd.getTime()
  const remaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000))

  return Math.max(0, remaining)
}

/**
 * Check if trial is about to end (within specified days)
 */
export function isTrialEndingSoon(
  subscription: Subscription,
  withinDays: number = 3
): boolean {
  const remaining = getTrialDaysRemaining(subscription)
  return remaining > 0 && remaining <= withinDays
}

/**
 * Convert trial to paid subscription
 */
export function convertTrialToPaid(subscription: Subscription): Subscription {
  if (subscription.status !== "trialing") {
    return subscription
  }

  const now = new Date()
  const periodEnd = new Date(now)

  if (subscription.plan.interval === "year") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  return {
    ...subscription,
    status: "active",
    trialStart: null,
    trialEnd: null,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  }
}

// =============================================================================
// BILLING CYCLE
// =============================================================================

export interface BillingInfo {
  currentPeriod: {
    start: Date
    end: Date
    daysRemaining: number
    percentComplete: number
  }
  nextBillingDate: Date
  nextBillingAmount: number
  isInGracePeriod: boolean
  gracePeriodEnd: Date | null
}

/**
 * Get billing information for subscription
 */
export function getBillingInfo(subscription: Subscription): BillingInfo {
  const now = Date.now()
  const periodStart = subscription.currentPeriodStart.getTime()
  const periodEnd = subscription.currentPeriodEnd.getTime()

  const totalDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000))
  const daysElapsed = Math.ceil((now - periodStart) / (24 * 60 * 60 * 1000))
  const daysRemaining = Math.max(0, totalDays - daysElapsed)
  const percentComplete = Math.round((daysElapsed / totalDays) * 100)

  // Grace period is 7 days after period end for past_due status
  const isInGracePeriod = subscription.status === "past_due" && now < periodEnd + 7 * 24 * 60 * 60 * 1000
  const gracePeriodEnd = isInGracePeriod
    ? new Date(periodEnd + 7 * 24 * 60 * 60 * 1000)
    : null

  const nextBillingDate = subscription.cancelAtPeriodEnd
    ? subscription.currentPeriodEnd
    : new Date(periodEnd)

  const nextBillingAmount = subscription.cancelAtPeriodEnd ? 0 : subscription.plan.price

  return {
    currentPeriod: {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
      daysRemaining,
      percentComplete,
    },
    nextBillingDate,
    nextBillingAmount,
    isInGracePeriod,
    gracePeriodEnd,
  }
}

/**
 * Check if subscription needs renewal
 */
export function needsRenewal(subscription: Subscription): boolean {
  if (subscription.cancelAtPeriodEnd || subscription.status === "canceled") {
    return false
  }

  const now = Date.now()
  const periodEnd = subscription.currentPeriodEnd.getTime()

  return now >= periodEnd
}

// =============================================================================
// SUBSCRIPTION ANALYTICS
// =============================================================================

export interface SubscriptionMetrics {
  totalSubscriptions: number
  activeSubscriptions: number
  trialingSubscriptions: number
  churnedSubscriptions: number
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  averageRevenuePerUser: number
  trialConversionRate: number
  churnRate: number
  planDistribution: Record<string, number>
}

/**
 * Calculate subscription metrics from store
 */
export function calculateMetrics(store: SubscriptionStore): SubscriptionMetrics {
  const subscriptions = Array.from(store.subscriptions.values())
  const total = subscriptions.length

  if (total === 0) {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      churnedSubscriptions: 0,
      mrr: 0,
      arr: 0,
      averageRevenuePerUser: 0,
      trialConversionRate: 0,
      churnRate: 0,
      planDistribution: {},
    }
  }

  const active = subscriptions.filter((s) => s.status === "active")
  const trialing = subscriptions.filter((s) => s.status === "trialing")
  const churned = subscriptions.filter((s) => s.status === "canceled")

  // Calculate MRR (normalize yearly plans to monthly)
  const mrr = active.reduce((sum, s) => {
    const monthlyPrice = s.plan.interval === "year"
      ? s.plan.price / 12
      : s.plan.price
    return sum + monthlyPrice
  }, 0)

  // Plan distribution
  const planDistribution: Record<string, number> = {}
  for (const sub of subscriptions) {
    const planId = sub.plan.id
    planDistribution[planId] = (planDistribution[planId] ?? 0) + 1
  }

  return {
    totalSubscriptions: total,
    activeSubscriptions: active.length,
    trialingSubscriptions: trialing.length,
    churnedSubscriptions: churned.length,
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    averageRevenuePerUser: active.length > 0 ? Math.round(mrr / active.length) : 0,
    trialConversionRate: trialing.length > 0
      ? Math.round((active.length / (active.length + trialing.length)) * 100)
      : 0,
    churnRate: total > 0 ? Math.round((churned.length / total) * 100) : 0,
    planDistribution,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const subscriptionManager = {
  // Plans
  getPlan,
  getPlansByTier,
  getUpgradePaths,
  getDowngradePaths,
  comparePlans,
  PLANS,

  // Store
  createSubscriptionStore,
  addSubscription,
  getSubscription,
  getSubscriptionByHousehold,
  getSubscriptionByCustomer,

  // Lifecycle
  createSubscription,
  updateSubscriptionStatus,
  scheduleCancellation,
  cancelImmediately,
  resumeSubscription,
  pauseSubscription,
  resumePausedSubscription,
  changePlan,
  extendTrialPeriod,
  renewSubscription,

  // Proration
  calculateProration,
  previewPlanChange,

  // Usage & Limits
  checkLimits,
  hasFeature,
  getRemainingQuota,

  // Trial
  isInTrial,
  getTrialDaysRemaining,
  isTrialEndingSoon,
  convertTrialToPaid,

  // Billing
  getBillingInfo,
  needsRenewal,

  // Analytics
  calculateMetrics,
}
