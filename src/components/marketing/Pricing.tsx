import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Shield, Heart } from "lucide-react"

const features = [
  { text: "Tâches vocales illimitées", highlight: true },
  { text: "Tous les templates automatiques", highlight: false },
  { text: "Répartition équitable entre parents", highlight: true },
  { text: "Jusqu'à 10 enfants", highlight: false },
  { text: "Historique complet", highlight: false },
  { text: "Notifications personnalisées", highlight: false },
  { text: "Support prioritaire", highlight: false },
  { text: "Nouveautés en avant-première", highlight: false },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gradient-to-b from-background via-secondary/20 to-background">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Tarif unique
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Un prix simple et transparent
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pas de surprise, pas de frais cachés. Un seul abonnement pour toute la famille.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative rounded-3xl border-2 border-primary bg-gradient-to-br from-white to-accent/20 p-8 shadow-2xl shadow-primary/10">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/30">
                <Heart className="w-4 h-4 fill-current" />
                Prix de lancement
              </span>
            </div>

            {/* Price */}
            <div className="text-center mb-8 pt-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-6xl font-bold text-primary">4€</span>
                <span className="text-xl text-muted-foreground">/mois</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Facturation mensuelle • Annulable à tout moment
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-sm line-through text-muted-foreground/60">9,99€</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">-60%</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className={`flex items-center gap-3 ${feature.highlight ? 'font-medium' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${feature.highlight ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button size="lg" className="w-full text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" asChild>
              <Link href="/signup">
                Essayer gratuitement 14 jours
              </Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Aucune carte bancaire requise pour l&apos;essai
            </p>
          </div>
        </div>

        {/* Money back guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Satisfait ou remboursé</p>
              <p className="text-sm text-green-600">Pendant 30 jours, sans condition</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
