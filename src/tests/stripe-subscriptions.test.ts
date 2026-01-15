/**
 * Stripe Subscriptions Tests
 * Tests for subscription manager and invoice service
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  subscriptionManager,
  createSubscriptionStore,
  addSubscription,
  getSubscription,
  getSubscriptionByHousehold,
  getSubscriptionByCustomer,
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
  calculateProration,
  previewPlanChange,
  checkLimits,
  hasFeature,
  getRemainingQuota,
  isInTrial,
  getTrialDaysRemaining,
  isTrialEndingSoon,
  convertTrialToPaid,
  getBillingInfo,
  needsRenewal,
  calculateMetrics,
  getPlan,
  getPlansByTier,
  getUpgradePaths,
  getDowngradePaths,
  comparePlans,
  PLANS,
  type Subscription,
  type SubscriptionStore,
  type PlanConfig,
  type UsageRecord,
} from "@/lib/stripe/subscription-manager"

import {
  invoiceService,
  createInvoiceStore,
  addInvoice,
  getInvoice,
  getInvoicesByHousehold,
  getInvoicesBySubscription,
  generateInvoiceNumber,
  createLineItem,
  createDiscount,
  createTax,
  createInvoice,
  createSubscriptionInvoice,
  finalizeInvoice,
  markInvoicePaid,
  recordPaymentFailure,
  voidInvoice,
  markUncollectible,
  addLineItem,
  applyDiscount,
  createRefund,
  applyRefund,
  getMaxRefundable,
  createPaymentAttempt,
  addPaymentAttempt,
  getPaymentAttempts,
  filterInvoices,
  getOverdueInvoices,
  getUnpaidInvoices,
  calculateInvoiceMetrics,
  getRevenueByPeriod,
  formatAmount,
  formatInvoiceSummary,
  type Invoice,
  type InvoiceStore,
  type LineItem,
} from "@/lib/stripe/invoice-service"

// =============================================================================
// SUBSCRIPTION MANAGER TESTS
// =============================================================================

describe("Subscription Manager", () => {
  // ---------------------------------------------------------------------------
  // Plan Operations
  // ---------------------------------------------------------------------------

  describe("Plan Operations", () => {
    it("should get plan by ID", () => {
      const plan = getPlan("family_monthly")
      expect(plan).not.toBeNull()
      expect(plan!.tier).toBe("family")
      expect(plan!.interval).toBe("month")
    })

    it("should return null for non-existent plan", () => {
      const plan = getPlan("non_existent")
      expect(plan).toBeNull()
    })

    it("should get plans by tier", () => {
      const familyPlans = getPlansByTier("family")
      expect(familyPlans.length).toBeGreaterThan(0)
      expect(familyPlans.every((p) => p.tier === "family")).toBe(true)
    })

    it("should get upgrade paths from free plan", () => {
      const upgrades = getUpgradePaths("free")
      expect(upgrades.length).toBeGreaterThan(0)
      expect(upgrades.every((p) => p.tier !== "free")).toBe(true)
    })

    it("should get downgrade paths from premium plan", () => {
      const downgrades = getDowngradePaths("premium_monthly")
      expect(downgrades.length).toBeGreaterThan(0)
      expect(downgrades.every((p) => p.tier !== "premium")).toBe(true)
    })

    it("should compare plans correctly", () => {
      const starter = PLANS["starter_monthly"]!
      const premium = PLANS["premium_monthly"]!

      const comparison = comparePlans(starter, premium)
      expect(comparison.isUpgrade).toBe(true)
      expect(comparison.isDowngrade).toBe(false)
      expect(comparison.priceDifference).toBeGreaterThan(0)
      expect(comparison.featuresDiff.added.length).toBeGreaterThan(0)
    })

    it("should identify same tier plans with different intervals", () => {
      const monthly = PLANS["family_monthly"]!
      const yearly = PLANS["family_yearly"]!

      const comparison = comparePlans(monthly, yearly)
      expect(comparison.isSameTier).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Subscription Store
  // ---------------------------------------------------------------------------

  describe("Subscription Store", () => {
    let store: SubscriptionStore
    let subscription: Subscription

    beforeEach(() => {
      store = createSubscriptionStore()
      subscription = createSubscription({
        householdId: "household_1",
        customerId: "cus_123",
        plan: PLANS["family_monthly"]!,
      })
    })

    it("should create empty store", () => {
      expect(store.subscriptions.size).toBe(0)
    })

    it("should add subscription to store", () => {
      const newStore = addSubscription(store, subscription)
      expect(newStore.subscriptions.size).toBe(1)
    })

    it("should retrieve subscription by ID", () => {
      const newStore = addSubscription(store, subscription)
      const retrieved = getSubscription(newStore, subscription.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(subscription.id)
    })

    it("should retrieve subscription by household", () => {
      const newStore = addSubscription(store, subscription)
      const retrieved = getSubscriptionByHousehold(newStore, "household_1")
      expect(retrieved).not.toBeNull()
    })

    it("should retrieve subscription by customer", () => {
      const newStore = addSubscription(store, subscription)
      const retrieved = getSubscriptionByCustomer(newStore, "cus_123")
      expect(retrieved).not.toBeNull()
    })

    it("should return null for non-existent subscription", () => {
      const retrieved = getSubscription(store, "non_existent")
      expect(retrieved).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Subscription Lifecycle
  // ---------------------------------------------------------------------------

  describe("Subscription Lifecycle", () => {
    it("should create subscription without trial", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      expect(sub.status).toBe("active")
      expect(sub.trialEnd).toBeNull()
    })

    it("should create subscription with trial", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 14,
      })

      expect(sub.status).toBe("trialing")
      expect(sub.trialEnd).not.toBeNull()
    })

    it("should update subscription status", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const updated = updateSubscriptionStatus(sub, "past_due")
      expect(updated.status).toBe("past_due")
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(sub.updatedAt.getTime())
    })

    it("should schedule cancellation", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const cancelled = scheduleCancellation(sub)
      expect(cancelled.cancelAtPeriodEnd).toBe(true)
      expect(cancelled.status).toBe("active")
    })

    it("should cancel immediately", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const cancelled = cancelImmediately(sub)
      expect(cancelled.status).toBe("canceled")
      expect(cancelled.canceledAt).not.toBeNull()
    })

    it("should resume subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const scheduled = scheduleCancellation(sub)
      const resumed = resumeSubscription(scheduled)
      expect(resumed.cancelAtPeriodEnd).toBe(false)
    })

    it("should pause subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const paused = pauseSubscription(sub)
      expect(paused.status).toBe("paused")
      expect(paused.pausedAt).not.toBeNull()
    })

    it("should resume paused subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const paused = pauseSubscription(sub)
      const resumed = resumePausedSubscription(paused)
      expect(resumed.status).toBe("active")
      expect(resumed.pausedAt).toBeNull()
    })

    it("should change plan", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["starter_monthly"]!,
      })

      const changed = changePlan(sub, PLANS["premium_monthly"]!)
      expect(changed.plan.tier).toBe("premium")
    })

    it("should extend trial period", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 14,
      })

      const originalEnd = sub.trialEnd!.getTime()
      const extended = extendTrialPeriod(sub, 7)
      expect(extended.trialEnd!.getTime()).toBeGreaterThan(originalEnd)
    })

    it("should renew subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const renewed = renewSubscription(sub)
      expect(renewed.currentPeriodStart.getTime()).toBe(sub.currentPeriodEnd.getTime())
      expect(renewed.currentPeriodEnd.getTime()).toBeGreaterThan(sub.currentPeriodEnd.getTime())
    })
  })

  // ---------------------------------------------------------------------------
  // Proration
  // ---------------------------------------------------------------------------

  describe("Proration Calculations", () => {
    it("should calculate proration for upgrade", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["starter_monthly"]!,
      })

      const proration = calculateProration(sub, PLANS["premium_monthly"]!)
      expect(proration.chargeAmount).toBeGreaterThan(proration.creditAmount)
      expect(proration.netAmount).toBeGreaterThan(0)
    })

    it("should calculate proration for downgrade", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["premium_monthly"]!,
      })

      const proration = calculateProration(sub, PLANS["starter_monthly"]!)
      expect(proration.netAmount).toBeLessThan(0)
    })

    it("should preview plan change", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["starter_monthly"]!,
      })

      const preview = previewPlanChange(sub, "premium_monthly")
      expect(preview.success).toBe(true)
      expect(preview.newPlan).not.toBeUndefined()
      expect(preview.proration).not.toBeUndefined()
      expect(preview.comparison).not.toBeUndefined()
    })

    it("should fail preview for invalid plan", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["starter_monthly"]!,
      })

      const preview = previewPlanChange(sub, "non_existent")
      expect(preview.success).toBe(false)
      expect(preview.error).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Usage & Limits
  // ---------------------------------------------------------------------------

  describe("Usage & Limits", () => {
    let subscription: Subscription
    let usage: UsageRecord

    beforeEach(() => {
      subscription = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["starter_monthly"]!,
      })

      usage = {
        householdId: "h1",
        period: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        tasks: { created: 100, completed: 80, active: 20 },
        members: { total: 3, active: 3 },
        storage: { usedMb: 200, limitMb: 500 },
        notifications: { sent: 50, limit: 100 },
      }
    })

    it("should check limits - within limits", () => {
      const result = checkLimits(subscription, usage)
      expect(result.withinLimits).toBe(true)
      expect(result.violations.length).toBe(0)
    })

    it("should check limits - violations", () => {
      usage.members.total = 10 // Exceeds starter limit of 5
      const result = checkLimits(subscription, usage)
      expect(result.withinLimits).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it("should check limits - warnings", () => {
      usage.members.total = 5 // At 100% of limit
      const result = checkLimits(subscription, usage)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it("should check feature availability", () => {
      expect(hasFeature(subscription, "hasAnalytics")).toBe(true)
      expect(hasFeature(subscription, "hasPrioritySupport")).toBe(false)
    })

    it("should get remaining quota", () => {
      const remaining = getRemainingQuota(subscription, usage, "members")
      expect(remaining.total).toBe(5)
      expect(remaining.remaining).toBe(2) // 5 - 3
      expect(remaining.percentage).toBe(60) // 3/5 = 60%
    })

    it("should handle unlimited quota", () => {
      const premiumSub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["premium_monthly"]!,
      })

      const remaining = getRemainingQuota(premiumSub, usage, "members")
      expect(remaining.remaining).toBe(-1)
      expect(remaining.total).toBe(-1)
    })
  })

  // ---------------------------------------------------------------------------
  // Trial Management
  // ---------------------------------------------------------------------------

  describe("Trial Management", () => {
    it("should identify trial subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 14,
      })

      expect(isInTrial(sub)).toBe(true)
    })

    it("should not identify active subscription as trial", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      expect(isInTrial(sub)).toBe(false)
    })

    it("should get trial days remaining", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 14,
      })

      const remaining = getTrialDaysRemaining(sub)
      expect(remaining).toBeGreaterThan(12)
      expect(remaining).toBeLessThanOrEqual(14)
    })

    it("should detect trial ending soon", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 2,
      })

      expect(isTrialEndingSoon(sub, 3)).toBe(true)
    })

    it("should convert trial to paid", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
        trialDays: 14,
      })

      const converted = convertTrialToPaid(sub)
      expect(converted.status).toBe("active")
      expect(converted.trialEnd).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Billing
  // ---------------------------------------------------------------------------

  describe("Billing", () => {
    it("should get billing info", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const billing = getBillingInfo(sub)
      expect(billing.currentPeriod.daysRemaining).toBeGreaterThan(25)
      expect(billing.nextBillingAmount).toBe(sub.plan.price)
    })

    it("should show zero next billing for cancelled subscription", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const cancelled = scheduleCancellation(sub)
      const billing = getBillingInfo(cancelled)
      expect(billing.nextBillingAmount).toBe(0)
    })

    it("should check if renewal needed", () => {
      const sub = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      expect(needsRenewal(sub)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  describe("Subscription Analytics", () => {
    it("should calculate metrics from empty store", () => {
      const store = createSubscriptionStore()
      const metrics = calculateMetrics(store)

      expect(metrics.totalSubscriptions).toBe(0)
      expect(metrics.mrr).toBe(0)
    })

    it("should calculate metrics with subscriptions", () => {
      let store = createSubscriptionStore()

      const sub1 = createSubscription({
        householdId: "h1",
        customerId: "c1",
        plan: PLANS["family_monthly"]!,
      })

      const sub2 = createSubscription({
        householdId: "h2",
        customerId: "c2",
        plan: PLANS["premium_monthly"]!,
      })

      store = addSubscription(store, sub1)
      store = addSubscription(store, sub2)

      const metrics = calculateMetrics(store)

      expect(metrics.totalSubscriptions).toBe(2)
      expect(metrics.activeSubscriptions).toBe(2)
      expect(metrics.mrr).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// INVOICE SERVICE TESTS
// =============================================================================

describe("Invoice Service", () => {
  // ---------------------------------------------------------------------------
  // Invoice Store
  // ---------------------------------------------------------------------------

  describe("Invoice Store", () => {
    let store: InvoiceStore
    let invoice: Invoice

    beforeEach(() => {
      store = createInvoiceStore()
      const lineItem = createLineItem({
        description: "Test item",
        quantity: 1,
        unitAmount: 1000,
      })

      invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        subscriptionId: "sub_1",
        lineItems: [lineItem],
      })
    })

    it("should create empty store", () => {
      expect(store.invoices.size).toBe(0)
    })

    it("should add invoice to store", () => {
      const newStore = addInvoice(store, invoice)
      expect(newStore.invoices.size).toBe(1)
    })

    it("should retrieve invoice by ID", () => {
      const newStore = addInvoice(store, invoice)
      const retrieved = getInvoice(newStore, invoice.id)
      expect(retrieved).not.toBeNull()
    })

    it("should retrieve invoices by household", () => {
      const newStore = addInvoice(store, invoice)
      const invoices = getInvoicesByHousehold(newStore, "h1")
      expect(invoices.length).toBe(1)
    })

    it("should retrieve invoices by subscription", () => {
      const newStore = addInvoice(store, invoice)
      const invoices = getInvoicesBySubscription(newStore, "sub_1")
      expect(invoices.length).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Invoice Creation
  // ---------------------------------------------------------------------------

  describe("Invoice Creation", () => {
    it("should generate invoice number", () => {
      const number = generateInvoiceNumber("FL")
      expect(number).toMatch(/^FL-\d{6}-\d{5}$/)
    })

    it("should create line item", () => {
      const item = createLineItem({
        description: "Monthly subscription",
        quantity: 1,
        unitAmount: 499,
      })

      expect(item.amount).toBe(499)
      expect(item.currency).toBe("eur")
    })

    it("should calculate line item amount correctly", () => {
      const item = createLineItem({
        description: "Multiple items",
        quantity: 3,
        unitAmount: 100,
      })

      expect(item.amount).toBe(300)
    })

    it("should create percentage discount", () => {
      const discount = createDiscount({
        code: "SAVE20",
        name: "20% off",
        type: "percentage",
        value: 20,
        subtotal: 1000,
      })

      expect(discount.amountOff).toBe(200)
    })

    it("should create fixed discount", () => {
      const discount = createDiscount({
        name: "5€ off",
        type: "fixed",
        value: 500,
        subtotal: 1000,
      })

      expect(discount.amountOff).toBe(500)
    })

    it("should create tax", () => {
      const tax = createTax({
        name: "VAT",
        rate: 20,
        subtotal: 1000,
      })

      expect(tax.amount).toBe(200)
    })

    it("should create inclusive tax", () => {
      const tax = createTax({
        name: "VAT",
        rate: 20,
        subtotal: 1200,
        inclusive: true,
      })

      expect(tax.amount).toBe(200) // 1200 - (1200 / 1.2) = 200
    })

    it("should create invoice with correct totals", () => {
      const lineItem = createLineItem({
        description: "Service",
        quantity: 1,
        unitAmount: 1000,
      })

      const discount = createDiscount({
        name: "10% off",
        type: "percentage",
        value: 10,
        subtotal: 1000,
      })

      const tax = createTax({
        name: "VAT",
        rate: 20,
        subtotal: 900, // after discount
      })

      const invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [lineItem],
        discounts: [discount],
        taxes: [tax],
      })

      expect(invoice.subtotal).toBe(1000)
      expect(invoice.discountTotal).toBe(100)
      expect(invoice.taxTotal).toBe(180)
      expect(invoice.total).toBe(1080)
    })

    it("should create subscription invoice", () => {
      const invoice = createSubscriptionInvoice({
        householdId: "h1",
        customerId: "c1",
        subscriptionId: "sub_1",
        planName: "Family",
        planPrice: 499,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        taxRate: 20,
      })

      expect(invoice.subscriptionId).toBe("sub_1")
      expect(invoice.lineItems.length).toBe(1)
      expect(invoice.taxes.length).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Invoice Operations
  // ---------------------------------------------------------------------------

  describe("Invoice Operations", () => {
    let invoice: Invoice

    beforeEach(() => {
      const lineItem = createLineItem({
        description: "Test",
        quantity: 1,
        unitAmount: 1000,
      })

      invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [lineItem],
      })
    })

    it("should finalize invoice", () => {
      expect(invoice.status).toBe("draft")
      const finalized = finalizeInvoice(invoice)
      expect(finalized.status).toBe("open")
    })

    it("should not re-finalize non-draft invoice", () => {
      const finalized = finalizeInvoice(invoice)
      const reFinalized = finalizeInvoice(finalized)
      expect(reFinalized).toBe(finalized)
    })

    it("should mark invoice as paid", () => {
      const finalized = finalizeInvoice(invoice)
      const paid = markInvoicePaid(finalized, "pi_123", "pm_456")

      expect(paid.status).toBe("paid")
      expect(paid.amountPaid).toBe(paid.total)
      expect(paid.amountDue).toBe(0)
      expect(paid.paidAt).not.toBeNull()
    })

    it("should record payment failure", () => {
      const finalized = finalizeInvoice(invoice)
      const failed = recordPaymentFailure(finalized, "Card declined")

      expect(failed.attemptCount).toBe(1)
      expect(failed.lastPaymentError).toBe("Card declined")
    })

    it("should void invoice", () => {
      const finalized = finalizeInvoice(invoice)
      const voided = voidInvoice(finalized)

      expect(voided.status).toBe("void")
      expect(voided.amountDue).toBe(0)
      expect(voided.voidedAt).not.toBeNull()
    })

    it("should not void paid invoice", () => {
      const finalized = finalizeInvoice(invoice)
      const paid = markInvoicePaid(finalized)
      const voided = voidInvoice(paid)

      expect(voided.status).toBe("paid")
    })

    it("should mark as uncollectible", () => {
      const finalized = finalizeInvoice(invoice)
      const uncollectible = markUncollectible(finalized)

      expect(uncollectible.status).toBe("uncollectible")
    })

    it("should add line item to draft invoice", () => {
      const newItem = createLineItem({
        description: "Additional",
        quantity: 1,
        unitAmount: 500,
      })

      const updated = addLineItem(invoice, newItem)
      expect(updated.lineItems.length).toBe(2)
      expect(updated.subtotal).toBe(1500)
    })

    it("should not add line item to finalized invoice", () => {
      const finalized = finalizeInvoice(invoice)
      const newItem = createLineItem({
        description: "Additional",
        quantity: 1,
        unitAmount: 500,
      })

      const updated = addLineItem(finalized, newItem)
      expect(updated.lineItems.length).toBe(1)
    })

    it("should apply discount", () => {
      const discount = createDiscount({
        name: "Test",
        type: "percentage",
        value: 10,
        subtotal: 1000,
      })

      const updated = applyDiscount(invoice, discount)
      expect(updated.discounts.length).toBe(1)
      expect(updated.discountTotal).toBe(100)
    })
  })

  // ---------------------------------------------------------------------------
  // Refunds
  // ---------------------------------------------------------------------------

  describe("Refunds", () => {
    it("should create refund", () => {
      const refund = createRefund({
        invoiceId: "inv_1",
        amount: 500,
        reason: "requested_by_customer",
      })

      expect(refund.status).toBe("pending")
      expect(refund.amount).toBe(500)
    })

    it("should apply refund to paid invoice", () => {
      const lineItem = createLineItem({
        description: "Test",
        quantity: 1,
        unitAmount: 1000,
      })

      let invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [lineItem],
      })

      invoice = finalizeInvoice(invoice)
      invoice = markInvoicePaid(invoice)

      const refund = createRefund({
        invoiceId: invoice.id,
        amount: 500,
        reason: "requested_by_customer",
      })

      const refunded = applyRefund(invoice, refund)
      expect(refunded.amountRefunded).toBe(500)
      expect(refunded.amountPaid).toBe(500)
    })

    it("should calculate max refundable amount", () => {
      const lineItem = createLineItem({
        description: "Test",
        quantity: 1,
        unitAmount: 1000,
      })

      let invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [lineItem],
      })

      invoice = finalizeInvoice(invoice)
      invoice = markInvoicePaid(invoice)

      expect(getMaxRefundable(invoice)).toBe(1000)
    })
  })

  // ---------------------------------------------------------------------------
  // Payment Attempts
  // ---------------------------------------------------------------------------

  describe("Payment Attempts", () => {
    it("should create payment attempt", () => {
      const attempt = createPaymentAttempt({
        invoiceId: "inv_1",
        amount: 1000,
        status: "failed",
        errorCode: "card_declined",
        errorMessage: "Your card was declined",
      })

      expect(attempt.status).toBe("failed")
      expect(attempt.errorCode).toBe("card_declined")
    })

    it("should track payment attempts", () => {
      let store = createInvoiceStore()

      const attempt1 = createPaymentAttempt({
        invoiceId: "inv_1",
        amount: 1000,
        status: "failed",
      })

      const attempt2 = createPaymentAttempt({
        invoiceId: "inv_1",
        amount: 1000,
        status: "succeeded",
      })

      store = addPaymentAttempt(store, attempt1)
      store = addPaymentAttempt(store, attempt2)

      const attempts = getPaymentAttempts(store, "inv_1")
      expect(attempts.length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Invoice Queries
  // ---------------------------------------------------------------------------

  describe("Invoice Queries", () => {
    let store: InvoiceStore

    beforeEach(() => {
      store = createInvoiceStore()

      // Add various invoices
      const invoices = [
        { status: "paid", amount: 1000 },
        { status: "open", amount: 500, overdue: true },
        { status: "open", amount: 2000, overdue: false },
        { status: "void", amount: 800 },
      ]

      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i]!
        const lineItem = createLineItem({
          description: "Test",
          quantity: 1,
          unitAmount: inv.amount,
        })

        let invoice = createInvoice({
          householdId: "h1",
          customerId: "c1",
          lineItems: [lineItem],
        })

        if (inv.status === "paid") {
          invoice = finalizeInvoice(invoice)
          invoice = markInvoicePaid(invoice)
        } else if (inv.status === "open") {
          invoice = finalizeInvoice(invoice)
          if (inv.overdue) {
            // Set due date in the past
            invoice = {
              ...invoice,
              dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            }
          }
        } else if (inv.status === "void") {
          invoice = finalizeInvoice(invoice)
          invoice = voidInvoice(invoice)
        }

        store = addInvoice(store, invoice)
      }
    })

    it("should filter by status", () => {
      const invoices = Array.from(store.invoices.values())
      const paid = filterInvoices(invoices, { status: ["paid"] })
      expect(paid.length).toBe(1)
    })

    it("should filter by paid status", () => {
      const invoices = Array.from(store.invoices.values())
      const paid = filterInvoices(invoices, { isPaid: true })
      expect(paid.length).toBe(1)
    })

    it("should filter overdue invoices", () => {
      const invoices = Array.from(store.invoices.values())
      const overdue = filterInvoices(invoices, { isOverdue: true })
      expect(overdue.length).toBe(1)
    })

    it("should get overdue invoices from store", () => {
      const overdue = getOverdueInvoices(store)
      expect(overdue.length).toBe(1)
    })

    it("should get unpaid invoices for household", () => {
      const unpaid = getUnpaidInvoices(store, "h1")
      expect(unpaid.length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Invoice Analytics
  // ---------------------------------------------------------------------------

  describe("Invoice Analytics", () => {
    it("should calculate metrics from empty list", () => {
      const metrics = calculateInvoiceMetrics([])
      expect(metrics.totalInvoices).toBe(0)
      expect(metrics.totalRevenue).toBe(0)
    })

    it("should calculate metrics", () => {
      const invoices: Invoice[] = []

      // Create paid invoice
      let paidInvoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [createLineItem({ description: "Test", quantity: 1, unitAmount: 1000 })],
      })
      paidInvoice = finalizeInvoice(paidInvoice)
      paidInvoice = markInvoicePaid(paidInvoice)
      invoices.push(paidInvoice)

      // Create unpaid invoice
      let unpaidInvoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [createLineItem({ description: "Test", quantity: 1, unitAmount: 500 })],
      })
      unpaidInvoice = finalizeInvoice(unpaidInvoice)
      invoices.push(unpaidInvoice)

      const metrics = calculateInvoiceMetrics(invoices)
      expect(metrics.totalInvoices).toBe(2)
      expect(metrics.paidInvoices).toBe(1)
      expect(metrics.unpaidInvoices).toBe(1)
      expect(metrics.totalRevenue).toBe(1000)
      expect(metrics.outstandingAmount).toBe(500)
    })

    it("should calculate revenue by period", () => {
      const invoices: Invoice[] = []

      let invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [createLineItem({ description: "Test", quantity: 1, unitAmount: 1000 })],
      })
      invoice = finalizeInvoice(invoice)
      invoice = markInvoicePaid(invoice)
      invoices.push(invoice)

      const revenue = getRevenueByPeriod(invoices, "day")
      expect(revenue.size).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  describe("Formatting", () => {
    it("should format amount in EUR", () => {
      const formatted = formatAmount(499, "eur", "fr-FR")
      expect(formatted).toContain("4,99")
      expect(formatted).toContain("€")
    })

    it("should format invoice summary", () => {
      const lineItem = createLineItem({
        description: "Test",
        quantity: 1,
        unitAmount: 1000,
      })

      let invoice = createInvoice({
        householdId: "h1",
        customerId: "c1",
        lineItems: [lineItem],
      })

      invoice = finalizeInvoice(invoice)
      invoice = markInvoicePaid(invoice)

      const summary = formatInvoiceSummary(invoice)
      expect(summary.status).toBe("Payée")
      expect(summary.total).toContain("10,00")
    })
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Subscription & Invoice Integration", () => {
  it("should create subscription with invoice", () => {
    // Create subscription
    const subscription = createSubscription({
      householdId: "h1",
      customerId: "c1",
      plan: PLANS["family_monthly"]!,
    })

    // Create invoice for subscription
    const invoice = createSubscriptionInvoice({
      householdId: subscription.householdId,
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      planName: subscription.plan.name,
      planPrice: subscription.plan.price,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      taxRate: 20,
    })

    expect(invoice.subscriptionId).toBe(subscription.id)
    expect(invoice.subtotal).toBe(subscription.plan.price)
  })

  it("should handle plan upgrade with prorated invoice", () => {
    // Create starter subscription
    const subscription = createSubscription({
      householdId: "h1",
      customerId: "c1",
      plan: PLANS["starter_monthly"]!,
    })

    // Calculate proration
    const newPlan = PLANS["premium_monthly"]!
    const proration = calculateProration(subscription, newPlan)

    // Create prorated line items
    const creditItem = createLineItem({
      description: `Crédit: ${subscription.plan.name}`,
      quantity: 1,
      unitAmount: -proration.creditAmount,
      proration: true,
    })

    const chargeItem = createLineItem({
      description: `Upgrade: ${newPlan.name}`,
      quantity: 1,
      unitAmount: proration.chargeAmount,
      proration: true,
    })

    const invoice = createInvoice({
      householdId: subscription.householdId,
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      lineItems: [creditItem, chargeItem],
      billingReason: "subscription_update",
    })

    expect(invoice.lineItems.length).toBe(2)
    expect(invoice.total).toBe(proration.netAmount)
  })

  it("should track usage against subscription limits", () => {
    const subscription = createSubscription({
      householdId: "h1",
      customerId: "c1",
      plan: PLANS["starter_monthly"]!,
    })

    // Simulate usage over time
    const usage: UsageRecord = {
      householdId: subscription.householdId,
      period: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      },
      tasks: { created: 450, completed: 400, active: 50 },
      members: { total: 4, active: 4 },
      storage: { usedMb: 400, limitMb: 500 },
      notifications: { sent: 90, limit: 100 },
    }

    const limits = checkLimits(subscription, usage)
    expect(limits.withinLimits).toBe(true)
    expect(limits.warnings.length).toBeGreaterThan(0) // Close to limits
  })
})
