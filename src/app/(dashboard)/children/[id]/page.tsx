import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { getUserId } from "@/lib/auth/actions"
import { getChild } from "@/lib/actions/children"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { calculateAge } from "@/lib/validations/child"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  GraduationCap,
  ListTodo,
  Sparkles,
  TrendingUp,
  User,
  Smartphone,
  Copy,
} from "lucide-react"
import { CopyLinkButton } from "./CopyLinkButton"

interface PageProps {
  params: Promise<{ id: string }>
}

interface ChildTask {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  completed_at: string | null
}

const schoolLevelLabels: Record<string, string> = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
}

export default async function ChildDetailPage({ params }: PageProps) {
  const { id } = await params

  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  const child = await getChild(id)
  if (!child) {
    notFound()
  }

  await setCurrentUser(userId)

  // Get household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
  `, [userId])

  if (!membership) {
    redirect("/onboarding")
  }

  // Check if child has a kids account (PIN configured)
  const kidsAccount = await queryOne<{ id: string }>(`
    SELECT id FROM child_accounts WHERE child_id = $1
  `, [id])
  const hasKidsAccount = !!kidsAccount

  // Get base URL for kids login link
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const isLocalOrIP = host.includes("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(host)
  const protocol = isLocalOrIP ? "http" : "https"
  const kidsLoginUrl = `${protocol}://${host}/kids/login/${id}`

  // Get tasks for this child with completed_at
  const tasks = await query<ChildTask>(`
    SELECT id, title, status, priority, deadline, completed_at
    FROM tasks
    WHERE child_id = $1 AND household_id = $2
    ORDER BY
      CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      COALESCE(completed_at, deadline, created_at) DESC
    LIMIT 100
  `, [id, membership.household_id])

  // Calculate stats
  const age = calculateAge(child.birthdate)
  const pendingTasks = tasks.filter((t) => t.status === "pending")
  const completedTasks = tasks.filter((t) => t.status === "done")
  const completedThisWeek = completedTasks.filter((t) => {
    if (!t.completed_at) return false
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(t.completed_at) > weekAgo
  })

  const totalTasksCount = tasks.length
  const completionRate =
    totalTasksCount > 0
      ? Math.round((completedTasks.length / totalTasksCount) * 100)
      : 0

  const initials = child.first_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/children">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux enfants
          </Link>
        </Button>
      </div>

      {/* Header with profile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
        <Avatar className="h-24 w-24 text-2xl">
          <AvatarImage src={child.avatar_url ?? undefined} alt={child.first_name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">{child.first_name}</h1>
            <Badge variant="secondary" className="w-fit">
              {age} an{age > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-muted-foreground text-sm">
            {child.gender && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {child.gender === "M" ? "Garçon" : "Fille"}
              </span>
            )}
            {child.birthdate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(child.birthdate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {(child.school_name || child.school_level) && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>
                {child.school_level && schoolLevelLabels[child.school_level]}
                {child.school_class && ` - ${child.school_class}`}
                {child.school_name && ` à ${child.school_name}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <Link href={`/children/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <Link href={`/children/${id}/timeline`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Timeline
            </Link>
          </Button>
        </div>
      </div>

      {/* Kids Space Access Card */}
      <Card className="mb-8 border-pink-200 bg-gradient-to-r from-pink-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-700">
            <Smartphone className="h-5 w-5" />
            Espace enfant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasKidsAccount ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {child.first_name} peut accéder à son espace personnel avec son code PIN.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Lien de connexion</p>
                  <code className="text-sm font-mono break-all text-pink-600">{kidsLoginUrl}</code>
                </div>
                <CopyLinkButton url={kidsLoginUrl} />
              </div>
              <p className="text-xs text-muted-foreground">
                Partagez ce lien avec {child.first_name} pour qu&apos;il puisse se connecter sur sa tablette ou téléphone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {child.first_name} n&apos;a pas encore de code PIN pour accéder à son espace.
              </p>
              <Button asChild className="bg-pink-500 hover:bg-pink-600">
                <Link href={`/children/${id}/edit`}>
                  Configurer le code PIN
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
            <p className="text-xs text-muted-foreground">tâche{pendingTasks.length > 1 ? "s" : ""} à faire</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Complétées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completedThisWeek.length}</p>
            <p className="text-xs text-muted-foreground">complétée{completedThisWeek.length > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taux complétion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <Progress value={completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tasks sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Tâches en cours
              </span>
              <Badge variant="secondary">{pendingTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Aucune tâche en cours pour {child.first_name}
              </p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        {task.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Échéance : {new Date(task.deadline).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                      {task.priority === "high" || task.priority === "critical" ? (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          {task.priority === "critical" ? "Critique" : "Haute"}
                        </Badge>
                      ) : null}
                    </div>
                  </Link>
                ))}
                {pendingTasks.length > 5 && (
                  <Link href={`/tasks?child_id=${id}`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Voir les {pendingTasks.length - 5} autres tâches
                    </Button>
                  </Link>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Button asChild className="w-full" size="sm">
                <Link href={`/tasks/new?child_id=${id}`}>
                  Ajouter une tâche pour {child.first_name}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Completed tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Dernières tâches complétées
              </span>
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Aucune tâche complétée pour {child.first_name}
              </p>
            ) : (
              <div className="space-y-3">
                {completedTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate line-through text-muted-foreground">
                          {task.title}
                        </p>
                        {task.completed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Complétée le {new Date(task.completed_at).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                  </Link>
                ))}
                {completedTasks.length > 5 && (
                  <Link href={`/tasks?child_id=${id}&status=done`}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Voir les {completedTasks.length - 5} autres tâches complétées
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tasks?child_id=${id}`}>
                <ListTodo className="mr-2 h-4 w-4" />
                Toutes les tâches
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/children/${id}/timeline`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Voir la timeline
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/children/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier le profil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
