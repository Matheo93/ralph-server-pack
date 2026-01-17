import { redirect } from 'next/navigation'
import { getBadgesForChild, getLeaderboard } from '@/lib/actions/kids-gamification'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { BadgesGrid } from './BadgesGrid'
import { Leaderboard } from './Leaderboard'

export default async function KidsBadgesPage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const [badgesResult, leaderboardResult] = await Promise.all([
    getBadgesForChild(),
    getLeaderboard(),
  ])

  if (!badgesResult.success || !badgesResult.data) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{badgesResult.error}</p>
      </div>
    )
  }

  const { badges, totalXpFromBadges, unlockedCount } = badgesResult.data
  const leaderboard = leaderboardResult.data ?? []

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mes succès</h1>
        <p className="text-gray-500">
          {unlockedCount} badge{unlockedCount > 1 ? 's' : ''} sur {badges.length}
        </p>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-2xl font-bold text-gray-800">{unlockedCount}</div>
          <div className="text-sm text-gray-500">Badges</div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-gray-800">{totalXpFromBadges}</div>
          <div className="text-sm text-gray-500">XP bonus</div>
        </div>
      </div>

      {/* Tabs */}
      <BadgesGrid badges={badges} initialTab="badges" childId={session.childId}>
        <Leaderboard entries={leaderboard} currentChildId={session.childId} />
      </BadgesGrid>
    </div>
  )
}

export const metadata = {
  title: 'Mes Succès',
}
