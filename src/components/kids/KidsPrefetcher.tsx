"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface KidsPrefetcherProps {
  childId: string
}

/**
 * Composant de prefetching pour l'espace enfant
 *
 * Précharge toutes les routes de navigation kids pour une
 * navigation instantanée entre les sections.
 */
export function KidsPrefetcher({ childId }: KidsPrefetcherProps) {
  const router = useRouter()
  const prefetchedRoutes = useRef<Set<string>>(new Set())
  const isIdleCallbackSupported = useRef(typeof requestIdleCallback !== "undefined")

  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) {
      return
    }

    try {
      router.prefetch(route)
      prefetchedRoutes.current.add(route)
    } catch {
      // Ignorer les erreurs de prefetch silencieusement
    }
  }, [router])

  useEffect(() => {
    const kidsRoutes = [
      `/kids/${childId}/dashboard`,
      `/kids/${childId}/challenges`,
      `/kids/${childId}/shop`,
      `/kids/${childId}/badges`,
      `/kids/${childId}/profile`,
    ]

    const doPrefetch = () => {
      kidsRoutes.forEach(route => prefetchRoute(route))
    }

    // Prefetch après un court délai pour ne pas bloquer le rendu initial
    const timer = setTimeout(() => {
      if (isIdleCallbackSupported.current) {
        requestIdleCallback(doPrefetch, { timeout: 2000 })
      } else {
        doPrefetch()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [childId, prefetchRoute])

  return null
}
