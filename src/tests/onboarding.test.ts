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
  countryTimezones,
  commonChildTags,
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

    it("should reject name with less than 2 characters", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "A",
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
      const validCountries = ["FR", "BE", "CH", "CA", "LU"] as const
      for (const country of validCountries) {
        const timezones = countryTimezones[country]
        const result = onboardingStep1Schema.safeParse({
          name: "Test",
          country,
          timezone: timezones?.[0]?.value ?? "Europe/Paris",
        })
        expect(result.success).toBe(true)
      }
    })

    it("should reject missing timezone", () => {
      const result = onboardingStep1Schema.safeParse({
        name: "Test",
        country: "FR",
        timezone: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Step 2 - Children", () => {
    it("should validate empty children array (default)", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [],
      })
      expect(result.success).toBe(true)
    })

    it("should validate single child", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          {
            first_name: "Emma",
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
          { first_name: "Emma", birthdate: "2015-03-15", tags: ["allergie alimentaire"] },
          { first_name: "Lucas", birthdate: "2018-07-20", tags: [] },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("should reject child with empty name", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          { first_name: "", birthdate: "2015-03-15", tags: [] },
        ],
      })
      expect(result.success).toBe(false)
    })

    it("should reject child with name exceeding 50 characters", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          { first_name: "A".repeat(51), birthdate: "2015-03-15", tags: [] },
        ],
      })
      expect(result.success).toBe(false)
    })

    it("should reject child with future birthdate", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const result = onboardingStep2Schema.safeParse({
        children: [
          { first_name: "Test", birthdate: futureDate.toISOString().split("T")[0], tags: [] },
        ],
      })
      expect(result.success).toBe(false)
    })

    it("should accept child with valid tags", () => {
      const result = onboardingStep2Schema.safeParse({
        children: [
          {
            first_name: "Emma",
            birthdate: "2015-03-15",
            tags: ["allergie alimentaire", "asthme"],
          },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("Step 3 - Invite Co-parent", () => {
    it("should validate valid email", () => {
      const result = onboardingStep3Schema.safeParse({
        email: "coparent@example.com",
      })
      expect(result.success).toBe(true)
    })

    it("should validate empty email (skip invitation)", () => {
      const result = onboardingStep3Schema.safeParse({
        email: "",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid email format", () => {
      const result = onboardingStep3Schema.safeParse({
        email: "not-an-email",
      })
      expect(result.success).toBe(false)
    })

    it("should accept skip flag", () => {
      const result = onboardingStep3Schema.safeParse({
        email: "",
        skip: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe("Step 4 - Preferences", () => {
    it("should validate with all fields provided", () => {
      const result = onboardingStep4Schema.safeParse({
        daily_reminder_time: null,
        email_enabled: true,
        push_enabled: false,
        weekly_summary_enabled: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email_enabled).toBe(true)
        expect(result.data.push_enabled).toBe(false)
        expect(result.data.weekly_summary_enabled).toBe(true)
      }
    })

    it("should validate custom reminder time", () => {
      const result = onboardingStep4Schema.safeParse({
        daily_reminder_time: "08:30",
        email_enabled: true,
        push_enabled: false,
        weekly_summary_enabled: true,
      })
      expect(result.success).toBe(true)
    })

    it("should validate null reminder time", () => {
      const result = onboardingStep4Schema.safeParse({
        daily_reminder_time: null,
        email_enabled: true,
        push_enabled: false,
        weekly_summary_enabled: true,
      })
      expect(result.success).toBe(true)
    })

    it("should validate notification preferences", () => {
      const result = onboardingStep4Schema.safeParse({
        email_enabled: true,
        push_enabled: false,
        daily_reminder_time: "07:00",
        weekly_summary_enabled: true,
      })
      expect(result.success).toBe(true)
    })

    it("should allow disabling all notifications", () => {
      const result = onboardingStep4Schema.safeParse({
        email_enabled: false,
        push_enabled: false,
        weekly_summary_enabled: false,
        daily_reminder_time: null,
      })
      expect(result.success).toBe(true)
    })
  })
})

describe("Onboarding Helpers", () => {
  describe("countryTimezones", () => {
    it("should have timezones for France", () => {
      const frTimezones = countryTimezones["FR"]
      expect(frTimezones).toBeDefined()
      expect(frTimezones?.some((tz) => tz.value === "Europe/Paris")).toBe(true)
    })

    it("should have timezones for Belgium", () => {
      const beTimezones = countryTimezones["BE"]
      expect(beTimezones).toBeDefined()
      expect(beTimezones?.some((tz) => tz.value === "Europe/Brussels")).toBe(true)
    })

    it("should have timezones for Switzerland", () => {
      const chTimezones = countryTimezones["CH"]
      expect(chTimezones).toBeDefined()
      expect(chTimezones?.some((tz) => tz.value === "Europe/Zurich")).toBe(true)
    })

    it("should have multiple timezones for Canada", () => {
      const caTimezones = countryTimezones["CA"]
      expect(caTimezones).toBeDefined()
      expect(caTimezones?.length).toBeGreaterThan(1)
      expect(caTimezones?.some((tz) => tz.value === "America/Montreal")).toBe(true)
      expect(caTimezones?.some((tz) => tz.value === "America/Vancouver")).toBe(true)
    })

    it("should have timezones for Luxembourg", () => {
      const luTimezones = countryTimezones["LU"]
      expect(luTimezones).toBeDefined()
      expect(luTimezones?.some((tz) => tz.value === "Europe/Luxembourg")).toBe(true)
    })

    it("should have label for each timezone", () => {
      for (const country of Object.keys(countryTimezones)) {
        const timezones = countryTimezones[country]
        for (const tz of timezones ?? []) {
          expect(tz.value).toBeDefined()
          expect(tz.label).toBeDefined()
          expect(tz.label.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe("commonChildTags", () => {
    it("should have common tags defined", () => {
      expect(commonChildTags.length).toBeGreaterThan(0)
    })

    it("should include allergie tag", () => {
      expect(commonChildTags.some((tag) => tag.toLowerCase().includes("allergie"))).toBe(true)
    })

    it("should include asthme tag", () => {
      expect(commonChildTags).toContain("asthme")
    })

    it("should include garde alternée tag", () => {
      expect(commonChildTags.some((tag) => tag.toLowerCase().includes("garde"))).toBe(true)
    })

    it("should include activity tags", () => {
      expect(commonChildTags.some((tag) => tag.toLowerCase().includes("activité"))).toBe(true)
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
