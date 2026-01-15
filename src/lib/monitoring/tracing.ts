/**
 * Tracing - Distributed tracing for request correlation
 * Span management, trace context propagation, and observability
 */

import { randomUUID } from "crypto"

// ============================================================================
// Types
// ============================================================================

export interface SpanContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  sampled: boolean
}

export interface SpanAttributes {
  [key: string]: string | number | boolean
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: SpanAttributes
}

export type SpanStatus = "unset" | "ok" | "error"

export interface Span {
  name: string
  context: SpanContext
  startTime: number
  endTime?: number
  attributes: SpanAttributes
  events: SpanEvent[]
  status: SpanStatus
  statusMessage?: string
}

export interface TraceOptions {
  sampled?: boolean
  parentContext?: SpanContext
  attributes?: SpanAttributes
}

// ============================================================================
// Constants
// ============================================================================

export const TRACE_HEADER_NAME = "x-trace-id"
export const SPAN_HEADER_NAME = "x-span-id"
export const SAMPLED_HEADER_NAME = "x-trace-sampled"

// Default sampling rate (10%)
export const DEFAULT_SAMPLING_RATE = 0.1

// ============================================================================
// ID Generation
// ============================================================================

export function generateTraceId(): string {
  return randomUUID().replace(/-/g, "")
}

export function generateSpanId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16)
}

// ============================================================================
// Span Builder
// ============================================================================

class SpanBuilder {
  private span: Span

  constructor(name: string, context: SpanContext) {
    this.span = {
      name,
      context,
      startTime: performance.now(),
      attributes: {},
      events: [],
      status: "unset",
    }
  }

  setAttribute(key: string, value: string | number | boolean): this {
    this.span.attributes[key] = value
    return this
  }

  setAttributes(attributes: SpanAttributes): this {
    Object.assign(this.span.attributes, attributes)
    return this
  }

  addEvent(name: string, attributes?: SpanAttributes): this {
    this.span.events.push({
      name,
      timestamp: performance.now(),
      attributes,
    })
    return this
  }

  setStatus(status: SpanStatus, message?: string): this {
    this.span.status = status
    this.span.statusMessage = message
    return this
  }

  end(): Span {
    this.span.endTime = performance.now()
    return this.span
  }

  getSpan(): Span {
    return this.span
  }
}

// ============================================================================
// Tracer
// ============================================================================

class Tracer {
  private activeSpans: Map<string, Span> = new Map()
  private completedSpans: Span[] = []
  private samplingRate: number = DEFAULT_SAMPLING_RATE
  private maxCompletedSpans: number = 1000

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setSamplingRate(rate: number): void {
    this.samplingRate = Math.max(0, Math.min(1, rate))
  }

  setMaxCompletedSpans(max: number): void {
    this.maxCompletedSpans = max
  }

  // --------------------------------------------------------------------------
  // Span Creation
  // --------------------------------------------------------------------------

  startSpan(name: string, options: TraceOptions = {}): SpanBuilder {
    const sampled = options.sampled ?? Math.random() < this.samplingRate
    const parentContext = options.parentContext

    const context: SpanContext = {
      traceId: parentContext?.traceId ?? generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: parentContext?.spanId,
      sampled,
    }

    const builder = new SpanBuilder(name, context)
    if (options.attributes) {
      builder.setAttributes(options.attributes)
    }

    this.activeSpans.set(context.spanId, builder.getSpan())
    return builder
  }

  // --------------------------------------------------------------------------
  // Span Management
  // --------------------------------------------------------------------------

  endSpan(spanId: string): Span | null {
    const span = this.activeSpans.get(spanId)
    if (!span) return null

    span.endTime = performance.now()
    this.activeSpans.delete(spanId)

    if (span.context.sampled) {
      this.completedSpans.push(span)

      // Trim if exceeds max
      if (this.completedSpans.length > this.maxCompletedSpans) {
        this.completedSpans = this.completedSpans.slice(-this.maxCompletedSpans)
      }
    }

    return span
  }

  getActiveSpan(spanId: string): Span | undefined {
    return this.activeSpans.get(spanId)
  }

  getCompletedSpans(): Span[] {
    return [...this.completedSpans]
  }

  clearCompletedSpans(): void {
    this.completedSpans = []
  }

  // --------------------------------------------------------------------------
  // Context Extraction
  // --------------------------------------------------------------------------

  extractContext(headers: Headers | Record<string, string | undefined>): SpanContext | null {
    const getHeader = (name: string): string | undefined => {
      if (headers instanceof Headers) {
        return headers.get(name) ?? undefined
      }
      return headers[name]
    }

    const traceId = getHeader(TRACE_HEADER_NAME)
    const spanId = getHeader(SPAN_HEADER_NAME)
    const sampled = getHeader(SAMPLED_HEADER_NAME)

    if (!traceId) return null

    return {
      traceId,
      spanId: spanId ?? generateSpanId(),
      sampled: sampled === "1" || sampled === "true",
    }
  }

  // --------------------------------------------------------------------------
  // Context Injection
  // --------------------------------------------------------------------------

  injectContext(context: SpanContext, headers: Headers | Record<string, string>): void {
    const setHeader = (name: string, value: string): void => {
      if (headers instanceof Headers) {
        headers.set(name, value)
      } else {
        headers[name] = value
      }
    }

    setHeader(TRACE_HEADER_NAME, context.traceId)
    setHeader(SPAN_HEADER_NAME, context.spanId)
    setHeader(SAMPLED_HEADER_NAME, context.sampled ? "1" : "0")
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  toJSON(): object[] {
    return this.completedSpans.map((span) => ({
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      parentSpanId: span.context.parentSpanId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      duration: span.endTime ? span.endTime - span.startTime : undefined,
      attributes: span.attributes,
      events: span.events,
      status: span.status,
      statusMessage: span.statusMessage,
    }))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const tracer = new Tracer()

// ============================================================================
// Async Local Storage for Context Propagation
// ============================================================================

interface TracingContext {
  span: Span
  traceId: string
}

let currentContext: TracingContext | null = null

export function setCurrentContext(context: TracingContext | null): void {
  currentContext = context
}

export function getCurrentContext(): TracingContext | null {
  return currentContext
}

export function getCurrentTraceId(): string | null {
  return currentContext?.traceId ?? null
}

export function getCurrentSpan(): Span | null {
  return currentContext?.span ?? null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Wrap an async function with tracing
 */
export async function withSpan<T>(
  name: string,
  fn: (span: SpanBuilder) => Promise<T>,
  options: TraceOptions = {}
): Promise<T> {
  const parentSpan = getCurrentSpan()
  const spanBuilder = tracer.startSpan(name, {
    ...options,
    parentContext: parentSpan?.context ?? options.parentContext,
  })

  const previousContext = currentContext
  currentContext = {
    span: spanBuilder.getSpan(),
    traceId: spanBuilder.getSpan().context.traceId,
  }

  try {
    const result = await fn(spanBuilder)
    spanBuilder.setStatus("ok")
    return result
  } catch (error) {
    spanBuilder.setStatus("error", error instanceof Error ? error.message : "Unknown error")
    throw error
  } finally {
    tracer.endSpan(spanBuilder.getSpan().context.spanId)
    currentContext = previousContext
  }
}

/**
 * Wrap a sync function with tracing
 */
export function withSpanSync<T>(
  name: string,
  fn: (span: SpanBuilder) => T,
  options: TraceOptions = {}
): T {
  const parentSpan = getCurrentSpan()
  const spanBuilder = tracer.startSpan(name, {
    ...options,
    parentContext: parentSpan?.context ?? options.parentContext,
  })

  const previousContext = currentContext
  currentContext = {
    span: spanBuilder.getSpan(),
    traceId: spanBuilder.getSpan().context.traceId,
  }

  try {
    const result = fn(spanBuilder)
    spanBuilder.setStatus("ok")
    return result
  } catch (error) {
    spanBuilder.setStatus("error", error instanceof Error ? error.message : "Unknown error")
    throw error
  } finally {
    tracer.endSpan(spanBuilder.getSpan().context.spanId)
    currentContext = previousContext
  }
}

/**
 * Create a traced HTTP handler wrapper
 */
export function traceRequest(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const parentContext = tracer.extractContext(req.headers)

    return withSpan(
      `HTTP ${req.method} ${url.pathname}`,
      async (span) => {
        span.setAttributes({
          "http.method": req.method,
          "http.url": req.url,
          "http.path": url.pathname,
        })

        const response = await handler(req)

        span.setAttribute("http.status_code", response.status)

        // Inject trace context into response headers
        const headers = new Headers(response.headers)
        tracer.injectContext(span.getSpan().context, headers)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      },
      {
        parentContext: parentContext ?? undefined,
        sampled: true, // Always sample HTTP requests
      }
    )
  }
}

/**
 * Create a traced database query wrapper
 */
export async function traceDbQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`DB ${operation} ${table}`, async (span) => {
    span.setAttributes({
      "db.operation": operation,
      "db.table": table,
      "db.system": "postgresql",
    })
    return fn()
  })
}

/**
 * Create a traced external API call wrapper
 */
export async function traceExternalCall<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`External ${service}:${operation}`, async (span) => {
    span.setAttributes({
      "external.service": service,
      "external.operation": operation,
    })
    return fn()
  })
}
