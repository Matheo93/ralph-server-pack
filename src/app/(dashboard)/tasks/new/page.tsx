import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTaskCategories } from "@/lib/actions/tasks"
import { getChildren } from "@/lib/actions/children"
import { TaskForm } from "@/components/custom/TaskForm"
import { TemplateSelector } from "@/components/custom/TemplateSelector"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Nouvelle tache</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Creez une nouvelle tache manuellement
            </p>
          </div>
          <div className="flex gap-2">
            <TemplateSelector>
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Utiliser un template</span>
                <span className="sm:hidden">Template</span>
              </Button>
            </TemplateSelector>
            <Link href="/settings/templates">
              <Button variant="ghost" size="sm" className="sm:h-10 sm:px-4 text-muted-foreground">
                Voir tous les templates
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <TaskForm children={children} categories={categories} mode="create" />
    </div>
  )
}
