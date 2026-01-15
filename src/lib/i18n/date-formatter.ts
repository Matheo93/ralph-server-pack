/**
 * Date Formatter with Locale Support
 *
 * Provides locale-aware date formatting including:
 * - Localized date formats
 * - Relative time (e.g., "2 days ago")
 * - Day and month names
 * - Duration formatting
 */

// ============================================================
// TYPES
// ============================================================

export type SupportedLocale = "fr" | "en" | "es" | "de"

export interface RelativeTimeOptions {
  /** Current time (defaults to Date.now()) */
  now?: Date | number
  /** Whether to add "ago" suffix */
  addSuffix?: boolean
  /** Threshold for showing relative time (default: 30 days) */
  threshold?: number
  /** Use abbreviated units (e.g., "2d" vs "2 days") */
  abbreviated?: boolean
}

export interface FormatDateOptions {
  /** Format style */
  style?: "short" | "medium" | "long" | "full"
  /** Include time */
  includeTime?: boolean
  /** Time style when included */
  timeStyle?: "short" | "medium"
  /** Custom format pattern */
  pattern?: string
}

// ============================================================
// LOCALE DATA
// ============================================================

const WEEKDAYS: Record<SupportedLocale, string[]> = {
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"],
  de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
}

const WEEKDAYS_SHORT: Record<SupportedLocale, string[]> = {
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
}

const MONTHS: Record<SupportedLocale, string[]> = {
  fr: ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  de: ["Januar", "Februar", "Marz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
}

const MONTHS_SHORT: Record<SupportedLocale, string[]> = {
  fr: ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  de: ["Jan", "Feb", "Marz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
}

const RELATIVE_TIME_STRINGS: Record<SupportedLocale, {
  justNow: string
  secondsAgo: string
  minutesAgo: string
  hoursAgo: string
  daysAgo: string
  weeksAgo: string
  monthsAgo: string
  yearsAgo: string
  inSeconds: string
  inMinutes: string
  inHours: string
  inDays: string
  inWeeks: string
  inMonths: string
  inYears: string
  today: string
  tomorrow: string
  yesterday: string
}> = {
  fr: {
    justNow: "A l'instant",
    secondsAgo: "Il y a {count} secondes",
    minutesAgo: "Il y a {count} minutes",
    hoursAgo: "Il y a {count} heures",
    daysAgo: "Il y a {count} jours",
    weeksAgo: "Il y a {count} semaines",
    monthsAgo: "Il y a {count} mois",
    yearsAgo: "Il y a {count} ans",
    inSeconds: "Dans {count} secondes",
    inMinutes: "Dans {count} minutes",
    inHours: "Dans {count} heures",
    inDays: "Dans {count} jours",
    inWeeks: "Dans {count} semaines",
    inMonths: "Dans {count} mois",
    inYears: "Dans {count} ans",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    yesterday: "Hier",
  },
  en: {
    justNow: "Just now",
    secondsAgo: "{count} seconds ago",
    minutesAgo: "{count} minutes ago",
    hoursAgo: "{count} hours ago",
    daysAgo: "{count} days ago",
    weeksAgo: "{count} weeks ago",
    monthsAgo: "{count} months ago",
    yearsAgo: "{count} years ago",
    inSeconds: "In {count} seconds",
    inMinutes: "In {count} minutes",
    inHours: "In {count} hours",
    inDays: "In {count} days",
    inWeeks: "In {count} weeks",
    inMonths: "In {count} months",
    inYears: "In {count} years",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
  },
  es: {
    justNow: "Ahora mismo",
    secondsAgo: "Hace {count} segundos",
    minutesAgo: "Hace {count} minutos",
    hoursAgo: "Hace {count} horas",
    daysAgo: "Hace {count} dias",
    weeksAgo: "Hace {count} semanas",
    monthsAgo: "Hace {count} meses",
    yearsAgo: "Hace {count} anos",
    inSeconds: "En {count} segundos",
    inMinutes: "En {count} minutos",
    inHours: "En {count} horas",
    inDays: "En {count} dias",
    inWeeks: "En {count} semanas",
    inMonths: "En {count} meses",
    inYears: "En {count} anos",
    today: "Hoy",
    tomorrow: "Manana",
    yesterday: "Ayer",
  },
  de: {
    justNow: "Gerade eben",
    secondsAgo: "Vor {count} Sekunden",
    minutesAgo: "Vor {count} Minuten",
    hoursAgo: "Vor {count} Stunden",
    daysAgo: "Vor {count} Tagen",
    weeksAgo: "Vor {count} Wochen",
    monthsAgo: "Vor {count} Monaten",
    yearsAgo: "Vor {count} Jahren",
    inSeconds: "In {count} Sekunden",
    inMinutes: "In {count} Minuten",
    inHours: "In {count} Stunden",
    inDays: "In {count} Tagen",
    inWeeks: "In {count} Wochen",
    inMonths: "In {count} Monaten",
    inYears: "In {count} Jahren",
    today: "Heute",
    tomorrow: "Morgen",
    yesterday: "Gestern",
  },
}

const ABBREVIATED_UNITS: Record<SupportedLocale, {
  seconds: string
  minutes: string
  hours: string
  days: string
  weeks: string
  months: string
  years: string
}> = {
  fr: { seconds: "s", minutes: "min", hours: "h", days: "j", weeks: "sem", months: "mois", years: "ans" },
  en: { seconds: "s", minutes: "m", hours: "h", days: "d", weeks: "w", months: "mo", years: "y" },
  es: { seconds: "s", minutes: "min", hours: "h", days: "d", weeks: "sem", months: "mes", years: "a" },
  de: { seconds: "s", minutes: "Min", hours: "Std", days: "T", weeks: "Wo", months: "Mon", years: "J" },
}

// ============================================================
// DATE PART GETTERS
// ============================================================

/**
 * Get localized weekday name
 */
export function getWeekdayName(
  date: Date,
  locale: SupportedLocale = "fr",
  short: boolean = false
): string {
  const weekdays = short ? WEEKDAYS_SHORT[locale] : WEEKDAYS[locale]
  return weekdays[date.getDay()]!
}

/**
 * Get all weekday names for a locale
 */
export function getWeekdays(
  locale: SupportedLocale = "fr",
  short: boolean = false
): string[] {
  return short ? WEEKDAYS_SHORT[locale] : WEEKDAYS[locale]
}

/**
 * Get localized month name
 */
export function getMonthName(
  date: Date,
  locale: SupportedLocale = "fr",
  short: boolean = false
): string {
  const months = short ? MONTHS_SHORT[locale] : MONTHS[locale]
  return months[date.getMonth()]!
}

/**
 * Get all month names for a locale
 */
export function getMonths(
  locale: SupportedLocale = "fr",
  short: boolean = false
): string[] {
  return short ? MONTHS_SHORT[locale] : MONTHS[locale]
}

// ============================================================
// RELATIVE TIME
// ============================================================

/**
 * Time units in milliseconds
 */
const TIME_UNITS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  date: Date | number,
  locale: SupportedLocale = "fr",
  options: RelativeTimeOptions = {}
): string {
  const {
    now = Date.now(),
    threshold = 30 * TIME_UNITS.day,
    abbreviated = false,
  } = options

  const targetTime = typeof date === "number" ? date : date.getTime()
  const nowTime = typeof now === "number" ? now : now.getTime()
  const diff = targetTime - nowTime
  const absDiff = Math.abs(diff)
  const isPast = diff < 0

  const strings = RELATIVE_TIME_STRINGS[locale]
  const abbrev = ABBREVIATED_UNITS[locale]

  // If beyond threshold, return formatted date
  if (absDiff > threshold) {
    return formatDate(new Date(targetTime), locale, { style: "medium" })
  }

  // Calculate relative time - check granular times first
  if (absDiff < TIME_UNITS.minute) {
    if (absDiff < 10 * TIME_UNITS.second) {
      return strings.justNow
    }
    const count = Math.floor(absDiff / TIME_UNITS.second)
    if (abbreviated) {
      return `${count}${abbrev.seconds}`
    }
    return (isPast ? strings.secondsAgo : strings.inSeconds).replace("{count}", String(count))
  }

  if (absDiff < TIME_UNITS.hour) {
    const count = Math.floor(absDiff / TIME_UNITS.minute)
    if (abbreviated) {
      return `${count}${abbrev.minutes}`
    }
    return (isPast ? strings.minutesAgo : strings.inMinutes).replace("{count}", String(count))
  }

  if (absDiff < TIME_UNITS.day) {
    const count = Math.floor(absDiff / TIME_UNITS.hour)
    if (abbreviated) {
      return `${count}${abbrev.hours}`
    }
    return (isPast ? strings.hoursAgo : strings.inHours).replace("{count}", String(count))
  }

  // For day-level and beyond, check for today/tomorrow/yesterday
  const targetDate = new Date(targetTime)
  const nowDate = new Date(nowTime)

  if (isSameDay(targetDate, nowDate)) {
    return strings.today
  }

  const tomorrow = new Date(nowDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(targetDate, tomorrow)) {
    return strings.tomorrow
  }

  const yesterday = new Date(nowDate)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(targetDate, yesterday)) {
    return strings.yesterday
  }

  if (absDiff < TIME_UNITS.week) {
    const count = Math.floor(absDiff / TIME_UNITS.day)
    if (abbreviated) {
      return `${count}${abbrev.days}`
    }
    return (isPast ? strings.daysAgo : strings.inDays).replace("{count}", String(count))
  }

  if (absDiff < TIME_UNITS.month) {
    const count = Math.floor(absDiff / TIME_UNITS.week)
    if (abbreviated) {
      return `${count}${abbrev.weeks}`
    }
    return (isPast ? strings.weeksAgo : strings.inWeeks).replace("{count}", String(count))
  }

  if (absDiff < TIME_UNITS.year) {
    const count = Math.floor(absDiff / TIME_UNITS.month)
    if (abbreviated) {
      return `${count}${abbrev.months}`
    }
    return (isPast ? strings.monthsAgo : strings.inMonths).replace("{count}", String(count))
  }

  const count = Math.floor(absDiff / TIME_UNITS.year)
  if (abbreviated) {
    return `${count}${abbrev.years}`
  }
  return (isPast ? strings.yearsAgo : strings.inYears).replace("{count}", String(count))
}

// ============================================================
// DATE FORMATTING
// ============================================================

/**
 * Format date according to locale
 */
export function formatDate(
  date: Date | number,
  locale: SupportedLocale = "fr",
  options: FormatDateOptions = {}
): string {
  const { style = "medium", includeTime = false, timeStyle = "short", pattern } = options

  const d = typeof date === "number" ? new Date(date) : date

  // Use custom pattern if provided
  if (pattern) {
    return formatWithPattern(d, pattern, locale)
  }

  // Map our locale to BCP 47
  const bcp47Locale = getBcp47Locale(locale)

  const dateOptions: Intl.DateTimeFormatOptions = {}

  switch (style) {
    case "short":
      dateOptions.day = "numeric"
      dateOptions.month = "numeric"
      dateOptions.year = "2-digit"
      break
    case "medium":
      dateOptions.day = "numeric"
      dateOptions.month = "short"
      dateOptions.year = "numeric"
      break
    case "long":
      dateOptions.day = "numeric"
      dateOptions.month = "long"
      dateOptions.year = "numeric"
      break
    case "full":
      dateOptions.weekday = "long"
      dateOptions.day = "numeric"
      dateOptions.month = "long"
      dateOptions.year = "numeric"
      break
  }

  if (includeTime) {
    dateOptions.hour = "numeric"
    dateOptions.minute = "numeric"
    if (timeStyle === "medium") {
      dateOptions.second = "numeric"
    }
  }

  return new Intl.DateTimeFormat(bcp47Locale, dateOptions).format(d)
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | number,
  locale: SupportedLocale = "fr",
  options: { style?: "short" | "medium" } = {}
): string {
  const { style = "short" } = options
  const d = typeof date === "number" ? new Date(date) : date
  const bcp47Locale = getBcp47Locale(locale)

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
  }

  if (style === "medium") {
    timeOptions.second = "numeric"
  }

  return new Intl.DateTimeFormat(bcp47Locale, timeOptions).format(d)
}

/**
 * Format with custom pattern
 * Supported tokens: YYYY, YY, MMMM, MMM, MM, M, DD, D, dddd, ddd, HH, H, mm, m, ss, s
 */
export function formatWithPattern(
  date: Date,
  pattern: string,
  locale: SupportedLocale = "fr"
): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  const replacements: Record<string, string> = {
    YYYY: String(year),
    YY: String(year).slice(-2),
    MMMM: MONTHS[locale][month]!,
    MMM: MONTHS_SHORT[locale][month]!,
    MM: String(month + 1).padStart(2, "0"),
    M: String(month + 1),
    DD: String(day).padStart(2, "0"),
    D: String(day),
    dddd: WEEKDAYS[locale][date.getDay()]!,
    ddd: WEEKDAYS_SHORT[locale][date.getDay()]!,
    HH: String(hours).padStart(2, "0"),
    H: String(hours),
    mm: String(minutes).padStart(2, "0"),
    m: String(minutes),
    ss: String(seconds).padStart(2, "0"),
    s: String(seconds),
  }

  let result = pattern
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(token, "g"), value)
  }

  return result
}

// ============================================================
// DURATION FORMATTING
// ============================================================

export interface DurationParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/**
 * Parse duration in milliseconds into parts
 */
export function parseDuration(ms: number): DurationParts {
  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  return { days, hours, minutes, seconds }
}

/**
 * Format duration
 */
export function formatDuration(
  ms: number,
  locale: SupportedLocale = "fr",
  options: { style?: "short" | "long"; maxUnits?: number } = {}
): string {
  const { style = "short", maxUnits = 2 } = options
  const { days, hours, minutes, seconds } = parseDuration(ms)

  const abbrev = ABBREVIATED_UNITS[locale]
  const parts: string[] = []

  if (days > 0 && parts.length < maxUnits) {
    parts.push(style === "short" ? `${days}${abbrev.days}` : `${days} ${days === 1 ? "day" : "days"}`)
  }
  if (hours > 0 && parts.length < maxUnits) {
    parts.push(style === "short" ? `${hours}${abbrev.hours}` : `${hours} ${hours === 1 ? "hour" : "hours"}`)
  }
  if (minutes > 0 && parts.length < maxUnits) {
    parts.push(style === "short" ? `${minutes}${abbrev.minutes}` : `${minutes} ${minutes === 1 ? "minute" : "minutes"}`)
  }
  if (seconds > 0 && parts.length < maxUnits && parts.length === 0) {
    parts.push(style === "short" ? `${seconds}${abbrev.seconds}` : `${seconds} ${seconds === 1 ? "second" : "seconds"}`)
  }

  if (parts.length === 0) {
    return style === "short" ? `0${abbrev.seconds}` : "0 seconds"
  }

  return parts.join(" ")
}

// ============================================================
// DATE RANGE FORMATTING
// ============================================================

/**
 * Format a date range
 */
export function formatDateRange(
  start: Date,
  end: Date,
  locale: SupportedLocale = "fr",
  options: { style?: "short" | "medium" | "long" } = {}
): string {
  const { style = "medium" } = options

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const sameDay = sameMonth && start.getDate() === end.getDate()

  if (sameDay) {
    return formatDate(start, locale, { style })
  }

  if (sameMonth) {
    // Same month: "Jan 15-20, 2024"
    const monthStr = style === "short" ? MONTHS_SHORT[locale][start.getMonth()] : MONTHS[locale][start.getMonth()]
    return `${monthStr} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    // Same year: "Jan 15 - Feb 20, 2024"
    const startMonth = style === "short" ? MONTHS_SHORT[locale][start.getMonth()] : MONTHS[locale][start.getMonth()]
    const endMonth = style === "short" ? MONTHS_SHORT[locale][end.getMonth()] : MONTHS[locale][end.getMonth()]
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
  }

  // Different years
  return `${formatDate(start, locale, { style })} - ${formatDate(end, locale, { style })}`
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameDay(date, tomorrow)
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

/**
 * Check if date is in this week
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return date >= startOfWeek && date < endOfWeek
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get BCP 47 locale code
 */
function getBcp47Locale(locale: SupportedLocale): string {
  const map: Record<SupportedLocale, string> = {
    fr: "fr-FR",
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
  }
  return map[locale]
}

// ============================================================
// DATE FORMATTER CLASS
// ============================================================

/**
 * Date formatter instance for a specific locale
 */
export class DateFormatter {
  constructor(private locale: SupportedLocale = "fr") {}

  setLocale(locale: SupportedLocale): void {
    this.locale = locale
  }

  getLocale(): SupportedLocale {
    return this.locale
  }

  weekdayName(date: Date, short?: boolean): string {
    return getWeekdayName(date, this.locale, short)
  }

  monthName(date: Date, short?: boolean): string {
    return getMonthName(date, this.locale, short)
  }

  format(date: Date | number, options?: FormatDateOptions): string {
    return formatDate(date, this.locale, options)
  }

  formatTime(date: Date | number, options?: { style?: "short" | "medium" }): string {
    return formatTime(date, this.locale, options)
  }

  relative(date: Date | number, options?: RelativeTimeOptions): string {
    return formatRelativeTime(date, this.locale, options)
  }

  duration(ms: number, options?: { style?: "short" | "long"; maxUnits?: number }): string {
    return formatDuration(ms, this.locale, options)
  }

  range(start: Date, end: Date, options?: { style?: "short" | "medium" | "long" }): string {
    return formatDateRange(start, end, this.locale, options)
  }

  pattern(date: Date, pattern: string): string {
    return formatWithPattern(date, pattern, this.locale)
  }
}

/**
 * Create a date formatter for a locale
 */
export function createDateFormatter(locale: SupportedLocale = "fr"): DateFormatter {
  return new DateFormatter(locale)
}

/**
 * Default formatter (French)
 */
export const dateFormatter = new DateFormatter("fr")
