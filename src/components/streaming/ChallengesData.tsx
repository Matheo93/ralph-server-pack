import { getChallenges, getChallengeTemplates } from "@/lib/actions/challenges"
import { getChildren } from "@/lib/actions/children"
import { ChallengesClient } from "@/app/(dashboard)/challenges/ChallengesClient"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Async component that fetches and displays challenges data.
 * Can be wrapped in Suspense for streaming SSR.
 */
export async function ChallengesDataStream() {
  const [challengesResult, templatesResult, householdChildren] = await Promise.all([
    getChallenges(),
    getChallengeTemplates(),
    getChildren(),
  ])

  const challenges = challengesResult.success ? challengesResult.data ?? [] : []
  const templates = templatesResult.success ? templatesResult.data ?? [] : []

  return (
    <ChallengesClient
      challenges={challenges}
      templates={templates}
      householdChildren={householdChildren}
    />
  )
}

/**
 * Skeleton fallback for ChallengesDataStream
 */
export function ChallengesDataSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-9 w-24" shimmer />
        <Skeleton className="h-9 w-28" shimmer />
        <Skeleton className="h-9 w-32" shimmer />
      </div>

      {/* Create button skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36" shimmer />
      </div>

      {/* Challenges grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" shimmer />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" shimmer />
                    <Skeleton className="h-3 w-20" shimmer />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" shimmer />
              </div>

              {/* Description */}
              <Skeleton className="h-4 w-full" shimmer />
              <Skeleton className="h-4 w-3/4" shimmer />

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" shimmer />
                  <Skeleton className="h-3 w-10" shimmer />
                </div>
                <Skeleton className="h-2 w-full rounded-full" shimmer />
              </div>

              {/* Reward */}
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-24" shimmer />
                <Skeleton className="h-8 w-20" shimmer />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
