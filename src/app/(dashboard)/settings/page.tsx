import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const SETTINGS_SECTIONS = [
  {
    title: "Profil",
    description: "Gérer votre nom, langue et préférences personnelles",
    href: "/settings/profile",
    icon: "👤",
  },
  {
    title: "Foyer",
    description: "Membres du foyer, invitations et paramètres du foyer",
    href: "/settings/household",
    icon: "🏠",
  },
  {
    title: "Notifications",
    description: "Configurer les rappels et alertes",
    href: "/settings/notifications",
    icon: "🔔",
  },
  {
    title: "Templates automatiques",
    description: "Gérer les tâches automatiques par âge et période",
    href: "/settings/templates",
    icon: "📋",
  },
]

export default function SettingsPage() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et les paramètres de votre foyer
        </p>
      </div>

      <div className="grid gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{section.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-4 text-destructive">Zone de danger</h2>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Supprimer mon compte</CardTitle>
            <CardDescription>
              Cette action est irréversible. Toutes vos données seront supprimées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
