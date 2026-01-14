import { getMessaging, isFirebaseConfigured } from "./admin"

/**
 * Result of a push notification send attempt
 */
export interface PushResult {
  success: boolean
  messageId?: string
  error?: string
  invalidToken?: boolean
}

/**
 * Multiple push notification result
 */
export interface MultiplePushResult {
  successCount: number
  failureCount: number
  invalidTokens: string[]
  results: PushResult[]
}

/**
 * Notification payload for FCM
 */
export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  clickAction?: string
}

/**
 * Data payload for FCM (key-value string pairs)
 */
export interface DataPayload {
  [key: string]: string
}

/**
 * Send a push notification to a single device
 * @param token - FCM device token
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload
 * @returns Push result with success status
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: DataPayload
): Promise<PushResult> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: "Firebase not configured",
    }
  }

  const messaging = getMessaging()
  if (!messaging) {
    return {
      success: false,
      error: "Firebase Messaging not available",
    }
  }

  try {
    const messageId = await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
        },
        fcmOptions: {
          link: data?.["link"] ?? "/dashboard",
        },
      },
      android: {
        notification: {
          icon: "notification_icon",
          color: "#2563eb",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
    })

    return {
      success: true,
      messageId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isInvalidToken = errorMessage.includes("not a valid FCM registration token") ||
      errorMessage.includes("Requested entity was not found") ||
      errorMessage.includes("registration-token-not-registered")

    return {
      success: false,
      error: errorMessage,
      invalidToken: isInvalidToken,
    }
  }
}

/**
 * Send push notifications to multiple devices
 * @param tokens - Array of FCM device tokens
 * @param notification - Notification payload (title, body, etc.)
 * @param data - Optional data payload
 * @returns Result with success/failure counts and invalid tokens
 */
export async function sendMultiplePush(
  tokens: string[],
  notification: NotificationPayload,
  data?: DataPayload
): Promise<MultiplePushResult> {
  if (!isFirebaseConfigured()) {
    return {
      successCount: 0,
      failureCount: tokens.length,
      invalidTokens: [],
      results: tokens.map(() => ({
        success: false,
        error: "Firebase not configured",
      })),
    }
  }

  const messaging = getMessaging()
  if (!messaging) {
    return {
      successCount: 0,
      failureCount: tokens.length,
      invalidTokens: [],
      results: tokens.map(() => ({
        success: false,
        error: "Firebase Messaging not available",
      })),
    }
  }

  if (tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      results: [],
    }
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data,
      webpush: {
        notification: {
          icon: notification.icon ?? "/icons/icon-192x192.png",
          badge: notification.badge ?? "/icons/badge-72x72.png",
        },
        fcmOptions: {
          link: notification.clickAction ?? data?.["link"] ?? "/dashboard",
        },
      },
      android: {
        notification: {
          icon: "notification_icon",
          color: "#2563eb",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
    })

    const invalidTokens: string[] = []
    const results: PushResult[] = response.responses.map((resp, index) => {
      if (resp.success) {
        return {
          success: true,
          messageId: resp.messageId,
        }
      }

      const errorMessage = resp.error?.message ?? "Unknown error"
      const isInvalidToken =
        errorMessage.includes("not a valid FCM registration token") ||
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("registration-token-not-registered")

      if (isInvalidToken) {
        const token = tokens[index]
        if (token) {
          invalidTokens.push(token)
        }
      }

      return {
        success: false,
        error: errorMessage,
        invalidToken: isInvalidToken,
      }
    })

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
      results,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return {
      successCount: 0,
      failureCount: tokens.length,
      invalidTokens: [],
      results: tokens.map(() => ({
        success: false,
        error: errorMessage,
      })),
    }
  }
}

/**
 * Send push notification for a task reminder
 */
export async function sendTaskReminderPush(
  token: string,
  taskTitle: string,
  taskId: string,
  deadline?: string
): Promise<PushResult> {
  const body = deadline
    ? `À faire avant le ${new Date(deadline).toLocaleDateString("fr-FR")}`
    : "N'oubliez pas cette tâche"

  return sendPushNotification(
    token,
    `Rappel: ${taskTitle}`,
    body,
    {
      type: "task_reminder",
      taskId,
      link: `/tasks/${taskId}`,
    }
  )
}

/**
 * Send push notification for a new task assignment
 */
export async function sendTaskAssignmentPush(
  token: string,
  taskTitle: string,
  taskId: string,
  assignedBy: string
): Promise<PushResult> {
  return sendPushNotification(
    token,
    "Nouvelle tâche assignée",
    `${assignedBy} vous a assigné: ${taskTitle}`,
    {
      type: "task_assignment",
      taskId,
      link: `/tasks/${taskId}`,
    }
  )
}

/**
 * Send push notification for load imbalance alert
 */
export async function sendImbalanceAlertPush(
  token: string,
  ratio: string,
  alertLevel: "warning" | "critical"
): Promise<PushResult> {
  const title = alertLevel === "critical"
    ? "Alerte déséquilibre critique"
    : "Attention: déséquilibre détecté"

  const body = `La répartition de charge est de ${ratio}. Pensez à rééquilibrer les tâches.`

  return sendPushNotification(
    token,
    title,
    body,
    {
      type: "imbalance_alert",
      alertLevel,
      link: "/charge",
    }
  )
}
