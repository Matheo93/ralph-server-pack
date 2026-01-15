/**
 * Invoice Service - Advanced invoice management
 * Functional, immutable approach to invoice operations
 */

import { z } from "zod"

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const InvoiceStatus = z.enum([
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
  "failed",
])
export type InvoiceStatus = z.infer<typeof InvoiceStatus>

export const PaymentStatus = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
])
export type PaymentStatus = z.infer<typeof PaymentStatus>

export const LineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(), // in cents
  amount: z.number(), // total in cents
  currency: z.string().default("eur"),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  proration: z.boolean().default(false),
  metadata: z.record(z.string(), z.string()).default({}),
})
export type LineItem = z.infer<typeof LineItemSchema>

export const DiscountSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number(), // percentage (0-100) or fixed amount in cents
  amountOff: z.number(), // actual discount in cents
})
export type Discount = z.infer<typeof DiscountSchema>

export const TaxSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(), // percentage (e.g., 20 for 20%)
  amount: z.number(), // tax amount in cents
  inclusive: z.boolean().default(false),
})
export type Tax = z.infer<typeof TaxSchema>

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  householdId: z.string(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  status: InvoiceStatus,

  // Amounts
  subtotal: z.number(), // before discounts and taxes
  discountTotal: z.number(),
  taxTotal: z.number(),
  total: z.number(), // final amount
  amountDue: z.number(), // remaining to pay
  amountPaid: z.number(),
  amountRefunded: z.number(),

  // Currency
  currency: z.string().default("eur"),

  // Line items
  lineItems: z.array(LineItemSchema),
  discounts: z.array(DiscountSchema),
  taxes: z.array(TaxSchema),

  // Billing
  billingReason: z.enum([
    "subscription_create",
    "subscription_cycle",
    "subscription_update",
    "manual",
    "upcoming",
  ]).nullable(),

  // Period
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  dueDate: z.date().nullable(),
  paidAt: z.date().nullable(),
  voidedAt: z.date().nullable(),

  // Payment
  paymentIntentId: z.string().nullable(),
  paymentMethodId: z.string().nullable(),
  lastPaymentError: z.string().nullable(),
  attemptCount: z.number().default(0),
  nextPaymentAttempt: z.date().nullable(),

  // URLs
  hostedInvoiceUrl: z.string().nullable(),
  invoicePdf: z.string().nullable(),

  // Metadata
  description: z.string().nullable(),
  footer: z.string().nullable(),
  metadata: z.record(z.string(), z.string()).default({}),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const RefundSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amount: z.number(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer", "other"]),
  status: z.enum(["pending", "succeeded", "failed", "canceled"]),
  createdAt: z.date(),
})
export type Refund = z.infer<typeof RefundSchema>

export const PaymentAttemptSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amount: z.number(),
  status: PaymentStatus,
  paymentMethodId: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attemptedAt: z.date(),
})
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>

// =============================================================================
// INVOICE STORE
// =============================================================================

export interface InvoiceStore {
  readonly invoices: ReadonlyMap<string, Invoice>
  readonly byHousehold: ReadonlyMap<string, Set<string>>
  readonly byCustomer: ReadonlyMap<string, Set<string>>
  readonly bySubscription: ReadonlyMap<string, Set<string>>
  readonly refunds: ReadonlyMap<string, Refund>
  readonly paymentAttempts: ReadonlyMap<string, PaymentAttempt[]>
}

/**
 * Create empty invoice store
 */
export function createInvoiceStore(): InvoiceStore {
  return {
    invoices: new Map(),
    byHousehold: new Map(),
    byCustomer: new Map(),
    bySubscription: new Map(),
    refunds: new Map(),
    paymentAttempts: new Map(),
  }
}

/**
 * Add invoice to store
 */
export function addInvoice(
  store: InvoiceStore,
  invoice: Invoice
): InvoiceStore {
  const invoices = new Map(store.invoices)
  const byHousehold = new Map(store.byHousehold)
  const byCustomer = new Map(store.byCustomer)
  const bySubscription = new Map(store.bySubscription)

  invoices.set(invoice.id, invoice)

  // Update byHousehold index
  const householdInvoices = new Set(byHousehold.get(invoice.householdId) ?? [])
  householdInvoices.add(invoice.id)
  byHousehold.set(invoice.householdId, householdInvoices)

  // Update byCustomer index
  const customerInvoices = new Set(byCustomer.get(invoice.customerId) ?? [])
  customerInvoices.add(invoice.id)
  byCustomer.set(invoice.customerId, customerInvoices)

  // Update bySubscription index
  if (invoice.subscriptionId) {
    const subInvoices = new Set(bySubscription.get(invoice.subscriptionId) ?? [])
    subInvoices.add(invoice.id)
    bySubscription.set(invoice.subscriptionId, subInvoices)
  }

  return {
    ...store,
    invoices,
    byHousehold,
    byCustomer,
    bySubscription,
  }
}

/**
 * Get invoice by ID
 */
export function getInvoice(
  store: InvoiceStore,
  invoiceId: string
): Invoice | null {
  return store.invoices.get(invoiceId) ?? null
}

/**
 * Get invoices by household
 */
export function getInvoicesByHousehold(
  store: InvoiceStore,
  householdId: string
): Invoice[] {
  const ids = store.byHousehold.get(householdId)
  if (!ids) return []

  return Array.from(ids)
    .map((id) => store.invoices.get(id))
    .filter((inv): inv is Invoice => inv !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Get invoices by subscription
 */
export function getInvoicesBySubscription(
  store: InvoiceStore,
  subscriptionId: string
): Invoice[] {
  const ids = store.bySubscription.get(subscriptionId)
  if (!ids) return []

  return Array.from(ids)
    .map((id) => store.invoices.get(id))
    .filter((inv): inv is Invoice => inv !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// =============================================================================
// INVOICE CREATION
// =============================================================================

let invoiceCounter = 1000

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(prefix: string = "FL"): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  const sequence = String(++invoiceCounter).padStart(5, "0")
  return `${prefix}-${year}${month}-${sequence}`
}

/**
 * Create line item
 */
export function createLineItem(params: {
  description: string
  quantity: number
  unitAmount: number
  currency?: string
  periodStart?: Date
  periodEnd?: Date
  proration?: boolean
  metadata?: Record<string, string>
}): LineItem {
  return {
    id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    description: params.description,
    quantity: params.quantity,
    unitAmount: params.unitAmount,
    amount: params.quantity * params.unitAmount,
    currency: params.currency ?? "eur",
    periodStart: params.periodStart ?? null,
    periodEnd: params.periodEnd ?? null,
    proration: params.proration ?? false,
    metadata: params.metadata ?? {},
  }
}

/**
 * Create discount
 */
export function createDiscount(params: {
  code?: string
  name: string
  type: "percentage" | "fixed"
  value: number
  subtotal: number
}): Discount {
  const amountOff = params.type === "percentage"
    ? Math.round(params.subtotal * (params.value / 100))
    : params.value

  return {
    id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    code: params.code ?? null,
    name: params.name,
    type: params.type,
    value: params.value,
    amountOff,
  }
}

/**
 * Create tax
 */
export function createTax(params: {
  name: string
  rate: number
  subtotal: number
  inclusive?: boolean
}): Tax {
  const amount = params.inclusive
    ? Math.round(params.subtotal - (params.subtotal / (1 + params.rate / 100)))
    : Math.round(params.subtotal * (params.rate / 100))

  return {
    id: `tax_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: params.name,
    rate: params.rate,
    amount,
    inclusive: params.inclusive ?? false,
  }
}

/**
 * Create invoice
 */
export function createInvoice(params: {
  householdId: string
  customerId: string
  subscriptionId?: string
  lineItems: LineItem[]
  discounts?: Discount[]
  taxes?: Tax[]
  billingReason?: Invoice["billingReason"]
  periodStart?: Date
  periodEnd?: Date
  dueDate?: Date
  description?: string
  footer?: string
  metadata?: Record<string, string>
}): Invoice {
  const now = new Date()

  const subtotal = params.lineItems.reduce((sum, item) => sum + item.amount, 0)
  const discountTotal = (params.discounts ?? []).reduce((sum, d) => sum + d.amountOff, 0)
  const taxTotal = (params.taxes ?? []).reduce((sum, t) => sum + t.amount, 0)
  const total = subtotal - discountTotal + taxTotal

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    number: generateInvoiceNumber(),
    householdId: params.householdId,
    customerId: params.customerId,
    subscriptionId: params.subscriptionId ?? null,
    status: "draft",

    subtotal,
    discountTotal,
    taxTotal,
    total,
    amountDue: total,
    amountPaid: 0,
    amountRefunded: 0,

    currency: params.lineItems[0]?.currency ?? "eur",

    lineItems: params.lineItems,
    discounts: params.discounts ?? [],
    taxes: params.taxes ?? [],

    billingReason: params.billingReason ?? null,

    periodStart: params.periodStart ?? null,
    periodEnd: params.periodEnd ?? null,
    dueDate: params.dueDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    paidAt: null,
    voidedAt: null,

    paymentIntentId: null,
    paymentMethodId: null,
    lastPaymentError: null,
    attemptCount: 0,
    nextPaymentAttempt: null,

    hostedInvoiceUrl: null,
    invoicePdf: null,

    description: params.description ?? null,
    footer: params.footer ?? null,
    metadata: params.metadata ?? {},

    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Create subscription invoice
 */
export function createSubscriptionInvoice(params: {
  householdId: string
  customerId: string
  subscriptionId: string
  planName: string
  planPrice: number
  periodStart: Date
  periodEnd: Date
  taxRate?: number
  discountCode?: string
  discountPercent?: number
}): Invoice {
  const lineItem = createLineItem({
    description: `Abonnement ${params.planName}`,
    quantity: 1,
    unitAmount: params.planPrice,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })

  const subtotal = lineItem.amount

  const discounts: Discount[] = []
  if (params.discountCode && params.discountPercent) {
    discounts.push(createDiscount({
      code: params.discountCode,
      name: `Promotion ${params.discountCode}`,
      type: "percentage",
      value: params.discountPercent,
      subtotal,
    }))
  }

  const discountTotal = discounts.reduce((sum, d) => sum + d.amountOff, 0)
  const afterDiscount = subtotal - discountTotal

  const taxes: Tax[] = []
  if (params.taxRate && params.taxRate > 0) {
    taxes.push(createTax({
      name: "TVA",
      rate: params.taxRate,
      subtotal: afterDiscount,
      inclusive: false,
    }))
  }

  return createInvoice({
    householdId: params.householdId,
    customerId: params.customerId,
    subscriptionId: params.subscriptionId,
    lineItems: [lineItem],
    discounts,
    taxes,
    billingReason: "subscription_cycle",
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })
}

// =============================================================================
// INVOICE OPERATIONS
// =============================================================================

/**
 * Finalize invoice (move from draft to open)
 */
export function finalizeInvoice(invoice: Invoice): Invoice {
  if (invoice.status !== "draft") {
    return invoice
  }

  return {
    ...invoice,
    status: "open",
    updatedAt: new Date(),
  }
}

/**
 * Mark invoice as paid
 */
export function markInvoicePaid(
  invoice: Invoice,
  paymentIntentId?: string,
  paymentMethodId?: string
): Invoice {
  if (invoice.status === "paid" || invoice.status === "void") {
    return invoice
  }

  const now = new Date()

  return {
    ...invoice,
    status: "paid",
    amountPaid: invoice.total,
    amountDue: 0,
    paidAt: now,
    paymentIntentId: paymentIntentId ?? invoice.paymentIntentId,
    paymentMethodId: paymentMethodId ?? invoice.paymentMethodId,
    lastPaymentError: null,
    updatedAt: now,
  }
}

/**
 * Record failed payment attempt
 */
export function recordPaymentFailure(
  invoice: Invoice,
  errorMessage: string,
  nextAttemptDate?: Date
): Invoice {
  return {
    ...invoice,
    status: "open",
    attemptCount: invoice.attemptCount + 1,
    lastPaymentError: errorMessage,
    nextPaymentAttempt: nextAttemptDate ?? null,
    updatedAt: new Date(),
  }
}

/**
 * Void invoice
 */
export function voidInvoice(invoice: Invoice): Invoice {
  if (invoice.status === "paid" || invoice.status === "void") {
    return invoice
  }

  const now = new Date()

  return {
    ...invoice,
    status: "void",
    amountDue: 0,
    voidedAt: now,
    updatedAt: now,
  }
}

/**
 * Mark invoice as uncollectible
 */
export function markUncollectible(invoice: Invoice): Invoice {
  if (invoice.status === "paid" || invoice.status === "void") {
    return invoice
  }

  return {
    ...invoice,
    status: "uncollectible",
    updatedAt: new Date(),
  }
}

/**
 * Add line item to invoice
 */
export function addLineItem(invoice: Invoice, lineItem: LineItem): Invoice {
  if (invoice.status !== "draft") {
    return invoice // Cannot modify finalized invoice
  }

  const lineItems = [...invoice.lineItems, lineItem]
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const total = subtotal - invoice.discountTotal + invoice.taxTotal

  return {
    ...invoice,
    lineItems,
    subtotal,
    total,
    amountDue: total - invoice.amountPaid,
    updatedAt: new Date(),
  }
}

/**
 * Apply discount to invoice
 */
export function applyDiscount(invoice: Invoice, discount: Discount): Invoice {
  if (invoice.status !== "draft") {
    return invoice
  }

  const discounts = [...invoice.discounts, discount]
  const discountTotal = discounts.reduce((sum, d) => sum + d.amountOff, 0)
  const total = invoice.subtotal - discountTotal + invoice.taxTotal

  return {
    ...invoice,
    discounts,
    discountTotal,
    total,
    amountDue: total - invoice.amountPaid,
    updatedAt: new Date(),
  }
}

// =============================================================================
// REFUNDS
// =============================================================================

/**
 * Create refund for invoice
 */
export function createRefund(params: {
  invoiceId: string
  amount: number
  reason: Refund["reason"]
}): Refund {
  return {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    invoiceId: params.invoiceId,
    amount: params.amount,
    reason: params.reason,
    status: "pending",
    createdAt: new Date(),
  }
}

/**
 * Apply refund to invoice
 */
export function applyRefund(
  invoice: Invoice,
  refund: Refund
): Invoice {
  if (invoice.status !== "paid") {
    return invoice // Can only refund paid invoices
  }

  const newAmountRefunded = invoice.amountRefunded + refund.amount
  const newAmountPaid = invoice.amountPaid - refund.amount

  return {
    ...invoice,
    amountRefunded: newAmountRefunded,
    amountPaid: Math.max(0, newAmountPaid),
    amountDue: Math.max(0, invoice.total - newAmountPaid),
    updatedAt: new Date(),
  }
}

/**
 * Calculate maximum refundable amount
 */
export function getMaxRefundable(invoice: Invoice): number {
  return invoice.amountPaid - invoice.amountRefunded
}

// =============================================================================
// PAYMENT ATTEMPTS
// =============================================================================

/**
 * Create payment attempt record
 */
export function createPaymentAttempt(params: {
  invoiceId: string
  amount: number
  status: PaymentStatus
  paymentMethodId?: string
  errorCode?: string
  errorMessage?: string
}): PaymentAttempt {
  return {
    id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    invoiceId: params.invoiceId,
    amount: params.amount,
    status: params.status,
    paymentMethodId: params.paymentMethodId ?? null,
    errorCode: params.errorCode ?? null,
    errorMessage: params.errorMessage ?? null,
    attemptedAt: new Date(),
  }
}

/**
 * Add payment attempt to store
 */
export function addPaymentAttempt(
  store: InvoiceStore,
  attempt: PaymentAttempt
): InvoiceStore {
  const paymentAttempts = new Map(store.paymentAttempts)
  const existing = paymentAttempts.get(attempt.invoiceId) ?? []
  paymentAttempts.set(attempt.invoiceId, [...existing, attempt])

  return {
    ...store,
    paymentAttempts,
  }
}

/**
 * Get payment attempts for invoice
 */
export function getPaymentAttempts(
  store: InvoiceStore,
  invoiceId: string
): PaymentAttempt[] {
  return store.paymentAttempts.get(invoiceId) ?? []
}

// =============================================================================
// INVOICE QUERIES & FILTERS
// =============================================================================

export interface InvoiceFilter {
  status?: InvoiceStatus[]
  dateRange?: {
    start: Date
    end: Date
  }
  minAmount?: number
  maxAmount?: number
  isPaid?: boolean
  isOverdue?: boolean
}

/**
 * Filter invoices
 */
export function filterInvoices(
  invoices: Invoice[],
  filter: InvoiceFilter
): Invoice[] {
  return invoices.filter((inv) => {
    if (filter.status && !filter.status.includes(inv.status)) {
      return false
    }

    if (filter.dateRange) {
      const created = inv.createdAt.getTime()
      if (created < filter.dateRange.start.getTime() ||
          created > filter.dateRange.end.getTime()) {
        return false
      }
    }

    if (filter.minAmount !== undefined && inv.total < filter.minAmount) {
      return false
    }

    if (filter.maxAmount !== undefined && inv.total > filter.maxAmount) {
      return false
    }

    if (filter.isPaid !== undefined) {
      const isPaid = inv.status === "paid"
      if (isPaid !== filter.isPaid) {
        return false
      }
    }

    if (filter.isOverdue !== undefined) {
      const isOverdue = inv.dueDate !== null &&
        inv.status === "open" &&
        inv.dueDate.getTime() < Date.now()
      if (isOverdue !== filter.isOverdue) {
        return false
      }
    }

    return true
  })
}

/**
 * Get overdue invoices
 */
export function getOverdueInvoices(store: InvoiceStore): Invoice[] {
  const now = Date.now()
  return Array.from(store.invoices.values())
    .filter((inv) =>
      inv.status === "open" &&
      inv.dueDate !== null &&
      inv.dueDate.getTime() < now
    )
    .sort((a, b) => {
      const dateA = a.dueDate?.getTime() ?? 0
      const dateB = b.dueDate?.getTime() ?? 0
      return dateA - dateB
    })
}

/**
 * Get unpaid invoices for household
 */
export function getUnpaidInvoices(
  store: InvoiceStore,
  householdId: string
): Invoice[] {
  return getInvoicesByHousehold(store, householdId)
    .filter((inv) => inv.status === "open" && inv.amountDue > 0)
}

// =============================================================================
// INVOICE ANALYTICS
// =============================================================================

export interface InvoiceMetrics {
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  overdueInvoices: number
  voidedInvoices: number
  totalRevenue: number
  outstandingAmount: number
  averageInvoiceAmount: number
  paymentSuccessRate: number
  averageDaysToPayment: number
}

/**
 * Calculate invoice metrics
 */
export function calculateInvoiceMetrics(invoices: Invoice[]): InvoiceMetrics {
  if (invoices.length === 0) {
    return {
      totalInvoices: 0,
      paidInvoices: 0,
      unpaidInvoices: 0,
      overdueInvoices: 0,
      voidedInvoices: 0,
      totalRevenue: 0,
      outstandingAmount: 0,
      averageInvoiceAmount: 0,
      paymentSuccessRate: 0,
      averageDaysToPayment: 0,
    }
  }

  const now = Date.now()
  const paid = invoices.filter((i) => i.status === "paid")
  const unpaid = invoices.filter((i) => i.status === "open")
  const overdue = invoices.filter((i) =>
    i.status === "open" && i.dueDate !== null && i.dueDate.getTime() < now
  )
  const voided = invoices.filter((i) => i.status === "void")

  const totalRevenue = paid.reduce((sum, i) => sum + i.amountPaid, 0)
  const outstandingAmount = unpaid.reduce((sum, i) => sum + i.amountDue, 0)

  // Calculate average days to payment
  const paidWithDates = paid.filter((i) => i.paidAt !== null)
  const totalDaysToPayment = paidWithDates.reduce((sum, i) => {
    const created = i.createdAt.getTime()
    const paidAt = i.paidAt!.getTime()
    return sum + Math.ceil((paidAt - created) / (24 * 60 * 60 * 1000))
  }, 0)
  const averageDaysToPayment = paidWithDates.length > 0
    ? Math.round(totalDaysToPayment / paidWithDates.length)
    : 0

  // Calculate success rate (paid / (paid + failed + uncollectible))
  const attempted = invoices.filter((i) =>
    i.status === "paid" || i.status === "failed" || i.status === "uncollectible"
  )
  const paymentSuccessRate = attempted.length > 0
    ? Math.round((paid.length / attempted.length) * 100)
    : 0

  return {
    totalInvoices: invoices.length,
    paidInvoices: paid.length,
    unpaidInvoices: unpaid.length,
    overdueInvoices: overdue.length,
    voidedInvoices: voided.length,
    totalRevenue,
    outstandingAmount,
    averageInvoiceAmount: Math.round(totalRevenue / Math.max(1, paid.length)),
    paymentSuccessRate,
    averageDaysToPayment,
  }
}

/**
 * Get revenue by period
 */
export function getRevenueByPeriod(
  invoices: Invoice[],
  periodType: "day" | "week" | "month" | "year"
): Map<string, number> {
  const revenue = new Map<string, number>()

  const paid = invoices.filter((i) => i.status === "paid" && i.paidAt !== null)

  for (const invoice of paid) {
    const date = invoice.paidAt!
    let key: string

    switch (periodType) {
      case "day":
        key = date.toISOString().slice(0, 10)
        break
      case "week":
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().slice(0, 10)
        break
      case "month":
        key = date.toISOString().slice(0, 7)
        break
      case "year":
        key = String(date.getFullYear())
        break
    }

    const current = revenue.get(key) ?? 0
    revenue.set(key, current + invoice.amountPaid)
  }

  return revenue
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format amount for display
 */
export function formatAmount(
  amount: number,
  currency: string = "eur",
  locale: string = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Format invoice summary
 */
export function formatInvoiceSummary(invoice: Invoice, locale: string = "fr-FR"): {
  number: string
  date: string
  status: string
  total: string
  amountDue: string
} {
  const statusLabels: Record<InvoiceStatus, string> = {
    draft: "Brouillon",
    open: "En attente",
    paid: "Payée",
    void: "Annulée",
    uncollectible: "Irrécouvrable",
    failed: "Échec",
  }

  return {
    number: invoice.number ?? invoice.id,
    date: invoice.createdAt.toLocaleDateString(locale),
    status: statusLabels[invoice.status],
    total: formatAmount(invoice.total, invoice.currency, locale),
    amountDue: formatAmount(invoice.amountDue, invoice.currency, locale),
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const invoiceService = {
  // Store
  createInvoiceStore,
  addInvoice,
  getInvoice,
  getInvoicesByHousehold,
  getInvoicesBySubscription,

  // Creation
  generateInvoiceNumber,
  createLineItem,
  createDiscount,
  createTax,
  createInvoice,
  createSubscriptionInvoice,

  // Operations
  finalizeInvoice,
  markInvoicePaid,
  recordPaymentFailure,
  voidInvoice,
  markUncollectible,
  addLineItem,
  applyDiscount,

  // Refunds
  createRefund,
  applyRefund,
  getMaxRefundable,

  // Payment Attempts
  createPaymentAttempt,
  addPaymentAttempt,
  getPaymentAttempts,

  // Queries
  filterInvoices,
  getOverdueInvoices,
  getUnpaidInvoices,

  // Analytics
  calculateInvoiceMetrics,
  getRevenueByPeriod,

  // Formatting
  formatAmount,
  formatInvoiceSummary,
}
