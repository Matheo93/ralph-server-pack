import Link from "next/link"
import { getChildren } from "@/lib/actions/children"
import { getHousehold } from "@/lib/actions/household"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DashboardPage() {
  const [children, membership] = await Promise.all([
    getChildren(),
    getHousehold(),
  ])

  const household = membership?.households as {
    name: string
    streak_current: number
    streak_best: number
    subscription_status: string
  } | null

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue sur FamilyLoad
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Enfants</CardTitle>
            <CardDescription>Gérez votre foyer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{children.length}</p>
            <p className="text-sm text-muted-foreground">
              {children.length === 0
                ? "Aucun enfant"
                : children.length === 1
                  ? "1 enfant"
                  : `${children.length} enfants`}
            </p>
            {children.length === 0 && (
              <Link href="/children/new" className="mt-4 block">
                <Button variant="outline" className="w-full">
                  Ajouter un enfant
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Streak</CardTitle>
            <CardDescription>Jours consécutifs sans oubli</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">
              {household?.streak_current ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">
              Record: {household?.streak_best ?? 0} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tâches du jour</CardTitle>
            <CardDescription>À faire aujourd&apos;hui</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">
              Aucune tâche pour le moment
            </p>
            <Link href="/tasks" className="mt-4 block">
              <Button variant="outline" className="w-full">
                Voir les tâches
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {children.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Vos enfants</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const age = Math.floor(
                (new Date().getTime() - new Date(child.birthdate).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )
              return (
                <Card key={child.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{child.first_name}</CardTitle>
                    <CardDescription>
                      {age} an{age > 1 ? "s" : ""}
                      {child.school_class && ` - ${child.school_class}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/children/${child.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        Voir le profil
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
