import { redirect } from "next/navigation"

/**
 * Redirection from /auth/login to /login
 * Some external links or old bookmarks may point to /auth/login
 */
export default function AuthLoginRedirect() {
  redirect("/login")
}

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}
