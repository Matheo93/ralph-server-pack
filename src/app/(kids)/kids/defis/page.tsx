import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'

export default async function KidsDefisRedirect() {
  const session = await getKidsSession()
  
  if (!session?.childId) {
    redirect('/kids/login')
  }
  
  redirect(`/kids/${session.childId}/challenges`)
}

export const metadata = {
  title: 'Défis - Redirection',
}
