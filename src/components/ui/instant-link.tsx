"use client"

/**
 * InstantLink - Navigation ultra-rapide avec View Transitions API
 *
 * Features:
 * - Prefetch au hover/focus (pas besoin d'attendre)
 * - View Transitions API pour des transitions fluides
 * - Optimistic navigation avec feedback visuel instantané
 * - Support du prefers-reduced-motion
 */

import { useCallback, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface InstantLinkProps {
  href: string
  children: ReactNode
  className?: string
  prefetch?: boolean
  /** Prefetch on hover instead of waiting for click */
  prefetchOnHover?: boolean
  /** Show loading indicator on click */
  showLoading?: boolean
  /** Use View Transitions API if available */
  useViewTransition?: boolean
  /** Custom onClick handler */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  /** Disable the link */
  disabled?: boolean
  /** Replace current history entry instead of push */
  replace?: boolean
  /** Scroll to top on navigation */
  scroll?: boolean
}

export function InstantLink({
  href,
  children,
  className,
  prefetch = true,
  prefetchOnHover = true,
  showLoading = false,
  useViewTransition = true,
  onClick,
  disabled = false,
  replace = false,
  scroll = true,
}: InstantLinkProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isHovered, setIsHovered] = useState(false)
  const prefetchedRef = useRef(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Prefetch la route
  const doPrefetch = useCallback(() => {
    if (prefetchedRef.current || !prefetch) return

    try {
      router.prefetch(href)
      prefetchedRef.current = true
    } catch {
      // Ignore prefetch errors
    }
  }, [href, prefetch, router])

  // Gestion du hover avec délai pour éviter les prefetch inutiles
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)

    if (prefetchOnHover && !prefetchedRef.current) {
      // Délai court pour éviter les prefetch sur survol accidentel
      hoverTimeoutRef.current = setTimeout(() => {
        doPrefetch()
      }, 50)
    }
  }, [prefetchOnHover, doPrefetch])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const handleFocus = useCallback(() => {
    if (prefetchOnHover) {
      doPrefetch()
    }
  }, [prefetchOnHover, doPrefetch])

  // Navigation avec View Transitions API
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault()
      return
    }

    // Custom onClick handler
    if (onClick) {
      onClick(e)
      if (e.defaultPrevented) return
    }

    // Check if user wants to open in new tab
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      return // Let browser handle it
    }

    e.preventDefault()

    // Use View Transitions API if available and enabled
    const supportsViewTransitions = typeof document !== "undefined" &&
      "startViewTransition" in document &&
      useViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const navigate = () => {
      startTransition(() => {
        if (replace) {
          router.replace(href, { scroll })
        } else {
          router.push(href, { scroll })
        }
      })
    }

    if (supportsViewTransitions) {
      (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(() => {
        navigate()
      })
    } else {
      navigate()
    }
  }, [disabled, onClick, useViewTransition, router, href, replace, scroll])

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "transition-opacity duration-150",
        disabled && "pointer-events-none opacity-50",
        isPending && showLoading && "opacity-70",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onClick={handleClick}
      aria-disabled={disabled}
      data-pending={isPending || undefined}
      data-hovered={isHovered || undefined}
    >
      {children}
      {isPending && showLoading && (
        <span className="ml-2 inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
    </Link>
  )
}

/**
 * Hook pour navigation programmatique avec View Transitions
 */
export function useInstantNavigation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback((href: string, options?: { replace?: boolean; scroll?: boolean }) => {
    const { replace = false, scroll = true } = options ?? {}

    const supportsViewTransitions = typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const doNavigate = () => {
      startTransition(() => {
        if (replace) {
          router.replace(href, { scroll })
        } else {
          router.push(href, { scroll })
        }
      })
    }

    if (supportsViewTransitions) {
      (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(() => {
        doNavigate()
      })
    } else {
      doNavigate()
    }
  }, [router])

  const prefetch = useCallback((href: string) => {
    router.prefetch(href)
  }, [router])

  return { navigate, prefetch, isPending }
}

/**
 * Composant NavLink pour la navigation principale
 * Avec indicateur actif et prefetch intelligent
 */
interface NavLinkProps extends InstantLinkProps {
  isActive?: boolean
  activeClassName?: string
  inactiveClassName?: string
}

export function NavLink({
  href,
  children,
  className,
  isActive,
  activeClassName = "text-primary font-medium",
  inactiveClassName = "text-muted-foreground hover:text-foreground",
  ...props
}: NavLinkProps) {
  return (
    <InstantLink
      href={href}
      className={cn(
        "transition-colors duration-150",
        isActive ? activeClassName : inactiveClassName,
        className
      )}
      {...props}
    >
      {children}
    </InstantLink>
  )
}
