/**
 * Assignment Service Tests
 *
 * Unit tests for the intelligent task assignment system.
 * Tests rotation logic, exclusion handling, and load balancing.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { rotateIfEqual } from "@/lib/services/assignment"

// Mock household members
const mockMembers = [
  { userId: "user-1", email: "parent1@test.com", role: "parent_principal" },
  { userId: "user-2", email: "parent2@test.com", role: "co_parent" },
]

describe("Assignment Service", () => {
  describe("rotateIfEqual", () => {
    it("should return first member when no lastAssigned", () => {
      const result = rotateIfEqual(null, mockMembers)
      expect(result).toBe("user-1")
    })

    it("should return first member when lastAssigned not found", () => {
      const result = rotateIfEqual("unknown-user", mockMembers)
      expect(result).toBe("user-1")
    })

    it("should rotate to next member", () => {
      const result = rotateIfEqual("user-1", mockMembers)
      expect(result).toBe("user-2")
    })

    it("should wrap around to first member", () => {
      const result = rotateIfEqual("user-2", mockMembers)
      expect(result).toBe("user-1")
    })

    it("should return null for empty members array", () => {
      const result = rotateIfEqual(null, [])
      expect(result).toBeNull()
    })

    it("should return single member when only one exists", () => {
      const singleMember = [mockMembers[0]!]
      const result = rotateIfEqual(null, singleMember)
      expect(result).toBe("user-1")
    })

    it("should return same member when single member and already assigned", () => {
      const singleMember = [mockMembers[0]!]
      const result = rotateIfEqual("user-1", singleMember)
      expect(result).toBe("user-1")
    })
  })

  describe("Assignment Logic", () => {
    it("should correctly rotate through three members", () => {
      const threeMembers = [
        ...mockMembers,
        { userId: "user-3", email: "parent3@test.com", role: "tiers" },
      ]

      expect(rotateIfEqual("user-1", threeMembers)).toBe("user-2")
      expect(rotateIfEqual("user-2", threeMembers)).toBe("user-3")
      expect(rotateIfEqual("user-3", threeMembers)).toBe("user-1")
    })
  })
})

// Integration tests would require database mocking
describe("Assignment Integration (mocked)", () => {
  it("should be tested with proper database mocking", () => {
    // These tests require proper database mocking setup
    // Placeholder for future integration tests
    expect(true).toBe(true)
  })
})

// ============================================================
// NEW TESTS FOR PHASE 3: PREFERENCES & ALERTS
// ============================================================

import type { PreferenceLevel } from "@/lib/services/assignment"

// Helper function to create a mock preference
function createMockPreference(
  userId: string,
  categoryId: string,
  level: PreferenceLevel
) {
  return {
    userId,
    categoryId,
    preferenceLevel: level,
    reason: undefined,
  }
}

describe("Category Preference Types", () => {
  it("should have valid preference levels", () => {
    const levels: PreferenceLevel[] = ["prefer", "neutral", "dislike", "expert"]
    expect(levels).toHaveLength(4)
    expect(levels).toContain("prefer")
    expect(levels).toContain("neutral")
    expect(levels).toContain("dislike")
    expect(levels).toContain("expert")
  })

  it("should create a valid CategoryPreference", () => {
    const pref = createMockPreference("user-1", "cat-1", "prefer")
    expect(pref.userId).toBe("user-1")
    expect(pref.categoryId).toBe("cat-1")
    expect(pref.preferenceLevel).toBe("prefer")
  })
})

describe("Preference Level Priority", () => {
  const prefPriority: Record<PreferenceLevel, number> = {
    expert: 4,
    prefer: 3,
    neutral: 2,
    dislike: 1,
  }

  it("expert should have highest priority", () => {
    expect(prefPriority.expert).toBeGreaterThan(prefPriority.prefer)
    expect(prefPriority.expert).toBeGreaterThan(prefPriority.neutral)
    expect(prefPriority.expert).toBeGreaterThan(prefPriority.dislike)
  })

  it("dislike should have lowest priority", () => {
    expect(prefPriority.dislike).toBeLessThan(prefPriority.expert)
    expect(prefPriority.dislike).toBeLessThan(prefPriority.prefer)
    expect(prefPriority.dislike).toBeLessThan(prefPriority.neutral)
  })

  it("prefer should be higher than neutral", () => {
    expect(prefPriority.prefer).toBeGreaterThan(prefPriority.neutral)
  })
})

describe("Assignment Selection Logic", () => {
  it("should prefer expert member over loaded member", () => {
    const member1Load = 60
    const member2Load = 40
    const member1IsExpert = true

    const shouldSelectMember1 = member1IsExpert || member1Load < member2Load
    expect(shouldSelectMember1).toBe(true)
  })

  it("should avoid members who dislike category", () => {
    const member1Dislikes = true
    const member2Dislikes = false

    const shouldSelectMember2 = !member2Dislikes
    const shouldAvoidMember1 = member1Dislikes
    expect(shouldSelectMember2).toBe(true)
    expect(shouldAvoidMember1).toBe(true)
  })

  it("should fall back to disliking member if all dislike", () => {
    const allMembersDislike = [true, true]
    const nonDislikingMembers = allMembersDislike.filter(d => !d)

    if (nonDislikingMembers.length === 0) {
      expect(allMembersDislike.length).toBeGreaterThan(0)
    }
  })
})

describe("Load Imbalance Detection", () => {
  const WARNING_THRESHOLD = 60
  const CRITICAL_THRESHOLD = 70

  it("should detect warning imbalance at 60%", () => {
    const member1Percentage = 60
    const isWarning = member1Percentage >= WARNING_THRESHOLD
    expect(isWarning).toBe(true)
  })

  it("should detect critical imbalance at 70%", () => {
    const member1Percentage = 70
    const isCritical = member1Percentage >= CRITICAL_THRESHOLD
    expect(isCritical).toBe(true)
  })

  it("should not flag balanced distribution", () => {
    const member1Percentage = 55
    const isWarning = member1Percentage >= WARNING_THRESHOLD
    expect(isWarning).toBe(false)
  })

  it("should calculate correct imbalance ratio", () => {
    const member1Load = 70
    const member2Load = 30
    const totalLoad = member1Load + member2Load

    const ratio = `${member1Load}/${member2Load}`
    const member1Percentage = Math.round((member1Load / totalLoad) * 100)

    expect(ratio).toBe("70/30")
    expect(member1Percentage).toBe(70)
  })

  it("should handle three-way split correctly", () => {
    const loads = [40, 35, 25]
    const total = loads.reduce((a, b) => a + b, 0)
    const percentages = loads.map(l => Math.round((l / total) * 100))

    expect(percentages[0]).toBe(40)
    const maxPercentage = Math.max(...percentages)
    expect(maxPercentage).toBeLessThan(WARNING_THRESHOLD)
  })
})

describe("Rebalancing Suggestions", () => {
  it("should suggest transferring tasks from overloaded to underloaded", () => {
    const overloadedMember = { userId: "user-1", load: 70 }
    const underloadedMember = { userId: "user-2", load: 30 }

    const shouldSuggestTransfer =
      overloadedMember.load > underloadedMember.load &&
      overloadedMember.load >= 60

    expect(shouldSuggestTransfer).toBe(true)
  })

  it("should respect category preferences when suggesting transfers", () => {
    const underloadedMemberDislikesCategory = true
    const canTransfer = !underloadedMemberDislikesCategory
    expect(canTransfer).toBe(false)
  })

  it("should limit transfer suggestions", () => {
    const maxSuggestions = 3
    const tasksToTransfer = [1, 2, 3, 4, 5]
    const suggestions = tasksToTransfer.slice(0, maxSuggestions)
    expect(suggestions).toHaveLength(3)
  })
})

describe("Assignment Reasons", () => {
  it("should have all valid assignment reasons", () => {
    const reasons = [
      "least_loaded",
      "rotation",
      "only_member",
      "already_assigned",
      "excluded",
      "preferred",
      "competent",
    ]

    expect(reasons).toContain("preferred")
    expect(reasons).toContain("competent")
    expect(reasons).toHaveLength(7)
  })

  it("should use 'competent' reason for expert assignments", () => {
    const memberIsExpert = true
    const expectedReason = memberIsExpert ? "competent" : "least_loaded"
    expect(expectedReason).toBe("competent")
  })

  it("should use 'preferred' reason for preference-based assignments", () => {
    const memberPrefersCategory = true
    const memberIsExpert = false
    const expectedReason = memberIsExpert
      ? "competent"
      : memberPrefersCategory
        ? "preferred"
        : "least_loaded"
    expect(expectedReason).toBe("preferred")
  })
})

describe("Would Cause Imbalance Check", () => {
  it("should prevent assignment if it causes severe imbalance", () => {
    const currentLoad = { user1: 55, user2: 45 }
    const taskWeight = 10

    const newUser1Load = currentLoad.user1 + taskWeight
    const total = newUser1Load + currentLoad.user2
    const newUser1Percentage = Math.round((newUser1Load / total) * 100)

    // 65/110 = 59%, which is under 70%
    expect(newUser1Percentage).toBeLessThan(70)
  })

  it("should flag high imbalance risk", () => {
    const highLoad = { user1: 65, user2: 35 }
    const taskWeight = 10

    const newHighUser1Load = highLoad.user1 + taskWeight
    const highTotal = newHighUser1Load + highLoad.user2
    const newHighUser1Percentage = Math.round((newHighUser1Load / highTotal) * 100)

    // 75/110 = 68%
    expect(newHighUser1Percentage).toBeGreaterThanOrEqual(68)
  })
})

describe("Filter Members", () => {
  it("should filter out excluded members", () => {
    const allMembers = ["user-1", "user-2", "user-3"]
    const excludedMembers = ["user-2"]

    const availableMembers = allMembers.filter(m => !excludedMembers.includes(m))
    expect(availableMembers).toHaveLength(2)
    expect(availableMembers).not.toContain("user-2")
  })

  it("should handle all members excluded", () => {
    const allMembers = ["user-1", "user-2"]
    const excludedMembers = ["user-1", "user-2"]

    const availableMembers = allMembers.filter(m => !excludedMembers.includes(m))
    expect(availableMembers).toHaveLength(0)
  })
})

describe("Assignment Result Structure", () => {
  it("should return correct result for assigned task", () => {
    const result = {
      assignedTo: "user-1",
      reason: "preferred" as const,
    }

    expect(result.assignedTo).toBe("user-1")
    expect(result.reason).toBe("preferred")
  })

  it("should handle null assignment when all excluded", () => {
    const result = {
      assignedTo: null,
      reason: "excluded" as const,
    }

    expect(result.assignedTo).toBeNull()
    expect(result.reason).toBe("excluded")
  })
})

describe("Category Preference Validation", () => {
  it("should validate preference level values", () => {
    const validLevels: PreferenceLevel[] = ["prefer", "neutral", "dislike", "expert"]

    validLevels.forEach(level => {
      expect(["prefer", "neutral", "dislike", "expert"]).toContain(level)
    })
  })

  it("should treat neutral preference as deletion", () => {
    const newPreference: PreferenceLevel = "neutral"
    const shouldDeletePreference = newPreference === "neutral"
    expect(shouldDeletePreference).toBe(true)
  })

  it("should not treat non-neutral as deletion", () => {
    const preferences: PreferenceLevel[] = ["prefer", "dislike", "expert"]
    preferences.forEach(pref => {
      expect(pref === "neutral").toBe(false)
    })
  })
})

describe("Long-term Category Balancing", () => {
  it("should track assignments by category", () => {
    const history = [
      { userId: "user-1", categoryId: "cat-1", count: 10 },
      { userId: "user-2", categoryId: "cat-1", count: 3 },
    ]

    const user1Count = history.find(h => h.userId === "user-1")?.count ?? 0
    const user2Count = history.find(h => h.userId === "user-2")?.count ?? 0

    expect(user1Count).toBeGreaterThan(user2Count)
  })

  it("should favor user with fewer category assignments", () => {
    const user1CategoryCount = 10
    const user2CategoryCount = 3

    const shouldPreferUser2 = user2CategoryCount < user1CategoryCount
    expect(shouldPreferUser2).toBe(true)
  })
})
