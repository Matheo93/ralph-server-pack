import { redirect } from 'next/navigation'
import { getChildProfile, getXpHistory } from '@/lib/actions/kids-gamification'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { ProfileCard } from './ProfileCard'
import { XpHistory } from './XpHistory'
import { LogoutButton } from './LogoutButton'
import { SoundToggle } from './SoundToggle'

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

      {/* Stats détaillées - Style gaming */}
      <div className="grid grid-cols-2 gap-3 my-6">
        <div className="bg-gradient-to-br from-blue-200 via-cyan-100 to-sky-100 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-blue-200/50 transform hover:scale-105 transition-transform">
          <div className="text-4xl mb-2 animate-pulse">📋</div>
          <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {account.total_tasks_completed}
          </div>
          <div className="text-sm font-bold text-blue-700">Missions réussies</div>
        </div>
        <div className="bg-gradient-to-br from-orange-200 via-red-100 to-pink-100 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-orange-200/50 transform hover:scale-105 transition-transform">
          <div className="text-4xl mb-2 animate-bounce" style={{ animationDuration: '1.5s' }}>🔥</div>
          <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {account.streak_best}
          </div>
          <div className="text-sm font-bold text-orange-700">Meilleur streak</div>
        </div>
      </div>

      {/* Historique XP - Style trésor */}
      {xpHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-3 flex items-center gap-2">
            <span className="text-2xl">💎</span> Derniers XP gagnés
          </h2>
          <XpHistory history={xpHistory} />
        </div>
      )}

      {/* Paramètres son */}
      <div className="mb-6">
        <h2 className="text-xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-3 flex items-center gap-2">
          <span className="text-2xl">⚙️</span> Paramètres
        </h2>
        <SoundToggle />
      </div>

      {/* Actions - Style boutons fun */}
      <div className="mt-8 space-y-3">
        <a
          href="/kids"
          className="block w-full py-4 px-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 backdrop-blur-sm rounded-3xl text-center font-bold text-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border-2 border-purple-200/50"
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
