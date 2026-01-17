import { redirect } from 'next/navigation'
import { getChildProfile, getXpHistory } from '@/lib/actions/kids-gamification'
import { getKidsSession, logoutChild } from '@/lib/actions/kids-auth'
import { ProfileCard } from './ProfileCard'
import { XpHistory } from './XpHistory'
import { LogoutButton } from './LogoutButton'

export default async function KidsProfilePage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const [profileResult, historyResult] = await Promise.all([
    getChildProfile(),
    getXpHistory(10),
  ])

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{profileResult.error}</p>
      </div>
    )
  }

  const {
    child,
    account,
    level,
    nextLevel,
    xpProgress,
    badgesUnlocked,
    badgesTotal,
    rank,
    totalSiblings,
  } = profileResult.data

  const xpHistory = historyResult.data ?? []

  return (
    <div className="min-h-screen p-4">
      {/* Carte profil principale */}
      <ProfileCard
        child={child}
        account={account}
        level={level}
        nextLevel={nextLevel}
        xpProgress={xpProgress}
        badgesUnlocked={badgesUnlocked}
        badgesTotal={badgesTotal}
        rank={rank}
        totalSiblings={totalSiblings}
      />

      {/* Stats détaillées */}
      <div className="grid grid-cols-2 gap-3 my-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
          <div className="text-3xl mb-1">📋</div>
          <div className="text-xl font-bold text-gray-800">
            {account.total_tasks_completed}
          </div>
          <div className="text-sm text-gray-500">Missions</div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-xl font-bold text-gray-800">
            {account.streak_best}
          </div>
          <div className="text-sm text-gray-500">Meilleur streak</div>
        </div>
      </div>

      {/* Historique XP */}
      {xpHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Derniers XP gagnés
          </h2>
          <XpHistory history={xpHistory} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <a
          href="/kids"
          className="block w-full py-4 px-6 bg-white/70 backdrop-blur-sm rounded-2xl text-center text-gray-700 font-medium shadow hover:bg-white/90 transition-colors"
        >
          🔄 Changer de profil
        </a>
        <LogoutButton />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Mon Profil',
}
