/**
 * Mobile Optimization Tests
 *
 * Tests for:
 * - Response compression (gzip/brotli)
 * - Delta sync functionality
 * - Battery-aware sync strategies
 * - Connectivity handling
 */

import { describe, it, expect } from "vitest"
import {
  compressData,
  decompressData,
  compressJsonResponse,
  detectCompressionAlgorithm,
  calculateDelta,
  calculateDeltaPaginated,
  optimizePayload,
  optimizeArrayPayload,
  MobileResponseBuilder,
  getCompressionPreferences,
  shouldCompress,
  type CompressionAlgorithm,
} from "@/lib/mobile/response-compression"
import {
  classifyBatteryLevel,
  parseBatteryStatus,
  determineSyncStrategy,
  getSyncConfig,
  calculateNextSyncTime,
  shouldDelaySyncForBattery,
  prioritizeBackgroundTasks,
  estimateBatteryImpact,
  createDeviceSyncProfile,
  updateDeviceSyncProfile,
  SYNC_CONFIGS,
  BATTERY_THRESHOLDS,
  type BatteryStatus,
  type BackgroundSyncTask,
} from "@/lib/mobile/battery-aware-sync"
import {
  parseNetworkStatus,
  determineNetworkQuality,
  getAdaptivePayloadConfig,
  getRetryStrategy,
  calculateRetryDelay,
  isRetryableStatusCode,
  createOfflineOperation,
  addToOfflineQueue,
  sortOfflineQueue,
  getBatchFromQueue,
  markOperationProcessed,
  cleanupOfflineQueue,
  createOfflineQueue,
  shouldOperateOffline,
  estimateTransferTime,
  PAYLOAD_CONFIGS,
  type NetworkStatus,
} from "@/lib/mobile/connectivity-handler"

// =============================================================================
// COMPRESSION TESTS
// =============================================================================

describe("Response Compression", () => {
  describe("detectCompressionAlgorithm", () => {
    it("should detect brotli from Accept-Encoding", () => {
      expect(detectCompressionAlgorithm("br, gzip, deflate")).toBe("br")
    })

    it("should detect gzip when brotli not available", () => {
      expect(detectCompressionAlgorithm("gzip, deflate")).toBe("gzip")
    })

    it("should return none when no compression available", () => {
      expect(detectCompressionAlgorithm("identity")).toBe("none")
      expect(detectCompressionAlgorithm(null)).toBe("none")
    })
  })

  describe("compressData and decompressData", () => {
    const testData = "Hello World! This is test data that should be compressed."

    it("should compress and decompress with gzip", () => {
      const compressed = compressData(testData, "gzip")
      expect(compressed.length).toBeLessThan(Buffer.byteLength(testData, "utf-8") * 2)

      const decompressed = decompressData(compressed, "gzip")
      expect(decompressed.toString("utf-8")).toBe(testData)
    })

    it("should compress and decompress with brotli", () => {
      const compressed = compressData(testData, "br")
      expect(compressed).toBeDefined()

      const decompressed = decompressData(compressed, "br")
      expect(decompressed.toString("utf-8")).toBe(testData)
    })

    it("should return original data with none algorithm", () => {
      const data = Buffer.from(testData, "utf-8")
      const result = compressData(data, "none")
      expect(result).toEqual(data)
    })
  })

  describe("compressJsonResponse", () => {
    it("should not compress small payloads", () => {
      const smallData = { key: "value" }
      const result = compressJsonResponse(smallData, { minSize: 1024 })

      expect(result.compressed).toBe(false)
      expect(result.algorithm).toBe("none")
    })

    it("should compress large payloads", () => {
      const largeData = { data: "x".repeat(2000) }
      const result = compressJsonResponse(largeData, { algorithm: "gzip", minSize: 100 })

      expect(result.compressed).toBe(true)
      expect(result.algorithm).toBe("gzip")
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it("should calculate compression ratio", () => {
      const data = { data: "x".repeat(5000) }
      const result = compressJsonResponse(data, { algorithm: "gzip", minSize: 100 })

      expect(result.originalSize).toBeGreaterThan(5000)
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })

  describe("shouldCompress", () => {
    it("should return true for compressible types", () => {
      expect(shouldCompress("application/json")).toBe(true)
      expect(shouldCompress("text/plain")).toBe(true)
      expect(shouldCompress("text/html")).toBe(true)
    })

    it("should return false for non-compressible types", () => {
      expect(shouldCompress("image/png")).toBe(false)
      expect(shouldCompress("video/mp4")).toBe(false)
    })
  })
})

// =============================================================================
// DELTA SYNC TESTS
// =============================================================================

describe("Delta Sync", () => {
  interface TestItem {
    id: string
    name: string
    updatedAt: string
  }

  const createTestItem = (id: string, minutesAgo: number): TestItem => ({
    id,
    name: `Item ${id}`,
    updatedAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  })

  describe("calculateDelta", () => {
    it("should identify created items", () => {
      const current = [
        createTestItem("1", 5),
        createTestItem("2", 5),
        createTestItem("3", 5),
      ]
      const lastSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const knownIds = ["1", "2"]

      const delta = calculateDelta(current, lastSync, knownIds)

      expect(delta.created.length).toBe(1)
      expect(delta.created[0]!.id).toBe("3")
    })

    it("should identify updated items", () => {
      const current = [
        createTestItem("1", 5), // Updated 5 mins ago
        createTestItem("2", 15), // Updated 15 mins ago
      ]
      const lastSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const knownIds = ["1", "2"]

      const delta = calculateDelta(current, lastSync, knownIds)

      expect(delta.updated.length).toBe(1)
      expect(delta.updated[0]!.id).toBe("1")
    })

    it("should identify deleted items", () => {
      const current = [createTestItem("1", 5)]
      const lastSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const knownIds = ["1", "2", "3"]

      const delta = calculateDelta(current, lastSync, knownIds)

      expect(delta.deleted.length).toBe(2)
      expect(delta.deleted).toContain("2")
      expect(delta.deleted).toContain("3")
    })
  })

  describe("calculateDeltaPaginated", () => {
    it("should paginate results correctly", () => {
      const current = Array.from({ length: 10 }, (_, i) =>
        createTestItem(`${i + 1}`, 5)
      )
      const lastSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const knownIds: string[] = []

      const delta = calculateDeltaPaginated(current, lastSync, knownIds, 3)

      expect(delta.created.length + delta.updated.length).toBe(3)
      expect(delta.hasMore).toBe(true)
      expect(delta.nextCursor).toBeDefined()
    })
  })
})

// =============================================================================
// PAYLOAD OPTIMIZATION TESTS
// =============================================================================

describe("Payload Optimization", () => {
  describe("optimizePayload", () => {
    const testData = {
      id: "123",
      name: "Test Item",
      description: "A very long description that might need truncation",
      secret: "should-be-excluded",
      count: 42,
    }

    it("should include only specified fields", () => {
      const result = optimizePayload(testData, { includeFields: ["id", "name"] })

      expect(result).toHaveProperty("id")
      expect(result).toHaveProperty("name")
      expect(result).not.toHaveProperty("description")
      expect(result).not.toHaveProperty("secret")
    })

    it("should exclude specified fields", () => {
      const result = optimizePayload(testData, { excludeFields: ["secret"] })

      expect(result).not.toHaveProperty("secret")
      expect(result).toHaveProperty("id")
      expect(result).toHaveProperty("name")
    })

    it("should truncate long strings", () => {
      const result = optimizePayload(testData, { truncateStrings: 20 })

      expect(result["description"]).toBe("A very long descript...")
    })
  })

  describe("optimizeArrayPayload", () => {
    it("should limit number of items", () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
      const result = optimizeArrayPayload(data, { maxItems: 10 })

      expect(result.length).toBe(10)
    })
  })
})

// =============================================================================
// BATTERY-AWARE SYNC TESTS
// =============================================================================

describe("Battery-Aware Sync", () => {
  describe("classifyBatteryLevel", () => {
    it("should classify battery levels correctly", () => {
      expect(classifyBatteryLevel(5)).toBe("critical")
      expect(classifyBatteryLevel(10)).toBe("critical")
      expect(classifyBatteryLevel(15)).toBe("low")
      expect(classifyBatteryLevel(20)).toBe("low")
      expect(classifyBatteryLevel(40)).toBe("medium")
      expect(classifyBatteryLevel(70)).toBe("high")
      expect(classifyBatteryLevel(90)).toBe("full")
    })
  })

  describe("determineSyncStrategy", () => {
    it("should return aggressive when charging", () => {
      const status: BatteryStatus = {
        level: 20,
        batteryLevel: "low",
        charging: true,
        chargingState: "charging",
        online: true,
      }

      expect(determineSyncStrategy(status)).toBe("aggressive")
    })

    it("should return minimal for critical battery", () => {
      const status: BatteryStatus = {
        level: 5,
        batteryLevel: "critical",
        charging: false,
        chargingState: "discharging",
        online: true,
      }

      expect(determineSyncStrategy(status)).toBe("minimal")
    })

    it("should return normal for high battery", () => {
      const status: BatteryStatus = {
        level: 85,
        batteryLevel: "high",
        charging: false,
        chargingState: "discharging",
        online: true,
      }

      expect(determineSyncStrategy(status)).toBe("normal")
    })
  })

  describe("getSyncConfig", () => {
    it("should return correct config for strategy", () => {
      const status: BatteryStatus = {
        level: 100,
        batteryLevel: "full",
        charging: true,
        chargingState: "full",
        online: true,
      }

      const config = getSyncConfig(status)

      expect(config.strategy).toBe("aggressive")
      expect(config.syncInterval).toBe(30)
      expect(config.enableBackgroundSync).toBe(true)
    })
  })

  describe("shouldDelaySyncForBattery", () => {
    it("should not delay when charging", () => {
      const status: BatteryStatus = {
        level: 10,
        batteryLevel: "critical",
        charging: true,
        chargingState: "charging",
        online: true,
      }

      const result = shouldDelaySyncForBattery(status, 1000)

      expect(result.shouldDelay).toBe(false)
    })

    it("should delay for critical battery", () => {
      const status: BatteryStatus = {
        level: 5,
        batteryLevel: "critical",
        charging: false,
        chargingState: "discharging",
        online: true,
      }

      const result = shouldDelaySyncForBattery(status, 1000)

      expect(result.shouldDelay).toBe(true)
    })
  })

  describe("prioritizeBackgroundTasks", () => {
    it("should filter low priority tasks on critical battery", () => {
      const tasks: BackgroundSyncTask[] = [
        { id: "1", type: "full", priority: 3, dataSize: 100, createdAt: new Date(), maxDelay: 3600 },
        { id: "2", type: "push", priority: 9, dataSize: 50, createdAt: new Date(), maxDelay: 300 },
      ]

      const status: BatteryStatus = {
        level: 5,
        batteryLevel: "critical",
        charging: false,
        chargingState: "discharging",
        online: true,
      }

      const result = prioritizeBackgroundTasks(tasks, status)

      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe("2")
    })
  })

  describe("estimateBatteryImpact", () => {
    it("should estimate wifi impact lower than cellular", () => {
      const wifiImpact = estimateBatteryImpact(1024 * 1024, "wifi")
      const cellularImpact = estimateBatteryImpact(1024 * 1024, "cellular")

      expect(wifiImpact.percentage).toBeLessThan(cellularImpact.percentage)
    })
  })
})

// =============================================================================
// CONNECTIVITY HANDLER TESTS
// =============================================================================

describe("Connectivity Handler", () => {
  describe("determineNetworkQuality", () => {
    it("should return offline when not online", () => {
      expect(determineNetworkQuality({
        type: "wifi",
        online: false,
      })).toBe("offline")
    })

    it("should use effective type when available", () => {
      expect(determineNetworkQuality({
        type: "cellular",
        effectiveType: "4g",
        online: true,
      })).toBe("excellent")

      expect(determineNetworkQuality({
        type: "cellular",
        effectiveType: "2g",
        online: true,
      })).toBe("poor")
    })

    it("should use downlink speed", () => {
      expect(determineNetworkQuality({
        type: "wifi",
        downlink: 50,
        online: true,
      })).toBe("excellent")

      expect(determineNetworkQuality({
        type: "wifi",
        downlink: 0.5,
        online: true,
      })).toBe("poor")
    })
  })

  describe("getAdaptivePayloadConfig", () => {
    it("should return larger payloads for excellent network", () => {
      const status: NetworkStatus = {
        type: "wifi",
        quality: "excellent",
        online: true,
        saveData: false,
      }

      const config = getAdaptivePayloadConfig(status)

      expect(config.maxPayloadSize).toBeGreaterThan(5 * 1024 * 1024)
    })

    it("should reduce payloads for poor network", () => {
      const status: NetworkStatus = {
        type: "2g",
        quality: "poor",
        online: true,
        saveData: false,
      }

      const config = getAdaptivePayloadConfig(status)

      expect(config.maxPayloadSize).toBeLessThan(1024 * 1024)
    })

    it("should reduce further for save-data mode", () => {
      const normalStatus: NetworkStatus = {
        type: "wifi",
        quality: "good",
        online: true,
        saveData: false,
      }

      const saveDataStatus: NetworkStatus = {
        type: "wifi",
        quality: "good",
        online: true,
        saveData: true,
      }

      const normalConfig = getAdaptivePayloadConfig(normalStatus)
      const saveDataConfig = getAdaptivePayloadConfig(saveDataStatus)

      expect(saveDataConfig.maxPayloadSize).toBeLessThan(normalConfig.maxPayloadSize)
    })
  })

  describe("Retry Strategy", () => {
    it("should calculate retry delay with exponential backoff", () => {
      const strategy = getRetryStrategy({
        type: "wifi",
        quality: "good",
        online: true,
        saveData: false,
      })

      const delay1 = calculateRetryDelay(strategy, 0)
      const delay2 = calculateRetryDelay(strategy, 1)
      const delay3 = calculateRetryDelay(strategy, 2)

      expect(delay2).toBeGreaterThan(delay1)
      expect(delay3).toBeGreaterThan(delay2)
    })

    it("should return -1 when max retries exceeded", () => {
      const strategy = getRetryStrategy({
        type: "wifi",
        quality: "good",
        online: true,
        saveData: false,
      })

      const delay = calculateRetryDelay(strategy, strategy.maxRetries)

      expect(delay).toBe(-1)
    })

    it("should identify retryable status codes", () => {
      const strategy = getRetryStrategy({
        type: "wifi",
        quality: "good",
        online: true,
        saveData: false,
      })

      expect(isRetryableStatusCode(429, strategy)).toBe(true)
      expect(isRetryableStatusCode(503, strategy)).toBe(true)
      expect(isRetryableStatusCode(404, strategy)).toBe(false)
    })
  })

  describe("Offline Queue", () => {
    it("should create offline operation", () => {
      const op = createOfflineOperation("/api/tasks", "POST", { title: "Test" })

      expect(op.id).toMatch(/^op_/)
      expect(op.type).toBe("create")
      expect(op.method).toBe("POST")
    })

    it("should add operation to queue", () => {
      const queue = createOfflineQueue()
      const op = createOfflineOperation("/api/tasks", "POST", { title: "Test" })

      const newQueue = addToOfflineQueue(queue, op)

      expect(newQueue.operations.length).toBe(1)
      expect(newQueue.totalSize).toBeGreaterThan(0)
    })

    it("should sort queue by priority", () => {
      let queue = createOfflineQueue()
      queue = addToOfflineQueue(queue, { ...createOfflineOperation("/a", "POST"), priority: 3 })
      queue = addToOfflineQueue(queue, { ...createOfflineOperation("/b", "POST"), priority: 9 })
      queue = addToOfflineQueue(queue, { ...createOfflineOperation("/c", "POST"), priority: 5 })

      const sorted = sortOfflineQueue(queue)

      expect(sorted.operations[0]!.priority).toBe(9)
      expect(sorted.operations[2]!.priority).toBe(3)
    })

    it("should get batch within size limit", () => {
      let queue = createOfflineQueue()
      for (let i = 0; i < 10; i++) {
        queue = addToOfflineQueue(queue, createOfflineOperation("/api/test", "POST", { data: "x".repeat(100) }))
      }

      const { batch, remaining } = getBatchFromQueue(queue, 500)

      expect(batch.length).toBeLessThan(10)
      expect(remaining.operations.length).toBeGreaterThan(0)
    })

    it("should cleanup stale operations", () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      let queue = createOfflineQueue()
      queue = addToOfflineQueue(queue, {
        ...createOfflineOperation("/old", "POST"),
        createdAt: oldDate,
      })
      queue = addToOfflineQueue(queue, createOfflineOperation("/new", "POST"))

      const cleaned = cleanupOfflineQueue(queue, 7 * 24 * 60 * 60 * 1000)

      expect(cleaned.operations.length).toBe(1)
    })
  })

  describe("shouldOperateOffline", () => {
    it("should return true when offline", () => {
      expect(shouldOperateOffline({
        type: "offline",
        quality: "offline",
        online: false,
        saveData: false,
      })).toBe(true)
    })

    it("should return false when online", () => {
      expect(shouldOperateOffline({
        type: "wifi",
        quality: "good",
        online: true,
        saveData: false,
      })).toBe(false)
    })
  })

  describe("estimateTransferTime", () => {
    it("should estimate transfer time based on downlink", () => {
      const time = estimateTransferTime(1024 * 1024, {
        type: "wifi",
        quality: "excellent",
        online: true,
        saveData: false,
        downlink: 10, // 10 Mbps
      })

      expect(time).toBeGreaterThan(0)
      expect(time).toBeLessThan(5000) // Should be under 5 seconds for 1MB at 10Mbps
    })

    it("should return null when downlink unknown", () => {
      const time = estimateTransferTime(1024 * 1024, {
        type: "wifi",
        quality: "excellent",
        online: true,
        saveData: false,
      })

      expect(time).toBeNull()
    })
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Mobile Optimization Integration", () => {
  it("should provide consistent sync config across services", () => {
    const batteryStatus: BatteryStatus = {
      level: 50,
      batteryLevel: "medium",
      charging: false,
      chargingState: "discharging",
      online: true,
    }

    const networkStatus: NetworkStatus = {
      type: "4g",
      quality: "good",
      online: true,
      saveData: false,
    }

    const batteryConfig = getSyncConfig(batteryStatus)
    const networkConfig = getAdaptivePayloadConfig(networkStatus)

    // Both should be conservative/normal for medium battery and good network
    expect(batteryConfig.strategy).toBe("conservative")
    expect(networkConfig.maxPayloadSize).toBeGreaterThan(1024 * 1024)
  })
})
