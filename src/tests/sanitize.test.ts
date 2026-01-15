import { describe, it, expect } from "vitest"
import {
  escapeHtml,
  stripHtml,
  sanitizeHtml,
  detectSqlInjection,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeText,
  normalizeWhitespace,
  isValidTaskTitle,
  isValidDescription,
  sanitizeSearchQuery,
  safeJsonParse,
} from "@/lib/sanitize"

describe("HTML Sanitization", () => {
  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
      )
    })

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("")
    })
  })

  describe("stripHtml", () => {
    it("should remove all HTML tags", () => {
      expect(stripHtml("<p>Hello <strong>World</strong></p>")).toBe("Hello World")
    })
  })

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      expect(sanitizeHtml("<p>Safe</p><script>alert('xss')</script>")).toBe("<p>Safe</p>")
    })

    it("should remove event handlers", () => {
      expect(sanitizeHtml('<div onclick="alert(1)">Test</div>')).toBe("<div>Test</div>")
    })
  })
})

describe("SQL Injection Detection", () => {
  it("should detect SELECT injection", () => {
    expect(detectSqlInjection("'; SELECT * FROM users --")).toBe(true)
  })

  it("should detect OR 1=1", () => {
    expect(detectSqlInjection("' OR 1=1 --")).toBe(true)
  })

  it("should not flag normal text", () => {
    expect(detectSqlInjection("Hello World")).toBe(false)
  })

  it("should not flag text with FROM in normal context", () => {
    expect(detectSqlInjection("Pick up Emma from school")).toBe(false)
  })
})

describe("URL Sanitization", () => {
  it("should allow https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com")
  })

  it("should block javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("")
  })

  it("should allow relative URLs", () => {
    expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page")
  })
})

describe("Filename Sanitization", () => {
  it("should remove special characters", () => {
    expect(sanitizeFilename("file<>name.txt")).toBe("file__name.txt")
  })

  it("should prevent path traversal", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("_._._etc_passwd")
  })
})

describe("General Sanitization", () => {
  it("should normalize whitespace", () => {
    expect(normalizeWhitespace("hello    world")).toBe("hello world")
  })

  it("should sanitize text", () => {
    const result = sanitizeText("<script>  alert('xss')  </script>")
    expect(result).not.toContain("<script>")
  })
})

describe("Validation Helpers", () => {
  it("should accept valid titles", () => {
    expect(isValidTaskTitle("Pick up Emma from school")).toBe(true)
  })

  it("should reject empty titles", () => {
    expect(isValidTaskTitle("")).toBe(false)
  })

  it("should reject SQL injection in titles", () => {
    expect(isValidTaskTitle("'; DROP TABLE tasks; --")).toBe(false)
  })

  it("should accept valid descriptions", () => {
    expect(isValidDescription("This is a test")).toBe(true)
  })

  it("should accept empty descriptions", () => {
    expect(isValidDescription("")).toBe(true)
  })

  it("should sanitize search queries", () => {
    expect(sanitizeSearchQuery("  hello   world  ")).toBe("hello world")
  })

  it("should return empty for SQL injection in search", () => {
    expect(sanitizeSearchQuery("'; SELECT * FROM users --")).toBe("")
  })
})

describe("JSON Parsing", () => {
  it("should parse valid JSON", () => {
    const result = safeJsonParse<{ name: string }>('{"name": "test"}')
    expect(result.success).toBe(true)
  })

  it("should reject invalid JSON", () => {
    const result = safeJsonParse("not json")
    expect(result.success).toBe(false)
  })
})
