/**
 * Onboarding Wizard Tests
 *
 * Unit tests for the onboarding validation schemas and helpers.
 */

import { describe, it, expect } from "vitest"
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  COUNTRY_TIMEZONES,
  COMMON_CHILD_TAGS,
} from "@/lib/validations/onboarding"

describe("Onboarding Validation Schemas", () => {
  describe("Step 1 - Household", () => {
    it("should validate valid household data", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "Famille Dupont",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(true)
    })

    it("should reject empty household name", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    it("should reject name exceeding 50 characters", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "A".repeat(51),
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid country code", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "Test",
        country: "XX",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    it("should accept all valid country codes", () => {
      const validCountries = ["FR", "BE", "CH", "CA", "LU"]
      for (const country of validCountries) {
        const result = onboardingStep1Schema.safeParse({
          name: "Test",
          country,
          timezone: COUNTRY_TIMEZONES[country as keyof typeof COUNTRY_TIMEZONES][0],
        })
        expect(result.success).toBe(true)
      }
    })
  })

  describe("Step 2 - Children", () => {
    it("should validate empty children array", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [],
      })
      expect(result.success).toBe(true)
    })

    it("should validate single child", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          {
            firstName: "Emma",
            birthdate: "2015-03-15",
            tags: [],
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("should validate multiple children", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          { firstName: "Emma", birthdate: "2015-03-15", tags: ["allergie"] },
          { firstName: "Lucas", birthdate: "2018-07-20", tags: [] },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("should reject child with empty name", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          { firstName: "", birthdate: "2015-03-15", tags: [] },
        ],
      })
      expect(result.success).toBe(false)
    })

    it("should reject child with future birthdate", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const result = onboardingStep2Schema.safeParse({
        children: [
          { firstName: "Test", birthdate: futureDate.toISOString().split("T")[0], tags: [] },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Step 3 - Invite", () => {
    it("should validate valid email", () => {
      const result = onboardingStep3Schema.safeParse({
        coParentEmail: "coparent@example.com",
      })
      expect(result.success).toBe(true)
    })

    it("should validate empty email (skip invitation)", () => {
      const result = onboardingStep3Schema.safeParse({
        coParentEmail: "",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid email format", () => {
      const result = onboardingStep3Schema.safeParse({
        coParentEmail: "not-an-email",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Step 4 - Preferences", () => {
    it("should validate with defaults", () => {
      const result = onboardingStep4Schema.safeParse({})
      expect(result.success).toBe(true)
    })

    it("should validate custom reminder time", () => {
      const result = onboardingStep4Schema.safeParse({
        dailyReminderTime: "08:30",
      })
      expect(result.success).toBe(true)
    })

    it("should validate notification preferences", () => {
      const result = onboardingStep4Schema.safeParse({
        emailEnabled: true,
        pushEnabled: false,
        dailyReminderTime: "07:00",
      })
      expect(result.success).toBe(true)
    })
  })
})

describe("Onboarding Helpers", () => {
  describe("COUNTRY_TIMEZONES", () => {
    it("should have timezones for France", () => {
      expect(COUNTRY_TIMEZONES.FR).toContain("Europe/Paris")
    })

    it("should have timezones for Belgium", () => {
      expect(COUNTRY_TIMEZONES.BE).toContain("Europe/Brussels")
    })

    it("should have timezones for Switzerland", () => {
      expect(COUNTRY_TIMEZONES.CH).toContain("Europe/Zurich")
    })

    it("should have timezones for Canada", () => {
      expect(COUNTRY_TIMEZONES.CA.length).toBeGreaterThan(0)
    })
  })

  describe("COMMON_CHILD_TAGS", () => {
    it("should have common tags defined", () => {
      expect(COMMON_CHILD_TAGS.length).toBeGreaterThan(0)
    })

    it("should include allergie tag", () => {
      expect(COMMON_CHILD_TAGS).toContain("allergie")
    })

    it("should include asthme tag", () => {
      expect(COMMON_CHILD_TAGS).toContain("asthme")
    })
  })
})

/**
 * Integration test scenarios for manual testing:
 *
 * 1. Complete wizard flow:
 *    - Enter household name, country, timezone
 *    - Add one or more children with birthdates
 *    - Optionally invite co-parent
 *    - Set notification preferences
 *    - Verify household, children, and preferences are created
 *
 * 2. Skip steps:
 *    - Complete step 1
 *    - Skip step 2 (no children)
 *    - Skip step 3 (no co-parent)
 *    - Keep default preferences
 *    - Verify minimal setup works
 *
 * 3. Validation errors:
 *    - Try empty household name
 *    - Try invalid email
 *    - Try future birthdate
 *    - Verify error messages appear
 */
