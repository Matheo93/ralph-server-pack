/**
 * Bundle Analyzer - Next.js chunk analysis and optimization suggestions
 * Analyzes build output to identify heavy imports and provide optimization recommendations
 */

import { z } from "zod"

// ============================================================================
// Types and Schemas
// ============================================================================

export const ChunkInfoSchema = z.object({
  name: z.string(),
  size: z.number().nonnegative(),
  modules: z.array(z.string()),
  isShared: z.boolean(),
  isFirstLoad: z.boolean(),
})

export type ChunkInfo = z.infer<typeof ChunkInfoSchema>

export const BundleAnalysisSchema = z.object({
  totalSize: z.number().nonnegative(),
  chunks: z.array(ChunkInfoSchema),
  largeModules: z.array(z.object({
    module: z.string(),
    size: z.number().nonnegative(),
    usedBy: z.array(z.string()),
  })),
  suggestions: z.array(z.object({
    type: z.enum(["warning", "error", "info"]),
    message: z.string(),
    module: z.string().optional(),
    impact: z.enum(["high", "medium", "low"]),
  })),
  timestamp: z.string().datetime(),
})

export type BundleAnalysis = z.infer<typeof BundleAnalysisSchema>

export const OptimizationSuggestionSchema = z.object({
  type: z.enum(["warning", "error", "info"]),
  message: z.string(),
  module: z.string().optional(),
  impact: z.enum(["high", "medium", "low"]),
  action: z.string(),
})

export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>

// ============================================================================
// Constants
// ============================================================================

// Size thresholds in bytes
export const SIZE_THRESHOLDS = {
  CHUNK_WARNING: 250 * 1024, // 250KB
  CHUNK_ERROR: 500 * 1024, // 500KB
  MODULE_WARNING: 50 * 1024, // 50KB
  MODULE_ERROR: 100 * 1024, // 100KB
  TOTAL_FIRST_LOAD_WARNING: 300 * 1024, // 300KB
  TOTAL_FIRST_LOAD_ERROR: 500 * 1024, // 500KB
} as const

// Known heavy modules that should be dynamically imported
export const HEAVY_MODULES = [
  "moment",
  "lodash",
  "date-fns",
  "chart.js",
  "recharts",
  "d3",
  "three",
  "xlsx",
  "pdf-lib",
  "pdfjs-dist",
  "monaco-editor",
  "highlight.js",
  "prismjs",
  "marked",
  "showdown",
  "katex",
  "mathjax",
  "@mui/material",
  "@mui/icons-material",
  "antd",
  "@ant-design/icons",
  "framer-motion",
  "gsap",
  "@lottiefiles/lottie-player",
] as const

// Modules that should never be in client bundle
export const SERVER_ONLY_MODULES = [
  "fs",
  "path",
  "crypto",
  "child_process",
  "os",
  "net",
  "http",
  "https",
  "stream",
  "zlib",
  "dns",
  "tls",
  "pg",
  "mysql",
  "mongodb",
  "redis",
  "bcrypt",
  "argon2",
] as const

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Detect heavy imports in a list of modules
 */
export function detectHeavyImports(modules: string[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  for (const module of modules) {
    const moduleName = extractModuleName(module)

    if (HEAVY_MODULES.includes(moduleName as typeof HEAVY_MODULES[number])) {
      suggestions.push({
        type: "warning",
        message: `Heavy module "${moduleName}" detected in bundle. Consider dynamic import.`,
        module: moduleName,
        impact: "high",
        action: `Use dynamic(() => import('${moduleName}')) or import('${moduleName}') with lazy loading`,
      })
    }

    if (SERVER_ONLY_MODULES.includes(moduleName as typeof SERVER_ONLY_MODULES[number])) {
      suggestions.push({
        type: "error",
        message: `Server-only module "${moduleName}" found in client bundle!`,
        module: moduleName,
        impact: "high",
        action: `Move code using "${moduleName}" to Server Component or API route`,
      })
    }
  }

  return suggestions
}

/**
 * Extract clean module name from import path
 */
export function extractModuleName(importPath: string): string {
  // Handle scoped packages like @mui/material
  const match = importPath.match(/^(@[^/]+\/[^/]+|[^/]+)/)
  return match?.[1] ?? importPath
}

/**
 * Analyze chunk sizes and generate warnings
 */
export function analyzeChunkSizes(chunks: ChunkInfo[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  for (const chunk of chunks) {
    if (chunk.size > SIZE_THRESHOLDS.CHUNK_ERROR) {
      suggestions.push({
        type: "error",
        message: `Chunk "${chunk.name}" is ${formatBytes(chunk.size)} - exceeds ${formatBytes(SIZE_THRESHOLDS.CHUNK_ERROR)} limit`,
        module: chunk.name,
        impact: "high",
        action: "Split this chunk using dynamic imports or code splitting",
      })
    } else if (chunk.size > SIZE_THRESHOLDS.CHUNK_WARNING) {
      suggestions.push({
        type: "warning",
        message: `Chunk "${chunk.name}" is ${formatBytes(chunk.size)} - approaching size limit`,
        module: chunk.name,
        impact: "medium",
        action: "Consider splitting heavy components in this chunk",
      })
    }
  }

  return suggestions
}

/**
 * Calculate first load JS size
 */
export function calculateFirstLoadSize(chunks: ChunkInfo[]): number {
  return chunks
    .filter(chunk => chunk.isFirstLoad)
    .reduce((total, chunk) => total + chunk.size, 0)
}

/**
 * Analyze first load bundle size
 */
export function analyzeFirstLoadSize(chunks: ChunkInfo[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const firstLoadSize = calculateFirstLoadSize(chunks)

  if (firstLoadSize > SIZE_THRESHOLDS.TOTAL_FIRST_LOAD_ERROR) {
    suggestions.push({
      type: "error",
      message: `First Load JS is ${formatBytes(firstLoadSize)} - exceeds ${formatBytes(SIZE_THRESHOLDS.TOTAL_FIRST_LOAD_ERROR)} target`,
      impact: "high",
      action: "Reduce shared dependencies, use Server Components, implement code splitting",
    })
  } else if (firstLoadSize > SIZE_THRESHOLDS.TOTAL_FIRST_LOAD_WARNING) {
    suggestions.push({
      type: "warning",
      message: `First Load JS is ${formatBytes(firstLoadSize)} - approaching target limit`,
      impact: "medium",
      action: "Review shared chunks and consider lazy loading non-critical code",
    })
  } else {
    suggestions.push({
      type: "info",
      message: `First Load JS is ${formatBytes(firstLoadSize)} - within optimal range`,
      impact: "low",
      action: "No action required",
    })
  }

  return suggestions
}

/**
 * Detect duplicate dependencies
 */
export function detectDuplicates(modules: string[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const moduleVersions = new Map<string, Set<string>>()

  for (const module of modules) {
    // Extract base module name and version
    const match = module.match(/node_modules\/(.+?)\//)
    if (match) {
      const moduleName = extractModuleName(match[1])
      const versions = moduleVersions.get(moduleName) || new Set()
      versions.add(module)
      moduleVersions.set(moduleName, versions)
    }
  }

  for (const [moduleName, versions] of moduleVersions) {
    if (versions.size > 1) {
      suggestions.push({
        type: "warning",
        message: `Multiple versions of "${moduleName}" detected (${versions.size} versions)`,
        module: moduleName,
        impact: "medium",
        action: `Run 'npm dedupe' or check package.json for version conflicts`,
      })
    }
  }

  return suggestions
}

/**
 * Detect tree-shaking issues
 */
export function detectTreeShakingIssues(modules: string[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const problematicPatterns = [
    { pattern: /lodash(?!-es)/, suggestion: "Use lodash-es or specific imports like 'lodash/get'" },
    { pattern: /moment/, suggestion: "Use date-fns or dayjs for smaller bundle" },
    { pattern: /@mui\/icons-material(?!\/)/, suggestion: "Import specific icons: '@mui/icons-material/Add'" },
    { pattern: /@ant-design\/icons(?!\/)/, suggestion: "Import specific icons: '@ant-design/icons/HomeOutlined'" },
    { pattern: /rxjs(?!\/)/, suggestion: "Import specific operators: 'rxjs/operators'" },
  ]

  for (const module of modules) {
    for (const { pattern, suggestion } of problematicPatterns) {
      if (pattern.test(module)) {
        suggestions.push({
          type: "warning",
          message: `Tree-shaking issue detected with "${extractModuleName(module)}"`,
          module: extractModuleName(module),
          impact: "medium",
          action: suggestion,
        })
        break
      }
    }
  }

  return suggestions
}

/**
 * Run full bundle analysis
 */
export function analyzeBundleModules(modules: string[]): BundleAnalysis {
  const suggestions: OptimizationSuggestion[] = [
    ...detectHeavyImports(modules),
    ...detectDuplicates(modules),
    ...detectTreeShakingIssues(modules),
  ]

  // Convert to BundleAnalysis format
  const bundleSuggestions = suggestions.map(s => ({
    type: s.type,
    message: `${s.message} - ${s.action}`,
    module: s.module,
    impact: s.impact,
  }))

  return {
    totalSize: 0, // Would be calculated from actual build output
    chunks: [],
    largeModules: [],
    suggestions: bundleSuggestions,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Generate optimization report
 */
export function generateOptimizationReport(analysis: BundleAnalysis): string {
  const lines: string[] = [
    "# Bundle Analysis Report",
    "",
    `Generated: ${analysis.timestamp}`,
    `Total Size: ${formatBytes(analysis.totalSize)}`,
    "",
    "## Summary",
    "",
    `- Total Chunks: ${analysis.chunks.length}`,
    `- Large Modules: ${analysis.largeModules.length}`,
    `- Issues Found: ${analysis.suggestions.length}`,
    "",
  ]

  // Errors
  const errors = analysis.suggestions.filter(s => s.type === "error")
  if (errors.length > 0) {
    lines.push("## Errors (High Priority)")
    lines.push("")
    for (const error of errors) {
      lines.push(`- **${error.module ?? "General"}**: ${error.message}`)
    }
    lines.push("")
  }

  // Warnings
  const warnings = analysis.suggestions.filter(s => s.type === "warning")
  if (warnings.length > 0) {
    lines.push("## Warnings")
    lines.push("")
    for (const warning of warnings) {
      lines.push(`- **${warning.module ?? "General"}**: ${warning.message}`)
    }
    lines.push("")
  }

  // Info
  const infos = analysis.suggestions.filter(s => s.type === "info")
  if (infos.length > 0) {
    lines.push("## Info")
    lines.push("")
    for (const info of infos) {
      lines.push(`- ${info.message}`)
    }
    lines.push("")
  }

  // Large modules
  if (analysis.largeModules.length > 0) {
    lines.push("## Large Modules")
    lines.push("")
    for (const mod of analysis.largeModules) {
      lines.push(`- **${mod.module}**: ${formatBytes(mod.size)}`)
      lines.push(`  - Used by: ${mod.usedBy.join(", ")}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Parse Next.js build output to extract chunk information
 */
export function parseBuildOutput(output: string): ChunkInfo[] {
  const chunks: ChunkInfo[] = []
  const lines = output.split("\n")

  // Regex patterns for Next.js build output
  const routePattern = /^[├└]?\s*[○ƒ]\s+(\S+)\s+(\d+(?:\.\d+)?)\s*(B|kB|KB|MB)/
  const chunkPattern = /^\s+[\u251c\u2514]?\s*chunks\/(.+?)\s+(\d+(?:\.\d+)?)\s*(B|kB|KB|MB)/

  for (const line of lines) {
    const routeMatch = line.match(routePattern)
    if (routeMatch) {
      const [, name, sizeStr, unit] = routeMatch
      const size = parseSize(parseFloat(sizeStr), unit)
      chunks.push({
        name,
        size,
        modules: [],
        isShared: false,
        isFirstLoad: true,
      })
    }

    const chunkMatch = line.match(chunkPattern)
    if (chunkMatch) {
      const [, name, sizeStr, unit] = chunkMatch
      const size = parseSize(parseFloat(sizeStr), unit)
      chunks.push({
        name: `chunks/${name}`,
        size,
        modules: [],
        isShared: name.includes("shared") || name.includes("commons"),
        isFirstLoad: false,
      })
    }
  }

  return chunks
}

/**
 * Parse size string to bytes
 */
export function parseSize(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    "B": 1,
    "kB": 1024,
    "KB": 1024,
    "MB": 1024 * 1024,
    "GB": 1024 * 1024 * 1024,
  }
  return value * (multipliers[unit] ?? 1)
}

/**
 * Check if a module should be dynamically imported
 */
export function shouldBeDynamicImport(moduleName: string): boolean {
  return HEAVY_MODULES.includes(moduleName as typeof HEAVY_MODULES[number])
}

/**
 * Get optimization priority score (higher = more urgent)
 */
export function getOptimizationPriority(suggestion: OptimizationSuggestion): number {
  const typeScores = { error: 100, warning: 50, info: 10 }
  const impactScores = { high: 30, medium: 20, low: 10 }
  return typeScores[suggestion.type] + impactScores[suggestion.impact]
}

/**
 * Sort suggestions by priority
 */
export function sortByPriority(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
  return [...suggestions].sort((a, b) => getOptimizationPriority(b) - getOptimizationPriority(a))
}
