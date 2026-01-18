import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { ChildrenListStream, ChildrenListSkeleton, StreamingErrorBoundary } from "@/components/streaming"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ChildrenPage() {
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
      {/* Header - renders immediately */}
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

      {/* Main content - streams independently */}
      <StreamingErrorBoundary sectionName="liste des enfants">
        <Suspense fallback={<ChildrenListSkeleton />}>
          <ChildrenListStream />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
