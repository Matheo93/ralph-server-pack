"use client"

/**
 * PageTransition - Smooth page navigation with shared element transitions
 * Provides elegant loading states and animations between routes
 */

import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface PageTransitionContextValue {
  isTransitioning: boolean
  startTransition: () => void
  endTransition: () => void
  transitionDirection: "forward" | "back"
  setTransitionDirection: (direction: "forward" | "back") => void
}

interface PageTransitionProviderProps {
  children: React.ReactNode
}

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
}

interface SharedElementProps {
  id: string
  children: React.ReactNode
  className?: string
}

type LoadingVariant = "spinner" | "skeleton" | "pulse" | "progress"

interface LoadingStateProps {
  variant?: LoadingVariant
  text?: string
  progress?: number
  className?: string
}

// ============================================================================
// Animation Variants
// ============================================================================

const pageVariants = {
  initial: (direction: "forward" | "back") => ({
    opacity: 0,
    x: direction === "forward" ? 20 : -20,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: "forward" | "back") => ({
    opacity: 0,
    x: direction === "forward" ? -20 : 20,
  }),
}

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const slideUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const scaleVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
}

// ============================================================================
// Context
// ============================================================================

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null)

export function usePageTransition(): PageTransitionContextValue {
  const context = useContext(PageTransitionContext)
  if (!context) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider")
  }
  return context
}

// ============================================================================
// Provider Component
// ============================================================================

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "back">("forward")
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)

  // Auto-detect navigation direction based on pathname changes
  useEffect(() => {
    const prevPath = prevPathRef.current
    if (prevPath !== pathname) {
      // Simple heuristic: if pathname is shorter, likely going back
      const direction = pathname.length < prevPath.length ? "back" : "forward"
      setTransitionDirection(direction)
      prevPathRef.current = pathname
    }
  }, [pathname])

  const startTransition = useCallback(() => {
    setIsTransitioning(true)
  }, [])

  const endTransition = useCallback(() => {
    setIsTransitioning(false)
  }, [])

  return (
    <PageTransitionContext.Provider
      value={{
        isTransitioning,
        startTransition,
        endTransition,
        transitionDirection,
        setTransitionDirection,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  )
}

// ============================================================================
// Page Wrapper Component
// ============================================================================

export function PageWrapper({ children, className }: PageWrapperProps) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Animated Page Component (with direction support)
// ============================================================================

interface AnimatedPageProps {
  children: React.ReactNode
  variant?: "slide" | "fade" | "slideUp" | "scale"
  className?: string
}

export function AnimatedPage({
  children,
  variant = "fade",
  className,
}: AnimatedPageProps) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const { transitionDirection } = usePageTransition()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  const variants = {
    slide: pageVariants,
    fade: fadeVariants,
    slideUp: slideUpVariants,
    scale: scaleVariants,
  }[variant]

  return (
    <AnimatePresence mode="wait" custom={transitionDirection}>
      <motion.div
        key={pathname}
        custom={transitionDirection}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Shared Element Transition
// ============================================================================

const sharedElementRegistry = new Map<string, DOMRect>()

export function SharedElement({ id, children, className }: SharedElementProps) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const [initialPosition, setInitialPosition] = useState<DOMRect | null>(null)

  useEffect(() => {
    // Check if we have a previous position for this element
    const prevRect = sharedElementRegistry.get(id)
    if (prevRect) {
      setInitialPosition(prevRect)
      sharedElementRegistry.delete(id)
    }

    // Store current position on unmount
    return () => {
      if (ref.current) {
        sharedElementRegistry.set(id, ref.current.getBoundingClientRect())
      }
    }
  }, [id])

  if (shouldReduceMotion || !initialPosition) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  const currentRect = ref.current?.getBoundingClientRect()
  if (!currentRect) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  const deltaX = initialPosition.x - currentRect.x
  const deltaY = initialPosition.y - currentRect.y
  const scaleX = initialPosition.width / currentRect.width
  const scaleY = initialPosition.height / currentRect.height

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        x: deltaX,
        y: deltaY,
        scaleX,
        scaleY,
      }}
      animate={{
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Loading States
// ============================================================================

export function LoadingState({
  variant = "spinner",
  text,
  progress = 0,
  className,
}: LoadingStateProps) {
  const shouldReduceMotion = useReducedMotion()

  const renderLoading = () => {
    switch (variant) {
      case "spinner":
        return (
          <motion.div
            className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )

      case "skeleton":
        return (
          <div className="space-y-3 w-full max-w-md">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        )

      case "pulse":
        return (
          <motion.div
            className="w-12 h-12 rounded-full bg-primary/20"
            animate={shouldReduceMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )

      case "progress":
        return (
          <div className="w-full max-w-xs">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {Math.round(progress)}%
            </p>
          </div>
        )
    }
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {renderLoading()}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

// ============================================================================
// Page Loading Overlay
// ============================================================================

interface PageLoadingOverlayProps {
  isLoading: boolean
  variant?: LoadingVariant
  text?: string
}

export function PageLoadingOverlay({
  isLoading,
  variant = "spinner",
  text = "Chargement...",
}: PageLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <LoadingState variant={variant} text={text} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Stagger Children Animation
// ============================================================================

interface StaggerChildrenProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerChildren({
  children,
  staggerDelay = 0.05,
  className,
}: StaggerChildrenProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Stagger Item
// ============================================================================

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Route-based Loading Hook
// ============================================================================

export function useRouteLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [pathname])

  return { isLoading, pathname }
}

// ============================================================================
// Skeleton Loader Component
// ============================================================================

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  animation?: "pulse" | "wave" | "none"
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseStyles = "bg-muted"
  const animationStyles = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: "",
  }

  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
  }

  return (
    <div
      className={cn(
        baseStyles,
        animationStyles[animation],
        variantStyles[variant],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  )
}

// ============================================================================
// Content Placeholder
// ============================================================================

interface ContentPlaceholderProps {
  lines?: number
  className?: string
}

export function ContentPlaceholder({ lines = 3, className }: ContentPlaceholderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4" // Last line shorter
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Card Skeleton
// ============================================================================

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 border rounded-lg space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <ContentPlaceholder lines={2} />
    </div>
  )
}

// ============================================================================
// List Skeleton
// ============================================================================

interface ListSkeletonProps {
  count?: number
  className?: string
}

export function ListSkeleton({ count = 3, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
