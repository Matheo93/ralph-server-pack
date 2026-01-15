/**
 * Image Optimization - Lazy loading, responsive srcset, and modern format support
 * Utilities for optimizing image delivery and performance
 */

import { z } from "zod"

// ============================================================================
// Types and Schemas
// ============================================================================

export const ImageFormatSchema = z.enum(["avif", "webp", "png", "jpeg", "gif", "svg"])
export type ImageFormat = z.infer<typeof ImageFormatSchema>

export const ImageQualitySchema = z.number().min(1).max(100)
export type ImageQuality = z.infer<typeof ImageQualitySchema>

export const ImageDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
})
export type ImageDimensions = z.infer<typeof ImageDimensionsSchema>

export const ResponsiveBreakpointSchema = z.object({
  width: z.number().positive(),
  descriptor: z.string(), // e.g., "1x", "2x", "300w"
})
export type ResponsiveBreakpoint = z.infer<typeof ResponsiveBreakpointSchema>

export const ImageConfigSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  priority: z.boolean().default(false),
  quality: ImageQualitySchema.default(75),
  loading: z.enum(["lazy", "eager"]).default("lazy"),
  placeholder: z.enum(["blur", "empty", "color"]).default("empty"),
  blurDataURL: z.string().optional(),
  sizes: z.string().optional(),
  formats: z.array(ImageFormatSchema).default(["avif", "webp"]),
})
export type ImageConfig = z.infer<typeof ImageConfigSchema>

export const OptimizedImageSchema = z.object({
  src: z.string(),
  srcset: z.string().optional(),
  sizes: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  loading: z.enum(["lazy", "eager"]),
  decoding: z.enum(["async", "sync", "auto"]),
  fetchpriority: z.enum(["high", "low", "auto"]).optional(),
  style: z.record(z.string(), z.string()).optional(),
})
export type OptimizedImage = z.infer<typeof OptimizedImageSchema>

// ============================================================================
// Constants
// ============================================================================

// Default responsive breakpoints
export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { width: 320, descriptor: "320w" },
  { width: 480, descriptor: "480w" },
  { width: 640, descriptor: "640w" },
  { width: 768, descriptor: "768w" },
  { width: 1024, descriptor: "1024w" },
  { width: 1280, descriptor: "1280w" },
  { width: 1536, descriptor: "1536w" },
  { width: 1920, descriptor: "1920w" },
]

// Default sizes for common layouts
export const DEFAULT_SIZES = {
  fullWidth: "100vw",
  halfWidth: "(max-width: 768px) 100vw, 50vw",
  thirdWidth: "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
  card: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px",
  thumbnail: "80px",
  avatar: "40px",
  icon: "24px",
} as const

// Format support detection
export const FORMAT_MIME_TYPES: Record<ImageFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
}

// Quality presets
export const QUALITY_PRESETS = {
  low: 50,
  medium: 75,
  high: 85,
  lossless: 100,
} as const

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate srcset string for responsive images
 */
export function generateSrcset(
  baseSrc: string,
  breakpoints: ResponsiveBreakpoint[] = DEFAULT_BREAKPOINTS,
  quality: number = QUALITY_PRESETS.medium
): string {
  // For Next.js Image optimization, use /_next/image endpoint
  if (baseSrc.startsWith("/") || baseSrc.startsWith("http")) {
    return breakpoints
      .map(bp => {
        const url = generateNextImageUrl(baseSrc, bp.width, quality)
        return `${url} ${bp.descriptor}`
      })
      .join(", ")
  }
  return baseSrc
}

/**
 * Generate Next.js image optimization URL
 */
export function generateNextImageUrl(
  src: string,
  width: number,
  quality: number = QUALITY_PRESETS.medium
): string {
  const encodedSrc = encodeURIComponent(src)
  return `/_next/image?url=${encodedSrc}&w=${width}&q=${quality}`
}

/**
 * Generate optimized image props
 */
export function getOptimizedImageProps(config: ImageConfig): OptimizedImage {
  const {
    src,
    width,
    height,
    priority,
    quality,
    loading,
  } = config

  const result: OptimizedImage = {
    src,
    loading: priority ? "eager" : loading,
    decoding: priority ? "sync" : "async",
  }

  if (width) result.width = width
  if (height) result.height = height

  if (priority) {
    result.fetchpriority = "high"
  }

  // Generate srcset for non-priority images
  if (!priority && (src.startsWith("/") || src.startsWith("http"))) {
    result.srcset = generateSrcset(src, DEFAULT_BREAKPOINTS, quality)
    result.sizes = config.sizes || DEFAULT_SIZES.fullWidth
  }

  return result
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height
}

/**
 * Calculate responsive dimensions maintaining aspect ratio
 */
export function calculateResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): ImageDimensions {
  const aspectRatio = calculateAspectRatio(originalWidth, originalHeight)
  return {
    width: targetWidth,
    height: Math.round(targetWidth / aspectRatio),
  }
}

// ============================================================================
// Lazy Loading Utilities
// ============================================================================

/**
 * Generate intersection observer options for lazy loading
 */
export function getLazyLoadObserverOptions(): IntersectionObserverInit {
  return {
    root: null,
    rootMargin: "200px 0px", // Start loading 200px before viewport
    threshold: 0.01,
  }
}

/**
 * Check if native lazy loading is supported
 */
export function isNativeLazyLoadingSupported(): boolean {
  if (typeof window === "undefined") return false
  return "loading" in HTMLImageElement.prototype
}

/**
 * Get loading attribute value based on priority and support
 */
export function getLoadingAttribute(
  priority: boolean,
  nativeSupported: boolean
): "lazy" | "eager" | undefined {
  if (priority) return "eager"
  if (nativeSupported) return "lazy"
  return undefined // Will need JS-based lazy loading
}

// ============================================================================
// Format Detection and Fallbacks
// ============================================================================

/**
 * Check if browser supports a specific image format
 * Note: This should be called client-side only
 */
export function checkFormatSupport(format: ImageFormat): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false)
  }

  // SVG is always supported
  if (format === "svg") {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1

    const dataUrl = canvas.toDataURL(FORMAT_MIME_TYPES[format])
    resolve(dataUrl.startsWith(`data:${FORMAT_MIME_TYPES[format]}`))
  })
}

/**
 * Get best supported format from preferred list
 */
export async function getBestSupportedFormat(
  preferred: ImageFormat[] = ["avif", "webp", "jpeg"]
): Promise<ImageFormat> {
  for (const format of preferred) {
    const supported = await checkFormatSupport(format)
    if (supported) {
      return format
    }
  }
  return "jpeg" // Fallback
}

/**
 * Generate picture element sources for format fallbacks
 */
export function generatePictureSources(
  src: string,
  formats: ImageFormat[] = ["avif", "webp"],
  sizes?: string
): Array<{ srcset: string; type: string; sizes?: string }> {
  return formats.map(format => ({
    srcset: generateSrcsetForFormat(src, format),
    type: FORMAT_MIME_TYPES[format],
    sizes,
  }))
}

/**
 * Generate srcset for a specific format
 */
export function generateSrcsetForFormat(
  baseSrc: string,
  format: ImageFormat,
  breakpoints: ResponsiveBreakpoint[] = DEFAULT_BREAKPOINTS
): string {
  // This would integrate with your image CDN or Next.js image optimization
  // For Next.js, the format is handled automatically
  return generateSrcset(baseSrc, breakpoints)
}

// ============================================================================
// Placeholder Generation
// ============================================================================

/**
 * Generate blur placeholder data URL
 */
export function generateBlurPlaceholder(
  width: number = 10,
  height: number = 10,
  color: string = "#e5e7eb"
): string {
  // Generate a small SVG placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`
}

/**
 * Generate shimmer placeholder (CSS animation)
 */
export function generateShimmerPlaceholder(
  width: number,
  height: number
): { backgroundImage: string; backgroundSize: string; animation: string } {
  const shimmerGradient = `linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  )`

  return {
    backgroundImage: `${shimmerGradient}, linear-gradient(#f3f4f6 100%, transparent 0)`,
    backgroundSize: `200% 100%, ${width}px ${height}px`,
    animation: "shimmer 1.5s infinite",
  }
}

/**
 * Generate dominant color placeholder from image URL
 * Note: This is a simplified version - real implementation would analyze the image
 */
export function generateColorPlaceholder(color: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E`
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Calculate estimated bandwidth savings from optimization
 */
export function calculateBandwidthSavings(
  originalSize: number,
  optimizedSize: number
): { saved: number; percentage: number } {
  const saved = originalSize - optimizedSize
  const percentage = (saved / originalSize) * 100
  return { saved, percentage }
}

/**
 * Estimate optimal quality based on image dimensions
 */
export function estimateOptimalQuality(width: number, height: number): number {
  const pixels = width * height

  // Smaller images need higher quality
  if (pixels < 40000) return QUALITY_PRESETS.high // < 200x200
  if (pixels < 250000) return QUALITY_PRESETS.medium // < 500x500
  return 70 // Larger images can use lower quality
}

/**
 * Get recommended image dimensions for device
 */
export function getRecommendedDimensions(
  containerWidth: number,
  devicePixelRatio: number = 1
): number {
  // Account for device pixel ratio but cap at 2x for bandwidth
  const effectiveDpr = Math.min(devicePixelRatio, 2)
  const targetWidth = containerWidth * effectiveDpr

  // Round to nearest breakpoint
  const breakpoint = DEFAULT_BREAKPOINTS
    .map(bp => bp.width)
    .find(w => w >= targetWidth)

  const lastBreakpoint = DEFAULT_BREAKPOINTS[DEFAULT_BREAKPOINTS.length - 1]
  return breakpoint ?? lastBreakpoint?.width ?? 1920
}

// ============================================================================
// CSS Styles for Image Components
// ============================================================================

export const imageStyles = {
  // Base responsive image style
  responsive: {
    maxWidth: "100%",
    height: "auto",
    display: "block",
  },

  // Fill container
  fill: {
    objectFit: "cover" as const,
    width: "100%",
    height: "100%",
  },

  // Contain within container
  contain: {
    objectFit: "contain" as const,
    width: "100%",
    height: "100%",
  },

  // Placeholder skeleton
  skeleton: {
    backgroundColor: "#f3f4f6",
    borderRadius: "0.25rem",
  },

  // Blur transition
  blurTransition: {
    transition: "filter 0.3s ease-out",
  },

  // Loaded state
  loaded: {
    filter: "blur(0)",
  },

  // Loading state
  loading: {
    filter: "blur(20px)",
  },
} as const
