import { redirect } from 'next/navigation'
import { getAvailableRewards } from '@/lib/actions/kids-rewards'
import { getKidsSession } from '@/lib/actions/kids-auth'
import { ShopGrid } from './ShopGrid'

export default async function KidsShopPage() {
  const session = await getKidsSession()

  if (!session) {
    redirect('/kids')
  }

  const result = await getAvailableRewards()

  if (!result.success || !result.data) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{result.error}</p>
      </div>
    )
  }

  const { rewards, currentXp } = result.data

  return (
    <div className="min-h-screen p-4">
      {/* Header avec XP - Style magasin fun */}
      <header className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 backdrop-blur-lg rounded-3xl p-5 mb-6 shadow-xl border-2 border-green-200/50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-2 right-4 text-2xl opacity-40 animate-bounce">🛍️</div>
        <div className="absolute bottom-2 left-4 text-lg opacity-30 animate-pulse">✨</div>

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-3xl">🎁</span> Boutique
            </h1>
            <p className="text-gray-600 font-medium">Échange tes XP contre des récompenses !</p>
          </div>
          <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-white rounded-2xl px-5 py-3 shadow-xl transform hover:scale-105 transition-transform">
            <div className="text-xs font-bold opacity-90">💰 Tes XP</div>
            <div className="text-3xl font-black">{currentXp}</div>
          </div>
        </div>
      </header>

      {/* Grille de récompenses */}
      {rewards.length > 0 ? (
        <ShopGrid rewards={rewards} currentXp={currentXp} childId={session.childId} />
      ) : (
        <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 backdrop-blur-sm rounded-3xl p-10 text-center shadow-xl border-2 border-purple-200/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-6 left-10 text-2xl opacity-40 animate-bounce">🌟</div>
          <div className="absolute bottom-8 right-12 text-xl opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }}>🎀</div>
          <div className="text-7xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🎁</div>
          <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Pas encore de récompenses
          </h3>
          <p className="text-gray-600 font-medium text-lg">
            Demande à tes parents d&apos;ajouter des récompenses ! 🙏
          </p>
        </div>
      )}
    </div>
  )
}

export const metadata = {
  title: 'Boutique',
}
