import { redirect } from 'next/navigation'
import { getKidsDashboard, getKidsRoadmap } from '@/lib/actions/kids-tasks'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { RoadmapDashboard } from './RoadmapDashboard'
import { NewBadgeModal } from './NewBadgeModal'

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function KidsDashboardPage({ params }: PageProps) {
  const { childId } = await params

  // Récupérer les données du dashboard
  const dashboardResult = await getKidsDashboard()
  if (!dashboardResult.success || !dashboardResult.data) {
    redirect('/kids')
  }

  // Récupérer les tâches pour la roadmap
  const roadmapResult = await getKidsRoadmap(childId)

  const { child, account, level, nextLevel, completedToday, pendingProofs, newBadges } = dashboardResult.data

  return (
    <div className="min-h-screen flex flex-col">
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

      {/* Stats compactes - Style jeu vidéo */}
      <div className="px-4 py-3">
        <div className="flex gap-3">
          {/* Missions complétées */}
          <div className="flex-1 relative bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl p-3 text-center text-white shadow-xl overflow-hidden border-2 border-white/30">
            <div className="absolute inset-0 bg-white/10 animate-pulse" style={{ animationDuration: '2s' }} />
            <div className="relative">
              <div className="text-3xl mb-1 drop-shadow-lg">🏆</div>
              <div className="text-3xl font-black drop-shadow-md">{completedToday}</div>
              <div className="text-xs font-bold opacity-90 uppercase tracking-wider">Victoires!</div>
            </div>
          </div>

          {/* En attente */}
          <div className="flex-1 relative bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-400 rounded-2xl p-3 text-center text-white shadow-xl overflow-hidden border-2 border-white/30">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative">
              <div className="text-3xl mb-1 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>⏳</div>
              <div className="text-3xl font-black drop-shadow-md">{pendingProofs}</div>
              <div className="text-xs font-bold opacity-90 uppercase tracking-wider">En cours</div>
            </div>
          </div>

          {/* Streak */}
          <div className="flex-1 relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-400 rounded-2xl p-3 text-center text-white shadow-xl overflow-hidden border-2 border-white/30">
            <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-white/0 animate-pulse" style={{ animationDuration: '1.5s' }} />
            <div className="relative">
              <div className="text-3xl mb-1 drop-shadow-lg">🔥</div>
              <div className="text-3xl font-black drop-shadow-md">{account.streak_current}</div>
              <div className="text-xs font-bold opacity-90 uppercase tracking-wider">
                {account.streak_current > 1 ? 'Jours!' : 'Jour'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap principale */}
      <div className="flex-1 overflow-hidden">
        <RoadmapDashboard
          tasks={roadmapResult.success && roadmapResult.data ? roadmapResult.data.tasks : []}
          pendingReward={roadmapResult.success && roadmapResult.data ? roadmapResult.data.pendingReward : null}
          childId={childId}
          childName={child.first_name}
        />
      </div>

      {/* Modal pour nouveaux badges */}
      {newBadges.length > 0 && (
        <NewBadgeModal badges={newBadges} />
      )}
    </div>
  )
}

export const metadata = {
  title: 'Ma Quête',
}
