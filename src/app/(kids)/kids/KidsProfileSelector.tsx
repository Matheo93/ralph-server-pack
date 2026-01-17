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

// Couleurs de fond aléatoires pour les avatars sans image
const avatarColors = [
  'bg-gradient-to-br from-pink-400 to-rose-500',
  'bg-gradient-to-br from-orange-400 to-amber-500',
  'bg-gradient-to-br from-yellow-400 to-lime-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-cyan-400 to-blue-500',
  'bg-gradient-to-br from-violet-400 to-purple-500',
]

function getAvatarColor(index: number): string {
  const color = avatarColors[index % avatarColors.length]
  return color ?? 'bg-gradient-to-br from-pink-400 to-rose-500'
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {children.map((child, index) => (
          <motion.button
            key={child.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectChild(child.id)}
            className="flex flex-col items-center p-4 sm:p-6 bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-4 focus:ring-pink-300"
          >
            {/* Avatar */}
            <div className="relative mb-3">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-md">
                {child.avatar_url ? (
                  <AvatarImage src={child.avatar_url} alt={child.first_name} />
                ) : null}
                <AvatarFallback
                  className={`${getAvatarColor(index)} text-white text-2xl sm:text-3xl font-bold`}
                >
                  {getInitials(child.first_name)}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de compte actif */}
              {child.has_account && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>

            {/* Nom */}
            <span className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-full">
              {child.first_name}
            </span>

            {/* Sous-texte */}
            <span className="text-sm text-gray-500 mt-1">
              Appuie pour entrer
            </span>
          </motion.button>
        ))}
      </div>

      {/* Message si un seul enfant */}
      {children.length === 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-500 mt-6"
        >
          Bienvenue {children[0]?.first_name} ! Appuie sur ton profil pour continuer.
        </motion.p>
      )}
    </div>
  )
}
