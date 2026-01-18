import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import {
  ShoppingDataStream,
  ShoppingDataSkeleton,
  StreamingErrorBoundary,
} from "@/components/streaming"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ShoppingPage() {
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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Liste de courses</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gérez vos courses en famille
        </p>
      </div>

      {/* Main content - streams independently */}
      <StreamingErrorBoundary sectionName="liste de courses">
        <Suspense fallback={<ShoppingDataSkeleton />}>
          <ShoppingDataStream
            userId={user.id}
            userName={user.email?.split("@")[0] ?? "Utilisateur"}
          />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
