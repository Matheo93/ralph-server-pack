import { getTasks, getTaskCategories } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { TaskList } from "@/components/custom/TaskList"
import { TaskFilters } from "@/components/custom/TaskFilters"
import { Skeleton } from "@/components/ui/skeleton"

interface TasksListStreamProps {
  status?: string
  priority?: string
  child_id?: string
  category_id?: string
  search?: string
}

/**
 * Async component that fetches and displays tasks list with filters.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function TasksListStream({
  status,
  priority,
  child_id,
  category_id,
  search,
}: TasksListStreamProps) {
  const [tasks, children, categories] = await Promise.all([
    getTasks({
      status: status ? [status as "pending" | "done" | "postponed" | "cancelled"] : ["pending", "postponed"],
      priority: priority ? [priority as "critical" | "high" | "normal" | "low"] : undefined,
      child_id: child_id ?? undefined,
      category_id: category_id ?? undefined,
      search: search ?? undefined,
    }),
    getChildren(),
    getTaskCategories(),
  ])

  return (
    <>
      <TaskFilters
        children={children}
        categories={categories}
        className="mb-6"
      />
      <TaskList
        tasks={tasks}
        groupByDate
        emptyMessage="Aucune tâche ne correspond aux filtres"
      />
    </>
  )
}

/**
 * Skeleton fallback for TasksListStream
 */
export function TasksListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" shimmer />
        ))}
      </div>

      {/* Tasks skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-3/4" shimmer />
              <Skeleton className="h-5 w-16 rounded-full" shimmer />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" shimmer />
              <Skeleton className="h-4 w-24" shimmer />
              <Skeleton className="h-4 w-16" shimmer />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-6 rounded-full" shimmer />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded" shimmer />
                <Skeleton className="h-8 w-8 rounded" shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
