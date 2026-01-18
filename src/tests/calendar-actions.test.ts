/**
 * Calendar Actions Tests
 *
 * Tests for:
 * - Calendar event CRUD operations
 * - Validation schemas
 * - Date filtering
 * - Event duplication
 * - Access control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  CalendarEventCreateSchema,
  CalendarEventUpdateSchema,
  CalendarEventFilterSchema,
  EventTypeEnum,
  RecurrenceEnum,
  getEventColor,
  EVENT_COLORS,
  EVENT_TYPE_LABELS,
  RECURRENCE_LABELS,
} from "@/lib/validations/calendar"

// ============================================================
// MOCK SETUP using vi.hoisted for proper initialization
// ============================================================

const { mockGetUserId, mockQuery, mockQueryOne, mockInsert, mockSetCurrentUser, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUserId: vi.fn(),
  mockQuery: vi.fn(),
  mockQueryOne: vi.fn(),
  mockInsert: vi.fn(),
  mockSetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

// Mock the auth module
vi.mock("@/lib/auth/actions", () => ({
  getUserId: mockGetUserId,
}))

// Mock the database module
vi.mock("@/lib/aws/database", () => ({
  query: mockQuery,
  queryOne: mockQueryOne,
  insert: mockInsert,
  setCurrentUser: mockSetCurrentUser,
}))

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

// ============================================================
// VALIDATION SCHEMA TESTS
// ============================================================

describe("Calendar Validation Schemas", () => {
  describe("CalendarEventCreateSchema", () => {
    it("should validate valid event data", () => {
      const validEvent = {
        title: "Reunion parents",
        start_date: "2026-01-20T10:00:00.000Z",
        event_type: "school",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should require title", () => {
      const invalidEvent = {
        start_date: "2026-01-20T10:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("title")
      }
    })

    it("should reject empty title", () => {
      const invalidEvent = {
        title: "",
        start_date: "2026-01-20T10:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should reject title exceeding 255 characters", () => {
      const invalidEvent = {
        title: "A".repeat(256),
        start_date: "2026-01-20T10:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should require valid start_date format", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "invalid-date",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should accept valid end_date", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        end_date: "2026-01-20T12:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should accept null end_date", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        end_date: null,
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should default all_day to false", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.all_day).toBe(false)
      }
    })

    it("should accept all_day true", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        all_day: true,
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.all_day).toBe(true)
      }
    })

    it("should validate recurrence enum values", () => {
      const recurrences = ["none", "daily", "weekly", "monthly", "yearly"]

      for (const recurrence of recurrences) {
        const event = {
          title: "Test Event",
          start_date: "2026-01-20T10:00:00.000Z",
          recurrence,
        }
        const result = CalendarEventCreateSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid recurrence value", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        recurrence: "biweekly",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate recurrence_end_date format (YYYY-MM-DD)", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        recurrence: "weekly",
        recurrence_end_date: "2026-12-31",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should reject invalid recurrence_end_date format", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        recurrence: "weekly",
        recurrence_end_date: "31/12/2026",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate color hex format", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "#FF5733",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should reject invalid color format", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "red",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate event_type enum values", () => {
      const eventTypes = ["general", "medical", "school", "activity", "birthday", "reminder"]

      for (const eventType of eventTypes) {
        const event = {
          title: "Test Event",
          start_date: "2026-01-20T10:00:00.000Z",
          event_type: eventType,
        }
        const result = CalendarEventCreateSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid event_type", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        event_type: "meeting",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate assigned_to UUID format", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        assigned_to: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should reject invalid assigned_to UUID", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        assigned_to: "not-a-uuid",
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate child_id UUID format", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        child_id: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should accept null child_id", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        child_id: null,
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should validate location max length", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        location: "123 Main Street, Paris",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should reject location exceeding 500 characters", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        location: "A".repeat(501),
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate reminder_minutes range", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        reminder_minutes: 60,
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should default reminder_minutes to 30", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reminder_minutes).toBe(30)
      }
    })

    it("should reject negative reminder_minutes", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        reminder_minutes: -10,
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should reject reminder_minutes exceeding 10080 (7 days)", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        reminder_minutes: 10081,
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it("should validate description max length", () => {
      const validEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        description: "This is a description",
      }

      const result = CalendarEventCreateSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
    })

    it("should reject description exceeding 1000 characters", () => {
      const invalidEvent = {
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        description: "A".repeat(1001),
      }

      const result = CalendarEventCreateSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })
  })

  describe("CalendarEventUpdateSchema", () => {
    it("should require id field", () => {
      const updateData = {
        title: "Updated Title",
      }

      const result = CalendarEventUpdateSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })

    it("should validate id as UUID", () => {
      const validUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated Title",
      }

      const result = CalendarEventUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it("should reject invalid id UUID", () => {
      const invalidUpdate = {
        id: "not-a-uuid",
        title: "Updated Title",
      }

      const result = CalendarEventUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })

    it("should allow partial updates", () => {
      const partialUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "New Title",
      }

      const result = CalendarEventUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("should validate updated fields", () => {
      const invalidUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        event_type: "invalid_type",
      }

      const result = CalendarEventUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })
  })

  describe("CalendarEventFilterSchema", () => {
    it("should validate date range filter", () => {
      const validFilter = {
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
      }

      const result = CalendarEventFilterSchema.safeParse(validFilter)
      expect(result.success).toBe(true)
    })

    it("should require start_date", () => {
      const invalidFilter = {
        end_date: "2026-01-31T23:59:59.000Z",
      }

      const result = CalendarEventFilterSchema.safeParse(invalidFilter)
      expect(result.success).toBe(false)
    })

    it("should require end_date", () => {
      const invalidFilter = {
        start_date: "2026-01-01T00:00:00.000Z",
      }

      const result = CalendarEventFilterSchema.safeParse(invalidFilter)
      expect(result.success).toBe(false)
    })

    it("should accept optional event_type filter", () => {
      const validFilter = {
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
        event_type: "medical",
      }

      const result = CalendarEventFilterSchema.safeParse(validFilter)
      expect(result.success).toBe(true)
    })

    it("should accept optional assigned_to filter", () => {
      const validFilter = {
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
        assigned_to: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = CalendarEventFilterSchema.safeParse(validFilter)
      expect(result.success).toBe(true)
    })

    it("should accept optional child_id filter", () => {
      const validFilter = {
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
        child_id: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = CalendarEventFilterSchema.safeParse(validFilter)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================
// ENUM TESTS
// ============================================================

describe("Calendar Enums", () => {
  describe("EventTypeEnum", () => {
    it("should include all event types", () => {
      const eventTypes = EventTypeEnum.options
      expect(eventTypes).toContain("general")
      expect(eventTypes).toContain("medical")
      expect(eventTypes).toContain("school")
      expect(eventTypes).toContain("activity")
      expect(eventTypes).toContain("birthday")
      expect(eventTypes).toContain("reminder")
    })

    it("should have exactly 6 event types", () => {
      expect(EventTypeEnum.options.length).toBe(6)
    })
  })

  describe("RecurrenceEnum", () => {
    it("should include all recurrence types", () => {
      const recurrences = RecurrenceEnum.options
      expect(recurrences).toContain("none")
      expect(recurrences).toContain("daily")
      expect(recurrences).toContain("weekly")
      expect(recurrences).toContain("monthly")
      expect(recurrences).toContain("yearly")
    })

    it("should have exactly 5 recurrence types", () => {
      expect(RecurrenceEnum.options.length).toBe(5)
    })
  })
})

// ============================================================
// COLOR TESTS
// ============================================================

describe("Event Colors", () => {
  describe("EVENT_COLORS", () => {
    it("should define primary color", () => {
      expect(EVENT_COLORS.primary).toBe("#6366f1")
    })

    it("should define medical color (red)", () => {
      expect(EVENT_COLORS.medical).toBe("#ef4444")
    })

    it("should define school color (blue)", () => {
      expect(EVENT_COLORS.school).toBe("#3b82f6")
    })

    it("should define activity color (green)", () => {
      expect(EVENT_COLORS.activity).toBe("#22c55e")
    })

    it("should define birthday color (amber)", () => {
      expect(EVENT_COLORS.birthday).toBe("#f59e0b")
    })

    it("should define reminder color (violet)", () => {
      expect(EVENT_COLORS.reminder).toBe("#8b5cf6")
    })
  })

  describe("getEventColor", () => {
    it("should return correct color for general", () => {
      expect(getEventColor("general")).toBe(EVENT_COLORS.primary)
    })

    it("should return correct color for medical", () => {
      expect(getEventColor("medical")).toBe(EVENT_COLORS.medical)
    })

    it("should return correct color for school", () => {
      expect(getEventColor("school")).toBe(EVENT_COLORS.school)
    })

    it("should return correct color for activity", () => {
      expect(getEventColor("activity")).toBe(EVENT_COLORS.activity)
    })

    it("should return correct color for birthday", () => {
      expect(getEventColor("birthday")).toBe(EVENT_COLORS.birthday)
    })

    it("should return correct color for reminder", () => {
      expect(getEventColor("reminder")).toBe(EVENT_COLORS.reminder)
    })

    it("should return primary color as default", () => {
      // Test with an unknown type (cast to bypass type checking)
      const unknownType = "unknown" as "general"
      expect(getEventColor(unknownType)).toBe(EVENT_COLORS.primary)
    })
  })
})

// ============================================================
// LABEL TESTS
// ============================================================

describe("Labels", () => {
  describe("EVENT_TYPE_LABELS", () => {
    it("should have French labels for all event types", () => {
      expect(EVENT_TYPE_LABELS.general).toBe("General")
      expect(EVENT_TYPE_LABELS.medical).toBe("Rendez-vous medical")
      expect(EVENT_TYPE_LABELS.school).toBe("Ecole")
      expect(EVENT_TYPE_LABELS.activity).toBe("Activite")
      expect(EVENT_TYPE_LABELS.birthday).toBe("Anniversaire")
      expect(EVENT_TYPE_LABELS.reminder).toBe("Rappel")
    })
  })

  describe("RECURRENCE_LABELS", () => {
    it("should have French labels for all recurrence types", () => {
      expect(RECURRENCE_LABELS.none).toBe("Aucune")
      expect(RECURRENCE_LABELS.daily).toBe("Tous les jours")
      expect(RECURRENCE_LABELS.weekly).toBe("Toutes les semaines")
      expect(RECURRENCE_LABELS.monthly).toBe("Tous les mois")
      expect(RECURRENCE_LABELS.yearly).toBe("Tous les ans")
    })
  })
})

// ============================================================
// SERVER ACTIONS TESTS (with mocks)
// ============================================================

describe("Calendar Server Actions", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000"
  const mockHouseholdId = "123e4567-e89b-12d3-a456-426614174001"
  const mockEventId = "123e4567-e89b-12d3-a456-426614174002"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("createCalendarEvent", () => {
    it("should return error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { createCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await createCalendarEvent({
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Utilisateur non connecte")
    })

    it("should return error when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { createCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await createCalendarEvent({
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Vous n'avez pas de foyer")
    })

    it("should return error for invalid data", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })

      const { createCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await createCalendarEvent({
        title: "", // Invalid: empty title
        start_date: "2026-01-20T10:00:00.000Z",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should create event successfully", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockInsert.mockResolvedValue({ id: mockEventId })

      const { createCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await createCalendarEvent({
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
        event_type: "general",
      })

      expect(result.success).toBe(true)
      expect(result.data?.eventId).toBe(mockEventId)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard")
    })

    it("should return error when insert fails", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockInsert.mockResolvedValue(null)

      const { createCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await createCalendarEvent({
        title: "Test Event",
        start_date: "2026-01-20T10:00:00.000Z",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Erreur lors de la creation de l'evenement")
    })
  })

  describe("updateCalendarEvent", () => {
    it("should return error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: mockEventId,
        title: "Updated Title",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Utilisateur non connecte")
    })

    it("should allow update with just id and defaults (partial update)", async () => {
      // Note: When only id is passed, Zod schema applies defaults for optional fields
      // This behavior is by design - the update proceeds with default values
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      // Since defaults are applied, query will be called
      mockQuery.mockResolvedValue([{ id: mockEventId }])

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: mockEventId,
      })

      // With defaults applied, the update should succeed
      expect(result.success).toBe(true)
    })

    it("should update event successfully", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([{ id: mockEventId }])

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: mockEventId,
        title: "Updated Title",
      })

      expect(result.success).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
    })

    it("should return error when event not found", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([])

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: mockEventId,
        title: "Updated Title",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Evenement introuvable ou non autorise")
    })
  })

  describe("deleteCalendarEvent", () => {
    it("should return error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { deleteCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await deleteCalendarEvent(mockEventId)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Utilisateur non connecte")
    })

    it("should delete event successfully", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([{ id: mockEventId }])

      const { deleteCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await deleteCalendarEvent(mockEventId)

      expect(result.success).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
    })

    it("should return error when event not found", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([])

      const { deleteCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await deleteCalendarEvent(mockEventId)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Evenement introuvable ou non autorise")
    })
  })

  describe("getCalendarEvents", () => {
    it("should return empty array when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvents({
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
      })

      expect(result).toEqual([])
    })

    it("should return events for valid filter", async () => {
      const mockEvents = [
        {
          id: mockEventId,
          household_id: mockHouseholdId,
          title: "Test Event",
          description: null,
          start_date: "2026-01-15T10:00:00.000Z",
          end_date: null,
          all_day: false,
          recurrence: "none",
          recurrence_end_date: null,
          color: "#6366f1",
          assigned_to: null,
          assigned_to_name: null,
          child_id: null,
          child_name: null,
          event_type: "general",
          location: null,
          reminder_minutes: 30,
          created_by: mockUserId,
          created_at: "2026-01-10T10:00:00.000Z",
          updated_at: "2026-01-10T10:00:00.000Z",
        },
      ]

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue(mockEvents)

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvents({
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
      })

      expect(result).toEqual(mockEvents)
    })

    it("should return empty array for invalid filter", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvents({
        start_date: "invalid",
        end_date: "invalid",
      })

      expect(result).toEqual([])
    })
  })

  describe("getCalendarEvent", () => {
    it("should return null when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvent(mockEventId)

      expect(result).toBeNull()
    })

    it("should return event when found", async () => {
      const mockEvent = {
        id: mockEventId,
        household_id: mockHouseholdId,
        title: "Test Event",
        description: null,
        start_date: "2026-01-15T10:00:00.000Z",
        end_date: null,
        all_day: false,
        recurrence: "none",
        recurrence_end_date: null,
        color: "#6366f1",
        assigned_to: null,
        assigned_to_name: null,
        child_id: null,
        child_name: null,
        event_type: "general",
        location: null,
        reminder_minutes: 30,
        created_by: mockUserId,
        created_at: "2026-01-10T10:00:00.000Z",
        updated_at: "2026-01-10T10:00:00.000Z",
      }

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne
        .mockResolvedValueOnce({ household_id: mockHouseholdId, role: "admin" })
        .mockResolvedValueOnce(mockEvent)

      const { getCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvent(mockEventId)

      expect(result).toEqual(mockEvent)
    })
  })

  describe("getTodayEvents", () => {
    it("should return empty array when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getTodayEvents } = await import("@/lib/actions/calendar")
      const result = await getTodayEvents()

      expect(result).toEqual([])
    })

    it("should return today events", async () => {
      const mockEvents = [
        {
          id: mockEventId,
          title: "Today Event",
          start_date: new Date().toISOString(),
        },
      ]

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue(mockEvents)

      const { getTodayEvents } = await import("@/lib/actions/calendar")
      const result = await getTodayEvents()

      expect(result).toEqual(mockEvents)
    })
  })

  describe("getUpcomingEvents", () => {
    it("should return empty array when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getUpcomingEvents } = await import("@/lib/actions/calendar")
      const result = await getUpcomingEvents()

      expect(result).toEqual([])
    })

    it("should return upcoming events with default limit", async () => {
      const mockEvents = [
        { id: "1", title: "Event 1" },
        { id: "2", title: "Event 2" },
      ]

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue(mockEvents)

      const { getUpcomingEvents } = await import("@/lib/actions/calendar")
      const result = await getUpcomingEvents()

      expect(result).toEqual(mockEvents)
    })

    it("should respect custom limit parameter", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([])

      const { getUpcomingEvents } = await import("@/lib/actions/calendar")
      await getUpcomingEvents(10)

      expect(mockQuery).toHaveBeenCalled()
      const callArgs = mockQuery.mock.calls[0]
      expect(callArgs?.[1]).toContain(10)
    })
  })

  describe("getEventsByChild", () => {
    const mockChildId = "123e4567-e89b-12d3-a456-426614174003"

    it("should return empty array when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getEventsByChild } = await import("@/lib/actions/calendar")
      const result = await getEventsByChild(mockChildId)

      expect(result).toEqual([])
    })

    it("should return events for specific child", async () => {
      const mockEvents = [
        {
          id: mockEventId,
          title: "Child Event",
          child_id: mockChildId,
          child_name: "Emma",
        },
      ]

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue(mockEvents)

      const { getEventsByChild } = await import("@/lib/actions/calendar")
      const result = await getEventsByChild(mockChildId)

      expect(result).toEqual(mockEvents)
    })
  })

  describe("getEventsCountByDate", () => {
    it("should return empty object when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { getEventsCountByDate } = await import("@/lib/actions/calendar")
      const result = await getEventsCountByDate("2026-01-01", "2026-01-31")

      expect(result).toEqual({})
    })

    it("should return event counts by date", async () => {
      const mockCounts = [
        { date: "2026-01-15", count: "3" },
        { date: "2026-01-20", count: "1" },
      ]

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue(mockCounts)

      const { getEventsCountByDate } = await import("@/lib/actions/calendar")
      const result = await getEventsCountByDate("2026-01-01", "2026-01-31")

      expect(result).toEqual({
        "2026-01-15": 3,
        "2026-01-20": 1,
      })
    })
  })

  describe("duplicateCalendarEvent", () => {
    const newStartDate = "2026-02-01T10:00:00.000Z"

    it("should return error when user is not authenticated", async () => {
      mockGetUserId.mockResolvedValue(null)

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent(mockEventId, newStartDate)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Utilisateur non connecte")
    })

    it("should return error when original event not found", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne
        .mockResolvedValueOnce({ household_id: mockHouseholdId, role: "admin" })
        .mockResolvedValueOnce(null)

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent(mockEventId, newStartDate)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Evenement original introuvable")
    })

    it("should duplicate event without end_date", async () => {
      const originalEvent = {
        id: mockEventId,
        household_id: mockHouseholdId,
        title: "Original Event",
        description: "Test description",
        start_date: "2026-01-15T10:00:00.000Z",
        end_date: null,
        all_day: false,
        recurrence: "weekly",
        color: "#6366f1",
        assigned_to: null,
        child_id: null,
        event_type: "general",
        location: "Paris",
        reminder_minutes: 30,
        created_by: mockUserId,
      }

      const newEventId = "new-event-id"

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne
        .mockResolvedValueOnce({ household_id: mockHouseholdId, role: "admin" })
        .mockResolvedValueOnce(originalEvent)
      mockInsert.mockResolvedValue({ id: newEventId })

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent(mockEventId, newStartDate)

      expect(result.success).toBe(true)
      expect(result.data?.eventId).toBe(newEventId)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/calendar")
    })

    it("should duplicate event with end_date and calculate new duration", async () => {
      const originalEvent = {
        id: mockEventId,
        household_id: mockHouseholdId,
        title: "Original Event",
        description: null,
        start_date: "2026-01-15T10:00:00.000Z",
        end_date: "2026-01-15T12:00:00.000Z", // 2 hour duration
        all_day: false,
        recurrence: "none",
        color: "#6366f1",
        assigned_to: null,
        child_id: null,
        event_type: "general",
        location: null,
        reminder_minutes: 30,
        created_by: mockUserId,
      }

      const newEventId = "new-event-id"

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne
        .mockResolvedValueOnce({ household_id: mockHouseholdId, role: "admin" })
        .mockResolvedValueOnce(originalEvent)
      mockInsert.mockResolvedValue({ id: newEventId })

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent(mockEventId, newStartDate)

      expect(result.success).toBe(true)

      // Verify insert was called with calculated end_date
      const insertCall = mockInsert.mock.calls[0]
      expect(insertCall).toBeDefined()
      const insertedData = insertCall?.[1] as Record<string, unknown>
      expect(insertedData?.start_date).toBe(newStartDate)
      expect(insertedData?.end_date).toBeDefined()
      // Recurrence should be reset to "none" for duplicated events
      expect(insertedData?.recurrence).toBe("none")
    })

    it("should return error when insert fails", async () => {
      const originalEvent = {
        id: mockEventId,
        title: "Original Event",
        start_date: "2026-01-15T10:00:00.000Z",
        end_date: null,
        all_day: false,
        recurrence: "none",
        color: "#6366f1",
        event_type: "general",
        reminder_minutes: 30,
      }

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne
        .mockResolvedValueOnce({ household_id: mockHouseholdId, role: "admin" })
        .mockResolvedValueOnce(originalEvent)
      mockInsert.mockResolvedValue(null)

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent(mockEventId, newStartDate)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Erreur lors de la duplication")
    })
  })
})

// ============================================================
// EDGE CASES TESTS
// ============================================================

describe("Calendar Edge Cases", () => {
  describe("Date Handling", () => {
    it("should accept ISO 8601 datetime format", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("should reject datetime with non-Z offset (strict ISO format)", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00+02:00",
      }
      // Zod datetime() requires Z suffix by default
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it("should reject date-only format for start_date", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })

  describe("Color Validation", () => {
    it("should accept lowercase hex colors", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "#aabbcc",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("should accept uppercase hex colors", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "#AABBCC",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("should accept mixed case hex colors", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "#AaBbCc",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("should reject 3-character hex colors", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "#ABC",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it("should reject hex colors without hash", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        color: "AABBCC",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })

  describe("Recurrence End Date", () => {
    it("should accept valid YYYY-MM-DD format", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        recurrence: "weekly",
        recurrence_end_date: "2026-12-31",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it("should reject datetime format for recurrence_end_date", () => {
      const event = {
        title: "Test",
        start_date: "2026-01-20T10:00:00.000Z",
        recurrence: "weekly",
        recurrence_end_date: "2026-12-31T00:00:00.000Z",
      }
      const result = CalendarEventCreateSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// ADDITIONAL SERVER ACTION EDGE CASES
// ============================================================

describe("Calendar Server Action Edge Cases", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000"
  const mockHouseholdId = "123e4567-e89b-12d3-a456-426614174001"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Error handling in getCalendarEvents", () => {
    it("should return empty array when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvents({
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
      })

      expect(result).toEqual([])
    })

    it("should filter by event_type when provided", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([])

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      await getCalendarEvents({
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
        event_type: "medical",
      })

      expect(mockQuery).toHaveBeenCalled()
      const queryCall = mockQuery.mock.calls[0]
      const queryParams = queryCall?.[1] as unknown[]
      expect(queryParams).toContain("medical")
    })

    it("should filter by child_id when provided", async () => {
      const childId = "123e4567-e89b-12d3-a456-426614174005"

      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })
      mockQuery.mockResolvedValue([])

      const { getCalendarEvents } = await import("@/lib/actions/calendar")
      await getCalendarEvents({
        start_date: "2026-01-01T00:00:00.000Z",
        end_date: "2026-01-31T23:59:59.000Z",
        child_id: childId,
      })

      expect(mockQuery).toHaveBeenCalled()
      const queryCall = mockQuery.mock.calls[0]
      const queryParams = queryCall?.[1] as unknown[]
      expect(queryParams).toContain(childId)
    })
  })

  describe("Error handling in getCalendarEvent", () => {
    it("should return null when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await getCalendarEvent("event-id")

      expect(result).toBeNull()
    })
  })

  describe("Error handling in getTodayEvents", () => {
    it("should return empty array when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getTodayEvents } = await import("@/lib/actions/calendar")
      const result = await getTodayEvents()

      expect(result).toEqual([])
    })
  })

  describe("Error handling in getUpcomingEvents", () => {
    it("should return empty array when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getUpcomingEvents } = await import("@/lib/actions/calendar")
      const result = await getUpcomingEvents()

      expect(result).toEqual([])
    })
  })

  describe("Error handling in getEventsByChild", () => {
    it("should return empty array when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getEventsByChild } = await import("@/lib/actions/calendar")
      const result = await getEventsByChild("child-id")

      expect(result).toEqual([])
    })
  })

  describe("Error handling in getEventsCountByDate", () => {
    it("should return empty object when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { getEventsCountByDate } = await import("@/lib/actions/calendar")
      const result = await getEventsCountByDate("2026-01-01", "2026-01-31")

      expect(result).toEqual({})
    })
  })

  describe("Error handling in duplicateCalendarEvent", () => {
    it("should return error when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { duplicateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await duplicateCalendarEvent("event-id", "2026-02-01T10:00:00.000Z")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Vous n'avez pas de foyer")
    })
  })

  describe("Error handling in updateCalendarEvent", () => {
    it("should return error when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated Title",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Vous n'avez pas de foyer")
    })

    it("should return error for invalid update data", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue({
        household_id: mockHouseholdId,
        role: "admin",
      })

      const { updateCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await updateCalendarEvent({
        id: "invalid-uuid",
        title: "Updated Title",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("Error handling in deleteCalendarEvent", () => {
    it("should return error when user has no household", async () => {
      mockGetUserId.mockResolvedValue(mockUserId)
      mockSetCurrentUser.mockResolvedValue(undefined)
      mockQueryOne.mockResolvedValue(null)

      const { deleteCalendarEvent } = await import("@/lib/actions/calendar")
      const result = await deleteCalendarEvent("event-id")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Vous n'avez pas de foyer")
    })
  })
})
