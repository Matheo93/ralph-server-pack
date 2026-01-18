declare module "web-push" {
  interface VapidDetails {
    subject: string
    publicKey: string
    privateKey: string
  }

  interface PushSubscription {
    endpoint: string
    expirationTime?: number | null
    keys: {
      p256dh: string
      auth: string
    }
  }

  interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }

  interface RequestOptions {
    TTL?: number
    urgency?: "very-low" | "low" | "normal" | "high"
    topic?: string
    headers?: Record<string, string>
    contentEncoding?: "aesgcm" | "aes128gcm"
    proxy?: string
    agent?: unknown
    timeout?: number
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>

  export function generateVAPIDKeys(): {
    publicKey: string
    privateKey: string
  }

  export function encrypt(
    userPublicKey: string,
    userAuth: string,
    payload: string | Buffer,
    contentEncoding?: "aesgcm" | "aes128gcm"
  ): {
    localPublicKey: string
    salt: string
    cipherText: Buffer
  }

  export function getVapidHeaders(
    audience: string,
    subject: string,
    publicKey: string,
    privateKey: string,
    contentEncoding?: "aesgcm" | "aes128gcm",
    expiration?: number
  ): {
    Authorization: string
    "Crypto-Key": string
  }

  const webpush: {
    setVapidDetails: typeof setVapidDetails
    sendNotification: typeof sendNotification
    generateVAPIDKeys: typeof generateVAPIDKeys
    encrypt: typeof encrypt
    getVapidHeaders: typeof getVapidHeaders
  }

  export default webpush
}
