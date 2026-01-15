/**
 * Alerts Service Tests
 *
 * Unit tests for the alert detection and notification system.
 * Tests imbalance detection, overload alerts, and inactivity warnings.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import type { Alert } from "@/types/alert"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"

// Mock the database functions
vi.mock("@/lib/aws/database", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

// Mock the charge service
vi.mock("@/lib/services/charge", () => ({
  getLoadBalancePercentage: vi.fn(),
  getWeeklyLoadByParent: vi.fn(),
}))

// Mock the notifications service (to prevent firebase import issues)
vi.mock("@/lib/services/notifications", () => ({
  sendPushToHousehold: vi.fn(),
  sendPushToUser: vi.fn(),
}))

// Import mocked modules
import { query, queryOne } from "@/lib/aws/database"
import { getLoadBalancePercentage, getWeeklyLoadByParent } from "@/lib/services/charge"
import {
  checkImbalanceAlert,
  checkOverloadAlert,
  checkInactivityAlert,
  shouldShowAlert,
} from "@/lib/services/alerts"

const mockedQuery = query as Mock
const mockedQueryOne = queryOne as Mock
const mockedGetLoadBalancePercentage = getLoadBalancePercentage as Mock
const mockedGetWeeklyLoadByParent = getWeeklyLoadByParent as Mock

describe("Alerts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("checkImbalanceAlert", () => {
    it("should return null when load is balanced", async () => {
      mockedGetLoadBalancePercentage.mockResolvedValue({
        isBalanced: true,
        imbalanceRatio: "50/50",
        alertLevel: "none",
        percentages: [
          { userId: "user-1", email: "parent1@test.com", percentage: 50 },
          { userId: "user-2", email: "parent2@test.com", percentage: 50 },
        ],
      })

      const result = await checkImbalanceAlert("household-1")
      expect(result).toBeNull()
    })

    it("should return warning alert when imbalance exceeds warning threshold", async () => {
      mockedGetLoadBalancePercentage.mockResolvedValue({
        isBalanced: false,
        imbalanceRatio: "70/30",
        alertLevel: "warning",
        percentages: [
          { userId: "user-1", email: "parent1@test.com", percentage: 70 },
          { userId: "user-2", email: "parent2@test.com", percentage: 30 },
        ],
      })

      const result = await checkImbalanceAlert("household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("imbalance")
      expect(result?.severity).toBe("warning")
      expect(result?.householdId).toBe("household-1")
    })

    it("should return critical alert when imbalance exceeds critical threshold", async () => {
      mockedGetLoadBalancePercentage.mockResolvedValue({
        isBalanced: false,
        imbalanceRatio: "85/15",
        alertLevel: "critical",
        percentages: [
          { userId: "user-1", email: "parent1@test.com", percentage: 85 },
          { userId: "user-2", email: "parent2@test.com", percentage: 15 },
        ],
      })

      const result = await checkImbalanceAlert("household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("imbalance")
      expect(result?.severity).toBe("critical")
    })
  })

  describe("checkOverloadAlert", () => {
    it("should return null when member load is below threshold", async () => {
      mockedGetWeeklyLoadByParent.mockResolvedValue([
        { userId: "user-1", email: "parent1@test.com", totalLoad: 20, tasksCount: 5 },
        { userId: "user-2", email: "parent2@test.com", totalLoad: 20, tasksCount: 5 },
      ])

      const result = await checkOverloadAlert("user-1", "household-1")
      expect(result).toBeNull()
    })

    it("should return warning alert when member is overloaded", async () => {
      mockedGetWeeklyLoadByParent.mockResolvedValue([
        { userId: "user-1", email: "parent1@test.com", totalLoad: 35, tasksCount: 10 },
        { userId: "user-2", email: "parent2@test.com", totalLoad: 15, tasksCount: 4 },
      ])

      const result = await checkOverloadAlert("user-1", "household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("overload")
      expect(result?.severity).toBe("warning")
      expect(result?.memberId).toBe("user-1")
    })

    it("should return critical alert when member is severely overloaded", async () => {
      mockedGetWeeklyLoadByParent.mockResolvedValue([
        { userId: "user-1", email: "parent1@test.com", totalLoad: 50, tasksCount: 15 },
        { userId: "user-2", email: "parent2@test.com", totalLoad: 10, tasksCount: 3 },
      ])

      const result = await checkOverloadAlert("user-1", "household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("overload")
      expect(result?.severity).toBe("critical")
    })

    it("should return null when member not found", async () => {
      mockedGetWeeklyLoadByParent.mockResolvedValue([
        { userId: "user-2", email: "parent2@test.com", totalLoad: 20, tasksCount: 5 },
      ])

      const result = await checkOverloadAlert("user-1", "household-1")
      expect(result).toBeNull()
    })
  })

  describe("checkInactivityAlert", () => {
    it("should return null when member has recent activity", async () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 3) // 3 days ago

      mockedQueryOne
        .mockResolvedValueOnce({ email: "parent1@test.com" })
        .mockResolvedValueOnce({ last_date: recentDate.toISOString() })

      const result = await checkInactivityAlert("user-1", "household-1")
      expect(result).toBeNull()
    })

    it("should return warning alert for 7+ days of inactivity", async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10) // 10 days ago

      mockedQueryOne
        .mockResolvedValueOnce({ email: "parent1@test.com" })
        .mockResolvedValueOnce({ last_date: oldDate.toISOString() })

      const result = await checkInactivityAlert("user-1", "household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("inactivity")
      expect(result?.severity).toBe("warning")
    })

    it("should return critical alert for 14+ days of inactivity", async () => {
      const veryOldDate = new Date()
      veryOldDate.setDate(veryOldDate.getDate() - 20) // 20 days ago

      mockedQueryOne
        .mockResolvedValueOnce({ email: "parent1@test.com" })
        .mockResolvedValueOnce({ last_date: veryOldDate.toISOString() })

      const result = await checkInactivityAlert("user-1", "household-1")

      expect(result).not.toBeNull()
      expect(result?.type).toBe("inactivity")
      expect(result?.severity).toBe("critical")
    })

    it("should return null when member not found", async () => {
      mockedQueryOne.mockResolvedValueOnce(null)

      const result = await checkInactivityAlert("user-1", "household-1")
      expect(result).toBeNull()
    })
  })

  describe("shouldShowAlert", () => {
    const baseAlert: Alert = {
      id: "test-alert",
      type: "imbalance",
      severity: "warning",
      householdId: "household-1",
      title: "Test Alert",
      message: "Test message",
      suggestion: "Test suggestion",
      createdAt: new Date(),
    }

    it("should show alert that is not dismissed", () => {
      expect(shouldShowAlert(baseAlert, [])).toBe(true)
    })

    it("should not show dismissed alert", () => {
      expect(shouldShowAlert(baseAlert, ["test-alert"])).toBe(false)
    })

    it("should not show expired alert", () => {
      const expiredAlert: Alert = {
        ...baseAlert,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      }
      expect(shouldShowAlert(expiredAlert, [])).toBe(false)
    })

    it("should show alert with future expiry", () => {
      const futureAlert: Alert = {
        ...baseAlert,
        expiresAt: new Date(Date.now() + 86400000), // expires in 1 day
      }
      expect(shouldShowAlert(futureAlert, [])).toBe(true)
    })
  })

  describe("Alert Messages", () => {
    it("should generate non-judgmental imbalance message", async () => {
      mockedGetLoadBalancePercentage.mockResolvedValue({
        isBalanced: false,
        imbalanceRatio: "70/30",
        alertLevel: "warning",
        percentages: [
          { userId: "user-1", email: "marie@test.com", percentage: 70 },
          { userId: "user-2", email: "pierre@test.com", percentage: 30 },
        ],
      })

      const result = await checkImbalanceAlert("household-1")

      expect(result?.title).toBe("Répartition déséquilibrée")
      expect(result?.message).toContain("70/30")
      expect(result?.suggestion).toContain("pierre")
      // Verify non-judgmental language - no blame
      expect(result?.message).not.toMatch(/paresseux|ne fait rien|problème/)
    })

    it("should generate non-judgmental overload message", async () => {
      mockedGetWeeklyLoadByParent.mockResolvedValue([
        { userId: "user-1", email: "marie@test.com", totalLoad: 40, tasksCount: 12 },
        { userId: "user-2", email: "pierre@test.com", totalLoad: 10, tasksCount: 3 },
      ])

      const result = await checkOverloadAlert("user-1", "household-1")

      expect(result?.title).toBe("Charge importante cette semaine")
      expect(result?.message).toContain("marie")
      expect(result?.message).toContain("40")
      // Non-judgmental - no blame
      expect(result?.message).not.toMatch(/trop|excessif|problème/)
    })
  })
})

describe("Alert Severity Thresholds", () => {
  it("should use correct balance thresholds", () => {
    expect(BALANCE_THRESHOLDS.WARNING).toBe(55)
    expect(BALANCE_THRESHOLDS.CRITICAL).toBe(60)
  })
})

/**
 * Integration Test Scenarios (Manual Testing)
 *
 * 1. Imbalance Detection:
 *    - Create 10 tasks assigned to one parent
 *    - Verify imbalance alert appears on dashboard
 *    - Verify alert shows correct ratio
 *
 * 2. Overload Alert:
 *    - Assign 15+ tasks to one parent in a week
 *    - Verify overload alert appears
 *    - Verify suggestion is non-judgmental
 *
 * 3. Inactivity Alert:
 *    - Have one parent not complete tasks for 7+ days
 *    - Verify inactivity warning appears
 *    - After 14+ days, verify critical alert
 *
 * 4. Alert Dismissal:
 *    - Dismiss an alert
 *    - Verify it doesn't reappear immediately
 */
