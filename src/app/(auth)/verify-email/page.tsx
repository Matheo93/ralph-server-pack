import { Metadata } from "next"
import { redirect } from "next/navigation"
import { VerifyEmailForm } from "./VerifyEmailForm"
import { Mail, Shield } from "lucide-react"

export const metadata: Metadata = {
  title: "Vérifier votre email",
  description: "Entrez le code de confirmation reçu par email pour activer votre compte FamilyLoad.",
  robots: {
    index: false,
    follow: false,
  },
}

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  const email = params.email

  if (!email) {
    redirect("/signup")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
            <Mail className="w-12 h-12 text-primary" />
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-3 text-center">
            Vérifiez votre boîte mail
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-sm mb-10">
            Nous avons envoyé un code de confirmation à votre adresse email
          </p>

          {/* Tips */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Ouvrez votre email</p>
                <p className="text-sm text-muted-foreground">
                  Cherchez un email de FamilyLoad
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Copiez le code à 6 chiffres</p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez aussi vos spams
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Entrez le code ici</p>
                <p className="text-sm text-muted-foreground">
                  Et accédez à votre compte
                </p>
              </div>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Le code expire dans 24 heures</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Vérifiez votre email</h1>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Entrez le code reçu par email
            </p>
          </div>

          <VerifyEmailForm email={email} />
        </div>
      </div>
    </div>
  )
}
