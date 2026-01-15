/**
 * Integration Tests - Full User Flow
 * Tests for complete user journeys and multi-step scenarios
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskFilterSchema,
  TaskStatusEnum,
  TaskPriorityEnum,
  TaskCategoryEnum,
} from "@/lib/validations/task"
import {
  householdSchema,
  invitationSchema,
} from "@/lib/validations/household"
import {
  childSchema,
  updateChildSchema,
} from "@/lib/validations/child"
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
} from "@/lib/validations/onboarding"

// =============================================================================
// Task Flow Integration Tests
// =============================================================================

describe("Task Flow Integration", () => {
  describe("Task Creation Validation", () => {
    it("should validate complete task creation flow", () => {
      const taskData = {
        title: "Test Task",
        description: "A test task for integration testing",
        priority: "normal" as const,
        deadline: new Date().toISOString(),
        deadline_flexible: true,
        load_weight: 3,
        is_critical: false,
        source: "manual" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should validate task with all optional fields", () => {
      const taskData = {
        title: "Complete Task",
        description: "Task with all fields",
        category_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        assigned_to: "550e8400-e29b-41d4-a716-446655440002",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        deadline_flexible: false,
        priority: "high" as const,
        load_weight: 5,
        is_critical: true,
        source: "vocal" as const,
        vocal_transcript: "Create a new task for tomorrow",
        vocal_audio_url: "https://example.com/audio.webm",
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should reject task with invalid priority", () => {
      const taskData = {
        title: "Test Task",
        priority: "invalid_priority",
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(false)
    })

    it("should reject task with title too long", () => {
      const taskData = {
        title: "a".repeat(201),
        priority: "normal",
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(false)
    })
  })

  describe("Task Update Flow", () => {
    it("should validate task update with ID", () => {
      const updateData = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated Task Title",
        priority: "high" as const,
      }

      const result = TaskUpdateSchema.safeParse(updateData)
      expect(result.success).toBe(true)
    })

    it("should reject update without ID", () => {
      const updateData = {
        title: "Updated Task Title",
      }

      const result = TaskUpdateSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })
  })

  describe("Task Filtering Flow", () => {
    it("should validate complex filter query", () => {
      const filterData = {
        status: ["pending", "done"] as const,
        priority: ["high", "critical"] as const,
        deadline_from: new Date().toISOString(),
        deadline_to: new Date(Date.now() + 7 * 86400000).toISOString(),
        search: "urgent",
        limit: 25,
        offset: 0,
        sort_by: "deadline" as const,
        sort_order: "asc" as const,
      }

      const result = TaskFilterSchema.safeParse(filterData)
      expect(result.success).toBe(true)
    })

    it("should apply default values", () => {
      const filterData = {}

      const result = TaskFilterSchema.safeParse(filterData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(0)
        expect(result.data.sort_by).toBe("deadline")
        expect(result.data.sort_order).toBe("asc")
      }
    })
  })
})

// =============================================================================
// Household Flow Integration Tests
// =============================================================================

describe("Household Flow Integration", () => {
  describe("Household Creation", () => {
    it("should validate household creation data", () => {
      const householdData = {
        name: "Test Family",
        country: "FR",
        timezone: "Europe/Paris",
      }

      const result = householdSchema.safeParse(householdData)
      expect(result.success).toBe(true)
    })

    it("should reject household with invalid country code length", () => {
      const householdData = {
        name: "Test Family",
        country: "INVALID",
        timezone: "Europe/Paris",
      }

      const result = householdSchema.safeParse(householdData)
      expect(result.success).toBe(false)
    })

    it("should reject household with empty name", () => {
      const householdData = {
        name: "",
        country: "FR",
        timezone: "Europe/Paris",
      }

      const result = householdSchema.safeParse(householdData)
      expect(result.success).toBe(false)
    })
  })

  describe("Household Member Management", () => {
    it("should validate member addition", () => {
      const memberData = {
        email: "parent@example.com",
        role: "co_parent" as const,
      }

      const result = invitationSchema.safeParse(memberData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid email format", () => {
      const memberData = {
        email: "not-an-email",
        role: "co_parent",
      }

      const result = invitationSchema.safeParse(memberData)
      expect(result.success).toBe(false)
    })
  })
})

// =============================================================================
// Child Management Flow Integration Tests
// =============================================================================

describe("Child Management Flow Integration", () => {
  describe("Child Creation", () => {
    it("should validate child creation with all fields", () => {
      const childData = {
        first_name: "Emma",
        birthdate: "2018-05-15",
        gender: "F" as const,
        school_name: "Ecole Primaire",
        school_level: "primaire" as const,
        tags: ["allergie alimentaire"],
      }

      const result = childSchema.safeParse(childData)
      expect(result.success).toBe(true)
    })

    it("should validate child with minimal data", () => {
      const childData = {
        first_name: "Lucas",
        birthdate: "2020-03-22",
        tags: [],
      }

      const result = childSchema.safeParse(childData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid birthdate format", () => {
      const childData = {
        first_name: "Test",
        birthdate: "invalid-date",
        tags: [],
      }

      const result = childSchema.safeParse(childData)
      expect(result.success).toBe(false)
    })

    it("should reject empty first name", () => {
      const childData = {
        first_name: "",
        birthdate: "2020-01-01",
        tags: [],
      }

      const result = childSchema.safeParse(childData)
      expect(result.success).toBe(false)
    })
  })

  describe("Child Update", () => {
    it("should validate partial child update", () => {
      const updateData = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        first_name: "Updated Name",
      }

      const result = updateChildSchema.safeParse(updateData)
      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// Onboarding Flow Integration Tests
// =============================================================================

describe("Onboarding Flow Integration", () => {
  describe("Step 1: Household", () => {
    it("should validate step 1 data", () => {
      const step1Data = {
        name: "Smith Family",
        country: "FR" as const,
        timezone: "Europe/Paris",
      }

      const result = onboardingStep1Schema.safeParse(step1Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 2: Children", () => {
    it("should validate step 2 with multiple children", () => {
      const step2Data = {
        children: [
          { first_name: "Emma", birthdate: "2018-05-15", tags: [] },
          { first_name: "Lucas", birthdate: "2020-03-22", tags: [] },
        ],
      }

      const result = onboardingStep2Schema.safeParse(step2Data)
      expect(result.success).toBe(true)
    })

    it("should validate step 2 with no children", () => {
      const step2Data = {
        children: [],
      }

      const result = onboardingStep2Schema.safeParse(step2Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 3: Invitations", () => {
    it("should validate step 3 with email", () => {
      const step3Data = {
        email: "partner@example.com",
        skip: false,
      }

      const result = onboardingStep3Schema.safeParse(step3Data)
      expect(result.success).toBe(true)
    })

    it("should validate step 3 skipped", () => {
      const step3Data = {
        email: "",
        skip: true,
      }

      const result = onboardingStep3Schema.safeParse(step3Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 4: Preferences", () => {
    it("should validate step 4 preferences", () => {
      const step4Data = {
        daily_reminder_time: "08:00",
        email_enabled: true,
        push_enabled: false,
        weekly_summary_enabled: true,
      }

      const result = onboardingStep4Schema.safeParse(step4Data)
      expect(result.success).toBe(true)
    })

    it("should apply defaults for step 4", () => {
      const step4Data = {
        daily_reminder_time: null,
      }

      const result = onboardingStep4Schema.safeParse(step4Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Complete Onboarding Flow", () => {
    it("should validate complete onboarding data", () => {
      // Step 1
      const step1 = onboardingStep1Schema.safeParse({
        name: "Test Family",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(step1.success).toBe(true)

      // Step 2
      const step2 = onboardingStep2Schema.safeParse({
        children: [{ first_name: "Emma", birthdate: "2018-05-15", tags: [] }],
      })
      expect(step2.success).toBe(true)

      // Step 3
      const step3 = onboardingStep3Schema.safeParse({
        email: "partner@example.com",
        skip: false,
      })
      expect(step3.success).toBe(true)

      // Step 4
      const step4 = onboardingStep4Schema.safeParse({
        daily_reminder_time: "09:00",
        email_enabled: true,
      })
      expect(step4.success).toBe(true)
    })
  })
})

// =============================================================================
// Multi-User Scenario Tests
// =============================================================================

describe("Multi-User Scenarios", () => {
  describe("Task Assignment Validation", () => {
    it("should validate task with specific assignee", () => {
      const taskData = {
        title: "Assigned Task",
        assigned_to: "550e8400-e29b-41d4-a716-446655440000",
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should validate task without assignee (self-assigned)", () => {
      const taskData = {
        title: "Self Task",
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })
  })

  describe("Member Role Validation", () => {
    it("should validate co_parent role", () => {
      const memberData = {
        email: "coparent@example.com",
        role: "co_parent" as const,
      }

      const result = invitationSchema.safeParse(memberData)
      expect(result.success).toBe(true)
    })

    it("should validate tiers role", () => {
      const memberData = {
        email: "tiers@example.com",
        role: "tiers" as const,
      }

      const result = invitationSchema.safeParse(memberData)
      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("Edge Cases", () => {
  describe("Task Edge Cases", () => {
    it("should handle minimum valid title", () => {
      const taskData = {
        title: "A",
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should handle maximum valid title", () => {
      const taskData = {
        title: "A".repeat(200),
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should handle maximum description", () => {
      const taskData = {
        title: "Task with long description",
        description: "A".repeat(1000),
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(true)
    })

    it("should reject description exceeding limit", () => {
      const taskData = {
        title: "Task",
        description: "A".repeat(1001),
        priority: "normal" as const,
      }

      const result = TaskCreateSchema.safeParse(taskData)
      expect(result.success).toBe(false)
    })

    it("should handle load_weight boundaries", () => {
      expect(TaskCreateSchema.safeParse({
        title: "Task",
        load_weight: 1,
      }).success).toBe(true)

      expect(TaskCreateSchema.safeParse({
        title: "Task",
        load_weight: 10,
      }).success).toBe(true)

      expect(TaskCreateSchema.safeParse({
        title: "Task",
        load_weight: 0,
      }).success).toBe(false)

      expect(TaskCreateSchema.safeParse({
        title: "Task",
        load_weight: 11,
      }).success).toBe(false)
    })
  })

  describe("Child Edge Cases", () => {
    it("should handle future birthdate", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const childData = {
        first_name: "Future",
        birthdate: futureDate.toISOString().split("T")[0],
        tags: [],
      }

      const result = childSchema.safeParse(childData)
      // Future dates should be rejected
      expect(result.success).toBe(false)
    })

    it("should handle very old birthdate as valid", () => {
      // The schema only validates that birthdate is in the past
      // 1900 is a valid past date, just unusual
      const childData = {
        first_name: "Old",
        birthdate: "1900-01-01",
        tags: [],
      }

      const result = childSchema.safeParse(childData)
      // Actually this should pass as it's a valid past date
      expect(result.success).toBe(true)
    })
  })

  describe("Filter Edge Cases", () => {
    it("should handle maximum pagination limit", () => {
      const filterData = {
        limit: 100,
        offset: 0,
      }

      const result = TaskFilterSchema.safeParse(filterData)
      expect(result.success).toBe(true)
    })

    it("should reject limit exceeding maximum", () => {
      const filterData = {
        limit: 101,
      }

      const result = TaskFilterSchema.safeParse(filterData)
      expect(result.success).toBe(false)
    })

    it("should handle large offset", () => {
      const filterData = {
        limit: 50,
        offset: 10000,
      }

      const result = TaskFilterSchema.safeParse(filterData)
      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// Status and Priority Enum Tests
// =============================================================================

describe("Enum Validations", () => {
  describe("Task Status", () => {
    it("should accept all valid statuses", () => {
      const statuses = ["pending", "done", "postponed", "cancelled"]
      for (const status of statuses) {
        const result = TaskStatusEnum.safeParse(status)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid status", () => {
      const result = TaskStatusEnum.safeParse("invalid")
      expect(result.success).toBe(false)
    })
  })

  describe("Task Priority", () => {
    it("should accept all valid priorities", () => {
      const priorities = ["critical", "high", "normal", "low"]
      for (const priority of priorities) {
        const result = TaskPriorityEnum.safeParse(priority)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid priority", () => {
      const result = TaskPriorityEnum.safeParse("urgent")
      expect(result.success).toBe(false)
    })
  })

  describe("Task Category", () => {
    it("should accept all valid categories", () => {
      const categories = [
        "ecole",
        "sante",
        "administratif",
        "quotidien",
        "social",
        "activites",
        "logistique",
      ]
      for (const category of categories) {
        const result = TaskCategoryEnum.safeParse(category)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid category", () => {
      const result = TaskCategoryEnum.safeParse("other")
      expect(result.success).toBe(false)
    })
  })
})
