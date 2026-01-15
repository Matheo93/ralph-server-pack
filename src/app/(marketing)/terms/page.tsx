import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | FamilyLoad",
  description: "Consultez les conditions générales d'utilisation de FamilyLoad.",
}

export default function TermsPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Conditions Générales d&apos;Utilisation
        </h1>

        <p className="text-muted-foreground mb-8">
          Dernière mise à jour : 15 janvier 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et
              l&apos;utilisation de l&apos;application FamilyLoad, éditée par FamilyLoad SAS. En utilisant
              notre service, vous acceptez ces conditions dans leur intégralité.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              FamilyLoad est une application d&apos;organisation familiale assistée par intelligence
              artificielle. Elle permet aux utilisateurs de gérer leurs tâches quotidiennes,
              coordonner les activités familiales, et réduire leur charge mentale grâce à des
              suggestions intelligentes et des rappels automatisés.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Inscription et compte</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Pour utiliser FamilyLoad, vous devez :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Être âgé d&apos;au moins 18 ans ou avoir l&apos;autorisation d&apos;un représentant légal</li>
              <li>Fournir des informations exactes et à jour lors de l&apos;inscription</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée de votre compte</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Vous êtes responsable de toutes les activités effectuées sous votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Abonnements et paiements</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              FamilyLoad propose différentes formules d&apos;abonnement :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Gratuit :</strong> fonctionnalités de base avec limitations</li>
              <li><strong className="text-foreground">Premium :</strong> accès complet aux fonctionnalités, facturation mensuelle ou annuelle</li>
              <li><strong className="text-foreground">Famille :</strong> partage avec plusieurs membres, fonctionnalités avancées</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Les paiements sont traités de manière sécurisée via Stripe. Les prix sont indiqués
              TTC pour les utilisateurs français. Les abonnements se renouvellent automatiquement
              sauf annulation avant la date de renouvellement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Période d&apos;essai</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous offrons une période d&apos;essai gratuite de 14 jours pour les nouveaux utilisateurs.
              Aucun paiement n&apos;est requis pendant cette période. À la fin de l&apos;essai, votre
              abonnement sera automatiquement converti en formule payante, sauf annulation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Droit de rétractation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément à la législation française, vous disposez d&apos;un délai de 14 jours à
              compter de la souscription pour exercer votre droit de rétractation et obtenir un
              remboursement intégral. Ce droit s&apos;applique aux abonnements payants uniquement.
              Pour exercer ce droit, contactez-nous à support@familyload.app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Utilisation acceptable</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              En utilisant FamilyLoad, vous vous engagez à ne pas :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Utiliser le service à des fins illégales ou non autorisées</li>
              <li>Tenter de compromettre la sécurité ou l&apos;intégrité du service</li>
              <li>Collecter des données d&apos;autres utilisateurs sans leur consentement</li>
              <li>Transmettre des virus, malwares ou code malveillant</li>
              <li>Utiliser des robots, scrapers ou outils automatisés non autorisés</li>
              <li>Revendre ou redistribuer le service sans autorisation</li>
              <li>Publier du contenu illicite, diffamatoire ou portant atteinte aux droits de tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L&apos;application FamilyLoad, son code source, son design, ses fonctionnalités et son
              contenu sont la propriété exclusive de FamilyLoad SAS et sont protégés par les lois
              sur la propriété intellectuelle. Vous bénéficiez d&apos;une licence d&apos;utilisation
              personnelle, non exclusive et non transférable, limitée à l&apos;utilisation du service
              conformément à ces CGU.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contenu utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vous conservez la propriété des données et contenus que vous créez dans FamilyLoad.
              En utilisant notre service, vous nous accordez une licence limitée pour stocker,
              traiter et afficher votre contenu dans le seul but de fournir le service. Nous
              n&apos;utilisons pas votre contenu à des fins commerciales ou publicitaires.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disponibilité du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous nous efforçons de maintenir FamilyLoad disponible 24h/24, 7j/7. Cependant,
              nous ne pouvons garantir une disponibilité ininterrompue. Des interruptions peuvent
              survenir pour maintenance, mises à jour ou circonstances indépendantes de notre
              volonté. Nous vous informerons autant que possible des maintenances programmées.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              FamilyLoad est fourni &quot;tel quel&quot;. Dans les limites autorisées par la loi, nous
              déclinons toute responsabilité pour les dommages indirects, la perte de données ou
              les interruptions de service. Notre responsabilité totale est limitée au montant
              des sommes versées par l&apos;utilisateur au cours des 12 derniers mois.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Résiliation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vous pouvez résilier votre compte à tout moment depuis les paramètres de
              l&apos;application ou en nous contactant. Nous pouvons suspendre ou résilier votre
              accès en cas de :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violation des présentes CGU</li>
              <li>Non-paiement des sommes dues</li>
              <li>Comportement frauduleux ou abusif</li>
              <li>Demande d&apos;une autorité compétente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Modifications des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous pouvons modifier ces CGU à tout moment. Les modifications significatives vous
              seront notifiées par email ou via l&apos;application au moins 30 jours avant leur
              entrée en vigueur. Votre utilisation continue du service après cette date vaut
              acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont régies par le droit français. En cas de litige, une solution
              amiable sera recherchée avant toute action judiciaire. À défaut, les tribunaux de
              Paris seront seuls compétents. Les consommateurs peuvent également recourir à la
              médiation conformément à la réglementation en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question concernant ces Conditions Générales d&apos;Utilisation :
            </p>
            <ul className="list-none mt-4 space-y-1 text-muted-foreground">
              <li>Email : legal@familyload.app</li>
              <li>Adresse : FamilyLoad SAS, Paris, France</li>
            </ul>
          </section>

          <section className="border-t pt-8 mt-8">
            <p className="text-sm text-muted-foreground">
              En utilisant FamilyLoad, vous reconnaissez avoir lu, compris et accepté les présentes
              Conditions Générales d&apos;Utilisation.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
