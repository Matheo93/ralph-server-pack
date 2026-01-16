import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import {
  getOrCreateActiveList,
  getShoppingItems,
  getShoppingSuggestions,
  getShoppingStats,
} from "@/lib/actions/shopping"
import { ShoppingList } from "@/components/custom/shopping"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, CheckCircle2, AlertCircle, Tags } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ShoppingPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const [list, stats, suggestions] = await Promise.all([
    getOrCreateActiveList(),
    getShoppingStats(),
    getShoppingSuggestions(10),
  ])

  if (!list) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Erreur lors du chargement de la liste de courses
          </p>
        </div>
      </div>
    )
  }

  const items = await getShoppingItems(list.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Liste de courses</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gerez vos courses en famille
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coches</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.checkedItems}</div>
            <p className="text-xs text-muted-foreground">fait{stats.checkedItems > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgents</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.urgentItems}</div>
            <p className="text-xs text-muted-foreground">prioritaire{stats.urgentItems > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">differentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Shopping list */}
      <Card>
        <CardContent className="pt-6">
          <ShoppingList list={list} items={items} suggestions={suggestions} />
        </CardContent>
      </Card>
    </div>
  )
}
