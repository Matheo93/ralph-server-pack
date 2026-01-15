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
  HouseholdCreateSchema,
  HouseholdMemberSchema,
} from "@/lib/validations/household"
import {
  ChildCreateSchema,
  ChildUpdateSchema,
} from "@/lib/validations/child"
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStep4Schema,
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
      }

      const result = HouseholdCreateSchema.safeParse(householdData)
      expect(result.success).toBe(true)
    })

    it("should reject household with invalid country", () => {
      const householdData = {
        name: "Test Family",
        country: "INVALID",
      }

      const result = HouseholdCreateSchema.safeParse(householdData)
      expect(result.success).toBe(false)
    })

    it("should reject household with empty name", () => {
      const householdData = {
        name: "",
        country: "FR",
      }

      const result = HouseholdCreateSchema.safeParse(householdData)
      expect(result.success).toBe(false)
    })
  })

  describe("Household Member Management", () => {
    it("should validate member addition", () => {
      const memberData = {
        email: "parent@example.com",
        role: "admin" as const,
      }

      const result = HouseholdMemberSchema.safeParse(memberData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid email format", () => {
      const memberData = {
        email: "not-an-email",
        role: "admin",
      }

      const result = HouseholdMemberSchema.safeParse(memberData)
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
        gender: "female" as const,
        avatar_url: "https://example.com/avatar.png",
        color: "#FF6B6B",
      }

      const result = ChildCreateSchema.safeParse(childData)
      expect(result.success).toBe(true)
    })

    it("should validate child with minimal data", () => {
      const childData = {
        first_name: "Lucas",
        birthdate: "2020-03-22",
      }

      const result = ChildCreateSchema.safeParse(childData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid birthdate format", () => {
      const childData = {
        first_name: "Test",
        birthdate: "invalid-date",
      }

      const result = ChildCreateSchema.safeParse(childData)
      expect(result.success).toBe(false)
    })

    it("should reject empty first name", () => {
      const childData = {
        first_name: "",
        birthdate: "2020-01-01",
      }

      const result = ChildCreateSchema.safeParse(childData)
      expect(result.success).toBe(false)
    })
  })

  describe("Child Update", () => {
    it("should validate partial child update", () => {
      const updateData = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        first_name: "Updated Name",
      }

      const result = ChildUpdateSchema.safeParse(updateData)
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
        household_name: "Smith Family",
        country: "FR",
      }

      const result = OnboardingStep1Schema.safeParse(step1Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 2: Children", () => {
    it("should validate step 2 with multiple children", () => {
      const step2Data = {
        children: [
          { first_name: "Emma", birthdate: "2018-05-15" },
          { first_name: "Lucas", birthdate: "2020-03-22" },
        ],
      }

      const result = OnboardingStep2Schema.safeParse(step2Data)
      expect(result.success).toBe(true)
    })

    it("should validate step 2 with no children", () => {
      const step2Data = {
        children: [],
      }

      const result = OnboardingStep2Schema.safeParse(step2Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 3: Invitations", () => {
    it("should validate step 3 with invitations", () => {
      const step3Data = {
        invitations: [
          { email: "partner@example.com", role: "admin" as const },
        ],
      }

      const result = OnboardingStep3Schema.safeParse(step3Data)
      expect(result.success).toBe(true)
    })

    it("should validate step 3 skipped", () => {
      const step3Data = {
        invitations: [],
      }

      const result = OnboardingStep3Schema.safeParse(step3Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Step 4: Preferences", () => {
    it("should validate step 4 preferences", () => {
      const step4Data = {
        notification_enabled: true,
        reminder_time: "08:00",
        language: "fr" as const,
      }

      const result = OnboardingStep4Schema.safeParse(step4Data)
      expect(result.success).toBe(true)
    })

    it("should apply defaults for step 4", () => {
      const step4Data = {}

      const result = OnboardingStep4Schema.safeParse(step4Data)
      expect(result.success).toBe(true)
    })
  })

  describe("Complete Onboarding Flow", () => {
    it("should validate complete onboarding data", () => {
      // Step 1
      const step1 = OnboardingStep1Schema.safeParse({
        household_name: "Test Family",
        country: "FR",
      })
      expect(step1.success).toBe(true)

      // Step 2
      const step2 = OnboardingStep2Schema.safeParse({
        children: [{ first_name: "Emma", birthdate: "2018-05-15" }],
      })
      expect(step2.success).toBe(true)

      // Step 3
      const step3 = OnboardingStep3Schema.safeParse({
        invitations: [{ email: "partner@example.com", role: "admin" }],
      })
      expect(step3.success).toBe(true)

      // Step 4
      const step4 = OnboardingStep4Schema.safeParse({
        notification_enabled: true,
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
    it("should validate admin role", () => {
      const memberData = {
        email: "admin@example.com",
        role: "admin" as const,
      }

      const result = HouseholdMemberSchema.safeParse(memberData)
      expect(result.success).toBe(true)
    })

    it("should validate member role", () => {
      const memberData = {
        email: "member@example.com",
        role: "member" as const,
      }

      const result = HouseholdMemberSchema.safeParse(memberData)
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
      }

      const result = ChildCreateSchema.safeParse(childData)
      // Future dates should be rejected
      expect(result.success).toBe(false)
    })

    it("should handle very old birthdate", () => {
      const childData = {
        first_name: "Old",
        birthdate: "1900-01-01",
      }

      const result = ChildCreateSchema.safeParse(childData)
      // Very old dates should be rejected
      expect(result.success).toBe(false)
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
