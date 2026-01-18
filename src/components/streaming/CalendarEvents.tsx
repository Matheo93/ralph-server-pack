import { startOfMonth, endOfMonth, format } from "date-fns"
import { getCalendarEvents, getEventsCountByDate } from "@/lib/actions/calendar"
import { getChildren } from "@/lib/actions/children"
import { getCurrentHouseholdMembers } from "@/lib/actions/household"
import { CalendarViewLazy } from "@/components/custom/calendar"
import { Skeleton } from "@/components/ui/skeleton"

interface CalendarEventsStreamProps {
  year: number
  month: number // 0-indexed
}

/**
 * Async component that fetches and displays calendar events.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function CalendarEventsStream({ year, month }: CalendarEventsStreamProps) {
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
    <CalendarViewLazy
      events={events}
      eventCounts={eventCounts}
      children={childrenList}
      householdMembers={householdMembers}
    />
  )
}

/**
 * Skeleton fallback for CalendarEventsStream
 */
export function CalendarEventsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded" shimmer />
        <Skeleton className="h-6 w-32" shimmer />
        <Skeleton className="h-8 w-8 rounded" shimmer />
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-4 w-8 mx-auto" shimmer />
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square p-2 rounded-lg border">
            <Skeleton className="h-4 w-4 mb-1" shimmer />
            {i % 5 === 0 && <Skeleton className="h-2 w-full rounded" shimmer />}
          </div>
        ))}
      </div>
    </div>
  )
}
