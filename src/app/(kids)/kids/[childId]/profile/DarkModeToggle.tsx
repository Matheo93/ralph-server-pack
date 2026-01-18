'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'

const STORAGE_KEY = 'familyload-kids-dark-mode'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else if (stored === 'false') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      // Check system preference if no stored value
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newValue = !isDark
    setIsDark(newValue)
    localStorage.setItem(STORAGE_KEY, newValue ? 'true' : 'false')

    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!mounted) {
    return (
      <div className="w-full py-4 px-6 bg-gradient-to-r from-indigo-100 via-purple-100 to-violet-100 dark:from-indigo-900/50 dark:via-purple-900/50 dark:to-violet-900/50 rounded-3xl text-center font-bold text-indigo-700 dark:text-indigo-300 shadow-lg border-2 border-indigo-200/50 dark:border-indigo-700/50">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl">🌙</span>
          <span>Mode sombre</span>
        </div>
      </div>
    )
  }

  return (
    <motion.button
      onClick={toggleDarkMode}
      whileTap={{ scale: 0.95 }}
      className={`w-full py-4 px-6 rounded-3xl text-center font-bold shadow-lg transform hover:scale-105 transition-all border-2 flex items-center justify-center gap-3 ${
        isDark
          ? 'bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-violet-900/80 text-indigo-200 border-indigo-600/50'
          : 'bg-gradient-to-r from-indigo-100 via-purple-100 to-violet-100 text-indigo-700 border-indigo-200/50'
      }`}
      aria-pressed={isDark}
      aria-label={isDark ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
    >
      <motion.span
        className="text-2xl"
        animate={{ rotate: isDark ? 360 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {isDark ? '🌙' : '☀️'}
      </motion.span>
      <span>Mode {isDark ? 'sombre' : 'clair'}</span>
      <motion.div
        animate={{
          rotate: isDark ? [0, -10, 10, 0] : 0,
          scale: isDark ? [1, 1.1, 1] : 1
        }}
        transition={{ duration: 0.5, repeat: isDark ? Infinity : 0, repeatDelay: 3 }}
      >
        {isDark ? (
          <Moon className="w-6 h-6" />
        ) : (
          <Sun className="w-6 h-6" />
        )}
      </motion.div>
    </motion.button>
  )
}
