import { redirect } from "next/navigation"
import { getHousehold } from "@/lib/actions/household"
import { getUser } from "@/lib/auth/actions"
import { HouseholdForm } from "@/components/custom/household-form"

export default async function OnboardingPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (household) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bienvenue sur FamilyLoad</h1>
          <p className="text-muted-foreground">
            Commençons par créer votre foyer
          </p>
        </div>
        <HouseholdForm />
      </div>
    </div>
  )
}
