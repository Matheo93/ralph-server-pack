'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

interface KidsBottomNavProps {
  childId: string
  pendingTasksCount?: number
  unreadBadgesCount?: number
  activeChallengesCount?: number
}

const navItems = [
  {
    href: (id: string) => `/kids/${id}/dashboard`,
    label: 'Missions',
    emoji: '🎯',
    activeEmoji: '🎯',
    activeColor: 'text-pink-500',
    activeBg: 'bg-pink-100',
    badge: 'tasks',
  },
  {
    href: (id: string) => `/kids/${id}/challenges`,
    label: 'Défis',
    emoji: '⚡',
    activeEmoji: '⚡',
    activeColor: 'text-orange-500',
    activeBg: 'bg-orange-100',
    badge: 'challenges',
  },
  {
    href: (id: string) => `/kids/${id}/shop`,
    label: 'Boutique',
    emoji: '🎁',
    activeEmoji: '🎁',
    activeColor: 'text-green-500',
    activeBg: 'bg-green-100',
    badge: null,
  },
  {
    href: (id: string) => `/kids/${id}/badges`,
    label: 'Succès',
    emoji: '🏆',
    activeEmoji: '🏆',
    activeColor: 'text-amber-600',
    activeBg: 'bg-yellow-100',
    badge: 'badges',
  },
  {
    href: (id: string) => `/kids/${id}/profile`,
    label: 'Moi',
    emoji: '😊',
    activeEmoji: '🤩',
    activeColor: 'text-sky-500',
    activeBg: 'bg-sky-100',
    badge: null,
  },
]

export function KidsBottomNav({ childId, pendingTasksCount = 0, unreadBadgesCount = 0, activeChallengesCount = 0 }: KidsBottomNavProps) {
  const pathname = usePathname()

  const getBadgeCount = (badgeType: string | null): number => {
    if (badgeType === 'tasks') return pendingTasksCount
    if (badgeType === 'badges') return unreadBadgesCount
    if (badgeType === 'challenges') return activeChallengesCount
    return 0
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t-2 border-pink-100 pb-safe z-50 shadow-lg" aria-label="Navigation principale">
      <ul className="flex justify-around items-center h-20 max-w-lg mx-auto px-2" role="list">
        {navItems.map((item) => {
          const href = item.href(childId)
          const isActive = pathname === href
          const badgeCount = getBadgeCount(item.badge)

          return (
            <li key={item.label}>
              <Link
                href={href}
                className="relative flex flex-col items-center justify-center w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 rounded-xl"
                aria-current={isActive ? "page" : undefined}
                aria-label={`${item.label}${badgeCount > 0 ? `, ${badgeCount} notification${badgeCount > 1 ? 's' : ''}` : ''}`}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.1 }}
                  className={`flex flex-col items-center gap-0.5 ${
                    isActive ? item.activeColor : 'text-gray-600'
                  }`}
                >
                  {/* Emoji icon with bounce effect when active */}
                  <motion.div
                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? item.activeBg : ''}`}
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <span className={`text-2xl ${isActive ? 'animate-bounce' : ''}`} style={{ animationDuration: '1s' }} aria-hidden="true">
                      {isActive ? item.activeEmoji : item.emoji}
                    </span>
                    {badgeCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 shadow-md"
                        aria-label={`${badgeCount} notification${badgeCount > 1 ? 's' : ''}`}
                      >
                        <span className="text-white text-xs font-bold" aria-hidden="true">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${item.activeColor.replace('text-', 'bg-')}`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
