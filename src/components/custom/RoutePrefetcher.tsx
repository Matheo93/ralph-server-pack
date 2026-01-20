"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Routes fréquentes à précharger pour améliorer la navigation
 * Organisées par priorité (haute, moyenne, basse)
 */
const PREFETCH_CONFIG = {
  // Routes principales du dashboard - toujours préchargées
  high: [
    "/dashboard",
    "/tasks",
    "/children",
    "/calendar",
    "/charge",
  ],
  // Routes secondaires - préchargées après délai
  medium: [
    "/shopping",
    "/challenges",
    "/settings",
  ],
  // Routes contextuelles - préchargées selon le contexte
  low: [
    "/tasks/new",
    "/tasks/today",
    "/tasks/week",
    "/children/new",
    "/settings/profile",
    "/settings/notifications",
    "/settings/household",
  ],
} as const

/**
 * Routes à précharger depuis la landing page (marketing)
 */
const MARKETING_PREFETCH = [
  "/login",
  "/signup",
  "/pricing",
] as const

/**
 * Routes à précharger depuis l'espace enfant
 */
const KIDS_PREFETCH_PATTERN = /^\/kids\/[^/]+/

/**
 * Génère les routes kids basées sur le childId
 */
function getKidsRoutes(childId: string): string[] {
  return [
    `/kids/${childId}/dashboard`,
    `/kids/${childId}/challenges`,
    `/kids/${childId}/shop`,
    `/kids/${childId}/badges`,
    `/kids/${childId}/profile`,
  ]
}

interface RoutePrefetcherProps {
  /** Délai initial avant de commencer le prefetching (ms) - default reduced for faster loading */
  initialDelay?: number
  /** Délai entre les niveaux de priorité (ms) */
  priorityDelay?: number
  /** Activer le prefetching contextuel basé sur la route actuelle */
  contextual?: boolean
}

/**
 * Composant de prefetching intelligent des routes
 *
 * Précharge les routes fréquentes en arrière-plan pour améliorer
 * la vitesse de navigation perçue par l'utilisateur.
 *
 * Stratégies:
 * 1. Prefetch prioritaire: Routes principales immédiatement après hydratation
 * 2. Prefetch différé: Routes secondaires après un délai
 * 3. Prefetch contextuel: Routes liées à la page actuelle
 */
export function RoutePrefetcher({
  initialDelay = 100, // Reduced for instant feel
  priorityDelay = 500, // Faster priority progression
  contextual = true,
}: RoutePrefetcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prefetchedRoutes = useRef<Set<string>>(new Set())
  const isIdleCallbackSupported = useRef(typeof requestIdleCallback !== "undefined")

  /**
   * Précharge une route si elle n'a pas déjà été préchargée
   */
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route) || route === pathname) {
      return
    }

    try {
      router.prefetch(route)
      prefetchedRoutes.current.add(route)
    } catch {
      // Ignorer les erreurs de prefetch silencieusement
    }
  }, [router, pathname])

  /**
   * Précharge un groupe de routes avec requestIdleCallback si disponible
   */
  const prefetchRouteGroup = useCallback((routes: readonly string[]) => {
    const doPrefetch = () => {
      routes.forEach(route => prefetchRoute(route))
    }

    if (isIdleCallbackSupported.current) {
      requestIdleCallback(doPrefetch, { timeout: 3000 })
    } else {
      // Fallback pour Safari et anciens navigateurs
      setTimeout(doPrefetch, 100)
    }
  }, [prefetchRoute])

  /**
   * Détermine les routes contextuelles basées sur la page actuelle
   */
  const getContextualRoutes = useCallback((): string[] => {
    const routes: string[] = []

    // Sur le dashboard, précharger les sous-pages fréquentes
    if (pathname === "/dashboard") {
      routes.push("/tasks/today", "/tasks/new", "/children")
    }

    // Sur les tâches, précharger les vues alternatives
    if (pathname === "/tasks" || pathname.startsWith("/tasks")) {
      routes.push("/tasks/today", "/tasks/week", "/tasks/recurring", "/tasks/new")
    }

    // Sur les enfants, précharger la création
    if (pathname === "/children" || pathname.startsWith("/children")) {
      routes.push("/children/new")
    }

    // Sur les paramètres, précharger les sous-sections populaires
    if (pathname === "/settings" || pathname.startsWith("/settings")) {
      routes.push(
        "/settings/profile",
        "/settings/notifications",
        "/settings/household",
        "/settings/billing"
      )
    }

    // Sur le calendrier, précharger l'historique
    if (pathname === "/calendar") {
      routes.push("/calendar/history")
    }

    return routes
  }, [pathname])

  // Effet principal de prefetching
  useEffect(() => {
    // Ne pas précharger pendant le développement si demandé
    // (commenté pour permettre le test en dev)
    // if (process.env.NODE_ENV === "development") return

    // Déterminer si on est dans le contexte marketing ou dashboard
    const isMarketingContext = pathname === "/" ||
      pathname === "/pricing" ||
      pathname === "/privacy" ||
      pathname === "/terms"

    const isKidsContext = KIDS_PREFETCH_PATTERN.test(pathname)
    const isDashboardContext = !isMarketingContext && !isKidsContext

    // Extraire le childId pour l'espace kids
    const kidsMatch = pathname.match(/^\/kids\/([^/]+)/)
    const childId = kidsMatch ? kidsMatch[1] : null

    // Timer pour le prefetch initial
    const highPriorityTimer = setTimeout(() => {
      if (isMarketingContext) {
        prefetchRouteGroup(MARKETING_PREFETCH)
      } else if (isKidsContext && childId) {
        // Précharger les routes kids
        prefetchRouteGroup(getKidsRoutes(childId))
      } else if (isDashboardContext) {
        prefetchRouteGroup(PREFETCH_CONFIG.high)
      }
    }, initialDelay)

    // Timer pour le prefetch de priorité moyenne
    const mediumPriorityTimer = setTimeout(() => {
      if (isDashboardContext) {
        prefetchRouteGroup(PREFETCH_CONFIG.medium)
      }
    }, initialDelay + priorityDelay)

    // Timer pour le prefetch de basse priorité et contextuel
    const lowPriorityTimer = setTimeout(() => {
      if (isDashboardContext) {
        prefetchRouteGroup(PREFETCH_CONFIG.low)

        if (contextual) {
          const contextualRoutes = getContextualRoutes()
          prefetchRouteGroup(contextualRoutes)
        }
      }
    }, initialDelay + priorityDelay * 2)

    // Cleanup
    return () => {
      clearTimeout(highPriorityTimer)
      clearTimeout(mediumPriorityTimer)
      clearTimeout(lowPriorityTimer)
    }
  }, [
    pathname,
    initialDelay,
    priorityDelay,
    contextual,
    prefetchRouteGroup,
    getContextualRoutes,
  ])

  // Prefetch contextuel lors du changement de page
  useEffect(() => {
    if (!contextual) return

    const contextualTimer = setTimeout(() => {
      const contextualRoutes = getContextualRoutes()
      prefetchRouteGroup(contextualRoutes)
    }, 500)

    return () => clearTimeout(contextualTimer)
  }, [pathname, contextual, getContextualRoutes, prefetchRouteGroup])

  // Ce composant ne rend rien visuellement
  return null
}

/**
 * Hook pour précharger une route spécifique programmatiquement
 */
export function usePrefetch() {
  const router = useRouter()
  const prefetchedRoutes = useRef<Set<string>>(new Set())

  const prefetch = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) {
      return
    }

    try {
      router.prefetch(route)
      prefetchedRoutes.current.add(route)
    } catch {
      // Ignorer les erreurs silencieusement
    }
  }, [router])

  const prefetchOnHover = useCallback((route: string) => {
    return {
      onMouseEnter: () => prefetch(route),
      onFocus: () => prefetch(route),
    }
  }, [prefetch])

  return { prefetch, prefetchOnHover }
}
