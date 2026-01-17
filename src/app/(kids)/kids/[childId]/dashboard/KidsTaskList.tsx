'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { KidsTask } from '@/lib/actions/kids-tasks'
import { TaskCompletionModal } from './TaskCompletionModal'

interface KidsTaskListProps {
  tasks: KidsTask[]
  childId: string
}

const priorityColors = {
  critical: 'border-red-400 bg-red-50',
  high: 'border-orange-400 bg-orange-50',
  normal: 'border-gray-200 bg-white',
  low: 'border-gray-100 bg-gray-50',
} as const

type PriorityKey = keyof typeof priorityColors

const statusBadges = {
  pending: { label: 'À faire', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Validé ✓', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
} as const

function getPriorityColor(priority: string): string {
  if (priority in priorityColors) {
    return priorityColors[priority as PriorityKey]
  }
  return priorityColors.normal
}

export function KidsTaskList({ tasks, childId }: KidsTaskListProps) {
  const [selectedTask, setSelectedTask] = useState<KidsTask | null>(null)

  // Séparer les tâches pendantes des tâches complétées
  const pendingTasks = tasks.filter(t => t.status === 'pending' && !t.proof_status)
  const waitingTasks = tasks.filter(t => t.proof_status === 'pending')
  const completedTasks = tasks.filter(t => t.proof_status === 'approved' || t.status === 'done')

  const handleTaskClick = (task: KidsTask) => {
    // Ne permettre l'interaction que sur les tâches à faire
    if (task.status === 'pending' && !task.proof_status) {
      setSelectedTask(task)
    }
  }

  const handleCloseModal = () => {
    setSelectedTask(null)
  }

  return (
    <>
      <div className="space-y-3">
        {/* Tâches à faire */}
        <AnimatePresence>
          {pendingTasks.map((task, index) => (
            <motion.button
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTaskClick(task)}
              className={`w-full text-left rounded-2xl border-2 p-4 shadow-sm transition-shadow hover:shadow-md ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start gap-3">
                {/* Icône catégorie */}
                <div className="text-3xl flex-shrink-0">
                  {task.category_icon ?? '📋'}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-lg truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-pink-100 text-pink-600 rounded-full font-medium">
                      +{task.xp_value} XP
                    </span>
                    {task.deadline && (
                      <span className="text-xs text-gray-400">
                        Pour le {new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton action */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">✓</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Tâches en attente de validation */}
        {waitingTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">
              En attente de validation ({waitingTasks.length})
            </h3>
            {waitingTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4 mb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{task.category_icon ?? '📋'}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-700">{task.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadges['pending'].color}`}>
                      ⏳ {statusBadges['pending'].label}
                    </span>
                  </div>
                  <div className="text-3xl animate-pulse">📸</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tâches complétées */}
        {completedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">
              Terminées ({completedTasks.length})
            </h3>
            {completedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 mb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl opacity-60">{task.category_icon ?? '📋'}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-500 line-through">{task.title}</h4>
                  </div>
                  <div className="text-2xl">✅</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de complétion */}
      <AnimatePresence>
        {selectedTask && (
          <TaskCompletionModal
            task={selectedTask}
            childId={childId}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </>
  )
}
