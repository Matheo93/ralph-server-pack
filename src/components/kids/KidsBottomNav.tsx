'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

interface KidsBottomNavProps {
  childId: string
  pendingTasksCount?: number
  unreadBadgesCount?: number
}

const navItems = [
  {
    href: (id: string) => `/kids/${id}/dashboard`,
    label: 'Missions',
    icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    activeColor: 'text-pink-500',
    badge: 'tasks',
  },
  {
    href: (id: string) => `/kids/${id}/shop`,
    label: 'Boutique',
    icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    activeColor: 'text-orange-500',
    badge: null,
  },
  {
    href: (id: string) => `/kids/${id}/badges`,
    label: 'Succès',
    icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    activeColor: 'text-yellow-500',
    badge: 'badges',
  },
  {
    href: (id: string) => `/kids/${id}/profile`,
    label: 'Moi',
    icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    activeColor: 'text-purple-500',
    badge: null,
  },
]

export function KidsBottomNav({ childId, pendingTasksCount = 0, unreadBadgesCount = 0 }: KidsBottomNavProps) {
  const pathname = usePathname()

  const getBadgeCount = (badgeType: string | null): number => {
    if (badgeType === 'tasks') return pendingTasksCount
    if (badgeType === 'badges') return unreadBadgesCount
    return 0
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const href = item.href(childId)
          const isActive = pathname === href
          const badgeCount = getBadgeCount(item.badge)

          return (
            <Link
              key={item.label}
              href={href}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? item.activeColor : 'text-gray-400'
                }`}
              >
                {/* Icône avec badge optionnel */}
                <div className="relative">
                  {item.icon(isActive)}
                  {badgeCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1"
                    >
                      <span className="text-white text-xs font-bold">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Label */}
                <span className={`text-xs font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>

                {/* Indicateur actif */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className={`absolute -top-1 w-12 h-1 rounded-full ${item.activeColor.replace('text-', 'bg-')}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
