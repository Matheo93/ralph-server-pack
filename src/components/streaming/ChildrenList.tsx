import { headers } from "next/headers"
import { getChildren } from "@/lib/actions/children"
import { ChildCard } from "@/components/custom/child-card"
import { ChildrenEmptyState } from "@/components/custom/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays children list.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function ChildrenListStream() {
  const children = await getChildren()

  // Get base URL for kids login
  const headersList = await headers()
  let host = headersList.get("host") ?? "localhost:3000"

  // Ensure port 3000 is included for IP addresses
  const isIP = /^\d+\.\d+\.\d+\.\d+/.test(host)
  if (isIP && !host.includes(":")) {
    host = `${host}:3000`
  }

  const isLocalOrIP = host.includes("localhost") || isIP
  const protocol = isLocalOrIP ? "http" : "https"
  const baseUrl = `${protocol}://${host}`

  if (children.length === 0) {
    return <ChildrenEmptyState />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {children.map((child) => (
        <ChildCard
          key={child.id}
          child={child}
          kidsLoginUrl={child.has_account ? `${baseUrl}/kids/login/${child.id}` : undefined}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton fallback for ChildrenListStream
 */
export function ChildrenListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-4 bg-card">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" shimmer />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-24" shimmer />
              <Skeleton className="h-4 w-16" shimmer />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" shimmer />
            <Skeleton className="h-4 w-3/4" shimmer />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" shimmer />
            <Skeleton className="h-9 w-20" shimmer />
          </div>
        </div>
      ))}
    </div>
  )
}
