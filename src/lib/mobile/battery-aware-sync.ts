/**
 * Battery-Aware Sync Service
 *
 * Optimizes sync behavior based on device battery status:
 * - Adjusts sync frequency based on battery level
 * - Reduces data transfer when battery is low
 * - Implements intelligent background sync strategies
 */

// =============================================================================
// TYPES
// =============================================================================

export type BatteryLevel = "critical" | "low" | "medium" | "high" | "full"
export type ChargingState = "charging" | "discharging" | "full" | "unknown"
export type SyncStrategy = "aggressive" | "normal" | "conservative" | "minimal"

export interface BatteryStatus {
  level: number // 0-100
  batteryLevel: BatteryLevel
  charging: boolean
  chargingState: ChargingState
  remainingTime?: number // minutes until empty/full
}

export interface SyncConfig {
  strategy: SyncStrategy
  syncInterval: number // seconds
  maxPayloadSize: number // bytes
  enableBackgroundSync: boolean
  enablePush: boolean
  batchSize: number
  retryAttempts: number
  retryDelay: number // seconds
}

export interface DeviceSyncProfile {
  deviceId: string
  batteryStatus: BatteryStatus
  lastSyncTimestamp: string
  syncConfig: SyncConfig
  preferredSyncTime?: string // HH:mm format
  syncOnWifiOnly: boolean
}

export interface SyncSchedule {
  nextSyncTime: Date
  reason: string
  config: SyncConfig
}

// =============================================================================
// BATTERY LEVEL CLASSIFICATION
// =============================================================================

const BATTERY_THRESHOLDS = {
  critical: 10,
  low: 20,
  medium: 50,
  high: 80,
} as const

/**
 * Classify battery level into categories
 */
export function classifyBatteryLevel(percentage: number): BatteryLevel {
  if (percentage <= BATTERY_THRESHOLDS.critical) return "critical"
  if (percentage <= BATTERY_THRESHOLDS.low) return "low"
  if (percentage <= BATTERY_THRESHOLDS.medium) return "medium"
  if (percentage <= BATTERY_THRESHOLDS.high) return "high"
  return "full"
}

/**
 * Parse battery status from client headers
 */
export function parseBatteryStatus(headers: Headers): BatteryStatus {
  const level = parseInt(headers.get("X-Battery-Level") ?? "100", 10)
  const charging = headers.get("X-Battery-Charging") === "true"
  const chargingStateHeader = headers.get("X-Battery-State") ?? "unknown"
  const remainingTimeHeader = headers.get("X-Battery-Remaining")

  const validLevel = isNaN(level) ? 100 : Math.min(Math.max(level, 0), 100)
  const chargingState = ["charging", "discharging", "full"].includes(chargingStateHeader)
    ? (chargingStateHeader as ChargingState)
    : "unknown"
  const remainingTime = remainingTimeHeader
    ? parseInt(remainingTimeHeader, 10)
    : undefined

  return {
    level: validLevel,
    batteryLevel: classifyBatteryLevel(validLevel),
    charging,
    chargingState,
    remainingTime: remainingTime && !isNaN(remainingTime) ? remainingTime : undefined,
  }
}

// =============================================================================
// SYNC STRATEGY DETERMINATION
// =============================================================================

/**
 * Default sync configurations per strategy
 */
export const SYNC_CONFIGS: Record<SyncStrategy, SyncConfig> = {
  aggressive: {
    strategy: "aggressive",
    syncInterval: 30, // 30 seconds
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    enableBackgroundSync: true,
    enablePush: true,
    batchSize: 100,
    retryAttempts: 5,
    retryDelay: 5,
  },
  normal: {
    strategy: "normal",
    syncInterval: 60, // 1 minute
    maxPayloadSize: 5 * 1024 * 1024, // 5MB
    enableBackgroundSync: true,
    enablePush: true,
    batchSize: 50,
    retryAttempts: 3,
    retryDelay: 10,
  },
  conservative: {
    strategy: "conservative",
    syncInterval: 300, // 5 minutes
    maxPayloadSize: 1 * 1024 * 1024, // 1MB
    enableBackgroundSync: true,
    enablePush: false,
    batchSize: 25,
    retryAttempts: 2,
    retryDelay: 30,
  },
  minimal: {
    strategy: "minimal",
    syncInterval: 900, // 15 minutes
    maxPayloadSize: 256 * 1024, // 256KB
    enableBackgroundSync: false,
    enablePush: false,
    batchSize: 10,
    retryAttempts: 1,
    retryDelay: 60,
  },
}

/**
 * Determine optimal sync strategy based on battery status
 */
export function determineSyncStrategy(batteryStatus: BatteryStatus): SyncStrategy {
  const { batteryLevel, charging } = batteryStatus

  // Always aggressive when charging
  if (charging) {
    return "aggressive"
  }

  // Map battery level to strategy
  switch (batteryLevel) {
    case "full":
    case "high":
      return "normal"
    case "medium":
      return "conservative"
    case "low":
      return "minimal"
    case "critical":
      return "minimal"
    default:
      return "normal"
  }
}

/**
 * Get sync configuration for current battery status
 */
export function getSyncConfig(batteryStatus: BatteryStatus): SyncConfig {
  const strategy = determineSyncStrategy(batteryStatus)
  return { ...SYNC_CONFIGS[strategy] }
}

// =============================================================================
// SYNC SCHEDULING
// =============================================================================

/**
 * Calculate next sync time based on battery and usage patterns
 */
export function calculateNextSyncTime(
  batteryStatus: BatteryStatus,
  lastSyncTime: Date,
  userActivityLevel: "active" | "idle" | "background" = "active"
): SyncSchedule {
  const config = getSyncConfig(batteryStatus)
  let intervalMultiplier = 1
  let reason = "Normal sync interval"

  // Adjust based on user activity
  if (userActivityLevel === "idle") {
    intervalMultiplier = 2
    reason = "User idle, extended interval"
  } else if (userActivityLevel === "background") {
    intervalMultiplier = 4
    reason = "App in background, minimal sync"
  }

  // Further adjust for critical battery
  if (batteryStatus.batteryLevel === "critical" && !batteryStatus.charging) {
    intervalMultiplier = Math.max(intervalMultiplier, 6)
    reason = "Critical battery, emergency mode"
  }

  const intervalMs = config.syncInterval * 1000 * intervalMultiplier
  const nextSyncTime = new Date(lastSyncTime.getTime() + intervalMs)

  return {
    nextSyncTime,
    reason,
    config,
  }
}

/**
 * Check if sync should be delayed due to battery constraints
 */
export function shouldDelaySyncForBattery(
  batteryStatus: BatteryStatus,
  pendingDataSize: number
): { shouldDelay: boolean; reason: string; suggestedDelay?: number } {
  const { batteryLevel, charging, remainingTime } = batteryStatus

  // Never delay if charging
  if (charging) {
    return { shouldDelay: false, reason: "Device charging" }
  }

  // Check critical battery
  if (batteryLevel === "critical") {
    return {
      shouldDelay: true,
      reason: "Critical battery level",
      suggestedDelay: 900, // 15 minutes
    }
  }

  // Check if large sync would drain battery significantly
  const config = getSyncConfig(batteryStatus)
  if (pendingDataSize > config.maxPayloadSize) {
    return {
      shouldDelay: true,
      reason: "Pending data exceeds recommended size for current battery",
      suggestedDelay: 300, // 5 minutes
    }
  }

  // Check remaining battery time
  if (remainingTime && remainingTime < 30 && batteryLevel === "low") {
    return {
      shouldDelay: true,
      reason: "Very low remaining battery time",
      suggestedDelay: 600, // 10 minutes
    }
  }

  return { shouldDelay: false, reason: "Battery sufficient for sync" }
}

// =============================================================================
// BACKGROUND SYNC OPTIMIZATION
// =============================================================================

export interface BackgroundSyncTask {
  id: string
  type: "full" | "incremental" | "push"
  priority: number // 0-10, higher = more important
  dataSize: number
  createdAt: Date
  maxDelay: number // seconds until must be executed
}

/**
 * Prioritize background sync tasks based on battery
 */
export function prioritizeBackgroundTasks(
  tasks: BackgroundSyncTask[],
  batteryStatus: BatteryStatus
): BackgroundSyncTask[] {
  const config = getSyncConfig(batteryStatus)

  // Filter tasks if battery is critical
  let filteredTasks = tasks
  if (batteryStatus.batteryLevel === "critical" && !batteryStatus.charging) {
    // Only keep high priority tasks
    filteredTasks = tasks.filter(task => task.priority >= 7)
  }

  // Sort by priority and deadline
  return filteredTasks.sort((a, b) => {
    // Critical tasks first
    if (a.priority >= 9 && b.priority < 9) return -1
    if (b.priority >= 9 && a.priority < 9) return 1

    // Then by deadline
    const aUrgency = a.maxDelay - (Date.now() - a.createdAt.getTime()) / 1000
    const bUrgency = b.maxDelay - (Date.now() - b.createdAt.getTime()) / 1000

    if (aUrgency < 60 && bUrgency >= 60) return -1
    if (bUrgency < 60 && aUrgency >= 60) return 1

    // Then by priority
    return b.priority - a.priority
  }).slice(0, config.batchSize)
}

/**
 * Estimate battery impact of sync operation
 */
export function estimateBatteryImpact(
  dataSize: number,
  networkType: "wifi" | "cellular" | "unknown"
): { percentage: number; acceptable: boolean } {
  // Rough estimation (very simplified)
  // WiFi: ~0.1% per MB, Cellular: ~0.3% per MB
  const mbSize = dataSize / (1024 * 1024)
  const baseImpact = networkType === "wifi" ? 0.1 : networkType === "cellular" ? 0.3 : 0.2
  const percentage = mbSize * baseImpact

  return {
    percentage: Math.round(percentage * 100) / 100,
    acceptable: percentage < 1, // Less than 1% is acceptable
  }
}

// =============================================================================
// SYNC RESPONSE HEADERS
// =============================================================================

/**
 * Add battery-aware headers to sync response
 */
export function addBatteryAwareHeaders(
  headers: Headers,
  batteryStatus: BatteryStatus,
  config: SyncConfig
): void {
  headers.set("X-Sync-Strategy", config.strategy)
  headers.set("X-Sync-Interval", config.syncInterval.toString())
  headers.set("X-Max-Payload-Size", config.maxPayloadSize.toString())
  headers.set("X-Background-Sync-Enabled", config.enableBackgroundSync.toString())
  headers.set("X-Push-Enabled", config.enablePush.toString())
  headers.set("X-Batch-Size", config.batchSize.toString())

  // Include recommended next sync time
  const nextSync = calculateNextSyncTime(batteryStatus, new Date())
  headers.set("X-Next-Sync-Time", nextSync.nextSyncTime.toISOString())
  headers.set("X-Sync-Reason", nextSync.reason)
}

// =============================================================================
// DEVICE PROFILE MANAGEMENT
// =============================================================================

/**
 * Create or update device sync profile
 */
export function createDeviceSyncProfile(
  deviceId: string,
  batteryStatus: BatteryStatus,
  options: {
    preferredSyncTime?: string
    syncOnWifiOnly?: boolean
  } = {}
): DeviceSyncProfile {
  const config = getSyncConfig(batteryStatus)

  return {
    deviceId,
    batteryStatus,
    lastSyncTimestamp: new Date().toISOString(),
    syncConfig: config,
    preferredSyncTime: options.preferredSyncTime,
    syncOnWifiOnly: options.syncOnWifiOnly ?? false,
  }
}

/**
 * Update device sync profile with new battery status
 */
export function updateDeviceSyncProfile(
  profile: DeviceSyncProfile,
  batteryStatus: BatteryStatus
): DeviceSyncProfile {
  const config = getSyncConfig(batteryStatus)

  return {
    ...profile,
    batteryStatus,
    syncConfig: config,
    lastSyncTimestamp: new Date().toISOString(),
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { BATTERY_THRESHOLDS }
