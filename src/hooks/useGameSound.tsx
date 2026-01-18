'use client'

import { useCallback, useRef, useEffect, useState, createContext, useContext, type ReactNode } from 'react'

export type SoundType =
  | 'success'
  | 'level-up'
  | 'treasure-open'
  | 'xp-gain'
  | 'badge-unlock'
  | 'challenge-complete'
  | 'purchase'
  | 'click'
  | 'error'

const SOUND_PATHS: Record<SoundType, string> = {
  'success': '/sounds/success.mp3',
  'level-up': '/sounds/level-up.mp3',
  'treasure-open': '/sounds/treasure-open.mp3',
  'xp-gain': '/sounds/xp-gain.mp3',
  'badge-unlock': '/sounds/badge-unlock.mp3',
  'challenge-complete': '/sounds/challenge-complete.mp3',
  'purchase': '/sounds/purchase.mp3',
  'click': '/sounds/click.mp3',
  'error': '/sounds/error.mp3',
}

const STORAGE_KEY = 'familyload-sounds-enabled'

export function useGameSound() {
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map())
  const [isMuted, setIsMuted] = useState(false)
  const initialized = useRef(false)

  // Load mute preference from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') {
      setIsMuted(true)
    }

    // Preload sounds
    if (!initialized.current) {
      initialized.current = true
      Object.entries(SOUND_PATHS).forEach(([key, path]) => {
        const audio = new Audio(path)
        audio.preload = 'auto'
        audio.volume = 0.5
        audioRefs.current.set(key as SoundType, audio)
      })
    }
  }, [])

  const play = useCallback((sound: SoundType) => {
    if (isMuted) return

    const audio = audioRefs.current.get(sound)
    if (audio) {
      // Clone audio for overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = 0.5
      clone.play().catch(() => {
        // Ignore autoplay errors (browser policy)
      })
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, newValue ? 'false' : 'true')
      }
      return newValue
    })
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, muted ? 'false' : 'true')
    }
  }, [])

  return {
    play,
    isMuted,
    toggleMute,
    setMuted
  }
}

// Context provider for shared sound state across components

interface GameSoundContextType {
  play: (sound: SoundType) => void
  isMuted: boolean
  toggleMute: () => void
}

const GameSoundContext = createContext<GameSoundContextType | null>(null)

export function GameSoundProvider({ children }: { children: ReactNode }) {
  const sound = useGameSound()

  return (
    <GameSoundContext.Provider value={sound}>
      {children}
    </GameSoundContext.Provider>
  )
}

export function useGameSoundContext() {
  const context = useContext(GameSoundContext)
  if (!context) {
    throw new Error('useGameSoundContext must be used within GameSoundProvider')
  }
  return context
}
