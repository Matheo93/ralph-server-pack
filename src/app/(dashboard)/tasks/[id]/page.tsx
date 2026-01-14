import { redirect, notFound } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTask, getTaskCategories } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { TaskForm } from "@/components/custom/TaskForm"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: PageProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const { id } = await params
  const [task, children, categories] = await Promise.all([
    getTask(id),
    getChildren(),
    getTaskCategories(),
  ])

  if (!task) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Modifier la tâche</h1>
        <p className="text-muted-foreground">{task.title}</p>
      </div>

      <TaskForm
        children={children}
        categories={categories}
        task={task}
        mode="edit"
      />
    </div>
  )
}
