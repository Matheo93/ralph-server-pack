import { Hero, Features, Pricing, Testimonials, FAQ } from "@/components/marketing"
import { JsonLd } from "@/components/seo"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import MarketingLayout from "./(marketing)/layout"

export default function HomePage() {
  return (
    <MarketingLayout>
      <JsonLd />
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* Pricing Section */}
      <Pricing />

      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <FAQ />

      {/* Final CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à alléger votre charge mentale ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Rejoignez des milliers de parents qui ont retrouvé leur sérénité grâce à FamilyLoad.
              Commencez votre essai gratuit de 14 jours dès maintenant.
            </p>
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
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
