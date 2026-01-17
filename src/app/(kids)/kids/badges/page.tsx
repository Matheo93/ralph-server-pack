import { redirect } from 'next/navigation'
import { getKidsSession } from '@/lib/actions/kids-auth'

export default async function KidsBadgesRedirect() {
  const session = await getKidsSession()
  
  if (!session?.childId) {
    redirect('/kids/login')
  }
  
  redirect(`/kids/${session.childId}/badges`)
}

export const metadata = {
  title: 'Badges - Redirection',
}
