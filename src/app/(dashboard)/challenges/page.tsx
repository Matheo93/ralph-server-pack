import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import {
  ChallengesDataStream,
  ChallengesDataSkeleton,
  StreamingErrorBoundary,
} from "@/components/streaming"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ChallengesPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold">Défis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Créez des défis motivants pour vos enfants
          </p>
        </div>
      </div>

      {/* Main content - streams independently */}
      <StreamingErrorBoundary sectionName="défis">
        <Suspense fallback={<ChallengesDataSkeleton />}>
          <ChallengesDataStream />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
