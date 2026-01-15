/**
 * Member Exclusions Feature Tests
 *
 * Unit tests for the temporary exclusion feature including:
 * - Exclusion date validation
 * - Active exclusion detection
 * - Assignment filtering with exclusions
 * - Exclusion reasons
 */

import { describe, it, expect, beforeEach } from "vitest"
import { EXCLUSION_REASONS, type ExclusionReason } from "@/lib/constants/exclusion-reasons"

// =============================================================================
// MOCK TYPES
// =============================================================================

interface Exclusion {
  id: string
  memberId: string
  householdId: string
  excludeFrom: Date
  excludeUntil: Date
  reason: ExclusionReason
}

interface HouseholdMember {
  userId: string
  email: string
  role: string
}

// =============================================================================
// MOCK DATA
// =============================================================================

const createMockExclusion = (
  overrides: Partial<Exclusion> = {}
): Exclusion => {
  const now = new Date()
  return {
    id: "exclusion-1",
    memberId: "member-1",
    householdId: "household-1",
    excludeFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
    excludeUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // next week
    reason: "voyage",
    ...overrides,
  }
}

const createMockMember = (
  overrides: Partial<HouseholdMember> = {}
): HouseholdMember => ({
  userId: "member-1",
  email: "member@example.com",
  role: "co_parent",
  ...overrides,
})

// =============================================================================
// HELPER FUNCTIONS (Mirroring service logic for testing)
// =============================================================================

function isExclusionActive(exclusion: Exclusion, at: Date = new Date()): boolean {
  return exclusion.excludeFrom <= at && exclusion.excludeUntil >= at
}

function validateExclusionDates(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string } {
  if (endDate <= startDate) {
    return { valid: false, error: "La date de fin doit être après la date de début" }
  }
  return { valid: true }
}

function checkOverlap(
  newStart: Date,
  newEnd: Date,
  existingExclusions: Exclusion[]
): { overlaps: boolean; overlappingExclusion?: Exclusion } {
  for (const exclusion of existingExclusions) {
    // Check if ranges overlap
    const noOverlap =
      newEnd <= exclusion.excludeFrom || newStart >= exclusion.excludeUntil
    if (!noOverlap) {
      return { overlaps: true, overlappingExclusion: exclusion }
    }
  }
  return { overlaps: false }
}

function filterAvailableMembers(
  members: HouseholdMember[],
  exclusions: Exclusion[],
  at: Date = new Date()
): HouseholdMember[] {
  return members.filter((member) => {
    const memberExclusions = exclusions.filter((e) => e.memberId === member.userId)
    return !memberExclusions.some((e) => isExclusionActive(e, at))
  })
}

// =============================================================================
// EXCLUSION REASONS TESTS
// =============================================================================

describe("Exclusion Reasons", () => {
  it("should have all required exclusion reasons", () => {
    const expectedReasons: ExclusionReason[] = [
      "voyage",
      "maladie",
      "surcharge_travail",
      "garde_alternee",
      "autre",
    ]

    for (const reason of expectedReasons) {
      expect(EXCLUSION_REASONS).toHaveProperty(reason)
      expect(EXCLUSION_REASONS[reason]).toHaveProperty("label")
      expect(EXCLUSION_REASONS[reason]).toHaveProperty("icon")
    }
  })

  it("should have French labels for all reasons", () => {
    for (const reason of Object.values(EXCLUSION_REASONS)) {
      expect(reason.label.length).toBeGreaterThan(0)
      // Check they are French (contain accents or French words)
      const isFrench =
        reason.label.includes("é") ||
        reason.label.includes("è") ||
        reason.label.includes("Voyage") ||
        reason.label.includes("Maladie") ||
        reason.label.includes("travail") ||
        reason.label.includes("Autre")
      expect(isFrench).toBe(true)
    }
  })

  it("should have emoji icons for all reasons", () => {
    for (const reason of Object.values(EXCLUSION_REASONS)) {
      expect(reason.icon.length).toBeGreaterThan(0)
    }
  })
})

// =============================================================================
// DATE VALIDATION TESTS
// =============================================================================

describe("Exclusion Date Validation", () => {
  it("should accept valid date range", () => {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const result = validateExclusionDates(today, nextWeek)
    expect(result.valid).toBe(true)
  })

  it("should reject end date before start date", () => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const result = validateExclusionDates(today, yesterday)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it("should reject same start and end date", () => {
    const today = new Date()

    const result = validateExclusionDates(today, today)
    expect(result.valid).toBe(false)
  })

  it("should accept very long date range", () => {
    const today = new Date()
    const nextYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)

    const result = validateExclusionDates(today, nextYear)
    expect(result.valid).toBe(true)
  })
})

// =============================================================================
// ACTIVE EXCLUSION DETECTION TESTS
// =============================================================================

describe("Active Exclusion Detection", () => {
  it("should detect active exclusion", () => {
    const exclusion = createMockExclusion()
    expect(isExclusionActive(exclusion)).toBe(true)
  })

  it("should detect inactive past exclusion", () => {
    const lastWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const exclusion = createMockExclusion({
      excludeFrom: lastWeek,
      excludeUntil: yesterday,
    })

    expect(isExclusionActive(exclusion)).toBe(false)
  })

  it("should detect inactive future exclusion", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const exclusion = createMockExclusion({
      excludeFrom: tomorrow,
      excludeUntil: nextWeek,
    })

    expect(isExclusionActive(exclusion)).toBe(false)
  })

  it("should check at specific time", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const exclusion = createMockExclusion({
      excludeFrom: yesterday,
      excludeUntil: tomorrow,
    })

    // Check at boundary - should be active at exact start
    expect(isExclusionActive(exclusion, exclusion.excludeFrom)).toBe(true)

    // Should be active at exact end
    expect(isExclusionActive(exclusion, exclusion.excludeUntil)).toBe(true)
  })
})

// =============================================================================
// OVERLAP DETECTION TESTS
// =============================================================================

describe("Exclusion Overlap Detection", () => {
  it("should detect overlapping exclusions", () => {
    const existingExclusion = createMockExclusion()
    const newStart = new Date(existingExclusion.excludeFrom.getTime() + 1000)
    const newEnd = new Date(existingExclusion.excludeUntil.getTime() - 1000)

    const result = checkOverlap(newStart, newEnd, [existingExclusion])
    expect(result.overlaps).toBe(true)
    expect(result.overlappingExclusion).toBe(existingExclusion)
  })

  it("should detect partial overlap at start", () => {
    const existingExclusion = createMockExclusion()
    const newStart = new Date(existingExclusion.excludeFrom.getTime() - 24 * 60 * 60 * 1000)
    const newEnd = new Date(existingExclusion.excludeFrom.getTime() + 24 * 60 * 60 * 1000)

    const result = checkOverlap(newStart, newEnd, [existingExclusion])
    expect(result.overlaps).toBe(true)
  })

  it("should detect partial overlap at end", () => {
    const existingExclusion = createMockExclusion()
    const newStart = new Date(existingExclusion.excludeUntil.getTime() - 24 * 60 * 60 * 1000)
    const newEnd = new Date(existingExclusion.excludeUntil.getTime() + 24 * 60 * 60 * 1000)

    const result = checkOverlap(newStart, newEnd, [existingExclusion])
    expect(result.overlaps).toBe(true)
  })

  it("should allow adjacent non-overlapping exclusions", () => {
    const existingExclusion = createMockExclusion()
    // New exclusion starts exactly when existing ends
    const newStart = new Date(existingExclusion.excludeUntil.getTime())
    const newEnd = new Date(existingExclusion.excludeUntil.getTime() + 7 * 24 * 60 * 60 * 1000)

    const result = checkOverlap(newStart, newEnd, [existingExclusion])
    expect(result.overlaps).toBe(false)
  })

  it("should allow non-overlapping exclusions", () => {
    const existingExclusion = createMockExclusion()
    // New exclusion is after existing
    const newStart = new Date(existingExclusion.excludeUntil.getTime() + 24 * 60 * 60 * 1000)
    const newEnd = new Date(existingExclusion.excludeUntil.getTime() + 7 * 24 * 60 * 60 * 1000)

    const result = checkOverlap(newStart, newEnd, [existingExclusion])
    expect(result.overlaps).toBe(false)
  })
})

// =============================================================================
// MEMBER FILTERING TESTS
// =============================================================================

describe("Member Filtering with Exclusions", () => {
  it("should filter out excluded members", () => {
    const members = [
      createMockMember({ userId: "member-1" }),
      createMockMember({ userId: "member-2", email: "member2@example.com" }),
    ]

    const exclusions = [
      createMockExclusion({ memberId: "member-1" }),
    ]

    const available = filterAvailableMembers(members, exclusions)
    expect(available).toHaveLength(1)
    expect(available[0]?.userId).toBe("member-2")
  })

  it("should keep members without active exclusions", () => {
    const members = [
      createMockMember({ userId: "member-1" }),
      createMockMember({ userId: "member-2", email: "member2@example.com" }),
    ]

    // Past exclusion
    const lastWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const exclusions = [
      createMockExclusion({
        memberId: "member-1",
        excludeFrom: lastWeek,
        excludeUntil: yesterday,
      }),
    ]

    const available = filterAvailableMembers(members, exclusions)
    expect(available).toHaveLength(2) // Both available
  })

  it("should filter out multiple excluded members", () => {
    const members = [
      createMockMember({ userId: "member-1" }),
      createMockMember({ userId: "member-2", email: "member2@example.com" }),
      createMockMember({ userId: "member-3", email: "member3@example.com" }),
    ]

    const exclusions = [
      createMockExclusion({ id: "ex-1", memberId: "member-1" }),
      createMockExclusion({ id: "ex-2", memberId: "member-2" }),
    ]

    const available = filterAvailableMembers(members, exclusions)
    expect(available).toHaveLength(1)
    expect(available[0]?.userId).toBe("member-3")
  })

  it("should return all members when no exclusions", () => {
    const members = [
      createMockMember({ userId: "member-1" }),
      createMockMember({ userId: "member-2", email: "member2@example.com" }),
    ]

    const available = filterAvailableMembers(members, [])
    expect(available).toHaveLength(2)
  })

  it("should return empty array when all members excluded", () => {
    const members = [
      createMockMember({ userId: "member-1" }),
    ]

    const exclusions = [
      createMockExclusion({ memberId: "member-1" }),
    ]

    const available = filterAvailableMembers(members, exclusions)
    expect(available).toHaveLength(0)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Exclusion Edge Cases", () => {
  it("should handle exclusion starting today", () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const exclusion = createMockExclusion({
      excludeFrom: today,
      excludeUntil: nextWeek,
    })

    expect(isExclusionActive(exclusion)).toBe(true)
  })

  it("should handle exclusion ending today", () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const exclusion = createMockExclusion({
      excludeFrom: lastWeek,
      excludeUntil: today,
    })

    expect(isExclusionActive(exclusion)).toBe(true)
  })

  it("should handle very short exclusion (1 day)", () => {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    const result = validateExclusionDates(today, tomorrow)
    expect(result.valid).toBe(true)
  })

  it("should handle multiple exclusions for same member", () => {
    const members = [createMockMember({ userId: "member-1" })]

    // Past exclusion
    const pastExclusion = createMockExclusion({
      id: "ex-past",
      excludeFrom: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      excludeUntil: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    })

    // Current exclusion
    const currentExclusion = createMockExclusion({
      id: "ex-current",
    })

    // With only past exclusion - member should be available
    expect(filterAvailableMembers(members, [pastExclusion])).toHaveLength(1)

    // With current exclusion - member should be excluded
    expect(filterAvailableMembers(members, [currentExclusion])).toHaveLength(0)

    // With both - member should be excluded (current wins)
    expect(filterAvailableMembers(members, [pastExclusion, currentExclusion])).toHaveLength(0)
  })
})

// =============================================================================
// REASON-SPECIFIC TESTS
// =============================================================================

describe("Exclusion Reason Handling", () => {
  it("should support all defined reasons", () => {
    const reasons: ExclusionReason[] = [
      "voyage",
      "maladie",
      "surcharge_travail",
      "garde_alternee",
      "autre",
    ]

    for (const reason of reasons) {
      const exclusion = createMockExclusion({ reason })
      expect(exclusion.reason).toBe(reason)
    }
  })

  it("should have appropriate icons for each reason", () => {
    expect(EXCLUSION_REASONS.voyage.icon).toBe("✈️")
    expect(EXCLUSION_REASONS.maladie.icon).toBe("🤒")
    expect(EXCLUSION_REASONS.surcharge_travail.icon).toBe("💼")
    expect(EXCLUSION_REASONS.garde_alternee.icon).toBe("🏠")
    expect(EXCLUSION_REASONS.autre.icon).toBe("📝")
  })
})
