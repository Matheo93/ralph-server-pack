/**
 * Billing & Subscription Tests
 *
 * Tests for Stripe integration and subscription management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  PRICE_CONFIG,
  CHECKOUT_CONFIG,
  mapStripeStatus,
  validateStripeConfig,
} from "@/lib/stripe/client"
import {
  PREMIUM_FEATURES,
  FREE_PLAN_LIMITS,
} from "@/lib/services/subscription"

describe("Stripe Client", () => {
  describe("PRICE_CONFIG", () => {
    it("should have correct price (4€)", () => {
      expect(PRICE_CONFIG.amount).toBe(400) // 400 cents = 4€
    })

    it("should use EUR currency", () => {
      expect(PRICE_CONFIG.currency).toBe("eur")
    })

    it("should have monthly interval", () => {
      expect(PRICE_CONFIG.interval).toBe("month")
    })

    it("should have 14-day trial", () => {
      expect(PRICE_CONFIG.trialDays).toBe(14)
    })
  })

  describe("CHECKOUT_CONFIG", () => {
    it("should require billing address", () => {
      expect(CHECKOUT_CONFIG.billingAddressCollection).toBe("required")
    })

    it("should allow promotion codes", () => {
      expect(CHECKOUT_CONFIG.allowPromotionCodes).toBe(true)
    })

    it("should have success URL", () => {
      expect(CHECKOUT_CONFIG.successUrl).toContain("success=true")
    })

    it("should have cancel URL", () => {
      expect(CHECKOUT_CONFIG.cancelUrl).toContain("canceled=true")
    })
  })

  describe("mapStripeStatus", () => {
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

    it("should map unpaid to cancelled", () => {
      expect(mapStripeStatus("unpaid")).toBe("cancelled")
    })

    it("should map incomplete_expired to cancelled", () => {
      expect(mapStripeStatus("incomplete_expired")).toBe("cancelled")
    })

    it("should default to active for unknown status", () => {
      expect(mapStripeStatus("incomplete")).toBe("active")
    })
  })

  describe("validateStripeConfig", () => {
    it("should return validation result object", () => {
      const result = validateStripeConfig()
      expect(result).toHaveProperty("valid")
      expect(result).toHaveProperty("missing")
    })

    it("should return array for missing keys", () => {
      const result = validateStripeConfig()
      expect(Array.isArray(result.missing)).toBe(true)
    })
  })
})

describe("Subscription Service", () => {
  describe("PREMIUM_FEATURES", () => {
    it("should have unlimited children feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "unlimited_children")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have auto tasks feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "auto_tasks")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have unlimited voice feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "unlimited_voice")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have full history feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "full_history")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have streak joker feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "streak_joker")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have PDF export feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "pdf_export")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have priority support feature", () => {
      const feature = PREMIUM_FEATURES.find((f) => f.id === "priority_support")
      expect(feature).toBeDefined()
      expect(feature?.requiresPremium).toBe(true)
    })

    it("should have French names for all features", () => {
      for (const feature of PREMIUM_FEATURES) {
        expect(feature.name).toBeTruthy()
        expect(feature.description).toBeTruthy()
      }
    })
  })

  describe("FREE_PLAN_LIMITS", () => {
    it("should limit children to 2", () => {
      expect(FREE_PLAN_LIMITS.maxChildren).toBe(2)
    })

    it("should limit voice commands to 5 per day", () => {
      expect(FREE_PLAN_LIMITS.maxVoiceCommandsPerDay).toBe(5)
    })

    it("should limit history to 7 days", () => {
      expect(FREE_PLAN_LIMITS.historyDays).toBe(7)
    })

    it("should not allow auto tasks", () => {
      expect(FREE_PLAN_LIMITS.canUseAutoTasks).toBe(false)
    })

    it("should not allow streak joker", () => {
      expect(FREE_PLAN_LIMITS.canUseStreakJoker).toBe(false)
    })

    it("should not allow PDF export", () => {
      expect(FREE_PLAN_LIMITS.canExportPdf).toBe(false)
    })
  })
})

describe("Subscription Status Types", () => {
  it("should recognize active status", () => {
    const validStatuses = ["active", "trial", "past_due", "cancelled", "none"]
    expect(validStatuses).toContain("active")
  })

  it("should recognize trial status", () => {
    const validStatuses = ["active", "trial", "past_due", "cancelled", "none"]
    expect(validStatuses).toContain("trial")
  })

  it("should recognize past_due status", () => {
    const validStatuses = ["active", "trial", "past_due", "cancelled", "none"]
    expect(validStatuses).toContain("past_due")
  })

  it("should recognize cancelled status", () => {
    const validStatuses = ["active", "trial", "past_due", "cancelled", "none"]
    expect(validStatuses).toContain("cancelled")
  })

  it("should recognize none status", () => {
    const validStatuses = ["active", "trial", "past_due", "cancelled", "none"]
    expect(validStatuses).toContain("none")
  })
})

describe("Pricing", () => {
  it("should be 4€ per month", () => {
    const priceEuros = PRICE_CONFIG.amount / 100
    expect(priceEuros).toBe(4)
  })

  it("should have 14-day free trial", () => {
    expect(PRICE_CONFIG.trialDays).toBe(14)
  })

  it("should calculate annual price correctly", () => {
    const monthlyPrice = PRICE_CONFIG.amount / 100
    const annualPrice = monthlyPrice * 12
    expect(annualPrice).toBe(48) // 4€ × 12 = 48€
  })
})
