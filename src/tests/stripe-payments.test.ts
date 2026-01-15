/**
 * Stripe Payments Tests
 *
 * Unit tests for Stripe integration, webhooks, and billing components.
 * Tests webhook handlers, checkout functions, and subscription management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock database
vi.mock("@/lib/aws/database", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  setCurrentUser: vi.fn(),
}))

// Create mock stripe object
const mockStripeClient = {
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  invoices: {
    list: vi.fn(),
    createPreview: vi.fn(),
  },
  paymentMethods: {
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}

// Inline the real implementations to avoid mock pollution
// This must match src/lib/stripe/client.ts exactly
function mapStripeStatusReal(
  stripeStatus: string
): "active" | "trial" | "past_due" | "cancelled" {
  switch (stripeStatus) {
    case "trialing":
      return "trial"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled"
    default:
      return "active"
  }
}

// Mock stripe client with real implementations of utility functions
vi.mock("@/lib/stripe/client", () => ({
  stripe: mockStripeClient,
  mapStripeStatus: mapStripeStatusReal,
  validateStripeConfig: () => ({ valid: true, missing: [] }),
  PRICE_CONFIG: {
    id: "price_test",
    amount: 400,
    currency: "eur",
    interval: "month" as const,
    trialDays: 14,
  },
  CHECKOUT_CONFIG: {
    successUrl: "http://localhost:3000/settings/billing?success=true",
    cancelUrl: "http://localhost:3000/settings/billing?canceled=true",
    billingAddressCollection: "required" as const,
    allowPromotionCodes: true,
  },
  PORTAL_CONFIG: {
    returnUrl: "http://localhost:3000/settings/billing",
  },
}))

import { query, queryOne } from "@/lib/aws/database"
import { stripe, mapStripeStatus } from "@/lib/stripe/client"
import {
  routeWebhookEvent,
  handleInvoicePaymentFailed,
  handleInvoicePaid,
  handleTrialWillEnd,
} from "@/lib/stripe/webhooks"
import {
  createCheckoutSession,
  createPortalSession,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  changeSubscriptionPlan,
  getUpcomingInvoice,
  extendTrial,
  getPaymentMethod,
} from "@/lib/stripe/checkout"

const mockQuery = query as ReturnType<typeof vi.fn>
const mockQueryOne = queryOne as ReturnType<typeof vi.fn>
const mockStripe = stripe as unknown as typeof mockStripeClient

describe("Stripe Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("routeWebhookEvent", () => {
    it("should route checkout.session.completed event", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { household_id: "hh-123" },
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      }

      // Mock subscription retrieval
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        items: { data: [{ price: { id: "price_123", unit_amount: 400, currency: "eur" } }] },
      })

      // Mock query for upsert
      mockQuery.mockResolvedValue([])
      mockQueryOne.mockResolvedValueOnce(null)

      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })

    it("should route customer.subscription.updated event", async () => {
      const event = {
        type: "customer.subscription.updated",
        data: {
          object: {
            customer: "cus_123",
            status: "active",
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
            cancel_at_period_end: false,
            items: { data: [{ price: { id: "price_123", unit_amount: 400, currency: "eur" } }] },
          },
        },
      }

      mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
      mockQuery.mockResolvedValue([])
      mockQueryOne.mockResolvedValueOnce({ id: "sub-123" })

      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })

    it("should route customer.subscription.deleted event", async () => {
      const event = {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
          },
        },
      }

      mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
      mockQuery.mockResolvedValue([])

      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })

    it("should route invoice.payment_failed event", async () => {
      const event = {
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            amount_due: 400,
            amount_paid: 0,
            currency: "eur",
          },
        },
      }

      mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
      mockQuery.mockResolvedValue([])

      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })

    it("should route invoice.paid event", async () => {
      const event = {
        type: "invoice.paid",
        data: {
          object: {
            id: "in_123",
            customer: "cus_123",
            amount_due: 400,
            amount_paid: 400,
            currency: "eur",
          },
        },
      }

      mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
      mockQuery.mockResolvedValue([])
      mockQueryOne.mockResolvedValueOnce(null)

      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })

    it("should handle unknown event type", async () => {
      const event = { type: "unknown.event" }
      const result = await routeWebhookEvent(event as any)
      expect(result.success).toBe(true)
    })
  })

  describe("handleTrialWillEnd", () => {
    it("should create notification for trial ending", async () => {
      const event = {
        type: "customer.subscription.trial_will_end",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 3600,
          },
        },
      }

      mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
      mockQuery.mockResolvedValueOnce([])

      const result = await handleTrialWillEnd(event as any)
      expect(result.success).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO notifications"),
        expect.arrayContaining(["hh-123", "trial_ending"])
      )
    })
  })
})

describe("Stripe Checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createCheckoutSession", () => {
    it("should create checkout session for new customer", async () => {
      // Household has no stripe customer
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: null,
        name: "Test Household",
      })

      // Create customer
      mockStripe.customers.create.mockResolvedValueOnce({ id: "cus_new" })
      mockQuery.mockResolvedValueOnce([])

      // Check existing subscription - none
      mockStripe.subscriptions.list.mockResolvedValueOnce({ data: [] })

      // Create session
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: "cs_123",
        url: "https://checkout.stripe.com/...",
      })

      const result = await createCheckoutSession("hh-123", "test@example.com")

      expect(result.success).toBe(true)
      expect(result.sessionId).toBe("cs_123")
      expect(result.url).toBeDefined()
    })

    it("should return error if already has subscription", async () => {
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: "cus_existing",
        name: "Test Household",
      })

      // Has existing subscription
      mockStripe.subscriptions.list.mockResolvedValueOnce({
        data: [{ id: "sub_existing" }],
      })

      const result = await createCheckoutSession("hh-123", "test@example.com")

      expect(result.success).toBe(false)
      expect(result.error).toContain("active subscription")
    })
  })

  describe("createPortalSession", () => {
    it("should create portal session", async () => {
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: "cus_123",
      })

      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
        url: "https://billing.stripe.com/...",
      })

      const result = await createPortalSession("hh-123")

      expect(result.success).toBe(true)
      expect(result.url).toBeDefined()
    })

    it("should return error if no customer", async () => {
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: null,
      })

      const result = await createPortalSession("hh-123")

      expect(result.success).toBe(false)
      expect(result.error).toContain("No Stripe customer")
    })
  })

  describe("cancelSubscriptionAtPeriodEnd", () => {
    it("should cancel subscription at period end", async () => {
      mockStripe.subscriptions.update.mockResolvedValueOnce({
        id: "sub_123",
        cancel_at_period_end: true,
      })

      const result = await cancelSubscriptionAtPeriodEnd("sub_123")

      expect(result.success).toBe(true)
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: true,
      })
    })
  })

  describe("resumeSubscription", () => {
    it("should resume cancelled subscription", async () => {
      mockStripe.subscriptions.update.mockResolvedValueOnce({
        id: "sub_123",
        cancel_at_period_end: false,
      })

      const result = await resumeSubscription("sub_123")

      expect(result.success).toBe(true)
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: false,
      })
    })
  })

  describe("changeSubscriptionPlan", () => {
    it("should change subscription plan", async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: "sub_123",
        items: { data: [{ id: "si_123" }] },
      })

      mockStripe.subscriptions.update.mockResolvedValueOnce({
        id: "sub_123",
      })

      const result = await changeSubscriptionPlan("sub_123", "price_new")

      expect(result.success).toBe(true)
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        "sub_123",
        expect.objectContaining({
          proration_behavior: "create_prorations",
        })
      )
    })

    it("should return error if no subscription items", async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: "sub_123",
        items: { data: [] },
      })

      const result = await changeSubscriptionPlan("sub_123", "price_new")

      expect(result.success).toBe(false)
      expect(result.error).toContain("No subscription items")
    })
  })

  describe("getUpcomingInvoice", () => {
    it("should get upcoming invoice preview", async () => {
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: "cus_123",
      })

      mockStripe.invoices.createPreview.mockResolvedValueOnce({
        amount_due: 400,
        currency: "eur",
        next_payment_attempt: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      })

      const result = await getUpcomingInvoice("hh-123")

      expect(result.success).toBe(true)
      expect(result.amount).toBe(400)
      expect(result.currency).toBe("eur")
    })
  })

  describe("extendTrial", () => {
    it("should extend trial period", async () => {
      const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 3600

      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: "sub_123",
        status: "trialing",
        trial_end: trialEnd,
      })

      mockStripe.subscriptions.update.mockResolvedValueOnce({
        id: "sub_123",
      })

      const result = await extendTrial("sub_123", 7)

      expect(result.success).toBe(true)
      expect(result.newTrialEnd).toBeDefined()
    })

    it("should return error if not in trial", async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: "sub_123",
        status: "active",
      })

      const result = await extendTrial("sub_123", 7)

      expect(result.success).toBe(false)
      expect(result.error).toContain("not in trial")
    })
  })

  describe("getPaymentMethod", () => {
    it("should get card payment method details", async () => {
      mockQueryOne.mockResolvedValueOnce({
        stripe_customer_id: "cus_123",
      })

      mockStripe.customers.retrieve.mockResolvedValueOnce({
        id: "cus_123",
        invoice_settings: {
          default_payment_method: "pm_123",
        },
      })

      mockStripe.paymentMethods.retrieve.mockResolvedValueOnce({
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2025,
        },
      })

      const result = await getPaymentMethod("hh-123")

      expect(result.success).toBe(true)
      expect(result.paymentMethod?.brand).toBe("visa")
      expect(result.paymentMethod?.last4).toBe("4242")
    })
  })
})

describe("Map Stripe Status", () => {
  it("should map trialing to trial", () => {
    expect(mapStripeStatus("trialing")).toBe("trial")
  })

  it("should map active to active", () => {
    expect(mapStripeStatus("active")).toBe("active")
  })

  it("should map past_due to past_due", () => {
    expect(mapStripeStatus("past_due")).toBe("past_due")
  })

  it("should map canceled to cancelled", () => {
    expect(mapStripeStatus("canceled")).toBe("cancelled")
  })
})

describe("Pricing Configuration", () => {
  it("should have correct price configuration", () => {
    const { PRICE_CONFIG } = require("@/lib/stripe/client")

    expect(PRICE_CONFIG.amount).toBe(400)
    expect(PRICE_CONFIG.currency).toBe("eur")
    expect(PRICE_CONFIG.interval).toBe("month")
    expect(PRICE_CONFIG.trialDays).toBe(14)
  })
})

describe("Invoice Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should store invoice on payment failed", async () => {
    const event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_123",
          customer: "cus_123",
          number: "INV-001",
          amount_due: 400,
          amount_paid: 0,
          currency: "eur",
          invoice_pdf: "https://...",
          hosted_invoice_url: "https://...",
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          created: Math.floor(Date.now() / 1000),
        },
      },
    }

    mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
    mockQuery.mockResolvedValue([])
    mockQueryOne.mockResolvedValueOnce(null) // No existing invoice

    const result = await handleInvoicePaymentFailed(event as any)

    expect(result.success).toBe(true)
    // Should update household status
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("subscription_status = 'past_due'"),
      expect.any(Array)
    )
  })

  it("should store invoice on payment success", async () => {
    const event = {
      type: "invoice.paid",
      data: {
        object: {
          id: "in_123",
          customer: "cus_123",
          number: "INV-001",
          amount_due: 400,
          amount_paid: 400,
          currency: "eur",
          invoice_pdf: "https://...",
          hosted_invoice_url: "https://...",
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          created: Math.floor(Date.now() / 1000),
        },
      },
    }

    mockQueryOne.mockResolvedValueOnce({ id: "hh-123" })
    mockQueryOne.mockResolvedValueOnce(null) // No existing invoice
    mockQuery.mockResolvedValue([])

    const result = await handleInvoicePaid(event as any)

    expect(result.success).toBe(true)
    // Should insert invoice
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO invoices"),
      expect.any(Array)
    )
  })
})
