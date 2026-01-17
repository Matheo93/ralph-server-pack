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

  // Si aucun enfant avec compte, afficher un message ludique
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Éléments décoratifs flottants */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 text-4xl animate-bounce" style={{ animationDuration: '2s' }}>🎈</div>
          <div className="absolute top-40 right-16 text-3xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🌟</div>
          <div className="absolute bottom-40 left-8 text-3xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>🦋</div>
          <div className="absolute bottom-60 right-12 text-4xl animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>🎨</div>
        </div>

        <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] p-8 shadow-2xl max-w-md text-center border-4 border-white/50 relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce">🎮</div>
          <div className="text-7xl mb-4 mt-6">👋</div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-3">
            Pas encore de compte
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            Demande à tes parents de te créer un compte pour jouer ! 🎯
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold rounded-full hover:scale-105 transition-transform shadow-xl"
          >
            <span>Retour à l&apos;accueil</span>
            <span className="text-xl">🏠</span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 relative overflow-hidden">
      {/* Éléments décoratifs flottants - atmosphère de jeu */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-16 left-8 w-20 h-20 bg-gradient-to-br from-yellow-300/40 to-orange-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3s' }} />
        <div className="absolute top-32 right-12 w-14 h-14 bg-gradient-to-br from-pink-300/40 to-rose-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-48 left-6 w-12 h-12 bg-gradient-to-br from-purple-300/40 to-violet-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-6 w-10 h-10 bg-gradient-to-br from-teal-300/40 to-cyan-300/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '4s', animationDelay: '1.5s' }} />

        {/* Emojis décoratifs */}
        <div className="absolute top-24 right-20 text-3xl opacity-40 animate-pulse">✨</div>
        <div className="absolute bottom-36 right-16 text-2xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute top-48 left-12 text-2xl opacity-40 animate-pulse" style={{ animationDelay: '1s' }}>🌟</div>
        <div className="absolute bottom-64 left-1/3 text-xl opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}>🎈</div>
        <div className="absolute top-64 right-1/3 text-2xl opacity-30 animate-pulse" style={{ animationDelay: '0.8s' }}>💫</div>
        <div className="absolute bottom-80 left-16 text-xl opacity-30 animate-pulse" style={{ animationDelay: '1.2s' }}>🌈</div>
      </div>

      {/* Header - Style jeu vidéo fun et engageant */}
      <header className="pt-10 pb-6 px-4 text-center relative z-10">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <span className="text-5xl animate-bounce drop-shadow-lg" style={{ animationDuration: '1.5s' }}>🎮</span>
          <div className="relative">
            <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
              FamilyLoad Kids
            </h1>
            {/* Sparkle effect on title */}
            <span className="absolute -top-2 -right-4 text-2xl animate-ping" style={{ animationDuration: '1.5s' }}>✨</span>
          </div>
          <span className="text-5xl animate-bounce drop-shadow-lg" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}>🎯</span>
        </div>
        <div className="relative inline-block">
          <p className="text-gray-700 text-xl font-bold bg-white/70 backdrop-blur-sm rounded-full px-8 py-3 inline-block shadow-xl border-2 border-white/50">
            Choisis ton super-héros ! 🦸
          </p>
          {/* Animated arrow pointing down */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-3xl animate-bounce text-pink-500">
            👇
          </div>
        </div>
      </header>

      {/* Sélection de profil */}
      <main className="px-4 pb-24 relative z-10">
        <KidsProfileSelector children={children} />
      </main>

      {/* Lien vers l'app parent - plus discret mais accessible */}
      <footer className="fixed bottom-6 left-0 right-0 text-center z-20">
        <a
          href="/login"
          className="text-gray-500 text-sm hover:text-gray-700 transition-colors bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md"
        >
          👨‍👩‍👧 Je suis un parent
        </a>
      </footer>
    </div>
  )
}

export const metadata = {
  title: 'FamilyLoad Kids - Choisis ton profil',
  description: 'Interface enfants de FamilyLoad - Choisis ton profil pour accéder à tes missions',
}
