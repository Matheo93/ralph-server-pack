import { type NextRequest, NextResponse } from "next/server"

// Security: Generate CSP nonce for inline scripts
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString("base64")
}

// Content Security Policy Configuration
function generateCSP(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production"

  // Base CSP directives
  const directives = [
    // Default: deny everything not explicitly allowed
    "default-src 'self'",

    // Scripts: self + nonce for inline scripts (Next.js requires this)
    // unsafe-eval needed for Next.js development mode only
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,

    // Styles: self + unsafe-inline (Tailwind requires inline styles)
    "style-src 'self' 'unsafe-inline'",

    // Images: self + data URIs (for inline images) + blob (for PWA) + S3
    "img-src 'self' data: blob: https://*.s3.*.amazonaws.com",

    // Fonts: self only (next/font inlines fonts)
    "font-src 'self'",

    // Connect: self + Supabase + S3 + Cognito
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.s3.*.amazonaws.com https://cognito-idp.*.amazonaws.com",

    // Media: self + S3 (for audio files)
    "media-src 'self' https://*.s3.*.amazonaws.com blob:",

    // Object/Frame: deny
    "object-src 'none'",
    "frame-src 'none'",

    // Base URI: self only
    "base-uri 'self'",

    // Form actions: self only
    "form-action 'self'",

    // Frame ancestors: self only (prevents clickjacking)
    "frame-ancestors 'self'",

    // Block mixed content
    "block-all-mixed-content",

    // Upgrade insecure requests in production
    ...(isProd ? ["upgrade-insecure-requests"] : []),

    // Worker sources for PWA service worker
    "worker-src 'self' blob:",

    // Manifest for PWA
    "manifest-src 'self'",
  ]

  return directives.join("; ")
}

// Routes that require parent authentication
const protectedRoutes = ["/dashboard", "/children", "/onboarding", "/settings"]

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/signup"]

// Routes that are always public
const publicRoutes = ["/", "/callback", "/confirm"]

// Routes for kids interface (separate auth system)
const kidsPublicRoutes = ["/kids", "/kids/select"] // Note: /kids/login/[childId] is also public (checked dynamically) // Sélection profil enfant
const kidsProtectedRoutes = ["/kids/dashboard", "/kids/shop", "/kids/badges", "/kids/profile"]

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isKidsPublicRoute(pathname: string): boolean {
  // /kids et /kids/login/[childId] sont publics
  if (pathname === "/kids") return true
  if (pathname.match(/^\/kids\/login\/[^/]+$/)) return true
  return kidsPublicRoutes.some((route) => pathname === route)
}

function isKidsProtectedRoute(pathname: string): boolean {
  // Routes enfant protégées: /kids/[childId]/dashboard, shop, badges, profile
  if (pathname.match(/^\/kids\/[^/]+\/(dashboard|shop|badges|profile)$/)) return true
  return kidsProtectedRoutes.some((route) => pathname.startsWith(route))
}

function isKidsRoute(pathname: string): boolean {
  return pathname.startsWith("/kids")
}

// Vérifie la session enfant
function getKidsSession(request: NextRequest): { childId: string; firstName: string } | null {
  try {
    const sessionCookie = request.cookies.get("kids_session")?.value
    if (!sessionCookie) return null

    const session = JSON.parse(sessionCookie) as {
      childId: string
      firstName: string
      createdAt: number
    }

    // Vérifier l'expiration (4 heures)
    const SESSION_MAX_AGE = 60 * 60 * 4 * 1000
    if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
      return null
    }

    return { childId: session.childId, firstName: session.firstName }
  } catch {
    return null
  }
}

// Extrait le childId de l'URL /kids/[childId]/...
function extractChildIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/kids\/([^/]+)/)
  return match?.[1] || null
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

  // ============================================================
  // KIDS INTERFACE ROUTING
  // ============================================================
  if (isKidsRoute(pathname)) {
    const kidsSession = getKidsSession(request)
    const pathChildId = extractChildIdFromPath(pathname)

    // Routes publiques enfant (sélection profil, login)
    if (isKidsPublicRoute(pathname)) {
      // Si déjà connecté avec une session enfant, rediriger vers le dashboard
      if (kidsSession && pathname === "/kids") {
        return NextResponse.redirect(
          new URL(`/kids/${kidsSession.childId}/dashboard`, request.url)
        )
      }
      // Si sur la page login et déjà connecté pour cet enfant
      if (kidsSession && pathChildId === kidsSession.childId && pathname.endsWith("/login")) {
        return NextResponse.redirect(
          new URL(`/kids/${kidsSession.childId}/dashboard`, request.url)
        )
      }
      // Continuer normalement
    }

    // Routes protégées enfant (dashboard, shop, badges, profile)
    if (isKidsProtectedRoute(pathname)) {
      // Pas de session = rediriger vers sélection profil
      if (!kidsSession) {
        return NextResponse.redirect(new URL("/kids", request.url))
      }

      // Session pour un autre enfant = rediriger vers login de cet enfant
      if (pathChildId && pathChildId !== kidsSession.childId) {
        return NextResponse.redirect(
          new URL(`/kids/login/${pathChildId}`, request.url)
        )
      }
    }

    // Continue avec les headers de sécurité
    const response = NextResponse.next()
    const nonce = generateNonce()
    const csp = generateCSP(nonce)
    response.headers.set("Content-Security-Policy", csp)
    response.headers.set("X-Nonce", nonce)
    return response
  }

  // ============================================================
  // PARENT INTERFACE ROUTING
  // ============================================================

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

  // Generate CSP nonce and set security headers
  const nonce = generateNonce()
  const csp = generateCSP(nonce)

  // Set CSP header
  response.headers.set("Content-Security-Policy", csp)

  // Store nonce in header for potential use by React components
  response.headers.set("X-Nonce", nonce)

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
