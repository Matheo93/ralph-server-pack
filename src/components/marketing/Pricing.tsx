"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, X, Sparkles, Shield, Crown, Zap } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem, BlurIn, Highlight, SlideRotate, PerspectiveReveal } from "./ScrollReveal"

const plans = [
  {
    name: "Gratuit",
    price: "0€",
    period: "pour toujours",
    description: "Pour découvrir FamilyLoad",
    highlight: false,
    cta: "Commencer gratuitement",
    ctaLink: "/signup",
    features: [
      { text: "Jusqu'à 2 enfants", included: true },
      { text: "5 commandes vocales/jour", included: true },
      { text: "Historique 7 jours", included: true },
      { text: "Tâches manuelles illimitées", included: true },
      { text: "Répartition charge mentale", included: true },
      { text: "Tâches automatiques", included: false },
      { text: "Export PDF", included: false },
      { text: "Joker streak mensuel", included: false },
      { text: "Support prioritaire", included: false },
    ],
  },
  {
    name: "Premium",
    price: "2,99€",
    originalPrice: "4,99€",
    period: "/mois",
    yearlyPrice: "24,99€/an",
    yearlySavings: "Économisez 40%",
    description: "Pour les familles actives",
    highlight: true,
    badge: "Le plus populaire",
    cta: "Essai gratuit 14 jours",
    ctaLink: "/signup?plan=premium",
    features: [
      { text: "Enfants illimités", included: true, highlight: true },
      { text: "Commandes vocales illimitées", included: true, highlight: true },
      { text: "Historique complet", included: true },
      { text: "Tâches manuelles illimitées", included: true },
      { text: "Répartition charge mentale", included: true },
      { text: "Tâches automatiques par âge", included: true, highlight: true },
      { text: "Export PDF détaillé", included: true },
      { text: "1 Joker streak/mois", included: true },
      { text: "Support prioritaire 24h", included: true },
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gradient-to-b from-background via-secondary/20 to-background">
      <div className="container">
        <ScrollReveal animationType="cascade" distance={40}>
          <div className="text-center mb-16">
            <ScrollReveal animationType="spring" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors duration-200">
                <Sparkles className="w-4 h-4" />
                Tarifs simples
              </div>
            </ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choisissez votre <Highlight color="bg-primary/10" delay={0.3}>formule</Highlight>
            </h2>
            <BlurIn delay={0.2}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Commencez gratuitement, passez Premium quand vous êtes prêt.
                <br />
                <span className="text-primary font-medium">Aucune carte bancaire requise pour l&apos;essai.</span>
              </p>
            </BlurIn>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <SlideRotate key={plan.name} direction={index === 0 ? "left" : "right"} delay={0.1 + index * 0.15}>
              <PerspectiveReveal delay={0.2 + index * 0.1} axis="y">
              <div
                className={`relative rounded-3xl p-8 h-full flex flex-col ${
                  plan.highlight
                    ? "border-2 border-primary bg-gradient-to-br from-white to-primary/5 shadow-2xl shadow-primary/10"
                    : "border border-border bg-card"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/30">
                      <Crown className="w-4 h-4" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className={`text-center mb-8 ${plan.badge ? "pt-4" : ""}`}>
                  <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                    {plan.highlight && <Zap className="w-5 h-5 text-primary" />}
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-1">
                    {plan.originalPrice && (
                      <span className="text-lg line-through text-muted-foreground/60 mr-2">
                        {plan.originalPrice}
                      </span>
                    )}
                    <span className={`text-5xl font-bold ${plan.highlight ? "text-primary" : ""}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  {/* Yearly option */}
                  {plan.yearlyPrice && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground">ou {plan.yearlyPrice}</span>
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">
                        {plan.yearlySavings}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => {
                    const isHighlighted = "highlight" in feature && feature.highlight
                    return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 ${
                        isHighlighted ? "font-medium" : ""
                      } ${!feature.included ? "text-muted-foreground/60" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          feature.included
                            ? isHighlighted
                              ? "bg-primary text-white"
                              : "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground/40"
                        }`}
                      >
                        {feature.included ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </li>
                  )})}
                </ul>

                {/* CTA */}
                <Button
                  size="lg"
                  className={`w-full text-base transition-all duration-300 hover:scale-105 group ${
                    plan.highlight
                      ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 btn-shine btn-glow btn-glow-pulse btn-ripple"
                      : "bg-secondary hover:bg-secondary/80 magnetic-hover btn-hover-lift"
                  }`}
                  variant={plan.highlight ? "default" : "secondary"}
                  asChild
                >
                  <Link href={plan.ctaLink}>{plan.cta}</Link>
                </Button>
              </div>
              </PerspectiveReveal>
            </SlideRotate>
          ))}
        </div>

        {/* Trust badges */}
        <ScrollReveal delay={0.4} animationType="wave">
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              <Shield className="w-4 h-4 text-green-600 scale-bounce-hover" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              <Check className="w-4 h-4 text-green-600 scale-bounce-hover" />
              <span>Annulation à tout moment</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              <Sparkles className="w-4 h-4 text-green-600 scale-bounce-hover" />
              <span>Satisfait ou remboursé 30j</span>
            </div>
          </div>
        </ScrollReveal>

        {/* FAQ teaser */}
        <ScrollReveal delay={0.5} animationType="blur">
          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              Des questions ?{" "}
              <Link href="#faq" className="text-primary hover:underline font-medium underline-grow">
                Consultez notre FAQ
              </Link>{" "}
              ou{" "}
              <Link href="mailto:contact@familyload.app" className="text-primary hover:underline font-medium underline-grow">
                contactez-nous
              </Link>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
