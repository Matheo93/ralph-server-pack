import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Fredoka } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Playful font for kids interface
const fredoka = Fredoka({
  variable: "--font-kids",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      // iPhone SE, iPod touch (640x1136)
      {
        url: "/splash/apple-splash-640-1136.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone 6/7/8 (750x1334)
      {
        url: "/splash/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone 6+/7+/8+ (1242x2208)
      {
        url: "/splash/apple-splash-1242-2208.png",
        media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone X/XS/11 Pro (1125x2436)
      {
        url: "/splash/apple-splash-1125-2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone XR/11 (828x1792)
      {
        url: "/splash/apple-splash-828-1792.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone XS Max/11 Pro Max (1242x2688)
      {
        url: "/splash/apple-splash-1242-2688.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12 mini/13 mini (1080x2340)
      {
        url: "/splash/apple-splash-1080-2340.png",
        media: "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12/12 Pro/13/13 Pro/14 (1170x2532)
      {
        url: "/splash/apple-splash-1170-2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12 Pro Max/13 Pro Max/14 Plus (1284x2778)
      {
        url: "/splash/apple-splash-1284-2778.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro (1179x2556)
      {
        url: "/splash/apple-splash-1179-2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro Max/15 Pro Max/15 Plus (1290x2796)
      {
        url: "/splash/apple-splash-1290-2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPad Mini (1536x2048)
      {
        url: "/splash/apple-splash-1536-2048.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPad Air (1668x2224)
      {
        url: "/splash/apple-splash-1668-2224.png",
        media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPad Pro 10.5"/11" (1668x2388)
      {
        url: "/splash/apple-splash-1668-2388.png",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPad Pro 12.9" (2048x2732)
      {
        url: "/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
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
        className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} antialiased`}
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
