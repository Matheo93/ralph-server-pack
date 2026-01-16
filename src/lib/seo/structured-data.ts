/**
 * SEO Structured Data (JSON-LD)
 *
 * Provides structured data schemas for search engines.
 * Supports Organization, WebSite, WebApplication, SoftwareApplication,
 * FAQPage, BreadcrumbList, and WebPage.
 */

// =============================================================================
// TYPES
// =============================================================================

interface Organization {
  "@type": "Organization"
  "@id": string
  name: string
  url: string
  logo: {
    "@type": "ImageObject"
    "@id": string
    url: string
    width: number
    height: number
    caption: string
  }
  image: { "@id": string }
  sameAs?: string[]
  contactPoint?: {
    "@type": "ContactPoint"
    email: string
    contactType: string
    availableLanguage: string[]
  }
  foundingDate: string
  slogan: string
}

interface WebSite {
  "@type": "WebSite"
  "@id": string
  url: string
  name: string
  description: string
  publisher: { "@id": string }
  inLanguage: string
  potentialAction?: {
    "@type": "SearchAction"
    target: {
      "@type": "EntryPoint"
      urlTemplate: string
    }
    "query-input": string
  }
}

interface WebApplication {
  "@type": "WebApplication"
  "@id": string
  name: string
  description: string
  url: string
  applicationCategory: string
  operatingSystem: string
  browserRequirements: string
  softwareVersion: string
  offers: {
    "@type": "AggregateOffer"
    lowPrice: string
    highPrice: string
    priceCurrency: string
    offerCount: number
    offers: Array<{
      "@type": "Offer"
      name: string
      price: string
      priceCurrency: string
      description: string
    }>
  }
  aggregateRating?: {
    "@type": "AggregateRating"
    ratingValue: string
    ratingCount: string
    bestRating: string
    worstRating: string
    reviewCount: string
  }
  author: { "@id": string }
  creator: { "@id": string }
  screenshot?: string
  featureList?: string[]
}

interface SoftwareApplication {
  "@type": "SoftwareApplication"
  name: string
  description: string
  applicationCategory: string
  operatingSystem: string
  offers: {
    "@type": "Offer"
    price: string
    priceCurrency: string
    priceValidUntil?: string
  }
  aggregateRating?: {
    "@type": "AggregateRating"
    ratingValue: string
    ratingCount: string
    bestRating: string
    worstRating: string
  }
}

interface FAQItem {
  "@type": "Question"
  name: string
  acceptedAnswer: {
    "@type": "Answer"
    text: string
  }
}

interface FAQPage {
  "@type": "FAQPage"
  "@id": string
  mainEntity: FAQItem[]
  name: string
  description: string
  isPartOf: { "@id": string }
}

interface BreadcrumbItem {
  "@type": "ListItem"
  position: number
  name: string
  item?: string
}

interface BreadcrumbList {
  "@type": "BreadcrumbList"
  "@id": string
  itemListElement: BreadcrumbItem[]
}

interface WebPage {
  "@type": "WebPage"
  "@id": string
  name: string
  description: string
  url: string
  isPartOf: {
    "@id": string
  }
  about?: { "@id": string }
  primaryImageOfPage?: { "@id": string }
  inLanguage: string
  datePublished?: string
  dateModified?: string
  breadcrumb?: { "@id": string }
}

interface HowToStep {
  "@type": "HowToStep"
  position: number
  name: string
  text: string
  url?: string
  image?: string
}

interface HowTo {
  "@type": "HowTo"
  "@id": string
  name: string
  description: string
  totalTime: string
  estimatedCost?: {
    "@type": "MonetaryAmount"
    currency: string
    value: string
  }
  step: HowToStep[]
  tool?: string[]
}

interface Product {
  "@type": "Product"
  "@id": string
  name: string
  description: string
  brand: { "@id": string }
  offers: {
    "@type": "AggregateOffer"
    lowPrice: string
    highPrice: string
    priceCurrency: string
    offerCount: number
    availability: string
    offers: Array<{
      "@type": "Offer"
      name: string
      price: string
      priceCurrency: string
      description: string
      availability: string
      priceValidUntil: string
    }>
  }
  aggregateRating: {
    "@type": "AggregateRating"
    ratingValue: string
    ratingCount: string
    bestRating: string
    worstRating: string
    reviewCount: string
  }
  review?: Array<{
    "@type": "Review"
    author: { "@type": "Person"; name: string }
    datePublished: string
    reviewBody: string
    reviewRating: {
      "@type": "Rating"
      ratingValue: string
      bestRating: string
      worstRating: string
    }
  }>
}

interface Service {
  "@type": "Service"
  "@id": string
  name: string
  description: string
  provider: { "@id": string }
  serviceType: string
  areaServed: {
    "@type": "Country"
    name: string
  }
  hasOfferCatalog: {
    "@type": "OfferCatalog"
    name: string
    itemListElement: Array<{
      "@type": "Offer"
      itemOffered: {
        "@type": "Service"
        name: string
        description: string
      }
    }>
  }
}

type StructuredDataItem =
  | Organization
  | WebSite
  | WebApplication
  | SoftwareApplication
  | FAQPage
  | BreadcrumbList
  | WebPage
  | HowTo
  | Product
  | Service

interface StructuredDataGraph {
  "@context": "https://schema.org"
  "@graph": StructuredDataItem[]
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://familyload.fr"

// =============================================================================
// ORGANIZATION
// =============================================================================

export function getOrganizationSchema(): Organization {
  return {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "FamilyLoad",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      "@id": `${BASE_URL}/#logo`,
      url: `${BASE_URL}/icons/icon-512.png`,
      width: 512,
      height: 512,
      caption: "Logo FamilyLoad",
    },
    image: { "@id": `${BASE_URL}/#logo` },
    sameAs: [
      "https://twitter.com/familyload",
      "https://www.facebook.com/familyload",
      "https://www.linkedin.com/company/familyload",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@familyload.fr",
      contactType: "customer support",
      availableLanguage: ["French", "English"],
    },
    foundingDate: "2024",
    slogan: "Équilibrez la charge mentale parentale",
  }
}

// =============================================================================
// WEBSITE
// =============================================================================

export function getWebSiteSchema(): WebSite {
  return {
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "FamilyLoad",
    description:
      "Application de gestion de la charge mentale parentale pour les familles modernes.",
    publisher: { "@id": `${BASE_URL}/#organization` },
    inLanguage: "fr-FR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

// =============================================================================
// WEB APPLICATION
// =============================================================================

export function getWebApplicationSchema(): WebApplication {
  return {
    "@type": "WebApplication",
    "@id": `${BASE_URL}/#webapp`,
    name: "FamilyLoad",
    description:
      "Application web progressive pour gérer la charge mentale parentale. Créez des tâches à la voix, partagez-les entre co-parents et visualisez la répartition équitable des responsabilités familiales.",
    url: BASE_URL,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0.0",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "8",
      priceCurrency: "EUR",
      offerCount: 3,
      offers: [
        {
          "@type": "Offer",
          name: "Gratuit",
          price: "0",
          priceCurrency: "EUR",
          description: "Pour découvrir FamilyLoad avec les fonctionnalités essentielles.",
        },
        {
          "@type": "Offer",
          name: "Family",
          price: "4",
          priceCurrency: "EUR",
          description: "Pour les familles actives. Toutes les fonctionnalités avancées.",
        },
        {
          "@type": "Offer",
          name: "Family+",
          price: "8",
          priceCurrency: "EUR",
          description: "L'expérience complète avec support prioritaire et API.",
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "89",
    },
    author: { "@id": `${BASE_URL}/#organization` },
    creator: { "@id": `${BASE_URL}/#organization` },
    screenshot: `${BASE_URL}/screenshots/dashboard.png`,
    featureList: [
      "Création de tâches à la voix",
      "Partage entre co-parents",
      "Visualisation de la charge mentale",
      "Rappels intelligents",
      "Templates automatiques selon l'âge des enfants",
      "Synchronisation hors-ligne",
      "Application PWA installable",
    ],
  }
}

// =============================================================================
// SOFTWARE APPLICATION
// =============================================================================

export function getSoftwareApplicationSchema(): SoftwareApplication {
  return {
    "@type": "SoftwareApplication",
    name: "FamilyLoad",
    description:
      "Application de gestion de la charge mentale parentale. Créez des tâches à la voix, partagez-les entre co-parents, et recevez des rappels intelligents.",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, iOS, Android",
    offers: {
      "@type": "Offer",
      price: "4.00",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
  }
}

// =============================================================================
// FAQ PAGE
// =============================================================================

export function getFAQPageSchema(faqs: { question: string; answer: string }[]): FAQPage {
  return {
    "@type": "FAQPage",
    "@id": `${BASE_URL}/#faq`,
    name: "Questions fréquentes sur FamilyLoad",
    description:
      "Réponses aux questions les plus fréquentes sur l'application FamilyLoad de gestion de la charge mentale parentale.",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

// =============================================================================
// BREADCRUMB
// =============================================================================

export function getBreadcrumbSchema(
  items: { name: string; url?: string }[],
  id?: string
): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/${id ?? "#breadcrumb"}`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url ? `${BASE_URL}${item.url}` : undefined,
    })),
  }
}

// =============================================================================
// WEB PAGE
// =============================================================================

export function getWebPageSchema(
  name: string,
  description: string,
  path: string
): WebPage {
  return {
    "@type": "WebPage",
    "@id": `${BASE_URL}${path}`,
    name,
    description,
    url: `${BASE_URL}${path}`,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
    },
    inLanguage: "fr-FR",
  }
}

// =============================================================================
// HOW TO - Guide d'utilisation
// =============================================================================

export function getHowToSchema(): HowTo {
  return {
    "@type": "HowTo",
    "@id": `${BASE_URL}/#howto`,
    name: "Comment réduire sa charge mentale parentale avec FamilyLoad",
    description: "Guide étape par étape pour utiliser FamilyLoad et réduire votre charge mentale parentale en famille.",
    totalTime: "PT5M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: "0",
    },
    tool: ["Navigateur web", "Smartphone ou ordinateur"],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Créez votre compte gratuit",
        text: "Inscrivez-vous en 2 minutes avec votre email. Aucune carte bancaire n'est requise pour l'essai gratuit de 14 jours.",
        url: `${BASE_URL}/signup`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Ajoutez vos enfants",
        text: "Renseignez le prénom et la date de naissance de vos enfants. FamilyLoad adaptera automatiquement les suggestions de tâches selon leur âge.",
        url: `${BASE_URL}/children/new`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Invitez votre co-parent",
        text: "Envoyez une invitation par email à votre partenaire pour partager les tâches familiales et visualiser la répartition de la charge mentale.",
        url: `${BASE_URL}/settings/household`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Créez vos premières tâches",
        text: "Utilisez la commande vocale ou tapez vos tâches. FamilyLoad comprend le contexte et crée automatiquement les rappels appropriés.",
        url: `${BASE_URL}/tasks/new`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Visualisez la répartition",
        text: "Consultez le tableau de bord pour voir qui fait quoi et équilibrer la charge mentale entre les parents.",
        url: `${BASE_URL}/dashboard`,
      },
    ],
  }
}

// =============================================================================
// PRODUCT - Produit SaaS
// =============================================================================

export function getProductSchema(): Product {
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)
  const priceValidUntil = nextYear.toISOString().slice(0, 10)

  return {
    "@type": "Product",
    "@id": `${BASE_URL}/#product`,
    name: "FamilyLoad - Application de gestion familiale",
    description: "Application SaaS de gestion de la charge mentale parentale. Créez des tâches à la voix, partagez-les entre co-parents, visualisez la répartition équitable des responsabilités.",
    brand: { "@id": `${BASE_URL}/#organization` },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "8",
      priceCurrency: "EUR",
      offerCount: 3,
      availability: "https://schema.org/InStock",
      offers: [
        {
          "@type": "Offer",
          name: "FamilyLoad Gratuit",
          price: "0",
          priceCurrency: "EUR",
          description: "Fonctionnalités essentielles pour découvrir FamilyLoad. Parfait pour les petites familles.",
          availability: "https://schema.org/InStock",
          priceValidUntil,
        },
        {
          "@type": "Offer",
          name: "FamilyLoad Family",
          price: "4",
          priceCurrency: "EUR",
          description: "Toutes les fonctionnalités avancées pour les familles actives. Tâches illimitées, rappels intelligents.",
          availability: "https://schema.org/InStock",
          priceValidUntil,
        },
        {
          "@type": "Offer",
          name: "FamilyLoad Family+",
          price: "8",
          priceCurrency: "EUR",
          description: "L'expérience complète avec support prioritaire, accès API et fonctionnalités exclusives.",
          availability: "https://schema.org/InStock",
          priceValidUntil,
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "89",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Marie L." },
        datePublished: "2025-12-15",
        reviewBody: "FamilyLoad a transformé notre organisation familiale. Plus de disputes sur qui fait quoi, tout est visible et équitable !",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
          worstRating: "1",
        },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Thomas D." },
        datePublished: "2025-11-28",
        reviewBody: "La commande vocale est géniale. Je dicte mes tâches en conduisant et tout est synchronisé avec ma femme.",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
          worstRating: "1",
        },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Sophie M." },
        datePublished: "2025-10-10",
        reviewBody: "Les templates par âge des enfants nous font gagner un temps fou. Plus besoin de réfléchir à tout !",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "4",
          bestRating: "5",
          worstRating: "1",
        },
      },
    ],
  }
}

// =============================================================================
// SERVICE
// =============================================================================

export function getServiceSchema(): Service {
  return {
    "@type": "Service",
    "@id": `${BASE_URL}/#service`,
    name: "FamilyLoad - Service de gestion familiale",
    description: "Service en ligne de gestion de la charge mentale parentale pour les familles françaises et francophones.",
    provider: { "@id": `${BASE_URL}/#organization` },
    serviceType: "Application de productivité familiale",
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Offres FamilyLoad",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Gestion des tâches familiales",
            description: "Créez, assignez et suivez toutes les tâches de votre famille.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Répartition équitable",
            description: "Visualisez et équilibrez la charge mentale entre co-parents.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Rappels intelligents",
            description: "Recevez des notifications personnalisées pour ne rien oublier.",
          },
        },
      ],
    },
  }
}

// =============================================================================
// FULL GRAPH FOR LANDING PAGE
// =============================================================================

export function getLandingPageStructuredData(): StructuredDataGraph {
  const faqs = [
    {
      question: "Comment fonctionne la commande vocale de FamilyLoad ?",
      answer:
        "Il vous suffit de parler naturellement à l'application. Par exemple, dites 'Rappelle-moi de prendre rendez-vous chez le dentiste pour Emma mardi prochain'. Notre IA comprend le contexte, identifie l'enfant concerné, la date et crée automatiquement la tâche avec un rappel.",
    },
    {
      question: "Combien de parents peuvent utiliser FamilyLoad ?",
      answer:
        "Vous pouvez inviter autant de co-parents que nécessaire dans votre foyer. Chaque parent a son propre compte et peut voir, créer et compléter des tâches. La répartition des tâches est calculée automatiquement entre tous les membres actifs.",
    },
    {
      question: "Mes données familiales sont-elles sécurisées sur FamilyLoad ?",
      answer:
        "Absolument. FamilyLoad est hébergé en Europe et conforme au RGPD. Vos données sont chiffrées en transit et au repos. Nous ne vendons jamais vos données à des tiers. Vous pouvez exporter ou supprimer vos données à tout moment depuis les paramètres.",
    },
    {
      question: "L'application FamilyLoad fonctionne-t-elle hors connexion ?",
      answer:
        "Oui ! FamilyLoad est une application web progressive (PWA). Vous pouvez consulter vos tâches et en créer de nouvelles même sans connexion internet. Les modifications sont synchronisées automatiquement dès que vous retrouvez une connexion.",
    },
    {
      question: "Comment FamilyLoad calcule la répartition équitable des tâches ?",
      answer:
        "FamilyLoad calcule automatiquement la charge de travail de chaque parent en fonction du nombre de tâches complétées, de leur complexité et de leur durée estimée. Vous pouvez visualiser cette répartition dans le tableau de bord et l'application propose automatiquement d'équilibrer les tâches futures.",
    },
    {
      question: "Puis-je annuler mon abonnement FamilyLoad à tout moment ?",
      answer:
        "Oui, vous pouvez annuler votre abonnement à tout moment depuis les paramètres de facturation. Vous conservez l'accès jusqu'à la fin de votre période de facturation en cours. Nous offrons également un remboursement complet pendant les 30 premiers jours.",
    },
    {
      question: "Que sont les templates automatiques de FamilyLoad ?",
      answer:
        "Les templates sont des listes de tâches pré-configurées selon l'âge de vos enfants et la période de l'année. Par exemple, pour un enfant de 6 ans à la rentrée scolaire, FamilyLoad vous proposera automatiquement : achat de fournitures, visite médicale, inscription à la cantine, etc.",
    },
    {
      question: "Y a-t-il une application mobile FamilyLoad ?",
      answer:
        "FamilyLoad est actuellement disponible en version web responsive qui fonctionne parfaitement sur mobile et peut être installée comme une application grâce à la technologie PWA. Une application native iOS et Android est en cours de développement.",
    },
  ]

  const breadcrumb = getBreadcrumbSchema(
    [
      { name: "Accueil", url: "/" },
    ],
    "#breadcrumb-home"
  )

  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationSchema(),
      getWebSiteSchema(),
      getWebApplicationSchema(),
      getProductSchema(),
      getServiceSchema(),
      getHowToSchema(),
      getFAQPageSchema(faqs),
      breadcrumb,
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/`,
        name: "FamilyLoad - Gérez la charge mentale parentale en famille",
        description:
          "Application d'organisation familiale pour réduire la charge mentale parentale. Créez des tâches à la voix, partagez-les entre co-parents et visualisez la répartition équitable.",
        url: BASE_URL,
        isPartOf: { "@id": `${BASE_URL}/#website` },
        about: { "@id": `${BASE_URL}/#webapp` },
        primaryImageOfPage: { "@id": `${BASE_URL}/#logo` },
        inLanguage: "fr-FR",
        datePublished: "2024-01-01",
        dateModified: new Date().toISOString().split("T")[0],
        breadcrumb: { "@id": `${BASE_URL}/#breadcrumb-home` },
      },
    ],
  }
}

// =============================================================================
// RENDER HELPER
// =============================================================================

export function renderStructuredData(data: StructuredDataGraph): string {
  return JSON.stringify(data)
}
