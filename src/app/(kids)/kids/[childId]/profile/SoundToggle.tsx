'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { motion } from 'framer-motion'

const STORAGE_KEY = 'familyload-sounds-enabled'

export function SoundToggle() {
  const [isMuted, setIsMuted] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') {
      setIsMuted(true)
    }
  }, [])

  const toggleMute = () => {
    const newValue = !isMuted
    setIsMuted(newValue)
    localStorage.setItem(STORAGE_KEY, newValue ? 'false' : 'true')
  }

  if (!mounted) {
    return (
      <div className="w-full py-4 px-6 bg-gradient-to-r from-purple-100 via-violet-100 to-indigo-100 rounded-3xl text-center font-bold text-purple-700 shadow-lg border-2 border-purple-200/50">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl">🔊</span>
          <span>Sons du jeu</span>
        </div>
      </div>
    )
  }

  return (
    <motion.button
      onClick={toggleMute}
      whileTap={{ scale: 0.95 }}
      className={`w-full py-4 px-6 rounded-3xl text-center font-bold shadow-lg transform hover:scale-105 transition-all border-2 flex items-center justify-center gap-3 ${
        isMuted
          ? 'bg-gradient-to-r from-gray-100 via-slate-100 to-gray-100 text-gray-600 border-gray-200/50'
          : 'bg-gradient-to-r from-purple-100 via-violet-100 to-indigo-100 text-purple-700 border-purple-200/50'
      }`}
    >
      <span className="text-2xl">
        {isMuted ? '🔇' : '🔊'}
      </span>
      <span>Sons {isMuted ? 'désactivés' : 'activés'}</span>
      <motion.div
        animate={{ rotate: isMuted ? 0 : [0, 15, -15, 0] }}
        transition={{ duration: 0.5, repeat: isMuted ? 0 : Infinity, repeatDelay: 2 }}
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6" />
        ) : (
          <Volume2 className="w-6 h-6" />
        )}
      </motion.div>
    </motion.button>
  )
}
