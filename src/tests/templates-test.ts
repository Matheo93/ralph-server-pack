/**
 * Tests for Task Templates system
 *
 * Run with: bun run src/tests/templates-test.ts
 *
 * These tests verify:
 * 1. Template generation by age
 * 2. Template filtering
 * 3. Deadline calculation from cron rules
 */

import {
  TaskTemplateSchema,
  TaskTemplateFilterSchema,
  parseCronRule,
  ageGroupToRange,
  generateGenerationKey,
  generateYearlyKey,
} from "@/lib/validations/template"
import { allTemplatesFR } from "@/lib/data/templates-fr"

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
testGroup("ageGroupToRange conversion", () => {
  const infants = ageGroupToRange("0-3")
  assert(infants.min === 0 && infants.max === 3, "Infant range is 0-3")

  const preschool = ageGroupToRange("3-6")
  assert(preschool.min === 3 && preschool.max === 6, "Preschool range is 3-6")

  const primary = ageGroupToRange("6-11")
  assert(primary.min === 6 && primary.max === 11, "Primary range is 6-11")

  const middleSchool = ageGroupToRange("11-15")
  assert(middleSchool.min === 11 && middleSchool.max === 15, "Middle school range is 11-15")

  const highSchool = ageGroupToRange("15-18")
  assert(highSchool.min === 15 && highSchool.max === 18, "High school range is 15-18")
})

testGroup("parseCronRule - standard patterns", () => {
  const yearly = parseCronRule("@yearly")
  assert(yearly !== null && yearly.isPattern === true && yearly.pattern === "@yearly", "Yearly pattern parsed")

  const monthly = parseCronRule("@monthly")
  assert(monthly !== null && monthly.isPattern === true && monthly.pattern === "@monthly", "Monthly pattern parsed")

  const weekly = parseCronRule("@weekly")
  assert(weekly !== null && weekly.isPattern === true && weekly.pattern === "@weekly", "Weekly pattern parsed")

  const daily = parseCronRule("@daily")
  assert(daily !== null && daily.isPattern === true && daily.pattern === "@daily", "Daily pattern parsed")
})

testGroup("parseCronRule - cron format", () => {
  // Standard cron: "0 0 1 9 *" = 1st September
  const result = parseCronRule("0 0 1 9 *")
  assert(result !== null && result.isPattern === false, "Standard cron parsed")
  assert(result !== null && !result.isPattern && result.dayOfMonth === "1", "Day of month is 1")
  assert(result !== null && !result.isPattern && result.month === "9", "Month is 9 (September)")
})

testGroup("parseCronRule - invalid inputs", () => {
  assert(parseCronRule(null) === null, "Null returns null")
  assert(parseCronRule("") === null, "Empty string returns null")
  assert(parseCronRule("invalid") === null, "Invalid string returns null")
  assert(parseCronRule("1 2 3") === null, "Incomplete cron returns null")
})

testGroup("generateGenerationKey", () => {
  const templateId = "550e8400-e29b-41d4-a716-446655440000"
  const deadline = new Date("2026-01-15")

  const key = generateGenerationKey(templateId, deadline)
  assert(key.startsWith(templateId), "Generation key contains template ID")
  assert(key.includes("2026"), "Generation key contains year")

  // Same inputs should produce same key
  const key2 = generateGenerationKey(templateId, deadline)
  assert(key === key2, "Same inputs produce same key")

  // Different deadline should produce different key
  const deadline2 = new Date("2026-02-15")
  const key3 = generateGenerationKey(templateId, deadline2)
  assert(key !== key3, "Different month produces different key")
})

testGroup("generateYearlyKey", () => {
  const templateId = "550e8400-e29b-41d4-a716-446655440000"

  const key = generateYearlyKey(templateId, 2026)
  assert(
    key === "550e8400-e29b-41d4-a716-446655440000-2026",
    "Yearly key format is correct"
  )
})

testGroup("TaskTemplateSchema validation", () => {
  // Valid template
  const validTemplate = {
    country: "FR",
    age_min: 6,
    age_max: 10,
    category: "ecole",
    subcategory: "rentrée",
    title: "Acheter les fournitures scolaires",
    description: "Liste de fournitures pour la rentrée",
    cron_rule: "@yearly",
    weight: 3,
    days_before_deadline: 14,
    is_active: true,
  }

  const result = TaskTemplateSchema.safeParse(validTemplate)
  assert(result.success === true, "Valid template passes validation")

  // Invalid age range
  const invalidAge = { ...validTemplate, age_min: 15, age_max: 10 }
  const ageResult = TaskTemplateSchema.safeParse(invalidAge)
  assert(ageResult.success === false, "Invalid age range fails validation")

  // Missing title
  const missingTitle = { ...validTemplate, title: "" }
  const titleResult = TaskTemplateSchema.safeParse(missingTitle)
  assert(titleResult.success === false, "Empty title fails validation")

  // Invalid weight
  const invalidWeight = { ...validTemplate, weight: 15 }
  const weightResult = TaskTemplateSchema.safeParse(invalidWeight)
  assert(weightResult.success === false, "Weight > 10 fails validation")
})

testGroup("TaskTemplateFilterSchema validation", () => {
  // Valid filter
  const validFilter = {
    country: "FR",
    age: 8,
    category: "ecole",
  }

  const result = TaskTemplateFilterSchema.safeParse(validFilter)
  assert(result.success === true, "Valid filter passes validation")

  // Empty filter (all fields optional)
  const emptyFilter = {}
  const emptyResult = TaskTemplateFilterSchema.safeParse(emptyFilter)
  assert(emptyResult.success === true, "Empty filter passes validation")

  // Invalid age
  const invalidAge = { age: -1 }
  const ageResult = TaskTemplateFilterSchema.safeParse(invalidAge)
  assert(ageResult.success === false, "Negative age fails validation")
})

testGroup("French templates data integrity", () => {
  // At least 50 templates
  assert(allTemplatesFR.length >= 50, `Has at least 50 templates (actual: ${allTemplatesFR.length})`)

  // All templates have required fields
  for (const template of allTemplatesFR) {
    assert(typeof template.title === "string" && template.title.length > 0, `Template has title: ${template.title}`)
    assert(typeof template.category === "string", `Template has category`)
    assert(typeof template.age_min === "number" && template.age_min >= 0, `Template has valid age_min`)
    assert(typeof template.age_max === "number" && template.age_max <= 25, `Template has valid age_max`)
    assert(template.age_min <= template.age_max, `age_min <= age_max for ${template.title}`)
    assert(typeof template.weight === "number" && template.weight >= 1 && template.weight <= 10, `Valid weight`)
  }

  // Coverage check - templates for each age group
  const agesWithTemplates = new Set<number>()
  for (const template of allTemplatesFR) {
    for (let age = template.age_min; age <= template.age_max; age++) {
      agesWithTemplates.add(age)
    }
  }

  assert(agesWithTemplates.has(0), "Has templates for babies (0)")
  assert(agesWithTemplates.has(3), "Has templates for toddlers (3)")
  assert(agesWithTemplates.has(6), "Has templates for children (6)")
  assert(agesWithTemplates.has(11), "Has templates for preteens (11)")
  assert(agesWithTemplates.has(15), "Has templates for teens (15)")
})

testGroup("Template categories", () => {
  const categories = new Set(allTemplatesFR.map((t) => t.category))

  assert(categories.has("sante"), "Has health templates")
  assert(categories.has("ecole"), "Has school templates")
  assert(categories.has("administratif"), "Has admin templates")
  assert(categories.has("activites"), "Has activity templates")
})

console.log("\n=== All template tests completed ===\n")
