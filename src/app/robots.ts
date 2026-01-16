import type { MetadataRoute } from "next"

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://familyload.fr"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/privacy", "/terms"],
        disallow: [
          // Routes protégées (authentification requise)
          "/dashboard",
          "/dashboard/*",
          "/tasks",
          "/tasks/*",
          "/children",
          "/children/*",
          "/charge",
          "/charge/*",
          "/settings",
          "/settings/*",
          "/onboarding",
          "/onboarding/*",
          "/invite",
          "/invite/*",
          "/callback",
          "/callback/*",
          // Routes API
          "/api/",
          "/api/*",
          // Fichiers système Next.js
          "/_next/",
          "/_next/*",
        ],
      },
      {
        // Règles spécifiques pour Googlebot (crawl optimisé)
        userAgent: "Googlebot",
        allow: ["/", "/login", "/signup", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/api/*",
          "/_next/",
          "/_next/*",
          "/dashboard",
          "/dashboard/*",
          "/tasks",
          "/tasks/*",
          "/children",
          "/children/*",
          "/charge",
          "/charge/*",
          "/settings",
          "/settings/*",
          "/onboarding",
          "/onboarding/*",
          "/invite",
          "/invite/*",
          "/callback",
          "/callback/*",
        ],
      },
      {
        // Règles pour Bingbot
        userAgent: "Bingbot",
        allow: ["/", "/login", "/signup", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/api/*",
          "/_next/",
          "/_next/*",
          "/dashboard",
          "/dashboard/*",
          "/tasks",
          "/tasks/*",
          "/children",
          "/children/*",
          "/charge",
          "/charge/*",
          "/settings",
          "/settings/*",
          "/onboarding",
          "/onboarding/*",
          "/invite",
          "/invite/*",
          "/callback",
          "/callback/*",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
