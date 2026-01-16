import Link from "next/link"
import { IntroAnimation } from "@/components/custom/IntroAnimation"
import { MarketingHeader } from "@/components/custom/MarketingHeader"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <IntroAnimation>
    <div className="min-h-screen flex flex-col">
      {/* Marketing Header with smooth transitions */}
      <MarketingHeader />

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Marketing Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">F</span>
                </div>
                <span className="font-semibold text-xl">FamilyLoad</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Libérez votre charge mentale parentale avec l&apos;IA.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-3">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-foreground transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    CGU
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="mailto:contact@familyload.app"
                    className="hover:text-foreground transition-colors"
                  >
                    contact@familyload.app
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} FamilyLoad. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
    </IntroAnimation>
  )
}
