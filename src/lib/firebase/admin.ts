import * as admin from "firebase-admin"

/**
 * Firebase Admin SDK initialization
 * Server-side only - used for push notifications via FCM
 *
 * Required environment variables:
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_CLIENT_EMAIL: Service account client email
 * - FIREBASE_PRIVATE_KEY: Service account private key (with \n replaced)
 */

let initialized = false

export function getFirebaseAdmin(): admin.app.App | null {
  const projectId = process.env["FIREBASE_PROJECT_ID"]
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"]
  const privateKeyRaw = process.env["FIREBASE_PRIVATE_KEY"]

  if (!projectId) {
    console.warn("Firebase Admin: FIREBASE_PROJECT_ID not configured")
    return null
  }

  if (!clientEmail) {
    console.warn("Firebase Admin: FIREBASE_CLIENT_EMAIL not configured")
    return null
  }

  if (!privateKeyRaw) {
    console.warn("Firebase Admin: FIREBASE_PRIVATE_KEY not configured")
    return null
  }

  if (!initialized) {
    try {
      // Check if already initialized
      if (admin.apps.length === 0) {
        const privateKey = privateKeyRaw.replace(/\\n/g, "\n")

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      }
      initialized = true
    } catch (error) {
      console.error("Firebase Admin initialization error:", error)
      return null
    }
  }

  return admin.apps[0] ?? null
}

/**
 * Get Firebase Cloud Messaging instance
 * Returns null if Firebase is not configured
 */
export function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseAdmin()
  if (!app) return null
  return admin.messaging(app)
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env["FIREBASE_PROJECT_ID"] &&
    process.env["FIREBASE_CLIENT_EMAIL"] &&
    process.env["FIREBASE_PRIVATE_KEY"]
  )
}
