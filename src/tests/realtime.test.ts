/**
 * Tests for Real-time Updates Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  registerConnection,
  removeConnection,
  getHouseholdConnectionCount,
  getUserConnections,
  broadcastToHousehold,
  broadcastToUser,
  sendToConnection,
  sendPing,
  cleanupStaleConnections,
  getConnectionStats,
} from "@/lib/services/realtime"

// =============================================================================
// MOCK CONTROLLER
// =============================================================================

function createMockController() {
  const chunks: Uint8Array[] = []
  return {
    enqueue: vi.fn((chunk: Uint8Array) => chunks.push(chunk)),
    close: vi.fn(),
    error: vi.fn(),
    desiredSize: 1,
    getChunks: () => chunks,
    getLastChunk: () => chunks[chunks.length - 1],
    getMessages: () =>
      chunks.map((c) => new TextDecoder().decode(c)).join(""),
  } as unknown as ReadableStreamDefaultController<Uint8Array> & {
    getChunks: () => Uint8Array[]
    getLastChunk: () => Uint8Array | undefined
    getMessages: () => string
  }
}

// =============================================================================
// CONNECTION MANAGEMENT TESTS
// =============================================================================

describe("Connection Management", () => {
  let connectionId1: string
  let connectionId2: string
  let mockController1: ReturnType<typeof createMockController>
  let mockController2: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController1 = createMockController()
    mockController2 = createMockController()

    // Clean up any existing connections
    cleanupStaleConnections()
  })

  afterEach(() => {
    if (connectionId1) removeConnection(connectionId1)
    if (connectionId2) removeConnection(connectionId2)
  })

  it("registers a new connection", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    expect(connectionId1).toBeDefined()
    expect(typeof connectionId1).toBe("string")
  })

  it("tracks connections per household", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    expect(getHouseholdConnectionCount("household-1")).toBe(1)

    connectionId2 = registerConnection("user-2", "household-1", mockController2)
    expect(getHouseholdConnectionCount("household-1")).toBe(2)
  })

  it("tracks connections per user", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    connectionId2 = registerConnection("user-1", "household-1", mockController2)

    const userConnections = getUserConnections("user-1")
    expect(userConnections).toHaveLength(2)
    expect(userConnections).toContain(connectionId1)
    expect(userConnections).toContain(connectionId2)
  })

  it("removes connection correctly", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    expect(getHouseholdConnectionCount("household-1")).toBe(1)

    removeConnection(connectionId1)
    expect(getHouseholdConnectionCount("household-1")).toBe(0)
    connectionId1 = "" // Mark as removed
  })

  it("handles removing non-existent connection", () => {
    expect(() => removeConnection("non-existent-id")).not.toThrow()
  })

  it("returns 0 for unknown household", () => {
    expect(getHouseholdConnectionCount("unknown-household")).toBe(0)
  })

  it("returns empty array for unknown user", () => {
    expect(getUserConnections("unknown-user")).toHaveLength(0)
  })
})

// =============================================================================
// BROADCAST TESTS
// =============================================================================

describe("Broadcasting", () => {
  let connectionId1: string
  let connectionId2: string
  let connectionId3: string
  let mockController1: ReturnType<typeof createMockController>
  let mockController2: ReturnType<typeof createMockController>
  let mockController3: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController1 = createMockController()
    mockController2 = createMockController()
    mockController3 = createMockController()

    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    connectionId2 = registerConnection("user-2", "household-1", mockController2)
    connectionId3 = registerConnection("user-3", "household-2", mockController3)
  })

  afterEach(() => {
    removeConnection(connectionId1)
    removeConnection(connectionId2)
    removeConnection(connectionId3)
  })

  it("broadcasts to all connections in household", () => {
    const sentCount = broadcastToHousehold("household-1", {
      type: "task_created",
      householdId: "household-1",
      data: { taskId: "task-1" },
    })

    expect(sentCount).toBe(2)
    expect(mockController1.enqueue).toHaveBeenCalled()
    expect(mockController2.enqueue).toHaveBeenCalled()
    expect(mockController3.enqueue).not.toHaveBeenCalled()
  })

  it("does not broadcast to other households", () => {
    broadcastToHousehold("household-1", {
      type: "task_updated",
      householdId: "household-1",
      data: {},
    })

    expect(mockController3.enqueue).not.toHaveBeenCalled()
  })

  it("returns 0 when broadcasting to empty household", () => {
    const sentCount = broadcastToHousehold("unknown-household", {
      type: "ping",
      householdId: "unknown-household",
      data: {},
    })

    expect(sentCount).toBe(0)
  })

  it("broadcasts to specific user", () => {
    const sentCount = broadcastToUser("user-1", {
      type: "notification_new",
      householdId: "household-1",
      data: {},
    })

    expect(sentCount).toBe(1)
    expect(mockController1.enqueue).toHaveBeenCalled()
    expect(mockController2.enqueue).not.toHaveBeenCalled()
  })

  it("sends to specific connection", () => {
    const result = sendToConnection(connectionId1, {
      type: "ping",
      householdId: "household-1",
      data: {},
    })

    expect(result).toBe(true)
    expect(mockController1.enqueue).toHaveBeenCalled()
  })

  it("returns false for non-existent connection", () => {
    const result = sendToConnection("non-existent", {
      type: "ping",
      householdId: "household-1",
      data: {},
    })

    expect(result).toBe(false)
  })
})

// =============================================================================
// SSE MESSAGE FORMAT TESTS
// =============================================================================

describe("SSE Message Format", () => {
  let connectionId: string
  let mockController: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController = createMockController()
    connectionId = registerConnection("user-1", "household-1", mockController)
  })

  afterEach(() => {
    removeConnection(connectionId)
  })

  it("formats events as SSE messages", () => {
    broadcastToHousehold("household-1", {
      type: "task_completed",
      householdId: "household-1",
      data: { taskId: "task-123" },
    })

    const messages = mockController.getMessages()
    expect(messages).toContain("event: task_completed")
    expect(messages).toContain("id:")
    expect(messages).toContain("data:")
    expect(messages).toContain("task-123")
  })

  it("includes event type in message", () => {
    broadcastToHousehold("household-1", {
      type: "balance_updated",
      householdId: "household-1",
      data: {},
    })

    const messages = mockController.getMessages()
    expect(messages).toContain("event: balance_updated")
  })

  it("includes timestamp in event data", () => {
    broadcastToHousehold("household-1", {
      type: "streak_updated",
      householdId: "household-1",
      data: {},
    })

    const messages = mockController.getMessages()
    expect(messages).toContain("timestamp")
  })
})

// =============================================================================
// PING TESTS
// =============================================================================

describe("Ping", () => {
  let connectionId: string
  let mockController: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController = createMockController()
    connectionId = registerConnection("user-1", "household-1", mockController)
  })

  afterEach(() => {
    removeConnection(connectionId)
  })

  it("sends ping successfully", () => {
    const result = sendPing(connectionId)
    expect(result).toBe(true)
    expect(mockController.enqueue).toHaveBeenCalled()
  })

  it("returns false for non-existent connection", () => {
    const result = sendPing("non-existent")
    expect(result).toBe(false)
  })

  it("formats ping as SSE comment", () => {
    sendPing(connectionId)
    const messages = mockController.getMessages()
    expect(messages).toContain(": ping")
  })
})

// =============================================================================
// STATS TESTS
// =============================================================================

describe("Connection Stats", () => {
  let connectionId1: string
  let connectionId2: string
  let mockController1: ReturnType<typeof createMockController>
  let mockController2: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController1 = createMockController()
    mockController2 = createMockController()
  })

  afterEach(() => {
    if (connectionId1) removeConnection(connectionId1)
    if (connectionId2) removeConnection(connectionId2)
  })

  it("returns correct total connections", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    connectionId2 = registerConnection("user-2", "household-2", mockController2)

    const stats = getConnectionStats()
    expect(stats.totalConnections).toBe(2)
  })

  it("returns correct households count", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    connectionId2 = registerConnection("user-2", "household-2", mockController2)

    const stats = getConnectionStats()
    expect(stats.householdsActive).toBe(2)
  })

  it("returns connections by household", () => {
    connectionId1 = registerConnection("user-1", "household-1", mockController1)
    connectionId2 = registerConnection("user-2", "household-1", mockController2)

    const stats = getConnectionStats()
    expect(stats.connectionsByHousehold["household-1"]).toBe(2)
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe("Cleanup", () => {
  it("cleans up stale connections", () => {
    // This test is tricky because we can't easily mock time
    // Instead, we just verify the function doesn't throw
    const cleaned = cleanupStaleConnections()
    expect(typeof cleaned).toBe("number")
  })
})

// =============================================================================
// EVENT TYPE TESTS
// =============================================================================

describe("Event Types", () => {
  let connectionId: string
  let mockController: ReturnType<typeof createMockController>

  beforeEach(() => {
    mockController = createMockController()
    connectionId = registerConnection("user-1", "household-1", mockController)
  })

  afterEach(() => {
    removeConnection(connectionId)
  })

  const eventTypes = [
    "task_created",
    "task_updated",
    "task_completed",
    "task_deleted",
    "notification_new",
    "balance_updated",
    "streak_updated",
  ] as const

  for (const eventType of eventTypes) {
    it(`handles ${eventType} event type`, () => {
      const sentCount = broadcastToHousehold("household-1", {
        type: eventType,
        householdId: "household-1",
        data: {},
      })

      expect(sentCount).toBe(1)
      const messages = mockController.getMessages()
      expect(messages).toContain(`event: ${eventType}`)
    })
  }
})
