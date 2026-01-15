"use client"

import Image, { ImageProps } from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps extends Omit<ImageProps, "onLoad" | "onError"> {
  fallbackSrc?: string
  showSkeleton?: boolean
  aspectRatio?: "square" | "video" | "portrait" | "auto"
}

/**
 * OptimizedImage - Wrapper around next/image with:
 * - Automatic lazy loading
 * - Skeleton loading state
 * - Fallback image support
 * - Consistent sizing via aspect ratios
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/icons/icon-192.png",
  showSkeleton = true,
  aspectRatio = "auto",
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={hasError ? fallbackSrc : src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
    </div>
  )
}

/**
 * Avatar optimized for user profile images
 */
interface AvatarImageProps {
  src?: string | null
  alt: string
  size?: "sm" | "md" | "lg" | "xl"
  fallback?: string
  className?: string
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

export function AvatarImage({
  src,
  alt,
  size = "md",
  fallback,
  className,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false)
  const dimension = sizeMap[size]

  // Generate initials from alt text
  const initials = alt
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium",
          className
        )}
        style={{ width: dimension, height: dimension }}
        aria-label={alt}
      >
        {fallback || initials}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  )
}
