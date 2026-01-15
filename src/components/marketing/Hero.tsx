import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Heart, Users, Sparkles } from "lucide-react"

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

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button size="lg" asChild className="text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                <Link href="/signup">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base border-2">
                <Link href="#features">Découvrir les fonctionnalités</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Aucune carte requise</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Configuration en 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>RGPD compliant</span>
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

                {/* Family SVG Illustration */}
                <div className="relative z-10">
                  <svg viewBox="0 0 400 320" className="w-full h-auto">
                    {/* Background circle */}
                    <circle cx="200" cy="160" r="140" fill="url(#bgGradient)" opacity="0.3"/>

                    {/* Gradients */}
                    <defs>
                      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                      </linearGradient>
                      <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fcd5b8"/>
                        <stop offset="100%" stopColor="#e8b896"/>
                      </linearGradient>
                      <linearGradient id="hairBrown" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#5c4033"/>
                        <stop offset="100%" stopColor="#3d2817"/>
                      </linearGradient>
                      <linearGradient id="coralShirt" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316"/>
                        <stop offset="100%" stopColor="#ea580c"/>
                      </linearGradient>
                      <linearGradient id="blueShirt" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6"/>
                        <stop offset="100%" stopColor="#2563eb"/>
                      </linearGradient>
                      <linearGradient id="greenShirt" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e"/>
                        <stop offset="100%" stopColor="#16a34a"/>
                      </linearGradient>
                    </defs>

                    {/* Parent 1 (left) */}
                    <g transform="translate(80, 80)">
                      {/* Body */}
                      <ellipse cx="50" cy="180" rx="35" ry="50" fill="url(#coralShirt)"/>
                      {/* Neck */}
                      <rect x="40" y="110" width="20" height="25" fill="url(#skinTone)"/>
                      {/* Head */}
                      <circle cx="50" cy="80" r="45" fill="url(#skinTone)"/>
                      {/* Hair */}
                      <ellipse cx="50" cy="55" rx="42" ry="30" fill="url(#hairBrown)"/>
                      {/* Eyes */}
                      <circle cx="35" cy="80" r="5" fill="#3d2817"/>
                      <circle cx="65" cy="80" r="5" fill="#3d2817"/>
                      <circle cx="37" cy="78" r="2" fill="white"/>
                      <circle cx="67" cy="78" r="2" fill="white"/>
                      {/* Smile */}
                      <path d="M35 100 Q50 115 65 100" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      {/* Cheeks */}
                      <circle cx="25" cy="95" r="8" fill="#fca5a5" opacity="0.4"/>
                      <circle cx="75" cy="95" r="8" fill="#fca5a5" opacity="0.4"/>
                    </g>

                    {/* Parent 2 (right) */}
                    <g transform="translate(220, 80)">
                      {/* Body */}
                      <ellipse cx="50" cy="180" rx="35" ry="50" fill="url(#blueShirt)"/>
                      {/* Neck */}
                      <rect x="40" y="110" width="20" height="25" fill="url(#skinTone)"/>
                      {/* Head */}
                      <circle cx="50" cy="80" r="45" fill="url(#skinTone)"/>
                      {/* Hair (shorter) */}
                      <ellipse cx="50" cy="50" rx="38" ry="25" fill="url(#hairBrown)"/>
                      {/* Eyes */}
                      <circle cx="35" cy="80" r="5" fill="#3d2817"/>
                      <circle cx="65" cy="80" r="5" fill="#3d2817"/>
                      <circle cx="37" cy="78" r="2" fill="white"/>
                      <circle cx="67" cy="78" r="2" fill="white"/>
                      {/* Smile */}
                      <path d="M35 100 Q50 115 65 100" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      {/* Cheeks */}
                      <circle cx="25" cy="95" r="8" fill="#fca5a5" opacity="0.4"/>
                      <circle cx="75" cy="95" r="8" fill="#fca5a5" opacity="0.4"/>
                    </g>

                    {/* Child (center, front) */}
                    <g transform="translate(160, 150)">
                      {/* Body */}
                      <ellipse cx="40" cy="130" rx="25" ry="35" fill="url(#greenShirt)"/>
                      {/* Neck */}
                      <rect x="32" y="85" width="16" height="18" fill="url(#skinTone)"/>
                      {/* Head */}
                      <circle cx="40" cy="60" r="35" fill="url(#skinTone)"/>
                      {/* Hair (pigtails style) */}
                      <ellipse cx="40" cy="40" rx="30" ry="22" fill="url(#hairBrown)"/>
                      <circle cx="10" cy="45" r="12" fill="url(#hairBrown)"/>
                      <circle cx="70" cy="45" r="12" fill="url(#hairBrown)"/>
                      {/* Eyes */}
                      <circle cx="28" cy="58" r="4" fill="#3d2817"/>
                      <circle cx="52" cy="58" r="4" fill="#3d2817"/>
                      <circle cx="29" cy="56" r="1.5" fill="white"/>
                      <circle cx="53" cy="56" r="1.5" fill="white"/>
                      {/* Big smile */}
                      <path d="M28 75 Q40 88 52 75" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                      {/* Cheeks */}
                      <circle cx="18" cy="70" r="6" fill="#fca5a5" opacity="0.5"/>
                      <circle cx="62" cy="70" r="6" fill="#fca5a5" opacity="0.5"/>
                    </g>

                    {/* Heart decorations */}
                    <g fill="#f97316" opacity="0.6">
                      <path transform="translate(60, 50) scale(0.8)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      <path transform="translate(320, 60) scale(0.6)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      <path transform="translate(340, 200) scale(0.5)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </g>

                    {/* Stars/sparkles */}
                    <g fill="#f59e0b">
                      <polygon transform="translate(45, 100)" points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" opacity="0.7"/>
                      <polygon transform="translate(335, 120)" points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5" opacity="0.5"/>
                    </g>
                  </svg>
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
        </div>
      </div>
    </section>
  )
}
