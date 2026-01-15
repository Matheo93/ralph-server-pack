/**
 * Error Response Service
 *
 * Standardized error codes, messages, and HTTP responses.
 * Supports localized error messages in all supported languages.
 */

import { NextResponse } from "next/server"
import { z } from "zod"

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  // Authentication (401)
  AUTH_REQUIRED: "auth_required",
  AUTH_INVALID_TOKEN: "auth_invalid_token",
  AUTH_EXPIRED_TOKEN: "auth_expired_token",
  AUTH_INVALID_CREDENTIALS: "auth_invalid_credentials",
  AUTH_SESSION_EXPIRED: "auth_session_expired",

  // Authorization (403)
  FORBIDDEN: "forbidden",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",
  HOUSEHOLD_ACCESS_DENIED: "household_access_denied",
  RESOURCE_NOT_OWNED: "resource_not_owned",
  SUBSCRIPTION_REQUIRED: "subscription_required",

  // Validation (400)
  VALIDATION_ERROR: "validation_error",
  INVALID_INPUT: "invalid_input",
  MISSING_FIELD: "missing_field",
  INVALID_FORMAT: "invalid_format",
  INVALID_ENUM_VALUE: "invalid_enum_value",
  VALUE_TOO_LONG: "value_too_long",
  VALUE_TOO_SHORT: "value_too_short",
  VALUE_OUT_OF_RANGE: "value_out_of_range",

  // Not Found (404)
  NOT_FOUND: "not_found",
  TASK_NOT_FOUND: "task_not_found",
  CHILD_NOT_FOUND: "child_not_found",
  HOUSEHOLD_NOT_FOUND: "household_not_found",
  USER_NOT_FOUND: "user_not_found",
  TEMPLATE_NOT_FOUND: "template_not_found",

  // Conflict (409)
  CONFLICT: "conflict",
  ALREADY_EXISTS: "already_exists",
  DUPLICATE_ENTRY: "duplicate_entry",
  CONCURRENT_MODIFICATION: "concurrent_modification",

  // Rate Limiting (429)
  RATE_LIMITED: "rate_limited",
  TOO_MANY_REQUESTS: "too_many_requests",
  QUOTA_EXCEEDED: "quota_exceeded",

  // Payment (402)
  PAYMENT_REQUIRED: "payment_required",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  TRIAL_EXPIRED: "trial_expired",
  INVALID_SUBSCRIPTION: "invalid_subscription",
  PAYMENT_FAILED: "payment_failed",

  // Server (500)
  INTERNAL_ERROR: "internal_error",
  DATABASE_ERROR: "database_error",
  EXTERNAL_SERVICE_ERROR: "external_service_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  TIMEOUT: "timeout",

  // Voice/AI (422)
  TRANSCRIPTION_FAILED: "transcription_failed",
  ANALYSIS_FAILED: "analysis_failed",
  AUDIO_TOO_LONG: "audio_too_long",
  UNSUPPORTED_AUDIO_FORMAT: "unsupported_audio_format",
  NO_SPEECH_DETECTED: "no_speech_detected",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// =============================================================================
// LOCALIZED ERROR MESSAGES
// =============================================================================

type LocalizedMessages = Record<ErrorCode, string>

const errorMessagesFr: LocalizedMessages = {
  // Authentication
  auth_required: "Authentification requise",
  auth_invalid_token: "Token d'authentification invalide",
  auth_expired_token: "Token d'authentification expiré",
  auth_invalid_credentials: "Identifiants invalides",
  auth_session_expired: "Session expirée, veuillez vous reconnecter",

  // Authorization
  forbidden: "Accès interdit",
  insufficient_permissions: "Permissions insuffisantes",
  household_access_denied: "Accès au foyer refusé",
  resource_not_owned: "Cette ressource ne vous appartient pas",
  subscription_required: "Un abonnement est requis pour cette fonctionnalité",

  // Validation
  validation_error: "Erreur de validation",
  invalid_input: "Entrée invalide",
  missing_field: "Champ requis manquant",
  invalid_format: "Format invalide",
  invalid_enum_value: "Valeur non autorisée",
  value_too_long: "Valeur trop longue",
  value_too_short: "Valeur trop courte",
  value_out_of_range: "Valeur hors limites",

  // Not Found
  not_found: "Ressource non trouvée",
  task_not_found: "Tâche non trouvée",
  child_not_found: "Enfant non trouvé",
  household_not_found: "Foyer non trouvé",
  user_not_found: "Utilisateur non trouvé",
  template_not_found: "Modèle non trouvé",

  // Conflict
  conflict: "Conflit détecté",
  already_exists: "Cette ressource existe déjà",
  duplicate_entry: "Entrée en double",
  concurrent_modification: "La ressource a été modifiée par quelqu'un d'autre",

  // Rate Limiting
  rate_limited: "Limite de requêtes atteinte",
  too_many_requests: "Trop de requêtes, veuillez réessayer plus tard",
  quota_exceeded: "Quota dépassé",

  // Payment
  payment_required: "Paiement requis",
  subscription_expired: "Abonnement expiré",
  trial_expired: "Période d'essai terminée",
  invalid_subscription: "Abonnement invalide",
  payment_failed: "Échec du paiement",

  // Server
  internal_error: "Erreur interne du serveur",
  database_error: "Erreur de base de données",
  external_service_error: "Erreur du service externe",
  service_unavailable: "Service temporairement indisponible",
  timeout: "Délai d'attente dépassé",

  // Voice/AI
  transcription_failed: "Échec de la transcription",
  analysis_failed: "Échec de l'analyse",
  audio_too_long: "Audio trop long (max 60 secondes)",
  unsupported_audio_format: "Format audio non supporté",
  no_speech_detected: "Aucune parole détectée",
}

const errorMessagesEn: LocalizedMessages = {
  // Authentication
  auth_required: "Authentication required",
  auth_invalid_token: "Invalid authentication token",
  auth_expired_token: "Authentication token expired",
  auth_invalid_credentials: "Invalid credentials",
  auth_session_expired: "Session expired, please log in again",

  // Authorization
  forbidden: "Access forbidden",
  insufficient_permissions: "Insufficient permissions",
  household_access_denied: "Household access denied",
  resource_not_owned: "This resource does not belong to you",
  subscription_required: "A subscription is required for this feature",

  // Validation
  validation_error: "Validation error",
  invalid_input: "Invalid input",
  missing_field: "Required field missing",
  invalid_format: "Invalid format",
  invalid_enum_value: "Value not allowed",
  value_too_long: "Value too long",
  value_too_short: "Value too short",
  value_out_of_range: "Value out of range",

  // Not Found
  not_found: "Resource not found",
  task_not_found: "Task not found",
  child_not_found: "Child not found",
  household_not_found: "Household not found",
  user_not_found: "User not found",
  template_not_found: "Template not found",

  // Conflict
  conflict: "Conflict detected",
  already_exists: "This resource already exists",
  duplicate_entry: "Duplicate entry",
  concurrent_modification: "Resource was modified by someone else",

  // Rate Limiting
  rate_limited: "Rate limit reached",
  too_many_requests: "Too many requests, please try again later",
  quota_exceeded: "Quota exceeded",

  // Payment
  payment_required: "Payment required",
  subscription_expired: "Subscription expired",
  trial_expired: "Trial period ended",
  invalid_subscription: "Invalid subscription",
  payment_failed: "Payment failed",

  // Server
  internal_error: "Internal server error",
  database_error: "Database error",
  external_service_error: "External service error",
  service_unavailable: "Service temporarily unavailable",
  timeout: "Request timed out",

  // Voice/AI
  transcription_failed: "Transcription failed",
  analysis_failed: "Analysis failed",
  audio_too_long: "Audio too long (max 60 seconds)",
  unsupported_audio_format: "Unsupported audio format",
  no_speech_detected: "No speech detected",
}

const errorMessagesEs: LocalizedMessages = {
  // Authentication
  auth_required: "Autenticación requerida",
  auth_invalid_token: "Token de autenticación inválido",
  auth_expired_token: "Token de autenticación expirado",
  auth_invalid_credentials: "Credenciales inválidas",
  auth_session_expired: "Sesión expirada, por favor inicie sesión de nuevo",

  // Authorization
  forbidden: "Acceso prohibido",
  insufficient_permissions: "Permisos insuficientes",
  household_access_denied: "Acceso al hogar denegado",
  resource_not_owned: "Este recurso no le pertenece",
  subscription_required: "Se requiere una suscripción para esta función",

  // Validation
  validation_error: "Error de validación",
  invalid_input: "Entrada inválida",
  missing_field: "Campo requerido faltante",
  invalid_format: "Formato inválido",
  invalid_enum_value: "Valor no permitido",
  value_too_long: "Valor demasiado largo",
  value_too_short: "Valor demasiado corto",
  value_out_of_range: "Valor fuera de rango",

  // Not Found
  not_found: "Recurso no encontrado",
  task_not_found: "Tarea no encontrada",
  child_not_found: "Niño no encontrado",
  household_not_found: "Hogar no encontrado",
  user_not_found: "Usuario no encontrado",
  template_not_found: "Plantilla no encontrada",

  // Conflict
  conflict: "Conflicto detectado",
  already_exists: "Este recurso ya existe",
  duplicate_entry: "Entrada duplicada",
  concurrent_modification: "El recurso fue modificado por otra persona",

  // Rate Limiting
  rate_limited: "Límite de solicitudes alcanzado",
  too_many_requests: "Demasiadas solicitudes, intente más tarde",
  quota_exceeded: "Cuota excedida",

  // Payment
  payment_required: "Pago requerido",
  subscription_expired: "Suscripción expirada",
  trial_expired: "Período de prueba terminado",
  invalid_subscription: "Suscripción inválida",
  payment_failed: "Error en el pago",

  // Server
  internal_error: "Error interno del servidor",
  database_error: "Error de base de datos",
  external_service_error: "Error del servicio externo",
  service_unavailable: "Servicio temporalmente no disponible",
  timeout: "Tiempo de espera agotado",

  // Voice/AI
  transcription_failed: "Error en la transcripción",
  analysis_failed: "Error en el análisis",
  audio_too_long: "Audio demasiado largo (máx 60 segundos)",
  unsupported_audio_format: "Formato de audio no soportado",
  no_speech_detected: "No se detectó voz",
}

const errorMessagesDe: LocalizedMessages = {
  // Authentication
  auth_required: "Authentifizierung erforderlich",
  auth_invalid_token: "Ungültiges Authentifizierungstoken",
  auth_expired_token: "Authentifizierungstoken abgelaufen",
  auth_invalid_credentials: "Ungültige Anmeldedaten",
  auth_session_expired: "Sitzung abgelaufen, bitte erneut anmelden",

  // Authorization
  forbidden: "Zugriff verboten",
  insufficient_permissions: "Unzureichende Berechtigungen",
  household_access_denied: "Haushaltszugriff verweigert",
  resource_not_owned: "Diese Ressource gehört Ihnen nicht",
  subscription_required: "Ein Abonnement ist für diese Funktion erforderlich",

  // Validation
  validation_error: "Validierungsfehler",
  invalid_input: "Ungültige Eingabe",
  missing_field: "Erforderliches Feld fehlt",
  invalid_format: "Ungültiges Format",
  invalid_enum_value: "Wert nicht erlaubt",
  value_too_long: "Wert zu lang",
  value_too_short: "Wert zu kurz",
  value_out_of_range: "Wert außerhalb des Bereichs",

  // Not Found
  not_found: "Ressource nicht gefunden",
  task_not_found: "Aufgabe nicht gefunden",
  child_not_found: "Kind nicht gefunden",
  household_not_found: "Haushalt nicht gefunden",
  user_not_found: "Benutzer nicht gefunden",
  template_not_found: "Vorlage nicht gefunden",

  // Conflict
  conflict: "Konflikt erkannt",
  already_exists: "Diese Ressource existiert bereits",
  duplicate_entry: "Doppelter Eintrag",
  concurrent_modification: "Ressource wurde von jemand anderem geändert",

  // Rate Limiting
  rate_limited: "Anfragenlimit erreicht",
  too_many_requests: "Zu viele Anfragen, bitte später erneut versuchen",
  quota_exceeded: "Kontingent überschritten",

  // Payment
  payment_required: "Zahlung erforderlich",
  subscription_expired: "Abonnement abgelaufen",
  trial_expired: "Testzeitraum beendet",
  invalid_subscription: "Ungültiges Abonnement",
  payment_failed: "Zahlung fehlgeschlagen",

  // Server
  internal_error: "Interner Serverfehler",
  database_error: "Datenbankfehler",
  external_service_error: "Externer Dienstfehler",
  service_unavailable: "Dienst vorübergehend nicht verfügbar",
  timeout: "Zeitüberschreitung",

  // Voice/AI
  transcription_failed: "Transkription fehlgeschlagen",
  analysis_failed: "Analyse fehlgeschlagen",
  audio_too_long: "Audio zu lang (max 60 Sekunden)",
  unsupported_audio_format: "Audioformat nicht unterstützt",
  no_speech_detected: "Keine Sprache erkannt",
}

const errorMessagesByLocale: Record<string, LocalizedMessages> = {
  fr: errorMessagesFr,
  en: errorMessagesEn,
  es: errorMessagesEs,
  de: errorMessagesDe,
}

// =============================================================================
// HTTP STATUS MAPPING
// =============================================================================

const errorCodeToStatus: Record<ErrorCode, number> = {
  // 400 Bad Request
  validation_error: 400,
  invalid_input: 400,
  missing_field: 400,
  invalid_format: 400,
  invalid_enum_value: 400,
  value_too_long: 400,
  value_too_short: 400,
  value_out_of_range: 400,

  // 401 Unauthorized
  auth_required: 401,
  auth_invalid_token: 401,
  auth_expired_token: 401,
  auth_invalid_credentials: 401,
  auth_session_expired: 401,

  // 402 Payment Required
  payment_required: 402,
  subscription_expired: 402,
  trial_expired: 402,
  invalid_subscription: 402,
  payment_failed: 402,

  // 403 Forbidden
  forbidden: 403,
  insufficient_permissions: 403,
  household_access_denied: 403,
  resource_not_owned: 403,
  subscription_required: 403,

  // 404 Not Found
  not_found: 404,
  task_not_found: 404,
  child_not_found: 404,
  household_not_found: 404,
  user_not_found: 404,
  template_not_found: 404,

  // 409 Conflict
  conflict: 409,
  already_exists: 409,
  duplicate_entry: 409,
  concurrent_modification: 409,

  // 422 Unprocessable Entity
  transcription_failed: 422,
  analysis_failed: 422,
  audio_too_long: 422,
  unsupported_audio_format: 422,
  no_speech_detected: 422,

  // 429 Too Many Requests
  rate_limited: 429,
  too_many_requests: 429,
  quota_exceeded: 429,

  // 500 Internal Server Error
  internal_error: 500,
  database_error: 500,
  external_service_error: 500,

  // 503 Service Unavailable
  service_unavailable: 503,
  timeout: 504,
}

// =============================================================================
// ERROR RESPONSE TYPES
// =============================================================================

export interface ErrorResponse {
  error: string
  code: ErrorCode
  details?: Record<string, unknown>
  requestId?: string
  timestamp: string
}

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().optional(),
  timestamp: z.string(),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get error message for a specific error code and locale
 */
export function getErrorMessage(code: ErrorCode, locale: string = "fr"): string {
  const messages = errorMessagesByLocale[locale] || errorMessagesFr
  return messages[code] || errorMessagesFr[code]
}

/**
 * Get HTTP status code for an error code
 */
export function getStatusCode(code: ErrorCode): number {
  return errorCodeToStatus[code] || 500
}

/**
 * Create a standardized error response body
 */
export function createErrorBody(
  code: ErrorCode,
  locale: string = "fr",
  details?: Record<string, unknown>,
  requestId?: string
): ErrorResponse {
  return {
    error: getErrorMessage(code, locale),
    code,
    details,
    requestId,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create a NextResponse with standardized error format
 */
export function createErrorResponse(
  code: ErrorCode,
  locale: string = "fr",
  details?: Record<string, unknown>,
  requestId?: string
): NextResponse<ErrorResponse> {
  const body = createErrorBody(code, locale, details, requestId)
  const status = getStatusCode(code)

  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": code,
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  })
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create authentication required error
 */
export function authRequired(locale?: string): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.AUTH_REQUIRED, locale)
}

/**
 * Create forbidden error
 */
export function forbidden(locale?: string): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.FORBIDDEN, locale)
}

/**
 * Create not found error
 */
export function notFound(
  resourceType?: string,
  locale?: string
): NextResponse<ErrorResponse> {
  const code = resourceType
    ? (`${resourceType}_not_found` as ErrorCode)
    : ErrorCodes.NOT_FOUND

  // Fallback to generic not_found if specific code doesn't exist
  const validCode = errorCodeToStatus[code] ? code : ErrorCodes.NOT_FOUND
  return createErrorResponse(validCode, locale)
}

/**
 * Create validation error
 */
export function validationError(
  details?: Record<string, unknown>,
  locale?: string
): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, locale, details)
}

/**
 * Create rate limit error
 */
export function rateLimited(
  retryAfter?: number,
  locale?: string
): NextResponse<ErrorResponse> {
  const response = createErrorResponse(
    ErrorCodes.RATE_LIMITED,
    locale,
    retryAfter ? { retryAfter } : undefined
  )

  if (retryAfter) {
    response.headers.set("Retry-After", String(retryAfter))
  }

  return response
}

/**
 * Create internal error
 */
export function internalError(locale?: string): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.INTERNAL_ERROR, locale)
}

/**
 * Create payment required error
 */
export function paymentRequired(locale?: string): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.PAYMENT_REQUIRED, locale)
}

/**
 * Create subscription required error
 */
export function subscriptionRequired(locale?: string): NextResponse<ErrorResponse> {
  return createErrorResponse(ErrorCodes.SUBSCRIPTION_REQUIRED, locale)
}

// =============================================================================
// ZOD ERROR CONVERSION
// =============================================================================

/**
 * Convert Zod validation errors to standardized error response
 */
export function fromZodError(
  error: z.ZodError,
  locale?: string
): NextResponse<ErrorResponse> {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }))

  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, locale, {
    issues,
    fieldErrors: error.flatten().fieldErrors,
  })
}

// =============================================================================
// ERROR MIDDLEWARE HELPER
// =============================================================================

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  locale?: string
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error: unknown) => {
    console.error("API Error:", error)

    if (error instanceof z.ZodError) {
      return fromZodError(error, locale)
    }

    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes("not found")) {
        return notFound(undefined, locale)
      }
      if (error.message.includes("unauthorized") || error.message.includes("auth")) {
        return authRequired(locale)
      }
      if (error.message.includes("forbidden") || error.message.includes("permission")) {
        return forbidden(locale)
      }
    }

    return internalError(locale)
  })
}

// =============================================================================
// ALL ERROR CODES EXPORT
// =============================================================================

export const ALL_ERROR_CODES = Object.values(ErrorCodes)

/**
 * Check if a string is a valid error code
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return ALL_ERROR_CODES.includes(code as ErrorCode)
}
