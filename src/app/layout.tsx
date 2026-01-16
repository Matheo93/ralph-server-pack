import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://familyload.fr"

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FamilyLoad - Gérez la charge mentale parentale en famille",
    template: "%s | FamilyLoad",
  },
  description:
    "Application d'organisation familiale pour réduire la charge mentale parentale. Créez des tâches à la voix, partagez-les entre co-parents et visualisez la répartition équitable. Essai gratuit 14 jours.",
  keywords: [
    "charge mentale parentale",
    "organisation famille",
    "tâches familiales",
    "application parents",
    "gestion tâches ménagères",
    "répartition tâches couple",
    "to-do list famille",
    "rappels parents",
    "équilibre vie famille",
    "parentalité partagée",
    "co-parentalité",
    "application familiale",
    "gestion familiale",
    "planification famille",
    "organisation parentale",
  ],
  authors: [{ name: "FamilyLoad", url: BASE_URL }],
  creator: "FamilyLoad",
  publisher: "FamilyLoad",
  manifest: "/manifest.json",
  category: "productivity",
  classification: "Business/Productivity",
  applicationName: "FamilyLoad",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FamilyLoad",
    startupImage: [
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 320px) and (device-height: 568px)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
  },
  openGraph: {
    type: "website",
    siteName: "FamilyLoad",
    title: "FamilyLoad - Gérez la charge mentale parentale en famille",
    description:
      "Réduisez votre charge mentale parentale. Créez des tâches à la voix, partagez-les et visualisez qui fait quoi. Essai gratuit 14 jours.",
    locale: "fr_FR",
    url: BASE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FamilyLoad - Gérez la charge mentale parentale en famille",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FamilyLoad - Gérez la charge mentale parentale",
    description:
      "Réduisez votre charge mentale. Créez des tâches à la voix, partagez-les entre co-parents. Essai gratuit.",
    creator: "@familyload",
    site: "@familyload",
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "FamilyLoad - Gérez la charge mentale parentale",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "fr-FR": BASE_URL,
      "fr": BASE_URL,
    },
  },
  verification: {
    google: process.env["GOOGLE_SITE_VERIFICATION"],
    yandex: process.env["YANDEX_VERIFICATION"],
    other: {
      "msvalidate.01": process.env["BING_VERIFICATION"] ?? "",
    },
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Aller au contenu principal
        </a>
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </body>
    </html>
  )
}
