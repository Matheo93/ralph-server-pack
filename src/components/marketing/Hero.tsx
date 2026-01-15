import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Essai gratuit 14 jours
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Libérez votre{" "}
            <span className="text-primary">charge mentale</span>
            <br />
            parentale
          </h1>

          {/* Subheadline - Problem/Solution */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Les parents portent en moyenne{" "}
            <strong className="text-foreground">60% de la charge mentale</strong>{" "}
            familiale. FamilyLoad automatise et répartit équitablement les tâches
            parentales grâce à l&apos;IA vocale.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild className="text-base">
              <Link href="/signup">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="#features">Découvrir les fonctionnalités</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Aucune carte requise</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Configuration en 2 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>RGPD compliant</span>
            </div>
          </div>
        </div>

        {/* App preview placeholder */}
        <div className="mt-16 md:mt-20 relative">
          <div className="max-w-4xl mx-auto">
            <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-muted to-muted/50 border shadow-2xl overflow-hidden">
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎤</span>
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    &ldquo;Rappelle-moi de prendre rendez-vous chez le pédiatre pour Emma&rdquo;
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Ajoutez des tâches en parlant, FamilyLoad s&apos;occupe du reste.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
