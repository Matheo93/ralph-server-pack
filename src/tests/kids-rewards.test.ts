/**
 * Kids Rewards System Tests
 *
 * Tests for:
 * - Reward validation schemas (create, update, redeem)
 * - Redemption validation schemas
 * - Reward type-specific validations (screen_time, money, privilege, custom)
 * - XP cost boundaries
 * - Weekly limit validations
 * - XP calculation helpers
 */

import { describe, it, expect } from "vitest"
import {
  createRewardSchema,
  updateRewardSchema,
  redeemRewardSchema,
  validateRedemptionSchema,
  calculateTaskXp,
  calculateStreakBonus,
  isEarlyBird,
  isNightOwl,
  isWeekend,
} from "@/lib/validations/kids"

// ============================================================
// REWARD CREATION SCHEMA TESTS
// ============================================================

describe("Reward Creation Schema", () => {
  describe("Basic validation", () => {
    it("should validate a minimal valid privilege reward", () => {
      const validData = {
        name: "Choix du film",
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate a complete privilege reward with all fields", () => {
      const validData = {
        name: "Choix du repas du dimanche",
        description: "L'enfant peut choisir le menu du dimanche",
        xpCost: 150,
        rewardType: "privilege",
        icon: "🍽️",
        maxRedemptionsPerWeek: 1,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject missing name", () => {
      const invalidData = {
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject name too short (less than 2 characters)", () => {
      const invalidData = {
        name: "X",
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("2")
      }
    })

    it("should reject name too long (more than 100 characters)", () => {
      const invalidData = {
        name: "A".repeat(101),
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing xpCost", () => {
      const invalidData = {
        name: "Test Reward",
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing rewardType", () => {
      const invalidData = {
        name: "Test Reward",
        xpCost: 100,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should accept empty description", () => {
      const validData = {
        name: "Test Reward",
        xpCost: 100,
        rewardType: "privilege",
        description: "",
      }
      const result = createRewardSchema.safeParse(validData)
      // Empty string should be valid
      expect(result.success).toBe(true)
    })

    it("should reject description too long (more than 500 characters)", () => {
      const invalidData = {
        name: "Test Reward",
        xpCost: 100,
        rewardType: "privilege",
        description: "A".repeat(501),
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("XP Cost validation", () => {
    it("should accept minimum xpCost of 1", () => {
      const validData = {
        name: "Petit bonus",
        xpCost: 1,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept maximum xpCost of 10000", () => {
      const validData = {
        name: "Grosse récompense",
        xpCost: 10000,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject xpCost of 0", () => {
      const invalidData = {
        name: "Gratuit",
        xpCost: 0,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject negative xpCost", () => {
      const invalidData = {
        name: "Negative",
        xpCost: -10,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject xpCost above 10000", () => {
      const invalidData = {
        name: "Trop cher",
        xpCost: 10001,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject non-integer xpCost", () => {
      const invalidData = {
        name: "Decimal",
        xpCost: 50.5,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject string xpCost", () => {
      const invalidData = {
        name: "String cost",
        xpCost: "100",
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Reward type validation", () => {
    it("should accept screen_time type", () => {
      const validData = {
        name: "30 minutes de jeux vidéo",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 30,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept money type", () => {
      const validData = {
        name: "5€ d'argent de poche",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 5,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept privilege type", () => {
      const validData = {
        name: "Choisir le dessert",
        xpCost: 25,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept custom type", () => {
      const validData = {
        name: "Sortie au cinéma",
        xpCost: 200,
        rewardType: "custom",
        description: "Une sortie au cinéma avec les parents",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid reward type", () => {
      const invalidData = {
        name: "Invalid type",
        xpCost: 100,
        rewardType: "invalid_type",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should require screenTimeMinutes for screen_time type", () => {
      const invalidData = {
        name: "Temps d'écran",
        xpCost: 50,
        rewardType: "screen_time",
        // screenTimeMinutes is missing
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should require moneyAmount for money type", () => {
      const invalidData = {
        name: "Argent de poche",
        xpCost: 100,
        rewardType: "money",
        // moneyAmount is missing
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Screen time validation", () => {
    it("should accept minimum screen time of 5 minutes", () => {
      const validData = {
        name: "Petit temps d'écran",
        xpCost: 10,
        rewardType: "screen_time",
        screenTimeMinutes: 5,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept maximum screen time of 480 minutes (8 hours)", () => {
      const validData = {
        name: "Grande journée jeux",
        xpCost: 500,
        rewardType: "screen_time",
        screenTimeMinutes: 480,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject screen time below 5 minutes", () => {
      const invalidData = {
        name: "Trop court",
        xpCost: 10,
        rewardType: "screen_time",
        screenTimeMinutes: 4,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject screen time above 480 minutes", () => {
      const invalidData = {
        name: "Trop long",
        xpCost: 1000,
        rewardType: "screen_time",
        screenTimeMinutes: 481,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject non-integer screen time", () => {
      const invalidData = {
        name: "Decimal time",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 30.5,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject zero screen time for screen_time type", () => {
      const invalidData = {
        name: "Zero time",
        xpCost: 50,
        rewardType: "screen_time",
        screenTimeMinutes: 0,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Money amount validation", () => {
    it("should accept minimum money amount of 0.01€", () => {
      const validData = {
        name: "Un centime",
        xpCost: 5,
        rewardType: "money",
        moneyAmount: 0.01,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept maximum money amount of 100€", () => {
      const validData = {
        name: "Gros montant",
        xpCost: 5000,
        rewardType: "money",
        moneyAmount: 100,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept typical money amounts", () => {
      const validData = {
        name: "5 euros",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 5.0,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject zero money amount for money type", () => {
      const invalidData = {
        name: "Gratuit",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 0,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject negative money amount", () => {
      const invalidData = {
        name: "Négatif",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: -5,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject money amount above 100€", () => {
      const invalidData = {
        name: "Trop cher",
        xpCost: 10000,
        rewardType: "money",
        moneyAmount: 100.01,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Weekly limit validation", () => {
    it("should accept valid maxRedemptionsPerWeek", () => {
      const validData = {
        name: "Limited reward",
        xpCost: 50,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 3,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept minimum maxRedemptionsPerWeek of 1", () => {
      const validData = {
        name: "Once a week",
        xpCost: 100,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 1,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept maximum maxRedemptionsPerWeek of 100", () => {
      const validData = {
        name: "Lots of times",
        xpCost: 10,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 100,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow undefined maxRedemptionsPerWeek (unlimited)", () => {
      const validData = {
        name: "Unlimited",
        xpCost: 50,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.maxRedemptionsPerWeek).toBeUndefined()
      }
    })

    it("should reject maxRedemptionsPerWeek of 0", () => {
      const invalidData = {
        name: "Zero limit",
        xpCost: 50,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 0,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject negative maxRedemptionsPerWeek", () => {
      const invalidData = {
        name: "Negative limit",
        xpCost: 50,
        rewardType: "privilege",
        maxRedemptionsPerWeek: -1,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject maxRedemptionsPerWeek above 100", () => {
      const invalidData = {
        name: "Too many",
        xpCost: 50,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 101,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject non-integer maxRedemptionsPerWeek", () => {
      const invalidData = {
        name: "Decimal limit",
        xpCost: 50,
        rewardType: "privilege",
        maxRedemptionsPerWeek: 2.5,
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Icon validation", () => {
    it("should accept custom emoji icon", () => {
      const validData = {
        name: "Jeux vidéo",
        xpCost: 100,
        rewardType: "screen_time",
        screenTimeMinutes: 60,
        icon: "🎮",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.icon).toBe("🎮")
      }
    })

    it("should use default icon when not provided", () => {
      const validData = {
        name: "Test reward",
        xpCost: 50,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.icon).toBe("🎁")
      }
    })

    it("should accept text as icon", () => {
      const validData = {
        name: "Money reward",
        xpCost: 100,
        rewardType: "money",
        moneyAmount: 5,
        icon: "EUR",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject icon too long (more than 50 characters)", () => {
      const invalidData = {
        name: "Test",
        xpCost: 50,
        rewardType: "privilege",
        icon: "A".repeat(51),
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// REWARD UPDATE SCHEMA TESTS
// ============================================================

describe("Reward Update Schema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000"

  describe("ID validation", () => {
    it("should require a valid UUID", () => {
      const validData = {
        id: validUuid,
        name: "Updated name",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid UUID", () => {
      const invalidData = {
        id: "not-a-uuid",
        name: "Updated name",
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing ID", () => {
      const invalidData = {
        name: "Updated name",
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Partial updates", () => {
    it("should allow updating only name", () => {
      const validData = {
        id: validUuid,
        name: "New name",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow updating only xpCost", () => {
      const validData = {
        id: validUuid,
        xpCost: 200,
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow updating only description", () => {
      const validData = {
        id: validUuid,
        description: "Updated description",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow updating only icon", () => {
      const validData = {
        id: validUuid,
        icon: "🏆",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow updating multiple fields", () => {
      const validData = {
        id: validUuid,
        name: "New name",
        xpCost: 150,
        description: "New description",
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow updating only maxRedemptionsPerWeek", () => {
      const validData = {
        id: validUuid,
        maxRedemptionsPerWeek: 5,
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should allow only ID with no updates", () => {
      const validData = {
        id: validUuid,
      }
      const result = updateRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("Update validations", () => {
    it("should validate xpCost constraints when updating", () => {
      const invalidData = {
        id: validUuid,
        xpCost: -10,
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate name length when updating", () => {
      const invalidData = {
        id: validUuid,
        name: "X",
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate screenTimeMinutes constraints when updating", () => {
      const invalidData = {
        id: validUuid,
        screenTimeMinutes: 1000,
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should validate moneyAmount constraints when updating", () => {
      const invalidData = {
        id: validUuid,
        moneyAmount: 500,
      }
      const result = updateRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// REDEEM REWARD SCHEMA TESTS
// ============================================================

describe("Redeem Reward Schema", () => {
  const validRewardId = "123e4567-e89b-12d3-a456-426614174000"
  const validChildId = "987e6543-e21b-12d3-a456-426614174000"

  it("should validate valid redemption request", () => {
    const validData = {
      rewardId: validRewardId,
      childId: validChildId,
    }
    const result = redeemRewardSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should reject invalid rewardId", () => {
    const invalidData = {
      rewardId: "not-a-uuid",
      childId: validChildId,
    }
    const result = redeemRewardSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject invalid childId", () => {
    const invalidData = {
      rewardId: validRewardId,
      childId: "not-a-uuid",
    }
    const result = redeemRewardSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject missing rewardId", () => {
    const invalidData = {
      childId: validChildId,
    }
    const result = redeemRewardSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject missing childId", () => {
    const invalidData = {
      rewardId: validRewardId,
    }
    const result = redeemRewardSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject empty object", () => {
    const result = redeemRewardSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================================
// VALIDATE REDEMPTION SCHEMA TESTS
// ============================================================

describe("Validate Redemption Schema", () => {
  const validRedemptionId = "123e4567-e89b-12d3-a456-426614174000"

  describe("Approval validation", () => {
    it("should validate approved status without reason", () => {
      const validData = {
        redemptionId: validRedemptionId,
        status: "approved",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate approved status with optional reason", () => {
      const validData = {
        redemptionId: validRedemptionId,
        status: "approved",
        rejectionReason: "Bien mérité !",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("Delivery validation", () => {
    it("should validate delivered status", () => {
      const validData = {
        redemptionId: validRedemptionId,
        status: "delivered",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("Rejection validation", () => {
    it("should validate rejected status with reason", () => {
      const validData = {
        redemptionId: validRedemptionId,
        status: "rejected",
        rejectionReason: "Tu n'as pas fini tes devoirs",
      }
      const result = validateRedemptionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject rejected status without reason", () => {
      const invalidData = {
        redemptionId: validRedemptionId,
        status: "rejected",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("raison")
      }
    })

    it("should reject rejected status with empty reason", () => {
      const invalidData = {
        redemptionId: validRedemptionId,
        status: "rejected",
        rejectionReason: "",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject reason too long (more than 500 characters)", () => {
      const invalidData = {
        redemptionId: validRedemptionId,
        status: "rejected",
        rejectionReason: "A".repeat(501),
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("ID validation", () => {
    it("should reject invalid redemptionId", () => {
      const invalidData = {
        redemptionId: "not-a-uuid",
        status: "approved",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing redemptionId", () => {
      const invalidData = {
        status: "approved",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Status validation", () => {
    it("should reject invalid status", () => {
      const invalidData = {
        redemptionId: validRedemptionId,
        status: "pending",
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing status", () => {
      const invalidData = {
        redemptionId: validRedemptionId,
      }
      const result = validateRedemptionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// XP CALCULATION HELPER TESTS
// ============================================================

describe("XP Calculation Helpers", () => {
  describe("calculateTaskXp", () => {
    it("should return 5 XP for load weight 1", () => {
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

    it("should return 25 XP for load weight 5", () => {
      expect(calculateTaskXp(5)).toBe(25)
    })

    it("should return minimum 5 XP for zero load weight", () => {
      expect(calculateTaskXp(0)).toBe(5)
    })

    it("should return minimum 5 XP for negative load weight", () => {
      expect(calculateTaskXp(-1)).toBe(5)
    })

    it("should scale linearly for higher load weights", () => {
      expect(calculateTaskXp(10)).toBe(50)
    })
  })

  describe("calculateStreakBonus", () => {
    it("should return 0 bonus for streak less than 3 days", () => {
      expect(calculateStreakBonus(0)).toBe(0)
      expect(calculateStreakBonus(1)).toBe(0)
      expect(calculateStreakBonus(2)).toBe(0)
    })

    it("should return 5 XP bonus for 3-6 day streak", () => {
      expect(calculateStreakBonus(3)).toBe(5)
      expect(calculateStreakBonus(4)).toBe(5)
      expect(calculateStreakBonus(5)).toBe(5)
      expect(calculateStreakBonus(6)).toBe(5)
    })

    it("should return 10 XP bonus for 7-13 day streak", () => {
      expect(calculateStreakBonus(7)).toBe(10)
      expect(calculateStreakBonus(10)).toBe(10)
      expect(calculateStreakBonus(13)).toBe(10)
    })

    it("should return 20 XP bonus for 14-29 day streak", () => {
      expect(calculateStreakBonus(14)).toBe(20)
      expect(calculateStreakBonus(20)).toBe(20)
      expect(calculateStreakBonus(29)).toBe(20)
    })

    it("should return 30 XP bonus for 30+ day streak", () => {
      expect(calculateStreakBonus(30)).toBe(30)
      expect(calculateStreakBonus(50)).toBe(30)
      expect(calculateStreakBonus(100)).toBe(30)
    })
  })
})

// ============================================================
// TIME-BASED HELPER TESTS
// ============================================================

describe("Time-based Helpers", () => {
  describe("isEarlyBird", () => {
    it("should return true for 6:00 AM", () => {
      const date = new Date("2024-01-15T06:00:00")
      expect(isEarlyBird(date)).toBe(true)
    })

    it("should return true for 8:59 AM", () => {
      const date = new Date("2024-01-15T08:59:00")
      expect(isEarlyBird(date)).toBe(true)
    })

    it("should return false for 9:00 AM", () => {
      const date = new Date("2024-01-15T09:00:00")
      expect(isEarlyBird(date)).toBe(false)
    })

    it("should return false for 12:00 PM", () => {
      const date = new Date("2024-01-15T12:00:00")
      expect(isEarlyBird(date)).toBe(false)
    })

    it("should return true for midnight (00:00)", () => {
      const date = new Date("2024-01-15T00:00:00")
      expect(isEarlyBird(date)).toBe(true)
    })

    it("should return false for 10:00 PM", () => {
      const date = new Date("2024-01-15T22:00:00")
      expect(isEarlyBird(date)).toBe(false)
    })
  })

  describe("isNightOwl", () => {
    it("should return true for 8:00 PM", () => {
      const date = new Date("2024-01-15T20:00:00")
      expect(isNightOwl(date)).toBe(true)
    })

    it("should return true for 11:00 PM", () => {
      const date = new Date("2024-01-15T23:00:00")
      expect(isNightOwl(date)).toBe(true)
    })

    it("should return false for 7:59 PM", () => {
      const date = new Date("2024-01-15T19:59:00")
      expect(isNightOwl(date)).toBe(false)
    })

    it("should return false for 6:00 AM", () => {
      const date = new Date("2024-01-15T06:00:00")
      expect(isNightOwl(date)).toBe(false)
    })

    it("should return false for 12:00 PM (noon)", () => {
      const date = new Date("2024-01-15T12:00:00")
      expect(isNightOwl(date)).toBe(false)
    })

    it("should return true for 11:59 PM", () => {
      const date = new Date("2024-01-15T23:59:00")
      expect(isNightOwl(date)).toBe(true)
    })
  })

  describe("isWeekend", () => {
    it("should return true for Saturday", () => {
      // January 13, 2024 is a Saturday
      const date = new Date("2024-01-13T12:00:00")
      expect(isWeekend(date)).toBe(true)
    })

    it("should return true for Sunday", () => {
      // January 14, 2024 is a Sunday
      const date = new Date("2024-01-14T12:00:00")
      expect(isWeekend(date)).toBe(true)
    })

    it("should return false for Monday", () => {
      // January 15, 2024 is a Monday
      const date = new Date("2024-01-15T12:00:00")
      expect(isWeekend(date)).toBe(false)
    })

    it("should return false for Tuesday", () => {
      // January 16, 2024 is a Tuesday
      const date = new Date("2024-01-16T12:00:00")
      expect(isWeekend(date)).toBe(false)
    })

    it("should return false for Wednesday", () => {
      // January 17, 2024 is a Wednesday
      const date = new Date("2024-01-17T12:00:00")
      expect(isWeekend(date)).toBe(false)
    })

    it("should return false for Thursday", () => {
      // January 18, 2024 is a Thursday
      const date = new Date("2024-01-18T12:00:00")
      expect(isWeekend(date)).toBe(false)
    })

    it("should return false for Friday", () => {
      // January 19, 2024 is a Friday
      const date = new Date("2024-01-19T12:00:00")
      expect(isWeekend(date)).toBe(false)
    })
  })
})

// ============================================================
// EDGE CASES AND BOUNDARY TESTS
// ============================================================

describe("Edge Cases and Boundaries", () => {
  describe("Unicode and special characters in reward names", () => {
    it("should accept emoji in name", () => {
      const validData = {
        name: "🎮 Jeux vidéo 🎮",
        xpCost: 100,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept French accented characters", () => {
      const validData = {
        name: "Récompense spéciale été",
        xpCost: 100,
        rewardType: "privilege",
        description: "Une récompense à échanger pendant les vacances d'été",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept special punctuation", () => {
      const validData = {
        name: "Film (au choix) - 2h max",
        xpCost: 75,
        rewardType: "screen_time",
        screenTimeMinutes: 120,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("Boundary XP values", () => {
    it("should handle XP cost at exact minimum boundary", () => {
      const validData = {
        name: "Minimum XP",
        xpCost: 1,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should handle XP cost at exact maximum boundary", () => {
      const validData = {
        name: "Maximum XP",
        xpCost: 10000,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject XP cost just above maximum", () => {
      const invalidData = {
        name: "Over max XP",
        xpCost: 10001,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject XP cost just below minimum", () => {
      const invalidData = {
        name: "Under min XP",
        xpCost: 0,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("String length boundaries", () => {
    it("should accept name at exact minimum length (2 chars)", () => {
      const validData = {
        name: "AB",
        xpCost: 50,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept name at exact maximum length (100 chars)", () => {
      const validData = {
        name: "A".repeat(100),
        xpCost: 50,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should accept description at exact maximum length (500 chars)", () => {
      const validData = {
        name: "Test reward",
        xpCost: 50,
        rewardType: "privilege",
        description: "A".repeat(500),
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject name just over maximum (101 chars)", () => {
      const invalidData = {
        name: "A".repeat(101),
        xpCost: 50,
        rewardType: "privilege",
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject description just over maximum (501 chars)", () => {
      const invalidData = {
        name: "Test reward",
        xpCost: 50,
        rewardType: "privilege",
        description: "A".repeat(501),
      }
      const result = createRewardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("All reward types comprehensive test", () => {
    it("should validate complete screen_time reward", () => {
      const validData = {
        name: "1h de jeux vidéo",
        description: "Une heure de jeux vidéo sur la console",
        xpCost: 100,
        rewardType: "screen_time",
        icon: "🎮",
        screenTimeMinutes: 60,
        maxRedemptionsPerWeek: 3,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate complete money reward", () => {
      const validData = {
        name: "5€ d'argent de poche",
        description: "Cinq euros à dépenser comme tu veux",
        xpCost: 200,
        rewardType: "money",
        icon: "💶",
        moneyAmount: 5.0,
        maxRedemptionsPerWeek: 2,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate complete privilege reward", () => {
      const validData = {
        name: "Choix du film du vendredi",
        description: "Tu peux choisir le film pour la soirée cinéma",
        xpCost: 75,
        rewardType: "privilege",
        icon: "🎬",
        maxRedemptionsPerWeek: 1,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate complete custom reward", () => {
      const validData = {
        name: "Sortie au parc d'attractions",
        description: "Une journée au parc d'attractions en famille",
        xpCost: 1000,
        rewardType: "custom",
        icon: "🎢",
        maxRedemptionsPerWeek: 1,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("Null and undefined handling", () => {
    it("should reject null input", () => {
      const result = createRewardSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it("should reject undefined input", () => {
      const result = createRewardSchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it("should reject empty object", () => {
      const result = createRewardSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("should handle undefined optional fields gracefully", () => {
      const validData = {
        name: "Test",
        xpCost: 50,
        rewardType: "privilege",
        description: undefined,
        screenTimeMinutes: undefined,
        moneyAmount: undefined,
        maxRedemptionsPerWeek: undefined,
      }
      const result = createRewardSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
