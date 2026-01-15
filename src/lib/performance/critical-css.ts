/**
 * Critical CSS - Extract and inline above-the-fold styles
 * Utilities for optimizing CSS delivery and reducing render-blocking resources
 */

import { z } from "zod"

// ============================================================================
// Types and Schemas
// ============================================================================

export const CSSRuleSchema = z.object({
  selector: z.string(),
  declarations: z.string(),
  specificity: z.number().optional(),
  isCritical: z.boolean().default(false),
})
export type CSSRule = z.infer<typeof CSSRuleSchema>

export const CriticalCSSConfigSchema = z.object({
  viewportWidth: z.number().positive().default(1440),
  viewportHeight: z.number().positive().default(900),
  mobileWidth: z.number().positive().default(375),
  mobileHeight: z.number().positive().default(667),
  includeSelectors: z.array(z.string()).default([]),
  excludeSelectors: z.array(z.string()).default([]),
  timeout: z.number().positive().default(5000),
})
export type CriticalCSSConfig = z.infer<typeof CriticalCSSConfigSchema>

export const ExtractedCSSSchema = z.object({
  critical: z.string(),
  deferred: z.string(),
  criticalSize: z.number(),
  deferredSize: z.number(),
  totalSize: z.number(),
  extractedAt: z.string().datetime(),
})
export type ExtractedCSS = z.infer<typeof ExtractedCSSSchema>

// ============================================================================
// Constants
// ============================================================================

// Critical selectors that should always be inlined
export const ALWAYS_CRITICAL_SELECTORS = [
  "html",
  "body",
  ":root",
  "*",
  "*::before",
  "*::after",
  // Layout primitives
  ".container",
  ".wrapper",
  ".flex",
  ".grid",
  // Common critical classes
  ".header",
  ".nav",
  ".logo",
  ".hero",
  ".main",
  ".page",
  // Loading states
  ".skeleton",
  ".loading",
  ".spinner",
  // Typography base
  "h1",
  "h2",
  "h3",
  "p",
  "a",
  // Buttons (above fold)
  ".btn",
  ".button",
  // Form elements (if on landing)
  "input",
  "button",
] as const

// Selectors to always defer (below fold or non-essential)
export const ALWAYS_DEFERRED_SELECTORS = [
  ".modal",
  ".dialog",
  ".dropdown",
  ".tooltip",
  ".popover",
  ".toast",
  ".notification",
  ".sidebar",
  ".footer",
  ".comments",
  ".social-share",
  "[data-defer]",
  // Animation classes
  ".animate-",
  "@keyframes",
  // Print styles
  "@media print",
] as const

// Viewport breakpoints for critical CSS extraction
export const CRITICAL_VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const

// Maximum critical CSS size (14KB target for single TCP roundtrip)
export const MAX_CRITICAL_CSS_SIZE = 14 * 1024

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a CSS selector is critical
 */
export function isCriticalSelector(
  selector: string,
  customCritical: string[] = [],
  customDeferred: string[] = []
): boolean {
  // Check custom deferred first (higher priority)
  for (const deferred of customDeferred) {
    if (selector.includes(deferred)) {
      return false
    }
  }

  // Check always deferred
  for (const deferred of ALWAYS_DEFERRED_SELECTORS) {
    if (selector.includes(deferred)) {
      return false
    }
  }

  // Check custom critical
  for (const critical of customCritical) {
    if (selector.includes(critical)) {
      return true
    }
  }

  // Check always critical
  for (const critical of ALWAYS_CRITICAL_SELECTORS) {
    if (selector.startsWith(critical) || selector === critical) {
      return true
    }
  }

  return false
}

/**
 * Parse CSS string into rules
 */
export function parseCSS(css: string): CSSRule[] {
  const rules: CSSRule[] = []

  // Remove comments
  const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "")

  // Simple regex-based parser (for demonstration - real implementation would use postcss)
  const ruleRegex = /([^{]+)\{([^}]+)\}/g
  let match

  while ((match = ruleRegex.exec(cleanCSS)) !== null) {
    const selectorMatch = match[1]
    const declarationsMatch = match[2]
    const selector = selectorMatch?.trim()
    const declarations = declarationsMatch?.trim()

    if (selector && declarations) {
      rules.push({
        selector,
        declarations,
        isCritical: false,
      })
    }
  }

  return rules
}

/**
 * Minify CSS string
 */
export function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove newlines and extra spaces
    .replace(/\s+/g, " ")
    // Remove spaces around special characters
    .replace(/\s*([{};:,>~+])\s*/g, "$1")
    // Remove trailing semicolons before closing brace
    .replace(/;}/g, "}")
    // Remove leading/trailing whitespace
    .trim()
}

/**
 * Extract critical CSS from rules
 */
export function extractCriticalCSS(
  rules: CSSRule[],
  config: Partial<CriticalCSSConfig> = {}
): ExtractedCSS {
  const { includeSelectors = [], excludeSelectors = [] } = config

  const criticalRules: CSSRule[] = []
  const deferredRules: CSSRule[] = []

  for (const rule of rules) {
    const isCritical = isCriticalSelector(
      rule.selector,
      includeSelectors,
      excludeSelectors
    )

    if (isCritical) {
      criticalRules.push({ ...rule, isCritical: true })
    } else {
      deferredRules.push(rule)
    }
  }

  const criticalCSS = rulesToCSS(criticalRules)
  const deferredCSS = rulesToCSS(deferredRules)

  const minifiedCritical = minifyCSS(criticalCSS)
  const minifiedDeferred = minifyCSS(deferredCSS)

  return {
    critical: minifiedCritical,
    deferred: minifiedDeferred,
    criticalSize: new Blob([minifiedCritical]).size,
    deferredSize: new Blob([minifiedDeferred]).size,
    totalSize: new Blob([minifiedCritical + minifiedDeferred]).size,
    extractedAt: new Date().toISOString(),
  }
}

/**
 * Convert rules back to CSS string
 */
export function rulesToCSS(rules: CSSRule[]): string {
  return rules
    .map(rule => `${rule.selector} { ${rule.declarations} }`)
    .join("\n")
}

// ============================================================================
// Inline Critical CSS Utilities
// ============================================================================

/**
 * Generate inline style tag for critical CSS
 */
export function generateInlineStyleTag(css: string): string {
  const minified = minifyCSS(css)
  return `<style id="critical-css">${minified}</style>`
}

/**
 * Generate deferred CSS loading script
 */
export function generateDeferredCSSLoader(href: string): string {
  return `
<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="${href}"></noscript>
`
}

/**
 * Generate complete CSS loading strategy
 */
export function generateCSSLoadingStrategy(
  criticalCSS: string,
  stylesheetHrefs: string[]
): string {
  const parts: string[] = []

  // Inline critical CSS
  parts.push(generateInlineStyleTag(criticalCSS))

  // Deferred stylesheets
  for (const href of stylesheetHrefs) {
    parts.push(generateDeferredCSSLoader(href))
  }

  return parts.join("\n")
}

// ============================================================================
// CSS Optimization Utilities
// ============================================================================

/**
 * Remove unused CSS variables
 */
export function removeUnusedVariables(css: string, usedVariables: Set<string>): string {
  const variableRegex = /--([\w-]+):\s*([^;]+);/g

  return css.replace(variableRegex, (match, name) => {
    if (usedVariables.has(`--${name}`)) {
      return match
    }
    return ""
  })
}

/**
 * Extract CSS custom properties (variables) from CSS
 */
export function extractCSSVariables(css: string): Map<string, string> {
  const variables = new Map<string, string>()
  const variableRegex = /--([\w-]+):\s*([^;]+);/g
  let match

  while ((match = variableRegex.exec(css)) !== null) {
    const varName = match[1]
    const varValue = match[2]
    if (varName && varValue) {
      variables.set(`--${varName}`, varValue.trim())
    }
  }

  return variables
}

/**
 * Inline CSS variables in declarations
 */
export function inlineCSSVariables(
  css: string,
  variables: Map<string, string>
): string {
  let result = css

  for (const [name, value] of variables) {
    const varRegex = new RegExp(`var\\(${name}(?:,\\s*([^)]+))?\\)`, "g")
    result = result.replace(varRegex, value)
  }

  return result
}

/**
 * Optimize font-face declarations
 */
export function optimizeFontFace(css: string): string {
  // Add font-display: swap to all @font-face rules
  return css.replace(
    /@font-face\s*\{([^}]+)\}/g,
    (match, content) => {
      if (content.includes("font-display")) {
        return match
      }
      return `@font-face {${content.trim()};font-display:swap}`
    }
  )
}

// ============================================================================
// Media Query Handling
// ============================================================================

/**
 * Extract media queries from CSS
 */
export function extractMediaQueries(css: string): Map<string, string> {
  const mediaQueries = new Map<string, string>()
  const mediaRegex = /@media\s*([^{]+)\{([\s\S]*?)(?=@media|$)/g
  let match

  while ((match = mediaRegex.exec(css)) !== null) {
    const queryMatch = match[1]
    const contentMatch = match[2]
    if (queryMatch && contentMatch) {
      const query = queryMatch.trim()
      const content = contentMatch.trim()
      const existing = mediaQueries.get(query) || ""
      mediaQueries.set(query, existing + content)
    }
  }

  return mediaQueries
}

/**
 * Sort media queries by min-width (mobile-first)
 */
export function sortMediaQueries(mediaQueries: Map<string, string>): Map<string, string> {
  const entries = Array.from(mediaQueries.entries())

  entries.sort((a, b) => {
    const aWidth = extractMinWidth(a[0])
    const bWidth = extractMinWidth(b[0])
    return aWidth - bWidth
  })

  return new Map(entries)
}

/**
 * Extract min-width value from media query
 */
export function extractMinWidth(query: string): number {
  const match = query.match(/min-width:\s*(\d+)/)
  const width = match?.[1]
  return width ? parseInt(width, 10) : 0
}

// ============================================================================
// Critical CSS Presets for Common Components
// ============================================================================

/**
 * Generate critical CSS for skeleton loading
 */
export function generateSkeletonCSS(): string {
  return minifyCSS(`
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
    }
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `)
}

/**
 * Generate critical CSS for base typography
 */
export function generateTypographyCSS(): string {
  return minifyCSS(`
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.2;
      font-weight: 600;
    }
    a { color: inherit; text-decoration: none; }
    p { margin: 0; }
  `)
}

/**
 * Generate critical CSS for layout reset
 */
export function generateResetCSS(): string {
  return minifyCSS(`
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html { scroll-behavior: smooth; }
    body { min-height: 100vh; }
    img, picture, video, canvas, svg {
      display: block;
      max-width: 100%;
    }
    input, button, textarea, select {
      font: inherit;
    }
  `)
}

/**
 * Generate complete critical CSS bundle
 */
export function generateCriticalBundle(): string {
  return [
    generateResetCSS(),
    generateTypographyCSS(),
    generateSkeletonCSS(),
  ].join("")
}

// ============================================================================
// Size Analysis
// ============================================================================

/**
 * Check if critical CSS is within size budget
 */
export function isWithinBudget(css: string, budget: number = MAX_CRITICAL_CSS_SIZE): boolean {
  const size = new Blob([css]).size
  return size <= budget
}

/**
 * Calculate CSS size savings percentage
 */
export function calculateSavings(original: string, optimized: string): number {
  const originalSize = new Blob([original]).size
  const optimizedSize = new Blob([optimized]).size

  if (originalSize === 0) return 0
  return ((originalSize - optimizedSize) / originalSize) * 100
}

/**
 * Get CSS size breakdown
 */
export function getCSSStats(css: string): {
  size: number
  rules: number
  selectors: number
  declarations: number
} {
  const rules = parseCSS(css)
  const declarationCount = rules.reduce(
    (count, rule) => count + rule.declarations.split(";").filter(d => d.trim()).length,
    0
  )

  return {
    size: new Blob([css]).size,
    rules: rules.length,
    selectors: rules.reduce(
      (count, rule) => count + rule.selector.split(",").length,
      0
    ),
    declarations: declarationCount,
  }
}
