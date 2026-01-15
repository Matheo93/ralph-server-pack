/**
 * Stripe Subscriptions API Route
 * Handles subscription management operations
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  subscriptionManager,
  type PlanConfig,
  type Subscription,
  type UsageRecord,
} from "@/lib/stripe/subscription-manager"
import {
  invoiceService,
  type Invoice,
} from "@/lib/stripe/invoice-service"

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const CreateSubscriptionSchema = z.object({
  action: z.literal("create"),
  householdId: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().min(1),
  trialDays: z.number().min(0).max(90).optional(),
})

const CancelSubscriptionSchema = z.object({
  action: z.literal("cancel"),
  subscriptionId: z.string().min(1),
  immediate: z.boolean().optional().default(false),
})

const ResumeSubscriptionSchema = z.object({
  action: z.literal("resume"),
  subscriptionId: z.string().min(1),
})

const ChangePlanSchema = z.object({
  action: z.literal("change_plan"),
  subscriptionId: z.string().min(1),
  newPlanId: z.string().min(1),
})

const PauseSubscriptionSchema = z.object({
  action: z.literal("pause"),
  subscriptionId: z.string().min(1),
  resumeDate: z.string().datetime().optional(),
})

const ExtendTrialSchema = z.object({
  action: z.literal("extend_trial"),
  subscriptionId: z.string().min(1),
  additionalDays: z.number().min(1).max(30),
})

const PreviewChangeSchema = z.object({
  action: z.literal("preview_change"),
  subscriptionId: z.string().min(1),
  newPlanId: z.string().min(1),
})

const CheckLimitsSchema = z.object({
  action: z.literal("check_limits"),
  subscriptionId: z.string().min(1),
  usage: z.object({
    householdId: z.string(),
    period: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
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
  }),
})

const GetPlansSchema = z.object({
  action: z.literal("get_plans"),
  tier: z.enum(["free", "starter", "family", "premium"]).optional(),
})

const GetUpgradePathsSchema = z.object({
  action: z.literal("get_upgrade_paths"),
  currentPlanId: z.string().min(1),
})

const GetBillingInfoSchema = z.object({
  action: z.literal("get_billing_info"),
  subscriptionId: z.string().min(1),
})

const RequestSchema = z.discriminatedUnion("action", [
  CreateSubscriptionSchema,
  CancelSubscriptionSchema,
  ResumeSubscriptionSchema,
  ChangePlanSchema,
  PauseSubscriptionSchema,
  ExtendTrialSchema,
  PreviewChangeSchema,
  CheckLimitsSchema,
  GetPlansSchema,
  GetUpgradePathsSchema,
  GetBillingInfoSchema,
])

// =============================================================================
// IN-MEMORY STORE (for demonstration - use database in production)
// =============================================================================

let subscriptionStore = subscriptionManager.createSubscriptionStore()

// =============================================================================
// HANDLERS
// =============================================================================

function handleCreateSubscription(
  data: z.infer<typeof CreateSubscriptionSchema>
): { subscription: Subscription; invoice?: Invoice } {
  const plan = subscriptionManager.getPlan(data.planId)
  if (!plan) {
    throw new Error(`Plan not found: ${data.planId}`)
  }

  const subscription = subscriptionManager.createSubscription({
    householdId: data.householdId,
    customerId: data.customerId,
    plan,
    trialDays: data.trialDays,
  })

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, subscription)

  // Create initial invoice if not in trial
  let invoice: Invoice | undefined
  if (!data.trialDays || data.trialDays === 0) {
    const invoiceStore = invoiceService.createInvoiceStore()
    invoice = invoiceService.createSubscriptionInvoice({
      householdId: data.householdId,
      customerId: data.customerId,
      subscriptionId: subscription.id,
      planName: plan.name,
      planPrice: plan.price,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      taxRate: 20, // 20% VAT
    })
    invoiceService.addInvoice(invoiceStore, invoice)
  }

  return { subscription, invoice }
}

function handleCancelSubscription(
  data: z.infer<typeof CancelSubscriptionSchema>
): Subscription {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  const updated = data.immediate
    ? subscriptionManager.cancelImmediately(subscription)
    : subscriptionManager.scheduleCancellation(subscription)

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, updated)

  return updated
}

function handleResumeSubscription(
  data: z.infer<typeof ResumeSubscriptionSchema>
): Subscription {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  let updated: Subscription
  if (subscription.status === "paused") {
    updated = subscriptionManager.resumePausedSubscription(subscription)
  } else {
    updated = subscriptionManager.resumeSubscription(subscription)
  }

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, updated)

  return updated
}

function handleChangePlan(
  data: z.infer<typeof ChangePlanSchema>
): { subscription: Subscription; proration: ReturnType<typeof subscriptionManager.calculateProration> } {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  const newPlan = subscriptionManager.getPlan(data.newPlanId)
  if (!newPlan) {
    throw new Error(`Plan not found: ${data.newPlanId}`)
  }

  const proration = subscriptionManager.calculateProration(subscription, newPlan)
  const updated = subscriptionManager.changePlan(subscription, newPlan)

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, updated)

  return { subscription: updated, proration }
}

function handlePauseSubscription(
  data: z.infer<typeof PauseSubscriptionSchema>
): Subscription {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  const resumeDate = data.resumeDate ? new Date(data.resumeDate) : undefined
  const updated = subscriptionManager.pauseSubscription(subscription, resumeDate)

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, updated)

  return updated
}

function handleExtendTrial(
  data: z.infer<typeof ExtendTrialSchema>
): Subscription {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  if (!subscriptionManager.isInTrial(subscription)) {
    throw new Error("Subscription is not in trial period")
  }

  const updated = subscriptionManager.extendTrialPeriod(subscription, data.additionalDays)

  subscriptionStore = subscriptionManager.addSubscription(subscriptionStore, updated)

  return updated
}

function handlePreviewChange(
  data: z.infer<typeof PreviewChangeSchema>
): ReturnType<typeof subscriptionManager.previewPlanChange> {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  return subscriptionManager.previewPlanChange(subscription, data.newPlanId)
}

function handleCheckLimits(
  data: z.infer<typeof CheckLimitsSchema>
): ReturnType<typeof subscriptionManager.checkLimits> {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  const usage: UsageRecord = {
    ...data.usage,
    period: {
      start: new Date(data.usage.period.start),
      end: new Date(data.usage.period.end),
    },
  }

  return subscriptionManager.checkLimits(subscription, usage)
}

function handleGetPlans(
  data: z.infer<typeof GetPlansSchema>
): PlanConfig[] {
  if (data.tier) {
    return subscriptionManager.getPlansByTier(data.tier)
  }
  return Object.values(subscriptionManager.PLANS)
}

function handleGetUpgradePaths(
  data: z.infer<typeof GetUpgradePathsSchema>
): { upgrades: PlanConfig[]; downgrades: PlanConfig[] } {
  return {
    upgrades: subscriptionManager.getUpgradePaths(data.currentPlanId),
    downgrades: subscriptionManager.getDowngradePaths(data.currentPlanId),
  }
}

function handleGetBillingInfo(
  data: z.infer<typeof GetBillingInfoSchema>
): ReturnType<typeof subscriptionManager.getBillingInfo> & {
  subscription: Subscription
  trialInfo?: { isInTrial: boolean; daysRemaining: number; endingSoon: boolean }
} {
  const subscription = subscriptionManager.getSubscription(subscriptionStore, data.subscriptionId)
  if (!subscription) {
    throw new Error(`Subscription not found: ${data.subscriptionId}`)
  }

  const billingInfo = subscriptionManager.getBillingInfo(subscription)

  const trialInfo = subscriptionManager.isInTrial(subscription)
    ? {
        isInTrial: true,
        daysRemaining: subscriptionManager.getTrialDaysRemaining(subscription),
        endingSoon: subscriptionManager.isTrialEndingSoon(subscription),
      }
    : undefined

  return {
    ...billingInfo,
    subscription,
    trialInfo,
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    let result: unknown

    switch (data.action) {
      case "create":
        result = handleCreateSubscription(data)
        break
      case "cancel":
        result = handleCancelSubscription(data)
        break
      case "resume":
        result = handleResumeSubscription(data)
        break
      case "change_plan":
        result = handleChangePlan(data)
        break
      case "pause":
        result = handlePauseSubscription(data)
        break
      case "extend_trial":
        result = handleExtendTrial(data)
        break
      case "preview_change":
        result = handlePreviewChange(data)
        break
      case "check_limits":
        result = handleCheckLimits(data)
        break
      case "get_plans":
        result = handleGetPlans(data)
        break
      case "get_upgrade_paths":
        result = handleGetUpgradePaths(data)
        break
      case "get_billing_info":
        result = handleGetBillingInfo(data)
        break
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Subscription API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  try {
    switch (action) {
      case "plans": {
        const tier = searchParams.get("tier") as "free" | "starter" | "family" | "premium" | null
        const plans = tier
          ? subscriptionManager.getPlansByTier(tier)
          : Object.values(subscriptionManager.PLANS)
        return NextResponse.json({ success: true, data: plans })
      }

      case "subscription": {
        const subscriptionId = searchParams.get("subscriptionId")
        const householdId = searchParams.get("householdId")

        let subscription: Subscription | null = null

        if (subscriptionId) {
          subscription = subscriptionManager.getSubscription(subscriptionStore, subscriptionId)
        } else if (householdId) {
          subscription = subscriptionManager.getSubscriptionByHousehold(subscriptionStore, householdId)
        }

        if (!subscription) {
          return NextResponse.json(
            { success: false, error: "Subscription not found" },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, data: subscription })
      }

      case "metrics": {
        const metrics = subscriptionManager.calculateMetrics(subscriptionStore)
        return NextResponse.json({ success: true, data: metrics })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            validActions: ["plans", "subscription", "metrics"],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Subscription API GET error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
