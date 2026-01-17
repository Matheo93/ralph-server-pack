/**
 * Input Sanitization Library
 *
 * Provides functions to sanitize user input and protect against:
 * - XSS (Cross-Site Scripting)
 * - HTML injection
 * - SQL injection patterns (defense in depth)
 */

// ============================================================
// HTML SANITIZATION
// ============================================================

export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  }
  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char)
}

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
}

export function sanitizeHtml(input: string): string {
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")
  sanitized = sanitized.replace(/javascript:/gi, "")
  sanitized = sanitized.replace(/data:/gi, "")
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

  const dangerousTags = ["script", "iframe", "object", "embed", "form", "input", "button", "select", "textarea", "frame", "frameset", "meta", "link", "base"]
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>|<${tag}\\b[^>]*/>|<${tag}\\b[^>]*>`, "gi")
    sanitized = sanitized.replace(regex, "")
  }
  return sanitized.trim()
}

// ============================================================
// SQL INJECTION PROTECTION
// ============================================================

export function detectSqlInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /(--|\/\*|\*\/)/,
    /('|")(\s*)(;|\bOR\b|\bAND\b)/i,
    /0x[0-9a-f]+/i,
    /\x00/,
    /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/i,
    /(\bOR\b\s*'[^']*'\s*=\s*'[^']*')/i,
  ]
  return patterns.some((pattern) => pattern.test(input))
}

// ============================================================
// URL SANITIZATION
// ============================================================

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return ""
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:") || trimmed.startsWith("/") || trimmed.startsWith("#") || !trimmed.includes(":")) {
    return url.trim()
  }
  return ""
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 255)
}

// ============================================================
// GENERAL SANITIZATION
// ============================================================

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}

export function removeControlChars(input: string): string {
   
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

export function sanitizeText(input: string): string {
  let sanitized = removeControlChars(input)
  sanitized = normalizeWhitespace(sanitized)
  sanitized = escapeHtml(sanitized)
  return sanitized
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

export function isValidTaskTitle(input: string): boolean {
  if (!input || input.trim().length === 0) return false
  if (input.length > 500) return false
  if (detectSqlInjection(input)) return false
  return true
}

export function isValidDescription(input: string): boolean {
  if (!input) return true
  if (input.length > 5000) return false
  if (detectSqlInjection(input)) return false
  return true
}

export function sanitizeSearchQuery(query: string): string {
  if (detectSqlInjection(query)) return ""
  return normalizeWhitespace(query).slice(0, 200)
}

export function safeJsonParse<T>(
  input: string,
  maxSize: number = 1024 * 1024
): { success: true; data: T } | { success: false; error: string } {
  if (input.length > maxSize) {
    return { success: false, error: "JSON too large" }
  }
  try {
    const data = JSON.parse(input) as T
    return { success: true, data }
  } catch {
    return { success: false, error: "Invalid JSON" }
  }
}
