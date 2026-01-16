"use client"

import { Mic, Sparkles, BarChart3, Bell, Clock, Users, Zap, Shield, Heart } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal"

const features = [
  {
    icon: Mic,
    title: "Commande vocale",
    description:
      "Ajoutez des tâches en parlant naturellement. Notre IA comprend le contexte, extrait les informations clés et crée automatiquement la tâche.",
    color: "bg-primary/10 text-primary",
    borderColor: "border-primary/20",
  },
  {
    icon: Sparkles,
    title: "Tâches automatiques",
    description:
      "Des centaines de tâches parentales pré-configurées selon l'âge de vos enfants et la période de l'année. Plus besoin d'y penser !",
    color: "bg-amber-100 text-amber-600",
    borderColor: "border-amber-200",
  },
  {
    icon: BarChart3,
    title: "Répartition équitable",
    description:
      "Visualisez qui fait quoi en temps réel. L'assignation automatique équilibre la charge mentale entre les parents.",
    color: "bg-blue-100 text-blue-600",
    borderColor: "border-blue-200",
  },
]

const additionalFeatures = [
  { icon: Bell, label: "Rappels intelligents", color: "text-primary" },
  { icon: Clock, label: "Historique des tâches par enfant", color: "text-amber-500" },
  { icon: Zap, label: "Gamification avec streaks", color: "text-green-500" },
  { icon: Users, label: "Partage entre co-parents", color: "text-blue-500" },
  { icon: Shield, label: "Templates personnalisables", color: "text-purple-500" },
  { icon: Heart, label: "Mode hors-ligne", color: "text-rose-500" },
]

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-gradient-to-b from-background via-accent/10 to-background">
      <div className="container">
        <ScrollReveal>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Fonctionnalités
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            FamilyLoad automatise la gestion des tâches parentales pour vous permettre
            de profiter pleinement de votre vie de famille.
          </p>
        </div>
        </ScrollReveal>

        <StaggerContainer stagger={0.15} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <StaggerItem key={index}>
            <div
              className={`relative p-6 rounded-2xl bg-white border-2 ${feature.borderColor} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5`}>
                <feature.icon className="h-7 w-7" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

              {/* Decorative corner */}
              <div className={`absolute top-0 right-0 w-20 h-20 ${feature.color.replace('text-', 'bg-').split(' ')[0]} opacity-5 rounded-bl-full`} />
            </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Additional features list */}
        <ScrollReveal delay={0.2}>
        <div className="mt-20 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-center mb-8">
            Et aussi...
          </h3>
          <StaggerContainer stagger={0.08} className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {additionalFeatures.map((feature, index) => (
              <StaggerItem key={index}>
              <div
                className="flex items-center gap-4 p-4 rounded-xl bg-white border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        </ScrollReveal>

        {/* USP highlight - Charge mentale */}
        <ScrollReveal scale delay={0.1}>
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 md:p-12">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <pattern id="feature-dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="currentColor"/>
                </pattern>
                <rect fill="url(#feature-dots)" width="100" height="100"/>
              </svg>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 md:w-12 md:h-12" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-3">
                  Notre avantage unique : la Charge Mentale
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Aucun concurrent ne propose cette fonctionnalité ! Visualisez la répartition
                  réelle des tâches, identifiez les déséquilibres et retrouvez l&apos;harmonie
                  dans votre couple grâce à des données objectives.
                </p>
              </div>
            </div>

            {/* Decorative shapes */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/5" />
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
