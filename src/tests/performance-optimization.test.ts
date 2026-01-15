/**
 * Performance Optimization Module Tests
 * Tests for bundle analyzer, image optimization, critical CSS, and server component analysis
 */

import { describe, it, expect } from "vitest"
import {
  // Bundle Analyzer
  extractModuleName,
  detectHeavyImports,
  detectDuplicates,
  detectTreeShakingIssues,
  analyzeChunkSizes,
  analyzeFirstLoadSize,
  parseSize,
  formatBytes,
  shouldBeDynamicImport,
  getOptimizationPriority,
  sortByPriority,
  type ChunkInfo,
  type OptimizationSuggestion,
  SIZE_THRESHOLDS,
} from "@/lib/performance/bundle-analyzer"

import {
  // Image Optimization
  generateNextImageUrl,
  calculateAspectRatio,
  calculateResponsiveDimensions,
  getLazyLoadObserverOptions,
  getLoadingAttribute,
  generateBlurPlaceholder,
  calculateBandwidthSavings,
  estimateOptimalQuality,
  getRecommendedDimensions,
  DEFAULT_BREAKPOINTS,
} from "@/lib/performance/image-optimization"

import {
  // Critical CSS
  isCriticalSelector,
  parseCSS,
  minifyCSS,
  extractCriticalCSS,
  generateInlineStyleTag,
  extractCSSVariables,
  optimizeFontFace,
  extractMinWidth,
  isWithinBudget,
  getCSSStats,
  MAX_CRITICAL_CSS_SIZE,
  type CSSRule,
} from "@/lib/performance/critical-css"

import {
  // Server Component Analyzer
  analyzeComponentSource,
  extractComponentName,
  calculateOptimizationPriority as calcComponentPriority,
  generateAuditReport,
  formatAuditReportMarkdown,
  type ComponentAnalysis,
} from "@/lib/performance/server-component-analyzer"

// =============================================================================
// Bundle Analyzer Tests
// =============================================================================

describe("Bundle Analyzer Module", () => {
  describe("extractModuleName", () => {
    it("should extract simple module names", () => {
      expect(extractModuleName("lodash")).toBe("lodash")
      expect(extractModuleName("react")).toBe("react")
    })

    it("should extract scoped package names", () => {
      expect(extractModuleName("@mui/material")).toBe("@mui/material")
      expect(extractModuleName("@tanstack/react-query")).toBe("@tanstack/react-query")
    })

    it("should extract from paths", () => {
      expect(extractModuleName("lodash/get")).toBe("lodash")
      expect(extractModuleName("@mui/material/Button")).toBe("@mui/material")
    })
  })

  describe("detectHeavyImports", () => {
    it("should detect known heavy modules", () => {
      const modules = ["moment", "lodash", "date-fns"]
      const suggestions = detectHeavyImports(modules)

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.module === "moment")).toBe(true)
    })

    it("should detect server-only modules in client bundle", () => {
      const modules = ["fs", "path", "crypto"]
      const suggestions = detectHeavyImports(modules)

      expect(suggestions.some(s => s.type === "error")).toBe(true)
    })

    it("should not flag lightweight modules", () => {
      const modules = ["react", "next", "zod"]
      const suggestions = detectHeavyImports(modules)

      expect(suggestions.length).toBe(0)
    })
  })

  describe("detectDuplicates", () => {
    it("should detect duplicate modules in node_modules", () => {
      const modules = [
        "node_modules/lodash/v1/index.js",
        "node_modules/lodash/v2/index.js",
      ]
      const suggestions = detectDuplicates(modules)

      expect(suggestions.length).toBe(1)
      expect(suggestions[0]?.type).toBe("warning")
    })

    it("should not flag unique modules", () => {
      const modules = [
        "node_modules/lodash/index.js",
        "node_modules/react/index.js",
      ]
      const suggestions = detectDuplicates(modules)

      expect(suggestions.length).toBe(0)
    })
  })

  describe("analyzeChunkSizes", () => {
    it("should flag chunks exceeding error threshold", () => {
      const chunks: ChunkInfo[] = [
        { name: "large-chunk", size: SIZE_THRESHOLDS.CHUNK_ERROR + 1, modules: [], isShared: false, isFirstLoad: false },
      ]
      const suggestions = analyzeChunkSizes(chunks)

      expect(suggestions.some(s => s.type === "error")).toBe(true)
    })

    it("should flag chunks exceeding warning threshold", () => {
      const chunks: ChunkInfo[] = [
        { name: "medium-chunk", size: SIZE_THRESHOLDS.CHUNK_WARNING + 1, modules: [], isShared: false, isFirstLoad: false },
      ]
      const suggestions = analyzeChunkSizes(chunks)

      expect(suggestions.some(s => s.type === "warning")).toBe(true)
    })

    it("should not flag small chunks", () => {
      const chunks: ChunkInfo[] = [
        { name: "small-chunk", size: 10 * 1024, modules: [], isShared: false, isFirstLoad: false },
      ]
      const suggestions = analyzeChunkSizes(chunks)

      expect(suggestions.length).toBe(0)
    })
  })

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B")
      expect(formatBytes(1024)).toBe("1 KB")
      expect(formatBytes(1024 * 1024)).toBe("1 MB")
      expect(formatBytes(1536)).toBe("1.5 KB")
    })
  })

  describe("parseSize", () => {
    it("should parse size strings to bytes", () => {
      expect(parseSize(1, "B")).toBe(1)
      expect(parseSize(1, "kB")).toBe(1024)
      expect(parseSize(1, "KB")).toBe(1024)
      expect(parseSize(1, "MB")).toBe(1024 * 1024)
    })
  })

  describe("sortByPriority", () => {
    it("should sort suggestions by priority", () => {
      const suggestions: OptimizationSuggestion[] = [
        { type: "info", message: "Info", impact: "low", action: "action" },
        { type: "error", message: "Error", impact: "high", action: "action" },
        { type: "warning", message: "Warning", impact: "medium", action: "action" },
      ]
      const sorted = sortByPriority(suggestions)

      expect(sorted[0]?.type).toBe("error")
      expect(sorted[1]?.type).toBe("warning")
      expect(sorted[2]?.type).toBe("info")
    })
  })
})

// =============================================================================
// Image Optimization Tests
// =============================================================================

describe("Image Optimization Module", () => {
  describe("generateNextImageUrl", () => {
    it("should generate correct Next.js image URL", () => {
      const url = generateNextImageUrl("/images/test.jpg", 800, 75)

      expect(url).toContain("/_next/image")
      expect(url).toContain("w=800")
      expect(url).toContain("q=75")
    })

    it("should encode external URLs", () => {
      const url = generateNextImageUrl("https://example.com/image.jpg", 800)

      expect(url).toContain(encodeURIComponent("https://example.com/image.jpg"))
    })
  })

  describe("calculateAspectRatio", () => {
    it("should calculate correct aspect ratios", () => {
      expect(calculateAspectRatio(1920, 1080)).toBeCloseTo(16 / 9)
      expect(calculateAspectRatio(800, 800)).toBe(1)
      expect(calculateAspectRatio(600, 400)).toBe(1.5)
    })
  })

  describe("calculateResponsiveDimensions", () => {
    it("should maintain aspect ratio", () => {
      const result = calculateResponsiveDimensions(1920, 1080, 960)

      expect(result.width).toBe(960)
      expect(result.height).toBe(540)
    })
  })

  describe("getLazyLoadObserverOptions", () => {
    it("should return valid intersection observer options", () => {
      const options = getLazyLoadObserverOptions()

      expect(options.root).toBeNull()
      expect(options.rootMargin).toBeDefined()
      expect(options.threshold).toBeDefined()
    })
  })

  describe("getLoadingAttribute", () => {
    it("should return eager for priority images", () => {
      expect(getLoadingAttribute(true, true)).toBe("eager")
      expect(getLoadingAttribute(true, false)).toBe("eager")
    })

    it("should return lazy when native supported", () => {
      expect(getLoadingAttribute(false, true)).toBe("lazy")
    })

    it("should return undefined when not supported", () => {
      expect(getLoadingAttribute(false, false)).toBeUndefined()
    })
  })

  describe("generateBlurPlaceholder", () => {
    it("should generate valid data URL", () => {
      const placeholder = generateBlurPlaceholder(10, 10, "#e5e7eb")

      expect(placeholder).toMatch(/^data:image\/svg\+xml;base64,/)
    })
  })

  describe("calculateBandwidthSavings", () => {
    it("should calculate correct savings", () => {
      const result = calculateBandwidthSavings(100, 50)

      expect(result.saved).toBe(50)
      expect(result.percentage).toBe(50)
    })

    it("should handle no savings", () => {
      const result = calculateBandwidthSavings(100, 100)

      expect(result.saved).toBe(0)
      expect(result.percentage).toBe(0)
    })
  })

  describe("estimateOptimalQuality", () => {
    it("should return higher quality for smaller images", () => {
      const smallQuality = estimateOptimalQuality(100, 100)
      const largeQuality = estimateOptimalQuality(2000, 2000)

      expect(smallQuality).toBeGreaterThan(largeQuality)
    })
  })

  describe("getRecommendedDimensions", () => {
    it("should return breakpoint dimensions", () => {
      const result = getRecommendedDimensions(300, 1)

      expect(DEFAULT_BREAKPOINTS.some(bp => bp.width === result)).toBe(true)
    })

    it("should account for device pixel ratio", () => {
      const singleDpr = getRecommendedDimensions(300, 1)
      const doubleDpr = getRecommendedDimensions(300, 2)

      expect(doubleDpr).toBeGreaterThanOrEqual(singleDpr)
    })
  })
})

// =============================================================================
// Critical CSS Tests
// =============================================================================

describe("Critical CSS Module", () => {
  describe("isCriticalSelector", () => {
    it("should identify critical selectors", () => {
      expect(isCriticalSelector("body")).toBe(true)
      expect(isCriticalSelector("html")).toBe(true)
      expect(isCriticalSelector(".header")).toBe(true)
      expect(isCriticalSelector("h1")).toBe(true)
    })

    it("should identify deferred selectors", () => {
      expect(isCriticalSelector(".modal")).toBe(false)
      expect(isCriticalSelector(".footer")).toBe(false)
      expect(isCriticalSelector(".tooltip")).toBe(false)
    })

    it("should respect custom selectors", () => {
      expect(isCriticalSelector(".custom", [".custom"], [])).toBe(true)
      expect(isCriticalSelector(".header", [], [".header"])).toBe(false)
    })
  })

  describe("parseCSS", () => {
    it("should parse CSS rules", () => {
      const css = ".test { color: red; } .other { margin: 0; }"
      const rules = parseCSS(css)

      expect(rules.length).toBe(2)
      expect(rules[0]?.selector).toBe(".test")
      expect(rules[0]?.declarations).toBe("color: red;")
    })

    it("should handle empty CSS", () => {
      const rules = parseCSS("")

      expect(rules.length).toBe(0)
    })
  })

  describe("minifyCSS", () => {
    it("should minify CSS correctly", () => {
      const css = `
        .test {
          color: red;
          margin: 0;
        }
      `
      const minified = minifyCSS(css)

      expect(minified).not.toContain("\n")
      expect(minified).toBe(".test{color:red;margin:0}")
    })

    it("should remove comments", () => {
      const css = "/* comment */ .test { color: red; }"
      const minified = minifyCSS(css)

      expect(minified).not.toContain("comment")
    })
  })

  describe("extractCriticalCSS", () => {
    it("should separate critical and deferred CSS", () => {
      const rules: CSSRule[] = [
        { selector: "body", declarations: "margin: 0", isCritical: false },
        { selector: ".modal", declarations: "display: none", isCritical: false },
      ]
      const result = extractCriticalCSS(rules)

      expect(result.critical).toContain("body")
      expect(result.deferred).toContain(".modal")
    })

    it("should track sizes", () => {
      const rules: CSSRule[] = [
        { selector: "body", declarations: "margin: 0", isCritical: false },
      ]
      const result = extractCriticalCSS(rules)

      expect(result.criticalSize).toBeGreaterThan(0)
      expect(result.totalSize).toBeGreaterThan(0)
    })
  })

  describe("generateInlineStyleTag", () => {
    it("should generate valid style tag", () => {
      const tag = generateInlineStyleTag(".test { color: red; }")

      expect(tag).toMatch(/^<style id="critical-css">/)
      expect(tag).toMatch(/<\/style>$/)
    })
  })

  describe("extractCSSVariables", () => {
    it("should extract CSS variables", () => {
      const css = ":root { --color-primary: blue; --spacing: 16px; }"
      const variables = extractCSSVariables(css)

      expect(variables.get("--color-primary")).toBe("blue")
      expect(variables.get("--spacing")).toBe("16px")
    })
  })

  describe("optimizeFontFace", () => {
    it("should add font-display: swap", () => {
      const css = "@font-face { font-family: Test; src: url(test.woff2); }"
      const optimized = optimizeFontFace(css)

      expect(optimized).toContain("font-display:swap")
    })

    it("should not duplicate font-display", () => {
      const css = "@font-face { font-family: Test; src: url(test.woff2); font-display: optional; }"
      const optimized = optimizeFontFace(css)

      expect(optimized.match(/font-display/g)?.length).toBe(1)
    })
  })

  describe("extractMinWidth", () => {
    it("should extract min-width values", () => {
      expect(extractMinWidth("(min-width: 768px)")).toBe(768)
      expect(extractMinWidth("(min-width: 1024px)")).toBe(1024)
    })

    it("should return 0 for no min-width", () => {
      expect(extractMinWidth("(max-width: 768px)")).toBe(0)
    })
  })

  describe("isWithinBudget", () => {
    it("should check budget correctly", () => {
      const smallCSS = "body { margin: 0; }"
      const largeCSS = "x".repeat(MAX_CRITICAL_CSS_SIZE + 1)

      expect(isWithinBudget(smallCSS)).toBe(true)
      expect(isWithinBudget(largeCSS)).toBe(false)
    })
  })

  describe("getCSSStats", () => {
    it("should return correct stats", () => {
      const css = ".a { color: red; margin: 0; } .b { padding: 0; }"
      const stats = getCSSStats(css)

      expect(stats.rules).toBe(2)
      expect(stats.selectors).toBe(2)
      expect(stats.declarations).toBe(3)
      expect(stats.size).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// Server Component Analyzer Tests
// =============================================================================

describe("Server Component Analyzer Module", () => {
  describe("analyzeComponentSource", () => {
    it("should detect hooks usage", () => {
      const source = `
        'use client'
        export function Component() {
          const [state, setState] = useState(0)
          return <div>{state}</div>
        }
      `
      const analysis = analyzeComponentSource(source, "Component.tsx")

      expect(analysis.hasClientDirective).toBe(true)
      expect(analysis.reasons).toContain("hooks")
    })

    it("should detect event handlers", () => {
      const source = `
        'use client'
        export function Component() {
          return <button onClick={() => {}}>Click</button>
        }
      `
      const analysis = analyzeComponentSource(source, "Component.tsx")

      expect(analysis.reasons).toContain("event_handlers")
    })

    it("should identify potential server components", () => {
      const source = `
        'use client'
        export function Component() {
          return <div>Static content</div>
        }
      `
      const analysis = analyzeComponentSource(source, "Component.tsx")

      expect(analysis.couldBeServer).toBe(true)
    })

    it("should detect browser APIs", () => {
      const source = `
        'use client'
        export function Component() {
          const width = window.innerWidth
          return <div>{width}</div>
        }
      `
      const analysis = analyzeComponentSource(source, "Component.tsx")

      expect(analysis.reasons).toContain("browser_apis")
    })
  })

  describe("extractComponentName", () => {
    it("should extract from export default function", () => {
      const source = "export default function MyComponent() { return null }"

      expect(extractComponentName(source, "test.tsx")).toBe("MyComponent")
    })

    it("should fallback to filename", () => {
      const source = "const x = 1"

      expect(extractComponentName(source, "MyComponent.tsx")).toBe("MyComponent")
    })
  })

  describe("calculateOptimizationPriority", () => {
    it("should give highest priority to convertible components", () => {
      const convertible: ComponentAnalysis = {
        filePath: "test.tsx",
        componentName: "Test",
        hasClientDirective: true,
        reasons: [],
        couldBeServer: true,
        suggestions: [],
        bundleImpact: "high",
      }

      const nonConvertible: ComponentAnalysis = {
        filePath: "test2.tsx",
        componentName: "Test2",
        hasClientDirective: true,
        reasons: ["hooks", "event_handlers"],
        couldBeServer: false,
        suggestions: [],
        bundleImpact: "low",
      }

      expect(calcComponentPriority(convertible)).toBeGreaterThan(
        calcComponentPriority(nonConvertible)
      )
    })
  })

  describe("generateAuditReport", () => {
    it("should generate correct summary", () => {
      const analyses: ComponentAnalysis[] = [
        {
          filePath: "a.tsx",
          componentName: "A",
          hasClientDirective: true,
          reasons: ["hooks"],
          couldBeServer: false,
          suggestions: [],
          bundleImpact: "low",
        },
        {
          filePath: "b.tsx",
          componentName: "B",
          hasClientDirective: false,
          reasons: [],
          couldBeServer: false,
          suggestions: [],
          bundleImpact: "low",
        },
      ]

      const report = generateAuditReport(analyses)

      expect(report.totalComponents).toBe(2)
      expect(report.clientComponents).toBe(1)
      expect(report.serverComponents).toBe(1)
    })
  })

  describe("formatAuditReportMarkdown", () => {
    it("should generate markdown report", () => {
      const analyses: ComponentAnalysis[] = [
        {
          filePath: "test.tsx",
          componentName: "Test",
          hasClientDirective: true,
          reasons: [],
          couldBeServer: true,
          suggestions: ["Remove use client"],
          bundleImpact: "high",
        },
      ]

      const report = generateAuditReport(analyses)
      const markdown = formatAuditReportMarkdown(report)

      expect(markdown).toContain("# Server Component Audit Report")
      expect(markdown).toContain("## Summary")
      expect(markdown).toContain("Test")
    })
  })
})
