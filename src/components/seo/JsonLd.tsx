/**
 * JSON-LD Component for Structured Data
 *
 * Server component that renders JSON-LD structured data for SEO.
 */

import {
  getLandingPageStructuredData,
  renderStructuredData,
} from "@/lib/seo/structured-data"

export function JsonLd() {
  const structuredData = getLandingPageStructuredData()

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: renderStructuredData(structuredData),
      }}
    />
  )
}
