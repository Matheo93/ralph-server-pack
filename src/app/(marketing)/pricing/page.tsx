import { Pricing, FAQ } from "@/components/marketing"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tarifs - FamilyLoad | Gratuit ou Premium",
  description: "Découvrez nos formules Gratuit et Premium. Commencez gratuitement avec 2 enfants et 5 commandes vocales par jour, ou passez Premium pour des fonctionnalités illimitées.",
  openGraph: {
    title: "Tarifs FamilyLoad - Gratuit ou Premium",
    description: "Commencez gratuitement, passez Premium quand vous êtes prêt. Essai gratuit 14 jours.",
  },
}

export default function PricingPage() {
  return (
    <main>
      {/* Hero section */}
      <section className="pt-20 pb-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Des tarifs adaptés à{" "}
            <span className="text-primary">votre famille</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            FamilyLoad s&apos;adapte à vos besoins. Commencez gratuitement et
            évoluez à votre rythme.
          </p>
        </div>
      </section>

      {/* Pricing component */}
      <Pricing />

      {/* Comparison table */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">
            Comparaison détaillée
          </h2>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-4 px-4 text-left font-semibold">Fonctionnalité</th>
                  <th className="py-4 px-4 text-center font-semibold">Gratuit</th>
                  <th className="py-4 px-4 text-center font-semibold text-primary">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">Nombre d&apos;enfants</td>
                  <td className="py-3 px-4 text-center">2 max</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">Illimité</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Commandes vocales</td>
                  <td className="py-3 px-4 text-center">5/jour</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">Illimité</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Historique</td>
                  <td className="py-3 px-4 text-center">7 jours</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">Complet</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Tâches manuelles</td>
                  <td className="py-3 px-4 text-center">✓ Illimité</td>
                  <td className="py-3 px-4 text-center">✓ Illimité</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Charge mentale</td>
                  <td className="py-3 px-4 text-center">✓</td>
                  <td className="py-3 px-4 text-center">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Tâches automatiques</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Export PDF</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Joker streak</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">1/mois</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Support</td>
                  <td className="py-3 px-4 text-center">Email</td>
                  <td className="py-3 px-4 text-center text-primary font-medium">Prioritaire 24h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />
    </main>
  )
}
