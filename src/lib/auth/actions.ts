"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { cookies } from "next/headers"
import { loginSchema, signupSchema, confirmCodeSchema } from "@/lib/validations/auth"
import type { LoginInput, SignupInput } from "@/lib/validations/auth"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import crypto from "crypto"

// Cognito client (server-side)
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env['AWS_REGION'] ?? "us-east-1",
})

const CLIENT_ID = process.env['NEXT_PUBLIC_COGNITO_CLIENT_ID'] ?? ''

export type AuthActionResult = {
  success: boolean
  error?: string
  requiresConfirmation?: boolean
  email?: string
}

// Helper to compute secret hash if client secret is configured
function computeSecretHash(username: string): string | undefined {
  const clientSecret = process.env['COGNITO_CLIENT_SECRET']
  if (!clientSecret) return undefined

  const hmac = crypto.createHmac("sha256", clientSecret)
  hmac.update(username + CLIENT_ID)
  return hmac.digest("base64")
}

export async function login(data: LoginInput): Promise<AuthActionResult> {
  const validation = loginSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  try {
    const authParams: Record<string, string> = {
      USERNAME: validation.data.email,
      PASSWORD: validation.data.password,
    }

    const secretHash = computeSecretHash(validation.data.email)
    if (secretHash) {
      authParams['SECRET_HASH'] = secretHash
    }

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: authParams,
    })

    const response = await cognitoClient.send(command)

    if (!response.AuthenticationResult) {
      return {
        success: false,
        error: "Échec de l'authentification",
      }
    }

    const { IdToken, AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult

    // Store tokens in HTTP-only cookies
    const cookieStore = await cookies()
    const maxAge = ExpiresIn ?? 3600

    cookieStore.set("id_token", IdToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    })

    cookieStore.set("access_token", AccessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    })

    if (RefreshToken) {
      cookieStore.set("refresh_token", RefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })
    }

    // Sync user to RDS if not exists (from Cognito sub)
    try {
      const parts = IdToken!.split(".")
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString()) as Record<string, unknown>
        const sub = payload["sub"] as string
        const userEmail = payload["email"] as string
        if (sub && userEmail) {
          await query(
            `INSERT INTO users (id, email, auth_provider, role)
             VALUES (\$1, \$2, 'cognito', 'parent_principal')
             ON CONFLICT (id) DO NOTHING`,
            [sub, userEmail]
          )
        }
      }
    } catch (syncErr) {
      console.error("Failed to sync user to RDS:", syncErr)
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error) {
    // Re-throw redirect errors - they are NOT real errors!
    if (isRedirectError(error)) {
      throw error
    }

    const err = error as Error
    if (err.name === "NotAuthorizedException") {
      return {
        success: false,
        error: "Email ou mot de passe incorrect",
      }
    }
    if (err.name === "UserNotConfirmedException") {
      return {
        success: false,
        error: "Veuillez confirmer votre email avant de vous connecter",
        requiresConfirmation: true,
        email: validation.data.email,
      }
    }
    return {
      success: false,
      error: err.message || "Erreur de connexion",
    }
  }
}

export async function signup(data: SignupInput): Promise<AuthActionResult> {
  const validation = signupSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  try {
    const signUpParams: {
      ClientId: string
      Username: string
      Password: string
      UserAttributes: Array<{ Name: string; Value: string }>
      SecretHash?: string
    } = {
      ClientId: CLIENT_ID,
      Username: validation.data.email,
      Password: validation.data.password,
      UserAttributes: [
        {
          Name: "email",
          Value: validation.data.email,
        },
      ],
    }

    const secretHash = computeSecretHash(validation.data.email)
    if (secretHash) {
      signUpParams.SecretHash = secretHash
    }

    const command = new SignUpCommand(signUpParams)
    await cognitoClient.send(command)

    return {
      success: true,
      requiresConfirmation: true,
      email: validation.data.email,
    }
  } catch (error) {
    const err = error as Error
    if (err.name === "UsernameExistsException") {
      return {
        success: false,
        error: "Cet email est déjà utilisé",
      }
    }
    if (err.name === "InvalidPasswordException") {
      return {
        success: false,
        error: "Le mot de passe ne respecte pas les exigences de sécurité",
      }
    }
    return {
      success: false,
      error: err.message || "Erreur lors de l'inscription",
    }
  }
}

export async function confirmSignup(email: string, code: string): Promise<AuthActionResult> {
  const validation = confirmCodeSchema.safeParse({ email, code })
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  try {
    const confirmParams: {
      ClientId: string
      Username: string
      ConfirmationCode: string
      SecretHash?: string
    } = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }

    const secretHash = computeSecretHash(email)
    if (secretHash) {
      confirmParams.SecretHash = secretHash
    }

    const command = new ConfirmSignUpCommand(confirmParams)
    await cognitoClient.send(command)

    return {
      success: true,
    }
  } catch (error) {
    const err = error as Error
    if (err.name === "CodeMismatchException") {
      return {
        success: false,
        error: "Code de confirmation invalide",
      }
    }
    if (err.name === "ExpiredCodeException") {
      return {
        success: false,
        error: "Code de confirmation expiré",
      }
    }
    return {
      success: false,
      error: err.message || "Erreur lors de la confirmation",
    }
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (accessToken) {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      })
      await cognitoClient.send(command)
    } catch {
      // Ignore errors during signout
    }
  }

  // Clear all auth cookies
  cookieStore.delete("id_token")
  cookieStore.delete("access_token")
  cookieStore.delete("refresh_token")

  revalidatePath("/", "layout")
  redirect("/login")
}

// Get current user from Cognito token
export async function getUser(): Promise<{
  id: string
  email: string
  emailVerified: boolean
} | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) {
    return null
  }

  try {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    })
    const response = await cognitoClient.send(command)

    const email = response.UserAttributes?.find((attr) => attr.Name === "email")?.Value
    const emailVerified = response.UserAttributes?.find((attr) => attr.Name === "email_verified")?.Value === "true"
    const sub = response.UserAttributes?.find((attr) => attr.Name === "sub")?.Value

    if (!email || !sub) {
      return null
    }

    return {
      id: sub,
      email,
      emailVerified,
    }
  } catch {
    return null
  }
}

// Get user ID from token (faster than getUser)
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get("id_token")?.value

  if (!idToken) {
    return null
  }

  try {
    // Decode JWT payload (base64)
    const parts = idToken.split(".")
    if (parts.length !== 3) return null

    const payloadPart = parts[1]
    if (!payloadPart) return null

    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString()) as Record<string, unknown>
    return payload['sub'] as string
  } catch {
    return null
  }
}

// Get user's household membership
export async function getUserHousehold() {
  const userId = await getUserId()
  if (!userId) return null

  await setCurrentUser(userId)

  interface MembershipResult {
    household_id: string
    role: string
    household_name: string
    country: string
    timezone: string
    streak_current: number
    streak_best: number
    subscription_status: string
  }

  const membership = await queryOne<MembershipResult>(`
    SELECT
      hm.household_id,
      hm.role,
      h.name as household_name,
      h.country,
      h.timezone,
      h.streak_current,
      h.streak_best,
      h.subscription_status
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = $1 AND hm.is_active = true
  `, [userId])

  if (!membership) return null

  return {
    household_id: membership.household_id,
    role: membership.role,
    households: {
      id: membership.household_id,
      name: membership.household_name,
      country: membership.country,
      timezone: membership.timezone,
      streak_current: membership.streak_current,
      streak_best: membership.streak_best,
      subscription_status: membership.subscription_status,
    },
  }
}
