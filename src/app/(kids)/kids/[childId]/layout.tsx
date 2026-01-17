import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { KidsBottomNav } from '@/components/kids/KidsBottomNav'
import { query } from '@/lib/aws/database'

interface Props {
  children: React.ReactNode
  params: Promise<{ childId: string }>
}

async function getKidsSessionData(childId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kids_session')?.value

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie) as {
      childId: string
      firstName: string
      createdAt: number
    }

    // Vérifier l'expiration (4 heures)
    const SESSION_MAX_AGE = 60 * 60 * 4 * 1000
    if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
      return null
    }

    // Vérifier que le childId correspond
    if (session.childId !== childId) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export default async function KidsChildLayout({ children, params }: Props) {
  const { childId } = await params

  // Vérifier la session
  const session = await getKidsSessionData(childId)

  if (!session) {
    redirect(`/kids/login/${childId}`)
  }

  // Recuperer les compteurs pour la navigation
  let pendingTasksCount = 0
  let unreadBadgesCount = 0
  let activeChallengesCount = 0

  try {
    const tasksResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks
       WHERE child_id = $1 AND status = 'pending'
       AND (deadline IS NULL OR deadline >= CURRENT_DATE)`,
      [childId]
    )
    pendingTasksCount = parseInt(tasksResult[0]?.count ?? '0', 10)

    const badgesResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM child_badges
       WHERE child_id = $1 AND seen_at IS NULL`,
      [childId]
    )
    unreadBadgesCount = parseInt(badgesResult[0]?.count ?? '0', 10)

    const challengesResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM challenges ch
       LEFT JOIN challenge_progress cp ON cp.challenge_id = ch.id AND cp.child_id = $1
       WHERE $1 = ANY(ch.child_ids)
         AND ch.is_active = true
         AND (ch.expires_at IS NULL OR ch.expires_at > NOW())
         AND (cp.is_completed IS NULL OR cp.is_completed = false)`,
      [childId]
    )
    activeChallengesCount = parseInt(challengesResult[0]?.count ?? '0', 10)
  } catch (error) {
    console.error('Error fetching counts:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 pb-24 relative overflow-hidden">
      {/* Decorative floating elements - makes UI more playful */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Floating bubbles with different animation speeds */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-yellow-300/40 to-orange-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3s', animationDelay: '0s' }} />
        <div className="absolute top-40 right-8 w-12 h-12 bg-gradient-to-br from-pink-300/40 to-rose-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-60 left-6 w-10 h-10 bg-gradient-to-br from-orange-300/40 to-amber-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-4 w-8 h-8 bg-gradient-to-br from-teal-300/40 to-cyan-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '4s', animationDelay: '1.5s' }} />
        <div className="absolute bottom-40 right-1/4 w-14 h-14 bg-gradient-to-br from-purple-300/30 to-violet-300/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3.8s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/4 w-6 h-6 bg-gradient-to-br from-green-300/40 to-emerald-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }} />

        {/* Decorative stars and sparkles - more of them! */}
        <div className="absolute top-32 right-16 text-3xl opacity-30 animate-pulse">✨</div>
        <div className="absolute bottom-48 right-20 text-2xl opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute top-60 left-4 text-2xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}>🌟</div>
        <div className="absolute bottom-96 left-1/3 text-xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }}>🎈</div>
        <div className="absolute top-80 right-1/3 text-2xl opacity-25 animate-pulse" style={{ animationDelay: '0.8s' }}>💫</div>
        <div className="absolute bottom-72 left-8 text-xl opacity-25 animate-pulse" style={{ animationDelay: '1.2s' }}>🌈</div>
        <div className="absolute top-48 left-1/3 text-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}>🎉</div>
        <div className="absolute bottom-32 right-12 text-lg opacity-20 animate-pulse" style={{ animationDelay: '0.7s' }}>🦋</div>
      </div>

      {/* Main content with relative z-index */}
      <div className="relative z-10">
        {children}
      </div>

      <KidsBottomNav
        childId={childId}
        pendingTasksCount={pendingTasksCount}
        unreadBadgesCount={unreadBadgesCount}
        activeChallengesCount={activeChallengesCount}
      />
    </div>
  )
}
