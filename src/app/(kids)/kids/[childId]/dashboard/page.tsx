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
        {/* Stats du jour */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-gray-800">{completedToday}</div>
            <div className="text-sm text-gray-500">Complétées</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center shadow">
            <div className="text-3xl mb-1">⏳</div>
            <div className="text-2xl font-bold text-gray-800">{pendingProofs}</div>
            <div className="text-sm text-gray-500">En attente</div>
          </div>
        </div>

        {/* Titre section tâches */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {todayTasks.length > 0 ? 'Tes missions' : 'Pas de missions'}
          </h2>
          {todayTasks.length > 0 && (
            <span className="text-sm text-gray-500">
              {todayTasks.filter(t => t.status === 'pending').length} à faire
            </span>
          )}
        </div>

        {/* Liste des tâches ou message vide */}
        {todayTasks.length > 0 ? (
          <KidsTaskList tasks={todayTasks} childId={child.id} />
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 text-center shadow">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Bravo, tu as tout fait !
            </h3>
            <p className="text-gray-600">
              Tu n&apos;as pas de missions pour le moment. Reviens plus tard !
            </p>
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
