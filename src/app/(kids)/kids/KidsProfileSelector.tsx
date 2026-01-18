'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'

interface ChildProfile {
  id: string
  first_name: string
  avatar_url: string | null
  has_account: boolean
}

interface KidsProfileSelectorProps {
  children: ChildProfile[]
}

// Couleurs de fond vibrantes pour les avatars sans image
const avatarColors = [
  'bg-gradient-to-br from-pink-400 via-rose-400 to-red-400',
  'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400',
  'bg-gradient-to-br from-lime-400 via-green-400 to-emerald-400',
  'bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400',
  'bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-400',
  'bg-gradient-to-br from-purple-400 via-fuchsia-400 to-pink-400',
]

// Emojis décoratifs aléatoires par profil - plus variés et fun
const decorativeEmojis = ['🚀', '⭐', '🦄', '🎨', '🌈', '🎮', '🏆', '💎', '🦋', '🎪', '🌟', '🎈']

// Emojis de réaction au hover
const hoverEmojis = ['🎉', '✨', '💫', '🌟', '⚡']

function getAvatarColor(index: number): string {
  const color = avatarColors[index % avatarColors.length]
  return color ?? 'bg-gradient-to-br from-pink-400 via-rose-400 to-red-400'
}

function getDecoEmoji(index: number): string {
  return decorativeEmojis[index % decorativeEmojis.length] ?? '🌟'
}

function getHoverEmoji(index: number): string {
  return hoverEmojis[index % hoverEmojis.length] ?? '✨'
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function KidsProfileSelector({ children }: KidsProfileSelectorProps) {
  const router = useRouter()

  const handleSelectChild = (childId: string) => {
    router.push(`/kids/login/${childId}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-8">
        {children.map((child, index) => (
          <motion.button
            key={child.id}
            initial={{ opacity: 0, y: 40, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.18, type: 'spring', stiffness: 180, damping: 12 }}
            whileHover={{ scale: 1.12, y: -10, rotate: 3, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            whileTap={{ scale: 0.88, rotate: -3 }}
            onClick={() => handleSelectChild(child.id)}
            aria-label={`Se connecter en tant que ${child.first_name}`}
            className="relative flex flex-col items-center p-5 sm:p-8 bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl hover:shadow-3xl transition-all focus:outline-none focus:ring-4 focus:ring-pink-400 focus:ring-offset-2 border-4 border-white/60 group overflow-hidden"
          >
            {/* Animated background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200/0 via-purple-200/0 to-orange-200/0 group-hover:from-pink-200/40 group-hover:via-purple-200/30 group-hover:to-orange-200/40 transition-all duration-500 rounded-[2.5rem]" aria-hidden="true" />

            {/* Decorative background sparkles - more animated */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
              <span className="absolute top-2 left-2 text-2xl animate-ping" style={{ animationDuration: '1s' }}>✨</span>
              <span className="absolute top-3 right-3 text-xl animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.8s' }}>{getHoverEmoji(index)}</span>
              <span className="absolute bottom-3 left-3 text-xl animate-pulse" style={{ animationDelay: '0.2s' }}>💫</span>
              <span className="absolute bottom-4 right-4 text-lg animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.9s' }}>⭐</span>
            </div>

            {/* Avatar avec animation */}
            <div className="relative mb-4">
              {/* Glow effect derrière l'avatar */}
              <div className={`absolute inset-0 ${getAvatarColor(index)} rounded-full blur-lg opacity-50 scale-110 group-hover:opacity-70 transition-opacity`} aria-hidden="true" />

              <motion.div
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Avatar className="relative w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-lg ring-4 ring-white/30">
                  {child.avatar_url ? (
                    <AvatarImage src={child.avatar_url} alt={`Avatar de ${child.first_name}`} />
                  ) : null}
                  <AvatarFallback
                    className={`${getAvatarColor(index)} text-white text-3xl sm:text-4xl font-black`}
                    aria-hidden="true"
                  >
                    {getInitials(child.first_name)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Emoji décoratif flottant */}
              <motion.span
                className="absolute -top-2 -right-2 text-2xl"
                animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: index * 0.3 }}
                aria-hidden="true"
              >
                {getDecoEmoji(index)}
              </motion.span>

              {/* Indicateur de compte actif - plus visible */}
              {child.has_account && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
                  role="img"
                  aria-label="Compte configuré"
                >
                  <span className="text-white text-sm font-bold" aria-hidden="true">✓</span>
                </motion.div>
              )}
            </div>

            {/* Nom avec style fun */}
            <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent truncate max-w-full">
              {child.first_name}
            </span>

            {/* Bouton d'action animé - plus gros et attrayant */}
            <motion.div
              className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full shadow-xl relative overflow-hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-hidden="true"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="text-white text-base font-black flex items-center gap-2 relative z-10">
                C&apos;est moi ! <span className="text-xl animate-bounce" style={{ animationDuration: '0.6s' }}>👋</span>
              </span>
            </motion.div>
          </motion.button>
        ))}
      </div>

      {/* Message si un seul enfant - plus engageant */}
      {children.length === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-md"
          role="status"
          aria-live="polite"
        >
          <p className="text-gray-800 font-medium flex items-center justify-center gap-2">
            <span className="text-2xl animate-bounce" aria-hidden="true">👆</span>
            <span>Salut {children[0]?.first_name} ! Appuie sur ton profil pour jouer !</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }} aria-hidden="true">🎮</span>
          </p>
        </motion.div>
      )}
    </div>
  )
}
