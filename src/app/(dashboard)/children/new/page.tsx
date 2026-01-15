import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { ChildForm } from "@/components/custom/child-form"
import { Button } from "@/components/ui/button"

export default async function NewChildPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/children">
          <Button variant="ghost" className="mb-4">
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">Ajouter un enfant</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Les tâches seront automatiquement générées selon son âge
        </p>
      </div>

      <div className="max-w-lg">
        <ChildForm mode="create" />
      </div>
    </div>
  )
}
