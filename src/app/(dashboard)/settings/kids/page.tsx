import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth/actions'
import { getPendingProofs } from '@/lib/actions/kids-tasks'
import { getPendingRedemptions, getHouseholdRewards } from '@/lib/actions/kids-rewards'
import { KidsSettingsClient } from './KidsSettingsClient'

export const metadata: Metadata = {
  title: 'Espace Enfants | FamilyLoad',
  description: 'Gérez les récompenses et validez les demandes de vos enfants',
}

export default async function KidsSettingsPage() {
  const userId = await getUserId()
  if (!userId) {
    redirect('/login')
  }

  // Récupérer les données en parallèle
  const [proofsResult, redemptionsResult, rewardsResult] = await Promise.all([
    getPendingProofs(),
    getPendingRedemptions(),
    getHouseholdRewards(),
  ])

  return (
    <KidsSettingsClient
      pendingProofs={proofsResult.success ? proofsResult.data ?? [] : []}
      pendingRedemptions={redemptionsResult.success ? redemptionsResult.data ?? [] : []}
      rewards={rewardsResult.success ? rewardsResult.data ?? [] : []}
    />
  )
}
