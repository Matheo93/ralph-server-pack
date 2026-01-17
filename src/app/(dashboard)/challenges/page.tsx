import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/actions'
import { getHousehold } from '@/lib/actions/household'
import { getChallenges, getChallengeTemplates } from '@/lib/actions/challenges'
import { getChildren } from '@/lib/actions/children'
import { ChallengesClient } from './ChallengesClient'

export default async function ChallengesPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const household = await getHousehold()

  if (!household) {
    redirect('/onboarding')
  }

  const [challengesResult, templatesResult, householdChildren] = await Promise.all([
    getChallenges(),
    getChallengeTemplates(),
    getChildren(),
  ])

  const challenges = challengesResult.success ? challengesResult.data ?? [] : []
  const templates = templatesResult.success ? templatesResult.data ?? [] : []

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Défis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Créez des défis motivants pour vos enfants
          </p>
        </div>
      </div>

      <ChallengesClient
        challenges={challenges}
        templates={templates}
        householdChildren={householdChildren}
      />
    </div>
  )
}
