/**
 * SEO Structured Data (JSON-LD)
 *
 * Provides structured data schemas for search engines.
 * Supports Organization, SoftwareApplication, FAQPage, and BreadcrumbList.
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
    url: string
    width: number
    height: number
  }
  sameAs?: string[]
  contactPoint?: {
    "@type": "ContactPoint"
    email: string
    contactType: string
    availableLanguage: string[]
  }
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
  mainEntity: FAQItem[]
}

interface BreadcrumbItem {
  "@type": "ListItem"
  position: number
  name: string
  item?: string
}

interface BreadcrumbList {
  "@type": "BreadcrumbList"
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
  inLanguage: string
  datePublished?: string
  dateModified?: string
}

type StructuredDataItem =
  | Organization
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
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      // Add social media URLs when available
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@familyload.fr",
      contactType: "customer support",
      availableLanguage: ["French", "English"],
    },
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
  items: { name: string; url?: string }[]
): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
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
      question: "Comment fonctionne la commande vocale ?",
      answer:
        "Il vous suffit de parler naturellement. Notre IA comprend le contexte, identifie l'enfant concerné, la date et crée automatiquement la tâche.",
    },
    {
      question: "Combien de parents peuvent utiliser FamilyLoad ?",
      answer:
        "Vous pouvez inviter autant de co-parents que nécessaire. Chaque parent a son propre compte et peut voir, créer et compléter des tâches.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer:
        "FamilyLoad est hébergé en Europe et conforme au RGPD. Vos données sont chiffrées en transit et au repos.",
    },
    {
      question: "L'application fonctionne-t-elle hors connexion ?",
      answer:
        "Oui ! Vous pouvez consulter vos tâches même sans connexion internet. Les modifications sont synchronisées automatiquement.",
    },
    {
      question: "Puis-je annuler mon abonnement à tout moment ?",
      answer:
        "Oui, vous pouvez annuler à tout moment depuis les paramètres. Nous offrons un remboursement complet pendant les 30 premiers jours.",
    },
  ]

  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationSchema(),
      getSoftwareApplicationSchema(),
      getFAQPageSchema(faqs),
      getWebPageSchema(
        "FamilyLoad - Equilibrez la charge mentale parentale",
        "L'assistant de charge mentale familiale pour les parents. Créez des tâches à la voix, partagez-les entre co-parents.",
        "/"
      ),
    ],
  }
}

// =============================================================================
// RENDER HELPER
// =============================================================================

export function renderStructuredData(data: StructuredDataGraph): string {
  return JSON.stringify(data)
}
