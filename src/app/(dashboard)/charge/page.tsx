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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChargeBalance } from "@/components/custom/ChargeBalance"
import { ChargeWeekChart } from "@/components/custom/ChargeWeekChart"
import { ChargeHistoryCard } from "@/components/custom/ChargeHistoryCard"
import { ChargeCategoryBreakdown } from "@/components/custom/ChargeCategoryBreakdown"

export default async function ChargePage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const [balance, weekChartData, chargeHistory, categoryData] = await Promise.all([
    getHouseholdBalance(),
    getWeeklyChartData(),
    getChargeHistory(),
    getChargeByCategory(),
  ])

  const householdData = household.households as { name: string } | null

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Charge mentale</h1>
          <p className="text-muted-foreground">
            Analyse de la r\u00e9partition des t\u00e2ches dans {householdData?.name || "votre foyer"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Retour au dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Charge totale (7j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{balance?.totalLoad ?? 0}</div>
            <p className="text-sm text-muted-foreground">points de charge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              R\u00e9partition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {balance?.members.map((m, i) => (
                <span key={m.userId} className="text-2xl font-bold">
                  {Math.round(m.percentage)}%{i < balance.members.length - 1 ? " / " : ""}
                </span>
              ))}
            </div>
            {balance && (
              <Badge
                variant={balance.alertLevel === "none" ? "secondary" : "destructive"}
                className={balance.alertLevel === "warning" ? "bg-orange-500" : ""}
              >
                {balance.isBalanced ? "\u00c9quilibr\u00e9" : "D\u00e9s\u00e9quilibr\u00e9"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cat\u00e9gories actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categoryData.categories.length}</div>
            <p className="text-sm text-muted-foreground">types de t\u00e2ches</p>
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
        <h2 className="text-xl font-semibold mb-4">R\u00e9partition par cat\u00e9gorie</h2>
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
            <CardTitle className="text-lg">Conseils pour mieux r\u00e9partir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Identifiez les d\u00e9s\u00e9quilibres</p>
                <p className="text-sm text-muted-foreground">
                  Rep\u00e9rez les cat\u00e9gories o\u00f9 un parent g\u00e8re plus de 60% des t\u00e2ches
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
                  Commencez par les t\u00e2ches les plus simples \u00e0 d\u00e9l\u00e9guer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Utilisez l&apos;assignation automatique</p>
                <p className="text-sm text-muted-foreground">
                  L&apos;app peut assigner les nouvelles t\u00e2ches au parent le moins charg\u00e9
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
