/**
 * Analytics service - Privacy-first analytics with multiple provider support
 * Supports: Plausible, PostHog, or custom backend
 */

type AnalyticsProvider = "plausible" | "posthog" | "custom" | "none"

interface AnalyticsConfig {
  provider: AnalyticsProvider
  plausibleDomain?: string
  posthogKey?: string
  posthogHost?: string
  customEndpoint?: string
  debug?: boolean
}

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

interface UserProperties {
  userId?: string
  email?: string
  householdId?: string
  subscriptionStatus?: string
  locale?: string
  [key: string]: string | number | boolean | null | undefined
}

let config: AnalyticsConfig = {
  provider: "none",
  debug: process.env.NODE_ENV === "development",
}

let userProperties: UserProperties = {}
let hasConsent = false

/**
 * Initialize analytics with configuration
 */
export function initAnalytics(analyticsConfig: Partial<AnalyticsConfig>) {
  config = { ...config, ...analyticsConfig }

  if (config.debug) {
    console.log("[Analytics] Initialized with provider:", config.provider)
  }

  // Auto-detect provider from env variables
  if (config.provider === "none") {
    const posthogKey = process.env["NEXT_PUBLIC_POSTHOG_KEY"]
    const plausibleDomain = process.env["NEXT_PUBLIC_PLAUSIBLE_DOMAIN"]

    if (posthogKey) {
      config.provider = "posthog"
      config.posthogKey = posthogKey
      config.posthogHost = process.env["NEXT_PUBLIC_POSTHOG_HOST"] || "https://app.posthog.com"
    } else if (plausibleDomain) {
      config.provider = "plausible"
      config.plausibleDomain = plausibleDomain
    }
  }
}

/**
 * Set user consent for analytics tracking
 */
export function setAnalyticsConsent(consent: boolean) {
  hasConsent = consent
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics-consent", consent ? "true" : "false")
  }
  if (config.debug) {
    console.log("[Analytics] Consent set to:", consent)
  }
}

/**
 * Check if user has given consent
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("analytics-consent")
  return stored === "true"
}

/**
 * Identify user for analytics
 */
export function identifyUser(properties: UserProperties) {
  userProperties = { ...userProperties, ...properties }

  if (!hasConsent && !hasAnalyticsConsent()) {
    if (config.debug) {
      console.log("[Analytics] Identify blocked - no consent")
    }
    return
  }

  if (config.debug) {
    console.log("[Analytics] Identify user:", properties.userId)
  }

  switch (config.provider) {
    case "posthog":
      if (typeof window !== "undefined" && (window as typeof window & { posthog?: { identify: (id: string, props: UserProperties) => void } }).posthog && properties.userId) {
        ;(window as typeof window & { posthog: { identify: (id: string, props: UserProperties) => void } }).posthog.identify(properties.userId, properties)
      }
      break
    case "custom":
      sendToCustomEndpoint("identify", { properties })
      break
    default:
      break
  }
}

/**
 * Track a page view
 */
export function trackPageView(path?: string) {
  if (!hasConsent && !hasAnalyticsConsent()) {
    if (config.debug) {
      console.log("[Analytics] Page view blocked - no consent:", path)
    }
    return
  }

  const url = path || (typeof window !== "undefined" ? window.location.pathname : "/")

  if (config.debug) {
    console.log("[Analytics] Page view:", url)
  }

  switch (config.provider) {
    case "plausible":
      if (typeof window !== "undefined" && (window as typeof window & { plausible?: (event: string, options?: { u: string }) => void }).plausible) {
        ;(window as typeof window & { plausible: (event: string, options?: { u: string }) => void }).plausible("pageview", { u: url })
      }
      break
    case "posthog":
      if (typeof window !== "undefined" && (window as typeof window & { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog) {
        ;(window as typeof window & { posthog: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog.capture("$pageview", { $current_url: url })
      }
      break
    case "custom":
      sendToCustomEndpoint("pageview", { path: url, ...userProperties })
      break
    default:
      break
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: EventProperties) {
  if (!hasConsent && !hasAnalyticsConsent()) {
    if (config.debug) {
      console.log("[Analytics] Event blocked - no consent:", eventName)
    }
    return
  }

  const eventData = {
    ...userProperties,
    ...properties,
  }

  if (config.debug) {
    console.log("[Analytics] Event:", eventName, eventData)
  }

  switch (config.provider) {
    case "plausible":
      if (typeof window !== "undefined" && (window as typeof window & { plausible?: (event: string, options?: { props: EventProperties }) => void }).plausible) {
        ;(window as typeof window & { plausible: (event: string, options?: { props: EventProperties }) => void }).plausible(eventName, { props: eventData })
      }
      break
    case "posthog":
      if (typeof window !== "undefined" && (window as typeof window & { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog) {
        ;(window as typeof window & { posthog: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog.capture(eventName, eventData)
      }
      break
    case "custom":
      sendToCustomEndpoint("event", { event: eventName, properties: eventData })
      break
    default:
      break
  }
}

/**
 * Track conversion event (e.g., signup, subscription)
 */
export function trackConversion(conversionType: string, value?: number, currency?: string) {
  trackEvent(`conversion_${conversionType}`, {
    conversion_type: conversionType,
    value: value ?? null,
    currency: currency ?? null,
  })
}

/**
 * Reset analytics (e.g., on logout)
 */
export function resetAnalytics() {
  userProperties = {}

  if (config.debug) {
    console.log("[Analytics] Reset")
  }

  switch (config.provider) {
    case "posthog":
      if (typeof window !== "undefined" && (window as typeof window & { posthog?: { reset: () => void } }).posthog) {
        ;(window as typeof window & { posthog: { reset: () => void } }).posthog.reset()
      }
      break
    default:
      break
  }
}

/**
 * Send data to custom analytics endpoint
 */
async function sendToCustomEndpoint(
  type: "identify" | "pageview" | "event",
  data: Record<string, unknown>
) {
  if (!config.customEndpoint) return

  try {
    await fetch(config.customEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    })
  } catch (error) {
    if (config.debug) {
      console.error("[Analytics] Failed to send to custom endpoint:", error)
    }
  }
}

/**
 * Get current analytics config (for debugging)
 */
export function getAnalyticsConfig() {
  return { ...config, hasConsent: hasConsent || hasAnalyticsConsent() }
}
