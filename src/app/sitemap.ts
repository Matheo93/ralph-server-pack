import type { MetadataRoute } from "next"

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://familyload.fr"

/**
 * Sitemap dynamique pour FamilyLoad
 *
 * Pages incluses:
 * - Pages publiques (landing, auth)
 * - Pages légales (privacy, terms)
 *
 * Pages exclues (protégées):
 * - Dashboard et pages authentifiées
 * - Pages API
 * - Routes internes Next.js
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString()

  // Page d'accueil - priorité maximale
  const homePage: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
      // Note: les images sont automatiquement découvertes par Google
    },
  ]

  // Pages d'authentification - haute priorité pour conversion
  const authPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/signup`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]

  // Pages légales - obligatoires pour la conformité
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/privacy`,
      lastModified: "2026-01-15",
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: "2026-01-15",
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ]

  return [...homePage, ...authPages, ...legalPages]
}
