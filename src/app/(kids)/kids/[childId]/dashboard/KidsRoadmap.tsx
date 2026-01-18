"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Lock, Target, Check, Clock, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RoadmapTask {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: "pending" | "done"
  priority: string
  proof_status: "pending" | "approved" | "rejected" | null
  reward_type: "xp" | "immediate"
  reward_xp: number
  reward_immediate_text: string | null
  category_icon: string | null
  completed_at: string | null
}

interface KidsRoadmapProps {
  tasks: RoadmapTask[]
  childName: string
  onTaskClick: (task: RoadmapTask) => void
}

// Fun emoji decorations for the roadmap
const DECORATIVE_EMOJIS = ['🌟', '🎈', '🦋', '🌈', '🎪', '🎨', '🎭', '🎠', '🎡', '🎢', '🌸', '🍭', '🍬', '🧸', '🎀']

export function KidsRoadmap({ tasks, childName, onTaskClick }: KidsRoadmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentLevelRef = useRef<HTMLDivElement>(null)

  // Trouver le niveau actuel (première tâche pending sans proof ou avec proof rejected)
  const currentTaskIndex = tasks.findIndex(
    (t) => t.status === "pending" && (t.proof_status === null || t.proof_status === "rejected")
  )

  // Scroll automatique vers le niveau actuel au chargement
  useEffect(() => {
    if (currentLevelRef.current && scrollRef.current) {
      setTimeout(() => {
        currentLevelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }, 500)
    }
  }, [])

  const getTaskState = (task: RoadmapTask, index: number) => {
    if (task.status === "done" || task.proof_status === "approved") {
      return "completed"
    }
    if (task.proof_status === "pending") {
      return "waiting"
    }
    if (index === currentTaskIndex) {
      return "current"
    }
    if (index > currentTaskIndex && currentTaskIndex !== -1) {
      return "locked"
    }
    return "available"
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return "En retard!"
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    return `Dans ${diffDays} jours`
  }

  // Inverser l'ordre pour afficher de bas en haut
  const reversedTasks = [...tasks].reverse()

  return (
    <div className="relative w-full h-full">
      {/* Floating decorative emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {DECORATIVE_EMOJIS.slice(0, 8).map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-30"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-orange-100 via-yellow-50 to-transparent pb-4 pt-2">
        <motion.h2
          className="text-center text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-500 to-purple-600"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🗺️ Ta quête, {childName}! 🚀
        </motion.h2>
        <p className="text-center text-sm text-gray-600 mt-1">
          <motion.span
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ✨ Monte les niveaux en complétant tes missions! ✨
          </motion.span>
        </p>
      </div>

      {/* Zone scrollable */}
      <div
        ref={scrollRef}
        className="overflow-y-auto px-4 pb-32"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {/* Chemin */}
        <div className="relative flex flex-col items-center py-8">
          {/* Ligne de connexion - style arc-en-ciel */}
          <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-gradient-to-t from-pink-400 via-purple-400 via-blue-400 via-green-400 via-yellow-400 to-orange-400 -translate-x-1/2 rounded-full shadow-lg opacity-60" />
          {/* Ligne brillante au centre */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white -translate-x-1/2 opacity-50" />

          {/* Niveaux */}
          {reversedTasks.map((task, reversedIndex) => {
            const originalIndex = tasks.length - 1 - reversedIndex
            const state = getTaskState(task, originalIndex)
            const isCurrentLevel = originalIndex === currentTaskIndex

            return (
              <motion.div
                key={task.id}
                ref={isCurrentLevel ? currentLevelRef : null}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reversedIndex * 0.05 }}
                className={cn(
                  "relative z-10 mb-8",
                  reversedIndex % 2 === 0 ? "self-start ml-8" : "self-end mr-8"
                )}
              >
                {/* Connecteur vers la ligne centrale */}
                <div
                  className={cn(
                    "absolute top-1/2 h-0.5 w-8 -translate-y-1/2",
                    state === "completed" ? "bg-yellow-400" : "bg-gray-300",
                    reversedIndex % 2 === 0 ? "right-full" : "left-full"
                  )}
                />

                {/* Carte niveau */}
                <motion.button
                  onClick={() => state !== "locked" && onTaskClick(task)}
                  disabled={state === "locked"}
                  whileHover={state !== "locked" ? { scale: 1.05 } : {}}
                  whileTap={state !== "locked" ? { scale: 0.95 } : {}}
                  className={cn(
                    "relative flex flex-col items-center p-4 rounded-2xl shadow-lg transition-all min-w-[140px] max-w-[180px]",
                    state === "completed" && "bg-gradient-to-br from-yellow-400 to-orange-400 text-white",
                    state === "current" && "bg-gradient-to-br from-purple-500 to-pink-500 text-white ring-4 ring-purple-300 ring-opacity-50 animate-pulse",
                    state === "waiting" && "bg-gradient-to-br from-blue-400 to-cyan-400 text-white",
                    state === "available" && "bg-white text-gray-800 hover:shadow-xl",
                    state === "locked" && "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  )}
                >
                  {/* Icône état */}
                  <div className="absolute -top-3 -right-3">
                    {state === "completed" && (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}
                    {state === "current" && (
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Target className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                    {state === "waiting" && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Clock className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                    {state === "locked" && (
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Catégorie icône */}
                  <div className="text-3xl mb-2">
                    {task.category_icon || "📋"}
                  </div>

                  {/* Titre */}
                  <p className="text-sm font-bold text-center line-clamp-2 mb-1">
                    {task.title}
                  </p>

                  {/* Récompense */}
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    state === "completed" ? "bg-white/20" : "bg-black/10"
                  )}>
                    {task.reward_type === "immediate" ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Secret!
                      </span>
                    ) : (
                      <span>+{task.reward_xp} XP</span>
                    )}
                  </div>

                  {/* Deadline */}
                  {task.deadline && state !== "completed" && (
                    <p className="text-xs mt-1 opacity-75">
                      {formatDeadline(task.deadline)}
                    </p>
                  )}

                  {/* Label état */}
                  {state === "waiting" && (
                    <p className="text-xs mt-1 font-medium">
                      ⏳ En attente...
                    </p>
                  )}
                  {state === "current" && (
                    <p className="text-xs mt-1 font-medium animate-bounce">
                      👆 C'est ton tour!
                    </p>
                  )}
                </motion.button>

                {/* Particules pour niveau actuel */}
                {isCurrentLevel && (
                  <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                      animate={{ y: [-10, 10], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0 }}
                      className="absolute -top-4 left-1/4 text-xl"
                    >
                      ✨
                    </motion.div>
                    <motion.div
                      animate={{ y: [-10, 10], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                      className="absolute -top-2 right-1/4 text-xl"
                    >
                      ⭐
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )
          })}

          {/* Sommet - Objectif final avec animations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-4 text-center"
          >
            {/* Rayons de lumière */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-16 bg-gradient-to-t from-yellow-400/50 to-transparent"
                  style={{ transform: `rotate(${i * 60}deg)`, transformOrigin: 'bottom' }}
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-2 drop-shadow-lg"
            >
              🏆
            </motion.div>
            <motion.p
              className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-500"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🌟 Champion! 🌟
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Indicateur bas - Début */}
      <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-gray-500">↓ Départ ↓</p>
      </div>
    </div>
  )
}
