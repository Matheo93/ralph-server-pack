import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { CalendarEventsStream, CalendarEventsSkeleton, StreamingErrorBoundary } from "@/components/streaming"
import { CalendarNotificationToggle } from "@/components/custom/calendar"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const params = await searchParams
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()
  const month = params.month ? parseInt(params.month, 10) - 1 : new Date().getMonth()

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Calendrier familial</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Tous les événements de la famille en un coup d&apos;œil
          </p>
        </div>
        <CalendarNotificationToggle className="w-full sm:w-auto sm:min-w-[280px]" />
      </div>

      <StreamingErrorBoundary sectionName="calendrier">
        <Suspense fallback={<CalendarEventsSkeleton />}>
          <CalendarEventsStream year={year} month={month} />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
