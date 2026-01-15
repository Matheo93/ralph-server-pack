/**
 * Graceful Shutdown Service
 *
 * Handles application shutdown gracefully:
 * - Connection draining
 * - In-flight request handling
 * - State persistence
 * - Resource cleanup
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type ShutdownPhase = "idle" | "draining" | "cleanup" | "terminated"
export type ShutdownSignal = "SIGTERM" | "SIGINT" | "SIGHUP" | "SIGQUIT" | "manual"
export type ResourceType = "database" | "cache" | "queue" | "socket" | "file" | "http" | "custom"

export interface ShutdownConfig {
  timeout: number // ms to wait before force shutdown
  drainTimeout: number // ms to wait for connections to drain
  cleanupTimeout: number // ms for cleanup tasks
  forceAfterRetries: number
  signals: ShutdownSignal[]
  onShutdown?: () => Promise<void>
  onError?: (error: Error) => void
}

export interface ShutdownState {
  phase: ShutdownPhase
  startedAt?: Date
  signal?: ShutdownSignal
  error?: Error
  activeConnections: number
  pendingRequests: number
  cleanupTasks: number
  completedTasks: number
}

export interface ManagedResource {
  id: string
  type: ResourceType
  name: string
  priority: number // Lower = cleanup first
  cleanup: () => Promise<void>
  healthCheck?: () => Promise<boolean>
  forceClose?: () => void
  connections?: number
}

export interface DrainableServer {
  close: (callback?: (err?: Error) => void) => void
  getConnections?: (callback: (err: Error | null, count: number) => void) => void
  ref?: () => void
  unref?: () => void
}

export interface ConnectionInfo {
  id: string
  type: string
  startedAt: Date
  lastActivity: Date
  metadata?: Record<string, unknown>
}

export interface ShutdownHook {
  id: string
  name: string
  priority: number
  execute: () => Promise<void>
  timeout?: number
}

export interface ShutdownResult {
  success: boolean
  duration: number
  phase: ShutdownPhase
  errors: Error[]
  resourcesCleaned: number
  connectionsDrained: number
}

export interface StateSnapshot {
  timestamp: Date
  data: Record<string, unknown>
  version: string
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const ShutdownConfigSchema = z.object({
  timeout: z.number().min(1000),
  drainTimeout: z.number().min(100),
  cleanupTimeout: z.number().min(100),
  forceAfterRetries: z.number().min(0),
  signals: z.array(z.enum(["SIGTERM", "SIGINT", "SIGHUP", "SIGQUIT", "manual"])),
})

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  timeout: 30000, // 30 seconds total
  drainTimeout: 15000, // 15 seconds for draining
  cleanupTimeout: 10000, // 10 seconds for cleanup
  forceAfterRetries: 3,
  signals: ["SIGTERM", "SIGINT"],
}

// =============================================================================
// SHUTDOWN STATE MANAGEMENT
// =============================================================================

/**
 * Create initial shutdown state
 */
export function createShutdownState(): ShutdownState {
  return {
    phase: "idle",
    activeConnections: 0,
    pendingRequests: 0,
    cleanupTasks: 0,
    completedTasks: 0,
  }
}

/**
 * Transition to draining phase
 */
export function startDraining(
  state: ShutdownState,
  signal: ShutdownSignal
): ShutdownState {
  if (state.phase !== "idle") {
    return state
  }

  return {
    ...state,
    phase: "draining",
    startedAt: new Date(),
    signal,
  }
}

/**
 * Transition to cleanup phase
 */
export function startCleanup(state: ShutdownState): ShutdownState {
  if (state.phase !== "draining") {
    return state
  }

  return {
    ...state,
    phase: "cleanup",
  }
}

/**
 * Transition to terminated phase
 */
export function markTerminated(
  state: ShutdownState,
  error?: Error
): ShutdownState {
  return {
    ...state,
    phase: "terminated",
    error,
  }
}

/**
 * Update connection count
 */
export function updateConnectionCount(
  state: ShutdownState,
  count: number
): ShutdownState {
  return {
    ...state,
    activeConnections: count,
  }
}

/**
 * Update pending requests count
 */
export function updatePendingRequests(
  state: ShutdownState,
  count: number
): ShutdownState {
  return {
    ...state,
    pendingRequests: count,
  }
}

/**
 * Increment completed cleanup tasks
 */
export function incrementCompletedTasks(state: ShutdownState): ShutdownState {
  return {
    ...state,
    completedTasks: state.completedTasks + 1,
  }
}

/**
 * Check if shutdown is in progress
 */
export function isShuttingDown(state: ShutdownState): boolean {
  return state.phase !== "idle"
}

/**
 * Check if shutdown is complete
 */
export function isShutdownComplete(state: ShutdownState): boolean {
  return state.phase === "terminated"
}

// =============================================================================
// RESOURCE MANAGEMENT
// =============================================================================

/**
 * Create managed resource
 */
export function createManagedResource(
  id: string,
  type: ResourceType,
  name: string,
  cleanup: () => Promise<void>,
  options: {
    priority?: number
    healthCheck?: () => Promise<boolean>
    forceClose?: () => void
    connections?: number
  } = {}
): ManagedResource {
  return {
    id,
    type,
    name,
    priority: options.priority ?? 100,
    cleanup,
    healthCheck: options.healthCheck,
    forceClose: options.forceClose,
    connections: options.connections,
  }
}

/**
 * Sort resources by cleanup priority
 */
export function sortResourcesByPriority(
  resources: ManagedResource[]
): ManagedResource[] {
  return [...resources].sort((a, b) => a.priority - b.priority)
}

/**
 * Cleanup single resource with timeout
 */
export async function cleanupResource(
  resource: ManagedResource,
  timeout: number
): Promise<{ success: boolean; error?: Error; duration: number }> {
  const startTime = Date.now()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Cleanup timeout for ${resource.name}`)), timeout)
    })

    await Promise.race([resource.cleanup(), timeoutPromise])

    return {
      success: true,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    // Try force close if available
    if (resource.forceClose) {
      try {
        resource.forceClose()
      } catch {
        // Ignore force close errors
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Cleanup all resources in order
 */
export async function cleanupAllResources(
  resources: ManagedResource[],
  timeout: number
): Promise<{
  successful: string[]
  failed: Array<{ id: string; error: Error }>
  totalDuration: number
}> {
  const startTime = Date.now()
  const successful: string[] = []
  const failed: Array<{ id: string; error: Error }> = []

  const sortedResources = sortResourcesByPriority(resources)
  const timePerResource = Math.floor(timeout / sortedResources.length)

  for (const resource of sortedResources) {
    const result = await cleanupResource(resource, timePerResource)

    if (result.success) {
      successful.push(resource.id)
    } else if (result.error) {
      failed.push({ id: resource.id, error: result.error })
    }
  }

  return {
    successful,
    failed,
    totalDuration: Date.now() - startTime,
  }
}

// =============================================================================
// CONNECTION DRAINING
// =============================================================================

/**
 * Create connection tracker
 */
export function createConnectionTracker(): {
  connections: Map<string, ConnectionInfo>
  add: (id: string, type: string, metadata?: Record<string, unknown>) => void
  remove: (id: string) => void
  get: (id: string) => ConnectionInfo | undefined
  getAll: () => ConnectionInfo[]
  getCount: () => number
  updateActivity: (id: string) => void
  getIdleConnections: (maxIdleMs: number) => ConnectionInfo[]
} {
  const connections = new Map<string, ConnectionInfo>()

  return {
    connections,
    add(id, type, metadata) {
      connections.set(id, {
        id,
        type,
        startedAt: new Date(),
        lastActivity: new Date(),
        metadata,
      })
    },
    remove(id) {
      connections.delete(id)
    },
    get(id) {
      return connections.get(id)
    },
    getAll() {
      return Array.from(connections.values())
    },
    getCount() {
      return connections.size
    },
    updateActivity(id) {
      const conn = connections.get(id)
      if (conn) {
        conn.lastActivity = new Date()
      }
    },
    getIdleConnections(maxIdleMs) {
      const now = Date.now()
      return Array.from(connections.values()).filter(
        conn => now - conn.lastActivity.getTime() > maxIdleMs
      )
    },
  }
}

/**
 * Wait for connections to drain
 */
export async function waitForDrain(
  getConnectionCount: () => number,
  timeout: number,
  checkInterval: number = 100
): Promise<{ drained: boolean; remaining: number; duration: number }> {
  const startTime = Date.now()
  const deadline = startTime + timeout

  while (Date.now() < deadline) {
    const count = getConnectionCount()
    if (count === 0) {
      return {
        drained: true,
        remaining: 0,
        duration: Date.now() - startTime,
      }
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  const remaining = getConnectionCount()
  return {
    drained: remaining === 0,
    remaining,
    duration: Date.now() - startTime,
  }
}

/**
 * Drain HTTP server connections
 */
export async function drainHttpServer(
  server: DrainableServer,
  timeout: number
): Promise<{ success: boolean; error?: Error }> {
  return new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      resolve({ success: false, error: new Error("Server drain timeout") })
    }, timeout)

    try {
      server.close((err) => {
        clearTimeout(timeoutId)
        if (err) {
          resolve({ success: false, error: err })
        } else {
          resolve({ success: true })
        }
      })

      // Unref to allow process exit if this is the only handle
      if (server.unref) {
        server.unref()
      }
    } catch (error) {
      clearTimeout(timeoutId)
      resolve({
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      })
    }
  })
}

// =============================================================================
// STATE PERSISTENCE
// =============================================================================

/**
 * Create state snapshot
 */
export function createStateSnapshot(
  data: Record<string, unknown>,
  version: string = "1.0"
): StateSnapshot {
  return {
    timestamp: new Date(),
    data,
    version,
  }
}

/**
 * Serialize state for storage
 */
export function serializeState(snapshot: StateSnapshot): string {
  return JSON.stringify({
    ...snapshot,
    timestamp: snapshot.timestamp.toISOString(),
  })
}

/**
 * Deserialize state from storage
 */
export function deserializeState(json: string): StateSnapshot | null {
  try {
    const parsed = JSON.parse(json)
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
    }
  } catch {
    return null
  }
}

/**
 * Persist state to file (Node.js)
 */
export async function persistStateToFile(
  snapshot: StateSnapshot,
  filePath: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const fs = await import("fs/promises")
    await fs.writeFile(filePath, serializeState(snapshot), "utf-8")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Load state from file (Node.js)
 */
export async function loadStateFromFile(
  filePath: string
): Promise<{ state: StateSnapshot | null; error?: Error }> {
  try {
    const fs = await import("fs/promises")
    const content = await fs.readFile(filePath, "utf-8")
    return { state: deserializeState(content) }
  } catch (error) {
    return {
      state: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

// =============================================================================
// SHUTDOWN HOOKS
// =============================================================================

/**
 * Create shutdown hook
 */
export function createShutdownHook(
  id: string,
  name: string,
  execute: () => Promise<void>,
  options: {
    priority?: number
    timeout?: number
  } = {}
): ShutdownHook {
  return {
    id,
    name,
    priority: options.priority ?? 100,
    execute,
    timeout: options.timeout,
  }
}

/**
 * Sort hooks by priority
 */
export function sortHooksByPriority(hooks: ShutdownHook[]): ShutdownHook[] {
  return [...hooks].sort((a, b) => a.priority - b.priority)
}

/**
 * Execute shutdown hook with timeout
 */
export async function executeHook(
  hook: ShutdownHook,
  defaultTimeout: number
): Promise<{ success: boolean; error?: Error; duration: number }> {
  const startTime = Date.now()
  const timeout = hook.timeout ?? defaultTimeout

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Hook timeout: ${hook.name}`)), timeout)
    })

    await Promise.race([hook.execute(), timeoutPromise])

    return {
      success: true,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Execute all hooks in order
 */
export async function executeAllHooks(
  hooks: ShutdownHook[],
  defaultTimeout: number
): Promise<{
  successful: string[]
  failed: Array<{ id: string; error: Error }>
  totalDuration: number
}> {
  const startTime = Date.now()
  const successful: string[] = []
  const failed: Array<{ id: string; error: Error }> = []

  const sortedHooks = sortHooksByPriority(hooks)

  for (const hook of sortedHooks) {
    const result = await executeHook(hook, defaultTimeout)

    if (result.success) {
      successful.push(hook.id)
    } else if (result.error) {
      failed.push({ id: hook.id, error: result.error })
    }
  }

  return {
    successful,
    failed,
    totalDuration: Date.now() - startTime,
  }
}

// =============================================================================
// SIGNAL HANDLING
// =============================================================================

/**
 * Register signal handlers (Node.js)
 */
export function registerSignalHandlers(
  signals: ShutdownSignal[],
  handler: (signal: ShutdownSignal) => void
): () => void {
  const handlers: Array<{ signal: string; handler: () => void }> = []

  for (const signal of signals) {
    if (signal === "manual") continue

    const signalHandler = () => handler(signal)
    process.on(signal, signalHandler)
    handlers.push({ signal, handler: signalHandler })
  }

  // Return cleanup function
  return () => {
    for (const { signal, handler: signalHandler } of handlers) {
      process.removeListener(signal, signalHandler)
    }
  }
}

/**
 * Check if running in Node.js
 */
export function isNodeEnvironment(): boolean {
  return typeof process !== "undefined" && process.versions != null
}

// =============================================================================
// GRACEFUL SHUTDOWN ORCHESTRATOR
// =============================================================================

/**
 * Execute graceful shutdown
 */
export async function executeGracefulShutdown(
  config: ShutdownConfig,
  resources: ManagedResource[],
  hooks: ShutdownHook[],
  getConnectionCount: () => number,
  signal: ShutdownSignal = "manual"
): Promise<ShutdownResult> {
  const startTime = Date.now()
  const errors: Error[] = []
  let state = createShutdownState()

  // Start draining
  state = startDraining(state, signal)

  // Execute pre-shutdown hooks (priority < 50)
  const preHooks = hooks.filter(h => h.priority < 50)
  const preHookResults = await executeAllHooks(preHooks, config.cleanupTimeout / 2)
  for (const failed of preHookResults.failed) {
    errors.push(failed.error)
  }

  // Drain connections
  const drainResult = await waitForDrain(
    getConnectionCount,
    config.drainTimeout,
    100
  )

  if (!drainResult.drained) {
    errors.push(new Error(`Failed to drain ${drainResult.remaining} connections`))
  }

  // Move to cleanup phase
  state = startCleanup(state)

  // Cleanup resources
  const cleanupResult = await cleanupAllResources(resources, config.cleanupTimeout)
  for (const failed of cleanupResult.failed) {
    errors.push(failed.error)
  }

  // Execute post-shutdown hooks (priority >= 50)
  const postHooks = hooks.filter(h => h.priority >= 50)
  const postHookResults = await executeAllHooks(postHooks, config.cleanupTimeout / 2)
  for (const failed of postHookResults.failed) {
    errors.push(failed.error)
  }

  // Call custom onShutdown callback
  if (config.onShutdown) {
    try {
      await config.onShutdown()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errors.push(err)
      if (config.onError) {
        config.onError(err)
      }
    }
  }

  // Mark as terminated
  state = markTerminated(state, errors.length > 0 ? errors[0] : undefined)

  return {
    success: errors.length === 0,
    duration: Date.now() - startTime,
    phase: state.phase,
    errors,
    resourcesCleaned: cleanupResult.successful.length,
    connectionsDrained: drainResult.drained ? 0 : drainResult.remaining,
  }
}

// =============================================================================
// SHUTDOWN MANAGER CLASS
// =============================================================================

export interface ShutdownManager {
  state: ShutdownState
  config: ShutdownConfig
  resources: ManagedResource[]
  hooks: ShutdownHook[]
  connectionTracker: ReturnType<typeof createConnectionTracker>
  registerResource: (resource: ManagedResource) => void
  unregisterResource: (id: string) => void
  registerHook: (hook: ShutdownHook) => void
  unregisterHook: (id: string) => void
  shutdown: (signal?: ShutdownSignal) => Promise<ShutdownResult>
  isShuttingDown: () => boolean
}

/**
 * Create shutdown manager
 */
export function createShutdownManager(
  config: Partial<ShutdownConfig> = {}
): ShutdownManager {
  const fullConfig: ShutdownConfig = { ...DEFAULT_SHUTDOWN_CONFIG, ...config }
  let state = createShutdownState()
  const resources: ManagedResource[] = []
  const hooks: ShutdownHook[] = []
  const connectionTracker = createConnectionTracker()

  const manager: ShutdownManager = {
    get state() {
      return state
    },
    config: fullConfig,
    resources,
    hooks,
    connectionTracker,

    registerResource(resource) {
      const existingIndex = resources.findIndex(r => r.id === resource.id)
      if (existingIndex >= 0) {
        resources[existingIndex] = resource
      } else {
        resources.push(resource)
      }
    },

    unregisterResource(id) {
      const index = resources.findIndex(r => r.id === id)
      if (index >= 0) {
        resources.splice(index, 1)
      }
    },

    registerHook(hook) {
      const existingIndex = hooks.findIndex(h => h.id === hook.id)
      if (existingIndex >= 0) {
        hooks[existingIndex] = hook
      } else {
        hooks.push(hook)
      }
    },

    unregisterHook(id) {
      const index = hooks.findIndex(h => h.id === id)
      if (index >= 0) {
        hooks.splice(index, 1)
      }
    },

    async shutdown(signal = "manual") {
      if (isShuttingDown(state)) {
        return {
          success: false,
          duration: 0,
          phase: state.phase,
          errors: [new Error("Shutdown already in progress")],
          resourcesCleaned: 0,
          connectionsDrained: 0,
        }
      }

      const result = await executeGracefulShutdown(
        fullConfig,
        resources,
        hooks,
        () => connectionTracker.getCount(),
        signal
      )

      state = markTerminated(state, result.errors[0])

      return result
    },

    isShuttingDown() {
      return isShuttingDown(state)
    },
  }

  return manager
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create database cleanup resource
 */
export function createDatabaseResource(
  id: string,
  name: string,
  disconnect: () => Promise<void>
): ManagedResource {
  return createManagedResource(id, "database", name, disconnect, { priority: 10 })
}

/**
 * Create cache cleanup resource
 */
export function createCacheResource(
  id: string,
  name: string,
  disconnect: () => Promise<void>
): ManagedResource {
  return createManagedResource(id, "cache", name, disconnect, { priority: 20 })
}

/**
 * Create queue cleanup resource
 */
export function createQueueResource(
  id: string,
  name: string,
  close: () => Promise<void>
): ManagedResource {
  return createManagedResource(id, "queue", name, close, { priority: 30 })
}

/**
 * Create HTTP server resource
 */
export function createHttpServerResource(
  id: string,
  name: string,
  server: DrainableServer,
  timeout: number
): ManagedResource {
  return createManagedResource(
    id,
    "http",
    name,
    async () => {
      const result = await drainHttpServer(server, timeout)
      if (!result.success && result.error) {
        throw result.error
      }
    },
    { priority: 50 }
  )
}

/**
 * Format shutdown duration
 */
export function formatShutdownDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Get shutdown phase description
 */
export function getPhaseDescription(phase: ShutdownPhase): string {
  const descriptions: Record<ShutdownPhase, string> = {
    idle: "Waiting for shutdown signal",
    draining: "Draining active connections",
    cleanup: "Cleaning up resources",
    terminated: "Shutdown complete",
  }
  return descriptions[phase]
}
