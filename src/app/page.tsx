import { Hero, Features, Pricing, Testimonials, FAQ, ScrollReveal, ParallaxSection, FloatingElement, ScrollProgress, WaveDivider, BlurIn, Highlight } from "@/components/marketing"
import { JsonLd } from "@/components/seo"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Heart, Star } from "lucide-react"
import MarketingLayout from "./(marketing)/layout"

export default function HomePage() {
  return (
    <MarketingLayout>
      <JsonLd />
      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Hero Section */}
      <Hero />

      {/* Decorative wave divider */}
      <WaveDivider className="-mt-1 text-accent/20" />

      {/* Features Section */}
      <Features />

      {/* Pricing Section */}
      <Pricing />

      {/* Wave divider before testimonials */}
      <WaveDivider className="-mb-1 text-accent/10" flip />

      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <FAQ />

      {/* Wave divider before final CTA */}
      <WaveDivider className="-mb-1 text-primary/5" flip />

      {/* Final CTA Section with Parallax */}
      <ParallaxSection
        className="py-20 md:py-28"
        bgClassName="bg-gradient-to-br from-primary/5 via-accent/10 to-secondary/5 animate-gradient"
        speed={0.3}
      >
        <div className="container relative">
          {/* Floating decorative elements */}
          <FloatingElement className="absolute -top-10 left-10 opacity-20 hidden md:block" duration={5} amplitude={20}>
            <Sparkles className="w-16 h-16 text-primary" />
          </FloatingElement>
          <FloatingElement className="absolute top-20 right-10 opacity-20 hidden md:block" duration={6} delay={1} amplitude={15}>
            <Heart className="w-12 h-12 text-primary fill-primary/20" />
          </FloatingElement>
          <FloatingElement className="absolute bottom-10 left-1/4 opacity-15 hidden md:block" duration={4} delay={2} amplitude={12}>
            <Star className="w-10 h-10 text-amber-400 fill-amber-400/20" />
          </FloatingElement>
          <FloatingElement className="absolute top-1/2 right-1/4 opacity-10 hidden lg:block" duration={7} delay={0.5} amplitude={18}>
            <div className="w-8 h-8 rounded-full bg-primary/30 blur-sm" />
          </FloatingElement>

          <div className="max-w-3xl mx-auto text-center relative z-10">
            <ScrollReveal animationType="cascade" distance={40}>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Prêt à alléger votre{" "}
                <span className="text-primary relative inline-block">
                  <Highlight color="bg-primary/15" delay={0.3}>charge mentale</Highlight>
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" fill="none">
                    <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </span>
                 ?
              </h2>
            </ScrollReveal>

            <BlurIn delay={0.2} duration={0.8}>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
                Rejoignez des milliers de parents qui ont retrouvé leur sérénité grâce à FamilyLoad.
                Commencez votre essai gratuit de 14 jours dès maintenant.
              </p>
            </BlurIn>

            <ScrollReveal delay={0.35} animationType="elastic">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-base h-14 px-8 transition-all duration-300 hover:scale-105 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 btn-shine btn-glow btn-glow-pulse btn-ripple group">
                  <Link href="/signup">
                    Créer mon compte gratuit
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base h-14 px-8 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 magnetic-hover btn-outline-fill btn-hover-lift">
                  <Link href="/login">J&apos;ai déjà un compte</Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Trust badges */}
            <ScrollReveal delay={0.5} animationType="wave">
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Installation en 2 min</span>
                </div>
                <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span>Sans carte bancaire</span>
                </div>
                <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  <span>Annulation libre</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </ParallaxSection>
    </MarketingLayout>
  )
}
