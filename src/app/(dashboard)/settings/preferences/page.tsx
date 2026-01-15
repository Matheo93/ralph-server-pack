import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser } from "@/lib/aws/database"
import { getAllCategoriesWithPreferences } from "@/lib/actions/settings"
import { AssignmentPreferences } from "@/components/custom/AssignmentPreferences"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SettingsNav } from "@/components/custom/SettingsNav"

export const metadata = {
  title: "Préférences d'assignation | FamilyLoad",
  description: "Définissez vos préférences de catégories de tâches",
}

export default async function PreferencesPage() {
  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  await setCurrentUser(userId)

  const categories = await getAllCategoriesWithPreferences()

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux paramètres
          </Link>
        </Button>
      </div>

      <SettingsNav current="preferences" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Préférences d&apos;assignation</h1>
        <p className="text-muted-foreground">
          Indiquez vos préférences pour chaque catégorie de tâches.
          L&apos;algorithme d&apos;assignation automatique en tiendra compte.
        </p>
      </div>

      <AssignmentPreferences categories={categories} />
    </div>
  )
}
