import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { canUseFeature } from "@/lib/services/subscription"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExportButtons } from "@/components/custom/ExportButtons"
import {
  ChargeDataStream,
  ChargeDataSkeleton,
  StreamingErrorBoundary,
} from "@/components/streaming"
import { Scale, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Async component for export buttons (needs premium check)
async function ExportButtonsStream({ householdId }: { householdId: string }) {
  const isPremium = await canUseFeature(householdId, "pdf_export")
  return <ExportButtons isPremium={isPremium} />
}

export default async function ChargePage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const householdData = household.households as { id: string; name: string } | null
  const householdId = householdData?.id ?? ""
  const householdName = householdData?.name ?? "votre foyer"

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero section - renders immediately */}
      <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-primary/10 p-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-orange-500/10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">Charge mentale</h1>
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Fonctionnalité unique
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                Visualisez et rééquilibrez la répartition des tâches dans <strong>{householdName}</strong>.
                Une répartition équitable = une famille plus heureuse.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Suspense fallback={<div className="h-10 w-24 bg-muted animate-pulse rounded-md" />}>
              <ExportButtonsStream householdId={householdId} />
            </Suspense>
            <Link href="/dashboard">
              <Button variant="outline" className="border-amber-200 hover:bg-amber-50">Retour</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content - streams independently */}
      <StreamingErrorBoundary sectionName="données de charge">
        <Suspense fallback={<ChargeDataSkeleton />}>
          <ChargeDataStream householdId={householdId} householdName={householdName} />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
