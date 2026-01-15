/**
 * Week View Tests
 *
 * Unit tests for the week view helper functions and utilities.
 */

import { describe, it, expect } from "vitest"

// Helper functions to test (extracted from WeekView.tsx)
function getWeekDates(startDateStr: string): Date[] {
  const dates: Date[] = []
  const startDate = new Date(startDateStr)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

interface TaskListItem {
  id: string
  title: string
  deadline: string | null
  status: string
  priority: string
  is_critical: boolean
}

function groupTasksByDate(tasks: TaskListItem[]): Map<string, TaskListItem[]> {
  const grouped = new Map<string, TaskListItem[]>()

  for (const task of tasks) {
    if (!task.deadline) continue
    const dateKey = task.deadline.split("T")[0] ?? ""
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)?.push(task)
  }

  return grouped
}

// Helper to get Monday of a week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

describe("Week View Helpers", () => {
  describe("getWeekDates", () => {
    it("should return 7 dates starting from the given date", () => {
      const dates = getWeekDates("2024-01-15") // Monday
      expect(dates).toHaveLength(7)
    })

    it("should return consecutive dates", () => {
      const dates = getWeekDates("2024-01-15")
      for (let i = 1; i < dates.length; i++) {
        const prevDate = dates[i - 1]
        const currentDate = dates[i]
        if (prevDate && currentDate) {
          const diff = currentDate.getDate() - prevDate.getDate()
          // Handle month boundary
          expect(diff === 1 || diff < -20).toBe(true)
        }
      }
    })

    it("should start from the provided date", () => {
      const dates = getWeekDates("2024-01-15")
      expect(dates[0]?.getDate()).toBe(15)
      expect(dates[0]?.getMonth()).toBe(0) // January
      expect(dates[0]?.getFullYear()).toBe(2024)
    })

    it("should handle month boundary", () => {
      const dates = getWeekDates("2024-01-29") // Starts Jan 29
      expect(dates[0]?.getMonth()).toBe(0) // January
      expect(dates[3]?.getMonth()).toBe(1) // February (Feb 1)
    })

    it("should handle year boundary", () => {
      const dates = getWeekDates("2023-12-28")
      expect(dates[0]?.getFullYear()).toBe(2023)
      expect(dates[4]?.getFullYear()).toBe(2024) // Jan 1, 2024
    })
  })

  describe("groupTasksByDate", () => {
    it("should return empty map for empty array", () => {
      const grouped = groupTasksByDate([])
      expect(grouped.size).toBe(0)
    })

    it("should group tasks by date", () => {
      const tasks: TaskListItem[] = [
        { id: "1", title: "Task 1", deadline: "2024-01-15T10:00:00", status: "pending", priority: "normal", is_critical: false },
        { id: "2", title: "Task 2", deadline: "2024-01-15T14:00:00", status: "pending", priority: "high", is_critical: false },
        { id: "3", title: "Task 3", deadline: "2024-01-16T09:00:00", status: "pending", priority: "low", is_critical: true },
      ]

      const grouped = groupTasksByDate(tasks)
      expect(grouped.size).toBe(2)
      expect(grouped.get("2024-01-15")?.length).toBe(2)
      expect(grouped.get("2024-01-16")?.length).toBe(1)
    })

    it("should skip tasks without deadline", () => {
      const tasks: TaskListItem[] = [
        { id: "1", title: "Task 1", deadline: "2024-01-15T10:00:00", status: "pending", priority: "normal", is_critical: false },
        { id: "2", title: "Task 2", deadline: null, status: "pending", priority: "high", is_critical: false },
      ]

      const grouped = groupTasksByDate(tasks)
      expect(grouped.size).toBe(1)
      expect(grouped.get("2024-01-15")?.length).toBe(1)
    })

    it("should handle date-only format", () => {
      const tasks: TaskListItem[] = [
        { id: "1", title: "Task 1", deadline: "2024-01-15", status: "pending", priority: "normal", is_critical: false },
      ]

      const grouped = groupTasksByDate(tasks)
      expect(grouped.get("2024-01-15")?.length).toBe(1)
    })
  })

  describe("getMondayOfWeek", () => {
    it("should return Monday for a Monday", () => {
      const monday = getMondayOfWeek(new Date("2024-01-15")) // Monday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getDate()).toBe(15)
    })

    it("should return Monday for a Wednesday", () => {
      const monday = getMondayOfWeek(new Date("2024-01-17")) // Wednesday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getDate()).toBe(15)
    })

    it("should return Monday for a Sunday", () => {
      const monday = getMondayOfWeek(new Date("2024-01-21")) // Sunday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getDate()).toBe(15) // Previous Monday
    })

    it("should return Monday for a Saturday", () => {
      const monday = getMondayOfWeek(new Date("2024-01-20")) // Saturday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getDate()).toBe(15)
    })

    it("should handle month boundary", () => {
      const monday = getMondayOfWeek(new Date("2024-02-01")) // Thursday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getDate()).toBe(29) // Jan 29
      expect(monday.getMonth()).toBe(0) // January
    })
  })
})

describe("Week View Date Formatting", () => {
  it("should format week label correctly", () => {
    const weekStart = new Date("2024-01-15")
    const weekEnd = new Date("2024-01-21")

    const label = `${weekStart.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} - ${weekEnd.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`

    expect(label).toContain("15")
    expect(label).toContain("21")
    expect(label).toContain("2024")
  })

  it("should format across month boundary", () => {
    const weekStart = new Date("2024-01-29")
    const weekEnd = new Date("2024-02-04")

    const startMonth = weekStart.toLocaleDateString("fr-FR", { month: "short" })
    const endMonth = weekEnd.toLocaleDateString("fr-FR", { month: "short" })

    // Different months
    expect(startMonth).not.toBe(endMonth)
  })
})

describe("Week Navigation", () => {
  it("should calculate previous week correctly", () => {
    const currentStart = new Date("2024-01-15")
    const prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 7)

    expect(prevStart.getDate()).toBe(8)
    expect(prevStart.getMonth()).toBe(0) // January
  })

  it("should calculate next week correctly", () => {
    const currentStart = new Date("2024-01-15")
    const nextStart = new Date(currentStart)
    nextStart.setDate(nextStart.getDate() + 7)

    expect(nextStart.getDate()).toBe(22)
    expect(nextStart.getMonth()).toBe(0) // January
  })

  it("should handle year change for previous week", () => {
    const currentStart = new Date("2024-01-01")
    const prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 7)

    expect(prevStart.getFullYear()).toBe(2023)
    expect(prevStart.getMonth()).toBe(11) // December
  })

  it("should handle year change for next week", () => {
    const currentStart = new Date("2023-12-25")
    const nextStart = new Date(currentStart)
    nextStart.setDate(nextStart.getDate() + 7)

    expect(nextStart.getFullYear()).toBe(2024)
    expect(nextStart.getMonth()).toBe(0) // January
  })
})

describe("Task Filtering for Week", () => {
  const sampleTasks: TaskListItem[] = [
    { id: "1", title: "Task 1", deadline: "2024-01-15T10:00:00", status: "pending", priority: "critical", is_critical: true },
    { id: "2", title: "Task 2", deadline: "2024-01-16T14:00:00", status: "done", priority: "normal", is_critical: false },
    { id: "3", title: "Task 3", deadline: "2024-01-17T09:00:00", status: "postponed", priority: "low", is_critical: false },
    { id: "4", title: "Task 4", deadline: "2024-01-22T12:00:00", status: "pending", priority: "high", is_critical: false },
  ]

  it("should filter tasks within week range", () => {
    const weekStart = new Date("2024-01-15")
    const weekEnd = new Date("2024-01-21")

    const weekTasks = sampleTasks.filter((task) => {
      if (!task.deadline) return false
      const taskDate = new Date(task.deadline)
      return taskDate >= weekStart && taskDate <= weekEnd
    })

    expect(weekTasks.length).toBe(3) // Tasks 1, 2, 3
    expect(weekTasks.find((t) => t.id === "4")).toBeUndefined()
  })

  it("should count pending tasks correctly", () => {
    const grouped = groupTasksByDate(sampleTasks.filter((t) => t.status === "pending"))
    expect(grouped.size).toBe(2)
  })

  it("should identify critical tasks", () => {
    const criticalTasks = sampleTasks.filter((t) => t.is_critical)
    expect(criticalTasks.length).toBe(1)
    expect(criticalTasks[0]?.id).toBe("1")
  })
})

/**
 * Integration test scenarios for manual testing:
 *
 * 1. Week navigation:
 *    - Click previous/next arrows
 *    - Click "Today" button
 *    - Verify URL changes with correct date
 *
 * 2. Task display:
 *    - Verify tasks appear in correct day columns
 *    - Verify task count badges show correct numbers
 *    - Verify critical tasks are highlighted
 *
 * 3. Drag and drop:
 *    - Drag task from one day to another
 *    - Verify task moves to new day
 *    - Verify original day count decreases
 *    - Verify new day count increases
 *
 * 4. Mobile scroll:
 *    - Verify horizontal scroll works on mobile
 *    - Verify touch scrolling is smooth
 *
 * 5. Today indicator:
 *    - Verify current day is highlighted
 *    - Verify highlight updates when navigating
 */
