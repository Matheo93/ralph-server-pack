/**
 * Advanced Input Validation Library
 *
 * Provides comprehensive protection against:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection patterns
 * - NoSQL injection patterns
 * - Path traversal attacks
 * - File upload vulnerabilities
 * - Command injection
 */

import { z } from "zod"

// ============================================================
// CONSTANTS
// ============================================================

/** Maximum input sizes */
export const INPUT_LIMITS = {
  text: 500,
  title: 200,
  description: 5000,
  email: 254,
  url: 2048,
  filename: 255,
  searchQuery: 200,
  json: 1024 * 1024, // 1MB
} as const

/** Allowed file types for uploads */
export const ALLOWED_FILE_TYPES = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  documents: ["application/pdf", "text/plain"],
  audio: ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"],
} as const

/** Maximum file sizes in bytes */
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  audio: 50 * 1024 * 1024, // 50MB
} as const

// ============================================================
// XSS SANITIZATION
// ============================================================

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
}

/**
 * Escapes HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Decodes HTML entities
 */
export function unescapeHtml(input: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
    "&nbsp;": " ",
  }
  return input.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity)
}

/**
 * Removes all HTML tags
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()
}

/**
 * Sanitizes HTML allowing only safe tags
 */
export function sanitizeHtml(
  input: string,
  options: {
    allowedTags?: string[]
    allowedAttributes?: Record<string, string[]>
  } = {}
): string {
  const {
    allowedTags = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    allowedAttributes = { a: ["href", "title"] },
  } = options

  let sanitized = input

  // Remove script tags and content
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  )

  // Remove style tags and content
  sanitized = sanitized.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    ""
  )

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, "")
  sanitized = sanitized.replace(/data:[^,]*,[^"']*/gi, "")
  sanitized = sanitized.replace(/vbscript:/gi, "")

  // Remove dangerous tags
  const dangerousTags = [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "frame",
    "frameset",
    "meta",
    "link",
    "base",
    "applet",
    "svg",
    "math",
  ]

  for (const tag of dangerousTags) {
    if (!allowedTags.includes(tag)) {
      const regex = new RegExp(
        `<${tag}\\b[^>]*>.*?</${tag}>|<${tag}\\b[^>]*/>|<${tag}\\b[^>]*>`,
        "gi"
      )
      sanitized = sanitized.replace(regex, "")
    }
  }

  // Remove disallowed tags while keeping content
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
  sanitized = sanitized.replace(tagPattern, (match, tagName: string) => {
    const tag = tagName.toLowerCase()
    if (!allowedTags.includes(tag)) {
      return ""
    }

    // For allowed tags, filter attributes
    if (allowedAttributes[tag]) {
      const allowedAttrs = allowedAttributes[tag]
      const attrPattern = /\s+([a-z][a-z0-9-]*)\s*=\s*["']([^"']*)["']/gi
      let cleanTag = `<${match.startsWith("</") ? "/" : ""}${tag}`

      let attrMatch
      while ((attrMatch = attrPattern.exec(match)) !== null) {
        const attrName = attrMatch[1]!.toLowerCase()
        const attrValue = attrMatch[2]!
        if (allowedAttrs.includes(attrName)) {
          // Additional validation for href
          if (attrName === "href") {
            const sanitizedUrl = sanitizeUrl(attrValue)
            if (sanitizedUrl) {
              cleanTag += ` ${attrName}="${escapeHtml(sanitizedUrl)}"`
            }
          } else {
            cleanTag += ` ${attrName}="${escapeHtml(attrValue)}"`
          }
        }
      }

      cleanTag += match.includes("/>") ? "/>" : ">"
      return cleanTag
    }

    return match
  })

  return sanitized.trim()
}

// ============================================================
// SQL INJECTION DETECTION
// ============================================================

const SQL_INJECTION_PATTERNS = [
  // SELECT/INSERT/UPDATE/DELETE with FROM/INTO/TABLE
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
  // SQL comments
  /(--|\/\*|\*\/)/,
  // Quote followed by semicolon or boolean operators
  /['"](\s*)(;|\bOR\b|\bAND\b)/i,
  // Hex values (common in SQL injection)
  /0x[0-9a-fA-F]+/,
  // NULL bytes
  /\x00/,
  // Boolean-based injection
  /(\bOR\b\s*\d+\s*=\s*\d+)/i,
  /(\bAND\b\s*\d+\s*=\s*\d+)/i,
  // String-based injection
  /(\bOR\b\s*['"][^'"]*['"]\s*=\s*['"][^'"]*['"])/i,
  /(\bAND\b\s*['"][^'"]*['"]\s*=\s*['"][^'"]*['"])/i,
  // EXEC/EXECUTE
  /\b(EXEC|EXECUTE|DECLARE|CAST)\b/i,
  // Time-based blind injection
  /\b(SLEEP|WAITFOR|DELAY|BENCHMARK)\b/i,
  // Information schema
  /\b(INFORMATION_SCHEMA|SYS\.)\b/i,
]

/**
 * Detects potential SQL injection patterns
 */
export function detectSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Escapes SQL special characters (for logging/display only - use parameterized queries!)
 */
export function escapeSqlString(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\x00/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z")
}

// ============================================================
// NOSQL INJECTION DETECTION
// ============================================================

const NOSQL_INJECTION_PATTERNS = [
  // MongoDB operators (with or without quotes)
  /['"]\$where['"]\s*:/i,
  /['"]\$gt['"]\s*:/i,
  /['"]\$lt['"]\s*:/i,
  /['"]\$ne['"]\s*:/i,
  /['"]\$nin['"]\s*:/i,
  /['"]\$regex['"]\s*:/i,
  /['"]\$or['"]\s*:/i,
  /['"]\$and['"]\s*:/i,
  // Also check without quotes (JS object literal)
  /\$where\s*:/i,
  /\$gt\s*:/i,
  /\$lt\s*:/i,
  /\$ne\s*:/i,
  // JSON injection in strings
  /["']\s*:\s*{/,
  /{\s*['"]\$[a-z]+['"]\s*:/i,
  // Function injection
  /function\s*\(/i,
]

/**
 * Detects potential NoSQL injection patterns
 */
export function detectNoSqlInjection(input: string): boolean {
  return NOSQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

// ============================================================
// PATH TRAVERSAL DETECTION
// ============================================================

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,
  /%2e%2e%5c/i,
  /\.\.%5c/i,
  /%252e%252e/i,
  /\.\./,
]

/**
 * Detects potential path traversal attempts
 */
export function detectPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Sanitizes a filename removing dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and traversal
  let sanitized = filename
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/[<>:"|?*\x00-\x1f]/g, "")

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "")

  // Replace multiple dots with single dot
  sanitized = sanitized.replace(/\.{2,}/g, ".")

  // Limit length
  if (sanitized.length > INPUT_LIMITS.filename) {
    const ext = sanitized.split(".").pop() || ""
    const name = sanitized.slice(0, INPUT_LIMITS.filename - ext.length - 1)
    sanitized = ext ? `${name}.${ext}` : name
  }

  return sanitized || "unnamed"
}

// ============================================================
// COMMAND INJECTION DETECTION
// ============================================================

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/,
  /\$\(/,
  /`[^`]*`/,
  /\|\|/,
  /&&/,
  /[<>]/,
  /\n/,
  /\r/,
]

/**
 * Detects potential command injection patterns
 */
export function detectCommandInjection(input: string): boolean {
  return COMMAND_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Escapes shell special characters
 */
export function escapeShell(input: string): string {
  return input.replace(/([;&|`$()\\<>!#*?"'\n\r\t])/g, "\\$1")
}

// ============================================================
// URL VALIDATION
// ============================================================

/**
 * Sanitizes a URL, removing dangerous protocols
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  const lower = trimmed.toLowerCase()

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"]
  if (dangerousProtocols.some((p) => lower.startsWith(p))) {
    return ""
  }

  // Allow safe protocols
  const safeProtocols = ["http://", "https://", "mailto:", "tel:"]
  const isAbsolute = safeProtocols.some((p) => lower.startsWith(p))
  const isRelative = trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")
  const isPlainPath = !trimmed.includes(":") || trimmed.indexOf(":") > 10

  if (isAbsolute || isRelative || isPlainPath) {
    return trimmed.slice(0, INPUT_LIMITS.url)
  }

  return ""
}

/**
 * Validates a URL is well-formed and uses HTTPS
 */
export function validateUrl(
  url: string,
  options: {
    requireHttps?: boolean
    allowedDomains?: string[]
    blockedDomains?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const { requireHttps = false, allowedDomains, blockedDomains } = options

  try {
    const parsed = new URL(url)

    // Protocol check
    if (requireHttps && parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS" }
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Invalid protocol" }
    }

    // Domain allowlist
    if (allowedDomains && !allowedDomains.includes(parsed.hostname)) {
      return { valid: false, error: "Domain not allowed" }
    }

    // Domain blocklist
    if (blockedDomains && blockedDomains.includes(parsed.hostname)) {
      return { valid: false, error: "Domain blocked" }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}

// ============================================================
// FILE UPLOAD VALIDATION
// ============================================================

export interface FileValidationOptions {
  allowedTypes?: string[]
  maxSize?: number
  allowedExtensions?: string[]
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
}

/**
 * Validates a file upload
 */
export function validateFileUpload(
  file: { name: string; type: string; size: number },
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    allowedTypes = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents],
    maxSize = MAX_FILE_SIZES.image,
    allowedExtensions,
  } = options

  // Size check
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum (${Math.round(maxSize / 1024 / 1024)}MB)`,
    }
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" }
  }

  // MIME type check
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed: ${file.type}` }
  }

  // Extension check
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (allowedExtensions && extension && !allowedExtensions.includes(extension)) {
    return { valid: false, error: `File extension not allowed: ${extension}` }
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name)

  return { valid: true, sanitizedFilename }
}

/**
 * Validates file magic bytes (should be called with actual file content)
 */
export function validateFileMagicBytes(
  buffer: Uint8Array,
  expectedType: string
): boolean {
  const signatures: Record<string, number[][]> = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
    "audio/mpeg": [
      [0xff, 0xfb],
      [0xff, 0xfa],
      [0xff, 0xf3],
      [0x49, 0x44, 0x33], // ID3
    ],
    "audio/wav": [[0x52, 0x49, 0x46, 0x46]], // RIFF
    "audio/webm": [[0x1a, 0x45, 0xdf, 0xa3]], // EBML
    "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]], // OggS
  }

  const typeSignatures = signatures[expectedType]
  if (!typeSignatures) {
    return true // Unknown type, skip validation
  }

  return typeSignatures.some((sig) => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        return false
      }
    }
    return true
  })
}

// ============================================================
// TEXT SANITIZATION
// ============================================================

/**
 * Removes control characters from text
 */
export function removeControlChars(input: string): string {
  // Keep newlines and tabs but remove other control chars
   
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

/**
 * Normalizes whitespace
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}

/**
 * Sanitizes text for safe display
 */
export function sanitizeText(input: string): string {
  let sanitized = removeControlChars(input)
  sanitized = normalizeWhitespace(sanitized)
  sanitized = escapeHtml(sanitized)
  return sanitized
}

/**
 * Sanitizes multiline text (preserves newlines)
 */
export function sanitizeMultilineText(input: string): string {
  let sanitized = removeControlChars(input)
  // Normalize only horizontal whitespace
  sanitized = sanitized.replace(/[^\S\n]+/g, " ")
  // Normalize multiple newlines
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n")
  sanitized = escapeHtml(sanitized.trim())
  return sanitized
}

// ============================================================
// JSON VALIDATION
// ============================================================

/**
 * Safely parses JSON with size limit
 */
export function safeJsonParse<T>(
  input: string,
  maxSize: number = INPUT_LIMITS.json
): { success: true; data: T } | { success: false; error: string } {
  if (input.length > maxSize) {
    return { success: false, error: `JSON exceeds maximum size (${Math.round(maxSize / 1024)}KB)` }
  }

  try {
    const data = JSON.parse(input) as T
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}

/**
 * Validates and sanitizes JSON object keys
 */
export function sanitizeJsonKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonKeys)
  }

  // Use Object.create(null) to avoid prototype pollution
  const result: Record<string, unknown> = Object.create(null)

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith("$")) {
      continue
    }
    // Skip __proto__, constructor, prototype
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue
    }
    // Sanitize key
    const sanitizedKey = key.replace(/[^\w.-]/g, "_").slice(0, 100)
    result[sanitizedKey] = sanitizeJsonKeys((obj as Record<string, unknown>)[key])
  }

  return result
}

// ============================================================
// ZOD SCHEMAS FOR COMMON INPUTS
// ============================================================

/**
 * Safe string schema with XSS protection
 */
export const safeStringSchema = z.string().transform((val) => sanitizeText(val))

/**
 * Email schema with normalization
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(INPUT_LIMITS.email, "Email too long")
  .transform((val) => val.toLowerCase().trim())

/**
 * URL schema with sanitization
 */
export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(INPUT_LIMITS.url, "URL too long")
  .refine((val) => {
    const sanitized = sanitizeUrl(val)
    return sanitized.length > 0
  }, "Invalid URL protocol")

/**
 * Task title schema
 */
export const taskTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(INPUT_LIMITS.title, "Title too long")
  .refine((val) => !detectSqlInjection(val), "Invalid characters in title")
  .transform((val) => sanitizeText(val))

/**
 * Description schema
 */
export const descriptionSchema = z
  .string()
  .max(INPUT_LIMITS.description, "Description too long")
  .refine((val) => !detectSqlInjection(val), "Invalid characters")
  .transform((val) => sanitizeMultilineText(val))
  .optional()

/**
 * Search query schema
 */
export const searchQuerySchema = z
  .string()
  .max(INPUT_LIMITS.searchQuery, "Search query too long")
  .refine((val) => !detectSqlInjection(val), "Invalid search query")
  .transform((val) => normalizeWhitespace(val))

/**
 * Filename schema
 */
export const filenameSchema = z
  .string()
  .max(INPUT_LIMITS.filename, "Filename too long")
  .refine((val) => !detectPathTraversal(val), "Invalid filename")
  .transform((val) => sanitizeFilename(val))

// ============================================================
// COMPOSITE VALIDATION
// ============================================================

export interface ValidationResult {
  valid: boolean
  sanitized: string
  errors: string[]
  threats: string[]
}

/**
 * Comprehensive input validation
 */
export function validateInput(
  input: string,
  options: {
    maxLength?: number
    allowHtml?: boolean
    checkSql?: boolean
    checkNoSql?: boolean
    checkPath?: boolean
    checkCommand?: boolean
  } = {}
): ValidationResult {
  const {
    maxLength = INPUT_LIMITS.text,
    allowHtml = false,
    checkSql = true,
    checkNoSql = true,
    checkPath = true,
    checkCommand = false,
  } = options

  const errors: string[] = []
  const threats: string[] = []
  let sanitized = input

  // Length check
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
    errors.push(`Input truncated to ${maxLength} characters`)
  }

  // SQL injection
  if (checkSql && detectSqlInjection(sanitized)) {
    threats.push("Potential SQL injection detected")
  }

  // NoSQL injection
  if (checkNoSql && detectNoSqlInjection(sanitized)) {
    threats.push("Potential NoSQL injection detected")
  }

  // Path traversal
  if (checkPath && detectPathTraversal(sanitized)) {
    threats.push("Potential path traversal detected")
  }

  // Command injection
  if (checkCommand && detectCommandInjection(sanitized)) {
    threats.push("Potential command injection detected")
  }

  // Sanitize
  sanitized = removeControlChars(sanitized)
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized)
  } else {
    sanitized = sanitizeHtml(sanitized)
  }

  return {
    valid: threats.length === 0,
    sanitized,
    errors,
    threats,
  }
}
