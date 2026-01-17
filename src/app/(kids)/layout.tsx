import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | FamilyLoad Kids',
    default: 'FamilyLoad Kids',
  },
  description: 'Interface enfants de FamilyLoad - Accomplis tes missions et gagne des récompenses !',
  manifest: '/manifest.json',
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FED7AA', // Orange clair pour l'interface enfants
}

export default function KidsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100">
      {children}
    </div>
  )
}
