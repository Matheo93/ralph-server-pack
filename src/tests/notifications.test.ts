/**
 * Notifications Tests
 *
 * Unit tests for the notification email generation and helper functions.
 * Note: These tests mock the database and SES client to test logic only.
 */

import { describe, it, expect } from "vitest"
import { wrapEmailTemplate } from "@/lib/aws/ses"
import {
  generateDailyDigestEmail,
  generateTaskReminderEmail,
  generateStreakWarningEmail,
} from "@/lib/templates/email"

describe("Email Template Wrapper", () => {
  it("should wrap content in HTML email template", () => {
    const content = "<p>Test content</p>"
    const html = wrapEmailTemplate(content)

    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain("<html lang=\"fr\">")
    expect(html).toContain("Test content")
    expect(html).toContain("FamilyLoad")
    expect(html).toContain("class=\"container\"")
    expect(html).toContain("class=\"card\"")
  })

  it("should include preview text when provided", () => {
    const content = "<p>Test</p>"
    const preview = "This is the preview text"
    const html = wrapEmailTemplate(content, preview)

    expect(html).toContain(preview)
    expect(html).toContain("display:none")
  })

  it("should include settings link in footer", () => {
    const html = wrapEmailTemplate("<p>Test</p>")
    expect(html).toContain("/settings/notifications")
    expect(html).toContain("Gérer mes notifications")
  })

  it("should have responsive styles", () => {
    const html = wrapEmailTemplate("<p>Test</p>")
    expect(html).toContain("max-width: 600px")
    expect(html).toContain("prefers-color-scheme: dark")
  })
})

describe("Daily Digest Email", () => {
  const baseData = {
    userName: "Jean",
    householdName: "Famille Dupont",
    date: "2024-01-15T08:00:00Z",
    todayTasks: [],
    overdueTasks: [],
    weekCount: 10,
    streakCurrent: 5,
    streakBest: 10,
    appUrl: "https://app.familyload.com",
  }

  it("should generate email with no tasks", () => {
    const email = generateDailyDigestEmail(baseData)

    expect(email.subject).toContain("Famille Dupont")
    expect(email.subject).toContain("0 tâches")
    expect(email.html).toContain("Bonjour Jean")
    expect(email.html).toContain("Aucune tâche pour aujourd'hui")
    expect(email.text).toContain("Aucune tâche pour aujourd'hui")
  })

  it("should include tasks list when present", () => {
    const email = generateDailyDigestEmail({
      ...baseData,
      todayTasks: [
        { id: "1", title: "RDV medecin", priority: "high", is_critical: true, child_name: "Emma", category_name: "Sante" },
        { id: "2", title: "Courses", priority: "normal", is_critical: false },
      ],
    })

    expect(email.subject).toContain("2 tâches")
    expect(email.subject).toContain("1 critiques")
    expect(email.html).toContain("RDV medecin")
    expect(email.html).toContain("Courses")
    expect(email.html).toContain("Emma")
    expect(email.html).toContain("Sante")
    expect(email.text).toContain("RDV medecin")
  })

  it("should highlight overdue tasks", () => {
    const email = generateDailyDigestEmail({
      ...baseData,
      overdueTasks: [
        { id: "1", title: "Tache en retard", priority: "high", is_critical: false },
      ],
    })

    expect(email.html).toContain("En retard")
    expect(email.html).toContain("Tache en retard")
    expect(email.text).toContain("En retard")
  })

  it("should show streak information", () => {
    const email = generateDailyDigestEmail(baseData)

    expect(email.html).toContain("Streak actuel: 5 jour")
    expect(email.html).toContain("Record: 10")
    expect(email.text).toContain("Streak actuel: 5 jours")
  })

  it("should show record indicator when at best streak", () => {
    const email = generateDailyDigestEmail({
      ...baseData,
      streakCurrent: 10,
      streakBest: 10,
    })

    expect(email.html).toContain("Record !")
  })

  it("should hide streak when zero", () => {
    const email = generateDailyDigestEmail({
      ...baseData,
      streakCurrent: 0,
    })

    expect(email.html).not.toContain("Streak actuel")
    expect(email.text).not.toContain("Streak actuel")
  })

  it("should format date in French", () => {
    const email = generateDailyDigestEmail(baseData)

    // January 15, 2024 should format as French weekday
    expect(email.html).toContain("15")
    expect(email.html).toContain("janvier")
  })

  it("should include CTA button", () => {
    const email = generateDailyDigestEmail(baseData)

    expect(email.html).toContain("Voir mes tâches")
    expect(email.html).toContain("/tasks/today")
    expect(email.text).toContain("/tasks/today")
  })

  it("should show week count", () => {
    const email = generateDailyDigestEmail(baseData)

    expect(email.html).toContain("10")
    expect(email.html).toContain("Cette semaine")
  })
})

describe("Task Reminder Email", () => {
  // Use a future date to avoid "En retard" status
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)
  const futureDateStr = futureDate.toISOString()

  const baseData = {
    userName: "Marie",
    taskTitle: "RDV orthodontiste",
    taskDescription: "Prendre Lucas a son rdv",
    deadline: futureDateStr,
    priority: "high",
    is_critical: false,
    childName: "Lucas",
    categoryName: "Sante",
    appUrl: "https://app.familyload.com",
    taskId: "task-123",
  }

  it("should generate basic reminder email", () => {
    const email = generateTaskReminderEmail(baseData)

    expect(email.subject).toContain("RDV orthodontiste")
    expect(email.html).toContain("Marie")
    expect(email.html).toContain("RDV orthodontiste")
    expect(email.html).toContain("Prendre Lucas a son rdv")
    expect(email.text).toContain("RDV orthodontiste")
  })

  it("should highlight critical tasks", () => {
    const email = generateTaskReminderEmail({
      ...baseData,
      is_critical: true,
    })

    expect(email.subject).toContain("CRITIQUE")
    expect(email.html).toContain("Critique")
  })

  it("should include child name when present", () => {
    const email = generateTaskReminderEmail(baseData)

    expect(email.html).toContain("Lucas")
  })

  it("should include category when present", () => {
    const email = generateTaskReminderEmail(baseData)

    expect(email.html).toContain("Sante")
  })

  it("should format deadline as date string", () => {
    const email = generateTaskReminderEmail(baseData)

    // The email should contain the day number from the future date
    const dayNumber = futureDate.getDate().toString()
    expect(email.html).toContain(dayNumber)
  })

  it("should include task link in HTML", () => {
    const email = generateTaskReminderEmail(baseData)

    expect(email.html).toContain("/tasks/task-123")
    expect(email.text).toContain("/tasks/task-123")
  })

  it("should handle missing optional fields", () => {
    const email = generateTaskReminderEmail({
      ...baseData,
      childName: null,
      categoryName: null,
      taskDescription: null,
    })

    expect(email.html).not.toContain("undefined")
    expect(email.html).not.toContain("null")
  })

  it("should show urgency for overdue tasks", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const email = generateTaskReminderEmail({
      ...baseData,
      deadline: pastDate.toISOString(),
    })

    expect(email.subject).toContain("URGENT")
    expect(email.html).toContain("En retard")
  })
})

describe("Streak Warning Email", () => {
  const baseData = {
    userName: "Pierre",
    householdName: "Famille Martin",
    streakCurrent: 15,
    streakBest: 20,
    criticalTaskTitle: "Medicament Emma",
    criticalTaskId: "task-456",
    appUrl: "https://app.familyload.com",
  }

  it("should generate warning email", () => {
    const email = generateStreakWarningEmail(baseData)

    expect(email.subject).toContain("Streak en danger")
    expect(email.subject).toContain("15 jours")
    expect(email.html).toContain("Pierre")
    expect(email.html).toContain("15")
  })

  it("should mention the critical task", () => {
    const email = generateStreakWarningEmail(baseData)

    expect(email.html).toContain("Medicament Emma")
    expect(email.text).toContain("Medicament Emma")
  })

  it("should include task link in HTML", () => {
    const email = generateStreakWarningEmail(baseData)

    expect(email.html).toContain("/tasks/task-456")
    // Text version links to /tasks/today instead of specific task
    expect(email.text).toContain("/tasks/today")
  })

  it("should show stakes (streak at risk)", () => {
    const email = generateStreakWarningEmail(baseData)

    expect(email.html).toContain("15 jour")
    expect(email.html).toContain("danger")
  })

  it("should show extra urgency at high streaks", () => {
    const email = generateStreakWarningEmail({
      ...baseData,
      streakCurrent: 50,
    })

    expect(email.html).toContain("50 jour")
  })

  it("should mention best streak if close", () => {
    const email = generateStreakWarningEmail({
      ...baseData,
      streakCurrent: 19,
      streakBest: 20,
    })

    // When close to record, it shows "Plus que X jours pour battre votre record"
    expect(email.html).toContain("battre votre record")
  })
})

describe("Email Text Versions", () => {
  it("should generate valid plain text for daily digest", () => {
    const email = generateDailyDigestEmail({
      userName: "Test",
      householdName: "Test Family",
      date: "2024-01-15",
      todayTasks: [{ id: "1", title: "Task 1", priority: "normal", is_critical: false }],
      overdueTasks: [],
      weekCount: 5,
      streakCurrent: 0,
      streakBest: 0,
      appUrl: "https://app.test.com",
    })

    expect(email.text).not.toContain("<")
    expect(email.text).not.toContain(">")
    expect(email.text).toContain("Task 1")
  })

  it("should generate valid plain text for task reminder", () => {
    const email = generateTaskReminderEmail({
      userName: "Test",
      taskTitle: "Test Task",
      taskDescription: "Description",
      deadline: "2024-01-15",
      priority: "normal",
      is_critical: false,
      childName: null,
      categoryName: null,
      appUrl: "https://app.test.com",
      taskId: "123",
    })

    expect(email.text).not.toContain("<div")
    expect(email.text).not.toContain("</")
    expect(email.text).toContain("Test Task")
  })

  it("should generate valid plain text for streak warning", () => {
    const email = generateStreakWarningEmail({
      userName: "Test",
      householdName: "Test Family",
      streakCurrent: 5,
      streakBest: 10,
      criticalTaskTitle: "Critical Task",
      criticalTaskId: "123",
      appUrl: "https://app.test.com",
    })

    expect(email.text).not.toContain("<span")
    expect(email.text).toContain("Critical Task")
  })
})

/**
 * Integration test scenarios for manual testing:
 *
 * 1. Send daily digest:
 *    - Trigger cron endpoint with valid secret
 *    - Verify email received in inbox
 *    - Check all tasks are listed correctly
 *
 * 2. Send task reminder:
 *    - Create task with deadline
 *    - Trigger reminder
 *    - Verify email format and links
 *
 * 3. Send streak warning:
 *    - Have household with active streak
 *    - Have uncompleted critical task
 *    - Trigger streak alert cron
 *    - Verify warning email received
 *
 * 4. Email preferences:
 *    - Disable email notifications in settings
 *    - Trigger notification
 *    - Verify no email sent
 *
 * 5. Email rendering:
 *    - Open emails in different clients
 *    - Verify responsive layout
 *    - Verify dark mode support
 */
