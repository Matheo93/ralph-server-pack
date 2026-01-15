/**
 * i18n Messages Index
 *
 * Exports all translations and utilities.
 */

export { default as en } from "./en"
export { default as es } from "./es"
export { default as de } from "./de"
export * from "./types"

import en from "./en"
import es from "./es"
import de from "./de"
import type { Messages, Locale } from "./types"

/**
 * All available translations
 */
export const messages: Record<Locale, Messages> = {
  fr: en, // Placeholder - fr.json is the primary source
  en,
  es,
  de,
}

/**
 * Get messages for a locale with fallback
 */
export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.en
}

/**
 * Supported locales
 */
export const supportedLocales: Locale[] = ["fr", "en", "es", "de"]

/**
 * Default locale
 */
export const defaultLocale: Locale = "fr"

/**
 * Locale display names (in their own language)
 */
export const localeNames: Record<Locale, string> = {
  fr: "Francais",
  en: "English",
  es: "Espanol",
  de: "Deutsch",
}

/**
 * Locale flags
 */
export const localeFlags: Record<Locale, string> = {
  fr: "FR",
  en: "GB",
  es: "ES",
  de: "DE",
}

/**
 * Check if a locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return supportedLocales.includes(locale as Locale)
}
