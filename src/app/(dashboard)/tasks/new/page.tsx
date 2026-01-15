import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTaskCategories } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { TaskForm } from "@/components/custom/TaskForm"

export default async function NewTaskPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const [children, categories] = await Promise.all([
    getChildren(),
    getTaskCategories(),
  ])

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Nouvelle tâche</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Créez une nouvelle tâche manuellement
        </p>
      </div>

      <TaskForm children={children} categories={categories} mode="create" />
    </div>
  )
}
