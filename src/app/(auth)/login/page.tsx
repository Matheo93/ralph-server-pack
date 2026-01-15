import { AuthForm } from "@/components/custom/auth-form"
import { CheckCircle2, Heart, Shield, Sparkles } from "lucide-react"

interface LoginPageProps {
  searchParams: Promise<{ magic?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const isMagicLink = params.magic === "true"

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-secondary/20 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-primary shadow-xl shadow-primary/30 flex items-center justify-center mb-6">
            <span className="text-4xl">👨‍👩‍👧</span>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-3">FamilyLoad</h2>
          <p className="text-lg text-muted-foreground text-center max-w-sm mb-10">
            Libérez votre charge mentale parentale et retrouvez la sérénité
          </p>

          {/* Features */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Tâches organisées</p>
                <p className="text-sm text-muted-foreground">Fini les oublis et le stress</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Charge équilibrée</p>
                <p className="text-sm text-muted-foreground">Répartition équitable entre parents</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Famille heureuse</p>
                <p className="text-sm text-muted-foreground">Plus de temps pour l&apos;essentiel</p>
              </div>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Données sécurisées • RGPD compliant</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center mb-4">
              <span className="text-3xl">👨‍👩‍👧</span>
            </div>
            <h1 className="text-2xl font-bold">FamilyLoad</h1>
            <p className="text-sm text-muted-foreground">Libérez votre charge mentale</p>
          </div>

          <AuthForm mode={isMagicLink ? "magic-link" : "login"} />
        </div>
      </div>
    </div>
  )
}
