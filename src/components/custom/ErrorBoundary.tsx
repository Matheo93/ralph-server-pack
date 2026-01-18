"use client"

import { Component, ReactNode, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  RefreshCw,
  Home,
  WifiOff,
  ShieldX,
  ServerCrash,
  Bug,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { scaleIn, fadeIn, errorShake } from "@/lib/animations"
import { logger } from "@/lib/logger"

// ============================================
// ERROR TYPES
// ============================================

export type ErrorType = "general" | "network" | "auth" | "server" | "validation"

interface ErrorMeta {
  type: ErrorType
  icon: typeof AlertTriangle
  title: string
  description: string
  actionLabel: string
}

const ERROR_META: Record<ErrorType, ErrorMeta> = {
  general: {
    type: "general",
    icon: Bug,
    title: "Une erreur s'est produite",
    description: "Nous sommes désolés, quelque chose n'a pas fonctionné correctement.",
    actionLabel: "Réessayer",
  },
  network: {
    type: "network",
    icon: WifiOff,
    title: "Problème de connexion",
    description: "Impossible de se connecter au serveur. Vérifiez votre connexion internet.",
    actionLabel: "Réessayer la connexion",
  },
  auth: {
    type: "auth",
    icon: ShieldX,
    title: "Session expirée",
    description: "Votre session a expiré. Veuillez vous reconnecter.",
    actionLabel: "Se reconnecter",
  },
  server: {
    type: "server",
    icon: ServerCrash,
    title: "Erreur serveur",
    description: "Le serveur a rencontré un problème. Nos équipes sont informées.",
    actionLabel: "Réessayer",
  },
  validation: {
    type: "validation",
    icon: AlertTriangle,
    title: "Données invalides",
    description: "Les données fournies sont invalides. Veuillez vérifier votre saisie.",
    actionLabel: "Corriger",
  },
}

// ============================================
// ERROR CLASSIFICATION
// ============================================

function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("offline") ||
    name.includes("typeerror") && message.includes("failed to fetch")
  ) {
    return "network"
  }

  // Auth errors
  if (
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("session") ||
    message.includes("token") ||
    message.includes("auth")
  ) {
    return "auth"
  }

  // Server errors
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("server error") ||
    message.includes("internal error")
  ) {
    return "server"
  }

  // Validation errors
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    name.includes("validationerror") ||
    name.includes("zoderror")
  ) {
    return "validation"
  }

  return "general"
}

// ============================================
// ERROR BOUNDARY PROPS & STATE
// ============================================

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Name of the component/section for better error tracking */
  name?: string
  /** Custom fallback UI */
  fallback?: ReactNode
  /** Custom error handler callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo, context: ErrorContext) => void
  /** Enable/disable automatic error logging (default: true) */
  enableLogging?: boolean
  /** Render prop for custom error UI with context */
  renderError?: (props: ErrorRenderProps) => ReactNode
  /** Override error type classification */
  errorType?: ErrorType
  /** Show error details in development */
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorType: ErrorType
  retryCount: number
}

export interface ErrorContext {
  componentName: string
  errorType: ErrorType
  retryCount: number
  timestamp: string
}

export interface ErrorRenderProps {
  error: Error
  errorType: ErrorType
  errorInfo: React.ErrorInfo | null
  context: ErrorContext
  onRetry: () => void
  onGoHome: () => void
}

// ============================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorId: string = ""

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "general",
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Generate unique error ID for tracking
    this.errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

    const errorType = this.props.errorType || classifyError(error)

    // Create error context
    const context: ErrorContext = {
      componentName: this.props.name || "Unknown",
      errorType,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
    }

    // Update state with error info
    this.setState({ errorInfo, errorType })

    // Log error if enabled
    if (this.props.enableLogging !== false) {
      this.logError(error, errorInfo, context)
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo, context)
  }

  private logError(error: Error, errorInfo: React.ErrorInfo, context: ErrorContext) {
    const componentStack = errorInfo.componentStack || ""

    logger.error(`[ErrorBoundary] ${context.componentName}: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      errorId: this.errorId,
      errorType: context.errorType,
      componentName: context.componentName,
      retryCount: context.retryCount,
      componentStack: componentStack.substring(0, 500),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "SSR",
      url: typeof window !== "undefined" ? window.location.href : "SSR",
    })
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }))
  }

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard"
    }
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const context: ErrorContext = {
        componentName: this.props.name || "Unknown",
        errorType: this.state.errorType,
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
      }

      // Custom render prop
      if (this.props.renderError) {
        return this.props.renderError({
          error: this.state.error,
          errorType: this.state.errorType,
          errorInfo: this.state.errorInfo,
          context,
          onRetry: this.handleRetry,
          onGoHome: this.handleGoHome,
        })
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorType={this.state.errorType}
          errorId={this.errorId}
          onRetry={this.handleRetry}
          showDetails={this.props.showDetails ?? process.env.NODE_ENV === "development"}
          retryCount={this.state.retryCount}
        />
      )
    }

    return this.props.children
  }
}

// ============================================
// ERROR FALLBACK COMPONENT
// ============================================

interface ErrorFallbackProps {
  error: Error | null
  errorType?: ErrorType
  errorId?: string
  onRetry?: () => void
  showDetails?: boolean
  retryCount?: number
}

export function ErrorFallback({
  error,
  errorType = "general",
  errorId,
  onRetry,
  showDetails = false,
  retryCount = 0,
}: ErrorFallbackProps) {
  const meta = ERROR_META[errorType]
  const Icon = meta.icon
  const maxRetries = 3
  const canRetry = retryCount < maxRetries

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="flex items-center justify-center min-h-[400px] p-4"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.div variants={errorType === "validation" ? errorShake : scaleIn}>
          <Card className="max-w-md w-full shadow-lg border-destructive/20">
            <CardHeader className="text-center pb-2">
              <motion.div
                className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
              >
                <Icon className="h-8 w-8 text-destructive" />
              </motion.div>
              <CardTitle className="text-xl">{meta.title}</CardTitle>
              <CardDescription className="text-base">
                {meta.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details (dev only or if showDetails) */}
              {showDetails && error && (
                <motion.div
                  className="p-3 bg-muted rounded-lg text-sm font-mono overflow-auto max-h-32"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-destructive font-semibold">{error.name}</p>
                  <p className="text-muted-foreground break-words">{error.message}</p>
                  {errorId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ID: {errorId}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Retry count indicator */}
              {retryCount > 0 && (
                <motion.p
                  className="text-xs text-center text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Tentative {retryCount}/{maxRetries}
                </motion.p>
              )}

              {/* Action buttons */}
              <motion.div
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Auth error: redirect to login */}
                {errorType === "auth" ? (
                  <Button asChild className="w-full">
                    <Link href="/auth">
                      <ShieldX className="h-4 w-4 mr-2" />
                      {meta.actionLabel}
                    </Link>
                  </Button>
                ) : (
                  /* Other errors: retry button */
                  onRetry && canRetry && (
                    <Button
                      onClick={onRetry}
                      className="w-full"
                      variant={retryCount > 0 ? "outline" : "default"}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {meta.actionLabel}
                    </Button>
                  )
                )}

                {/* Go back button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.history.length > 1) {
                      window.history.back()
                    }
                  }}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>

                {/* Home button */}
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard">
                    <Home className="h-4 w-4 mr-2" />
                    Tableau de bord
                  </Link>
                </Button>
              </motion.div>

              {/* Support link */}
              <motion.p
                className="text-xs text-center text-muted-foreground pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Si le problème persiste, veuillez{" "}
                <a
                  href="mailto:support@familyload.app"
                  className="underline hover:text-foreground transition-colors"
                >
                  nous contacter
                </a>
                {errorId && (
                  <span className="block mt-1 font-mono text-[10px]">
                    Ref: {errorId}
                  </span>
                )}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// INLINE ERROR FALLBACK (for smaller components)
// ============================================

interface InlineErrorFallbackProps {
  error: Error | null
  onRetry?: () => void
  message?: string
}

export function InlineErrorFallback({
  error,
  onRetry,
  message = "Une erreur s'est produite",
}: InlineErrorFallbackProps) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
      variants={errorShake}
      initial="initial"
      animate="error"
    >
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">{message}</p>
        {error && process.env.NODE_ENV === "development" && (
          <p className="text-xs text-muted-foreground truncate">{error.message}</p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  )
}

// ============================================
// ASYNC BOUNDARY (ErrorBoundary + Suspense wrapper)
// ============================================

interface AsyncBoundaryProps {
  children: ReactNode
  name?: string
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  onError?: ErrorBoundaryProps["onError"]
}

export function AsyncBoundary({
  children,
  name,
  errorFallback,
  onError,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary name={name} fallback={errorFallback} onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

// ============================================
// HOOK: useErrorHandler
// ============================================

export function useErrorHandler(componentName?: string) {
  const handleError = useCallback(
    (error: Error, additionalContext?: Record<string, unknown>) => {
      const errorType = classifyError(error)
      const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

      logger.error(`[useErrorHandler] ${componentName || "Unknown"}: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        errorId,
        errorType,
        componentName: componentName || "Unknown",
        ...additionalContext,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "SSR",
        url: typeof window !== "undefined" ? window.location.href : "SSR",
      })

      return { errorId, errorType }
    },
    [componentName]
  )

  return { handleError, classifyError }
}

// ============================================
// HIGHER-ORDER COMPONENT
// ============================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  name?: string,
  fallback?: ReactNode
) {
  const displayName = name || WrappedComponent.displayName || WrappedComponent.name || "Component"

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary name={displayName} fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}
