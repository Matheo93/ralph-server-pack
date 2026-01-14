/**
 * Tests for Tasks CRUD operations
 *
 * Run with: bun run src/tests/tasks-test.ts
 *
 * These tests verify:
 * 1. Task creation with validation
 * 2. Task update
 * 3. Task completion
 * 4. Task filtering
 * 5. Charge calculation
 */

import { z } from "zod"
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskFilterSchema,
  TaskPostponeSchema,
  TaskPriorityEnum,
  TaskStatusEnum,
} from "@/lib/validations/task"
import { CATEGORY_WEIGHTS, getDefaultWeight, getWeightWithPriority } from "@/lib/constants/task-weights"

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
testGroup("TaskCreateSchema validation", () => {
  // Valid task
  const validTask = {
    title: "Rendez-vous médecin",
    priority: "high",
    deadline: new Date().toISOString(),
  }
  const result = TaskCreateSchema.safeParse(validTask)
  assert(result.success, "Valid task should pass validation")

  // Missing title
  const noTitle = { priority: "normal" }
  const noTitleResult = TaskCreateSchema.safeParse(noTitle)
  assert(!noTitleResult.success, "Task without title should fail validation")

  // Invalid priority
  const invalidPriority = { title: "Test", priority: "urgent" }
  const invalidPriorityResult = TaskCreateSchema.safeParse(invalidPriority)
  assert(!invalidPriorityResult.success, "Task with invalid priority should fail")

  // Title too long
  const longTitle = { title: "A".repeat(201) }
  const longTitleResult = TaskCreateSchema.safeParse(longTitle)
  assert(!longTitleResult.success, "Task with title > 200 chars should fail")
})

testGroup("TaskUpdateSchema validation", () => {
  // Valid update
  const validUpdate = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Updated title",
  }
  const result = TaskUpdateSchema.safeParse(validUpdate)
  assert(result.success, "Valid update should pass validation")

  // Invalid UUID
  const invalidId = { id: "not-a-uuid", title: "Test" }
  const invalidIdResult = TaskUpdateSchema.safeParse(invalidId)
  assert(!invalidIdResult.success, "Update with invalid UUID should fail")
})

testGroup("TaskFilterSchema validation", () => {
  // Empty filter (should use defaults)
  const emptyFilter = {}
  const emptyResult = TaskFilterSchema.safeParse(emptyFilter)
  assert(emptyResult.success, "Empty filter should use defaults")
  if (emptyResult.success) {
    assert(emptyResult.data.limit === 50, "Default limit should be 50")
    assert(emptyResult.data.offset === 0, "Default offset should be 0")
    assert(emptyResult.data.sort_by === "deadline", "Default sort should be deadline")
  }

  // With status filter
  const statusFilter = { status: ["pending", "done"] }
  const statusResult = TaskFilterSchema.safeParse(statusFilter)
  assert(statusResult.success, "Status filter should be valid")

  // Invalid limit
  const invalidLimit = { limit: 200 }
  const invalidLimitResult = TaskFilterSchema.safeParse(invalidLimit)
  assert(!invalidLimitResult.success, "Limit > 100 should fail")
})

testGroup("TaskPostponeSchema validation", () => {
  // Valid postpone (future date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const validPostpone = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    new_deadline: tomorrow.toISOString(),
  }
  const result = TaskPostponeSchema.safeParse(validPostpone)
  assert(result.success, "Postpone to future date should pass")

  // Past date should fail
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const pastPostpone = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    new_deadline: yesterday.toISOString(),
  }
  const pastResult = TaskPostponeSchema.safeParse(pastPostpone)
  assert(!pastResult.success, "Postpone to past date should fail")
})

testGroup("TaskPriorityEnum", () => {
  const priorities = ["critical", "high", "normal", "low"]

  for (const p of priorities) {
    const result = TaskPriorityEnum.safeParse(p)
    assert(result.success, `Priority "${p}" should be valid`)
  }

  const invalidResult = TaskPriorityEnum.safeParse("urgent")
  assert(!invalidResult.success, '"urgent" should not be a valid priority')
})

testGroup("TaskStatusEnum", () => {
  const statuses = ["pending", "done", "postponed", "cancelled"]

  for (const s of statuses) {
    const result = TaskStatusEnum.safeParse(s)
    assert(result.success, `Status "${s}" should be valid`)
  }
})

testGroup("Category weights", () => {
  assert(CATEGORY_WEIGHTS["sante"] === 5, "Santé should have weight 5")
  assert(CATEGORY_WEIGHTS["social"] === 6, "Social should have weight 6")
  assert(CATEGORY_WEIGHTS["quotidien"] === 1, "Quotidien should have weight 1")
  assert(CATEGORY_WEIGHTS["administratif"] === 3, "Administratif should have weight 3")
  assert(CATEGORY_WEIGHTS["ecole"] === 4, "École should have weight 4")
})

testGroup("getDefaultWeight", () => {
  assert(getDefaultWeight("sante") === 5, "getDefaultWeight should return 5 for sante")
  assert(getDefaultWeight("unknown") === 3, "getDefaultWeight should return 3 for unknown category")
})

testGroup("getWeightWithPriority", () => {
  assert(getWeightWithPriority(5, "critical") === 8, "Critical multiplier should be 1.5 (5*1.5=7.5 rounded)")
  assert(getWeightWithPriority(5, "high") === 6, "High multiplier should be 1.2 (5*1.2=6)")
  assert(getWeightWithPriority(5, "normal") === 5, "Normal multiplier should be 1.0")
  assert(getWeightWithPriority(5, "low") === 4, "Low multiplier should be 0.8 (5*0.8=4)")
})

console.log("\n=== All tests completed ===")
