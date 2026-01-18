/**
 * Mobile Device Registration API
 *
 * POST: Register a device token for push notifications
 * DELETE: Unregister a device token
 * GET: Get all registered devices for current user
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import {
  apiSuccess,
  apiError,
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDeviceTokens,
  DeviceTokenSchema,
  checkMobileRateLimit,
  MobileErrorCodes,
} from "@/lib/services/mobile-api"

/**
 * POST /api/mobile/register-device
 * Register a device token for push notifications
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Check rate limit
    const rateLimit = checkMobileRateLimit(userId, "/api/mobile/register-device")
    if (!rateLimit.allowed) {
      const response = apiError("Trop de requêtes. Réessayez plus tard.", 429)
      response.headers.set("X-RateLimit-Remaining", "0")
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetIn / 1000)))
      response.headers.set("X-RateLimit-Limit", String(rateLimit.limit))
      return response
    }

    const bodyResult = await parseBody(request, DeviceTokenSchema)
    if (!bodyResult.success) {
      return apiError(bodyResult.error)
    }

    const result = await registerDeviceToken(userId, bodyResult.data)

    if (!result.success) {
      return apiError(result.error, 500)
    }

    return apiSuccess({
      tokenId: result.tokenId,
      registered: true,
      platform: bodyResult.data.platform,
    })
  })
}

// Query parameter schema for DELETE
const DeleteTokenQuerySchema = z.object({
  token: z.string().min(1, "Token manquant"),
})

/**
 * DELETE /api/mobile/register-device
 * Unregister a device token
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const queryValidation = DeleteTokenQuerySchema.safeParse({
      token: request.nextUrl.searchParams.get("token"),
    })

    if (!queryValidation.success) {
      return apiError(queryValidation.error.issues[0]?.message ?? "Paramètres invalides", 400)
    }

    const { token } = queryValidation.data
    const success = await unregisterDeviceToken(userId, token)

    if (!success) {
      return apiError("Échec de la désinscription du token", 500)
    }

    return apiSuccess({
      unregistered: true,
    })
  })
}

/**
 * GET /api/mobile/register-device
 * Get all registered devices for current user
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    const tokens = await getUserDeviceTokens(userId)

    return apiSuccess({
      devices: tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        deviceName: t.deviceName,
        deviceModel: t.deviceModel,
        osVersion: t.osVersion,
        appVersion: t.appVersion,
        lastUsed: t.lastUsed.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      count: tokens.length,
    })
  })
}
