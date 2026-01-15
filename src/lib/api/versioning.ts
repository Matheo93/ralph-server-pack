/**
 * API Versioning Service
 *
 * Supports multiple API versions with:
 * - Version detection from URL and headers
 * - Deprecation warnings
 * - Migration guidance
 * - Backward compatibility checks
 */

import { NextRequest, NextResponse } from "next/server"

// =============================================================================
// TYPES
// =============================================================================

export type APIVersion = "v1" | "v2"

export interface VersionInfo {
  version: APIVersion
  releaseDate: string
  status: "current" | "deprecated" | "sunset"
  sunsetDate?: string
  deprecationMessage?: string
  migrationGuide?: string
}

export interface VersionedResponse<T> {
  data: T
  meta: {
    apiVersion: APIVersion
    deprecationWarning?: string
    migrationGuide?: string
  }
}

export interface BreakingChange {
  version: APIVersion
  endpoint: string
  description: string
  migrationPath: string
}

// =============================================================================
// VERSION CONFIGURATION
// =============================================================================

export const API_VERSIONS: Record<APIVersion, VersionInfo> = {
  v1: {
    version: "v1",
    releaseDate: "2024-01-01",
    status: "current",
  },
  v2: {
    version: "v2",
    releaseDate: "2024-06-01",
    status: "current",
  },
}

export const CURRENT_VERSION: APIVersion = "v1"
export const LATEST_VERSION: APIVersion = "v2"
export const SUPPORTED_VERSIONS: APIVersion[] = ["v1", "v2"]

// =============================================================================
// BREAKING CHANGES REGISTRY
// =============================================================================

export const BREAKING_CHANGES: BreakingChange[] = [
  {
    version: "v2",
    endpoint: "/api/tasks",
    description: "Task priority field changed from number (1-5) to enum (low, normal, high, urgent)",
    migrationPath: "Convert numeric priority: 1-2 → low, 3 → normal, 4 → high, 5 → urgent",
  },
  {
    version: "v2",
    endpoint: "/api/tasks",
    description: "Pagination changed from limit/offset to cursor-based",
    migrationPath: "Use 'cursor' parameter instead of 'offset'. Response includes 'nextCursor' for iteration.",
  },
  {
    version: "v2",
    endpoint: "/api/children",
    description: "Child 'birthday' field renamed to 'birthDate' and format changed from YYYY/MM/DD to ISO date",
    migrationPath: "Rename field and convert date format to ISO 8601 (YYYY-MM-DD)",
  },
  {
    version: "v2",
    endpoint: "/api/household",
    description: "Household members moved to separate endpoint /api/household/members",
    migrationPath: "Fetch members from /api/v2/household/members instead of nested in household response",
  },
  {
    version: "v2",
    endpoint: "/api/notifications",
    description: "Notification preferences split into separate categories",
    migrationPath: "Update to use new preference structure with nested categories",
  },
]

// =============================================================================
// VERSION DETECTION
// =============================================================================

/**
 * Extract API version from request
 * Priority: URL path > Header > Default
 */
export function detectVersion(request: NextRequest): APIVersion {
  // 1. Check URL path (e.g., /api/v2/tasks)
  const url = new URL(request.url)
  const pathMatch = url.pathname.match(/\/api\/(v\d+)\//)
  if (pathMatch) {
    const version = pathMatch[1] as APIVersion
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version
    }
  }

  // 2. Check Accept-Version header
  const headerVersion = request.headers.get("Accept-Version") as APIVersion | null
  if (headerVersion && SUPPORTED_VERSIONS.includes(headerVersion)) {
    return headerVersion
  }

  // 3. Check X-API-Version header
  const xApiVersion = request.headers.get("X-API-Version") as APIVersion | null
  if (xApiVersion && SUPPORTED_VERSIONS.includes(xApiVersion)) {
    return xApiVersion
  }

  // 4. Default to current version
  return CURRENT_VERSION
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): version is APIVersion {
  return SUPPORTED_VERSIONS.includes(version as APIVersion)
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: APIVersion): boolean {
  return API_VERSIONS[version]?.status === "deprecated"
}

/**
 * Check if a version is sunset (no longer available)
 */
export function isVersionSunset(version: APIVersion): boolean {
  return API_VERSIONS[version]?.status === "sunset"
}

// =============================================================================
// DEPRECATION HANDLING
// =============================================================================

/**
 * Get deprecation warning for a version
 */
export function getDeprecationWarning(version: APIVersion): string | undefined {
  const info = API_VERSIONS[version]
  if (info?.status === "deprecated") {
    return (
      info.deprecationMessage ||
      `API ${version} is deprecated. Please migrate to ${LATEST_VERSION}. Sunset date: ${info.sunsetDate || "TBD"}`
    )
  }
  return undefined
}

/**
 * Get migration guide for a version
 */
export function getMigrationGuide(version: APIVersion): string | undefined {
  return API_VERSIONS[version]?.migrationGuide
}

/**
 * Get breaking changes for an endpoint
 */
export function getBreakingChanges(
  endpoint: string,
  fromVersion: APIVersion,
  toVersion: APIVersion
): BreakingChange[] {
  const fromIndex = SUPPORTED_VERSIONS.indexOf(fromVersion)
  const toIndex = SUPPORTED_VERSIONS.indexOf(toVersion)

  if (fromIndex >= toIndex) {
    return []
  }

  const versionsInRange = SUPPORTED_VERSIONS.slice(fromIndex + 1, toIndex + 1)

  return BREAKING_CHANGES.filter(
    (change) =>
      versionsInRange.includes(change.version) &&
      (change.endpoint === endpoint || endpoint.startsWith(change.endpoint))
  )
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Add version headers to response
 */
export function addVersionHeaders(
  response: NextResponse,
  version: APIVersion
): NextResponse {
  response.headers.set("X-API-Version", version)
  response.headers.set("X-API-Latest-Version", LATEST_VERSION)

  const deprecationWarning = getDeprecationWarning(version)
  if (deprecationWarning) {
    response.headers.set("X-API-Deprecation-Warning", deprecationWarning)
    response.headers.set("Deprecation", "true")

    const sunsetDate = API_VERSIONS[version]?.sunsetDate
    if (sunsetDate) {
      response.headers.set("Sunset", sunsetDate)
    }
  }

  return response
}

/**
 * Create a versioned response wrapper
 */
export function createVersionedResponse<T>(
  data: T,
  version: APIVersion
): VersionedResponse<T> {
  const deprecationWarning = getDeprecationWarning(version)
  const migrationGuide = getMigrationGuide(version)

  return {
    data,
    meta: {
      apiVersion: version,
      ...(deprecationWarning ? { deprecationWarning } : {}),
      ...(migrationGuide ? { migrationGuide } : {}),
    },
  }
}

/**
 * Create a JSON response with version headers
 */
export function jsonWithVersion<T>(
  data: T,
  version: APIVersion,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(data, init)
  return addVersionHeaders(response, version)
}

// =============================================================================
// VERSION MIDDLEWARE
// =============================================================================

/**
 * Middleware to handle API versioning
 */
export function withVersioning<T>(
  handler: (
    request: NextRequest,
    version: APIVersion
  ) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | { error: string }>> {
  return async (request: NextRequest): Promise<NextResponse<T | { error: string }>> => {
    const version = detectVersion(request)

    // Check if version is supported
    if (!isVersionSupported(version)) {
      return NextResponse.json(
        {
          error: `API version '${version}' is not supported`,
          supportedVersions: SUPPORTED_VERSIONS,
          latestVersion: LATEST_VERSION,
        },
        { status: 400 }
      )
    }

    // Check if version is sunset
    if (isVersionSunset(version)) {
      return NextResponse.json(
        {
          error: `API version '${version}' has been sunset and is no longer available`,
          latestVersion: LATEST_VERSION,
          migrationGuide: getMigrationGuide(version),
        },
        { status: 410 } // Gone
      )
    }

    // Execute handler and add version headers
    const response = await handler(request, version)
    return addVersionHeaders(response, version) as NextResponse<T | { error: string }>
  }
}

// =============================================================================
// VERSION TRANSFORMATION
// =============================================================================

/**
 * Transform data from one version to another
 */
export interface VersionTransformer<TInput, TOutput> {
  fromVersion: APIVersion
  toVersion: APIVersion
  transform: (data: TInput) => TOutput
}

/**
 * Registry of version transformers
 */
const transformers: Map<string, VersionTransformer<unknown, unknown>> = new Map()

/**
 * Register a version transformer
 */
export function registerTransformer<TInput, TOutput>(
  transformer: VersionTransformer<TInput, TOutput>
): void {
  const key = `${transformer.fromVersion}->${transformer.toVersion}`
  transformers.set(key, transformer as VersionTransformer<unknown, unknown>)
}

/**
 * Transform data between versions
 */
export function transformVersion<TInput, TOutput>(
  data: TInput,
  fromVersion: APIVersion,
  toVersion: APIVersion
): TOutput {
  const key = `${fromVersion}->${toVersion}`
  const transformer = transformers.get(key) as VersionTransformer<TInput, TOutput> | undefined

  if (!transformer) {
    throw new Error(`No transformer registered for ${key}`)
  }

  return transformer.transform(data)
}

// =============================================================================
// BUILT-IN TRANSFORMERS
// =============================================================================

// Task v1 to v2 transformer
interface TaskV1 {
  id: string
  title: string
  priority: number // 1-5
  dueDate?: string
}

interface TaskV2 {
  id: string
  title: string
  priority: "low" | "normal" | "high" | "urgent"
  dueDate?: string
}

registerTransformer<TaskV1, TaskV2>({
  fromVersion: "v1",
  toVersion: "v2",
  transform: (task) => ({
    ...task,
    priority: convertPriorityV1ToV2(task.priority),
  }),
})

function convertPriorityV1ToV2(
  priority: number
): "low" | "normal" | "high" | "urgent" {
  if (priority <= 1) return "low"
  if (priority <= 2) return "low"
  if (priority === 3) return "normal"
  if (priority === 4) return "high"
  return "urgent"
}

// Task v2 to v1 transformer (backward compatibility)
registerTransformer<TaskV2, TaskV1>({
  fromVersion: "v2",
  toVersion: "v1",
  transform: (task) => ({
    ...task,
    priority: convertPriorityV2ToV1(task.priority),
  }),
})

function convertPriorityV2ToV1(
  priority: "low" | "normal" | "high" | "urgent"
): number {
  switch (priority) {
    case "low":
      return 2
    case "normal":
      return 3
    case "high":
      return 4
    case "urgent":
      return 5
    default:
      return 3
  }
}

// =============================================================================
// VERSION DOCUMENTATION
// =============================================================================

/**
 * Get version documentation for API docs
 */
export function getVersionDocumentation(): {
  versions: VersionInfo[]
  currentVersion: APIVersion
  latestVersion: APIVersion
  breakingChanges: BreakingChange[]
} {
  return {
    versions: Object.values(API_VERSIONS),
    currentVersion: CURRENT_VERSION,
    latestVersion: LATEST_VERSION,
    breakingChanges: BREAKING_CHANGES,
  }
}

/**
 * Generate changelog between versions
 */
export function generateChangelog(
  fromVersion: APIVersion,
  toVersion: APIVersion
): string {
  const changes = BREAKING_CHANGES.filter((change) => {
    const changeIndex = SUPPORTED_VERSIONS.indexOf(change.version)
    const fromIndex = SUPPORTED_VERSIONS.indexOf(fromVersion)
    const toIndex = SUPPORTED_VERSIONS.indexOf(toVersion)
    return changeIndex > fromIndex && changeIndex <= toIndex
  })

  if (changes.length === 0) {
    return `No breaking changes between ${fromVersion} and ${toVersion}`
  }

  let changelog = `# Changelog: ${fromVersion} → ${toVersion}\n\n`

  const byVersion = changes.reduce(
    (acc, change) => {
      if (!acc[change.version]) {
        acc[change.version] = []
      }
      acc[change.version].push(change)
      return acc
    },
    {} as Record<APIVersion, BreakingChange[]>
  )

  for (const [version, versionChanges] of Object.entries(byVersion)) {
    changelog += `## ${version}\n\n`
    for (const change of versionChanges) {
      changelog += `### ${change.endpoint}\n`
      changelog += `- **Change**: ${change.description}\n`
      changelog += `- **Migration**: ${change.migrationPath}\n\n`
    }
  }

  return changelog
}
