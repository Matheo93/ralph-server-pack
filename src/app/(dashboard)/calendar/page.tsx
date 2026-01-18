import { redirect } from "next/navigation"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { getUser } from "@/lib/auth/actions"
import { getHousehold, getCurrentHouseholdMembers } from "@/lib/actions/household"
import { getCalendarEvents, getEventsCountByDate } from "@/lib/actions/calendar"
import { getChildren } from "@/lib/actions/children"
import { CalendarViewLazy, CalendarNotificationToggle } from "@/components/custom/calendar"

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

  const currentDate = new Date(year, month, 1)
  const startDate = startOfMonth(currentDate)
  const endDate = endOfMonth(currentDate)

  const [events, eventCounts, children, members] = await Promise.all([
    getCalendarEvents({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    }),
    getEventsCountByDate(
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ),
    getChildren(),
    getCurrentHouseholdMembers(),
  ])

  const householdMembers = members.map(m => ({
    user_id: m.user_id,
    name: m.user_name || null,
  }))

  const childrenList = children.map(c => ({
    id: c.id,
    first_name: c.first_name,
  }))

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Calendrier familial</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Tous les événements de la famille en un coup d'œil
          </p>
        </div>
        <CalendarNotificationToggle className="w-full sm:w-auto sm:min-w-[280px]" />
      </div>

      <CalendarViewLazy
        events={events}
        eventCounts={eventCounts}
        children={childrenList}
        householdMembers={householdMembers}
      />
    </div>
  )
}
