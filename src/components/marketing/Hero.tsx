import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Heart, Users, Sparkles } from "lucide-react"
import { AnimatedFamilyIllustration } from "./AnimatedFamilyIllustration"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient - warm tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10" />

      {/* Decorative shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute top-40 right-1/4 w-24 h-24 rounded-full bg-secondary/20 blur-2xl" />

      <div className="container relative py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Essai gratuit 14 jours - Sans carte bancaire
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Libérez votre{" "}
              <span className="text-primary relative">
                charge mentale
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </span>
              <br />
              <span className="text-primary/80">parentale</span>
            </h1>

            {/* Subheadline - Problem/Solution */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Les parents portent en moyenne{" "}
              <strong className="text-foreground font-semibold">60% de la charge mentale</strong>{" "}
              familiale. FamilyLoad automatise et répartit équitablement les tâches
              parentales grâce à l&apos;IA vocale.
            </p>

            {/* CTA Buttons - More prominent */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button size="lg" asChild className="text-base h-14 px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105">
                <Link href="/signup">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base h-14 px-8 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5">
                <Link href="#features">Découvrir les fonctionnalités</Link>
              </Button>
            </div>

            {/* Trust indicators - More emotional, less corporate */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary fill-primary/20" />
                <span>Fini les &ldquo;c&apos;est toujours moi qui...&rdquo;</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>Prêt en 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Vos données restent les vôtres</span>
              </div>
            </div>
          </div>

          {/* Right column - Illustration */}
          <div className="relative">
            {/* Family illustration container */}
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main illustration card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white to-accent/30 border-2 border-primary/10 shadow-2xl shadow-primary/10 p-8 overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="currentColor"/>
                    </pattern>
                    <rect fill="url(#dots)" width="100" height="100"/>
                  </svg>
                </div>

                {/* Animated Family SVG Illustration */}
                <div className="relative z-10">
                  <AnimatedFamilyIllustration />
                </div>

                {/* Floating voice command card */}
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-primary/10 max-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🎤</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                      &ldquo;Rappelle-moi le vaccin d&apos;Emma&rdquo;
                    </p>
                  </div>
                </div>

                {/* Floating task completed card */}
                <div className="absolute -top-2 -left-2 bg-white rounded-xl shadow-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-700">3 tâches faites !</span>
                  </div>
                </div>
              </div>

              {/* Decorative elements around the card */}
              <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-3xl bg-primary/10 transform rotate-3" />
              <div className="absolute -z-20 -top-8 -right-8 w-full h-full rounded-3xl bg-secondary/10 transform rotate-6" />
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="mt-20 pt-12 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">2min</div>
              <div className="text-sm text-muted-foreground">pour créer un compte</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">60%</div>
              <div className="text-sm text-muted-foreground">de charge mentale en moins</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">tâches pré-configurées</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <span className="flex items-center justify-center gap-1">
                  <Heart className="w-7 h-7 fill-primary" />
                </span>
              </div>
              <div className="text-sm text-muted-foreground">familles heureuses</div>
            </div>
          </div>

          {/* Social proof - Press mentions */}
          <div className="mt-12 pt-8 border-t border-border/30">
            <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-6">
              Ils parlent de nous
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">Le Monde</span>
                <span className="text-xs text-muted-foreground">Famille</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">Parents</span>
                <span className="text-xs text-muted-foreground">Magazine</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">Magicmaman</span>
                <span className="text-xs text-muted-foreground">Digital</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">Femme Actuelle</span>
                <span className="text-xs text-muted-foreground">Lifestyle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
