"use client"

import { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: sendToErrorTracking(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onRetry?: () => void
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Une erreur s&apos;est produite</CardTitle>
          <CardDescription>
            Nous sommes desoles, quelque chose n&apos;a pas fonctionne correctement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && error && (
            <div className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto">
              <p className="text-destructive font-medium">{error.name}</p>
              <p className="text-muted-foreground">{error.message}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reessayer
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Retour au tableau de bord
              </Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Si le probleme persiste, veuillez{" "}
            <a href="mailto:support@familyload.app" className="underline">
              nous contacter
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Wrapper for async components that may throw
 */
interface AsyncBoundaryProps {
  children: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
}

export function AsyncBoundary({
  children,
  errorFallback,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  )
}
