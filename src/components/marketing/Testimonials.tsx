"use client"

import { Star, Quote, Heart, Users, CheckCircle, Clock } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal"

const testimonials = [
  {
    name: "Sophie M.",
    role: "Maman de 2 enfants",
    avatar: "S",
    avatarBg: "bg-gradient-to-br from-pink-400 to-rose-500",
    borderColor: "border-pink-200",
    quote:
      "Depuis FamilyLoad, je n'ai plus cette boule au ventre en me demandant si j'ai oublié quelque chose. La commande vocale est un game-changer quand on a les mains dans le bain !",
    rating: 5,
    highlight: "Fini le stress",
  },
  {
    name: "Thomas R.",
    role: "Papa de 3 enfants",
    avatar: "T",
    avatarBg: "bg-gradient-to-br from-blue-400 to-indigo-500",
    borderColor: "border-blue-200",
    quote:
      "Je me suis rendu compte grâce à l'app que ma femme gérait 70% des tâches. Maintenant on est à 50/50 et on ne se dispute plus pour savoir qui fait quoi.",
    rating: 5,
    highlight: "Équilibre retrouvé",
  },
  {
    name: "Marie L.",
    role: "Famille recomposée",
    avatar: "M",
    avatarBg: "bg-gradient-to-br from-sky-400 to-teal-500",
    borderColor: "border-sky-200",
    quote:
      "Avec 4 enfants de 2 foyers différents, c'était le chaos. FamilyLoad nous permet de tout coordonner sans stress. Les templates automatiques sont géniaux !",
    rating: 5,
    highlight: "Organisation parfaite",
  },
]

const stats = [
  { value: "2,000+", label: "Familles actives", icon: Users, color: "text-primary" },
  { value: "50,000+", label: "Tâches créées", icon: CheckCircle, color: "text-green-500" },
  { value: "4.8/5", label: "Note moyenne", icon: Star, color: "text-amber-500" },
  { value: "30%", label: "Gain de temps", icon: Clock, color: "text-blue-500" },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-gradient-to-b from-accent/20 via-background to-accent/10">
      <div className="container">
        <ScrollReveal>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Heart className="w-4 h-4 fill-current" />
            Témoignages
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ils ont retrouvé leur sérénité
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez comment FamilyLoad a transformé le quotidien de ces familles.
          </p>
        </div>
        </ScrollReveal>

        <StaggerContainer stagger={0.15} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <StaggerItem key={index}>
            <div
              className={`relative p-6 rounded-2xl bg-white border-2 ${testimonial.borderColor} shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Quote icon */}
              <div className="absolute -top-3 -left-3">
                <div className={`w-10 h-10 rounded-xl ${testimonial.avatarBg} flex items-center justify-center shadow-lg`}>
                  <Quote className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Highlight badge */}
              <div className="flex justify-end mb-4">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {testimonial.highlight}
                </span>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-muted-foreground mb-6 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <div
                  className={`w-12 h-12 rounded-full ${testimonial.avatarBg} flex items-center justify-center shadow-md`}
                >
                  <span className="text-white font-bold text-lg">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Trust stats */}
        <ScrollReveal delay={0.2}>
        <div className="mt-20 py-10 px-8 rounded-3xl bg-gradient-to-r from-primary/5 via-accent/30 to-primary/5 border border-primary/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
