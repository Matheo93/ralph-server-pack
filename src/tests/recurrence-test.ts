/**
 * Tests for Recurrence system
 *
 * Run with: bun run src/tests/recurrence-test.ts
 *
 * These tests verify:
 * 1. Recurrence rule labels
 * 2. Next occurrence calculation
 * 3. Recurrence presets
 */

import {
  getRecurrenceLabel,
  calculateNextOccurrence,
  RECURRENCE_PRESETS,
} from "@/lib/services/recurrence"
import type { RecurrenceRule } from "@/lib/validations/task"

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`)
  }
  console.log(`PASS: ${message}`)
}

function testGroup(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`)
  try {
    fn()
  } catch (error) {
    console.error(`ERROR in ${name}:`, error)
    process.exitCode = 1
  }
}

// Tests
testGroup("getRecurrenceLabel - French labels", () => {
  // Daily
  const dailyConfig: RecurrenceRule = { frequency: "daily", interval: 1 }
  assert(getRecurrenceLabel(dailyConfig) === "Tous les jours", "Daily label is correct")

  // Weekly
  const weeklyConfig: RecurrenceRule = { frequency: "weekly", interval: 1 }
  assert(getRecurrenceLabel(weeklyConfig) === "Toutes les semaines", "Weekly label is correct")

  // Biweekly
  const biweeklyConfig: RecurrenceRule = { frequency: "weekly", interval: 2 }
  assert(getRecurrenceLabel(biweeklyConfig) === "Toutes les 2 semaines", "Biweekly label is correct")

  // Monthly
  const monthlyConfig: RecurrenceRule = { frequency: "monthly", interval: 1 }
  assert(getRecurrenceLabel(monthlyConfig) === "Tous les mois", "Monthly label is correct")

  // Yearly
  const yearlyConfig: RecurrenceRule = { frequency: "yearly", interval: 1 }
  assert(getRecurrenceLabel(yearlyConfig) === "Tous les ans", "Yearly label is correct")
})

testGroup("getRecurrenceLabel - intervals", () => {
  // Every 3 days
  const every3Days: RecurrenceRule = { frequency: "daily", interval: 3 }
  assert(getRecurrenceLabel(every3Days) === "Tous les 3 jours", "Every 3 days label is correct")

  // Every 2 months
  const every2Months: RecurrenceRule = { frequency: "monthly", interval: 2 }
  assert(getRecurrenceLabel(every2Months) === "Tous les 2 mois", "Every 2 months label is correct")
})

testGroup("calculateNextOccurrence - daily", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "daily", interval: 1 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Daily returns a date")

  const expectedDate = new Date("2026-01-16T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Daily next occurrence is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - daily interval", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "daily", interval: 3 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Daily interval returns a date")

  const expectedDate = new Date("2026-01-18T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Daily +3 is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - weekly", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z") // Thursday
  const config: RecurrenceRule = { frequency: "weekly", interval: 1 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Weekly returns a date")

  const expectedDate = new Date("2026-01-22T00:00:00Z") // Next Thursday
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Weekly next occurrence is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - biweekly", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "weekly", interval: 2 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Biweekly returns a date")

  const expectedDate = new Date("2026-01-29T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Biweekly is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - monthly", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "monthly", interval: 1 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Monthly returns a date")

  const expectedDate = new Date("2026-02-15T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Monthly is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - quarterly", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "monthly", interval: 3 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Quarterly returns a date")

  const expectedDate = new Date("2026-04-15T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Quarterly is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - yearly", () => {
  const baseDate = new Date("2026-01-15T10:00:00Z")
  const config: RecurrenceRule = { frequency: "yearly", interval: 1 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "Yearly returns a date")

  const expectedDate = new Date("2027-01-15T00:00:00Z")
  assert(
    next!.getTime() === expectedDate.getTime(),
    `Yearly is correct: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - end of month handling", () => {
  // January 31 + 1 month = February 28 (or 29 in leap year)
  const baseDate = new Date("2026-01-31T10:00:00Z")
  const config: RecurrenceRule = { frequency: "monthly", interval: 1 }

  const next = calculateNextOccurrence(config, baseDate)
  assert(next !== null, "End of month returns a date")

  // February 2026 has 28 days
  assert(
    next!.getMonth() === 1, // February
    "Moves to February"
  )
})

testGroup("RECURRENCE_PRESETS", () => {
  assert(RECURRENCE_PRESETS.daily.frequency === "daily", "Daily preset exists")
  assert(RECURRENCE_PRESETS.daily.interval === 1, "Daily interval is 1")

  assert(RECURRENCE_PRESETS.weekdays.frequency === "weekly", "Weekdays preset uses weekly")
  assert(RECURRENCE_PRESETS.weekdays.byDayOfWeek?.length === 5, "Weekdays has 5 days")

  assert(RECURRENCE_PRESETS.weekly.frequency === "weekly", "Weekly preset exists")
  assert(RECURRENCE_PRESETS.weekly.interval === 1, "Weekly interval is 1")

  assert(RECURRENCE_PRESETS.biweekly.frequency === "weekly", "Biweekly uses weekly")
  assert(RECURRENCE_PRESETS.biweekly.interval === 2, "Biweekly interval is 2")

  assert(RECURRENCE_PRESETS.monthly.frequency === "monthly", "Monthly preset exists")
  assert(RECURRENCE_PRESETS.monthly.interval === 1, "Monthly interval is 1")

  assert(RECURRENCE_PRESETS.quarterly.frequency === "monthly", "Quarterly uses monthly")
  assert(RECURRENCE_PRESETS.quarterly.interval === 3, "Quarterly interval is 3")

  assert(RECURRENCE_PRESETS.yearly.frequency === "yearly", "Yearly preset exists")
  assert(RECURRENCE_PRESETS.yearly.interval === 1, "Yearly interval is 1")
})

testGroup("getRecurrenceLabel - weekdays with days", () => {
  const weekdaysConfig: RecurrenceRule = {
    frequency: "weekly",
    interval: 1,
    byDayOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  }
  const label = getRecurrenceLabel(weekdaysConfig)
  assert(label.includes("lundi") && label.includes("vendredi"), "Weekdays shows day names")
})

testGroup("calculateNextOccurrence - weekdays", () => {
  // Friday Jan 16, 2026
  const friday = new Date("2026-01-16T10:00:00Z")
  const config: RecurrenceRule = {
    frequency: "weekly",
    interval: 1,
    byDayOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  }

  const next = calculateNextOccurrence(config, friday)
  assert(next !== null, "Weekdays returns a date from Friday")

  // Next weekday after Friday is Monday
  assert(
    next!.getDay() === 1, // Monday
    `Next weekday after Friday is Monday: ${next!.toISOString()}`
  )
})

testGroup("calculateNextOccurrence - null rule", () => {
  const result = calculateNextOccurrence(null)
  assert(result === null, "Null rule returns null")
})

testGroup("getRecurrenceLabel - null rule", () => {
  const result = getRecurrenceLabel(null)
  assert(result === "Aucune récurrence", "Null rule returns default message")
})

console.log("\n=== All recurrence tests completed ===\n")
