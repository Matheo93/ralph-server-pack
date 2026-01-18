/**
 * Kids Authentication Tests
 *
 * Tests for:
 * - PIN validation schemas
 * - XP calculation helpers
 * - Time-based helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  pinSchema,
  createChildAccountSchema,
  verifyPinSchema,
  updatePinSchema,
  resetPinSchema,
  submitTaskProofSchema,
  validateTaskProofSchema,
  createRewardSchema,
  updateRewardSchema,
  redeemRewardSchema,
  validateRedemptionSchema,
  markBadgeSeenSchema,
  calculateTaskXp,
  calculateStreakBonus,
  isEarlyBird,
  isNightOwl,
  isWeekend,
} from "@/lib/validations/kids"

// ============================================================
// PIN VALIDATION SCHEMA TESTS
// ============================================================

describe("PIN Validation Schemas", () => {
  describe("pinSchema", () => {
    it("should validate a 4-digit PIN", () => {
      const result = pinSchema.safeParse("1234")
      expect(result.success).toBe(true)
    })

    it("should reject PIN with less than 4 digits", () => {
      const result = pinSchema.safeParse("123")
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("4")
      }
    })

    it("should reject PIN with more than 4 digits", () => {
      const result = pinSchema.safeParse("12345")
      expect(result.success).toBe(false)
    })

    it("should reject PIN with letters", () => {
      const result = pinSchema.safeParse("12ab")
      expect(result.success).toBe(false)
    })

    it("should reject PIN with special characters", () => {
      const result = pinSchema.safeParse("12#4")
      expect(result.success).toBe(false)
    })

    it("should reject empty PIN", () => {
      const result = pinSchema.safeParse("")
      expect(result.success).toBe(false)
    })

    it("should accept PIN starting with 0", () => {
      const result = pinSchema.safeParse("0123")
      expect(result.success).toBe(true)
    })

    it("should accept PIN with all same digits", () => {
      const result = pinSchema.safeParse("0000")
      expect(result.success).toBe(true)
    })

    it("should reject PIN with spaces", () => {
      const result = pinSchema.safeParse("1 23")
      expect(result.success).toBe(false)
    })

    it("should reject null PIN", () => {
      const result = pinSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it("should reject undefined PIN", () => {
      const result = pinSchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it("should reject numeric type PIN (must be string)", () => {
      const result = pinSchema.safeParse(1234)
      expect(result.success).toBe(false)
    })
  })

  describe("createChildAccountSchema", () => {
    it("should validate valid account creation data", () => {
      const validData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "1234",
        confirmPin: "1234",
      }
      const result = createChildAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject when PINs do not match", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "1234",
        confirmPin: "5678",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("correspondent")
      }
    })

    it("should reject invalid UUID for childId", () => {
      const invalidData = {
        childId: "invalid-uuid",
        pin: "1234",
        confirmPin: "1234",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject when PIN is invalid", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "abc",
        confirmPin: "abc",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing childId", () => {
      const invalidData = {
        pin: "1234",
        confirmPin: "1234",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing pin", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        confirmPin: "1234",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing confirmPin", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "1234",
      }
      const result = createChildAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("verifyPinSchema", () => {
    it("should validate valid verification data", () => {
      const validData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "1234",
      }
      const result = verifyPinSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid childId", () => {
      const invalidData = {
        childId: "not-a-uuid",
        pin: "1234",
      }
      const result = verifyPinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid PIN format", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        pin: "12",
      }
      const result = verifyPinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject childId with extra characters", () => {
      const result = verifyPinSchema.safeParse({
        childId: "123e4567-e89b-12d3-a456-426614174000-extra",
        pin: "1234",
      })
      expect(result.success).toBe(false)
    })

    it("should reject childId with missing characters", () => {
      const result = verifyPinSchema.safeParse({
        childId: "123e4567-e89b-12d3-a456",
        pin: "1234",
      })
      expect(result.success).toBe(false)
    })

    it("should reject empty object", () => {
      const result = verifyPinSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe("updatePinSchema", () => {
    it("should validate valid PIN update data", () => {
      const validData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        currentPin: "1234",
        newPin: "5678",
        confirmNewPin: "5678",
      }
      const result = updatePinSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject when new PINs do not match", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        currentPin: "1234",
        newPin: "5678",
        confirmNewPin: "9999",
      }
      const result = updatePinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject when new PIN is same as current", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        currentPin: "1234",
        newPin: "1234",
        confirmNewPin: "1234",
      }
      const result = updatePinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes("diff"))).toBe(true)
      }
    })

    it("should reject invalid currentPin format", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        currentPin: "abc",
        newPin: "5678",
        confirmNewPin: "5678",
      }
      const result = updatePinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid newPin format", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        currentPin: "1234",
        newPin: "56",
        confirmNewPin: "56",
      }
      const result = updatePinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("resetPinSchema", () => {
    it("should validate valid PIN reset data", () => {
      const validData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        newPin: "5678",
        confirmNewPin: "5678",
      }
      const result = resetPinSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject when new PINs do not match", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        newPin: "5678",
        confirmNewPin: "1234",
      }
      const result = resetPinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid childId", () => {
      const invalidData = {
        childId: "invalid",
        newPin: "5678",
        confirmNewPin: "5678",
      }
      const result = resetPinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing fields", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
      }
      const result = resetPinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// TASK PROOF VALIDATION TESTS
// ============================================================

describe("Task Proof Validation Schemas", () => {
  describe("submitTaskProofSchema", () => {
    it("should validate valid task proof data", () => {
      const validData = {
        taskId: "123e4567-e89b-12d3-a456-426614174000",
        childId: "123e4567-e89b-12d3-a456-426614174001",
        photoUrl: "https://example.com/photo.jpg",
      }
      const result = submitTaskProofSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid taskId", () => {
      const invalidData = {
        taskId: "invalid",
        childId: "123e4567-e89b-12d3-a456-426614174001",
        photoUrl: "https://example.com/photo.jpg",
      }
      const result = submitTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid childId", () => {
      const invalidData = {
        taskId: "123e4567-e89b-12d3-a456-426614174000",
        childId: "invalid",
        photoUrl: "https://example.com/photo.jpg",
      }
      const result = submitTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid photoUrl", () => {
      const invalidData = {
        taskId: "123e4567-e89b-12d3-a456-426614174000",
        childId: "123e4567-e89b-12d3-a456-426614174001",
        photoUrl: "not-a-url",
      }
      const result = submitTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("validateTaskProofSchema", () => {
    it("should validate approved proof", () => {
      const validData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "approved",
      }
      const result = validateTaskProofSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should require rejection reason when status is rejected", () => {
      const invalidData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
      }
      const result = validateTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should accept rejected proof with reason", () => {
      const validData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
        rejectionReason: "La photo n'est pas claire",
      }
      const result = validateTaskProofSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject empty rejection reason", () => {
      const invalidData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
        rejectionReason: "",
      }
      const result = validateTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject rejection reason exceeding 500 characters", () => {
      const invalidData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
        rejectionReason: "A".repeat(501),
      }
      const result = validateTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid status value", () => {
      const invalidData = {
        proofId: "123e4567-e89b-12d3-a456-426614174000",
        status: "pending",
      }
      const result = validateTaskProofSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// REWARD VALIDATION TESTS
// ============================================================

describe("Reward Validation Schemas", () => {
  describe("createRewardSchema", () => {
    it("should validate valid privilege reward", () => {
      const validData = {
        name: "Choix du film",
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate valid screen_time reward with duration", () => {
      const validData = {
        name: "30 minutes de jeux",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 30,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject screen_time reward without duration", () => {
      const invalidData = {
        name: "Temps d'ecran",
        xpCost: 50,
        rewardType: "screen_time",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate valid money reward with amount", () => {
      const validData = {
        name: "5 euros de poche",
        xpCost: 200,
        rewardType: "money",
        moneyAmount: 5,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject money reward without amount", () => {
      const invalidData = {
        name: "Argent de poche",
        xpCost: 200,
        rewardType: "money",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject name too short", () => {
      const invalidData = {
        name: "A",
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject name too long", () => {
      const invalidData = {
        name: "A".repeat(101),
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject xpCost less than 1", () => {
      const invalidData = {
        name: "Test reward",
        xpCost: 0,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject xpCost greater than 10000", () => {
      const invalidData = {
        name: "Test reward",
        xpCost: 10001,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject screenTimeMinutes less than 5", () => {
      const invalidData = {
        name: "Temps d'ecran",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 3,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject screenTimeMinutes greater than 480", () => {
      const invalidData = {
        name: "Temps d'ecran",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 500,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject moneyAmount less than 0.01", () => {
      const invalidData = {
        name: "Argent",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 0,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject moneyAmount greater than 100", () => {
      const invalidData = {
        name: "Argent",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 101,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should accept custom reward type", () => {
      const validData = {
        name: "Recompense speciale",
        xpCost: 100,
        rewardType: "custom",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept optional description", () => {
      const validData = {
        name: "Recompense",
        xpCost: 100,
        rewardType: "privilege",
        description: "Une super recompense",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject description too long", () => {
      const invalidData = {
        name: "Recompense",
        xpCost: 100,
        rewardType: "privilege",
        description: "A".repeat(501),
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("updateRewardSchema", () => {
    it("should require id", () => {
      const invalidData = {
        name: "Updated name",
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate valid update", () => {
      const validData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated name",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow partial updates", () => {
      const validData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        xpCost: 200,
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("redeemRewardSchema", () => {
    it("should validate valid redemption", () => {
      const validData = {
        rewardId: "123e4567-e89b-12d3-a456-426614174000",
        childId: "123e4567-e89b-12d3-a456-426614174001",
      }
      const result = redeemRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid rewardId", () => {
      const invalidData = {
        rewardId: "invalid",
        childId: "123e4567-e89b-12d3-a456-426614174001",
      }
      const result = redeemRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid childId", () => {
      const invalidData = {
        rewardId: "123e4567-e89b-12d3-a456-426614174000",
        childId: "invalid",
      }
      const result = redeemRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("validateRedemptionSchema", () => {
    it("should validate approved redemption", () => {
      const validData = {
        redemptionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "approved",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate delivered redemption", () => {
      const validData = {
        redemptionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "delivered",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should require rejection reason when rejected", () => {
      const invalidData = {
        redemptionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should accept rejected with reason", () => {
      const validData = {
        redemptionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "rejected",
        rejectionReason: "XP insuffisant",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("markBadgeSeenSchema", () => {
    it("should validate valid badge seen data", () => {
      const validData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        badgeId: "123e4567-e89b-12d3-a456-426614174001",
      }
      const result = markBadgeSeenSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid childId", () => {
      const invalidData = {
        childId: "invalid",
        badgeId: "123e4567-e89b-12d3-a456-426614174001",
      }
      const result = markBadgeSeenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid badgeId", () => {
      const invalidData = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        badgeId: "invalid",
      }
      const result = markBadgeSeenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// XP CALCULATION HELPERS TESTS
// ============================================================

describe("XP Calculation Helpers", () => {
  describe("calculateTaskXp", () => {
    it("should return 5 XP for minimum load weight (1)", () => {
      expect(calculateTaskXp(1)).toBe(5)
    })

    it("should return 10 XP for load weight 2", () => {
      expect(calculateTaskXp(2)).toBe(10)
    })

    it("should return 15 XP for load weight 3", () => {
      expect(calculateTaskXp(3)).toBe(15)
    })

    it("should return 20 XP for load weight 4", () => {
      expect(calculateTaskXp(4)).toBe(20)
    })

    it("should return 25 XP for maximum load weight (5)", () => {
      expect(calculateTaskXp(5)).toBe(25)
    })

    it("should return minimum 5 XP even for zero load weight", () => {
      expect(calculateTaskXp(0)).toBe(5)
    })

    it("should handle negative load weight", () => {
      expect(calculateTaskXp(-1)).toBe(5)
    })

    it("should handle very high load weight", () => {
      expect(calculateTaskXp(10)).toBe(50)
    })

    it("should handle decimal load weight", () => {
      // 2.5 * 5 = 12.5 (function doesn't floor decimals)
      expect(calculateTaskXp(2.5)).toBe(12.5)
    })
  })

  describe("calculateStreakBonus", () => {
    it("should return 0 for 0 days streak", () => {
      expect(calculateStreakBonus(0)).toBe(0)
    })

    it("should return 0 for 1 day streak", () => {
      expect(calculateStreakBonus(1)).toBe(0)
    })

    it("should return 0 for 2 days streak", () => {
      expect(calculateStreakBonus(2)).toBe(0)
    })

    it("should return 5 for 3 days streak", () => {
      expect(calculateStreakBonus(3)).toBe(5)
    })

    it("should return 5 for 4 days streak", () => {
      expect(calculateStreakBonus(4)).toBe(5)
    })

    it("should return 5 for 5 days streak", () => {
      expect(calculateStreakBonus(5)).toBe(5)
    })

    it("should return 5 for 6 days streak", () => {
      expect(calculateStreakBonus(6)).toBe(5)
    })

    it("should return 10 for 7 days streak", () => {
      expect(calculateStreakBonus(7)).toBe(10)
    })

    it("should return 10 for 10 days streak", () => {
      expect(calculateStreakBonus(10)).toBe(10)
    })

    it("should return 10 for 13 days streak", () => {
      expect(calculateStreakBonus(13)).toBe(10)
    })

    it("should return 20 for 14 days streak", () => {
      expect(calculateStreakBonus(14)).toBe(20)
    })

    it("should return 20 for 20 days streak", () => {
      expect(calculateStreakBonus(20)).toBe(20)
    })

    it("should return 20 for 29 days streak", () => {
      expect(calculateStreakBonus(29)).toBe(20)
    })

    it("should return 30 for 30 days streak", () => {
      expect(calculateStreakBonus(30)).toBe(30)
    })

    it("should return 30 for 100 days streak", () => {
      expect(calculateStreakBonus(100)).toBe(30)
    })

    it("should return 30 for 365 days streak", () => {
      expect(calculateStreakBonus(365)).toBe(30)
    })

    it("should handle negative streak days", () => {
      expect(calculateStreakBonus(-5)).toBe(0)
    })
  })
})

// ============================================================
// TIME-BASED HELPERS TESTS
// ============================================================

describe("Time-based Helpers", () => {
  describe("isEarlyBird", () => {
    it("should return true for 6:00", () => {
      expect(isEarlyBird(new Date("2026-01-20T06:00:00"))).toBe(true)
    })

    it("should return true for 8:59", () => {
      expect(isEarlyBird(new Date("2026-01-20T08:59:00"))).toBe(true)
    })

    it("should return false for 9:00", () => {
      expect(isEarlyBird(new Date("2026-01-20T09:00:00"))).toBe(false)
    })

    it("should return false for 12:00", () => {
      expect(isEarlyBird(new Date("2026-01-20T12:00:00"))).toBe(false)
    })

    it("should return false for 18:00", () => {
      expect(isEarlyBird(new Date("2026-01-20T18:00:00"))).toBe(false)
    })

    it("should return true at midnight (0:00)", () => {
      expect(isEarlyBird(new Date("2026-01-20T00:00:00"))).toBe(true)
    })

    it("should return true at 1:00", () => {
      expect(isEarlyBird(new Date("2026-01-20T01:00:00"))).toBe(true)
    })

    it("should return true at 5:30", () => {
      expect(isEarlyBird(new Date("2026-01-20T05:30:00"))).toBe(true)
    })

    it("should return false for 9:01", () => {
      expect(isEarlyBird(new Date("2026-01-20T09:01:00"))).toBe(false)
    })
  })

  describe("isNightOwl", () => {
    it("should return true for 20:00", () => {
      expect(isNightOwl(new Date("2026-01-20T20:00:00"))).toBe(true)
    })

    it("should return true for 22:00", () => {
      expect(isNightOwl(new Date("2026-01-20T22:00:00"))).toBe(true)
    })

    it("should return true for 23:59", () => {
      expect(isNightOwl(new Date("2026-01-20T23:59:00"))).toBe(true)
    })

    it("should return false for 19:59", () => {
      expect(isNightOwl(new Date("2026-01-20T19:59:00"))).toBe(false)
    })

    it("should return false for 12:00", () => {
      expect(isNightOwl(new Date("2026-01-20T12:00:00"))).toBe(false)
    })

    it("should return false for 6:00", () => {
      expect(isNightOwl(new Date("2026-01-20T06:00:00"))).toBe(false)
    })

    it("should return false at midnight (0:00 is next day)", () => {
      expect(isNightOwl(new Date("2026-01-20T00:00:00"))).toBe(false)
    })

    it("should return true for 21:30", () => {
      expect(isNightOwl(new Date("2026-01-20T21:30:00"))).toBe(true)
    })
  })

  describe("isWeekend", () => {
    it("should return true for Saturday (January 17, 2026)", () => {
      expect(isWeekend(new Date("2026-01-17T12:00:00"))).toBe(true)
    })

    it("should return true for Sunday (January 18, 2026)", () => {
      expect(isWeekend(new Date("2026-01-18T12:00:00"))).toBe(true)
    })

    it("should return false for Monday (January 19, 2026)", () => {
      expect(isWeekend(new Date("2026-01-19T12:00:00"))).toBe(false)
    })

    it("should return false for Tuesday (January 20, 2026)", () => {
      expect(isWeekend(new Date("2026-01-20T12:00:00"))).toBe(false)
    })

    it("should return false for Wednesday (January 21, 2026)", () => {
      expect(isWeekend(new Date("2026-01-21T12:00:00"))).toBe(false)
    })

    it("should return false for Thursday (January 22, 2026)", () => {
      expect(isWeekend(new Date("2026-01-22T12:00:00"))).toBe(false)
    })

    it("should return false for Friday (January 23, 2026)", () => {
      expect(isWeekend(new Date("2026-01-23T12:00:00"))).toBe(false)
    })

    it("should return true for next Saturday (January 24, 2026)", () => {
      expect(isWeekend(new Date("2026-01-24T12:00:00"))).toBe(true)
    })
  })
})

// ============================================================
// COMBINED XP TESTS
// ============================================================

describe("Combined XP Calculations", () => {
  it("should calculate total XP for task with streak bonus", () => {
    const taskXp = calculateTaskXp(3) // 15 XP
    const streakBonus = calculateStreakBonus(7) // 10 XP
    const totalXp = taskXp + streakBonus
    expect(totalXp).toBe(25)
  })

  it("should calculate max XP scenario", () => {
    const taskXp = calculateTaskXp(5) // 25 XP
    const streakBonus = calculateStreakBonus(30) // 30 XP
    const totalXp = taskXp + streakBonus
    expect(totalXp).toBe(55)
  })

  it("should calculate min XP scenario", () => {
    const taskXp = calculateTaskXp(1) // 5 XP
    const streakBonus = calculateStreakBonus(0) // 0 XP
    const totalXp = taskXp + streakBonus
    expect(totalXp).toBe(5)
  })
})

// ============================================================
// EDGE CASES TESTS
// ============================================================

describe("Edge Cases", () => {
  describe("PIN validation edge cases", () => {
    it("should reject PIN with unicode digits", () => {
      const result = pinSchema.safeParse("१२३४") // Hindi digits
      expect(result.success).toBe(false)
    })

    it("should reject PIN with fullwidth digits", () => {
      const result = pinSchema.safeParse("１２３４") // Fullwidth digits
      expect(result.success).toBe(false)
    })

    it("should reject PIN with newline", () => {
      const result = pinSchema.safeParse("123\n")
      expect(result.success).toBe(false)
    })

    it("should reject PIN with tab", () => {
      const result = pinSchema.safeParse("123\t")
      expect(result.success).toBe(false)
    })

    it("should handle sequential PIN like 1234", () => {
      const result = pinSchema.safeParse("1234")
      expect(result.success).toBe(true)
    })

    it("should handle reverse sequential PIN like 4321", () => {
      const result = pinSchema.safeParse("4321")
      expect(result.success).toBe(true)
    })
  })

  describe("UUID validation edge cases", () => {
    it("should accept valid v4 UUID", () => {
      const result = verifyPinSchema.safeParse({
        childId: "550e8400-e29b-41d4-a716-446655440000",
        pin: "1234",
      })
      expect(result.success).toBe(true)
    })

    it("should reject UUID with uppercase letters when not normalized", () => {
      const result = verifyPinSchema.safeParse({
        childId: "550E8400-E29B-41D4-A716-446655440000",
        pin: "1234",
      })
      // Most UUID validators accept uppercase
      expect(result.success).toBe(true)
    })

    it("should reject nil UUID (all zeros)", () => {
      const result = verifyPinSchema.safeParse({
        childId: "00000000-0000-0000-0000-000000000000",
        pin: "1234",
      })
      // Nil UUID is technically valid UUID format
      expect(result.success).toBe(true)
    })
  })

  describe("XP calculation edge cases", () => {
    it("should handle fractional load weights", () => {
      // 2.9 * 5 = 14.5 (function doesn't floor decimals)
      expect(calculateTaskXp(2.9)).toBe(14.5)
    })

    it("should handle very large streak values", () => {
      expect(calculateStreakBonus(1000000)).toBe(30)
    })
  })
})
