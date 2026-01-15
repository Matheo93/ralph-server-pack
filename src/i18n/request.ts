import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

export const locales = ["fr", "en"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "fr"

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies()
  let locale = cookieStore.get("locale")?.value as Locale | undefined

  // If no cookie, check Accept-Language header
  if (!locale || !locales.includes(locale)) {
    const headersList = await headers()
    const acceptLanguage = headersList.get("accept-language")
    if (acceptLanguage) {
      const preferredLocales = acceptLanguage
        .split(",")
        .map((lang) => {
          const [loc] = lang.trim().split(";")
          return loc?.split("-")[0]?.toLowerCase()
        })

      for (const preferred of preferredLocales) {
        if (preferred && locales.includes(preferred as Locale)) {
          locale = preferred as Locale
          break
        }
      }
    }
  }

  // Default to French if nothing found
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
    timeZone: "Europe/Paris",
    formats: {
      dateTime: {
        short: {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
        long: {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        },
      },
      number: {
        percentage: {
          style: "percent",
        },
      },
    },
  }
})
