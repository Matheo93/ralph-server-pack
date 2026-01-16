/**
 * Tests for Internationalization (i18n)
 *
 * Tests for locale detection, message loading, and translation coverage
 */

import { describe, it, expect } from "vitest"
import frMessages from "@/messages/fr.json"
import enMessages from "@/messages/en.json"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface MessageRecord {
  [key: string]: string | MessageRecord
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj: MessageRecord, prefix = ""): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === "object" && value !== null) {
      keys.push(...getAllKeys(value as MessageRecord, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

/**
 * Get value from nested object by dot notation path
 */
function getNestedValue(obj: MessageRecord, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

// =============================================================================
// MESSAGE STRUCTURE TESTS
// =============================================================================

describe("i18n Message Structure", () => {
  it("has all required top-level namespaces in French", () => {
    const requiredNamespaces = [
      "common",
      "auth",
      "nav",
      "dashboard",
      "tasks",
      "children",
      "charge",
      "settings",
      "onboarding",
      "errors",
      "time",
    ]

    for (const namespace of requiredNamespaces) {
      expect(frMessages).toHaveProperty(namespace)
    }
  })

  it("has all required top-level namespaces in English", () => {
    const requiredNamespaces = [
      "common",
      "auth",
      "nav",
      "dashboard",
      "tasks",
      "children",
      "charge",
      "settings",
      "onboarding",
      "errors",
      "time",
    ]

    for (const namespace of requiredNamespaces) {
      expect(enMessages).toHaveProperty(namespace)
    }
  })

  it("has matching structure between French and English", () => {
    const frKeys = getAllKeys(frMessages as unknown as MessageRecord).sort()
    const enKeys = getAllKeys(enMessages as unknown as MessageRecord).sort()

    // Check for missing keys in English
    const missingInEn = frKeys.filter((key) => !enKeys.includes(key))
    expect(missingInEn).toHaveLength(0)

    // Check for extra keys in English
    const extraInEn = enKeys.filter((key) => !frKeys.includes(key))
    expect(extraInEn).toHaveLength(0)
  })
})

// =============================================================================
// TRANSLATION COVERAGE TESTS
// =============================================================================

describe("Translation Coverage", () => {
  const frKeys = getAllKeys(frMessages as unknown as MessageRecord)
  const enKeys = getAllKeys(enMessages as unknown as MessageRecord)

  it("has no empty translations in French", () => {
    const emptyKeys: string[] = []
    for (const key of frKeys) {
      const value = getNestedValue(frMessages as unknown as MessageRecord, key)
      if (!value || value.trim() === "") {
        emptyKeys.push(key)
      }
    }
    expect(emptyKeys).toHaveLength(0)
  })

  it("has no empty translations in English", () => {
    const emptyKeys: string[] = []
    for (const key of enKeys) {
      const value = getNestedValue(enMessages as unknown as MessageRecord, key)
      if (!value || value.trim() === "") {
        emptyKeys.push(key)
      }
    }
    expect(emptyKeys).toHaveLength(0)
  })

  it("French and English have different values (not just copied)", () => {
    const sameValues: string[] = []
    const excludedKeys = [
      // Technical terms that should be the same
      "common.ok",
      "settings.language.french",
      "settings.language.english",
    ]

    for (const key of frKeys) {
      if (excludedKeys.includes(key)) continue

      const frValue = getNestedValue(frMessages as unknown as MessageRecord, key)
      const enValue = getNestedValue(enMessages as unknown as MessageRecord, key)

      // Skip if contains ICU syntax (plurals, etc.) - these may be similar
      if (frValue?.includes("{count") || frValue?.includes("{")) continue

      // Skip short values that might legitimately be the same
      if (frValue && frValue.length < 4) continue

      if (frValue && enValue && frValue === enValue) {
        sameValues.push(key)
      }
    }

    // Allow a few same values (technical terms, proper nouns) but not many
    expect(sameValues.length).toBeLessThan(15)
  })
})

// =============================================================================
// COMMON NAMESPACE TESTS
// =============================================================================

describe("Common Namespace", () => {
  it("has loading state text", () => {
    expect(frMessages.common.loading).toBeDefined()
    expect(enMessages.common.loading).toBeDefined()
  })

  it("has action buttons", () => {
    const actionButtons = ["save", "cancel", "delete", "edit", "add"]
    for (const button of actionButtons) {
      expect(frMessages.common).toHaveProperty(button)
      expect(enMessages.common).toHaveProperty(button)
    }
  })

  it("has confirmation words", () => {
    expect(frMessages.common.yes).toBeDefined()
    expect(frMessages.common.no).toBeDefined()
    expect(frMessages.common.confirm).toBeDefined()
  })
})

// =============================================================================
// AUTH NAMESPACE TESTS
// =============================================================================

describe("Auth Namespace", () => {
  it("has login/logout text", () => {
    expect(frMessages.auth.login).toBeDefined()
    expect(frMessages.auth.logout).toBeDefined()
    expect(enMessages.auth.login).toBeDefined()
    expect(enMessages.auth.logout).toBeDefined()
  })

  it("has form field labels", () => {
    expect(frMessages.auth.email).toBeDefined()
    expect(frMessages.auth.password).toBeDefined()
  })

  it("has forgot password link text", () => {
    expect(frMessages.auth.forgotPassword).toBeDefined()
    expect(enMessages.auth.forgotPassword).toBeDefined()
  })
})

// =============================================================================
// TASKS NAMESPACE TESTS
// =============================================================================

describe("Tasks Namespace", () => {
  it("has task status translations", () => {
    const statuses = ["pending", "done", "reported", "cancelled"]
    for (const status of statuses) {
      expect(frMessages.tasks.status).toHaveProperty(status)
      expect(enMessages.tasks.status).toHaveProperty(status)
    }
  })

  it("has priority translations", () => {
    const priorities = ["low", "normal", "high", "critical"]
    for (const priority of priorities) {
      expect(frMessages.tasks.priority).toHaveProperty(priority)
      expect(enMessages.tasks.priority).toHaveProperty(priority)
    }
  })

  it("has category translations", () => {
    const categories = [
      "administratif",
      "sante",
      "ecole",
      "quotidien",
      "social",
      "activites",
      "logistique",
    ]
    for (const category of categories) {
      expect(frMessages.tasks.categories).toHaveProperty(category)
      expect(enMessages.tasks.categories).toHaveProperty(category)
    }
  })
})

// =============================================================================
// NAVIGATION NAMESPACE TESTS
// =============================================================================

describe("Navigation Namespace", () => {
  it("has all main navigation items", () => {
    const navItems = [
      "dashboard",
      "tasks",
      "children",
      "charge",
      "settings",
      "profile",
      "household",
      "notifications",
    ]
    for (const item of navItems) {
      expect(frMessages.nav).toHaveProperty(item)
      expect(enMessages.nav).toHaveProperty(item)
    }
  })
})

// =============================================================================
// DASHBOARD NAMESPACE TESTS
// =============================================================================

describe("Dashboard Namespace", () => {
  it("has streak translation", () => {
    expect(frMessages.dashboard.streak).toBeDefined()
    expect(enMessages.dashboard.streak).toBeDefined()
  })

  it("has pluralized streakDays", () => {
    expect(frMessages.dashboard.streakDays).toContain("{count")
    expect(enMessages.dashboard.streakDays).toContain("{count")
  })

  it("has task-related messages", () => {
    expect(frMessages.dashboard.todayTasks).toBeDefined()
    expect(frMessages.dashboard.noTasks).toBeDefined()
    expect(frMessages.dashboard.addTask).toBeDefined()
  })
})

// =============================================================================
// CHARGE NAMESPACE TESTS
// =============================================================================

describe("Charge Namespace", () => {
  it("has balance-related text", () => {
    expect(frMessages.charge.balanced).toBeDefined()
    expect(frMessages.charge.unbalanced).toBeDefined()
    expect(enMessages.charge.balanced).toBeDefined()
    expect(enMessages.charge.unbalanced).toBeDefined()
  })

  it("has tips section", () => {
    expect(frMessages.charge.tips).toBeDefined()
    expect(frMessages.charge.tips.title).toBeDefined()
    expect(frMessages.charge.tips.tip1Title).toBeDefined()
  })

  it("has export PDF text", () => {
    expect(frMessages.charge.exportPdf).toBeDefined()
    expect(enMessages.charge.exportPdf).toBeDefined()
  })
})

// =============================================================================
// ERRORS NAMESPACE TESTS
// =============================================================================

describe("Errors Namespace", () => {
  it("has generic error message", () => {
    expect(frMessages.errors.generic).toBeDefined()
    expect(enMessages.errors.generic).toBeDefined()
  })

  it("has common error types", () => {
    const errorTypes = ["notFound", "networkError", "unauthorized", "validation"]
    for (const errorType of errorTypes) {
      expect(frMessages.errors).toHaveProperty(errorType)
      expect(enMessages.errors).toHaveProperty(errorType)
    }
  })
})

// =============================================================================
// TIME NAMESPACE TESTS
// =============================================================================

describe("Time Namespace", () => {
  it("has relative time words", () => {
    const timeWords = ["today", "tomorrow", "yesterday", "thisWeek", "nextWeek"]
    for (const word of timeWords) {
      expect(frMessages.time).toHaveProperty(word)
      expect(enMessages.time).toHaveProperty(word)
    }
  })

  it("has pluralized daysAgo", () => {
    expect(frMessages.time.daysAgo).toContain("{count")
    expect(enMessages.time.daysAgo).toContain("{count")
  })
})

// =============================================================================
// LOCALE CONFIGURATION TESTS
// =============================================================================

describe("Locale Configuration", () => {
  it("should have French as messages file", () => {
    expect(frMessages).toBeDefined()
    expect(Object.keys(frMessages).length).toBeGreaterThan(0)
  })

  it("should have English as messages file", () => {
    expect(enMessages).toBeDefined()
    expect(Object.keys(enMessages).length).toBeGreaterThan(0)
  })

  it("should have equal number of top-level namespaces", () => {
    expect(Object.keys(frMessages).length).toBe(Object.keys(enMessages).length)
  })
})

// =============================================================================
// ICU MESSAGE FORMAT TESTS
// =============================================================================

describe("ICU Message Format", () => {
  it("has valid plural syntax in French streakDays", () => {
    const message = frMessages.dashboard.streakDays
    expect(message).toMatch(/\{count,\s*plural/)
    expect(message).toMatch(/other\s*\{/)
  })

  it("has valid plural syntax in English streakDays", () => {
    const message = enMessages.dashboard.streakDays
    expect(message).toMatch(/\{count,\s*plural/)
    expect(message).toMatch(/other\s*\{/)
  })

  it("has placeholder in charge subtitle", () => {
    expect(frMessages.charge.subtitle).toContain("{household}")
    expect(enMessages.charge.subtitle).toContain("{household}")
  })

  it("has placeholder in children age", () => {
    expect(frMessages.children.age).toContain("{age}")
    expect(enMessages.children.age).toContain("{age}")
  })
})
