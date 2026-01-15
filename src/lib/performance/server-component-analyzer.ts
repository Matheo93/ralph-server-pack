/**
 * Server Component Analyzer
 * Utilities for auditing 'use client' directives and identifying optimization opportunities
 */

import { z } from "zod"

// ============================================================================
// Types and Schemas
// ============================================================================

export const ClientDirectiveReasonSchema = z.enum([
  "hooks",           // Uses React hooks (useState, useEffect, etc.)
  "event_handlers",  // Uses event handlers (onClick, onChange, etc.)
  "browser_apis",    // Uses browser APIs (window, document, etc.)
  "animations",      // Uses animation libraries (framer-motion, etc.)
  "third_party",     // Uses client-only third-party libraries
  "context",         // Uses React context (useContext)
  "refs",            // Uses refs for DOM manipulation
  "forms",           // Uses form state management
  "unknown",         // Unable to determine reason
])
export type ClientDirectiveReason = z.infer<typeof ClientDirectiveReasonSchema>

export const ComponentAnalysisSchema = z.object({
  filePath: z.string(),
  componentName: z.string(),
  hasClientDirective: z.boolean(),
  reasons: z.array(ClientDirectiveReasonSchema),
  couldBeServer: z.boolean(),
  suggestions: z.array(z.string()),
  bundleImpact: z.enum(["high", "medium", "low"]),
})
export type ComponentAnalysis = z.infer<typeof ComponentAnalysisSchema>

export const AuditReportSchema = z.object({
  totalComponents: z.number(),
  clientComponents: z.number(),
  serverComponents: z.number(),
  potentialOptimizations: z.number(),
  analyses: z.array(ComponentAnalysisSchema),
  timestamp: z.string().datetime(),
})
export type AuditReport = z.infer<typeof AuditReportSchema>

// ============================================================================
// Constants
// ============================================================================

// React hooks that require client component
export const CLIENT_HOOKS = [
  "useState",
  "useEffect",
  "useLayoutEffect",
  "useReducer",
  "useCallback",
  "useMemo",
  "useRef",
  "useContext",
  "useImperativeHandle",
  "useDebugValue",
  "useDeferredValue",
  "useTransition",
  "useId",
  "useSyncExternalStore",
  "useInsertionEffect",
] as const

// Event handlers that require client component
export const EVENT_HANDLERS = [
  "onClick",
  "onChange",
  "onSubmit",
  "onBlur",
  "onFocus",
  "onInput",
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
  "onMouseDown",
  "onMouseUp",
  "onMouseMove",
  "onMouseEnter",
  "onMouseLeave",
  "onTouchStart",
  "onTouchMove",
  "onTouchEnd",
  "onScroll",
  "onWheel",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onDrop",
  "onPointerDown",
  "onPointerUp",
  "onPointerMove",
] as const

// Browser APIs that require client component
export const BROWSER_APIS = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "location",
  "history",
  "fetch", // When used with AbortController
  "IntersectionObserver",
  "MutationObserver",
  "ResizeObserver",
  "matchMedia",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
] as const

// Libraries that typically require client component
export const CLIENT_LIBRARIES = [
  "framer-motion",
  "react-spring",
  "@dnd-kit",
  "react-beautiful-dnd",
  "react-hook-form",
  "formik",
  "@tanstack/react-query",
  "swr",
  "zustand",
  "jotai",
  "recoil",
  "redux",
  "@reduxjs/toolkit",
  "react-router",
  "next/router", // useRouter hook
  "next/navigation", // When using client-side navigation
] as const

// Patterns that can be moved to server
export const SERVER_COMPATIBLE_PATTERNS = [
  "Static content rendering",
  "Data fetching without interactivity",
  "Layout components without state",
  "Icon components",
  "Typography components",
  "Pure presentation components",
] as const

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze component source code for client directive necessity
 */
export function analyzeComponentSource(
  source: string,
  filePath: string
): ComponentAnalysis {
  const reasons: ClientDirectiveReason[] = []
  const suggestions: string[] = []

  const hasClientDirective = /['"]use client['"]/.test(source)
  const componentName = extractComponentName(source, filePath)

  // Check for hooks
  const usedHooks = CLIENT_HOOKS.filter(hook =>
    new RegExp(`\\b${hook}\\b`).test(source)
  )
  if (usedHooks.length > 0) {
    reasons.push("hooks")
  }

  // Check for event handlers
  const usedEventHandlers = EVENT_HANDLERS.filter(handler =>
    new RegExp(`\\b${handler}\\b`).test(source)
  )
  if (usedEventHandlers.length > 0) {
    reasons.push("event_handlers")
  }

  // Check for browser APIs
  const usedBrowserApis = BROWSER_APIS.filter(api =>
    new RegExp(`\\b${api}\\b`).test(source)
  )
  if (usedBrowserApis.length > 0) {
    reasons.push("browser_apis")
  }

  // Check for client libraries
  const usedClientLibs = CLIENT_LIBRARIES.filter(lib =>
    source.includes(lib)
  )
  if (usedClientLibs.length > 0) {
    reasons.push("third_party")
  }

  // Check for context
  if (/useContext|createContext/.test(source)) {
    reasons.push("context")
  }

  // Check for refs with DOM manipulation
  if (/useRef|createRef|forwardRef/.test(source) && /\.current\./.test(source)) {
    reasons.push("refs")
  }

  // Check for forms
  if (/useForm|useFormState|useFormStatus/.test(source)) {
    reasons.push("forms")
  }

  // Determine if could be server component
  const couldBeServer = hasClientDirective && reasons.length === 0

  // Generate suggestions
  if (couldBeServer) {
    suggestions.push(
      "This component has 'use client' but no detected client-side requirements. Consider removing the directive."
    )
  }

  if (reasons.includes("hooks") && usedHooks.length === 1 && usedHooks[0] === "useEffect") {
    suggestions.push(
      "Consider moving data fetching to server component and passing data as props."
    )
  }

  if (reasons.includes("event_handlers") && !reasons.includes("hooks")) {
    suggestions.push(
      "Component uses event handlers but no state. Consider extracting interactive parts to smaller client component."
    )
  }

  // Determine bundle impact
  let bundleImpact: "high" | "medium" | "low" = "low"
  const lineCount = source.split("\n").length

  if (lineCount > 200 || usedClientLibs.length > 2) {
    bundleImpact = "high"
  } else if (lineCount > 100 || usedClientLibs.length > 0) {
    bundleImpact = "medium"
  }

  if (reasons.length === 0 && hasClientDirective) {
    reasons.push("unknown")
  }

  return {
    filePath,
    componentName,
    hasClientDirective,
    reasons,
    couldBeServer,
    suggestions,
    bundleImpact,
  }
}

/**
 * Extract component name from source code
 */
export function extractComponentName(source: string, filePath: string): string {
  // Try to find export default function Name
  const defaultFunctionMatch = source.match(/export\s+default\s+function\s+(\w+)/)
  if (defaultFunctionMatch?.[1]) {
    return defaultFunctionMatch[1]
  }

  // Try to find export default const Name
  const defaultConstMatch = source.match(/export\s+default\s+(?:const\s+)?(\w+)/)
  if (defaultConstMatch?.[1]) {
    return defaultConstMatch[1]
  }

  // Try to find export function Name
  const exportFunctionMatch = source.match(/export\s+function\s+(\w+)/)
  if (exportFunctionMatch?.[1]) {
    return exportFunctionMatch[1]
  }

  // Fall back to filename
  const fileName = filePath.split("/").pop() || ""
  return fileName.replace(/\.(tsx?|jsx?)$/, "")
}

/**
 * Generate optimization suggestions for a component
 */
export function generateOptimizationSuggestions(
  analysis: ComponentAnalysis
): string[] {
  const suggestions: string[] = [...analysis.suggestions]

  if (analysis.bundleImpact === "high") {
    suggestions.push(
      "High bundle impact component. Consider code splitting or lazy loading."
    )
  }

  if (analysis.reasons.includes("context") && analysis.reasons.length === 1) {
    suggestions.push(
      "Component only uses context. Consider creating a smaller wrapper for context consumption."
    )
  }

  if (analysis.reasons.includes("browser_apis")) {
    suggestions.push(
      "Component uses browser APIs. Ensure they are wrapped in useEffect or conditional checks for SSR."
    )
  }

  return suggestions
}

/**
 * Calculate optimization priority score
 */
export function calculateOptimizationPriority(analysis: ComponentAnalysis): number {
  let score = 0

  // Higher score = higher priority
  if (analysis.couldBeServer) {
    score += 100
  }

  if (analysis.bundleImpact === "high") {
    score += 50
  } else if (analysis.bundleImpact === "medium") {
    score += 25
  }

  if (analysis.suggestions.length > 0) {
    score += analysis.suggestions.length * 10
  }

  // Fewer reasons = easier to optimize
  score += Math.max(0, 50 - analysis.reasons.length * 10)

  return score
}

/**
 * Generate audit report
 */
export function generateAuditReport(analyses: ComponentAnalysis[]): AuditReport {
  const clientComponents = analyses.filter(a => a.hasClientDirective).length
  const potentialOptimizations = analyses.filter(a => a.couldBeServer).length

  return {
    totalComponents: analyses.length,
    clientComponents,
    serverComponents: analyses.length - clientComponents,
    potentialOptimizations,
    analyses: analyses.sort(
      (a, b) => calculateOptimizationPriority(b) - calculateOptimizationPriority(a)
    ),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Format audit report as markdown
 */
export function formatAuditReportMarkdown(report: AuditReport): string {
  const lines: string[] = [
    "# Server Component Audit Report",
    "",
    `Generated: ${report.timestamp}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total Components | ${report.totalComponents} |`,
    `| Client Components | ${report.clientComponents} |`,
    `| Server Components | ${report.serverComponents} |`,
    `| Potential Optimizations | ${report.potentialOptimizations} |`,
    "",
  ]

  // Add optimization opportunities
  const optimizable = report.analyses.filter(a => a.couldBeServer || a.suggestions.length > 0)

  if (optimizable.length > 0) {
    lines.push("## Optimization Opportunities")
    lines.push("")

    for (const analysis of optimizable.slice(0, 20)) {
      lines.push(`### ${analysis.componentName}`)
      lines.push(`- **File**: ${analysis.filePath}`)
      lines.push(`- **Bundle Impact**: ${analysis.bundleImpact}`)
      lines.push(`- **Reasons for client**: ${analysis.reasons.join(", ") || "None detected"}`)

      if (analysis.suggestions.length > 0) {
        lines.push("- **Suggestions**:")
        for (const suggestion of analysis.suggestions) {
          lines.push(`  - ${suggestion}`)
        }
      }
      lines.push("")
    }
  }

  // Add high impact components
  const highImpact = report.analyses.filter(a => a.bundleImpact === "high")

  if (highImpact.length > 0) {
    lines.push("## High Impact Client Components")
    lines.push("")
    lines.push("These components have significant bundle size impact:")
    lines.push("")

    for (const analysis of highImpact) {
      lines.push(`- **${analysis.componentName}** (${analysis.filePath})`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

// ============================================================================
// Best Practices
// ============================================================================

/**
 * Server Component optimization patterns
 */
export const SERVER_COMPONENT_PATTERNS = {
  // Pattern: Move data fetching to server
  dataFetching: {
    description: "Move data fetching to server component",
    before: `
'use client'
export function Component() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  return <div>{data}</div>
}`,
    after: `
// Server Component
export async function Component() {
  const data = await fetchData()
  return <ClientWrapper data={data} />
}`,
  },

  // Pattern: Extract interactive parts
  extractInteractive: {
    description: "Extract interactive parts to smaller client component",
    before: `
'use client'
export function LargePage() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <Header /> {/* Static */}
      <Content /> {/* Static */}
      <button onClick={() => setIsOpen(true)}>Open</button>
      <Footer /> {/* Static */}
    </div>
  )
}`,
    after: `
// Server Component
export function LargePage() {
  return (
    <div>
      <Header />
      <Content />
      <OpenButton /> {/* Small client component */}
      <Footer />
    </div>
  )
}

// Small client component
'use client'
function OpenButton() {
  const [isOpen, setIsOpen] = useState(false)
  return <button onClick={() => setIsOpen(true)}>Open</button>
}`,
  },

  // Pattern: Use Server Actions for forms
  serverActions: {
    description: "Use Server Actions instead of client-side form handling",
    before: `
'use client'
export function Form() {
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/submit', { method: 'POST', body: new FormData(e.target) })
    setLoading(false)
  }
  return <form onSubmit={handleSubmit}>...</form>
}`,
    after: `
// Server Component with Server Action
export function Form() {
  async function submit(formData: FormData) {
    'use server'
    await saveData(formData)
  }
  return <form action={submit}>...</form>
}`,
  },
} as const
