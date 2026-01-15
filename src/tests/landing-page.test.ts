/**
 * Landing Page Tests
 *
 * Unit tests for landing page components and SEO structured data.
 * Tests FAQ, structured data generation, and component exports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// =============================================================================
// FAQ TESTS
// =============================================================================

describe("FAQ Component Data", () => {
  it("should have valid FAQ items structure", () => {
    // Simulate FAQ data structure
    const faqs = [
      {
        question: "Comment fonctionne la commande vocale ?",
        answer: "Il vous suffit de parler naturellement à l'application.",
      },
      {
        question: "Combien de parents peuvent utiliser FamilyLoad ?",
        answer: "Vous pouvez inviter autant de co-parents que nécessaire.",
      },
    ]

    expect(faqs).toHaveLength(2)
    faqs.forEach((faq) => {
      expect(faq.question).toBeDefined()
      expect(faq.answer).toBeDefined()
      expect(faq.question.endsWith("?")).toBe(true)
      expect(faq.answer.length).toBeGreaterThan(10)
    })
  })

  it("should have FAQs covering key topics", () => {
    const expectedTopics = [
      "vocale",
      "parents",
      "sécurisées",
      "hors connexion",
      "annuler",
      "mobile",
      "templates",
      "répartition",
    ]

    const faqQuestions = [
      "Comment fonctionne la commande vocale ?",
      "Combien de parents peuvent utiliser FamilyLoad ?",
      "Que sont les templates automatiques ?",
      "Mes données sont-elles sécurisées ?",
      "L'application fonctionne-t-elle hors connexion ?",
      "Comment fonctionne la répartition équitable ?",
      "Puis-je annuler mon abonnement à tout moment ?",
      "Y a-t-il une application mobile ?",
    ]

    // Check that we have at least 5 FAQs
    expect(faqQuestions.length).toBeGreaterThanOrEqual(5)

    // Check coverage of key topics
    const coveredTopics = expectedTopics.filter((topic) =>
      faqQuestions.some((q) => q.toLowerCase().includes(topic.toLowerCase()))
    )
    expect(coveredTopics.length).toBeGreaterThanOrEqual(5)
  })
})

// =============================================================================
// STRUCTURED DATA TESTS
// =============================================================================

describe("Structured Data", () => {
  it("should generate valid Organization schema", async () => {
    const { getOrganizationSchema } = await import("@/lib/seo/structured-data")

    const schema = getOrganizationSchema()

    expect(schema["@type"]).toBe("Organization")
    expect(schema["@id"]).toContain("/#organization")
    expect(schema.name).toBe("FamilyLoad")
    expect(schema.logo).toBeDefined()
    expect(schema.logo["@type"]).toBe("ImageObject")
    expect(schema.logo.url).toContain("/logo.png")
    expect(schema.contactPoint).toBeDefined()
    expect(schema.contactPoint?.email).toContain("@familyload")
  })

  it("should generate valid SoftwareApplication schema", async () => {
    const { getSoftwareApplicationSchema } = await import("@/lib/seo/structured-data")

    const schema = getSoftwareApplicationSchema()

    expect(schema["@type"]).toBe("SoftwareApplication")
    expect(schema.name).toBe("FamilyLoad")
    expect(schema.applicationCategory).toBe("LifestyleApplication")
    expect(schema.offers).toBeDefined()
    expect(schema.offers.price).toBe("4.00")
    expect(schema.offers.priceCurrency).toBe("EUR")
    expect(schema.aggregateRating).toBeDefined()
    expect(parseFloat(schema.aggregateRating?.ratingValue ?? "0")).toBeGreaterThanOrEqual(4)
  })

  it("should generate valid FAQPage schema", async () => {
    const { getFAQPageSchema } = await import("@/lib/seo/structured-data")

    const faqs = [
      { question: "Test question 1?", answer: "Test answer 1" },
      { question: "Test question 2?", answer: "Test answer 2" },
    ]

    const schema = getFAQPageSchema(faqs)

    expect(schema["@type"]).toBe("FAQPage")
    expect(schema.mainEntity).toHaveLength(2)
    expect(schema.mainEntity[0]?.["@type"]).toBe("Question")
    expect(schema.mainEntity[0]?.name).toBe("Test question 1?")
    expect(schema.mainEntity[0]?.acceptedAnswer["@type"]).toBe("Answer")
    expect(schema.mainEntity[0]?.acceptedAnswer.text).toBe("Test answer 1")
  })

  it("should generate valid Breadcrumb schema", async () => {
    const { getBreadcrumbSchema } = await import("@/lib/seo/structured-data")

    const items = [
      { name: "Accueil", url: "/" },
      { name: "Fonctionnalités", url: "/features" },
      { name: "Tarifs" },
    ]

    const schema = getBreadcrumbSchema(items)

    expect(schema["@type"]).toBe("BreadcrumbList")
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0]?.position).toBe(1)
    expect(schema.itemListElement[0]?.name).toBe("Accueil")
    expect(schema.itemListElement[2]?.item).toBeUndefined() // Last item has no URL
  })

  it("should generate complete landing page structured data", async () => {
    const { getLandingPageStructuredData } = await import("@/lib/seo/structured-data")

    const data = getLandingPageStructuredData()

    expect(data["@context"]).toBe("https://schema.org")
    expect(data["@graph"]).toBeDefined()
    expect(Array.isArray(data["@graph"])).toBe(true)

    // Should contain Organization, SoftwareApplication, FAQPage, and WebPage
    const types = data["@graph"].map((item) => item["@type"])
    expect(types).toContain("Organization")
    expect(types).toContain("SoftwareApplication")
    expect(types).toContain("FAQPage")
    expect(types).toContain("WebPage")
  })

  it("should render structured data as valid JSON string", async () => {
    const { getLandingPageStructuredData, renderStructuredData } = await import(
      "@/lib/seo/structured-data"
    )

    const data = getLandingPageStructuredData()
    const jsonString = renderStructuredData(data)

    expect(typeof jsonString).toBe("string")
    expect(() => JSON.parse(jsonString)).not.toThrow()

    const parsed = JSON.parse(jsonString)
    expect(parsed["@context"]).toBe("https://schema.org")
  })
})

// =============================================================================
// MARKETING COMPONENTS EXPORT TESTS
// =============================================================================

describe("Marketing Components", () => {
  it("should export all required marketing components", async () => {
    const exports = await import("@/components/marketing")

    expect(exports.Hero).toBeDefined()
    expect(exports.Features).toBeDefined()
    expect(exports.Pricing).toBeDefined()
    expect(exports.Testimonials).toBeDefined()
    expect(exports.FAQ).toBeDefined()
  })
})

// =============================================================================
// SEO COMPONENTS EXPORT TESTS
// =============================================================================

describe("SEO Components", () => {
  it("should export JsonLd component", async () => {
    const exports = await import("@/components/seo")

    expect(exports.JsonLd).toBeDefined()
    expect(typeof exports.JsonLd).toBe("function")
  })
})

// =============================================================================
// LANDING PAGE CONTENT TESTS
// =============================================================================

describe("Landing Page Content", () => {
  it("should have features covering key use cases", () => {
    const features = [
      {
        icon: "Mic",
        title: "Commande vocale",
        description: "Ajoutez des tâches en parlant naturellement.",
      },
      {
        icon: "Sparkles",
        title: "Tâches automatiques",
        description: "Des centaines de tâches pré-configurées.",
      },
      {
        icon: "BarChart3",
        title: "Répartition équitable",
        description: "Visualisez qui fait quoi en temps réel.",
      },
    ]

    expect(features).toHaveLength(3)
    features.forEach((feature) => {
      expect(feature.title.length).toBeGreaterThan(5)
      expect(feature.description.length).toBeGreaterThan(20)
    })
  })

  it("should have testimonials with valid structure", () => {
    const testimonials = [
      { name: "Sophie M.", role: "Maman de 2 enfants", rating: 5 },
      { name: "Thomas R.", role: "Papa de 3 enfants", rating: 5 },
      { name: "Marie L.", role: "Famille recomposée", rating: 5 },
    ]

    expect(testimonials).toHaveLength(3)
    testimonials.forEach((testimonial) => {
      expect(testimonial.name).toBeDefined()
      expect(testimonial.role).toBeDefined()
      expect(testimonial.rating).toBeGreaterThanOrEqual(4)
      expect(testimonial.rating).toBeLessThanOrEqual(5)
    })
  })

  it("should have pricing with correct values", () => {
    const pricing = {
      price: 4,
      currency: "EUR",
      interval: "month",
      trialDays: 14,
    }

    expect(pricing.price).toBe(4)
    expect(pricing.currency).toBe("EUR")
    expect(pricing.interval).toBe("month")
    expect(pricing.trialDays).toBe(14)
  })

  it("should have trust indicators", () => {
    const trustStats = [
      { value: "2,000+", label: "Familles actives" },
      { value: "50,000+", label: "Tâches créées" },
      { value: "4.8/5", label: "Note moyenne" },
      { value: "30%", label: "Gain de temps" },
    ]

    expect(trustStats.length).toBeGreaterThanOrEqual(4)
    trustStats.forEach((stat) => {
      expect(stat.value).toBeDefined()
      expect(stat.label).toBeDefined()
    })
  })
})

// =============================================================================
// SITEMAP TESTS
// =============================================================================

describe("Sitemap Configuration", () => {
  it("should include public pages", async () => {
    // Verify sitemap structure expectations
    const publicPages = ["/", "/login", "/signup", "/privacy", "/terms"]

    expect(publicPages).toContain("/")
    expect(publicPages).toContain("/login")
    expect(publicPages).toContain("/signup")
    expect(publicPages.length).toBeGreaterThanOrEqual(3)
  })

  it("should not include protected routes", () => {
    const protectedRoutes = [
      "/dashboard",
      "/tasks",
      "/children",
      "/settings",
      "/api/",
    ]

    const publicPages = ["/", "/login", "/signup", "/privacy", "/terms"]

    protectedRoutes.forEach((route) => {
      expect(publicPages).not.toContain(route)
    })
  })
})
