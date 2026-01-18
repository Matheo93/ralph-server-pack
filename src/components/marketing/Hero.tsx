"use client"

import { CheckCircle2, Heart, Users, Sparkles } from "lucide-react"
import { AnimatedFamilyIllustration } from "./AnimatedFamilyIllustration"
import { ScrollReveal, FloatingElement, Parallax, BlurIn, Highlight, LineReveal, RevealLine, ScaleReveal, SplitText, BounceIn, CountUp } from "./ScrollReveal"
import { HeroCTA } from "./HeroCTA"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient - warm tones with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 animate-gradient" />

      {/* Animated decorative shapes - floating blobs with parallax */}
      <Parallax speed={0.4} className="absolute top-20 left-10">
        <div className="w-32 h-32 bg-primary/10 blur-3xl animate-blob animate-pulse-glow" />
      </Parallax>
      <Parallax speed={0.2} direction="down" className="absolute bottom-20 right-10">
        <div className="w-40 h-40 bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      </Parallax>
      <Parallax speed={0.3} className="absolute top-40 right-1/4">
        <div className="w-24 h-24 bg-secondary/20 blur-2xl animate-blob" style={{ animationDelay: "4s" }} />
      </Parallax>
      <Parallax speed={0.15} direction="down" className="absolute top-1/2 left-1/4">
        <div className="w-20 h-20 bg-primary/5 blur-2xl animate-blob" style={{ animationDelay: "1s" }} />
      </Parallax>
      <Parallax speed={0.25} className="absolute bottom-40 left-20 hidden lg:block">
        <div className="w-16 h-16 bg-amber-200/30 blur-2xl animate-blob" style={{ animationDelay: "3s" }} />
      </Parallax>

      <div className="container relative py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <ScrollReveal delay={0.1} animationType="spring">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/20 hover:bg-primary/20 transition-colors duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Essai gratuit 14 jours - Sans carte bancaire
            </div>
            </ScrollReveal>

            {/* Headline with enhanced animation */}
            <LineReveal delay={0.15} staggerDelay={0.08}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
                <RevealLine>
                  Libérez votre{" "}
                </RevealLine>
                <RevealLine>
                  <span className="text-primary relative inline-block">
                    <Highlight color="bg-primary/15" delay={0.5}>charge mentale</Highlight>
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                  </span>
                </RevealLine>
                <RevealLine>
                  <span className="text-primary/80">parentale</span>
                </RevealLine>
              </h1>
            </LineReveal>

            {/* Subheadline - Problem/Solution with blur effect */}
            <BlurIn delay={0.4} duration={0.8}>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Les parents portent en moyenne{" "}
              <Highlight color="bg-amber-100" delay={0.8}>
                <strong className="text-foreground font-semibold">60% de la charge mentale</strong>
              </Highlight>{" "}
              familiale. FamilyLoad automatise et répartit équitablement les tâches
              parentales grâce à l&apos;IA vocale.
            </p>
            </BlurIn>

            {/* CTA Buttons - More prominent with smooth transitions */}
            <ScrollReveal delay={0.5} animationType="elastic">
              <HeroCTA />
            </ScrollReveal>

            {/* Trust indicators - More emotional, less corporate */}
            <ScrollReveal delay={0.6} animationType="wave">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                <Heart className="h-5 w-5 text-primary fill-primary/20 scale-bounce-hover" />
                <span>Fini les &ldquo;c&apos;est toujours moi qui...&rdquo;</span>
              </div>
              <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                <Sparkles className="h-5 w-5 text-amber-500 scale-bounce-hover" />
                <span>Prêt en 2 minutes</span>
              </div>
              <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                <Users className="h-5 w-5 text-primary scale-bounce-hover" />
                <span>Vos données restent les vôtres</span>
              </div>
            </div>
            </ScrollReveal>
          </div>

          {/* Right column - Illustration */}
          <ScaleReveal delay={0.3} duration={0.8}>
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
              <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-3xl bg-primary/10 transform rotate-3 animate-pulse-glow" />
              <div className="absolute -z-20 -top-8 -right-8 w-full h-full rounded-3xl bg-secondary/10 transform rotate-6" />
            </div>
          </div>
          </ScaleReveal>
        </div>

        {/* Stats section */}
        <ScrollReveal delay={0.5} animationType="cascade" distance={40}>
        <div className="mt-20 pt-12 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <BounceIn from="top-left" delay={0.6}>
            <div className="group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <CountUp end={2} suffix="min" duration={1.5} />
              </div>
              <div className="text-sm text-muted-foreground">pour créer un compte</div>
            </div>
            </BounceIn>
            <BounceIn from="top-right" delay={0.7}>
            <div className="group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <CountUp end={60} suffix="%" duration={2} />
              </div>
              <div className="text-sm text-muted-foreground">de charge mentale en moins</div>
            </div>
            </BounceIn>
            <BounceIn from="bottom-left" delay={0.8}>
            <div className="group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <CountUp end={500} suffix="+" duration={2.5} />
              </div>
              <div className="text-sm text-muted-foreground">tâches pré-configurées</div>
            </div>
            </BounceIn>
            <BounceIn from="bottom-right" delay={0.9}>
            <div className="group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <span className="flex items-center justify-center gap-1">
                  <Heart className="w-7 h-7 fill-primary animate-heartbeat" />
                </span>
              </div>
              <div className="text-sm text-muted-foreground">familles heureuses</div>
            </div>
            </BounceIn>
          </div>

          {/* Social proof - Press mentions */}
          <ScrollReveal delay={1} animationType="blur">
          <div className="mt-12 pt-8 border-t border-border/30">
            <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-6">
              Ils parlent de nous
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-80 transition-opacity duration-300">
              <div className="flex flex-col items-center hover:scale-105 transition-transform duration-200">
                <span className="text-lg font-bold text-foreground">Le Monde</span>
                <span className="text-xs text-muted-foreground">Famille</span>
              </div>
              <div className="flex flex-col items-center hover:scale-105 transition-transform duration-200">
                <span className="text-lg font-bold text-foreground">Parents</span>
                <span className="text-xs text-muted-foreground">Magazine</span>
              </div>
              <div className="flex flex-col items-center hover:scale-105 transition-transform duration-200">
                <span className="text-lg font-bold text-foreground">Magicmaman</span>
                <span className="text-xs text-muted-foreground">Digital</span>
              </div>
              <div className="flex flex-col items-center hover:scale-105 transition-transform duration-200">
                <span className="text-lg font-bold text-foreground">Femme Actuelle</span>
                <span className="text-xs text-muted-foreground">Lifestyle</span>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
