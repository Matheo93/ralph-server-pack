import { Mic, Sparkles, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Mic,
    title: "Commande vocale",
    description:
      "Ajoutez des tâches en parlant naturellement. Notre IA comprend le contexte, extrait les informations clés et crée automatiquement la tâche.",
  },
  {
    icon: Sparkles,
    title: "Tâches automatiques",
    description:
      "Des centaines de tâches parentales pré-configurées selon l'âge de vos enfants et la période de l'année. Plus besoin d'y penser !",
  },
  {
    icon: BarChart3,
    title: "Répartition équitable",
    description:
      "Visualisez qui fait quoi en temps réel. L'assignation automatique équilibre la charge mentale entre les parents.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            FamilyLoad automatise la gestion des tâches parentales pour vous permettre
            de profiter pleinement de votre vie de famille.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Additional features list */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-center mb-8">
            Et aussi...
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Rappels intelligents",
              "Historique des tâches par enfant",
              "Gamification avec streaks",
              "Partage entre co-parents",
              "Templates personnalisables",
              "Mode hors-ligne",
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-background border"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
