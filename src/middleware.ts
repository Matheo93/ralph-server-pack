import { type NextRequest, NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/children", "/onboarding", "/settings"]

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/signup"]

// Routes that are always public
const publicRoutes = ["/", "/callback", "/confirm"]

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

// Decode JWT without verification (verification done by Cognito on API calls)
function decodeToken(token: string): { sub: string; exp: number } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payloadPart = parts[1]
    if (!payloadPart) return null

    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString()) as Record<string, unknown>
    return {
      sub: payload['sub'] as string,
      exp: payload['exp'] as number,
    }
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded) return true

  // Add 60 second buffer for clock skew
  return decoded.exp * 1000 < Date.now() + 60000
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get auth tokens from cookies
  const idToken = request.cookies.get("id_token")?.value
  const accessToken = request.cookies.get("access_token")?.value

  // Check if user is authenticated (has valid tokens)
  const isAuthenticated = idToken && accessToken && !isTokenExpired(idToken)

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Handle auth routes (redirect to dashboard if already authenticated)
  if (isAuthRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Continue with the request
  const response = NextResponse.next()

  // If tokens are expired, clear them
  if (idToken && isTokenExpired(idToken)) {
    response.cookies.delete("id_token")
    response.cookies.delete("access_token")
    response.cookies.delete("refresh_token")
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
