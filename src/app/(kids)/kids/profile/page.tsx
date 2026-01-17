import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'

export default async function KidsProfileRedirect() {
  const session = await getKidsSession()
  
  if (!session?.childId) {
    redirect('/kids/login')
  }
  
  redirect(`/kids/${session.childId}/profile`)
}

export const metadata = {
  title: 'Profil - Redirection',
}
