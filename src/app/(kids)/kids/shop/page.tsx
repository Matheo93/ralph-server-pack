import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'

export default async function KidsShopRedirect() {
  const session = await getKidsSession()
  
  if (!session?.childId) {
    redirect('/kids/login')
  }
  
  redirect(`/kids/${session.childId}/shop`)
}

export const metadata = {
  title: 'Boutique - Redirection',
}
