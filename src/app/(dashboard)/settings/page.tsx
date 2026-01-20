import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Home, Dumbbell, Bell, FileText, Shield, ChevronRight, Trash2, Sparkles, CreditCard, CalendarOff } from "lucide-react"

const SETTINGS_SECTIONS = [
  {
    title: "Profil",
    description: "Nom, langue et préférences",
    href: "/settings/profile",
    icon: User,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    title: "Foyer",
    description: "Membres et invitations",
    href: "/settings/household",
    icon: Home,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  {
    title: "Espace Enfants",
    description: "Tâches et récompenses",
    href: "/settings/kids",
    icon: Sparkles,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
  {
    title: "Préférences",
    description: "Assignation par catégorie",
    href: "/settings/preferences",
    icon: Dumbbell,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    title: "Notifications",
    description: "Rappels et alertes",
    href: "/settings/notifications",
    icon: Bell,
    color: "text-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
  },
  {
    title: "Templates",
    description: "Tâches automatiques",
    href: "/settings/templates",
    icon: FileText,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    title: "Abonnement",
    description: "Facturation et paiements",
    href: "/settings/billing",
    icon: CreditCard,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    title: "Exclusions",
    description: "Indisponibilités temporaires",
    href: "/settings/exclusions",
    icon: CalendarOff,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    title: "Confidentialité",
    description: "Données et sécurité",
    href: "/settings/privacy",
    icon: Shield,
    color: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-950/30",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
]

export default function SettingsPage() {
  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et les paramètres de votre foyer
        </p>
      </div>

      {/* Grid layout for settings */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className={`h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${section.borderColor} hover:scale-[1.02] group`}>
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardDescription className="text-sm">{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Danger zone */}
      <div className="pt-8 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">Zone de danger</h2>
        </div>
        <Card className="border-2 border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supprimer mon compte</CardTitle>
            <CardDescription>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
