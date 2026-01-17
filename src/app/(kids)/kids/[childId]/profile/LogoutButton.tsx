'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logoutChild } from '@/lib/actions/kids-auth'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutChild()
      router.push('/kids')
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full py-4 px-6 bg-red-50 text-red-600 rounded-2xl text-center font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Déconnexion...' : '👋 Se déconnecter'}
    </button>
  )
}
