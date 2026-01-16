import { getUserId } from "@/lib/auth/actions"
import { redirect } from "next/navigation"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TemplateList } from "@/components/custom/TemplateList"
import { TemplateSwitches } from "@/components/custom/TemplateSwitches"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { allTemplatesFR, TEMPLATES_COUNT_FR } from "@/lib/data/templates-fr"
import type { TaskTemplate, TemplateWithSettings } from "@/types/template"

interface Child {
  id: string
  first_name: string
  birthdate: string
}

function calculateAge(birthdate: string): number {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

async function getTemplatesData(): Promise<{
  templates: TemplateWithSettings[]
  children: (Child & { age: number })[]
  householdId: string | null
}> {
  const userId = await getUserId()
  if (!userId) return { templates: [], children: [], householdId: null }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return { templates: [], children: [], householdId: null }

  const householdId = membership.household_id

  // Get children
  const childrenData = await query<Child>(`
    SELECT id, first_name, to_char(birthdate, 'YYYY-MM-DD') as birthdate
    FROM children
    WHERE household_id = $1 AND is_active = true
    ORDER BY birthdate DESC
  `, [householdId])

  const children = childrenData.map((c) => ({
    ...c,
    age: calculateAge(c.birthdate),
  }))

  // Get all children's ages to filter applicable templates
  const ages = children.map((c) => c.age)
  const minAge = ages.length > 0 ? Math.min(...ages) : 0
  const maxAge = ages.length > 0 ? Math.max(...ages) : 18

  // Use static templates (DB templates would require admin seeding)
  const applicableTemplates = allTemplatesFR.filter(
    (t) => t.age_min <= maxAge && t.age_max >= minAge
  )

  // Convert to TemplateWithSettings format
  const templates: TemplateWithSettings[] = applicableTemplates.map((t, i) => ({
    id: `static-${i}`,
    country: t.country ?? "FR",
    age_min: t.age_min,
    age_max: t.age_max,
    category: t.category,
    subcategory: t.subcategory ?? null,
    title: t.title,
    description: t.description ?? null,
    cron_rule: t.cron_rule ?? null,
    weight: t.weight ?? 3,
    days_before_deadline: t.days_before_deadline ?? 7,
    period: (t.period as TemplateWithSettings["period"]) ?? null,
    is_active: t.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    settings: null,
    effectiveDaysBefore: t.days_before_deadline ?? 7,
    effectiveWeight: t.weight ?? 3,
    isEnabledForHousehold: true,
  }))

  return { templates, children, householdId }
}

export default async function TemplatesSettingsPage() {
  const { templates, children, householdId } = await getTemplatesData()

  if (!householdId) {
    redirect("/onboarding")
  }

  // Group templates by category for stats
  const templatesByCategory: Record<string, number> = {}
  for (const t of templates) {
    templatesByCategory[t.category] = (templatesByCategory[t.category] ?? 0) + 1
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Retour aux paramètres
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Templates automatiques</h1>
        <p className="text-muted-foreground">
          Gérez les tâches générées automatiquement pour votre famille
        </p>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
            <CardDescription>
              Templates applicables à votre foyer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Templates actifs</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{children.length}</p>
                <p className="text-sm text-muted-foreground">Enfant{children.length !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(templatesByCategory).length}</p>
                <p className="text-sm text-muted-foreground">Catégories</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{TEMPLATES_COUNT_FR}</p>
                <p className="text-sm text-muted-foreground">Total catalogue</p>
              </div>
            </div>

            {children.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <Badge key={child.id} variant="outline">
                    {child.first_name} ({child.age} ans)
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Par catégorie</CardTitle>
            <CardDescription>
              Répartition des templates par type de tâche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(templatesByCategory).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="capitalize">{getCategoryLabel(category)}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Template list */}
        <Card>
          <CardHeader>
            <CardTitle>Tous les templates</CardTitle>
            <CardDescription>
              Parcourez et filtrez les templates applicables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateList
              templates={templates}
              showFilters
              compact
            />
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Comment ça marche ?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Les templates sont des modèles de tâches qui se génèrent automatiquement
              en fonction de l'âge de vos enfants et de la période de l'année.
            </p>
            <p>
              Par exemple, le template "Assurance scolaire" se déclenche chaque année
              en août pour tous les enfants entre 3 et 18 ans.
            </p>
            <p>
              Vous recevrez une notification avant chaque génération et pourrez
              confirmer ou ignorer la tâche proposée.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ecole: "École",
    sante: "Santé",
    administratif: "Administratif",
    quotidien: "Quotidien",
    social: "Social",
    activites: "Activités",
    logistique: "Logistique",
  }
  return labels[category] ?? category
}
