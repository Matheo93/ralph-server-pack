/**
 * WebSocket Manager Service
 *
 * Manages WebSocket connections with:
 * - Connection pooling
 * - Heartbeat management
 * - Auto-reconnection
 * - Room/channel management
 */

// =============================================================================
// TYPES
// =============================================================================

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting" | "error"
export type MessageType = "event" | "request" | "response" | "heartbeat" | "subscribe" | "unsubscribe" | "error"

export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval: number // ms
  maxReconnectAttempts: number
  heartbeatInterval: number // ms
  heartbeatTimeout: number // ms
  messageQueueSize: number
  enableCompression: boolean
}

export interface ConnectionInfo {
  id: string
  state: ConnectionState
  connectedAt?: Date
  lastHeartbeat?: Date
  reconnectAttempts: number
  latency?: number
  rooms: Set<string>
  metadata: Record<string, unknown>
}

export interface WebSocketMessage {
  type: MessageType
  id: string
  channel?: string
  event?: string
  payload?: unknown
  timestamp: number
  ack?: boolean
}

export interface Room {
  id: string
  name: string
  members: Set<string>
  createdAt: Date
  metadata: Record<string, unknown>
}

export interface HeartbeatInfo {
  lastSent: Date
  lastReceived?: Date
  missedCount: number
  avgLatency: number
  latencyHistory: number[]
}

export interface MessageQueue {
  pending: WebSocketMessage[]
  maxSize: number
  dropped: number
}

export interface ConnectionPool {
  connections: Map<string, ConnectionInfo>
  maxConnections: number
  totalConnections: number
  activeConnections: number
}

export interface WebSocketStats {
  messagesSent: number
  messagesReceived: number
  bytesTransferred: number
  errors: number
  reconnects: number
  avgLatency: number
  uptime: number
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  url: "",
  protocols: [],
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  messageQueueSize: 100,
  enableCompression: true,
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Create a new connection info object
 */
export function createConnectionInfo(
  id: string,
  metadata: Record<string, unknown> = {}
): ConnectionInfo {
  return {
    id,
    state: "disconnected",
    reconnectAttempts: 0,
    rooms: new Set(),
    metadata,
  }
}

/**
 * Update connection state
 */
export function updateConnectionState(
  connection: ConnectionInfo,
  state: ConnectionState
): ConnectionInfo {
  return {
    ...connection,
    state,
    connectedAt: state === "connected" ? new Date() : connection.connectedAt,
    reconnectAttempts: state === "connected" ? 0 : connection.reconnectAttempts,
  }
}

/**
 * Record heartbeat received
 */
export function recordHeartbeat(
  connection: ConnectionInfo,
  latency: number
): ConnectionInfo {
  return {
    ...connection,
    lastHeartbeat: new Date(),
    latency,
  }
}

/**
 * Increment reconnect attempts
 */
export function incrementReconnectAttempts(connection: ConnectionInfo): ConnectionInfo {
  return {
    ...connection,
    reconnectAttempts: connection.reconnectAttempts + 1,
    state: "reconnecting",
  }
}

/**
 * Check if connection should attempt reconnect
 */
export function shouldReconnect(
  connection: ConnectionInfo,
  maxAttempts: number
): boolean {
  return (
    connection.state !== "connected" &&
    connection.reconnectAttempts < maxAttempts
  )
}

/**
 * Calculate reconnect delay with exponential backoff
 */
export function calculateReconnectDelay(
  baseDelay: number,
  attempt: number,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(2, attempt)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1)
  return Math.min(delay + jitter, maxDelay)
}

// =============================================================================
// ROOM MANAGEMENT
// =============================================================================

/**
 * Create a new room
 */
export function createRoom(
  id: string,
  name: string,
  metadata: Record<string, unknown> = {}
): Room {
  return {
    id,
    name,
    members: new Set(),
    createdAt: new Date(),
    metadata,
  }
}

/**
 * Add member to room
 */
export function addMemberToRoom(room: Room, connectionId: string): Room {
  const newMembers = new Set(room.members)
  newMembers.add(connectionId)

  return {
    ...room,
    members: newMembers,
  }
}

/**
 * Remove member from room
 */
export function removeMemberFromRoom(room: Room, connectionId: string): Room {
  const newMembers = new Set(room.members)
  newMembers.delete(connectionId)

  return {
    ...room,
    members: newMembers,
  }
}

/**
 * Join room for connection
 */
export function joinRoom(connection: ConnectionInfo, roomId: string): ConnectionInfo {
  const newRooms = new Set(connection.rooms)
  newRooms.add(roomId)

  return {
    ...connection,
    rooms: newRooms,
  }
}

/**
 * Leave room for connection
 */
export function leaveRoom(connection: ConnectionInfo, roomId: string): ConnectionInfo {
  const newRooms = new Set(connection.rooms)
  newRooms.delete(roomId)

  return {
    ...connection,
    rooms: newRooms,
  }
}

/**
 * Leave all rooms for connection
 */
export function leaveAllRooms(connection: ConnectionInfo): ConnectionInfo {
  return {
    ...connection,
    rooms: new Set(),
  }
}

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

/**
 * Create a WebSocket message
 */
export function createMessage(
  type: MessageType,
  event?: string,
  payload?: unknown,
  channel?: string
): WebSocketMessage {
  return {
    type,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    channel,
    event,
    payload,
    timestamp: Date.now(),
    ack: false,
  }
}

/**
 * Create heartbeat message
 */
export function createHeartbeatMessage(): WebSocketMessage {
  return createMessage("heartbeat", "ping", { timestamp: Date.now() })
}

/**
 * Create subscription message
 */
export function createSubscribeMessage(channel: string): WebSocketMessage {
  return createMessage("subscribe", "join", { channel }, channel)
}

/**
 * Create unsubscription message
 */
export function createUnsubscribeMessage(channel: string): WebSocketMessage {
  return createMessage("unsubscribe", "leave", { channel }, channel)
}

/**
 * Create error message
 */
export function createErrorMessage(code: string, message: string): WebSocketMessage {
  return createMessage("error", "error", { code, message })
}

/**
 * Serialize message for sending
 */
export function serializeMessage(message: WebSocketMessage): string {
  return JSON.stringify(message)
}

/**
 * Parse incoming message
 */
export function parseMessage(data: string): WebSocketMessage | null {
  try {
    const parsed = JSON.parse(data)

    if (!parsed.type || !parsed.id) {
      return null
    }

    return {
      type: parsed.type,
      id: parsed.id,
      channel: parsed.channel,
      event: parsed.event,
      payload: parsed.payload,
      timestamp: parsed.timestamp ?? Date.now(),
      ack: parsed.ack ?? false,
    }
  } catch {
    return null
  }
}

/**
 * Validate message structure
 */
export function isValidMessage(message: unknown): message is WebSocketMessage {
  if (!message || typeof message !== "object") return false

  const msg = message as Record<string, unknown>
  return (
    typeof msg["type"] === "string" &&
    typeof msg["id"] === "string" &&
    typeof msg["timestamp"] === "number"
  )
}

// =============================================================================
// MESSAGE QUEUE
// =============================================================================

/**
 * Create empty message queue
 */
export function createMessageQueue(maxSize: number): MessageQueue {
  return {
    pending: [],
    maxSize,
    dropped: 0,
  }
}

/**
 * Add message to queue
 */
export function enqueueMessage(
  queue: MessageQueue,
  message: WebSocketMessage
): MessageQueue {
  if (queue.pending.length >= queue.maxSize) {
    // Drop oldest message
    return {
      pending: [...queue.pending.slice(1), message],
      maxSize: queue.maxSize,
      dropped: queue.dropped + 1,
    }
  }

  return {
    ...queue,
    pending: [...queue.pending, message],
  }
}

/**
 * Get next message from queue
 */
export function dequeueMessage(
  queue: MessageQueue
): { message: WebSocketMessage | null; queue: MessageQueue } {
  if (queue.pending.length === 0) {
    return { message: null, queue }
  }

  const [message, ...rest] = queue.pending

  return {
    message: message ?? null,
    queue: {
      ...queue,
      pending: rest,
    },
  }
}

/**
 * Clear message queue
 */
export function clearMessageQueue(queue: MessageQueue): MessageQueue {
  return {
    ...queue,
    pending: [],
  }
}

/**
 * Get queue size
 */
export function getQueueSize(queue: MessageQueue): number {
  return queue.pending.length
}

// =============================================================================
// HEARTBEAT MANAGEMENT
// =============================================================================

/**
 * Create heartbeat info
 */
export function createHeartbeatInfo(): HeartbeatInfo {
  return {
    lastSent: new Date(),
    missedCount: 0,
    avgLatency: 0,
    latencyHistory: [],
  }
}

/**
 * Record sent heartbeat
 */
export function recordHeartbeatSent(info: HeartbeatInfo): HeartbeatInfo {
  return {
    ...info,
    lastSent: new Date(),
  }
}

/**
 * Record received heartbeat response
 */
export function recordHeartbeatResponse(
  info: HeartbeatInfo,
  latency: number
): HeartbeatInfo {
  const newHistory = [...info.latencyHistory.slice(-19), latency] // Keep last 20
  const avgLatency = newHistory.reduce((a, b) => a + b, 0) / newHistory.length

  return {
    ...info,
    lastReceived: new Date(),
    missedCount: 0,
    avgLatency: Math.round(avgLatency),
    latencyHistory: newHistory,
  }
}

/**
 * Record missed heartbeat
 */
export function recordMissedHeartbeat(info: HeartbeatInfo): HeartbeatInfo {
  return {
    ...info,
    missedCount: info.missedCount + 1,
  }
}

/**
 * Check if heartbeat is overdue
 */
export function isHeartbeatOverdue(
  info: HeartbeatInfo,
  timeout: number
): boolean {
  if (!info.lastReceived) return false

  const elapsed = Date.now() - info.lastReceived.getTime()
  return elapsed > timeout
}

/**
 * Check if connection is healthy based on heartbeat
 */
export function isConnectionHealthy(
  info: HeartbeatInfo,
  maxMissed: number = 3
): boolean {
  return info.missedCount < maxMissed
}

// =============================================================================
// CONNECTION POOL
// =============================================================================

/**
 * Create connection pool
 */
export function createConnectionPool(maxConnections: number = 1000): ConnectionPool {
  return {
    connections: new Map(),
    maxConnections,
    totalConnections: 0,
    activeConnections: 0,
  }
}

/**
 * Add connection to pool
 */
export function addConnection(
  pool: ConnectionPool,
  connection: ConnectionInfo
): ConnectionPool | null {
  if (pool.connections.size >= pool.maxConnections) {
    return null // Pool is full
  }

  const newConnections = new Map(pool.connections)
  newConnections.set(connection.id, connection)

  return {
    ...pool,
    connections: newConnections,
    totalConnections: pool.totalConnections + 1,
    activeConnections: connection.state === "connected"
      ? pool.activeConnections + 1
      : pool.activeConnections,
  }
}

/**
 * Remove connection from pool
 */
export function removeConnection(
  pool: ConnectionPool,
  connectionId: string
): ConnectionPool {
  const connection = pool.connections.get(connectionId)
  if (!connection) return pool

  const newConnections = new Map(pool.connections)
  newConnections.delete(connectionId)

  return {
    ...pool,
    connections: newConnections,
    activeConnections: connection.state === "connected"
      ? Math.max(0, pool.activeConnections - 1)
      : pool.activeConnections,
  }
}

/**
 * Update connection in pool
 */
export function updateConnection(
  pool: ConnectionPool,
  connectionId: string,
  updates: Partial<ConnectionInfo>
): ConnectionPool {
  const connection = pool.connections.get(connectionId)
  if (!connection) return pool

  const wasConnected = connection.state === "connected"
  const newConnection = { ...connection, ...updates }
  const isNowConnected = newConnection.state === "connected"

  const newConnections = new Map(pool.connections)
  newConnections.set(connectionId, newConnection)

  let activeChange = 0
  if (!wasConnected && isNowConnected) activeChange = 1
  if (wasConnected && !isNowConnected) activeChange = -1

  return {
    ...pool,
    connections: newConnections,
    activeConnections: Math.max(0, pool.activeConnections + activeChange),
  }
}

/**
 * Get connection from pool
 */
export function getConnection(
  pool: ConnectionPool,
  connectionId: string
): ConnectionInfo | undefined {
  return pool.connections.get(connectionId)
}

/**
 * Get all connections in a room
 */
export function getConnectionsInRoom(
  pool: ConnectionPool,
  roomId: string
): ConnectionInfo[] {
  return Array.from(pool.connections.values()).filter(
    conn => conn.rooms.has(roomId) && conn.state === "connected"
  )
}

/**
 * Get pool statistics
 */
export function getPoolStats(pool: ConnectionPool): {
  total: number
  active: number
  utilization: number
  states: Record<ConnectionState, number>
} {
  const states: Record<ConnectionState, number> = {
    connecting: 0,
    connected: 0,
    disconnected: 0,
    reconnecting: 0,
    error: 0,
  }

  pool.connections.forEach(conn => {
    states[conn.state]++
  })

  return {
    total: pool.connections.size,
    active: pool.activeConnections,
    utilization: pool.connections.size / pool.maxConnections,
    states,
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Create WebSocket statistics
 */
export function createWebSocketStats(): WebSocketStats {
  return {
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    errors: 0,
    reconnects: 0,
    avgLatency: 0,
    uptime: 0,
  }
}

/**
 * Record message sent
 */
export function recordMessageSent(
  stats: WebSocketStats,
  bytes: number
): WebSocketStats {
  return {
    ...stats,
    messagesSent: stats.messagesSent + 1,
    bytesTransferred: stats.bytesTransferred + bytes,
  }
}

/**
 * Record message received
 */
export function recordMessageReceived(
  stats: WebSocketStats,
  bytes: number
): WebSocketStats {
  return {
    ...stats,
    messagesReceived: stats.messagesReceived + 1,
    bytesTransferred: stats.bytesTransferred + bytes,
  }
}

/**
 * Record error
 */
export function recordError(stats: WebSocketStats): WebSocketStats {
  return {
    ...stats,
    errors: stats.errors + 1,
  }
}

/**
 * Record reconnect
 */
export function recordReconnect(stats: WebSocketStats): WebSocketStats {
  return {
    ...stats,
    reconnects: stats.reconnects + 1,
  }
}

/**
 * Update latency
 */
export function updateLatency(
  stats: WebSocketStats,
  latency: number
): WebSocketStats {
  // Running average
  const newAvg = stats.avgLatency > 0
    ? (stats.avgLatency * 0.9 + latency * 0.1)
    : latency

  return {
    ...stats,
    avgLatency: Math.round(newAvg),
  }
}

/**
 * Update uptime
 */
export function updateUptime(
  stats: WebSocketStats,
  uptimeMs: number
): WebSocketStats {
  return {
    ...stats,
    uptime: uptimeMs,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate connection ID
 */
export function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate room ID
 */
export function generateRoomId(prefix: string = "room"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format connection state for display
 */
export function formatConnectionState(state: ConnectionState): string {
  const stateMap: Record<ConnectionState, string> = {
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
    reconnecting: "Reconnecting...",
    error: "Error",
  }

  return stateMap[state]
}

/**
 * Calculate connection uptime
 */
export function calculateUptime(connectedAt?: Date): number {
  if (!connectedAt) return 0
  return Date.now() - connectedAt.getTime()
}

/**
 * Format uptime for display
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
