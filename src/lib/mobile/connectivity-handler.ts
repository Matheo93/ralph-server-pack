/**
 * Connectivity Handler Service
 *
 * Manages network-aware API behavior:
 * - Network quality detection
 * - Adaptive payload sizing
 * - Smart retry strategies based on network type
 * - Offline queue management
 */

// =============================================================================
// TYPES
// =============================================================================

export type NetworkType = "wifi" | "4g" | "3g" | "2g" | "cellular" | "offline" | "unknown"
export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "offline"
export type ConnectionEffectiveType = "slow-2g" | "2g" | "3g" | "4g"

export interface NetworkStatus {
  type: NetworkType
  quality: NetworkQuality
  effectiveType?: ConnectionEffectiveType
  downlink?: number // Mbps
  rtt?: number // Round-trip time in ms
  saveData?: boolean // User requested reduced data mode
  online: boolean
}

export interface AdaptivePayloadConfig {
  maxPayloadSize: number // bytes
  imageQuality: number // 0-100
  enableCompression: boolean
  compressionLevel: number // 1-9
  enableThumbnails: boolean
  maxItemsPerPage: number
  enableDeltaSync: boolean
}

export interface RetryStrategy {
  maxRetries: number
  initialDelay: number // ms
  maxDelay: number // ms
  backoffMultiplier: number
  retryOnNetworkChange: boolean
  retryableStatusCodes: number[]
}

export interface OfflineOperation {
  id: string
  type: "create" | "update" | "delete"
  endpoint: string
  method: string
  body?: string
  createdAt: Date
  retryCount: number
  lastRetryAt?: Date
  priority: number // Higher = more important
}

export interface OfflineQueue {
  operations: OfflineOperation[]
  totalSize: number
  lastProcessedAt?: Date
}

// =============================================================================
// NETWORK QUALITY DETECTION
// =============================================================================

/**
 * Map effective connection type to quality
 */
const EFFECTIVE_TYPE_TO_QUALITY: Record<ConnectionEffectiveType, NetworkQuality> = {
  "slow-2g": "poor",
  "2g": "poor",
  "3g": "fair",
  "4g": "excellent",
}

/**
 * Parse network status from request headers
 */
export function parseNetworkStatus(headers: Headers): NetworkStatus {
  const networkType = (headers.get("X-Network-Type") ?? "unknown") as NetworkType
  const effectiveType = headers.get("X-Effective-Type") as ConnectionEffectiveType | null
  const downlink = parseFloat(headers.get("X-Downlink") ?? "0")
  const rtt = parseInt(headers.get("X-RTT") ?? "0", 10)
  const saveData = headers.get("X-Save-Data") === "true" || headers.get("Save-Data") === "on"
  const online = headers.get("X-Online") !== "false"

  const quality = determineNetworkQuality({
    type: networkType,
    effectiveType: effectiveType ?? undefined,
    downlink: !isNaN(downlink) ? downlink : undefined,
    rtt: !isNaN(rtt) ? rtt : undefined,
    online,
  })

  return {
    type: networkType,
    quality,
    effectiveType: effectiveType ?? undefined,
    downlink: !isNaN(downlink) ? downlink : undefined,
    rtt: !isNaN(rtt) ? rtt : undefined,
    saveData,
    online,
  }
}

/**
 * Determine network quality from available metrics
 */
export function determineNetworkQuality(status: {
  type: NetworkType
  effectiveType?: ConnectionEffectiveType
  downlink?: number
  rtt?: number
  online: boolean
}): NetworkQuality {
  const { type, effectiveType, downlink, rtt, online } = status

  if (!online || type === "offline") {
    return "offline"
  }

  // Use effective type if available
  if (effectiveType) {
    return EFFECTIVE_TYPE_TO_QUALITY[effectiveType]
  }

  // Use downlink speed
  if (downlink !== undefined) {
    if (downlink >= 10) return "excellent"
    if (downlink >= 5) return "good"
    if (downlink >= 1) return "fair"
    return "poor"
  }

  // Use RTT as fallback
  if (rtt !== undefined) {
    if (rtt <= 50) return "excellent"
    if (rtt <= 100) return "good"
    if (rtt <= 300) return "fair"
    return "poor"
  }

  // Use network type as last resort
  if (type === "wifi") return "good"
  if (type === "4g") return "good"
  if (type === "3g") return "fair"
  if (type === "2g" || type === "cellular") return "poor"

  return "fair" // Default assumption
}

// =============================================================================
// ADAPTIVE PAYLOAD CONFIGURATION
// =============================================================================

/**
 * Default configurations per network quality
 */
export const PAYLOAD_CONFIGS: Record<NetworkQuality, AdaptivePayloadConfig> = {
  excellent: {
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    imageQuality: 90,
    enableCompression: true,
    compressionLevel: 6,
    enableThumbnails: false,
    maxItemsPerPage: 100,
    enableDeltaSync: false,
  },
  good: {
    maxPayloadSize: 5 * 1024 * 1024, // 5MB
    imageQuality: 80,
    enableCompression: true,
    compressionLevel: 7,
    enableThumbnails: false,
    maxItemsPerPage: 50,
    enableDeltaSync: true,
  },
  fair: {
    maxPayloadSize: 1 * 1024 * 1024, // 1MB
    imageQuality: 60,
    enableCompression: true,
    compressionLevel: 8,
    enableThumbnails: true,
    maxItemsPerPage: 25,
    enableDeltaSync: true,
  },
  poor: {
    maxPayloadSize: 256 * 1024, // 256KB
    imageQuality: 40,
    enableCompression: true,
    compressionLevel: 9,
    enableThumbnails: true,
    maxItemsPerPage: 10,
    enableDeltaSync: true,
  },
  offline: {
    maxPayloadSize: 0,
    imageQuality: 0,
    enableCompression: false,
    compressionLevel: 0,
    enableThumbnails: false,
    maxItemsPerPage: 0,
    enableDeltaSync: false,
  },
}

/**
 * Get adaptive payload configuration for network status
 */
export function getAdaptivePayloadConfig(
  networkStatus: NetworkStatus
): AdaptivePayloadConfig {
  let config = { ...PAYLOAD_CONFIGS[networkStatus.quality] }

  // Further reduce if save-data mode is enabled
  if (networkStatus.saveData) {
    config = {
      ...config,
      maxPayloadSize: Math.min(config.maxPayloadSize, 256 * 1024),
      imageQuality: Math.min(config.imageQuality, 40),
      compressionLevel: Math.max(config.compressionLevel, 8),
      enableThumbnails: true,
      maxItemsPerPage: Math.min(config.maxItemsPerPage, 10),
      enableDeltaSync: true,
    }
  }

  return config
}

// =============================================================================
// RETRY STRATEGIES
// =============================================================================

/**
 * Default retry strategies per network quality
 */
export const RETRY_STRATEGIES: Record<NetworkQuality, RetryStrategy> = {
  excellent: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    retryOnNetworkChange: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  good: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryOnNetworkChange: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  fair: {
    maxRetries: 5,
    initialDelay: 3000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryOnNetworkChange: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  poor: {
    maxRetries: 7,
    initialDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2.5,
    retryOnNetworkChange: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  offline: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 0,
    retryOnNetworkChange: true,
    retryableStatusCodes: [],
  },
}

/**
 * Get retry strategy for network status
 */
export function getRetryStrategy(networkStatus: NetworkStatus): RetryStrategy {
  return { ...RETRY_STRATEGIES[networkStatus.quality] }
}

/**
 * Calculate next retry delay using exponential backoff
 */
export function calculateRetryDelay(
  strategy: RetryStrategy,
  attemptNumber: number
): number {
  if (attemptNumber >= strategy.maxRetries) {
    return -1 // No more retries
  }

  const delay = Math.min(
    strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attemptNumber),
    strategy.maxDelay
  )

  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1)

  return Math.round(delay + jitter)
}

/**
 * Check if status code is retryable
 */
export function isRetryableStatusCode(
  statusCode: number,
  strategy: RetryStrategy
): boolean {
  return strategy.retryableStatusCodes.includes(statusCode)
}

// =============================================================================
// OFFLINE QUEUE MANAGEMENT
// =============================================================================

/**
 * Create offline operation
 */
export function createOfflineOperation(
  endpoint: string,
  method: string,
  body?: unknown,
  priority: number = 5
): OfflineOperation {
  return {
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: method === "POST" ? "create" : method === "DELETE" ? "delete" : "update",
    endpoint,
    method,
    body: body ? JSON.stringify(body) : undefined,
    createdAt: new Date(),
    retryCount: 0,
    priority,
  }
}

/**
 * Add operation to offline queue
 */
export function addToOfflineQueue(
  queue: OfflineQueue,
  operation: OfflineOperation
): OfflineQueue {
  const bodySize = operation.body ? Buffer.byteLength(operation.body, "utf-8") : 0

  return {
    operations: [...queue.operations, operation],
    totalSize: queue.totalSize + bodySize,
    lastProcessedAt: queue.lastProcessedAt,
  }
}

/**
 * Sort offline queue by priority and age
 */
export function sortOfflineQueue(queue: OfflineQueue): OfflineQueue {
  const sortedOperations = [...queue.operations].sort((a, b) => {
    // Higher priority first
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    // Older operations first
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return {
    ...queue,
    operations: sortedOperations,
  }
}

/**
 * Get operations from queue that fit within size limit
 */
export function getBatchFromQueue(
  queue: OfflineQueue,
  maxSize: number
): { batch: OfflineOperation[]; remaining: OfflineQueue } {
  const sortedQueue = sortOfflineQueue(queue)
  const batch: OfflineOperation[] = []
  let currentSize = 0
  let batchEndIndex = 0

  for (const op of sortedQueue.operations) {
    const opSize = op.body ? Buffer.byteLength(op.body, "utf-8") : 100 // minimum overhead
    if (currentSize + opSize <= maxSize) {
      batch.push(op)
      currentSize += opSize
      batchEndIndex++
    } else {
      break
    }
  }

  const remaining: OfflineQueue = {
    operations: sortedQueue.operations.slice(batchEndIndex),
    totalSize: queue.totalSize - currentSize,
    lastProcessedAt: new Date(),
  }

  return { batch, remaining }
}

/**
 * Mark operation as processed
 */
export function markOperationProcessed(
  queue: OfflineQueue,
  operationId: string
): OfflineQueue {
  const operation = queue.operations.find(op => op.id === operationId)
  const bodySize = operation?.body ? Buffer.byteLength(operation.body, "utf-8") : 0

  return {
    operations: queue.operations.filter(op => op.id !== operationId),
    totalSize: Math.max(0, queue.totalSize - bodySize),
    lastProcessedAt: new Date(),
  }
}

/**
 * Mark operation for retry
 */
export function markOperationForRetry(
  queue: OfflineQueue,
  operationId: string
): OfflineQueue {
  return {
    ...queue,
    operations: queue.operations.map(op =>
      op.id === operationId
        ? {
            ...op,
            retryCount: op.retryCount + 1,
            lastRetryAt: new Date(),
          }
        : op
    ),
  }
}

/**
 * Remove stale operations from queue
 */
export function cleanupOfflineQueue(
  queue: OfflineQueue,
  maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days
  maxRetries: number = 10
): OfflineQueue {
  const now = Date.now()

  const validOperations = queue.operations.filter(op => {
    const age = now - op.createdAt.getTime()
    return age < maxAge && op.retryCount < maxRetries
  })

  const removedSize = queue.operations
    .filter(op => !validOperations.includes(op))
    .reduce((sum, op) => sum + (op.body ? Buffer.byteLength(op.body, "utf-8") : 0), 0)

  return {
    operations: validOperations,
    totalSize: Math.max(0, queue.totalSize - removedSize),
    lastProcessedAt: queue.lastProcessedAt,
  }
}

// =============================================================================
// RESPONSE HEADERS
// =============================================================================

/**
 * Add connectivity-aware headers to response
 */
export function addConnectivityHeaders(
  headers: Headers,
  networkStatus: NetworkStatus,
  config: AdaptivePayloadConfig
): void {
  headers.set("X-Network-Quality", networkStatus.quality)
  headers.set("X-Max-Payload-Size", config.maxPayloadSize.toString())
  headers.set("X-Items-Per-Page", config.maxItemsPerPage.toString())
  headers.set("X-Delta-Sync-Enabled", config.enableDeltaSync.toString())
  headers.set("X-Compression-Enabled", config.enableCompression.toString())

  if (networkStatus.saveData) {
    headers.set("X-Save-Data-Mode", "enabled")
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create empty offline queue
 */
export function createOfflineQueue(): OfflineQueue {
  return {
    operations: [],
    totalSize: 0,
  }
}

/**
 * Check if device should operate in offline mode
 */
export function shouldOperateOffline(networkStatus: NetworkStatus): boolean {
  return !networkStatus.online || networkStatus.quality === "offline"
}

/**
 * Estimate transfer time for payload
 */
export function estimateTransferTime(
  payloadSize: number,
  networkStatus: NetworkStatus
): number | null {
  const { downlink } = networkStatus

  if (!downlink || downlink <= 0) {
    return null
  }

  // Convert bytes to bits, downlink is in Mbps
  const bits = payloadSize * 8
  const mbps = downlink * 1_000_000

  return Math.ceil((bits / mbps) * 1000) // ms
}
