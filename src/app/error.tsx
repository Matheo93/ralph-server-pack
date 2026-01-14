"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console
    console.error("Application error:", error)

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: sendErrorToTracking(error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Oups ! Une erreur s&apos;est produite</CardTitle>
          <CardDescription className="text-base">
            Nous sommes desoles, quelque chose n&apos;a pas fonctionne comme prevu.
            Ne vous inquietez pas, vos donnees sont en securite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error details in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="p-4 bg-muted rounded-lg text-sm font-mono overflow-auto">
              <p className="text-destructive font-semibold mb-1">{error.name}</p>
              <p className="text-muted-foreground break-words">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button onClick={reset} className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reessayer
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Accueil
                </Link>
              </Button>
            </div>
          </div>

          {/* Help text */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Si le probleme persiste, essayez de rafraichir la page
              ou de vous reconnecter.
            </p>
            <p>
              Besoin d&apos;aide ?{" "}
              <a
                href="mailto:support@familyload.app"
                className="text-primary underline hover:no-underline"
              >
                Contactez notre support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
