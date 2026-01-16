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

type StructuredDataItem =
  | Organization
  | WebSite
  | WebApplication
  | SoftwareApplication
  | FAQPage
  | BreadcrumbList
  | WebPage

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
