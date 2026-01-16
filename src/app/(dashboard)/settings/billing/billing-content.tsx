"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SubscriptionStatus, SubscriptionAlert } from "@/components/custom/SubscriptionStatus"
import { SettingsNav } from "@/components/custom/SettingsNav"
import { CreditCard, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react"

interface BillingContentProps {
  household: {
    id: string
    name: string
    subscriptionStatus: "trial" | "active" | "past_due" | "cancelled"
    subscriptionEndsAt: Date | null
    hasStripeCustomer: boolean
  }
  subscription: {
    status: "trial" | "active" | "past_due" | "cancelled"
    amount: number
    currency: string
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialEndsAt: Date | null
    cancelledAt: Date | null
  } | null
}

export function BillingContent({ household, subscription }: BillingContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for success/cancel from Stripe redirect
  const success = searchParams.get("success")
  const canceled = searchParams.get("canceled")

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: household.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de la création de la session de paiement")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de la création du portail de gestion")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "—"
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Facturation</h2>
        <p className="text-muted-foreground">
          Gérez votre abonnement et vos informations de paiement.
        </p>
      </div>

      <SettingsNav />

      {/* Success/Cancel messages */}
      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Paiement réussi !</p>
                <p className="text-sm text-green-700">
                  Votre abonnement est maintenant actif. Merci de votre confiance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canceled && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Paiement annulé</p>
                <p className="text-sm text-amber-700">
                  Le paiement a été annulé. Vous pouvez réessayer à tout moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription alert if expiring */}
      <SubscriptionAlert
        status={household.subscriptionStatus}
        trialEndsAt={subscription?.trialEndsAt}
        subscriptionEndsAt={household.subscriptionEndsAt}
      />

      {/* Subscription status card */}
      <Card>
        <CardHeader>
          <CardTitle>État de l&apos;abonnement</CardTitle>
          <CardDescription>
            Votre abonnement FamilyLoad pour {household.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <SubscriptionStatus
                status={household.subscriptionStatus}
                trialEndsAt={subscription?.trialEndsAt}
                subscriptionEndsAt={household.subscriptionEndsAt}
                className="mt-1"
              />
            </div>

            {subscription && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Prix</p>
                <p className="text-lg font-semibold">
                  {formatPrice(subscription.amount, subscription.currency)}/mois
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {subscription?.currentPeriodStart && (
              <div>
                <p className="text-muted-foreground">Début de période</p>
                <p className="font-medium">{formatDate(subscription.currentPeriodStart)}</p>
              </div>
            )}
            {subscription?.currentPeriodEnd && (
              <div>
                <p className="text-muted-foreground">Prochain paiement</p>
                <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
            {household.subscriptionStatus === "trial" && subscription?.trialEndsAt && (
              <div>
                <p className="text-muted-foreground">Fin de l&apos;essai</p>
                <p className="font-medium">{formatDate(subscription.trialEndsAt)}</p>
              </div>
            )}
            {subscription?.cancelledAt && (
              <div>
                <p className="text-muted-foreground">Annulé le</p>
                <p className="font-medium">{formatDate(subscription.cancelledAt)}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {household.subscriptionStatus === "trial" || !household.hasStripeCustomer ? (
              <Button onClick={handleSubscribe} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                S&apos;abonner maintenant
              </Button>
            ) : (
              <Button onClick={handleManageSubscription} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Gérer l&apos;abonnement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan details */}
      <Card>
        <CardHeader>
          <CardTitle>Votre forfait</CardTitle>
          <CardDescription>
            Fonctionnalités incluses dans votre abonnement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              "Tâches vocales illimitées",
              "Tous les templates automatiques",
              "Répartition équitable entre parents",
              "Jusqu'à 10 enfants",
              "Historique complet",
              "Notifications personnalisées",
              "Support prioritaire",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
