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
    redirect(`/kids/${childId}/login`)
  }

  // Récupérer le nombre de tâches pendantes et badges non vus
  let pendingTasksCount = 0
  let unreadBadgesCount = 0

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
  } catch (error) {
    console.error('Error fetching counts:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 pb-24">
      {children}
      <KidsBottomNav
        childId={childId}
        pendingTasksCount={pendingTasksCount}
        unreadBadgesCount={unreadBadgesCount}
      />
    </div>
  )
}
