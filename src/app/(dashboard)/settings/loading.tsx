import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="container max-w-4xl py-8 px-4 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="p-6 border-2 rounded-lg space-y-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="pt-8 border-t">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="p-6 border-2 border-red-200 rounded-lg space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
    </div>
  )
}
