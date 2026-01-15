/**
 * FAQ Section Component
 *
 * Displays frequently asked questions with accordion-style answers.
 * Uses Radix UI accordion for accessibility.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "Comment fonctionne la commande vocale ?",
    answer:
      "Il vous suffit de parler naturellement à l'application. Par exemple, dites \"Rappelle-moi de prendre rendez-vous chez le dentiste pour Emma mardi prochain\". Notre IA comprend le contexte, identifie l'enfant concerné, la date et crée automatiquement la tâche avec un rappel.",
  },
  {
    question: "Combien de parents peuvent utiliser FamilyLoad ?",
    answer:
      "Vous pouvez inviter autant de co-parents que nécessaire dans votre foyer. Chaque parent a son propre compte et peut voir, créer et compléter des tâches. La répartition des tâches est calculée automatiquement entre tous les membres actifs.",
  },
  {
    question: "Que sont les templates automatiques ?",
    answer:
      "Les templates sont des listes de tâches pré-configurées selon l'âge de vos enfants et la période de l'année. Par exemple, pour un enfant de 6 ans à la rentrée scolaire, FamilyLoad vous proposera automatiquement : achat de fournitures, visite médicale, inscription à la cantine, etc.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Absolument. FamilyLoad est hébergé en Europe et conforme au RGPD. Vos données sont chiffrées en transit et au repos. Nous ne vendons jamais vos données à des tiers. Vous pouvez exporter ou supprimer vos données à tout moment depuis les paramètres.",
  },
  {
    question: "L'application fonctionne-t-elle hors connexion ?",
    answer:
      "Oui ! Vous pouvez consulter vos tâches et en créer de nouvelles même sans connexion internet. Les modifications sont synchronisées automatiquement dès que vous retrouvez une connexion.",
  },
  {
    question: "Comment fonctionne la répartition équitable ?",
    answer:
      "FamilyLoad calcule automatiquement la charge de travail de chaque parent en fonction du nombre de tâches complétées, de leur complexité et de leur durée estimée. Vous pouvez visualiser cette répartition dans le tableau de bord et l'application propose automatiquement d'équilibrer les tâches futures.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer:
      "Oui, vous pouvez annuler votre abonnement à tout moment depuis les paramètres de facturation. Vous conservez l'accès jusqu'à la fin de votre période de facturation en cours. Nous offrons également un remboursement complet pendant les 30 premiers jours.",
  },
  {
    question: "Y a-t-il une application mobile ?",
    answer:
      "FamilyLoad est actuellement disponible en version web responsive qui fonctionne parfaitement sur mobile. Une application native iOS et Android est en cours de développement et sera disponible prochainement pour les abonnés.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur FamilyLoad.
            Vous ne trouvez pas la réponse ? Contactez-nous.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Vous avez d&apos;autres questions ?
          </p>
          <a
            href="mailto:support@familyload.fr"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            Contactez notre équipe
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
