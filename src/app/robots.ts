import { MetadataRoute } from "next"

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] || "https://familyload.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Protected routes
          "/dashboard",
          "/tasks",
          "/children",
          "/charge",
          "/settings",
          "/onboarding",
          "/invite",
          "/callback",
          // API routes
          "/api/",
          // Static and generated files
          "/_next/",
          "/icons/",
        ],
      },
      {
        // Specific rules for search engines
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/dashboard",
          "/tasks",
          "/children",
          "/charge",
          "/settings",
          "/onboarding",
          "/invite",
          "/callback",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
