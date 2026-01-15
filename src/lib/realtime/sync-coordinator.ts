/**
 * Sync Coordinator Service
 *
 * Handles multi-device synchronization:
 * - Multi-device sync
 * - Conflict prevention
 * - Optimistic updates
 * - Version control
 */

// =============================================================================
// TYPES
// =============================================================================

export type SyncState = "idle" | "syncing" | "conflict" | "error" | "offline"
export type ConflictResolution = "client_wins" | "server_wins" | "merge" | "manual"
export type OperationType = "create" | "update" | "delete"

export interface SyncVersion {
  version: number
  timestamp: Date
  deviceId: string
  checksum: string
}

export interface SyncedEntity {
  id: string
  type: string
  version: SyncVersion
  data: unknown
  localChanges?: LocalChange[]
  syncState: SyncState
  lastSyncedAt?: Date
}

export interface LocalChange {
  id: string
  operation: OperationType
  field?: string
  oldValue?: unknown
  newValue?: unknown
  timestamp: Date
  applied: boolean
  synced: boolean
}

export interface SyncConflict {
  id: string
  entityId: string
  entityType: string
  localVersion: SyncVersion
  serverVersion: SyncVersion
  localData: unknown
  serverData: unknown
  conflictingFields: string[]
  detectedAt: Date
  resolvedAt?: Date
  resolution?: ConflictResolution
}

export interface OptimisticUpdate {
  id: string
  entityId: string
  operation: OperationType
  data: unknown
  timestamp: Date
  confirmed: boolean
  rolledBack: boolean
}

export interface DeviceState {
  deviceId: string
  lastSeen: Date
  syncVersion: number
  pendingChanges: number
  online: boolean
}

export interface SyncSession {
  id: string
  memberId: string
  devices: Map<string, DeviceState>
  activeConflicts: SyncConflict[]
  pendingUpdates: OptimisticUpdate[]
  startedAt: Date
  lastActivityAt: Date
}

export interface SyncResult {
  success: boolean
  entitiesSynced: number
  conflicts: SyncConflict[]
  errors: SyncError[]
  duration: number
}

export interface SyncError {
  entityId: string
  operation: OperationType
  message: string
  recoverable: boolean
}

export interface MergeResult {
  success: boolean
  mergedData: unknown
  conflicts: string[] // Fields that couldn't be auto-merged
}

// =============================================================================
// VERSION MANAGEMENT
// =============================================================================

/**
 * Create a new sync version
 */
export function createSyncVersion(deviceId: string, data: unknown): SyncVersion {
  return {
    version: 1,
    timestamp: new Date(),
    deviceId,
    checksum: calculateChecksum(data),
  }
}

/**
 * Increment version
 */
export function incrementVersion(
  version: SyncVersion,
  deviceId: string,
  data: unknown
): SyncVersion {
  return {
    version: version.version + 1,
    timestamp: new Date(),
    deviceId,
    checksum: calculateChecksum(data),
  }
}

/**
 * Calculate simple checksum for data
 */
export function calculateChecksum(data: unknown): string {
  const str = JSON.stringify(data)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16)
}

/**
 * Compare versions
 */
export function compareVersions(a: SyncVersion, b: SyncVersion): number {
  if (a.version !== b.version) {
    return a.version - b.version
  }

  return a.timestamp.getTime() - b.timestamp.getTime()
}

/**
 * Check if version is newer
 */
export function isNewer(incoming: SyncVersion, current: SyncVersion): boolean {
  return compareVersions(incoming, current) > 0
}

/**
 * Check if versions conflict
 */
export function versionsConflict(a: SyncVersion, b: SyncVersion): boolean {
  // Same version but different checksums = conflict
  return a.version === b.version && a.checksum !== b.checksum
}

// =============================================================================
// CONFLICT DETECTION & RESOLUTION
// =============================================================================

/**
 * Detect conflict between local and server versions
 */
export function detectConflict(
  entityId: string,
  entityType: string,
  localVersion: SyncVersion,
  serverVersion: SyncVersion,
  localData: unknown,
  serverData: unknown
): SyncConflict | null {
  if (!versionsConflict(localVersion, serverVersion)) {
    return null
  }

  const conflictingFields = findConflictingFields(localData, serverData)

  return {
    id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityId,
    entityType,
    localVersion,
    serverVersion,
    localData,
    serverData,
    conflictingFields,
    detectedAt: new Date(),
  }
}

/**
 * Find fields that differ between two objects
 */
export function findConflictingFields(a: unknown, b: unknown): string[] {
  const conflicts: string[] = []

  if (typeof a !== "object" || typeof b !== "object" || !a || !b) {
    return a !== b ? ["value"] : []
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])

  for (const key of allKeys) {
    if (JSON.stringify(aObj[key]) !== JSON.stringify(bObj[key])) {
      conflicts.push(key)
    }
  }

  return conflicts
}

/**
 * Resolve conflict using specified strategy
 */
export function resolveConflict(
  conflict: SyncConflict,
  resolution: ConflictResolution
): { resolved: SyncConflict; data: unknown } {
  let resolvedData: unknown

  switch (resolution) {
    case "client_wins":
      resolvedData = conflict.localData
      break
    case "server_wins":
      resolvedData = conflict.serverData
      break
    case "merge":
      const mergeResult = mergeData(conflict.localData, conflict.serverData)
      resolvedData = mergeResult.mergedData
      break
    default:
      resolvedData = conflict.serverData // Default to server
  }

  return {
    resolved: {
      ...conflict,
      resolvedAt: new Date(),
      resolution,
    },
    data: resolvedData,
  }
}

/**
 * Auto-merge two data objects
 */
export function mergeData(local: unknown, server: unknown): MergeResult {
  if (typeof local !== "object" || typeof server !== "object" || !local || !server) {
    // Can't merge non-objects
    return {
      success: false,
      mergedData: server,
      conflicts: ["value"],
    }
  }

  const localObj = local as Record<string, unknown>
  const serverObj = server as Record<string, unknown>
  const merged: Record<string, unknown> = {}
  const conflicts: string[] = []

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)])

  for (const key of allKeys) {
    const localValue = localObj[key]
    const serverValue = serverObj[key]

    if (localValue === undefined) {
      // Server has field, local doesn't - use server
      merged[key] = serverValue
    } else if (serverValue === undefined) {
      // Local has field, server doesn't - use local
      merged[key] = localValue
    } else if (JSON.stringify(localValue) === JSON.stringify(serverValue)) {
      // Same value - use either
      merged[key] = localValue
    } else {
      // Conflict - prefer server for now, record conflict
      merged[key] = serverValue
      conflicts.push(key)
    }
  }

  return {
    success: conflicts.length === 0,
    mergedData: merged,
    conflicts,
  }
}

// =============================================================================
// OPTIMISTIC UPDATES
// =============================================================================

/**
 * Create optimistic update
 */
export function createOptimisticUpdate(
  entityId: string,
  operation: OperationType,
  data: unknown
): OptimisticUpdate {
  return {
    id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityId,
    operation,
    data,
    timestamp: new Date(),
    confirmed: false,
    rolledBack: false,
  }
}

/**
 * Confirm optimistic update
 */
export function confirmOptimisticUpdate(update: OptimisticUpdate): OptimisticUpdate {
  return {
    ...update,
    confirmed: true,
  }
}

/**
 * Rollback optimistic update
 */
export function rollbackOptimisticUpdate(update: OptimisticUpdate): OptimisticUpdate {
  return {
    ...update,
    rolledBack: true,
  }
}

/**
 * Apply optimistic update to entity
 */
export function applyOptimisticUpdate(
  entity: SyncedEntity,
  update: OptimisticUpdate
): SyncedEntity {
  if (update.operation === "delete") {
    return {
      ...entity,
      syncState: "syncing",
    }
  }

  return {
    ...entity,
    data: update.operation === "create" ? update.data : mergeData(entity.data, update.data).mergedData,
    syncState: "syncing",
    localChanges: [
      ...(entity.localChanges ?? []),
      {
        id: update.id,
        operation: update.operation,
        newValue: update.data,
        timestamp: update.timestamp,
        applied: true,
        synced: false,
      },
    ],
  }
}

/**
 * Revert optimistic update from entity
 */
export function revertOptimisticUpdate(
  entity: SyncedEntity,
  update: OptimisticUpdate,
  originalData: unknown
): SyncedEntity {
  const localChanges = entity.localChanges?.filter(c => c.id !== update.id) ?? []

  return {
    ...entity,
    data: originalData,
    syncState: "idle",
    localChanges,
  }
}

// =============================================================================
// DEVICE SYNC
// =============================================================================

/**
 * Create device state
 */
export function createDeviceState(deviceId: string): DeviceState {
  return {
    deviceId,
    lastSeen: new Date(),
    syncVersion: 0,
    pendingChanges: 0,
    online: true,
  }
}

/**
 * Update device state
 */
export function updateDeviceState(
  state: DeviceState,
  updates: Partial<DeviceState>
): DeviceState {
  return {
    ...state,
    ...updates,
    lastSeen: new Date(),
  }
}

/**
 * Mark device offline
 */
export function markDeviceOffline(state: DeviceState): DeviceState {
  return {
    ...state,
    online: false,
  }
}

/**
 * Check if device is stale
 */
export function isDeviceStale(state: DeviceState, maxAgeMs: number = 60000): boolean {
  return Date.now() - state.lastSeen.getTime() > maxAgeMs
}

// =============================================================================
// SYNC SESSION
// =============================================================================

/**
 * Create sync session
 */
export function createSyncSession(memberId: string, deviceId: string): SyncSession {
  const deviceState = createDeviceState(deviceId)

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    memberId,
    devices: new Map([[deviceId, deviceState]]),
    activeConflicts: [],
    pendingUpdates: [],
    startedAt: new Date(),
    lastActivityAt: new Date(),
  }
}

/**
 * Add device to session
 */
export function addDeviceToSession(
  session: SyncSession,
  deviceId: string
): SyncSession {
  const newDevices = new Map(session.devices)
  newDevices.set(deviceId, createDeviceState(deviceId))

  return {
    ...session,
    devices: newDevices,
    lastActivityAt: new Date(),
  }
}

/**
 * Remove device from session
 */
export function removeDeviceFromSession(
  session: SyncSession,
  deviceId: string
): SyncSession {
  const newDevices = new Map(session.devices)
  newDevices.delete(deviceId)

  return {
    ...session,
    devices: newDevices,
    lastActivityAt: new Date(),
  }
}

/**
 * Add conflict to session
 */
export function addConflictToSession(
  session: SyncSession,
  conflict: SyncConflict
): SyncSession {
  return {
    ...session,
    activeConflicts: [...session.activeConflicts, conflict],
    lastActivityAt: new Date(),
  }
}

/**
 * Remove conflict from session
 */
export function removeConflictFromSession(
  session: SyncSession,
  conflictId: string
): SyncSession {
  return {
    ...session,
    activeConflicts: session.activeConflicts.filter(c => c.id !== conflictId),
    lastActivityAt: new Date(),
  }
}

/**
 * Add pending update to session
 */
export function addPendingUpdate(
  session: SyncSession,
  update: OptimisticUpdate
): SyncSession {
  return {
    ...session,
    pendingUpdates: [...session.pendingUpdates, update],
    lastActivityAt: new Date(),
  }
}

/**
 * Confirm pending update in session
 */
export function confirmPendingUpdate(
  session: SyncSession,
  updateId: string
): SyncSession {
  return {
    ...session,
    pendingUpdates: session.pendingUpdates.map(u =>
      u.id === updateId ? confirmOptimisticUpdate(u) : u
    ),
    lastActivityAt: new Date(),
  }
}

/**
 * Rollback pending update in session
 */
export function rollbackPendingUpdate(
  session: SyncSession,
  updateId: string
): SyncSession {
  return {
    ...session,
    pendingUpdates: session.pendingUpdates.map(u =>
      u.id === updateId ? rollbackOptimisticUpdate(u) : u
    ),
    lastActivityAt: new Date(),
  }
}

/**
 * Clean up confirmed/rolled back updates
 */
export function cleanupPendingUpdates(session: SyncSession): SyncSession {
  return {
    ...session,
    pendingUpdates: session.pendingUpdates.filter(
      u => !u.confirmed && !u.rolledBack
    ),
    lastActivityAt: new Date(),
  }
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Create synced entity
 */
export function createSyncedEntity(
  id: string,
  type: string,
  data: unknown,
  deviceId: string
): SyncedEntity {
  return {
    id,
    type,
    version: createSyncVersion(deviceId, data),
    data,
    syncState: "idle",
  }
}

/**
 * Update synced entity
 */
export function updateSyncedEntity(
  entity: SyncedEntity,
  data: unknown,
  deviceId: string
): SyncedEntity {
  return {
    ...entity,
    version: incrementVersion(entity.version, deviceId, data),
    data,
    syncState: "syncing",
  }
}

/**
 * Mark entity as synced
 */
export function markEntitySynced(entity: SyncedEntity): SyncedEntity {
  return {
    ...entity,
    syncState: "idle",
    lastSyncedAt: new Date(),
    localChanges: entity.localChanges?.map(c => ({ ...c, synced: true })) ?? [],
  }
}

/**
 * Mark entity as conflicted
 */
export function markEntityConflicted(entity: SyncedEntity): SyncedEntity {
  return {
    ...entity,
    syncState: "conflict",
  }
}

/**
 * Sync entity with server version
 */
export function syncWithServer(
  entity: SyncedEntity,
  serverVersion: SyncVersion,
  serverData: unknown
): { entity: SyncedEntity; conflict: SyncConflict | null } {
  // Check for conflict
  const conflict = detectConflict(
    entity.id,
    entity.type,
    entity.version,
    serverVersion,
    entity.data,
    serverData
  )

  if (conflict) {
    return {
      entity: markEntityConflicted(entity),
      conflict,
    }
  }

  // Server is newer - update
  if (isNewer(serverVersion, entity.version)) {
    return {
      entity: {
        ...entity,
        version: serverVersion,
        data: serverData,
        syncState: "idle",
        lastSyncedAt: new Date(),
        localChanges: [],
      },
      conflict: null,
    }
  }

  // Local is newer - keep local, mark for sync
  return {
    entity: {
      ...entity,
      syncState: "syncing",
    },
    conflict: null,
  }
}

// =============================================================================
// SYNC RESULT
// =============================================================================

/**
 * Create sync result
 */
export function createSyncResult(
  startTime: Date,
  entitiesSynced: number,
  conflicts: SyncConflict[],
  errors: SyncError[]
): SyncResult {
  return {
    success: errors.length === 0,
    entitiesSynced,
    conflicts,
    errors,
    duration: Date.now() - startTime.getTime(),
  }
}

/**
 * Add error to sync result
 */
export function addSyncError(
  result: SyncResult,
  entityId: string,
  operation: OperationType,
  message: string,
  recoverable: boolean
): SyncResult {
  return {
    ...result,
    success: false,
    errors: [
      ...result.errors,
      { entityId, operation, message, recoverable },
    ],
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate sync ID
 */
export function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get pending changes count
 */
export function getPendingChangesCount(entity: SyncedEntity): number {
  return entity.localChanges?.filter(c => !c.synced).length ?? 0
}

/**
 * Check if entity has unsynced changes
 */
export function hasUnsyncedChanges(entity: SyncedEntity): boolean {
  return getPendingChangesCount(entity) > 0
}

/**
 * Get time since last sync
 */
export function getTimeSinceLastSync(entity: SyncedEntity): number | null {
  if (!entity.lastSyncedAt) return null
  return Date.now() - entity.lastSyncedAt.getTime()
}

/**
 * Format sync state for display
 */
export function formatSyncState(state: SyncState): string {
  const stateMap: Record<SyncState, string> = {
    idle: "Synced",
    syncing: "Syncing...",
    conflict: "Conflict",
    error: "Sync Error",
    offline: "Offline",
  }

  return stateMap[state]
}

/**
 * Get sync state color
 */
export function getSyncStateColor(state: SyncState): string {
  const colorMap: Record<SyncState, string> = {
    idle: "#22c55e", // green
    syncing: "#3b82f6", // blue
    conflict: "#f97316", // orange
    error: "#ef4444", // red
    offline: "#6b7280", // gray
  }

  return colorMap[state]
}
