"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import { Check, Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: "month" | "year"
  features: string[]
  popular?: boolean
  trialDays?: number
  priceId?: string
}

interface PricingCardProps {
  plan: PricingPlan
  currentPlan?: string
  onSelect?: (planId: string, priceId: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function PricingCard({
  plan,
  currentPlan,
  onSelect,
  disabled = false,
  className,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isCurrentPlan = currentPlan === plan.id
  const isPopular = plan.popular

  const handleSelect = async () => {
    if (!onSelect || !plan.priceId || disabled || isCurrentPlan) return

    setIsLoading(true)
    try {
      await onSelect(plan.id, plan.priceId)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price / 100)
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isPopular && "border-primary shadow-lg",
        isCurrentPlan && "border-green-500 bg-green-50/50",
        className
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
          <Sparkles className="h-3 w-3" />
          Populaire
        </Badge>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>

        <div className="mt-4">
          <span className="text-4xl font-bold">
            {formatPrice(plan.price, plan.currency)}
          </span>
          <span className="text-muted-foreground">
            /{plan.interval === "month" ? "mois" : "an"}
          </span>
        </div>

        {plan.trialDays && plan.trialDays > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {plan.trialDays} jours d'essai gratuit
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-grow">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
          disabled={disabled || isCurrentPlan || isLoading}
          onClick={handleSelect}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement...
            </>
          ) : isCurrentPlan ? (
            "Plan actuel"
          ) : (
            "Choisir ce plan"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Pricing grid component
interface PricingGridProps {
  plans: PricingPlan[]
  currentPlan?: string
  onSelectPlan?: (planId: string, priceId: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function PricingGrid({
  plans,
  currentPlan,
  onSelectPlan,
  disabled = false,
  className,
}: PricingGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6",
        plans.length === 2 && "md:grid-cols-2",
        plans.length >= 3 && "md:grid-cols-3",
        className
      )}
    >
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlan}
          onSelect={onSelectPlan}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

// Pre-defined plans for FamilyLoad
export const FAMILYLOAD_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Gratuit",
    description: "Pour commencer",
    price: 0,
    currency: "eur",
    interval: "month",
    features: [
      "1 foyer",
      "2 utilisateurs",
      "Taches illimitees",
      "Rappels par email",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Pour toute la famille",
    price: 400,
    currency: "eur",
    interval: "month",
    popular: true,
    trialDays: 14,
    priceId: process.env["NEXT_PUBLIC_STRIPE_PRICE_ID"],
    features: [
      "Utilisateurs illimites",
      "Statistiques avancees",
      "Notifications push",
      "Export des donnees",
      "Support prioritaire",
      "Historique complet",
    ],
  },
]
