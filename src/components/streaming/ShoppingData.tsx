import {
  getOrCreateActiveList,
  getShoppingItems,
  getShoppingSuggestions,
  getShoppingStats,
} from "@/lib/actions/shopping"
import { ShoppingListLazy } from "@/components/custom/shopping"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, CheckCircle2, AlertCircle, Tags } from "lucide-react"

interface ShoppingDataStreamProps {
  userId: string
  userName: string
}

/**
 * Async component that fetches and displays shopping list data.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function ShoppingDataStream({ userId, userName }: ShoppingDataStreamProps) {
  const [list, stats, suggestions] = await Promise.all([
    getOrCreateActiveList(),
    getShoppingStats(),
    getShoppingSuggestions(10),
  ])

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Erreur lors du chargement de la liste de courses
        </p>
      </div>
    )
  }

  const items = await getShoppingItems(list.id)

  return (
    <>
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
            <CardTitle className="text-sm font-medium">Cochés</CardTitle>
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
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">différentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Shopping list */}
      <Card>
        <CardContent className="pt-6">
          <ShoppingListLazy
            list={list}
            items={items}
            suggestions={suggestions}
            userId={userId}
            userName={userName}
          />
        </CardContent>
      </Card>
    </>
  )
}

/**
 * Skeleton fallback for ShoppingDataStream
 */
export function ShoppingDataSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-16" shimmer />
              <Skeleton className="h-4 w-4" shimmer />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" shimmer />
              <Skeleton className="h-3 w-16" shimmer />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shopping list skeleton */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Add item input */}
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" shimmer />
            <Skeleton className="h-10 w-24" shimmer />
          </div>

          {/* Items list */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <Skeleton className="h-5 w-5 rounded" shimmer />
                <Skeleton className="h-4 flex-1" shimmer />
                <Skeleton className="h-6 w-16 rounded-full" shimmer />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
