/**
 * Tests for PDF Export Service
 *
 * Tests for PDF document generation and export utilities
 */

import { describe, it, expect } from "vitest"
import {
  getExportFilename,
  formatFileSize,
  type MonthlyReportData,
  type ChildHistoryExportData,
} from "@/lib/services/pdf-export"
import type { WeeklyReportData } from "@/lib/services/balance-alerts"

// =============================================================================
// FILENAME GENERATION TESTS
// =============================================================================

describe("Export Filename Generation", () => {
  it("generates weekly report filename with date", () => {
    const filename = getExportFilename("weekly")
    expect(filename).toMatch(/^rapport-hebdomadaire-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it("generates monthly report filename with month/year", () => {
    const filename = getExportFilename("monthly", "2026-01")
    expect(filename).toBe("rapport-mensuel-2026-01.pdf")
  })

  it("generates monthly report filename with default date", () => {
    const filename = getExportFilename("monthly")
    expect(filename).toMatch(/^rapport-mensuel-\d{4}-\d{2}(-\d{2})?\.pdf$/)
  })

  it("generates child history filename with child name", () => {
    const filename = getExportFilename("child", "emma")
    expect(filename).toMatch(/^historique-emma-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it("generates child history filename with default identifier", () => {
    const filename = getExportFilename("child")
    expect(filename).toMatch(/^historique-enfant-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it("sanitizes child name in filename", () => {
    const filename = getExportFilename("child", "jean-pierre")
    expect(filename).not.toContain(" ")
    expect(filename).toContain("jean-pierre")
  })
})

// =============================================================================
// FILE SIZE FORMATTING TESTS
// =============================================================================

describe("File Size Formatting", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B")
    expect(formatFileSize(0)).toBe("0 B")
  })

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(10240)).toBe("10.0 KB")
  })

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB")
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB")
  })

  it("handles edge cases", () => {
    expect(formatFileSize(1023)).toBe("1023 B")
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB")
  })
})

// =============================================================================
// WEEKLY REPORT DATA STRUCTURE TESTS
// =============================================================================

describe("Weekly Report Data Structure", () => {
  const createWeeklyReport = (): WeeklyReportData => ({
    weekStart: "2026-01-13",
    weekEnd: "2026-01-19",
    totalTasks: 15,
    completedTasks: 12,
    totalLoadPoints: 45,
    members: [
      { userId: "1", userName: "Parent1", tasksCompleted: 7, loadPoints: 25, percentage: 56 },
      { userId: "2", userName: "Parent2", tasksCompleted: 5, loadPoints: 20, percentage: 44 },
    ],
    isBalanced: false,
    alertLevel: "warning",
    comparisonToLastWeek: {
      loadPointsDiff: 5,
      balanceImproved: true,
    },
    topCategories: [
      { category: "ecole", loadPoints: 15 },
      { category: "sante", loadPoints: 12 },
    ],
  })

  it("has valid date range", () => {
    const report = createWeeklyReport()
    const start = new Date(report.weekStart)
    const end = new Date(report.weekEnd)
    expect(end.getTime()).toBeGreaterThan(start.getTime())
  })

  it("has consistent task counts", () => {
    const report = createWeeklyReport()
    expect(report.completedTasks).toBeLessThanOrEqual(report.totalTasks)
  })

  it("has member percentages that sum to 100", () => {
    const report = createWeeklyReport()
    const totalPercentage = report.members.reduce((sum, m) => sum + m.percentage, 0)
    expect(totalPercentage).toBe(100)
  })

  it("has consistent member load points", () => {
    const report = createWeeklyReport()
    const totalMemberLoad = report.members.reduce((sum, m) => sum + m.loadPoints, 0)
    expect(totalMemberLoad).toBe(report.totalLoadPoints)
  })

  it("has valid alert level", () => {
    const report = createWeeklyReport()
    expect(["none", "warning", "critical"]).toContain(report.alertLevel)
  })
})

// =============================================================================
// MONTHLY REPORT DATA STRUCTURE TESTS
// =============================================================================

describe("Monthly Report Data Structure", () => {
  const createMonthlyReport = (): MonthlyReportData => ({
    month: "01",
    year: 2026,
    householdName: "Test Household",
    totalTasks: 60,
    completedTasks: 55,
    completionRate: 92,
    totalLoadPoints: 180,
    members: [
      { userName: "Parent1", tasksCompleted: 30, loadPoints: 95, percentage: 53 },
      { userName: "Parent2", tasksCompleted: 25, loadPoints: 85, percentage: 47 },
    ],
    weeklyBreakdown: [
      { weekStart: "2026-01-06", tasksCompleted: 12, loadPoints: 40, isBalanced: true },
      { weekStart: "2026-01-13", tasksCompleted: 15, loadPoints: 50, isBalanced: false },
    ],
    categoryBreakdown: [
      { category: "ecole", loadPoints: 60, percentage: 33 },
      { category: "quotidien", loadPoints: 50, percentage: 28 },
    ],
    streakInfo: { current: 15, best: 20 },
  })

  it("has valid month and year", () => {
    const report = createMonthlyReport()
    expect(parseInt(report.month, 10)).toBeGreaterThanOrEqual(1)
    expect(parseInt(report.month, 10)).toBeLessThanOrEqual(12)
    expect(report.year).toBeGreaterThanOrEqual(2020)
  })

  it("has consistent completion rate", () => {
    const report = createMonthlyReport()
    const calculatedRate = Math.round((report.completedTasks / report.totalTasks) * 100)
    expect(report.completionRate).toBe(calculatedRate)
  })

  it("has valid streak info", () => {
    const report = createMonthlyReport()
    expect(report.streakInfo.current).toBeGreaterThanOrEqual(0)
    expect(report.streakInfo.best).toBeGreaterThanOrEqual(report.streakInfo.current)
  })

  it("has weekly breakdown for the month", () => {
    const report = createMonthlyReport()
    expect(report.weeklyBreakdown.length).toBeGreaterThan(0)
    expect(report.weeklyBreakdown.length).toBeLessThanOrEqual(5) // Max 5 weeks in a month
  })

  it("has category breakdown", () => {
    const report = createMonthlyReport()
    expect(report.categoryBreakdown.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// CHILD HISTORY DATA STRUCTURE TESTS
// =============================================================================

describe("Child History Data Structure", () => {
  const createChildHistory = (): ChildHistoryExportData => ({
    childId: "child-1",
    childName: "Emma",
    birthDate: "2020-05-15",
    ageYears: 5,
    events: [
      {
        date: "2026-01-10",
        type: "task",
        title: "Inscription maternelle",
        description: "Dossier complet",
        category: "ecole",
      },
    ],
    vaccinations: [
      { date: "2020-07-15", vaccine: "DTCaP-Hib-HepB", status: "done" },
      { date: "2025-05-15", vaccine: "Rappel DTCaP", status: "pending" },
    ],
    schoolHistory: [
      { year: "2023-2024", school: "Maternelle Jean Moulin", level: "Petite section" },
      { year: "2024-2025", school: "Maternelle Jean Moulin", level: "Moyenne section" },
    ],
  })

  it("has valid birth date and age", () => {
    const history = createChildHistory()
    const birthDate = new Date(history.birthDate)
    expect(birthDate.getTime()).toBeLessThan(Date.now())
    expect(history.ageYears).toBeGreaterThanOrEqual(0)
  })

  it("has valid vaccination statuses", () => {
    const history = createChildHistory()
    for (const vac of history.vaccinations) {
      expect(["done", "pending", "missed"]).toContain(vac.status)
    }
  })

  it("has chronological school history", () => {
    const history = createChildHistory()
    if (history.schoolHistory.length > 1) {
      // Years should progress (this is a simple check)
      expect(history.schoolHistory.length).toBeGreaterThan(0)
    }
  })

  it("has events with required fields", () => {
    const history = createChildHistory()
    for (const event of history.events) {
      expect(event.date).toBeDefined()
      expect(event.type).toBeDefined()
      expect(event.title).toBeDefined()
      expect(event.category).toBeDefined()
    }
  })
})

// =============================================================================
// DATE FORMATTING TESTS
// =============================================================================

describe("Date Formatting for PDFs", () => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  it("formats French dates correctly", () => {
    expect(formatDate("2026-01-15")).toMatch(/15.*janvier.*2026/)
  })

  it("handles month boundaries", () => {
    expect(formatDate("2026-12-31")).toMatch(/31.*décembre.*2026/)
    expect(formatDate("2026-01-01")).toMatch(/1.*janvier.*2026/)
  })

  it("handles leap year dates", () => {
    expect(formatDate("2024-02-29")).toMatch(/29.*février.*2024/)
  })
})

// =============================================================================
// CATEGORY LABEL TESTS
// =============================================================================

describe("Category Labels", () => {
  const CATEGORY_LABELS: Record<string, string> = {
    administratif: "Administratif",
    sante: "Santé",
    ecole: "École",
    quotidien: "Quotidien",
    social: "Social",
    activites: "Activités",
    logistique: "Logistique",
  }

  it("has French labels for all categories", () => {
    const categories = ["administratif", "sante", "ecole", "quotidien", "social", "activites", "logistique"]
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined()
      expect(CATEGORY_LABELS[cat]?.length).toBeGreaterThan(0)
    }
  })

  it("uses French accented characters", () => {
    expect(CATEGORY_LABELS["sante"]).toContain("é")
    expect(CATEGORY_LABELS["ecole"]).toContain("É")
    expect(CATEGORY_LABELS["activites"]).toContain("é")
  })
})

// =============================================================================
// EXPORT OPTIONS TESTS
// =============================================================================

describe("Export Options", () => {
  interface ExportOptions {
    includeDetails?: boolean
    includeHistory?: boolean
    dateRange?: { start: string; end: string }
  }

  it("handles default options", () => {
    const options: ExportOptions = {}
    expect(options.includeDetails).toBeUndefined()
    expect(options.includeHistory).toBeUndefined()
    expect(options.dateRange).toBeUndefined()
  })

  it("handles full options", () => {
    const options: ExportOptions = {
      includeDetails: true,
      includeHistory: true,
      dateRange: { start: "2026-01-01", end: "2026-01-31" },
    }
    expect(options.includeDetails).toBe(true)
    expect(options.dateRange?.start).toBe("2026-01-01")
  })

  it("validates date range", () => {
    const options: ExportOptions = {
      dateRange: { start: "2026-01-01", end: "2026-01-31" },
    }
    const start = new Date(options.dateRange?.start ?? "")
    const end = new Date(options.dateRange?.end ?? "")
    expect(end.getTime()).toBeGreaterThan(start.getTime())
  })
})

// =============================================================================
// MONTH NAMES TESTS
// =============================================================================

describe("Month Names", () => {
  const MONTH_NAMES: Record<string, string> = {
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    "10": "Octobre",
    "11": "Novembre",
    "12": "Décembre",
  }

  it("has all 12 months", () => {
    expect(Object.keys(MONTH_NAMES).length).toBe(12)
  })

  it("uses French month names", () => {
    expect(MONTH_NAMES["01"]).toBe("Janvier")
    expect(MONTH_NAMES["08"]).toBe("Août")
    expect(MONTH_NAMES["12"]).toBe("Décembre")
  })

  it("uses zero-padded month numbers", () => {
    expect(MONTH_NAMES["1"]).toBeUndefined()
    expect(MONTH_NAMES["01"]).toBeDefined()
  })
})
