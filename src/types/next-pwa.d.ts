declare module "next-pwa" {
  import { NextConfig } from "next"

  interface RuntimeCachingEntry {
    urlPattern: RegExp | string
    handler: "CacheFirst" | "CacheOnly" | "NetworkFirst" | "NetworkOnly" | "StaleWhileRevalidate"
    options?: {
      cacheName?: string
      expiration?: {
        maxEntries?: number
        maxAgeSeconds?: number
        purgeOnQuotaError?: boolean
      }
      cacheableResponse?: {
        statuses?: number[]
        headers?: Record<string, string>
      }
      networkTimeoutSeconds?: number
      backgroundSync?: {
        name: string
        options?: {
          maxRetentionTime?: number
        }
      }
      fetchOptions?: RequestInit
      matchOptions?: CacheQueryOptions
    }
  }

  interface PWAConfig {
    dest?: string
    disable?: boolean
    register?: boolean
    scope?: string
    sw?: string
    skipWaiting?: boolean
    clientsClaim?: boolean
    cleanupOutdatedCaches?: boolean
    dynamicStartUrl?: boolean
    dynamicStartUrlRedirect?: string
    reloadOnOnline?: boolean
    fallbacks?: {
      document?: string
      image?: string
      audio?: string
      video?: string
      font?: string
    }
    cacheOnFrontEndNav?: boolean
    cacheStartUrl?: boolean
    runtimeCaching?: RuntimeCachingEntry[]
    publicExcludes?: string[]
    buildExcludes?: (string | RegExp)[]
    customWorkerDir?: string
    customWorkerSrc?: string
    customWorkerDest?: string
    customWorkerPrefix?: string
  }

  function withPWAInit(config: PWAConfig): (nextConfig: NextConfig) => NextConfig

  export default withPWAInit
}
