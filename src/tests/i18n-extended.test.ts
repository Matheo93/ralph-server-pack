import { describe, it, expect, beforeEach } from "vitest"

// ============================================================
// TRANSLATION TESTS
// ============================================================

import en from "@/i18n/messages/en"
import es from "@/i18n/messages/es"
import de from "@/i18n/messages/de"
import {
  getMessages,
  supportedLocales,
  defaultLocale,
  localeNames,
  isValidLocale,
} from "@/i18n/messages"
import type { Messages } from "@/i18n/messages/types"

describe("i18n Translations", () => {
  describe("Translation Loading", () => {
    it("should load English translations", () => {
      expect(en).toBeDefined()
      expect(en.common).toBeDefined()
      expect(en.auth).toBeDefined()
      expect(en.tasks).toBeDefined()
    })

    it("should load Spanish translations", () => {
      expect(es).toBeDefined()
      expect(es.common).toBeDefined()
      expect(es.auth).toBeDefined()
      expect(es.tasks).toBeDefined()
    })

    it("should load German translations", () => {
      expect(de).toBeDefined()
      expect(de.common).toBeDefined()
      expect(de.auth).toBeDefined()
      expect(de.tasks).toBeDefined()
    })

    it("should have all supported locales", () => {
      expect(supportedLocales).toContain("fr")
      expect(supportedLocales).toContain("en")
      expect(supportedLocales).toContain("es")
      expect(supportedLocales).toContain("de")
    })

    it("should have French as default locale", () => {
      expect(defaultLocale).toBe("fr")
    })
  })

  describe("Translation Structure", () => {
    const translations: Record<string, Messages> = { en, es, de }

    Object.entries(translations).forEach(([locale, messages]) => {
      describe(`${locale} translations`, () => {
        it("should have common section", () => {
          expect(messages.common.loading).toBeDefined()
          expect(messages.common.save).toBeDefined()
          expect(messages.common.cancel).toBeDefined()
        })

        it("should have auth section", () => {
          expect(messages.auth.login).toBeDefined()
          expect(messages.auth.logout).toBeDefined()
          expect(messages.auth.email).toBeDefined()
        })

        it("should have tasks section", () => {
          expect(messages.tasks.title).toBeDefined()
          expect(messages.tasks.newTask).toBeDefined()
          expect(messages.tasks.status).toBeDefined()
          expect(messages.tasks.categories).toBeDefined()
        })

        it("should have children section", () => {
          expect(messages.children.title).toBeDefined()
          expect(messages.children.addChild).toBeDefined()
          expect(messages.children.genderOptions).toBeDefined()
        })

        it("should have charge section", () => {
          expect(messages.charge.title).toBeDefined()
          expect(messages.charge.tips).toBeDefined()
          expect(messages.charge.balanced).toBeDefined()
        })

        it("should have settings section", () => {
          expect(messages.settings.title).toBeDefined()
          expect(messages.settings.profile).toBeDefined()
          expect(messages.settings.notifications).toBeDefined()
        })

        it("should have time section", () => {
          expect(messages.time.today).toBeDefined()
          expect(messages.time.yesterday).toBeDefined()
          expect(messages.time.weekdays).toBeDefined()
          expect(messages.time.monthNames).toBeDefined()
        })

        it("should have voice section", () => {
          expect(messages.voice.title).toBeDefined()
          expect(messages.voice.recording).toBeDefined()
          expect(messages.voice.suggestions).toBeDefined()
        })

        it("should have errors section", () => {
          expect(messages.errors.generic).toBeDefined()
          expect(messages.errors.notFound).toBeDefined()
          expect(messages.errors.unauthorized).toBeDefined()
        })
      })
    })
  })

  describe("Locale Utilities", () => {
    it("should validate supported locales", () => {
      expect(isValidLocale("fr")).toBe(true)
      expect(isValidLocale("en")).toBe(true)
      expect(isValidLocale("es")).toBe(true)
      expect(isValidLocale("de")).toBe(true)
      expect(isValidLocale("invalid")).toBe(false)
      expect(isValidLocale("")).toBe(false)
    })

    it("should get messages for locale", () => {
      const messages = getMessages("en")
      expect(messages.common.loading).toBe("Loading...")
    })

    it("should fallback to English for unknown locale", () => {
      const messages = getMessages("invalid" as unknown as "en")
      expect(messages).toBeDefined()
    })

    it("should have locale display names", () => {
      expect(localeNames.fr).toBe("Francais")
      expect(localeNames.en).toBe("English")
      expect(localeNames.es).toBe("Espanol")
      expect(localeNames.de).toBe("Deutsch")
    })
  })

  describe("Pluralization Strings", () => {
    it("should have pluralization placeholders in English", () => {
      expect(en.dashboard.streakDays).toContain("{count")
      expect(en.dashboard.streakDays).toContain("plural")
    })

    it("should have pluralization placeholders in Spanish", () => {
      expect(es.dashboard.streakDays).toContain("{count")
      expect(es.dashboard.streakDays).toContain("plural")
    })

    it("should have pluralization placeholders in German", () => {
      expect(de.dashboard.streakDays).toContain("{count")
      expect(de.dashboard.streakDays).toContain("plural")
    })
  })

  describe("Interpolation Strings", () => {
    it("should have interpolation placeholders in English", () => {
      expect(en.dashboard.welcomeMessage).toContain("{name}")
      expect(en.children.age).toContain("{age}")
      expect(en.time.daysAgo).toContain("{count}")
    })

    it("should have interpolation placeholders in Spanish", () => {
      expect(es.dashboard.welcomeMessage).toContain("{name}")
      expect(es.children.age).toContain("{age}")
      expect(es.time.daysAgo).toContain("{count}")
    })

    it("should have interpolation placeholders in German", () => {
      expect(de.dashboard.welcomeMessage).toContain("{name}")
      expect(de.children.age).toContain("{age}")
      expect(de.time.daysAgo).toContain("{count}")
    })
  })
})

// ============================================================
// DATE FORMATTER TESTS
// ============================================================

import {
  getWeekdayName,
  getWeekdays,
  getMonthName,
  getMonths,
  formatRelativeTime,
  formatDate,
  formatTime,
  formatWithPattern,
  formatDuration,
  formatDateRange,
  parseDuration,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  createDateFormatter,
  DateFormatter,
} from "@/lib/i18n/date-formatter"

describe("Date Formatter", () => {
  const testDate = new Date("2024-06-15T14:30:00")

  describe("Weekday Names", () => {
    it("should return weekday names in French", () => {
      expect(getWeekdayName(testDate, "fr")).toBe("Samedi")
      expect(getWeekdayName(testDate, "fr", true)).toBe("Sam")
    })

    it("should return weekday names in English", () => {
      expect(getWeekdayName(testDate, "en")).toBe("Saturday")
      expect(getWeekdayName(testDate, "en", true)).toBe("Sat")
    })

    it("should return weekday names in Spanish", () => {
      expect(getWeekdayName(testDate, "es")).toBe("Sabado")
      expect(getWeekdayName(testDate, "es", true)).toBe("Sab")
    })

    it("should return weekday names in German", () => {
      expect(getWeekdayName(testDate, "de")).toBe("Samstag")
      expect(getWeekdayName(testDate, "de", true)).toBe("Sa")
    })

    it("should return all weekdays for locale", () => {
      const frWeekdays = getWeekdays("fr")
      expect(frWeekdays).toHaveLength(7)
      expect(frWeekdays[0]).toBe("Dimanche")

      const enWeekdays = getWeekdays("en")
      expect(enWeekdays).toHaveLength(7)
      expect(enWeekdays[0]).toBe("Sunday")
    })
  })

  describe("Month Names", () => {
    it("should return month names in French", () => {
      expect(getMonthName(testDate, "fr")).toBe("Juin")
      expect(getMonthName(testDate, "fr", true)).toBe("Juin")
    })

    it("should return month names in English", () => {
      expect(getMonthName(testDate, "en")).toBe("June")
      expect(getMonthName(testDate, "en", true)).toBe("Jun")
    })

    it("should return month names in Spanish", () => {
      expect(getMonthName(testDate, "es")).toBe("Junio")
    })

    it("should return month names in German", () => {
      expect(getMonthName(testDate, "de")).toBe("Juni")
    })

    it("should return all months for locale", () => {
      const frMonths = getMonths("fr")
      expect(frMonths).toHaveLength(12)
      expect(frMonths[0]).toBe("Janvier")

      const enMonths = getMonths("en")
      expect(enMonths).toHaveLength(12)
      expect(enMonths[0]).toBe("January")
    })
  })

  describe("Relative Time", () => {
    const now = new Date("2024-06-15T12:00:00").getTime()

    it("should format 'just now' for recent times", () => {
      const recent = now - 5 * 1000 // 5 seconds ago
      expect(formatRelativeTime(recent, "en", { now })).toBe("Just now")
      expect(formatRelativeTime(recent, "fr", { now })).toBe("A l'instant")
    })

    it("should format minutes ago", () => {
      const minutesAgo = now - 30 * 60 * 1000 // 30 minutes ago
      expect(formatRelativeTime(minutesAgo, "en", { now })).toContain("30 minutes ago")
      expect(formatRelativeTime(minutesAgo, "fr", { now })).toContain("30 minutes")
    })

    it("should format hours ago", () => {
      const hoursAgo = now - 5 * 60 * 60 * 1000 // 5 hours ago
      expect(formatRelativeTime(hoursAgo, "en", { now })).toContain("5 hours ago")
    })

    it("should format days ago", () => {
      const daysAgo = now - 3 * 24 * 60 * 60 * 1000 // 3 days ago
      expect(formatRelativeTime(daysAgo, "en", { now })).toContain("3 days ago")
    })

    it("should format future times", () => {
      const future = now + 2 * 24 * 60 * 60 * 1000 // 2 days from now
      expect(formatRelativeTime(future, "en", { now })).toBe("In 2 days")
    })

    it("should show today/tomorrow/yesterday", () => {
      // Now returns "Just now" since it's within the same second
      expect(formatRelativeTime(now, "en", { now })).toBe("Just now")

      // Tomorrow - need to set time far enough in the future to be tomorrow
      const tomorrowMidnight = new Date(now)
      tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)
      tomorrowMidnight.setHours(12, 0, 0, 0) // Set to noon tomorrow
      expect(formatRelativeTime(tomorrowMidnight.getTime(), "en", { now })).toBe("Tomorrow")

      // Yesterday - need to set time far enough in the past to be yesterday
      const yesterdayNoon = new Date(now)
      yesterdayNoon.setDate(yesterdayNoon.getDate() - 1)
      yesterdayNoon.setHours(12, 0, 0, 0) // Set to noon yesterday
      expect(formatRelativeTime(yesterdayNoon.getTime(), "en", { now })).toBe("Yesterday")
    })

    it("should format abbreviated times", () => {
      const minutesAgo = now - 30 * 60 * 1000
      expect(formatRelativeTime(minutesAgo, "en", { now, abbreviated: true })).toBe("30m")
    })
  })

  describe("Date Formatting", () => {
    it("should format dates in short style", () => {
      const result = formatDate(testDate, "en", { style: "short" })
      expect(result).toMatch(/6\/15\/24|6\.15\.24|15\/6\/24/)
    })

    it("should format dates in medium style", () => {
      const result = formatDate(testDate, "en", { style: "medium" })
      expect(result).toContain("Jun")
      expect(result).toContain("15")
      expect(result).toContain("2024")
    })

    it("should format dates in long style", () => {
      const result = formatDate(testDate, "en", { style: "long" })
      expect(result).toContain("June")
      expect(result).toContain("15")
      expect(result).toContain("2024")
    })

    it("should format dates in full style", () => {
      const result = formatDate(testDate, "en", { style: "full" })
      expect(result).toContain("Saturday")
      expect(result).toContain("June")
    })

    it("should include time when requested", () => {
      const result = formatDate(testDate, "en", { style: "medium", includeTime: true })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe("Time Formatting", () => {
    it("should format time in short style", () => {
      const result = formatTime(testDate, "en", { style: "short" })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("should format time in medium style with seconds", () => {
      const result = formatTime(testDate, "en", { style: "medium" })
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })
  })

  describe("Pattern Formatting", () => {
    it("should format with custom pattern", () => {
      expect(formatWithPattern(testDate, "YYYY-MM-DD", "en")).toBe("2024-06-15")
      expect(formatWithPattern(testDate, "DD/MM/YYYY", "en")).toBe("15/06/2024")
      expect(formatWithPattern(testDate, "HH:mm", "en")).toBe("14:30")
    })

    it("should include weekday in pattern", () => {
      expect(formatWithPattern(testDate, "dddd, MMMM D", "en")).toBe("Saturday, June 15")
    })

    it("should use locale-specific month names", () => {
      expect(formatWithPattern(testDate, "D MMMM YYYY", "fr")).toBe("15 Juin 2024")
      expect(formatWithPattern(testDate, "D MMMM YYYY", "de")).toBe("15 Juni 2024")
    })
  })

  describe("Duration Formatting", () => {
    it("should parse duration parts", () => {
      const ms = (2 * 24 + 5) * 60 * 60 * 1000 + 30 * 60 * 1000 // 2d 5h 30m
      const parts = parseDuration(ms)
      expect(parts.days).toBe(2)
      expect(parts.hours).toBe(5)
      expect(parts.minutes).toBe(30)
    })

    it("should format duration in short style", () => {
      const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000 // 2h 30m
      expect(formatDuration(ms, "en", { style: "short" })).toBe("2h 30m")
    })

    it("should limit max units", () => {
      const ms = 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000
      expect(formatDuration(ms, "en", { maxUnits: 1 })).toBe("2d")
    })
  })

  describe("Date Range Formatting", () => {
    it("should format same day range", () => {
      const start = new Date("2024-06-15")
      const end = new Date("2024-06-15")
      const result = formatDateRange(start, end, "en")
      expect(result).toContain("Jun")
      expect(result).toContain("15")
    })

    it("should format same month range", () => {
      const start = new Date("2024-06-15")
      const end = new Date("2024-06-20")
      const result = formatDateRange(start, end, "en")
      expect(result).toContain("Jun")
      expect(result).toContain("15-20")
    })

    it("should format same year range", () => {
      const start = new Date("2024-06-15")
      const end = new Date("2024-08-20")
      const result = formatDateRange(start, end, "en")
      expect(result).toContain("Jun")
      expect(result).toContain("Aug")
    })
  })

  describe("Date Utilities", () => {
    it("should check if same day", () => {
      const date1 = new Date("2024-06-15T10:00:00")
      const date2 = new Date("2024-06-15T18:00:00")
      const date3 = new Date("2024-06-16T10:00:00")

      expect(isSameDay(date1, date2)).toBe(true)
      expect(isSameDay(date1, date3)).toBe(false)
    })

    it("should check isToday", () => {
      expect(isToday(new Date())).toBe(true)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it("should check isTomorrow", () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isTomorrow(tomorrow)).toBe(true)
      expect(isTomorrow(new Date())).toBe(false)
    })

    it("should check isYesterday", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isYesterday(yesterday)).toBe(true)
      expect(isYesterday(new Date())).toBe(false)
    })

    it("should check isThisWeek", () => {
      expect(isThisWeek(new Date())).toBe(true)

      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      expect(isThisWeek(lastMonth)).toBe(false)
    })
  })

  describe("DateFormatter Class", () => {
    let formatter: DateFormatter

    beforeEach(() => {
      formatter = createDateFormatter("en")
    })

    it("should create formatter with locale", () => {
      expect(formatter.getLocale()).toBe("en")
    })

    it("should change locale", () => {
      formatter.setLocale("de")
      expect(formatter.getLocale()).toBe("de")
    })

    it("should format weekday name", () => {
      expect(formatter.weekdayName(testDate)).toBe("Saturday")
    })

    it("should format month name", () => {
      expect(formatter.monthName(testDate)).toBe("June")
    })

    it("should format dates", () => {
      const result = formatter.format(testDate, { style: "medium" })
      expect(result).toContain("Jun")
    })

    it("should format relative time", () => {
      const now = Date.now()
      const result = formatter.relative(now)
      expect(result).toBe("Just now")
    })

    it("should format duration", () => {
      const result = formatter.duration(2 * 60 * 60 * 1000)
      expect(result).toBe("2h")
    })

    it("should format with pattern", () => {
      const result = formatter.pattern(testDate, "YYYY-MM-DD")
      expect(result).toBe("2024-06-15")
    })
  })
})

// ============================================================
// LOCALIZATION CONSISTENCY TESTS
// ============================================================

describe("Localization Consistency", () => {
  const locales = ["en", "es", "de"] as const

  describe("Key Completeness", () => {
    const enKeys = getAllKeys(en)

    locales.forEach((locale) => {
      it(`should have all keys in ${locale} that exist in English`, () => {
        const messages = locale === "en" ? en : locale === "es" ? es : de
        const localeKeys = getAllKeys(messages)

        enKeys.forEach((key) => {
          expect(localeKeys).toContain(key)
        })
      })
    })
  })

  describe("No Empty Strings", () => {
    const translations = { en, es, de }

    Object.entries(translations).forEach(([locale, messages]) => {
      it(`should not have empty strings in ${locale}`, () => {
        const emptyKeys = findEmptyStrings(messages)
        expect(emptyKeys).toHaveLength(0)
      })
    })
  })

  describe("Interpolation Consistency", () => {
    it("should have consistent interpolation placeholders across locales", () => {
      // Check dashboard.welcomeMessage
      expect(extractPlaceholders(en.dashboard.welcomeMessage)).toEqual(["name"])
      expect(extractPlaceholders(es.dashboard.welcomeMessage)).toEqual(["name"])
      expect(extractPlaceholders(de.dashboard.welcomeMessage)).toEqual(["name"])

      // Check time.daysAgo
      expect(extractPlaceholders(en.time.daysAgo)).toEqual(["count"])
      expect(extractPlaceholders(es.time.daysAgo)).toEqual(["count"])
      expect(extractPlaceholders(de.time.daysAgo)).toEqual(["count"])
    })
  })
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getAllKeys(obj: unknown, prefix = ""): string[] {
  const keys: string[] = []

  if (obj === null || typeof obj !== "object") {
    return keys
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === "object" && value !== null) {
      keys.push(...getAllKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

function findEmptyStrings(obj: unknown, prefix = ""): string[] {
  const emptyKeys: string[] = []

  if (obj === null || typeof obj !== "object") {
    return emptyKeys
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === "object" && value !== null) {
      emptyKeys.push(...findEmptyStrings(value, fullKey))
    } else if (typeof value === "string" && value.trim() === "") {
      emptyKeys.push(fullKey)
    }
  }

  return emptyKeys
}

function extractPlaceholders(str: string): string[] {
  const matches = str.match(/\{(\w+)(?:,|\})/g) || []
  return matches.map((m) => m.replace(/[{},]/g, ""))
}
