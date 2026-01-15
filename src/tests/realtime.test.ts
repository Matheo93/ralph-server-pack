/**
 * Realtime Features Tests
 *
 * Comprehensive tests for:
 * - WebSocket manager
 * - Event broadcaster
 * - Sync coordinator
 * - Notification center
 */

import { describe, it, expect, beforeEach } from "bun:test"

// WebSocket Manager imports
import {
  createConnectionInfo,
  updateConnectionState,
  recordHeartbeat,
  incrementReconnectAttempts,
  shouldReconnect,
  calculateReconnectDelay,
  createRoom,
  addMemberToRoom,
  removeMemberFromRoom,
  joinRoom,
  leaveRoom,
  createMessage,
  serializeMessage,
  parseMessage,
  isValidMessage,
  createMessageQueue,
  enqueueMessage,
  dequeueMessage,
  getQueueSize,
  createHeartbeatInfo,
  recordHeartbeatResponse,
  recordMissedHeartbeat,
  isConnectionHealthy,
  createConnectionPool,
  addConnection,
  removeConnection,
  updateConnection,
  getConnectionsInRoom,
} from "@/lib/realtime/websocket-manager"

// Event Broadcaster imports
import {
  createBroadcastEvent,
  createTaskEvent,
  createPresenceEvent,
  applyFilter,
  matchesSubscription,
  filterEventsForMember,
  createEventRouter,
  addSubscription,
  addMemberToRouterRoom,
  getTargetMembers,
  createDeliveryRecord,
  markDelivered,
  markAcknowledged,
  sortByPriority,
  groupByCategory,
  parseRoomId,
  type EventSubscription,
} from "@/lib/realtime/event-broadcaster"

// Sync Coordinator imports
import {
  createSyncVersion,
  incrementVersion,
  compareVersions,
  isNewer,
  versionsConflict,
  findConflictingFields,
  resolveConflict,
  mergeData,
  createOptimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  applyOptimisticUpdate,
  createDeviceState,
  isDeviceStale,
  createSyncSession,
  addDeviceToSession,
  addPendingUpdate,
  createSyncedEntity,
  updateSyncedEntity,
  syncWithServer,
} from "@/lib/realtime/sync-coordinator"

// Notification Center imports
import {
  createNotification,
  createTaskAssignedNotification,
  createAchievementNotification,
  createDeliveryRecord as createNotifDelivery,
  markAsSent,
  markAsDelivered as markNotifDelivered,
  markAsRead,
  markAsFailed,
  createDefaultPreferences,
  updateChannelPreferences,
  isTypeEnabled,
  getEnabledChannels,
  isInQuietHours,
  createNotificationQueue,
  addToQueue,
  getNextFromQueue,
  markProcessingComplete,
  createNotificationGroup,
  addToGroup,
  createNotificationStats,
  recordSent,
  recordDelivered as recordNotifDelivered,
  isExpired,
  isScheduledForFuture,
  formatNotificationForDisplay,
  getPriorityColor,
} from "@/lib/realtime/notification-center"

// =============================================================================
// WEBSOCKET MANAGER TESTS
// =============================================================================

describe("WebSocket Manager", () => {
  describe("Connection Management", () => {
    it("should create connection info", () => {
      const conn = createConnectionInfo("conn_1", { userId: "user_1" })
      expect(conn.id).toBe("conn_1")
      expect(conn.state).toBe("disconnected")
    })

    it("should update connection state", () => {
      const conn = createConnectionInfo("conn_1")
      const updated = updateConnectionState(conn, "connected")
      expect(updated.state).toBe("connected")
    })

    it("should record heartbeat", () => {
      const conn = createConnectionInfo("conn_1")
      const updated = recordHeartbeat(conn, 50)
      expect(updated.latency).toBe(50)
    })

    it("should track reconnect attempts", () => {
      let conn = createConnectionInfo("conn_1")
      conn = incrementReconnectAttempts(conn)
      expect(conn.reconnectAttempts).toBe(1)
    })

    it("should determine if reconnect is needed", () => {
      const conn = createConnectionInfo("conn_1")
      expect(shouldReconnect(conn, 5)).toBe(true)
    })

    it("should calculate exponential backoff delay", () => {
      const delay1 = calculateReconnectDelay(1000, 0)
      const delay2 = calculateReconnectDelay(1000, 2)
      expect(delay2).toBeGreaterThan(delay1)
    })
  })

  describe("Room Management", () => {
    it("should create room", () => {
      const room = createRoom("room_1", "Test Room")
      expect(room.id).toBe("room_1")
      expect(room.members.size).toBe(0)
    })

    it("should add/remove members from room", () => {
      let room = createRoom("room_1", "Test")
      room = addMemberToRoom(room, "conn_1")
      expect(room.members.size).toBe(1)
      room = removeMemberFromRoom(room, "conn_1")
      expect(room.members.size).toBe(0)
    })

    it("should track rooms for connection", () => {
      let conn = createConnectionInfo("conn_1")
      conn = joinRoom(conn, "room_1")
      expect(conn.rooms.size).toBe(1)
      conn = leaveRoom(conn, "room_1")
      expect(conn.rooms.size).toBe(0)
    })
  })

  describe("Message Handling", () => {
    it("should create messages", () => {
      const msg = createMessage("event", "task.created", { taskId: "t1" })
      expect(msg.type).toBe("event")
    })

    it("should serialize and parse messages", () => {
      const msg = createMessage("event", "test", { data: "value" })
      const serialized = serializeMessage(msg)
      const parsed = parseMessage(serialized)
      expect(parsed).not.toBeNull()
    })

    it("should validate message structure", () => {
      const validMsg = createMessage("event", "test")
      expect(isValidMessage(validMsg)).toBe(true)
    })
  })

  describe("Message Queue", () => {
    it("should manage message queue", () => {
      let queue = createMessageQueue(3)
      queue = enqueueMessage(queue, createMessage("event", "test1"))
      expect(getQueueSize(queue)).toBe(1)
    })

    it("should drop oldest when queue is full", () => {
      let queue = createMessageQueue(2)
      queue = enqueueMessage(queue, createMessage("event", "test1"))
      queue = enqueueMessage(queue, createMessage("event", "test2"))
      queue = enqueueMessage(queue, createMessage("event", "test3"))
      expect(queue.dropped).toBe(1)
    })
  })

  describe("Heartbeat Management", () => {
    it("should track heartbeat info", () => {
      let info = createHeartbeatInfo()
      info = recordHeartbeatResponse(info, 50)
      expect(info.missedCount).toBe(0)
    })

    it("should track missed heartbeats", () => {
      let info = createHeartbeatInfo()
      info = recordMissedHeartbeat(info)
      expect(info.missedCount).toBe(1)
    })

    it("should determine connection health", () => {
      let info = createHeartbeatInfo()
      expect(isConnectionHealthy(info)).toBe(true)
    })
  })

  describe("Connection Pool", () => {
    it("should manage connection pool", () => {
      let pool = createConnectionPool(10)
      const conn = createConnectionInfo("conn_1")
      pool = addConnection(pool, conn)!
      expect(pool.connections.size).toBe(1)
    })

    it("should track active connections", () => {
      let pool = createConnectionPool(10)
      let conn = createConnectionInfo("conn_1")
      pool = addConnection(pool, conn)!
      pool = updateConnection(pool, "conn_1", { state: "connected" })
      expect(pool.activeConnections).toBe(1)
    })
  })
})

// =============================================================================
// EVENT BROADCASTER TESTS
// =============================================================================

describe("Event Broadcaster", () => {
  describe("Event Creation", () => {
    it("should create broadcast event", () => {
      const event = createBroadcastEvent("task", "task.created", { taskId: "t1" })
      expect(event.category).toBe("task")
    })

    it("should create task event", () => {
      const event = createTaskEvent("h1", "created", "t1", "user1", "Alice")
      expect(event.category).toBe("task")
    })

    it("should create presence event", () => {
      const event = createPresenceEvent("m1", "Alice", "h1", "online")
      expect(event.category).toBe("presence")
    })
  })

  describe("Event Filtering", () => {
    it("should apply equality filter", () => {
      const event = createBroadcastEvent("task", "task.created", {})
      expect(applyFilter(event, { field: "category", operator: "eq", value: "task" })).toBe(true)
    })

    it("should match subscription filters", () => {
      const event = createBroadcastEvent("task", "task.created", {})
      const subscription: EventSubscription = {
        id: "sub_1",
        memberId: "m1",
        categories: ["task"],
        filters: [],
        createdAt: new Date(),
      }
      expect(matchesSubscription(event, subscription)).toBe(true)
    })

    it("should filter events for member", () => {
      const events = [
        createBroadcastEvent("task", "task.1", {}, { excludeMembers: ["m1"] }),
        createBroadcastEvent("task", "task.2", {}),
      ]
      const filtered = filterEventsForMember(events, "m1")
      expect(filtered.length).toBe(1)
    })
  })

  describe("Event Routing", () => {
    it("should manage subscriptions", () => {
      let router = createEventRouter()
      const subscription: EventSubscription = {
        id: "sub_1",
        memberId: "m1",
        categories: ["task"],
        filters: [],
        createdAt: new Date(),
      }
      router = addSubscription(router, subscription)
      expect(router.subscriptions.size).toBe(1)
    })

    it("should get target members for event", () => {
      let router = createEventRouter()
      router = addMemberToRouterRoom(router, "m1", "household:h1")
      const event = createBroadcastEvent("task", "test", {}, { targetRooms: ["household:h1"] })
      const targets = getTargetMembers(router, event)
      expect(targets.length).toBe(1)
    })
  })

  describe("Delivery Tracking", () => {
    it("should track delivery status", () => {
      let delivery = createDeliveryRecord("evt_1", "m1")
      delivery = markDelivered(delivery)
      expect(delivery.delivered).toBe(true)
    })
  })

  describe("Utilities", () => {
    it("should sort by priority", () => {
      const events = [
        createBroadcastEvent("task", "t1", {}, { priority: "low" }),
        createBroadcastEvent("task", "t2", {}, { priority: "urgent" }),
      ]
      const sorted = sortByPriority(events)
      expect(sorted[0].priority).toBe("urgent")
    })

    it("should parse room ID", () => {
      const parsed = parseRoomId("household:h123")
      expect(parsed?.type).toBe("household")
    })
  })
})

// =============================================================================
// SYNC COORDINATOR TESTS
// =============================================================================

describe("Sync Coordinator", () => {
  describe("Version Management", () => {
    it("should create sync version", () => {
      const version = createSyncVersion("device_1", { name: "test" })
      expect(version.version).toBe(1)
    })

    it("should increment version", () => {
      const v1 = createSyncVersion("d1", { a: 1 })
      const v2 = incrementVersion(v1, "d2", { a: 2 })
      expect(v2.version).toBe(2)
    })

    it("should compare versions", () => {
      const v1 = createSyncVersion("d1", {})
      const v2 = incrementVersion(v1, "d1", {})
      expect(isNewer(v2, v1)).toBe(true)
    })

    it("should detect version conflicts", () => {
      const v1 = createSyncVersion("d1", { a: 1 })
      const v2 = { ...createSyncVersion("d2", { a: 2 }), version: v1.version }
      expect(versionsConflict(v1, v2)).toBe(true)
    })
  })

  describe("Conflict Detection & Resolution", () => {
    it("should find conflicting fields", () => {
      const conflicts = findConflictingFields({ a: 1, b: 2 }, { a: 1, b: 3 })
      expect(conflicts).toContain("b")
    })

    it("should merge data", () => {
      const result = mergeData({ a: 1, b: 2 }, { a: 1, c: 3 })
      expect(result.mergedData).toEqual({ a: 1, b: 2, c: 3 })
    })

    it("should resolve conflicts", () => {
      const conflict = {
        id: "c1",
        entityId: "e1",
        entityType: "task",
        localVersion: createSyncVersion("d1", {}),
        serverVersion: createSyncVersion("d2", {}),
        localData: { value: "local" },
        serverData: { value: "server" },
        conflictingFields: ["value"],
        detectedAt: new Date(),
      }
      const result = resolveConflict(conflict, "client_wins")
      expect(result.data).toEqual({ value: "local" })
    })
  })

  describe("Optimistic Updates", () => {
    it("should create and confirm optimistic updates", () => {
      let update = createOptimisticUpdate("e1", "update", { name: "new" })
      expect(update.confirmed).toBe(false)
      update = confirmOptimisticUpdate(update)
      expect(update.confirmed).toBe(true)
    })

    it("should rollback optimistic updates", () => {
      let update = createOptimisticUpdate("e1", "update", {})
      update = rollbackOptimisticUpdate(update)
      expect(update.rolledBack).toBe(true)
    })
  })

  describe("Device Sync", () => {
    it("should create device state", () => {
      const state = createDeviceState("device_1")
      expect(state.online).toBe(true)
    })

    it("should detect stale devices", () => {
      const state = { ...createDeviceState("d1"), lastSeen: new Date(Date.now() - 120000) }
      expect(isDeviceStale(state, 60000)).toBe(true)
    })
  })

  describe("Sync Session", () => {
    it("should create sync session", () => {
      const session = createSyncSession("m1", "d1")
      expect(session.devices.size).toBe(1)
    })

    it("should add devices to session", () => {
      let session = createSyncSession("m1", "d1")
      session = addDeviceToSession(session, "d2")
      expect(session.devices.size).toBe(2)
    })
  })

  describe("Entity Sync", () => {
    it("should create synced entity", () => {
      const entity = createSyncedEntity("e1", "task", { name: "test" }, "d1")
      expect(entity.version.version).toBe(1)
    })

    it("should sync with server", () => {
      const entity = createSyncedEntity("e1", "task", { name: "local" }, "d1")
      const serverVersion = incrementVersion(entity.version, "d2", { name: "server" })
      const { entity: synced } = syncWithServer(entity, serverVersion, { name: "server" })
      expect(synced.data).toEqual({ name: "server" })
    })
  })
})

// =============================================================================
// NOTIFICATION CENTER TESTS
// =============================================================================

describe("Notification Center", () => {
  describe("Notification Creation", () => {
    it("should create notification", () => {
      const notif = createNotification("task_assigned", "New Task", "Body", "m1")
      expect(notif.type).toBe("task_assigned")
    })

    it("should create task assigned notification", () => {
      const notif = createTaskAssignedNotification("m1", "t1", "Clean", "Alice", "h1")
      expect(notif.type).toBe("task_assigned")
    })

    it("should create achievement notification", () => {
      const notif = createAchievementNotification("m1", "First Task", "Done")
      expect(notif.type).toBe("achievement")
    })
  })

  describe("Delivery Tracking", () => {
    it("should track delivery status", () => {
      let delivery = createNotifDelivery("n1", "push")
      delivery = markAsSent(delivery)
      expect(delivery.status).toBe("sent")
    })

    it("should track failures", () => {
      let delivery = createNotifDelivery("n1", "push")
      delivery = markAsFailed(delivery, "Error")
      expect(delivery.status).toBe("failed")
    })
  })

  describe("Preferences Management", () => {
    it("should create default preferences", () => {
      const prefs = createDefaultPreferences("m1")
      expect(prefs.enabled).toBe(true)
    })

    it("should update channel preferences", () => {
      let prefs = createDefaultPreferences("m1")
      prefs = updateChannelPreferences(prefs, "push", false)
      expect(prefs.channels.push).toBe(false)
    })

    it("should check type enabled", () => {
      const prefs = createDefaultPreferences("m1")
      expect(isTypeEnabled(prefs, "task_assigned")).toBe(true)
    })

    it("should get enabled channels for type", () => {
      const prefs = createDefaultPreferences("m1")
      const channels = getEnabledChannels(prefs, "task_assigned")
      expect(channels).toContain("push")
    })

    it("should check quiet hours", () => {
      const prefs = createDefaultPreferences("m1")
      prefs.quietHours.enabled = true
      prefs.quietHours.start = "22:00"
      prefs.quietHours.end = "08:00"
      const lateNight = new Date()
      lateNight.setHours(23, 0, 0, 0)
      expect(isInQuietHours(prefs, lateNight)).toBe(true)
    })
  })

  describe("Queue Management", () => {
    it("should add to queue with priority ordering", () => {
      let queue = createNotificationQueue()
      queue = addToQueue(queue, createNotification("system", "Low", "L", "m1", { priority: "low" }))
      queue = addToQueue(queue, createNotification("system", "High", "H", "m1", { priority: "high" }))
      const { notification } = getNextFromQueue(queue)
      expect(notification?.title).toBe("High")
    })

    it("should mark processing complete", () => {
      let queue = createNotificationQueue()
      const notif = createNotification("system", "Test", "T", "m1")
      queue = addToQueue(queue, notif)
      const { queue: q2 } = getNextFromQueue(queue)
      queue = markProcessingComplete(q2, notif.id)
      expect(queue.processing.length).toBe(0)
    })
  })

  describe("Grouping", () => {
    it("should create and add to notification group", () => {
      const notif1 = createNotification("task_assigned", "T1", "B", "m1")
      let group = createNotificationGroup("task_assigned", notif1)
      const notif2 = createNotification("task_assigned", "T2", "B", "m1")
      group = addToGroup(group, notif2)
      expect(group.count).toBe(2)
    })
  })

  describe("Statistics", () => {
    it("should track notification stats", () => {
      let stats = createNotificationStats()
      const notif = createNotification("task_assigned", "Test", "T", "m1")
      stats = recordSent(stats, notif, "push")
      expect(stats.sent).toBe(1)
    })
  })

  describe("Utilities", () => {
    it("should check if notification is expired", () => {
      const notExpired = createNotification("system", "Test", "T", "m1")
      expect(isExpired(notExpired)).toBe(false)
    })

    it("should check if scheduled for future", () => {
      const future = new Date(Date.now() + 86400000)
      const scheduled = createNotification("system", "Test", "T", "m1", { scheduleForDate: future })
      expect(isScheduledForFuture(scheduled)).toBe(true)
    })

    it("should format notification for display", () => {
      const notif = createNotification("system", "Title", "Body", "m1")
      const formatted = formatNotificationForDisplay(notif)
      expect(formatted.time).toBe("Just now")
    })

    it("should get priority colors", () => {
      expect(getPriorityColor("urgent")).toBe("#ef4444")
    })
  })
})
