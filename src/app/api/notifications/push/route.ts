/**
 * Push Notifications API
 *
 * Endpoints for:
 * - Sending push notifications
 * - Batch sending
 * - Device token registration
 * - Notification status
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const SendNotificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.string(), z.string()).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  ttl: z.number().min(0).max(86400 * 7).optional(), // Max 7 days
  collapseKey: z.string().optional(),
})

const BatchSendSchema = z.object({
  notifications: z.array(SendNotificationSchema).min(1).max(100),
})

const RegisterDeviceSchema = z.object({
  userId: z.string(),
  token: z.string().min(10),
  platform: z.enum(["ios", "android", "web"]),
  deviceInfo: z.object({
    model: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
})

const UnregisterDeviceSchema = z.object({
  token: z.string(),
})

// =============================================================================
// POST - SEND NOTIFICATION
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = request.nextUrl.searchParams.get("action")

    switch (action) {
      case "send":
        return handleSendNotification(body)
      case "batch":
        return handleBatchSend(body)
      case "register":
        return handleRegisterDevice(body)
      case "unregister":
        return handleUnregisterDevice(body)
      default:
        return handleSendNotification(body)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Push notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleSendNotification(body: unknown) {
  const data = SendNotificationSchema.parse(body)

  // In production, this would:
  // 1. Get device tokens for user
  // 2. Build FCM/APNs payloads
  // 3. Send via Firebase Admin SDK or APNs

  const notificationId = `pn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  return NextResponse.json({
    success: true,
    notificationId,
    userId: data.userId,
    status: "queued",
    message: "Notification queued for delivery",
  })
}

async function handleBatchSend(body: unknown) {
  const data = BatchSendSchema.parse(body)

  const results = data.notifications.map((notification, index) => ({
    index,
    notificationId: `pn_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
    userId: notification.userId,
    status: "queued" as const,
  }))

  return NextResponse.json({
    success: true,
    totalQueued: results.length,
    results,
  })
}

async function handleRegisterDevice(body: unknown) {
  const data = RegisterDeviceSchema.parse(body)

  // In production, this would store the token in database

  const tokenId = `dt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  return NextResponse.json({
    success: true,
    tokenId,
    userId: data.userId,
    platform: data.platform,
    message: "Device registered successfully",
  })
}

async function handleUnregisterDevice(body: unknown) {
  const data = UnregisterDeviceSchema.parse(body)

  // In production, this would remove the token from database

  return NextResponse.json({
    success: true,
    token: data.token,
    message: "Device unregistered successfully",
  })
}

// =============================================================================
// GET - NOTIFICATION STATUS
// =============================================================================

export async function GET(request: NextRequest) {
  const notificationId = request.nextUrl.searchParams.get("id")
  const userId = request.nextUrl.searchParams.get("userId")

  if (notificationId) {
    return getNotificationStatus(notificationId)
  }

  if (userId) {
    return getUserNotifications(userId)
  }

  return NextResponse.json(
    { error: "Missing id or userId parameter" },
    { status: 400 }
  )
}

function getNotificationStatus(notificationId: string) {
  // In production, this would fetch from database

  return NextResponse.json({
    notificationId,
    status: "delivered",
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    platform: "ios",
  })
}

function getUserNotifications(userId: string) {
  // In production, this would fetch from database

  return NextResponse.json({
    userId,
    notifications: [],
    total: 0,
    stats: {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryRate: 0,
    },
  })
}

// =============================================================================
// DELETE - CANCEL NOTIFICATION
// =============================================================================

export async function DELETE(request: NextRequest) {
  const notificationId = request.nextUrl.searchParams.get("id")

  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notification id" },
      { status: 400 }
    )
  }

  // In production, this would cancel scheduled notification

  return NextResponse.json({
    success: true,
    notificationId,
    message: "Notification cancelled",
  })
}
