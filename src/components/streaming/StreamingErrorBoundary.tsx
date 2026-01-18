"use client"

import { Component, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface StreamingErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface StreamingErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary for streaming SSR components.
 * Catches errors in async server components wrapped in Suspense.
 *
 * Usage:
 * ```tsx
 * <StreamingErrorBoundary sectionName="Tâches du jour">
 *   <Suspense fallback={<TasksSkeleton />}>
 *     <AsyncTasksComponent />
 *   </Suspense>
 * </StreamingErrorBoundary>
 * ```
 */
export class StreamingErrorBoundary extends Component<
  StreamingErrorBoundaryProps,
  StreamingErrorBoundaryState
> {
  constructor(props: StreamingErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): StreamingErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (could send to error tracking service)
    console.error("StreamingErrorBoundary caught error:", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    // Force a refresh of the current page to retry loading
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {this.props.sectionName
                  ? `Erreur lors du chargement : ${this.props.sectionName}`
                  : "Une erreur est survenue"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Impossible de charger cette section. Veuillez réessayer.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Compact error fallback for inline sections
 */
export function StreamingErrorFallback({
  message = "Erreur de chargement",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground rounded-lg border border-destructive/20 bg-destructive/5">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <span>{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
