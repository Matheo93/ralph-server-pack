"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils/index"
import {
  getMilestonesForChild,
  getNextBirthday,
  getCelebrationMilestones,
  milestoneCategories,
  type MilestoneCategory,
  type Milestone,
} from "@/lib/data/child-milestones"
import {
  getVaccinationsDue,
  formatAge,
  getVaccinationDueDate,
  type VaccinationItem,
} from "@/lib/data/vaccination-calendar"
import {
  Baby,
  MessageCircle,
  Heart,
  Brain,
  GraduationCap,
  Stethoscope,
  PartyPopper,
  Cake,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Syringe,
  Info,
  Sparkles,
} from "lucide-react"

interface ChildMilestonesProps {
  childId: string
  childName: string
  birthdate: string
  className?: string
}

type TabValue = "overview" | "milestones" | "vaccinations" | "celebrations"

// Helper function to format age in months to human-readable string
function formatAgeMonths(ageMonths: number): string {
  if (ageMonths < 12) {
    return `${ageMonths} mois`
  }
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (months === 0) {
    return `${years} an${years > 1 ? "s" : ""}`
  }
  return `${years} an${years > 1 ? "s" : ""} ${months} mois`
}

// Icon mapping for categories
const categoryIcons: Record<MilestoneCategory, React.ReactNode> = {
  moteur: <Baby className="h-4 w-4" />,
  langage: <MessageCircle className="h-4 w-4" />,
  social: <Heart className="h-4 w-4" />,
  cognitif: <Brain className="h-4 w-4" />,
  ecole: <GraduationCap className="h-4 w-4" />,
  sante: <Stethoscope className="h-4 w-4" />,
  celebration: <PartyPopper className="h-4 w-4" />,
}

export function ChildMilestones({
  childId,
  childName,
  birthdate,
  className,
}: ChildMilestonesProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("overview")
  const birthdateObj = new Date(birthdate)
  const age = formatAge(birthdateObj)

  // Get data
  const milestones = getMilestonesForChild(birthdateObj, 12, 6)
  const vaccinations = getVaccinationsDue(birthdateObj)
  const nextBirthday = getNextBirthday(birthdateObj)
  const celebrations = getCelebrationMilestones(birthdateObj, 12)

  // Counts
  const currentMilestones = milestones.filter((m) => m.status === "current")
  const upcomingMilestones = milestones.filter((m) => m.status === "upcoming")
  const dueVaccinations = vaccinations.filter(
    (v) => v.status === "due" || v.status === "overdue"
  )

  // Days until birthday
  const daysUntilBirthday = Math.ceil(
    (nextBirthday.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Age and Birthday Banner */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{childName}</h3>
              <p className="text-sm text-muted-foreground">{age}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm">
                <Cake className="h-4 w-4 text-pink-500" />
                <span>
                  {nextBirthday.age} ans dans{" "}
                  <span className="font-semibold">{daysUntilBirthday} jours</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {nextBirthday.date.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="milestones">
            Jalons
            {currentMilestones.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {currentMilestones.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            Vaccins
            {dueVaccinations.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {dueVaccinations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="celebrations">Fêtes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <QuickStatCard
              icon={<Sparkles className="h-5 w-5 text-amber-500" />}
              title="Jalons actuels"
              value={currentMilestones.length}
              description={
                currentMilestones.length > 0
                  ? currentMilestones[0]?.title ?? "Aucun jalon en cours"
                  : "Aucun jalon en cours"
              }
              onClick={() => setActiveTab("milestones")}
            />
            <QuickStatCard
              icon={<Syringe className="h-5 w-5 text-red-500" />}
              title="Vaccins à faire"
              value={dueVaccinations.length}
              description={
                dueVaccinations.length > 0
                  ? dueVaccinations[0]?.nameShort ?? "À jour"
                  : "À jour"
              }
              variant={dueVaccinations.length > 0 ? "warning" : "default"}
              onClick={() => setActiveTab("vaccinations")}
            />
            <QuickStatCard
              icon={<Calendar className="h-5 w-5 text-blue-500" />}
              title="Prochaine fête"
              value={celebrations.length > 0 ? 1 : 0}
              description={celebrations[0]?.title ?? "Aucune à venir"}
              onClick={() => setActiveTab("celebrations")}
            />
          </div>

          {/* Current Milestones Preview */}
          {currentMilestones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Jalons du moment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentMilestones.slice(0, 3).map((milestone) => (
                  <MilestoneItem key={milestone.id} milestone={milestone} compact />
                ))}
                {currentMilestones.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab("milestones")}
                  >
                    Voir tous les {currentMilestones.length} jalons
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Urgent Vaccinations */}
          {dueVaccinations.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Vaccins à programmer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dueVaccinations.slice(0, 2).map((vaccine) => (
                  <VaccinationItem
                    key={vaccine.id}
                    vaccine={vaccine}
                    birthdate={birthdateObj}
                    compact
                  />
                ))}
                {dueVaccinations.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-700"
                    onClick={() => setActiveTab("vaccinations")}
                  >
                    Voir tous les vaccins
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Category filter could be added here */}
          <div className="space-y-4">
            {/* Current */}
            {currentMilestones.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  En cours maintenant
                </h4>
                <div className="space-y-2">
                  {currentMilestones.map((milestone) => (
                    <MilestoneItem key={milestone.id} milestone={milestone} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcomingMilestones.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  À venir
                </h4>
                <div className="space-y-2">
                  {upcomingMilestones.map((milestone) => (
                    <MilestoneItem key={milestone.id} milestone={milestone} />
                  ))}
                </div>
              </div>
            )}

            {/* Passed */}
            {milestones.filter((m) => m.status === "passed").length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Passés récemment
                </h4>
                <div className="space-y-2">
                  {milestones
                    .filter((m) => m.status === "passed")
                    .map((milestone) => (
                      <MilestoneItem key={milestone.id} milestone={milestone} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="space-y-4">
          {/* Overdue */}
          {vaccinations.filter((v) => v.status === "overdue").length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                En retard
              </h4>
              <div className="space-y-2">
                {vaccinations
                  .filter((v) => v.status === "overdue")
                  .map((vaccine) => (
                    <VaccinationItem
                      key={vaccine.id}
                      vaccine={vaccine}
                      birthdate={birthdateObj}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Due now */}
          {vaccinations.filter((v) => v.status === "due").length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />À faire maintenant
              </h4>
              <div className="space-y-2">
                {vaccinations
                  .filter((v) => v.status === "due")
                  .map((vaccine) => (
                    <VaccinationItem
                      key={vaccine.id}
                      vaccine={vaccine}
                      birthdate={birthdateObj}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {vaccinations.filter((v) => v.status === "upcoming").length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                À venir (12 prochains mois)
              </h4>
              <div className="space-y-2">
                {vaccinations
                  .filter((v) => v.status === "upcoming")
                  .map((vaccine) => (
                    <VaccinationItem
                      key={vaccine.id}
                      vaccine={vaccine}
                      birthdate={birthdateObj}
                    />
                  ))}
              </div>
            </div>
          )}

          {vaccinations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>Tous les vaccins sont à jour !</p>
            </div>
          )}
        </TabsContent>

        {/* Celebrations Tab */}
        <TabsContent value="celebrations" className="space-y-4">
          {/* Next birthday */}
          <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center">
                  <Cake className="h-8 w-8 text-pink-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{nextBirthday.age} ans !</h4>
                  <p className="text-sm text-muted-foreground">
                    {nextBirthday.date.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-pink-600 mt-1">
                    Dans {daysUntilBirthday} jours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other celebrations */}
          {celebrations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Autres événements à venir
              </h4>
              {celebrations.map((celebration) => (
                <CelebrationItem key={celebration.id} celebration={celebration} />
              ))}
            </div>
          )}

          {celebrations.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <PartyPopper className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Pas d&apos;autre événement prévu dans les 12 prochains mois</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-components

interface QuickStatCardProps {
  icon: React.ReactNode
  title: string
  value: number
  description: string
  variant?: "default" | "warning"
  onClick?: () => void
}

function QuickStatCard({
  icon,
  title,
  value,
  description,
  variant = "default",
  onClick,
}: QuickStatCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        variant === "warning" && "border-amber-200 bg-amber-50/50"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
              {description}
            </p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

interface MilestoneItemProps {
  milestone: Milestone & { status: "passed" | "upcoming" | "current"; dueDate: Date }
  compact?: boolean
}

function MilestoneItem({ milestone, compact = false }: MilestoneItemProps) {
  const categoryInfo = milestoneCategories[milestone.category]
  const Icon = categoryIcons[milestone.category]

  const statusColors = {
    passed: "bg-gray-100 text-gray-600",
    current: "bg-amber-100 text-amber-700",
    upcoming: "bg-blue-100 text-blue-600",
  }

  const statusLabels = {
    passed: "Passé",
    current: "Maintenant",
    upcoming: "À venir",
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: categoryInfo.color + "20" }}
        >
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{milestone.title}</p>
          <p className="text-xs text-muted-foreground">{categoryInfo.label}</p>
        </div>
        <Badge variant="secondary" className={statusColors[milestone.status]}>
          {statusLabels[milestone.status]}
        </Badge>
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: categoryInfo.color + "20" }}
              >
                {Icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{milestone.title}</h4>
                  <Badge variant="secondary" className={statusColors[milestone.status]}>
                    {statusLabels[milestone.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {milestone.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span style={{ color: categoryInfo.color }}>
                    {categoryInfo.label}
                  </span>
                  <span>• {formatAgeMonths(milestone.ageMonths)}</span>
                </div>
              </div>
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon}
            {milestone.title}
          </DialogTitle>
          <DialogDescription>{milestone.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Catégorie</span>
            <Badge style={{ backgroundColor: categoryInfo.color + "20" }}>
              {categoryInfo.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Âge typique</span>
            <span>{formatAgeMonths(milestone.ageMonths)}</span>
          </div>
          {milestone.ageRange && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plage normale</span>
              <span>
                {milestone.ageRange.min} - {milestone.ageRange.max} mois
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date estimée</span>
            <span>
              {milestone.dueDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface VaccinationItemProps {
  vaccine: VaccinationItem & {
    status: "overdue" | "due" | "upcoming" | "completed"
  }
  birthdate: Date
  compact?: boolean
}

function VaccinationItem({ vaccine, birthdate, compact = false }: VaccinationItemProps) {
  const dueDate = getVaccinationDueDate(birthdate, vaccine)

  const statusColors = {
    overdue: "bg-red-100 text-red-700 border-red-200",
    due: "bg-amber-100 text-amber-700 border-amber-200",
    upcoming: "bg-blue-100 text-blue-600 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
  }

  const statusLabels = {
    overdue: "En retard",
    due: "À faire",
    upcoming: "À venir",
    completed: "Fait",
  }

  const StatusIcon = {
    overdue: <AlertCircle className="h-4 w-4 text-red-500" />,
    due: <Clock className="h-4 w-4 text-amber-500" />,
    upcoming: <Calendar className="h-4 w-4 text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  }[vaccine.status]

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border",
          statusColors[vaccine.status]
        )}
      >
        <Syringe className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{vaccine.nameShort}</p>
        </div>
        {StatusIcon}
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow border",
            vaccine.status === "overdue" && "border-red-200",
            vaccine.status === "due" && "border-amber-200"
          )}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                  vaccine.status === "overdue" && "bg-red-100",
                  vaccine.status === "due" && "bg-amber-100",
                  vaccine.status === "upcoming" && "bg-blue-100",
                  vaccine.status === "completed" && "bg-green-100"
                )}
              >
                <Syringe className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{vaccine.nameShort}</h4>
                  <Badge variant="secondary" className={statusColors[vaccine.status]}>
                    {statusLabels[vaccine.status]}
                  </Badge>
                  {vaccine.mandatory && (
                    <Badge variant="outline" className="text-xs">
                      Obligatoire
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatAgeMonths(vaccine.ageMonths)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date prévue:{" "}
                  {dueDate.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            {vaccine.name}
          </DialogTitle>
          <DialogDescription>{vaccine.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Statut</span>
            <Badge className={statusColors[vaccine.status]}>
              {statusLabels[vaccine.status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Âge recommandé</span>
            <span>{formatAgeMonths(vaccine.ageMonths)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date prévue</span>
            <span>
              {dueDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Obligatoire</span>
            <span>{vaccine.mandatory ? "Oui" : "Non"}</span>
          </div>
          {vaccine.boosterOf && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rappel de</span>
              <span className="text-xs">{vaccine.boosterOf}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CelebrationItemProps {
  celebration: Milestone & { dueDate: Date }
}

function CelebrationItem({ celebration }: CelebrationItemProps) {
  const daysUntil = Math.ceil(
    (celebration.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const typeIcons = {
    birthday: <Cake className="h-5 w-5 text-pink-500" />,
    achievement: <Sparkles className="h-5 w-5 text-amber-500" />,
    school: <GraduationCap className="h-5 w-5 text-blue-500" />,
    health: <Stethoscope className="h-5 w-5 text-red-500" />,
  }

  const Icon = celebration.celebrationType
    ? typeIcons[celebration.celebrationType]
    : <PartyPopper className="h-5 w-5 text-pink-500" />

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            {Icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">{celebration.title}</h4>
            <p className="text-sm text-muted-foreground">
              {celebration.dueDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">
              {daysUntil > 0 ? `${daysUntil}j` : "Aujourd'hui"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
