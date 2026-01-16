import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Politique de confidentialité de FamilyLoad. Découvrez comment nous protégeons vos données personnelles et celles de votre famille. Conformité RGPD, chiffrement des données, droits d'accès.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Politique de Confidentialité - FamilyLoad",
    description: "Comment FamilyLoad protège la vie privée de votre famille. Conformité RGPD et sécurité des données.",
    type: "website",
    url: "/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Politique de Confidentialité
        </h1>

        <p className="text-muted-foreground mb-8">
          Dernière mise à jour : 15 janvier 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              FamilyLoad (&quot;nous&quot;, &quot;notre&quot;, &quot;nos&quot;) s&apos;engage à protéger la vie privée
              de ses utilisateurs. Cette politique de confidentialité explique comment nous collectons,
              utilisons, stockons et protégeons vos informations personnelles lorsque vous utilisez
              notre application et nos services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nous collectons les types de données suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Informations de compte :</strong> nom, adresse email,
                mot de passe chiffré
              </li>
              <li>
                <strong className="text-foreground">Données familiales :</strong> informations sur les membres
                de votre famille que vous choisissez de partager (prénoms, dates importantes, préférences)
              </li>
              <li>
                <strong className="text-foreground">Données d&apos;utilisation :</strong> tâches créées, listes,
                rappels, et interactions avec l&apos;application
              </li>
              <li>
                <strong className="text-foreground">Données techniques :</strong> adresse IP, type de navigateur,
                appareil utilisé, pour améliorer nos services
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Utilisation des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir et personnaliser nos services</li>
              <li>Générer des suggestions intelligentes via notre IA</li>
              <li>Envoyer des rappels et notifications que vous avez configurés</li>
              <li>Améliorer et développer de nouvelles fonctionnalités</li>
              <li>Assurer la sécurité de votre compte</li>
              <li>Communiquer avec vous concernant votre compte ou nos services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Intelligence Artificielle</h2>
            <p className="text-muted-foreground leading-relaxed">
              FamilyLoad utilise l&apos;intelligence artificielle pour vous aider à organiser votre vie
              familiale. Vos données sont traitées de manière sécurisée et ne sont jamais utilisées
              pour entraîner des modèles d&apos;IA tiers. Les suggestions générées par l&apos;IA sont basées
              uniquement sur vos propres données et préférences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Partage des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données
              uniquement dans les cas suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Avec les membres de votre famille que vous avez invités sur l&apos;application</li>
              <li>Avec nos prestataires techniques (hébergement, paiement) sous contrat de confidentialité</li>
              <li>Si requis par la loi ou une autorité judiciaire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Sécurité des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous mettons en oeuvre des mesures de sécurité techniques et organisationnelles
              robustes : chiffrement des données en transit (TLS) et au repos, authentification
              sécurisée, contrôles d&apos;accès stricts, et audits de sécurité réguliers. Vos mots
              de passe sont hashés et ne sont jamais stockés en clair.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Conservation des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous conservons vos données tant que votre compte est actif. Après suppression de
              votre compte, vos données personnelles sont supprimées dans un délai de 30 jours,
              sauf obligation légale de conservation. Les sauvegardes sont purgées selon notre
              cycle de rétention de 90 jours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Vos droits (RGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
              des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
              <li><strong className="text-foreground">Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong className="text-foreground">Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
              <li><strong className="text-foreground">Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong className="text-foreground">Droit d&apos;opposition :</strong> vous opposer à certains traitements</li>
              <li><strong className="text-foreground">Droit à la limitation :</strong> limiter le traitement de vos données</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : privacy@familyload.app
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous utilisons des cookies essentiels pour le fonctionnement de l&apos;application
              (authentification, préférences). Nous n&apos;utilisons pas de cookies publicitaires
              ou de tracking tiers. Vous pouvez gérer vos préférences de cookies dans les
              paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous pouvons mettre à jour cette politique de confidentialité. En cas de modification
              significative, nous vous en informerons par email ou via l&apos;application. La date de
              dernière mise à jour est indiquée en haut de ce document.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant cette politique de confidentialité ou vos données
              personnelles, contactez notre Délégué à la Protection des Données :
            </p>
            <ul className="list-none mt-4 space-y-1 text-muted-foreground">
              <li>Email : privacy@familyload.app</li>
              <li>Adresse : FamilyLoad SAS, Paris, France</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
