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
  critical: 'border-red-300 bg-gradient-to-br from-red-50 via-pink-50 to-white shadow-red-100',
  high: 'border-orange-300 bg-gradient-to-br from-orange-50 via-yellow-50 to-white shadow-orange-100',
  normal: 'border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-white shadow-purple-100',
  low: 'border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-white shadow-sky-100',
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
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -150, rotate: -5 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTaskClick(task)}
              className={`w-full text-left rounded-3xl border-3 p-5 shadow-lg hover:shadow-xl transition-all ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start gap-4">
                {/* Icône catégorie avec animation */}
                <motion.div
                  className="text-4xl flex-shrink-0 bg-white/60 rounded-2xl w-14 h-14 flex items-center justify-center shadow-inner"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {task.category_icon ?? '📋'}
                </motion.div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-800 text-lg truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <motion.span
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold shadow-md"
                      whileHover={{ scale: 1.1 }}
                    >
                      ✨ +{task.xp_value} XP
                    </motion.span>
                    {task.deadline && (
                      <span className="text-xs px-2 py-1 bg-white/70 text-gray-600 rounded-full font-medium">
                        📅 {new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton action animé */}
                <motion.div
                  className="flex-shrink-0"
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white">
                    <span className="text-white text-2xl font-bold">GO!</span>
                  </div>
                </motion.div>
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
