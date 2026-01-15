import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTasks, getTaskCategories } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { TaskList } from "@/components/custom/TaskList"
import { TaskFilters } from "@/components/custom/TaskFilters"
import { Button } from "@/components/ui/button"

interface PageProps {
  searchParams: Promise<{
    status?: string
    priority?: string
    child_id?: string
    category_id?: string
    search?: string
  }>
}

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const params = await searchParams

  const [tasks, children, categories] = await Promise.all([
    getTasks({
      status: params.status ? [params.status as "pending" | "done" | "postponed" | "cancelled"] : ["pending", "postponed"],
      priority: params.priority ? [params.priority as "critical" | "high" | "normal" | "low"] : undefined,
      child_id: params.child_id ?? undefined,
      category_id: params.category_id ?? undefined,
      search: params.search ?? undefined,
    }),
    getChildren(),
    getTaskCategories(),
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tâches</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {tasks.length} tâche{tasks.length > 1 ? "s" : ""} à gérer
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks/today">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Aujourd&apos;hui
            </Button>
          </Link>
          <Link href="/tasks/new">
            <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Nouvelle tâche
            </Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<div>Chargement des filtres...</div>}>
        <TaskFilters
          children={children}
          categories={categories}
          className="mb-6"
        />
      </Suspense>

      <TaskList
        tasks={tasks}
        groupByDate
        emptyMessage="Aucune tâche ne correspond aux filtres"
      />
    </div>
  )
}
