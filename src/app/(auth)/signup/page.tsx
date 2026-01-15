import { AuthForm } from "@/components/custom/auth-form"
import { CheckCircle2, Clock, Users, Zap } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-32 left-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-secondary/20 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-primary shadow-xl shadow-primary/30 flex items-center justify-center mb-6">
            <span className="text-4xl">👨‍👩‍👧</span>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-3">Rejoignez FamilyLoad</h2>
          <p className="text-lg text-muted-foreground text-center max-w-sm mb-10">
            14 jours d&apos;essai gratuit, sans engagement
          </p>

          {/* Benefits */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Prêt en 2 minutes</p>
                <p className="text-sm text-muted-foreground">Commencez à souffler dès maintenant</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Fini le "c'est toujours moi"</p>
                <p className="text-sm text-muted-foreground">Partagez équitablement avec votre partenaire</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">500+ tâches prêtes</p>
                <p className="text-sm text-muted-foreground">Templates par âge de vos enfants</p>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-10 text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Recommandé par des familles comme la vôtre
            </p>
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
            <p className="text-sm text-muted-foreground">14 jours d&apos;essai gratuit</p>
          </div>

          <AuthForm mode="signup" />
        </div>
      </div>
    </div>
  )
}
