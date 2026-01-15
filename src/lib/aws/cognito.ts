'use client'

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
  ISignUpResult,
} from 'amazon-cognito-identity-js'

// Pool configuration
const poolData = {
  UserPoolId: process.env['NEXT_PUBLIC_COGNITO_USER_POOL_ID'] ?? '',
  ClientId: process.env['NEXT_PUBLIC_COGNITO_CLIENT_ID'] ?? '',
}

export const userPool = new CognitoUserPool(poolData)

// Types
export interface CognitoAuthResult {
  success: boolean
  error?: string
  session?: CognitoUserSession
  user?: CognitoUser
  userId?: string
}

export interface SignUpData {
  email: string
  password: string
  name?: string
}

export interface LoginData {
  email: string
  password: string
}

// Get current user
export function getCurrentUser(): CognitoUser | null {
  return userPool.getCurrentUser()
}

// Get current session
export function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = getCurrentUser()
    if (!user) {
      resolve(null)
      return
    }

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null)
        return
      }
      resolve(session)
    })
  })
}

// Get user ID from session
export async function getUserId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null

  const idToken = session.getIdToken()
  return idToken.payload['sub'] as string
}

// Get JWT tokens
export async function getTokens(): Promise<{
  idToken: string
  accessToken: string
  refreshToken: string
} | null> {
  const session = await getSession()
  if (!session) return null

  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
  }
}

// Sign up new user
export function signUp(data: SignUpData): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const attributeList: CognitoUserAttribute[] = []

    const emailAttribute = new CognitoUserAttribute({
      Name: 'email',
      Value: data.email,
    })
    attributeList.push(emailAttribute)

    if (data.name) {
      const nameAttribute = new CognitoUserAttribute({
        Name: 'name',
        Value: data.name,
      })
      attributeList.push(nameAttribute)
    }

    userPool.signUp(
      data.email,
      data.password,
      attributeList,
      [],
      (err: Error | undefined, result: ISignUpResult | undefined) => {
        if (err) {
          resolve({
            success: false,
            error: err.message || 'Signup failed',
          })
          return
        }

        resolve({
          success: true,
          user: result?.user,
          userId: result?.userSub,
        })
      }
    )
  })
}

// Confirm signup with code
export function confirmSignUp(email: string, code: string): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const userData = {
      Username: email,
      Pool: userPool,
    }

    const cognitoUser = new CognitoUser(userData)

    cognitoUser.confirmRegistration(code, true, (err: Error | undefined) => {
      if (err) {
        resolve({
          success: false,
          error: err.message || 'Confirmation failed',
        })
        return
      }

      resolve({ success: true })
    })
  })
}

// Resend confirmation code
export function resendConfirmationCode(email: string): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const userData = {
      Username: email,
      Pool: userPool,
    }

    const cognitoUser = new CognitoUser(userData)

    cognitoUser.resendConfirmationCode((err: Error | undefined) => {
      if (err) {
        resolve({
          success: false,
          error: err.message || 'Failed to resend code',
        })
        return
      }

      resolve({ success: true })
    })
  })
}

// Login
export function login(data: LoginData): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const authDetails = new AuthenticationDetails({
      Username: data.email,
      Password: data.password,
    })

    const userData = {
      Username: data.email,
      Pool: userPool,
    }

    const cognitoUser = new CognitoUser(userData)

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const userId = session.getIdToken().payload['sub'] as string
        resolve({
          success: true,
          session,
          user: cognitoUser,
          userId,
        })
      },
      onFailure: (err: Error) => {
        resolve({
          success: false,
          error: err.message || 'Login failed',
        })
      },
      newPasswordRequired: () => {
        resolve({
          success: false,
          error: 'Password change required',
        })
      },
    })
  })
}

// Logout
export function logout(): void {
  const user = getCurrentUser()
  if (user) {
    user.signOut()
  }
}

// Forgot password - initiate
export function forgotPassword(email: string): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const userData = {
      Username: email,
      Pool: userPool,
    }

    const cognitoUser = new CognitoUser(userData)

    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve({ success: true })
      },
      onFailure: (err: Error) => {
        resolve({
          success: false,
          error: err.message || 'Failed to initiate password reset',
        })
      },
    })
  })
}

// Forgot password - confirm with code
export function confirmPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const userData = {
      Username: email,
      Pool: userPool,
    }

    const cognitoUser = new CognitoUser(userData)

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve({ success: true })
      },
      onFailure: (err: Error) => {
        resolve({
          success: false,
          error: err.message || 'Failed to reset password',
        })
      },
    })
  })
}

// Refresh session
export function refreshSession(): Promise<CognitoAuthResult> {
  return new Promise((resolve) => {
    const user = getCurrentUser()
    if (!user) {
      resolve({
        success: false,
        error: 'No user logged in',
      })
      return
    }

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve({
          success: false,
          error: err?.message || 'No valid session',
        })
        return
      }

      const refreshToken = session.getRefreshToken()

      user.refreshSession(refreshToken, (refreshErr: Error | null, newSession: CognitoUserSession) => {
        if (refreshErr) {
          resolve({
            success: false,
            error: refreshErr.message || 'Failed to refresh session',
          })
          return
        }

        resolve({
          success: true,
          session: newSession,
          user,
        })
      })
    })
  })
}

// Get user attributes
export function getUserAttributes(): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const user = getCurrentUser()
    if (!user) {
      resolve(null)
      return
    }

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null)
        return
      }

      user.getUserAttributes((attrErr: Error | undefined, attributes: CognitoUserAttribute[] | undefined) => {
        if (attrErr || !attributes) {
          resolve(null)
          return
        }

        const attrs: Record<string, string> = {}
        attributes.forEach((attr) => {
          attrs[attr.getName()] = attr.getValue()
        })
        resolve(attrs)
      })
    })
  })
}
