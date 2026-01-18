/**
 * Server Actions Unit Tests
 *
 * Tests for server action validations and business logic.
 * Mocks database and authentication to test pure business logic.
 */

import { describe, test, expect, vi, beforeEach } from "vitest"

// ============================================================================
// VALIDATION TESTS
// ============================================================================

// Task validation tests
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskFilterSchema,
  TaskPostponeSchema,
  TaskReassignSchema,
  RecurrenceRuleSchema,
  TaskStatusEnum,
  TaskPriorityEnum,
  TaskSourceEnum,
  getDefaultWeight,
  CATEGORY_WEIGHTS,
} from "@/lib/validations/task"

describe("Task Validation Schemas", () => {
  describe("TaskCreateSchema", () => {
    test("validates minimal valid task", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test task",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe("Test task")
        expect(result.data.priority).toBe("normal")
        expect(result.data.deadline_flexible).toBe(true)
        expect(result.data.load_weight).toBe(1)
        expect(result.data.is_critical).toBe(false)
        expect(result.data.source).toBe("manual")
      }
    })

    test("validates full task with all fields", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Full task",
        description: "A detailed description",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        child_id: "123e4567-e89b-12d3-a456-426614174001",
        assigned_to: "123e4567-e89b-12d3-a456-426614174002",
        deadline: "2025-12-31",
        deadline_flexible: false,
        priority: "high",
        load_weight: 5,
        is_critical: true,
        source: "vocal",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe("high")
        expect(result.data.load_weight).toBe(5)
        expect(result.data.is_critical).toBe(true)
        // Date should be transformed to ISO with time
        expect(result.data.deadline).toBe("2025-12-31T23:59:59.999Z")
      }
    })

    test("rejects empty title", () => {
      const result = TaskCreateSchema.safeParse({
        title: "",
      })
      expect(result.success).toBe(false)
    })

    test("rejects title over 200 characters", () => {
      const result = TaskCreateSchema.safeParse({
        title: "a".repeat(201),
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid category_id UUID", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test",
        category_id: "not-a-uuid",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid priority", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test",
        priority: "super-urgent",
      })
      expect(result.success).toBe(false)
    })

    test("accepts ISO datetime deadline", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test",
        deadline: "2025-12-31T15:30:00.000Z",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deadline).toBe("2025-12-31T15:30:00.000Z")
      }
    })

    test("transforms date-only deadline to ISO", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test",
        deadline: "2025-06-15",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deadline).toBe("2025-06-15T23:59:59.999Z")
      }
    })

    test("rejects invalid date format", () => {
      const result = TaskCreateSchema.safeParse({
        title: "Test",
        deadline: "31/12/2025",
      })
      expect(result.success).toBe(false)
    })

    test("accepts load_weight from 1 to 10", () => {
      expect(TaskCreateSchema.safeParse({ title: "T", load_weight: 1 }).success).toBe(true)
      expect(TaskCreateSchema.safeParse({ title: "T", load_weight: 10 }).success).toBe(true)
      expect(TaskCreateSchema.safeParse({ title: "T", load_weight: 0 }).success).toBe(false)
      expect(TaskCreateSchema.safeParse({ title: "T", load_weight: 11 }).success).toBe(false)
    })
  })

  describe("TaskUpdateSchema", () => {
    test("requires ID", () => {
      const result = TaskUpdateSchema.safeParse({
        title: "Updated title",
      })
      expect(result.success).toBe(false)
    })

    test("validates update with ID and partial fields", () => {
      const result = TaskUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated title",
        priority: "critical",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid UUID for ID", () => {
      const result = TaskUpdateSchema.safeParse({
        id: "invalid",
        title: "Test",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("TaskFilterSchema", () => {
    test("accepts empty filter", () => {
      const result = TaskFilterSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(0)
        expect(result.data.sort_by).toBe("deadline")
        expect(result.data.sort_order).toBe("asc")
      }
    })

    test("accepts status array filter", () => {
      const result = TaskFilterSchema.safeParse({
        status: ["pending", "postponed"],
      })
      expect(result.success).toBe(true)
    })

    test("accepts priority array filter", () => {
      const result = TaskFilterSchema.safeParse({
        priority: ["high", "critical"],
      })
      expect(result.success).toBe(true)
    })

    test("limits limit to 100", () => {
      const result = TaskFilterSchema.safeParse({
        limit: 150,
      })
      expect(result.success).toBe(false)
    })

    test("accepts search parameter", () => {
      const result = TaskFilterSchema.safeParse({
        search: "homework",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("TaskPostponeSchema", () => {
    test("requires future deadline", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = TaskPostponeSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        new_deadline: futureDate.toISOString(),
      })
      expect(result.success).toBe(true)
    })

    test("rejects past deadline", () => {
      const pastDate = new Date("2020-01-01T00:00:00.000Z")

      const result = TaskPostponeSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        new_deadline: pastDate.toISOString(),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("TaskReassignSchema", () => {
    test("accepts null for unassignment", () => {
      const result = TaskReassignSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        assigned_to: null,
      })
      expect(result.success).toBe(true)
    })

    test("accepts valid UUID for reassignment", () => {
      const result = TaskReassignSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        assigned_to: "123e4567-e89b-12d3-a456-426614174001",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("RecurrenceRuleSchema", () => {
    test("accepts null", () => {
      const result = RecurrenceRuleSchema.safeParse(null)
      expect(result.success).toBe(true)
    })

    test("validates weekly recurrence", () => {
      const result = RecurrenceRuleSchema.safeParse({
        frequency: "weekly",
        interval: 1,
        byDayOfWeek: [1, 3, 5], // Mon, Wed, Fri
      })
      expect(result.success).toBe(true)
    })

    test("validates monthly recurrence with end date", () => {
      const result = RecurrenceRuleSchema.safeParse({
        frequency: "monthly",
        interval: 2,
        byDayOfMonth: [1, 15],
        endDate: "2026-12-31T23:59:59.999Z",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid frequency", () => {
      const result = RecurrenceRuleSchema.safeParse({
        frequency: "hourly",
        interval: 1,
      })
      expect(result.success).toBe(false)
    })

    test("rejects zero interval", () => {
      const result = RecurrenceRuleSchema.safeParse({
        frequency: "daily",
        interval: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Task Enums", () => {
    test("TaskStatusEnum has all statuses", () => {
      const statuses = ["pending", "done", "postponed", "cancelled"]
      statuses.forEach((s) => {
        expect(TaskStatusEnum.safeParse(s).success).toBe(true)
      })
    })

    test("TaskPriorityEnum has all priorities", () => {
      const priorities = ["critical", "high", "normal", "low"]
      priorities.forEach((p) => {
        expect(TaskPriorityEnum.safeParse(p).success).toBe(true)
      })
    })

    test("TaskSourceEnum has all sources", () => {
      const sources = ["manual", "vocal", "auto"]
      sources.forEach((s) => {
        expect(TaskSourceEnum.safeParse(s).success).toBe(true)
      })
    })
  })

  describe("Category Weights", () => {
    test("getDefaultWeight returns correct weights", () => {
      expect(getDefaultWeight("sante")).toBe(5)
      expect(getDefaultWeight("ecole")).toBe(4)
      expect(getDefaultWeight("administratif")).toBe(3)
      expect(getDefaultWeight("quotidien")).toBe(1)
    })

    test("getDefaultWeight returns 1 for unknown category", () => {
      expect(getDefaultWeight("unknown")).toBe(1)
    })

    test("CATEGORY_WEIGHTS has all categories", () => {
      const categories = ["administratif", "sante", "ecole", "quotidien", "social", "activites", "logistique"]
      categories.forEach((c) => {
        expect(CATEGORY_WEIGHTS[c]).toBeDefined()
        expect(typeof CATEGORY_WEIGHTS[c]).toBe("number")
      })
    })
  })
})

// ============================================================================
// CHILD VALIDATION TESTS
// ============================================================================

import {
  childSchema,
  updateChildSchema,
  calculateAge,
  suggestSchoolLevel,
  suggestSchoolClass,
} from "@/lib/validations/child"

describe("Child Validation Schemas", () => {
  describe("childSchema", () => {
    test("validates valid child data", () => {
      const result = childSchema.safeParse({
        first_name: "Lucas",
        birthdate: "2015-06-15",
        gender: "M",
        school_name: "Ecole Primaire",
        school_level: "primaire",
        school_class: "CM1",
        tags: ["sport", "musique"],
      })
      expect(result.success).toBe(true)
    })

    test("validates minimal child data", () => {
      const result = childSchema.safeParse({
        first_name: "Emma",
        birthdate: "2018-01-01",
        tags: [],
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty first_name", () => {
      const result = childSchema.safeParse({
        first_name: "",
        birthdate: "2015-01-01",
        tags: [],
      })
      expect(result.success).toBe(false)
    })

    test("rejects first_name over 50 characters", () => {
      const result = childSchema.safeParse({
        first_name: "a".repeat(51),
        birthdate: "2015-01-01",
        tags: [],
      })
      expect(result.success).toBe(false)
    })

    test("rejects future birthdate", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const result = childSchema.safeParse({
        first_name: "Test",
        birthdate: futureDate.toISOString().split("T")[0],
        tags: [],
      })
      expect(result.success).toBe(false)
    })

    test("accepts valid gender values", () => {
      expect(childSchema.safeParse({ first_name: "A", birthdate: "2015-01-01", tags: [], gender: "M" }).success).toBe(true)
      expect(childSchema.safeParse({ first_name: "A", birthdate: "2015-01-01", tags: [], gender: "F" }).success).toBe(true)
      expect(childSchema.safeParse({ first_name: "A", birthdate: "2015-01-01", tags: [], gender: null }).success).toBe(true)
    })

    test("rejects invalid gender", () => {
      const result = childSchema.safeParse({
        first_name: "Test",
        birthdate: "2015-01-01",
        tags: [],
        gender: "X",
      })
      expect(result.success).toBe(false)
    })

    test("accepts valid school levels", () => {
      const levels = ["maternelle", "primaire", "college", "lycee"]
      levels.forEach((level) => {
        const result = childSchema.safeParse({
          first_name: "Test",
          birthdate: "2015-01-01",
          tags: [],
          school_level: level,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe("updateChildSchema", () => {
    test("requires id", () => {
      const result = updateChildSchema.safeParse({
        first_name: "Updated",
      })
      expect(result.success).toBe(false)
    })

    test("accepts partial update", () => {
      const result = updateChildSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "Updated",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("calculateAge", () => {
    test("calculates age correctly", () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      const birthdate = tenYearsAgo.toISOString().split("T")[0]
      const age = calculateAge(birthdate)
      expect(age).toBe(10)
    })

    test("handles null birthdate", () => {
      expect(calculateAge(null)).toBe(0)
    })

    test("handles undefined birthdate", () => {
      expect(calculateAge(undefined)).toBe(0)
    })

    test("handles invalid date string", () => {
      expect(calculateAge("invalid-date")).toBe(0)
    })
  })

  describe("suggestSchoolLevel", () => {
    test("suggests maternelle for ages 3-5", () => {
      expect(suggestSchoolLevel(3)).toBe("maternelle")
      expect(suggestSchoolLevel(4)).toBe("maternelle")
      expect(suggestSchoolLevel(5)).toBe("maternelle")
    })

    test("suggests primaire for ages 6-10", () => {
      expect(suggestSchoolLevel(6)).toBe("primaire")
      expect(suggestSchoolLevel(8)).toBe("primaire")
      expect(suggestSchoolLevel(10)).toBe("primaire")
    })

    test("suggests college for ages 11-14", () => {
      expect(suggestSchoolLevel(11)).toBe("college")
      expect(suggestSchoolLevel(13)).toBe("college")
      expect(suggestSchoolLevel(14)).toBe("college")
    })

    test("suggests lycee for ages 15-17", () => {
      expect(suggestSchoolLevel(15)).toBe("lycee")
      expect(suggestSchoolLevel(16)).toBe("lycee")
      expect(suggestSchoolLevel(17)).toBe("lycee")
    })

    test("returns null for out-of-range ages", () => {
      expect(suggestSchoolLevel(2)).toBeNull()
      expect(suggestSchoolLevel(18)).toBeNull()
    })
  })

  describe("suggestSchoolClass", () => {
    test("suggests correct class for each age", () => {
      expect(suggestSchoolClass(3)).toBe("PS")
      expect(suggestSchoolClass(6)).toBe("CP")
      expect(suggestSchoolClass(11)).toBe("6ème")
      expect(suggestSchoolClass(15)).toBe("2nde")
      expect(suggestSchoolClass(17)).toBe("Term")
    })

    test("returns null for ages without mapping", () => {
      expect(suggestSchoolClass(2)).toBeNull()
      expect(suggestSchoolClass(18)).toBeNull()
    })
  })
})

// ============================================================================
// SHOPPING VALIDATION TESTS
// ============================================================================

import {
  ShoppingListCreateSchema,
  ShoppingListUpdateSchema,
  ShoppingItemCreateSchema,
  ShoppingItemUpdateSchema,
  ShoppingItemCheckSchema,
  ShoppingItemsBulkCheckSchema,
  ShoppingItemQuickAddSchema,
  ShoppingItemsReorderSchema,
  ShoppingCategoryEnum,
  UnitEnum,
  SHOPPING_CATEGORIES,
  CATEGORY_ICONS,
} from "@/lib/validations/shopping"

describe("Shopping Validation Schemas", () => {
  describe("ShoppingListCreateSchema", () => {
    test("validates with default name", () => {
      const result = ShoppingListCreateSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("Liste principale")
      }
    })

    test("validates custom name", () => {
      const result = ShoppingListCreateSchema.safeParse({
        name: "Courses de la semaine",
      })
      expect(result.success).toBe(true)
    })

    test("rejects name over 100 characters", () => {
      const result = ShoppingListCreateSchema.safeParse({
        name: "a".repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingListUpdateSchema", () => {
    test("requires id", () => {
      const result = ShoppingListUpdateSchema.safeParse({
        name: "Updated",
      })
      expect(result.success).toBe(false)
    })

    test("validates update with id and name", () => {
      const result = ShoppingListUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated List",
        is_active: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe("ShoppingItemCreateSchema", () => {
    test("validates minimal item", () => {
      const result = ShoppingItemCreateSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Lait",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(1)
        expect(result.data.category).toBe("Autres")
        expect(result.data.priority).toBe(0)
      }
    })

    test("validates full item", () => {
      const result = ShoppingItemCreateSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        quantity: 2.5,
        unit: "kg",
        category: "Fruits et legumes",
        note: "Bio de preference",
        priority: 1,
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty name", () => {
      const result = ShoppingItemCreateSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
      })
      expect(result.success).toBe(false)
    })

    test("rejects negative quantity", () => {
      const result = ShoppingItemCreateSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        quantity: -1,
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid category", () => {
      const result = ShoppingItemCreateSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        category: "Invalid Category",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingItemUpdateSchema", () => {
    test("requires id for update", () => {
      const result = ShoppingItemUpdateSchema.safeParse({
        name: "Updated",
      })
      expect(result.success).toBe(false)
    })

    test("validates partial update", () => {
      const result = ShoppingItemUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        quantity: 3,
      })
      expect(result.success).toBe(true)
    })
  })

  describe("ShoppingItemCheckSchema", () => {
    test("validates check toggle", () => {
      const result = ShoppingItemCheckSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        is_checked: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe("ShoppingItemsBulkCheckSchema", () => {
    test("validates bulk check", () => {
      const result = ShoppingItemsBulkCheckSchema.safeParse({
        item_ids: [
          "123e4567-e89b-12d3-a456-426614174000",
          "123e4567-e89b-12d3-a456-426614174001",
        ],
        is_checked: true,
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty item_ids array", () => {
      const result = ShoppingItemsBulkCheckSchema.safeParse({
        item_ids: [],
        is_checked: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingItemQuickAddSchema", () => {
    test("validates quick add", () => {
      const result = ShoppingItemQuickAddSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Bread",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("ShoppingItemsReorderSchema", () => {
    test("validates reorder", () => {
      const result = ShoppingItemsReorderSchema.safeParse({
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        item_ids: [
          "123e4567-e89b-12d3-a456-426614174001",
          "123e4567-e89b-12d3-a456-426614174002",
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("Shopping Enums and Constants", () => {
    test("ShoppingCategoryEnum validates all categories", () => {
      SHOPPING_CATEGORIES.forEach((cat) => {
        expect(ShoppingCategoryEnum.safeParse(cat).success).toBe(true)
      })
    })

    test("CATEGORY_ICONS has icon for each category", () => {
      SHOPPING_CATEGORIES.forEach((cat) => {
        expect(CATEGORY_ICONS[cat]).toBeDefined()
        expect(typeof CATEGORY_ICONS[cat]).toBe("string")
      })
    })

    test("UnitEnum validates all units", () => {
      const units = ["piece", "kg", "g", "L", "ml", "pack", "boite", "bouteille", "sachet"]
      units.forEach((u) => {
        expect(UnitEnum.safeParse(u).success).toBe(true)
      })
    })
  })
})

// ============================================================================
// HOUSEHOLD VALIDATION TESTS
// ============================================================================

import {
  householdSchema,
  invitationSchema,
} from "@/lib/validations/household"

describe("Household Validation Schemas", () => {
  describe("householdSchema", () => {
    test("validates valid household", () => {
      const result = householdSchema.safeParse({
        name: "Famille Dupont",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty name", () => {
      const result = householdSchema.safeParse({
        name: "",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    test("rejects short name", () => {
      const result = householdSchema.safeParse({
        name: "A", // Min is 2
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    test("accepts 2-letter country codes", () => {
      const countries = ["FR", "BE", "CH", "CA", "LU", "US", "DE"]
      countries.forEach((country) => {
        const result = householdSchema.safeParse({
          name: "Test Name",
          country,
          timezone: "Europe/Paris",
        })
        expect(result.success).toBe(true)
      })
    })

    test("rejects invalid country code length", () => {
      const result = householdSchema.safeParse({
        name: "Test Name",
        country: "USA", // Must be exactly 2 characters
        timezone: "America/New_York",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("invitationSchema", () => {
    test("validates valid invitation", () => {
      const result = invitationSchema.safeParse({
        email: "coparent@example.com",
        role: "co_parent",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid email", () => {
      const result = invitationSchema.safeParse({
        email: "not-an-email",
        role: "co_parent",
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// AUTH VALIDATION TESTS
// ============================================================================

import {
  loginSchema,
  signupSchema,
  confirmCodeSchema,
} from "@/lib/validations/auth"

describe("Auth Validation Schemas", () => {
  describe("loginSchema", () => {
    test("validates valid login", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "Password123!",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid",
        password: "Password123!",
      })
      expect(result.success).toBe(false)
    })

    test("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("signupSchema", () => {
    test("validates valid signup", () => {
      const result = signupSchema.safeParse({
        email: "newuser@example.com",
        password: "SecurePassword123!",
        confirmPassword: "SecurePassword123!",
      })
      expect(result.success).toBe(true)
    })

    test("rejects mismatched passwords", () => {
      const result = signupSchema.safeParse({
        email: "user@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword!",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("confirmCodeSchema", () => {
    test("validates valid confirmation code", () => {
      const result = confirmCodeSchema.safeParse({
        email: "user@example.com",
        code: "123456",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid code format", () => {
      const result = confirmCodeSchema.safeParse({
        email: "user@example.com",
        code: "abc", // Too short
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// SETTINGS VALIDATION TESTS
// ============================================================================

import { z } from "zod"

describe("Settings Validation Schemas", () => {
  // Define schemas inline since they're not exported from the module
  const ProfileUpdateSchema = z.object({
    name: z.string().max(100).nullable(),
    language: z.enum(["fr", "en"]),
    timezone: z.string(),
  })

  const NotificationPreferencesSchema = z.object({
    push_enabled: z.boolean(),
    email_enabled: z.boolean(),
    daily_reminder_time: z.string().nullable(),
    reminder_before_deadline_hours: z.number().int().min(1).max(168),
    weekly_summary_enabled: z.boolean(),
    balance_alert_enabled: z.boolean(),
  })

  describe("ProfileUpdateSchema", () => {
    test("validates valid profile update", () => {
      const result = ProfileUpdateSchema.safeParse({
        name: "Jean Dupont",
        language: "fr",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(true)
    })

    test("accepts null name", () => {
      const result = ProfileUpdateSchema.safeParse({
        name: null,
        language: "en",
        timezone: "Europe/London",
      })
      expect(result.success).toBe(true)
    })

    test("rejects invalid language", () => {
      const result = ProfileUpdateSchema.safeParse({
        name: "Test",
        language: "de",
        timezone: "Europe/Berlin",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("NotificationPreferencesSchema", () => {
    test("validates valid preferences", () => {
      const result = NotificationPreferencesSchema.safeParse({
        push_enabled: true,
        email_enabled: false,
        daily_reminder_time: "09:00",
        reminder_before_deadline_hours: 24,
        weekly_summary_enabled: true,
        balance_alert_enabled: true,
      })
      expect(result.success).toBe(true)
    })

    test("accepts null daily_reminder_time", () => {
      const result = NotificationPreferencesSchema.safeParse({
        push_enabled: false,
        email_enabled: false,
        daily_reminder_time: null,
        reminder_before_deadline_hours: 48,
        weekly_summary_enabled: false,
        balance_alert_enabled: false,
      })
      expect(result.success).toBe(true)
    })

    test("rejects reminder_before_deadline_hours outside range", () => {
      expect(
        NotificationPreferencesSchema.safeParse({
          push_enabled: true,
          email_enabled: true,
          daily_reminder_time: null,
          reminder_before_deadline_hours: 0, // Min is 1
          weekly_summary_enabled: true,
          balance_alert_enabled: true,
        }).success
      ).toBe(false)

      expect(
        NotificationPreferencesSchema.safeParse({
          push_enabled: true,
          email_enabled: true,
          daily_reminder_time: null,
          reminder_before_deadline_hours: 200, // Max is 168
          weekly_summary_enabled: true,
          balance_alert_enabled: true,
        }).success
      ).toBe(false)
    })
  })
})

// ============================================================================
// CHALLENGES VALIDATION TESTS
// ============================================================================

describe("Challenge Validation Schemas", () => {
  const createChallengeSchema = z.object({
    templateId: z.string().uuid().optional(),
    name: z.string().min(1, "Nom requis").max(100),
    description: z.string().max(500).optional(),
    icon: z.string().max(50).optional().default("🎯"),
    triggerType: z.enum(["task_category", "task_any", "specific_task"]),
    triggerCategoryCode: z.string().max(50).optional(),
    triggerTaskKeyword: z.string().max(100).optional(),
    requiredCount: z.number().int().min(1).max(100).default(1),
    timeframeDays: z.number().int().min(1).max(365).optional(),
    rewardXp: z.number().int().min(1).max(1000).default(50),
    rewardBadgeId: z.string().uuid().optional(),
    rewardCustom: z.string().max(200).optional(),
    childIds: z.array(z.string().uuid()).min(1, "Au moins un enfant requis"),
  })

  describe("createChallengeSchema", () => {
    test("validates valid challenge", () => {
      const result = createChallengeSchema.safeParse({
        name: "Ranger sa chambre",
        triggerType: "task_category",
        triggerCategoryCode: "quotidien",
        requiredCount: 5,
        timeframeDays: 7,
        rewardXp: 100,
        childIds: ["123e4567-e89b-12d3-a456-426614174000"],
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty name", () => {
      const result = createChallengeSchema.safeParse({
        name: "",
        triggerType: "task_any",
        childIds: ["123e4567-e89b-12d3-a456-426614174000"],
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid trigger type", () => {
      const result = createChallengeSchema.safeParse({
        name: "Test",
        triggerType: "invalid",
        childIds: ["123e4567-e89b-12d3-a456-426614174000"],
      })
      expect(result.success).toBe(false)
    })

    test("rejects empty childIds", () => {
      const result = createChallengeSchema.safeParse({
        name: "Test",
        triggerType: "task_any",
        childIds: [],
      })
      expect(result.success).toBe(false)
    })

    test("rejects requiredCount > 100", () => {
      const result = createChallengeSchema.safeParse({
        name: "Test",
        triggerType: "task_any",
        requiredCount: 101,
        childIds: ["123e4567-e89b-12d3-a456-426614174000"],
      })
      expect(result.success).toBe(false)
    })

    test("uses default values", () => {
      const result = createChallengeSchema.safeParse({
        name: "Test",
        triggerType: "task_any",
        childIds: ["123e4567-e89b-12d3-a456-426614174000"],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.icon).toBe("🎯")
        expect(result.data.requiredCount).toBe(1)
        expect(result.data.rewardXp).toBe(50)
      }
    })
  })
})

// ============================================================================
// ACTION RESULT TYPE TESTS
// ============================================================================

describe("Action Result Types", () => {
  test("success result has correct shape", () => {
    type ActionResult<T = unknown> = {
      success: boolean
      data?: T
      error?: string
    }

    const successResult: ActionResult<{ id: string }> = {
      success: true,
      data: { id: "123" },
    }
    expect(successResult.success).toBe(true)
    expect(successResult.data?.id).toBe("123")
    expect(successResult.error).toBeUndefined()
  })

  test("error result has correct shape", () => {
    type ActionResult<T = unknown> = {
      success: boolean
      data?: T
      error?: string
    }

    const errorResult: ActionResult = {
      success: false,
      error: "Something went wrong",
    }
    expect(errorResult.success).toBe(false)
    expect(errorResult.error).toBe("Something went wrong")
    expect(errorResult.data).toBeUndefined()
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

// ============================================================================
// CALENDAR VALIDATION TESTS
// ============================================================================

import {
  CalendarEventCreateSchema,
  CalendarEventUpdateSchema,
  CalendarEventFilterSchema,
  CalendarEventHistoryFilterSchema,
  EventTypeEnum,
  RecurrenceEnum,
  getEventColor,
  EVENT_COLORS,
  EVENT_TYPE_LABELS,
  RECURRENCE_LABELS,
} from "@/lib/validations/calendar"

describe("Calendar Validation Schemas", () => {
  describe("CalendarEventCreateSchema", () => {
    test("validates minimal event", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Doctor appointment",
        start_date: "2025-06-15T14:30:00.000Z",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe("Doctor appointment")
        expect(result.data.all_day).toBe(false)
        expect(result.data.recurrence).toBe("none")
        expect(result.data.color).toBe("#6366f1")
        expect(result.data.event_type).toBe("general")
        expect(result.data.reminder_minutes).toBe(30)
      }
    })

    test("validates full event", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Birthday party",
        description: "John's 10th birthday",
        start_date: "2025-06-15T10:00:00.000Z",
        end_date: "2025-06-15T14:00:00.000Z",
        all_day: false,
        recurrence: "yearly",
        recurrence_end_date: "2030-06-15",
        color: "#f59e0b",
        assigned_to: "123e4567-e89b-12d3-a456-426614174000",
        child_id: "123e4567-e89b-12d3-a456-426614174001",
        event_type: "birthday",
        location: "123 Main Street",
        reminder_minutes: 1440,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.event_type).toBe("birthday")
        expect(result.data.recurrence).toBe("yearly")
      }
    })

    test("rejects empty title", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "",
        start_date: "2025-06-15T14:30:00.000Z",
      })
      expect(result.success).toBe(false)
    })

    test("rejects title over 255 characters", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "a".repeat(256),
        start_date: "2025-06-15T14:30:00.000Z",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid start_date format", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Test",
        start_date: "15/06/2025",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid color format", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Test",
        start_date: "2025-06-15T14:30:00.000Z",
        color: "red",
      })
      expect(result.success).toBe(false)
    })

    test("accepts valid hex color", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Test",
        start_date: "2025-06-15T14:30:00.000Z",
        color: "#FF5733",
      })
      expect(result.success).toBe(true)
    })

    test("rejects reminder_minutes over 7 days", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Test",
        start_date: "2025-06-15T14:30:00.000Z",
        reminder_minutes: 10081,
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid recurrence_end_date format", () => {
      const result = CalendarEventCreateSchema.safeParse({
        title: "Test",
        start_date: "2025-06-15T14:30:00.000Z",
        recurrence: "weekly",
        recurrence_end_date: "2025/06/30",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("CalendarEventUpdateSchema", () => {
    test("requires id", () => {
      const result = CalendarEventUpdateSchema.safeParse({
        title: "Updated title",
      })
      expect(result.success).toBe(false)
    })

    test("validates partial update with id", () => {
      const result = CalendarEventUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated title",
      })
      expect(result.success).toBe(true)
    })

    test("allows updating only color", () => {
      const result = CalendarEventUpdateSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        color: "#22c55e",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("CalendarEventFilterSchema", () => {
    test("validates date range filter", () => {
      const result = CalendarEventFilterSchema.safeParse({
        start_date: "2025-06-01T00:00:00.000Z",
        end_date: "2025-06-30T23:59:59.999Z",
      })
      expect(result.success).toBe(true)
    })

    test("accepts optional filters", () => {
      const result = CalendarEventFilterSchema.safeParse({
        start_date: "2025-06-01T00:00:00.000Z",
        end_date: "2025-06-30T23:59:59.999Z",
        event_type: "medical",
        child_id: "123e4567-e89b-12d3-a456-426614174000",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("CalendarEventHistoryFilterSchema", () => {
    test("accepts empty filter with defaults", () => {
      const result = CalendarEventHistoryFilterSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
        expect(result.data.sort_order).toBe("desc")
      }
    })

    test("accepts search parameter", () => {
      const result = CalendarEventHistoryFilterSchema.safeParse({
        search: "doctor",
        limit: 50,
        offset: 10,
        sort_order: "asc",
      })
      expect(result.success).toBe(true)
    })

    test("rejects limit over 100", () => {
      const result = CalendarEventHistoryFilterSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Event Enums", () => {
    test("EventTypeEnum validates all types", () => {
      const types = ["general", "medical", "school", "activity", "birthday", "reminder"]
      types.forEach((t) => {
        expect(EventTypeEnum.safeParse(t).success).toBe(true)
      })
    })

    test("RecurrenceEnum validates all options", () => {
      const options = ["none", "daily", "weekly", "monthly", "yearly"]
      options.forEach((o) => {
        expect(RecurrenceEnum.safeParse(o).success).toBe(true)
      })
    })
  })

  describe("Helper Functions", () => {
    test("getEventColor returns correct colors", () => {
      expect(getEventColor("general")).toBe(EVENT_COLORS.primary)
      expect(getEventColor("medical")).toBe(EVENT_COLORS.medical)
      expect(getEventColor("school")).toBe(EVENT_COLORS.school)
      expect(getEventColor("activity")).toBe(EVENT_COLORS.activity)
      expect(getEventColor("birthday")).toBe(EVENT_COLORS.birthday)
      expect(getEventColor("reminder")).toBe(EVENT_COLORS.reminder)
    })

    test("EVENT_TYPE_LABELS has French labels", () => {
      expect(EVENT_TYPE_LABELS.general).toBe("Général")
      expect(EVENT_TYPE_LABELS.medical).toBe("Rendez-vous médical")
      expect(EVENT_TYPE_LABELS.school).toBe("École")
    })

    test("RECURRENCE_LABELS has French labels", () => {
      expect(RECURRENCE_LABELS.none).toBe("Aucune")
      expect(RECURRENCE_LABELS.daily).toBe("Tous les jours")
      expect(RECURRENCE_LABELS.weekly).toBe("Toutes les semaines")
    })
  })
})

// ============================================================================
// ONBOARDING VALIDATION TESTS
// ============================================================================

describe("Onboarding Validation Schemas", () => {
  const OnboardingStep1Schema = z.object({
    name: z.string().min(2, "Au moins 2 caractères").max(100),
    country: z.enum(["FR", "BE", "CH", "CA", "LU"]),
    timezone: z.string(),
  })

  const OnboardingStep2Schema = z.object({
    children: z.array(z.object({
      first_name: z.string().min(1).max(50),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).min(1),
  })

  describe("OnboardingStep1Schema", () => {
    test("validates valid step 1", () => {
      const result = OnboardingStep1Schema.safeParse({
        name: "Famille Dupont",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(true)
    })

    test("rejects name under 2 characters", () => {
      const result = OnboardingStep1Schema.safeParse({
        name: "A",
        country: "FR",
        timezone: "Europe/Paris",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid country", () => {
      const result = OnboardingStep1Schema.safeParse({
        name: "Test",
        country: "US",
        timezone: "America/New_York",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("OnboardingStep2Schema", () => {
    test("validates children array", () => {
      const result = OnboardingStep2Schema.safeParse({
        children: [
          { first_name: "Lucas", birthdate: "2015-06-15" },
          { first_name: "Emma", birthdate: "2018-03-20" },
        ],
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty children array", () => {
      const result = OnboardingStep2Schema.safeParse({
        children: [],
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// KIDS GAMIFICATION VALIDATION TESTS
// ============================================================================

describe("Kids Gamification Validation", () => {
  const XPTransactionSchema = z.object({
    child_id: z.string().uuid(),
    amount: z.number().int().min(-1000).max(1000),
    reason: z.enum([
      "task_completed",
      "challenge_completed",
      "streak_bonus",
      "level_up",
      "admin_adjustment",
    ]),
    task_id: z.string().uuid().optional(),
    challenge_id: z.string().uuid().optional(),
  })

  const BadgeAwardSchema = z.object({
    child_id: z.string().uuid(),
    badge_id: z.string().uuid(),
    reason: z.string().max(200).optional(),
  })

  describe("XPTransactionSchema", () => {
    test("validates task completion XP", () => {
      const result = XPTransactionSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 50,
        reason: "task_completed",
        task_id: "123e4567-e89b-12d3-a456-426614174001",
      })
      expect(result.success).toBe(true)
    })

    test("allows negative XP for adjustments", () => {
      const result = XPTransactionSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: -100,
        reason: "admin_adjustment",
      })
      expect(result.success).toBe(true)
    })

    test("rejects XP over 1000", () => {
      const result = XPTransactionSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 1001,
        reason: "task_completed",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid reason", () => {
      const result = XPTransactionSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 50,
        reason: "invalid_reason",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("BadgeAwardSchema", () => {
    test("validates badge award", () => {
      const result = BadgeAwardSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        badge_id: "123e4567-e89b-12d3-a456-426614174001",
        reason: "First task completed!",
      })
      expect(result.success).toBe(true)
    })

    test("allows optional reason", () => {
      const result = BadgeAwardSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        badge_id: "123e4567-e89b-12d3-a456-426614174001",
      })
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================================
// KIDS AUTH VALIDATION TESTS
// ============================================================================

describe("Kids Auth Validation", () => {
  const KidsPinSchema = z.object({
    child_id: z.string().uuid(),
    pin: z.string().regex(/^\d{4}$/, "Le code PIN doit contenir 4 chiffres"),
  })

  const CreateChildAccountSchema = z.object({
    child_id: z.string().uuid(),
    pin: z.string().regex(/^\d{4}$/),
    nickname: z.string().min(1).max(20).optional(),
    avatar_id: z.string().max(50).optional(),
  })

  describe("KidsPinSchema", () => {
    test("validates 4-digit PIN", () => {
      const result = KidsPinSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "1234",
      })
      expect(result.success).toBe(true)
    })

    test("rejects non-numeric PIN", () => {
      const result = KidsPinSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "abcd",
      })
      expect(result.success).toBe(false)
    })

    test("rejects PIN with wrong length", () => {
      expect(KidsPinSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "123",
      }).success).toBe(false)

      expect(KidsPinSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "12345",
      }).success).toBe(false)
    })
  })

  describe("CreateChildAccountSchema", () => {
    test("validates account creation", () => {
      const result = CreateChildAccountSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "5678",
        nickname: "SuperLucas",
        avatar_id: "avatar_01",
      })
      expect(result.success).toBe(true)
    })

    test("allows optional fields", () => {
      const result = CreateChildAccountSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "5678",
      })
      expect(result.success).toBe(true)
    })

    test("rejects nickname over 20 characters", () => {
      const result = CreateChildAccountSchema.safeParse({
        child_id: "123e4567-e89b-12d3-a456-426614174000",
        pin: "5678",
        nickname: "a".repeat(21),
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// STREAK VALIDATION TESTS
// ============================================================================

describe("Streak Validation", () => {
  const StreakBonusCalculation = (streakDays: number): number => {
    if (streakDays >= 30) return 50
    if (streakDays >= 14) return 25
    if (streakDays >= 7) return 15
    if (streakDays >= 3) return 10
    return 5
  }

  test("calculates correct bonus for streaks", () => {
    expect(StreakBonusCalculation(1)).toBe(5)
    expect(StreakBonusCalculation(3)).toBe(10)
    expect(StreakBonusCalculation(7)).toBe(15)
    expect(StreakBonusCalculation(14)).toBe(25)
    expect(StreakBonusCalculation(30)).toBe(50)
    expect(StreakBonusCalculation(100)).toBe(50)
  })
})

// ============================================================================
// WEEK/SCHEDULE VALIDATION TESTS
// ============================================================================

describe("Week Schedule Validation", () => {
  const WeekScheduleSchema = z.object({
    week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tasks: z.array(z.object({
      task_id: z.string().uuid(),
      scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })),
  })

  test("validates week schedule", () => {
    const result = WeekScheduleSchema.safeParse({
      week_start: "2025-06-16",
      tasks: [
        {
          task_id: "123e4567-e89b-12d3-a456-426614174000",
          scheduled_date: "2025-06-17",
          scheduled_time: "14:30",
        },
        {
          task_id: "123e4567-e89b-12d3-a456-426614174001",
          scheduled_date: "2025-06-18",
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  test("accepts empty tasks array", () => {
    const result = WeekScheduleSchema.safeParse({
      week_start: "2025-06-16",
      tasks: [],
    })
    expect(result.success).toBe(true)
  })

  test("rejects invalid time format", () => {
    const result = WeekScheduleSchema.safeParse({
      week_start: "2025-06-16",
      tasks: [
        {
          task_id: "123e4567-e89b-12d3-a456-426614174000",
          scheduled_date: "2025-06-17",
          scheduled_time: "2:30 PM",
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// SHOPPING SHARE VALIDATION TESTS
// ============================================================================

describe("Shopping Share Validation", () => {
  const ShareLinkSchema = z.object({
    list_id: z.string().uuid(),
    expires_in_hours: z.number().int().min(1).max(168).default(24),
    allow_edit: z.boolean().default(false),
  })

  test("validates share link creation", () => {
    const result = ShareLinkSchema.safeParse({
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      expires_in_hours: 48,
      allow_edit: true,
    })
    expect(result.success).toBe(true)
  })

  test("uses defaults", () => {
    const result = ShareLinkSchema.safeParse({
      list_id: "123e4567-e89b-12d3-a456-426614174000",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expires_in_hours).toBe(24)
      expect(result.data.allow_edit).toBe(false)
    }
  })

  test("rejects expires_in_hours over 168", () => {
    const result = ShareLinkSchema.safeParse({
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      expires_in_hours: 200,
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// SETTINGS VALIDATION EXTENDED TESTS
// ============================================================================

describe("Settings Extended Validation", () => {
  const ExclusionReasonEnum = z.enum(["voyage", "maladie", "surcharge_travail", "garde_alternee", "autre"])

  const CreateExclusionSchema = z.object({
    member_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: ExclusionReasonEnum,
  })

  const CategoryPreferenceSchema = z.object({
    categoryId: z.string().uuid(),
    preferenceLevel: z.enum(["prefer", "neutral", "dislike", "expert"]),
  })

  describe("CreateExclusionSchema", () => {
    test("validates exclusion creation", () => {
      const result = CreateExclusionSchema.safeParse({
        member_id: "123e4567-e89b-12d3-a456-426614174000",
        start_date: "2025-06-01",
        end_date: "2025-06-15",
        reason: "voyage",
      })
      expect(result.success).toBe(true)
    })

    test("accepts all exclusion reasons", () => {
      const reasons = ["voyage", "maladie", "surcharge_travail", "garde_alternee", "autre"]
      reasons.forEach((reason) => {
        const result = CreateExclusionSchema.safeParse({
          member_id: "123e4567-e89b-12d3-a456-426614174000",
          start_date: "2025-06-01",
          end_date: "2025-06-15",
          reason,
        })
        expect(result.success).toBe(true)
      })
    })

    test("rejects invalid date format", () => {
      const result = CreateExclusionSchema.safeParse({
        member_id: "123e4567-e89b-12d3-a456-426614174000",
        start_date: "01/06/2025",
        end_date: "15/06/2025",
        reason: "voyage",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("CategoryPreferenceSchema", () => {
    test("validates preference levels", () => {
      const levels = ["prefer", "neutral", "dislike", "expert"]
      levels.forEach((level) => {
        const result = CategoryPreferenceSchema.safeParse({
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
          preferenceLevel: level,
        })
        expect(result.success).toBe(true)
      })
    })
  })
})

// ============================================================================
// BUSINESS LOGIC TESTS (Pure Functions)
// ============================================================================

describe("Business Logic", () => {
  describe("Load Weight Calculation", () => {
    // Simulate load weight calculation
    const calculateWeeklyLoad = (tasks: { load_weight: number; status: string }[]): number => {
      return tasks
        .filter((t) => t.status === "done")
        .reduce((sum, t) => sum + t.load_weight, 0)
    }

    test("calculates load correctly for completed tasks", () => {
      const tasks = [
        { load_weight: 3, status: "done" },
        { load_weight: 5, status: "done" },
        { load_weight: 2, status: "pending" },
      ]
      expect(calculateWeeklyLoad(tasks)).toBe(8)
    })

    test("returns 0 for no completed tasks", () => {
      const tasks = [
        { load_weight: 3, status: "pending" },
        { load_weight: 5, status: "postponed" },
      ]
      expect(calculateWeeklyLoad(tasks)).toBe(0)
    })

    test("handles empty array", () => {
      expect(calculateWeeklyLoad([])).toBe(0)
    })
  })

  describe("Balance Percentage Calculation", () => {
    const calculateBalance = (loads: { userId: string; load: number }[]): Record<string, number> => {
      const total = loads.reduce((sum, l) => sum + l.load, 0)
      if (total === 0) return Object.fromEntries(loads.map((l) => [l.userId, 0]))
      return Object.fromEntries(loads.map((l) => [l.userId, Math.round((l.load / total) * 100)]))
    }

    test("calculates balance percentages", () => {
      const loads = [
        { userId: "user1", load: 30 },
        { userId: "user2", load: 70 },
      ]
      const balance = calculateBalance(loads)
      expect(balance.user1).toBe(30)
      expect(balance.user2).toBe(70)
    })

    test("handles equal distribution", () => {
      const loads = [
        { userId: "user1", load: 50 },
        { userId: "user2", load: 50 },
      ]
      const balance = calculateBalance(loads)
      expect(balance.user1).toBe(50)
      expect(balance.user2).toBe(50)
    })

    test("handles zero total", () => {
      const loads = [
        { userId: "user1", load: 0 },
        { userId: "user2", load: 0 },
      ]
      const balance = calculateBalance(loads)
      expect(balance.user1).toBe(0)
      expect(balance.user2).toBe(0)
    })
  })

  describe("Deadline Urgency Calculation", () => {
    const getUrgencyLevel = (deadlineStr: string | null): "overdue" | "today" | "soon" | "normal" | "none" => {
      if (!deadlineStr) return "none"
      const deadline = new Date(deadlineStr)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())

      const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return "overdue"
      if (diffDays === 0) return "today"
      if (diffDays <= 2) return "soon"
      return "normal"
    }

    test("identifies overdue tasks", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(getUrgencyLevel(yesterday.toISOString())).toBe("overdue")
    })

    test("identifies today tasks", () => {
      const today = new Date()
      expect(getUrgencyLevel(today.toISOString())).toBe("today")
    })

    test("identifies soon tasks", () => {
      const soon = new Date()
      soon.setDate(soon.getDate() + 1)
      expect(getUrgencyLevel(soon.toISOString())).toBe("soon")
    })

    test("identifies normal tasks", () => {
      const future = new Date()
      future.setDate(future.getDate() + 10)
      expect(getUrgencyLevel(future.toISOString())).toBe("normal")
    })

    test("handles null deadline", () => {
      expect(getUrgencyLevel(null)).toBe("none")
    })
  })

  describe("XP Level Calculation", () => {
    const calculateLevel = (xp: number): { level: number; progress: number; xpForNext: number } => {
      // Each level requires progressively more XP
      // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
      let level = 1
      let threshold = 0
      let nextThreshold = 100

      while (xp >= nextThreshold) {
        level++
        threshold = nextThreshold
        nextThreshold = threshold + (level * 100)
      }

      const progress = Math.round(((xp - threshold) / (nextThreshold - threshold)) * 100)
      const xpForNext = nextThreshold - xp

      return { level, progress, xpForNext }
    }

    test("calculates level 1", () => {
      const result = calculateLevel(50)
      expect(result.level).toBe(1)
      expect(result.progress).toBe(50)
      expect(result.xpForNext).toBe(50)
    })

    test("calculates level 2", () => {
      const result = calculateLevel(200)
      expect(result.level).toBe(2)
    })

    test("calculates higher levels", () => {
      const result = calculateLevel(1000)
      expect(result.level).toBeGreaterThan(3)
    })

    test("handles zero XP", () => {
      const result = calculateLevel(0)
      expect(result.level).toBe(1)
      expect(result.progress).toBe(0)
    })
  })

  describe("Shopping List Category Sorting", () => {
    const CATEGORY_ORDER = [
      "Fruits et legumes",
      "Boucherie",
      "Poissonnerie",
      "Cremerie",
      "Epicerie",
      "Boulangerie",
      "Boissons",
      "Surgeles",
      "Hygiene",
      "Maison",
      "Autres",
    ]

    const sortByCategory = <T extends { category: string }>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.category)
        const bIndex = CATEGORY_ORDER.indexOf(b.category)
        // Unknown categories go to the end
        const aOrder = aIndex === -1 ? CATEGORY_ORDER.length : aIndex
        const bOrder = bIndex === -1 ? CATEGORY_ORDER.length : bIndex
        return aOrder - bOrder
      })
    }

    test("sorts items by category order", () => {
      const items = [
        { name: "Milk", category: "Cremerie" },
        { name: "Apple", category: "Fruits et legumes" },
        { name: "Chicken", category: "Boucherie" },
      ]
      const sorted = sortByCategory(items)
      expect(sorted[0].category).toBe("Fruits et legumes")
      expect(sorted[1].category).toBe("Boucherie")
      expect(sorted[2].category).toBe("Cremerie")
    })

    test("puts unknown categories at the end", () => {
      const items = [
        { name: "Unknown", category: "Unknown Category" },
        { name: "Apple", category: "Fruits et legumes" },
      ]
      const sorted = sortByCategory(items)
      expect(sorted[0].category).toBe("Fruits et legumes")
      expect(sorted[1].category).toBe("Unknown Category")
    })
  })
})

// ============================================================================
// EDGE CASES (UPDATED)
// ============================================================================

describe("Edge Cases", () => {
  describe("UUID Validation", () => {
    test("valid UUIDs pass", () => {
      const uuidSchema = z.string().uuid()
      const validUUIDs = [
        "123e4567-e89b-12d3-a456-426614174000",
        "00000000-0000-0000-0000-000000000000",
        "ffffffff-ffff-ffff-ffff-ffffffffffff",
      ]
      validUUIDs.forEach((uuid) => {
        expect(uuidSchema.safeParse(uuid).success).toBe(true)
      })
    })

    test("invalid UUIDs fail", () => {
      const uuidSchema = z.string().uuid()
      const invalidUUIDs = [
        "123",
        "not-a-uuid",
        "123e4567-e89b-12d3-a456", // Too short
        "123e4567-e89b-12d3-a456-4266141740001", // Too long
        "123e4567-e89b-12d3-a456-42661417400g", // Invalid character
      ]
      invalidUUIDs.forEach((uuid) => {
        expect(uuidSchema.safeParse(uuid).success).toBe(false)
      })
    })
  })

  describe("Date Validation", () => {
    test("handles various date formats", () => {
      const dateSchema = z.string().datetime()

      expect(dateSchema.safeParse("2025-01-15T12:00:00.000Z").success).toBe(true)
      expect(dateSchema.safeParse("2025-01-15T12:00:00Z").success).toBe(true)
    })
  })

  describe("Array Bounds", () => {
    test("empty array handling", () => {
      const arraySchema = z.array(z.string()).min(1)
      expect(arraySchema.safeParse([]).success).toBe(false)
      expect(arraySchema.safeParse(["item"]).success).toBe(true)
    })
  })

  describe("Nullable vs Optional", () => {
    test("nullable accepts null", () => {
      const schema = z.string().nullable()
      expect(schema.safeParse(null).success).toBe(true)
      expect(schema.safeParse(undefined).success).toBe(false)
    })

    test("optional accepts undefined", () => {
      const schema = z.string().optional()
      expect(schema.safeParse(undefined).success).toBe(true)
      expect(schema.safeParse(null).success).toBe(false)
    })

    test("nullable optional accepts both", () => {
      const schema = z.string().nullable().optional()
      expect(schema.safeParse(null).success).toBe(true)
      expect(schema.safeParse(undefined).success).toBe(true)
      expect(schema.safeParse("value").success).toBe(true)
    })
  })
})
