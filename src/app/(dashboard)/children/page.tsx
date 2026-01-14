import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getChildren } from "@/lib/actions/children"
import { ChildCard } from "@/components/custom/child-card"
import { Button } from "@/components/ui/button"

export default async function ChildrenPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const children = await getChildren()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Enfants</h1>
          <p className="text-muted-foreground">
            Gérez les enfants de votre foyer
          </p>
        </div>
        <Link href="/children/new">
          <Button>Ajouter un enfant</Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Vous n&apos;avez pas encore ajouté d&apos;enfant
          </p>
          <Link href="/children/new">
            <Button>Ajouter votre premier enfant</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  )
}
