import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { TasksListStream, TasksListSkeleton, StreamingErrorBoundary } from "@/components/streaming"
import { TemplateSelector } from "@/components/custom/TemplateSelector"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tâches</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez vos tâches familiales
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tasks/today">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Aujourd&apos;hui
            </Button>
          </Link>
          <TemplateSelector>
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
          </TemplateSelector>
          <Link href="/tasks/new">
            <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Nouvelle tâche
            </Button>
          </Link>
        </div>
      </div>

      <StreamingErrorBoundary sectionName="liste des tâches">
        <Suspense fallback={<TasksListSkeleton />}>
          <TasksListStream
            status={params.status}
            priority={params.priority}
            child_id={params.child_id}
            category_id={params.category_id}
            search={params.search}
          />
        </Suspense>
      </StreamingErrorBoundary>
    </div>
  )
}
