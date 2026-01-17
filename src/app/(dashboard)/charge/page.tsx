import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import {
  getHouseholdBalance,
  getWeeklyChartData,
  getChargeHistory,
  getChargeByCategory,
} from "@/lib/services/charge"
import { canUseFeature } from "@/lib/services/subscription"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChargeBalance } from "@/components/custom/ChargeBalance"
import { ChargeWeekChart } from "@/components/custom/ChargeWeekChart"
import { ChargeHistoryCard } from "@/components/custom/ChargeHistoryCard"
import { ChargeCategoryBreakdown } from "@/components/custom/ChargeCategoryBreakdown"
import { ExportButtons } from "@/components/custom/ExportButtons"
import { Scale, TrendingUp, Layers, Sparkles, ArrowRight } from "lucide-react"

export default async function ChargePage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const householdData = household.households as { id: string; name: string } | null
  const householdId = householdData?.id ?? ""

  const [balance, weekChartData, chargeHistory, categoryData, isPremium] = await Promise.all([
    getHouseholdBalance(),
    getWeeklyChartData(),
    getChargeHistory(),
    getChargeByCategory(),
    canUseFeature(householdId, "pdf_export"),
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero section - USP highlight */}
      <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-primary/10 p-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-orange-500/10 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">Charge mentale</h1>
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Fonctionnalité unique
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                Visualisez et rééquilibrez la répartition des tâches dans <strong>{householdData?.name || "votre foyer"}</strong>.
                Une répartition équitable = une famille plus heureuse.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <ExportButtons isPremium={isPremium} />
            <Link href="/dashboard">
              <Button variant="outline" className="border-amber-200 hover:bg-amber-50">Retour</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards - Redesigned with colors */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Charge totale (7j)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{balance?.totalLoad ?? 0}</div>
            <p className="text-sm text-muted-foreground">points de charge</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balance?.isBalanced ? 'border-l-green-500 bg-gradient-to-br from-green-50/50' : 'border-l-red-500 bg-gradient-to-br from-red-50/50'} to-transparent hover:shadow-md transition-shadow`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${balance?.isBalanced ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                <Scale className={`w-4 h-4 ${balance?.isBalanced ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Répartition
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {balance?.members.map((m, i) => (
                <span key={m.userId} className={`text-2xl font-bold ${balance?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(m.percentage)}%{i < balance.members.length - 1 ? " / " : ""}
                </span>
              ))}
            </div>
            {balance && (
              <Badge
                variant={balance.isBalanced ? "secondary" : "destructive"}
                className={balance.isBalanced ? "bg-green-100 text-green-700 border-green-300" : balance.alertLevel === "warning" ? "bg-orange-500" : ""}
              >
                {balance.isBalanced ? "Équilibré" : "Déséquilibré"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-medium text-foreground/70">
                Catégories actives
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{categoryData.categories.length}</div>
            <p className="text-sm text-muted-foreground">types de tâches</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Balance widget */}
        {balance && <ChargeBalance balance={balance} />}

        {/* Week chart */}
        {weekChartData.length > 0 && <ChargeWeekChart data={weekChartData} />}
      </div>

      {/* Category breakdown */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Répartition par catégorie</h2>
        <ChargeCategoryBreakdown
          categories={categoryData.categories}
          totalLoad={categoryData.totalLoad}
        />
      </div>

      {/* History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {chargeHistory.length >= 2 && <ChargeHistoryCard history={chargeHistory} />}

        {/* Tips card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conseils pour mieux répartir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Identifiez les déséquilibres</p>
                <p className="text-sm text-muted-foreground">
                  Repérez les catégories où un parent gère plus de 60% des tâches
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Redistribuez progressivement</p>
                <p className="text-sm text-muted-foreground">
                  Commencez par les tâches les plus simples à déléguer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Utilisez l&apos;assignation automatique</p>
                <p className="text-sm text-muted-foreground">
                  L&apos;app peut assigner les nouvelles tâches au parent le moins chargé
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
