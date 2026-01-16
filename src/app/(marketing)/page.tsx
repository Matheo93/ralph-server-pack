import { Hero, Features, Pricing, Testimonials, FAQ, FinalCTA } from "@/components/marketing"

export default function MarketingPage() {
  return (
    <>
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
      <section className="py-20 md:py-28 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-secondary/5" />
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />

        <div className="container relative">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-10 md:p-16 text-center shadow-2xl shadow-primary/20 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <pattern id="cta-dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor"/>
                  </pattern>
                  <rect fill="url(#cta-dots)" width="100" height="100"/>
                </svg>
              </div>

              {/* Decorative shapes */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/20 text-white/90 text-sm font-medium backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  14 jours d&apos;essai gratuit
                </div>

                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Prêt à alléger votre charge mentale ?
                </h2>
                <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Rejoignez des milliers de parents qui ont retrouvé leur sérénité grâce à FamilyLoad.
                  Commencez votre essai gratuit dès maintenant.
                </p>
                <FinalCTA />

                <p className="text-sm text-white/70 mt-6">
                  Aucune carte bancaire requise • Annulation à tout moment
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
