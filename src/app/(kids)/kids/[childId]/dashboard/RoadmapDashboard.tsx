"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { KidsRoadmap, type RoadmapTask } from "./KidsRoadmap"
import { TaskLevelModal } from "./TaskLevelModal"
import { RewardRevealModal } from "./RewardRevealModal"

interface PendingReward {
  taskId: string
  taskTitle: string
  rewardType: string
  xpAmount: number
  immediateText: string | null
  levelUp: boolean
  newLevel: number | null
  newLevelName: string | null
}

interface RoadmapDashboardProps {
  tasks: RoadmapTask[]
  pendingReward: PendingReward | null
  childId: string
  childName: string
}

export function RoadmapDashboard({
  tasks,
  pendingReward,
  childId,
  childName,
}: RoadmapDashboardProps) {
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<RoadmapTask | null>(null)
  const [showReward, setShowReward] = useState(false)
  const [currentReward, setCurrentReward] = useState<PendingReward | null>(null)

  // Afficher la récompense au chargement si disponible
  useEffect(() => {
    if (pendingReward) {
      setCurrentReward(pendingReward)
      setShowReward(true)
    }
  }, [pendingReward])

  const handleTaskClick = useCallback((task: RoadmapTask) => {
    setSelectedTask(task)
  }, [])

  const handleCloseTaskModal = useCallback(() => {
    setSelectedTask(null)
  }, [])

  const handleProofSubmitted = useCallback(() => {
    // Refresh la page pour voir le nouveau status
    router.refresh()
  }, [router])

  const handleCloseReward = useCallback(() => {
    setShowReward(false)
    setCurrentReward(null)
    // Refresh pour mettre à jour l'XP
    router.refresh()
  }, [router])

  return (
    <>
      {/* Roadmap */}
      <KidsRoadmap
        tasks={tasks}
        childName={childName}
        onTaskClick={handleTaskClick}
      />

      {/* Modal détail tâche */}
      <TaskLevelModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={handleCloseTaskModal}
        childId={childId}
        onProofSubmitted={handleProofSubmitted}
      />

      {/* Modal récompense */}
      {currentReward && (
        <RewardRevealModal
          isOpen={showReward}
          onClose={handleCloseReward}
          taskTitle={currentReward.taskTitle}
          rewardType={currentReward.rewardType as "xp" | "immediate"}
          xpAmount={currentReward.xpAmount}
          immediateText={currentReward.immediateText}
          levelUp={currentReward.levelUp}
          newLevel={currentReward.newLevel ?? undefined}
          newLevelName={currentReward.newLevelName ?? undefined}
        />
      )}

      {/* Message si pas de tâches - Fun et engageant */}
      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 min-h-[400px]">
          <div className="text-center relative">
            {/* Decorative floating elements */}
            <div className="absolute -top-8 -left-8 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🌟</div>
            <div className="absolute -top-4 -right-6 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
            <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎈</div>
            <div className="absolute -bottom-6 -right-8 text-4xl animate-bounce" style={{ animationDelay: '0.6s' }}>🦋</div>

            <div className="text-8xl mb-6 animate-pulse drop-shadow-lg">🎉</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 mb-3">
              Tu es un champion!
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              Toutes tes missions sont terminées! 🏆
            </p>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-pink-200">
              <p className="text-purple-700 font-medium">
                🚀 Reviens plus tard pour de nouvelles aventures!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
