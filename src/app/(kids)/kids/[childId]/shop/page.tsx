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
      {/* Header avec XP */}
      <header className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Boutique</h1>
            <p className="text-gray-500">Échange tes XP contre des récompenses</p>
          </div>
          <div className="bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-2xl px-4 py-2">
            <div className="text-sm opacity-80">Tes XP</div>
            <div className="text-2xl font-bold">{currentXp}</div>
          </div>
        </div>
      </header>

      {/* Grille de récompenses */}
      {rewards.length > 0 ? (
        <ShopGrid rewards={rewards} currentXp={currentXp} childId={session.childId} />
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 text-center shadow">
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Pas encore de récompenses
          </h3>
          <p className="text-gray-600">
            Demande à tes parents d&apos;ajouter des récompenses !
          </p>
        </div>
      )}
    </div>
  )
}

export const metadata = {
  title: 'Boutique',
}
