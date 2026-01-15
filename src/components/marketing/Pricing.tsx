import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const features = [
  "Tâches vocales illimitées",
  "Tous les templates automatiques",
  "Répartition équitable entre parents",
  "Jusqu'à 10 enfants",
  "Historique complet",
  "Notifications personnalisées",
  "Support prioritaire",
  "Nouveautés en avant-première",
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Un prix simple et transparent
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pas de surprise, pas de frais cachés. Un seul abonnement pour toute la famille.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative rounded-2xl border-2 border-primary bg-background p-8 shadow-lg">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                Prix de lancement
              </span>
            </div>

            {/* Price */}
            <div className="text-center mb-8 pt-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">4€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Facturation mensuelle • Annulable à tout moment
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button size="lg" className="w-full text-base" asChild>
              <Link href="/signup">
                Essayer gratuitement 14 jours
              </Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Aucune carte bancaire requise pour l&apos;essai
            </p>
          </div>
        </div>

        {/* Money back guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-sm">
            <span>✓</span>
            <span>Satisfait ou remboursé pendant 30 jours</span>
          </div>
        </div>
      </div>
    </section>
  )
}
