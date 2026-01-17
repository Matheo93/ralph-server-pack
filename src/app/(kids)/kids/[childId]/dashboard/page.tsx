import { redirect } from 'next/navigation'
import { getKidsDashboard } from '@/lib/actions/kids-tasks'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { KidsTaskList } from './KidsTaskList'
import { NewBadgeModal } from './NewBadgeModal'

export default async function KidsDashboardPage() {
  const result = await getKidsDashboard()

  if (!result.success || !result.data) {
    redirect('/kids')
  }

  const { child, account, level, nextLevel, todayTasks, completedToday, pendingProofs, newBadges } = result.data

  return (
    <div className="min-h-screen">
      {/* Header avec XP et niveau */}
      <KidsHeader
        firstName={child.first_name}
        avatarUrl={child.avatar_url}
        currentXp={account.current_xp}
        currentLevel={account.current_level}
        levelName={level.name}
        levelIcon={level.icon ?? '🌱'}
        xpForNextLevel={nextLevel?.xp_required ?? null}
        streakCurrent={account.streak_current}
      />

      {/* Contenu principal */}
      <main className="px-4">
        {/* Stats du jour - Style fun avec gradients et animations */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-200 via-teal-100 to-green-50 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-emerald-300/50 transform hover:scale-105 hover:rotate-1 transition-all duration-300 cursor-pointer group">
            <div className="text-5xl mb-2 group-hover:animate-bounce">🏆</div>
            <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{completedToday}</div>
            <div className="text-sm font-bold text-emerald-700 mt-1">Missions réussies !</div>
            {completedToday > 0 && <div className="text-xs text-emerald-600 mt-1">Bravo champion ! 🌟</div>}
          </div>
          <div className="bg-gradient-to-br from-amber-200 via-orange-100 to-yellow-50 backdrop-blur-sm rounded-3xl p-5 text-center shadow-xl border-2 border-amber-300/50 transform hover:scale-105 hover:-rotate-1 transition-all duration-300 cursor-pointer group">
            <div className="text-5xl mb-2 group-hover:animate-spin" style={{ animationDuration: '2s' }}>⏳</div>
            <div className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{pendingProofs}</div>
            <div className="text-sm font-bold text-amber-700 mt-1">En validation</div>
            {pendingProofs > 0 && <div className="text-xs text-amber-600 mt-1">Papa/Maman vérifie ! 👀</div>}
          </div>
        </div>

        {/* Titre section tâches - Plus dynamique avec effet fun */}
        <div className="flex items-center justify-between mb-5 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-white/70">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 flex items-center gap-2">
            <span className="text-2xl animate-pulse">🎯</span>
            {todayTasks.length > 0 ? 'Tes missions du jour' : 'Repos mérité !'}
          </h2>
          {todayTasks.length > 0 && (
            <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse">
              {todayTasks.filter(t => t.status === 'pending').length} à faire 💪
            </span>
          )}
        </div>

        {/* Liste des tâches ou message vide avec animation */}
        {todayTasks.length > 0 ? (
          <KidsTaskList tasks={todayTasks} childId={child.id} />
        ) : (
          <div className="bg-gradient-to-br from-yellow-200 via-orange-100 to-pink-200 backdrop-blur-sm rounded-3xl p-10 text-center shadow-2xl border-2 border-yellow-300/50 relative overflow-hidden">
            {/* Confetti background effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-8 text-2xl animate-bounce" style={{ animationDelay: '0s' }}>🎊</div>
              <div className="absolute top-12 right-12 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>🥳</div>
              <div className="absolute bottom-8 left-16 text-xl animate-bounce" style={{ animationDelay: '0.6s' }}>🎈</div>
              <div className="absolute bottom-12 right-8 text-2xl animate-bounce" style={{ animationDelay: '0.9s' }}>🎁</div>
            </div>
            <div className="relative z-10">
              <div className="text-8xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                Super champion ! 🌟
              </h3>
              <p className="text-gray-700 text-xl font-medium">
                Tu as terminé toutes tes missions !
              </p>
              <p className="text-gray-500 mt-3 text-lg">
                Reviens plus tard pour de nouvelles aventures ! 🚀
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <span className="text-3xl animate-pulse">🏅</span>
                <span className="text-3xl animate-pulse" style={{ animationDelay: '0.2s' }}>⭐</span>
                <span className="text-3xl animate-pulse" style={{ animationDelay: '0.4s' }}>💎</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal pour nouveaux badges */}
      {newBadges.length > 0 && (
        <NewBadgeModal badges={newBadges} />
      )}
    </div>
  )
}

export const metadata = {
  title: 'Mes Missions',
}
