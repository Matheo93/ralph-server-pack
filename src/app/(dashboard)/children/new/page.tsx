import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { canAddChild } from "@/lib/services/subscription"
import { ChildForm } from "@/components/custom/child-form"
import { Button } from "@/components/ui/button"
import { Crown, Sparkles, ArrowRight, Users } from "lucide-react"

export default async function NewChildPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  // Check if user can add more children
  const childLimit = await canAddChild(household.household_id)

  // If limit reached, show premium upgrade screen
  if (!childLimit.allowed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Link href="/children">
            <Button variant="ghost" className="mb-4">
              ← Retour
            </Button>
          </Link>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 flex items-center justify-center mb-6">
              <Crown className="w-10 h-10 text-amber-600" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Limite atteinte</h2>
            <p className="text-muted-foreground mb-6">
              Vous avez atteint la limite de {childLimit.maxCount} enfants du plan Gratuit.
              Passez Premium pour ajouter des enfants illimités !
            </p>

            <div className="flex items-center justify-center gap-6 mb-8 p-4 bg-background/50 rounded-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gratuit</p>
                <p className="text-xl font-bold">{childLimit.maxCount} max</p>
                <p className="text-sm text-muted-foreground">
                  ({childLimit.currentCount} utilisés)
                </p>
              </div>

              <ArrowRight className="w-6 h-6 text-primary" />

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-primary uppercase tracking-wide font-medium">Premium</p>
                <p className="text-xl font-bold text-primary">Illimité</p>
                <p className="text-sm text-primary/70">
                  2,99€/mois
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/children">Retour aux enfants</Link>
              </Button>
              <Button asChild className="gap-2">
                <Link href="/pricing">
                  <Sparkles className="w-4 h-4" />
                  Passer Premium
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/children">
          <Button variant="ghost" className="mb-4">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">Ajouter un enfant</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Les tâches seront automatiquement générées selon son âge
        </p>
        {/* Show remaining slots for free users */}
        {childLimit.maxCount !== Infinity && (
          <p className="text-sm text-amber-600 mt-2">
            {childLimit.maxCount - childLimit.currentCount} place(s) restante(s) sur le plan Gratuit
          </p>
        )}
      </div>

      <div className="max-w-lg">
        <ChildForm mode="create" />
      </div>
    </div>
  )
}
