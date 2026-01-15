/**
 * Response Compression Service for Mobile API
 *
 * Optimizes API responses for mobile clients with:
 * - Gzip/Brotli compression
 * - Delta sync (only changes)
 * - Payload optimization
 * - Conditional compression based on size
 */

import { NextResponse } from "next/server"
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync } from "zlib"

// =============================================================================
// TYPES
// =============================================================================

export type CompressionAlgorithm = "gzip" | "br" | "none"

export interface CompressionOptions {
  algorithm?: CompressionAlgorithm
  minSize?: number // Minimum size to trigger compression (default: 1024 bytes)
  level?: number // Compression level (1-9 for gzip, 0-11 for brotli)
}

export interface CompressedResponse<T> {
  data: T
  meta: {
    compressed: boolean
    algorithm: CompressionAlgorithm
    originalSize: number
    compressedSize: number
    compressionRatio: number
  }
}

export interface DeltaSyncRequest {
  lastSyncTimestamp: string
  entityTypes: string[]
  lastKnownIds?: Record<string, string[]>
}

export interface DeltaSyncResponse<T> {
  created: T[]
  updated: T[]
  deleted: string[]
  syncTimestamp: string
  hasMore: boolean
  nextCursor?: string
}

export interface PayloadOptimizationOptions {
  includeFields?: string[]
  excludeFields?: string[]
  maxItems?: number
  truncateStrings?: number
}

// =============================================================================
// COMPRESSION UTILITIES
// =============================================================================

const DEFAULT_MIN_SIZE = 1024 // 1KB
const DEFAULT_GZIP_LEVEL = 6
const DEFAULT_BROTLI_LEVEL = 4

/**
 * Detect best compression algorithm from Accept-Encoding header
 */
export function detectCompressionAlgorithm(
  acceptEncoding: string | null
): CompressionAlgorithm {
  if (!acceptEncoding) return "none"

  const encodings = acceptEncoding.toLowerCase()

  // Prefer Brotli for better compression (but slower)
  if (encodings.includes("br")) return "br"
  if (encodings.includes("gzip")) return "gzip"

  return "none"
}

/**
 * Compress data using specified algorithm
 */
export function compressData(
  data: string | Buffer,
  algorithm: CompressionAlgorithm,
  level?: number
): Buffer {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data

  switch (algorithm) {
    case "gzip":
      return gzipSync(buffer, { level: level ?? DEFAULT_GZIP_LEVEL })
    case "br":
      return brotliCompressSync(buffer, {
        params: {
          [require("zlib").constants.BROTLI_PARAM_QUALITY]: level ?? DEFAULT_BROTLI_LEVEL,
        },
      })
    default:
      return buffer
  }
}

/**
 * Decompress data using specified algorithm
 */
export function decompressData(
  data: Buffer,
  algorithm: CompressionAlgorithm
): Buffer {
  switch (algorithm) {
    case "gzip":
      return gunzipSync(data)
    case "br":
      return brotliDecompressSync(data)
    default:
      return data
  }
}

/**
 * Compress JSON response if beneficial
 */
export function compressJsonResponse<T>(
  data: T,
  options: CompressionOptions = {}
): {
  body: Buffer
  compressed: boolean
  algorithm: CompressionAlgorithm
  originalSize: number
  compressedSize: number
} {
  const {
    algorithm = "gzip",
    minSize = DEFAULT_MIN_SIZE,
    level,
  } = options

  const jsonString = JSON.stringify(data)
  const originalSize = Buffer.byteLength(jsonString, "utf-8")

  // Don't compress small payloads
  if (originalSize < minSize || algorithm === "none") {
    return {
      body: Buffer.from(jsonString, "utf-8"),
      compressed: false,
      algorithm: "none",
      originalSize,
      compressedSize: originalSize,
    }
  }

  const compressedBody = compressData(jsonString, algorithm, level)
  const compressedSize = compressedBody.length

  // Only use compression if it actually reduces size
  if (compressedSize >= originalSize) {
    return {
      body: Buffer.from(jsonString, "utf-8"),
      compressed: false,
      algorithm: "none",
      originalSize,
      compressedSize: originalSize,
    }
  }

  return {
    body: compressedBody,
    compressed: true,
    algorithm,
    originalSize,
    compressedSize,
  }
}

/**
 * Create compressed NextResponse
 */
export function createCompressedResponse<T>(
  data: T,
  acceptEncoding: string | null,
  options: CompressionOptions = {}
): NextResponse {
  const algorithm = options.algorithm ?? detectCompressionAlgorithm(acceptEncoding)
  const result = compressJsonResponse(data, { ...options, algorithm })

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Original-Size": result.originalSize.toString(),
    "X-Compressed-Size": result.compressedSize.toString(),
  }

  if (result.compressed) {
    headers["Content-Encoding"] = result.algorithm
    headers["Vary"] = "Accept-Encoding"
  }

  // Convert Buffer to Uint8Array for NextResponse
  const body = new Uint8Array(result.body)
  return new NextResponse(body, { headers })
}

// =============================================================================
// DELTA SYNC
// =============================================================================

/**
 * Calculate delta between two datasets
 */
export function calculateDelta<T extends { id: string; updatedAt: string }>(
  currentData: T[],
  lastSyncTimestamp: string,
  lastKnownIds: string[] = []
): DeltaSyncResponse<T> {
  const syncTime = new Date(lastSyncTimestamp)
  const now = new Date()

  const currentIds = new Set(currentData.map(item => item.id))
  const knownIds = new Set(lastKnownIds)

  const created: T[] = []
  const updated: T[] = []
  const deleted: string[] = []

  // Find created and updated items
  for (const item of currentData) {
    const itemUpdatedAt = new Date(item.updatedAt)

    if (!knownIds.has(item.id)) {
      // Item is new
      created.push(item)
    } else if (itemUpdatedAt > syncTime) {
      // Item was updated
      updated.push(item)
    }
  }

  // Find deleted items
  for (const knownId of lastKnownIds) {
    if (!currentIds.has(knownId)) {
      deleted.push(knownId)
    }
  }

  return {
    created,
    updated,
    deleted,
    syncTimestamp: now.toISOString(),
    hasMore: false,
  }
}

/**
 * Calculate delta with pagination support
 */
export function calculateDeltaPaginated<T extends { id: string; updatedAt: string }>(
  currentData: T[],
  lastSyncTimestamp: string,
  lastKnownIds: string[] = [],
  pageSize: number = 100,
  cursor?: string
): DeltaSyncResponse<T> {
  const delta = calculateDelta(currentData, lastSyncTimestamp, lastKnownIds)

  // Combine all changes
  const allChanges = [...delta.created, ...delta.updated]

  // Apply cursor if provided
  let startIndex = 0
  if (cursor) {
    const cursorIndex = allChanges.findIndex(item => item.id === cursor)
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1
    }
  }

  // Paginate
  const paginatedChanges = allChanges.slice(startIndex, startIndex + pageSize)
  const hasMore = startIndex + pageSize < allChanges.length

  // Split back into created/updated
  const createdIds = new Set(delta.created.map(c => c.id))
  const paginatedCreated = paginatedChanges.filter(item => createdIds.has(item.id))
  const paginatedUpdated = paginatedChanges.filter(item => !createdIds.has(item.id))

  return {
    created: paginatedCreated,
    updated: paginatedUpdated,
    deleted: startIndex === 0 ? delta.deleted : [], // Only include deletes on first page
    syncTimestamp: delta.syncTimestamp,
    hasMore,
    nextCursor: hasMore ? paginatedChanges[paginatedChanges.length - 1]?.id : undefined,
  }
}

// =============================================================================
// PAYLOAD OPTIMIZATION
// =============================================================================

/**
 * Optimize payload by selecting/excluding fields
 */
export function optimizePayload<T extends Record<string, unknown>>(
  data: T,
  options: PayloadOptimizationOptions
): Partial<T> {
  const { includeFields, excludeFields, truncateStrings } = options

  let result: Partial<T> = { ...data }

  // Include only specific fields
  if (includeFields && includeFields.length > 0) {
    const filtered: Partial<T> = {}
    for (const field of includeFields) {
      if (field in data) {
        filtered[field as keyof T] = data[field as keyof T]
      }
    }
    result = filtered
  }

  // Exclude specific fields
  if (excludeFields && excludeFields.length > 0) {
    for (const field of excludeFields) {
      delete result[field as keyof T]
    }
  }

  // Truncate long strings
  if (truncateStrings && truncateStrings > 0) {
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string" && value.length > truncateStrings) {
        (result as Record<string, unknown>)[key] = value.substring(0, truncateStrings) + "..."
      }
    }
  }

  return result
}

/**
 * Optimize array payload
 */
export function optimizeArrayPayload<T extends Record<string, unknown>>(
  data: T[],
  options: PayloadOptimizationOptions
): Partial<T>[] {
  const { maxItems } = options

  let items = data

  // Limit number of items
  if (maxItems && maxItems > 0 && items.length > maxItems) {
    items = items.slice(0, maxItems)
  }

  return items.map(item => optimizePayload(item, options))
}

// =============================================================================
// RESPONSE BUILDER
// =============================================================================

/**
 * Build optimized mobile response
 */
export class MobileResponseBuilder<T> {
  private data: T
  private options: CompressionOptions = {}
  private payloadOptions: PayloadOptimizationOptions = {}

  constructor(data: T) {
    this.data = data
  }

  /**
   * Set compression options
   */
  withCompression(options: CompressionOptions): this {
    this.options = options
    return this
  }

  /**
   * Set payload optimization options
   */
  withPayloadOptimization(options: PayloadOptimizationOptions): this {
    this.payloadOptions = options
    return this
  }

  /**
   * Build the response
   */
  build(acceptEncoding: string | null): NextResponse {
    let processedData = this.data

    // Apply payload optimization if data is an array
    if (Array.isArray(processedData)) {
      processedData = optimizeArrayPayload(
        processedData as Record<string, unknown>[],
        this.payloadOptions
      ) as T
    } else if (typeof processedData === "object" && processedData !== null) {
      processedData = optimizePayload(
        processedData as Record<string, unknown>,
        this.payloadOptions
      ) as T
    }

    return createCompressedResponse(processedData, acceptEncoding, this.options)
  }
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Extract compression preferences from request
 */
export function getCompressionPreferences(request: Request): CompressionOptions {
  const acceptEncoding = request.headers.get("Accept-Encoding")
  const preferredAlgorithm = detectCompressionAlgorithm(acceptEncoding)

  // Check for client-specified compression level
  const compressionLevel = request.headers.get("X-Compression-Level")
  const level = compressionLevel ? parseInt(compressionLevel, 10) : undefined

  return {
    algorithm: preferredAlgorithm,
    level: level && !isNaN(level) ? Math.min(Math.max(level, 1), 11) : undefined,
  }
}

/**
 * Check if response should be compressed based on content type
 */
export function shouldCompress(contentType: string): boolean {
  const compressibleTypes = [
    "application/json",
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/xml",
    "text/xml",
  ]

  return compressibleTypes.some(type => contentType.includes(type))
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DEFAULT_MIN_SIZE,
  DEFAULT_GZIP_LEVEL,
  DEFAULT_BROTLI_LEVEL,
}
