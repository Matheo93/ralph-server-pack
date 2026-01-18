import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getUser } from "@/lib/auth/actions"
import { getHousehold, getCurrentHouseholdMembers } from "@/lib/actions/household"
import { getCalendarEventsHistory } from "@/lib/actions/calendar"
import { getChildren } from "@/lib/actions/children"
import { Button } from "@/components/ui/button"
import { EventHistoryList } from "@/components/custom/calendar/EventHistoryList"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CalendarHistoryPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const [initialData, children, members] = await Promise.all([
    getCalendarEventsHistory({
      limit: 20,
      offset: 0,
      sort_order: "desc",
    }),
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/calendar">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au calendrier
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Historique des événements</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Retrouvez tous les événements passés et à venir de votre famille
        </p>
      </div>

      <EventHistoryList
        initialData={initialData}
        children={childrenList}
        householdMembers={householdMembers}
      />
    </div>
  )
}
