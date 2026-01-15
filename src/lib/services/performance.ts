/**
 * Performance monitoring service
 * Tracks Web Vitals, API response times, and error rates
 */

// Web Vitals types
export interface WebVitalsMetric {
  name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB"
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  id: string
  navigationType: "navigate" | "reload" | "back-forward" | "back-forward-cache" | "prerender"
}

// API timing types
export interface APITiming {
  endpoint: string
  method: string
  duration: number
  status: number
  timestamp: Date
}

// Error tracking types
export interface ErrorEvent {
  message: string
  stack?: string
  url?: string
  line?: number
  column?: number
  timestamp: Date
  userId?: string
  householdId?: string
}

// Performance thresholds (based on Google's recommendations)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
}

// Rate a metric based on thresholds
export function rateMetric(
  name: keyof typeof THRESHOLDS,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[name]
  if (!threshold) return "good"

  if (value <= threshold.good) return "good"
  if (value <= threshold.poor) return "needs-improvement"
  return "poor"
}

// In-memory metrics store (for the current session)
class PerformanceStore {
  private webVitals: WebVitalsMetric[] = []
  private apiTimings: APITiming[] = []
  private errors: ErrorEvent[] = []
  private maxEntries = 100

  addWebVital(metric: WebVitalsMetric) {
    this.webVitals.push(metric)
    if (this.webVitals.length > this.maxEntries) {
      this.webVitals.shift()
    }
  }

  addAPITiming(timing: APITiming) {
    this.apiTimings.push(timing)
    if (this.apiTimings.length > this.maxEntries) {
      this.apiTimings.shift()
    }
  }

  addError(error: ErrorEvent) {
    this.errors.push(error)
    if (this.errors.length > this.maxEntries) {
      this.errors.shift()
    }
  }

  getWebVitals() {
    return [...this.webVitals]
  }

  getAPITimings() {
    return [...this.apiTimings]
  }

  getErrors() {
    return [...this.errors]
  }

  getAverageAPITime(endpoint?: string): number {
    const filtered = endpoint
      ? this.apiTimings.filter((t) => t.endpoint === endpoint)
      : this.apiTimings

    if (filtered.length === 0) return 0
    return filtered.reduce((sum, t) => sum + t.duration, 0) / filtered.length
  }

  getErrorRate(windowMs = 60000): number {
    const now = Date.now()
    const recentErrors = this.errors.filter(
      (e) => now - e.timestamp.getTime() < windowMs
    )
    const recentTimings = this.apiTimings.filter(
      (t) => now - t.timestamp.getTime() < windowMs
    )

    if (recentTimings.length === 0) return 0
    return (recentErrors.length / recentTimings.length) * 100
  }

  getSummary() {
    const lastWebVitals: Record<string, WebVitalsMetric> = {}
    for (const metric of this.webVitals) {
      lastWebVitals[metric.name] = metric
    }

    return {
      webVitals: lastWebVitals,
      apiTimingsCount: this.apiTimings.length,
      averageAPITime: this.getAverageAPITime(),
      errorsCount: this.errors.length,
      errorRate: this.getErrorRate(),
    }
  }

  clear() {
    this.webVitals = []
    this.apiTimings = []
    this.errors = []
  }
}

// Singleton instance
export const performanceStore = new PerformanceStore()

// Track API request timing
export async function trackAPIRequest<T>(
  endpoint: string,
  method: string,
  request: () => Promise<T>
): Promise<{ data: T; timing: APITiming } | { error: Error; timing: APITiming }> {
  const startTime = performance.now()
  const timestamp = new Date()

  try {
    const data = await request()
    const duration = performance.now() - startTime

    const timing: APITiming = {
      endpoint,
      method,
      duration,
      status: 200,
      timestamp,
    }
    performanceStore.addAPITiming(timing)

    return { data, timing }
  } catch (error) {
    const duration = performance.now() - startTime

    const timing: APITiming = {
      endpoint,
      method,
      duration,
      status: error instanceof Error && "status" in error ? (error as any).status : 500,
      timestamp,
    }
    performanceStore.addAPITiming(timing)

    return { error: error instanceof Error ? error : new Error(String(error)), timing }
  }
}

// Track error
export function trackError(
  message: string,
  options?: {
    stack?: string
    url?: string
    line?: number
    column?: number
    userId?: string
    householdId?: string
  }
) {
  const errorEvent: ErrorEvent = {
    message,
    timestamp: new Date(),
    ...options,
  }
  performanceStore.addError(errorEvent)

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Performance] Error tracked:", errorEvent)
  }
}

// Initialize Web Vitals reporting (call this on client)
export function reportWebVitals(metric: WebVitalsMetric) {
  performanceStore.addWebVital(metric)

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vital] ${metric.name}: ${metric.value} (${metric.rating})`)
  }
}

// Get performance report
export function getPerformanceReport() {
  return performanceStore.getSummary()
}
