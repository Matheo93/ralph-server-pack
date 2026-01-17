import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { query } from '@/lib/aws/database'
import type { Child } from '@/types/database'
import { KidsProfileSelector } from './KidsProfileSelector'

interface ChildWithAccount {
  id: string
  first_name: string
  avatar_url: string | null
  has_account: boolean
}

async function getChildrenForKidsPage(): Promise<ChildWithAccount[]> {
  // Récupérer le household_id depuis le cookie parent si disponible
  // Sinon, afficher tous les enfants avec un compte actif
  try {
    const children = await query<ChildWithAccount>(
      `SELECT c.id, c.first_name, c.avatar_url,
              CASE WHEN ca.id IS NOT NULL THEN true ELSE false END as has_account
       FROM children c
       INNER JOIN child_accounts ca ON ca.child_id = c.id
       WHERE c.is_active = true
       ORDER BY c.first_name`,
      []
    )
    return children
  } catch (error) {
    console.error('Erreur lors de la récupération des enfants:', error)
    return []
  }
}

export default async function KidsPage() {
  const children = await getChildrenForKidsPage()

  // Si aucun enfant avec compte, afficher un message
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl max-w-md text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Pas encore de compte enfant
          </h1>
          <p className="text-gray-600 mb-6">
            Demande à tes parents de te créer un compte dans l&apos;application !
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-full hover:opacity-90 transition-opacity"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100">
      {/* Header */}
      <header className="pt-8 pb-4 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Qui es-tu ? 🎮
        </h1>
        <p className="text-gray-600 text-lg">
          Choisis ton profil pour commencer
        </p>
      </header>

      {/* Sélection de profil */}
      <main className="px-4 pb-8">
        <KidsProfileSelector children={children} />
      </main>

      {/* Lien vers l'app parent */}
      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <a
          href="/login"
          className="text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Je suis un parent →
        </a>
      </footer>
    </div>
  )
}

export const metadata = {
  title: 'FamilyLoad Kids - Choisis ton profil',
  description: 'Interface enfants de FamilyLoad - Choisis ton profil pour accéder à tes missions',
}
