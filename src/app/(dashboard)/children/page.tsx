import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getChildren } from "@/lib/actions/children"
import { ChildCard } from "@/components/custom/child-card"
import { ChildrenEmptyState } from "@/components/custom/EmptyState"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Enfants</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez les enfants de votre foyer
          </p>
        </div>
        <Link href="/children/new">
          <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2 w-full sm:w-auto">
            Ajouter un enfant
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <ChildrenEmptyState />
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
