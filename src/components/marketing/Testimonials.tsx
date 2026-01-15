import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sophie M.",
    role: "Maman de 2 enfants",
    avatar: "S",
    avatarBg: "bg-pink-500",
    quote:
      "Depuis FamilyLoad, je n'ai plus cette boule au ventre en me demandant si j'ai oublié quelque chose. La commande vocale est un game-changer quand on a les mains dans le bain !",
    rating: 5,
  },
  {
    name: "Thomas R.",
    role: "Papa de 3 enfants",
    avatar: "T",
    avatarBg: "bg-blue-500",
    quote:
      "Je me suis rendu compte grâce à l'app que ma femme gérait 70% des tâches. Maintenant on est à 50/50 et on ne se dispute plus pour savoir qui fait quoi.",
    rating: 5,
  },
  {
    name: "Marie L.",
    role: "Famille recomposée",
    avatar: "M",
    avatarBg: "bg-purple-500",
    quote:
      "Avec 4 enfants de 2 foyers différents, c'était le chaos. FamilyLoad nous permet de tout coordonner sans stress. Les templates automatiques sont géniaux !",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ils ont retrouvé leur sérénité
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez comment FamilyLoad a transformé le quotidien de ces familles.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl bg-background border shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-muted-foreground mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${testimonial.avatarBg} flex items-center justify-center`}
                >
                  <span className="text-white font-semibold">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
          {[
            { value: "2,000+", label: "Familles actives" },
            { value: "50,000+", label: "Tâches créées" },
            { value: "4.8/5", label: "Note moyenne" },
            { value: "30%", label: "Gain de temps" },
          ].map((stat, index) => (
            <div key={index}>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
