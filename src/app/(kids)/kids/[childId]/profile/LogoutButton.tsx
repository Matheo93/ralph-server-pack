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
      router.refresh()
      router.push('/kids/login')
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full py-4 px-6 bg-gradient-to-r from-pink-50 to-red-50 text-red-600 rounded-3xl text-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border-2 border-red-200/50 disabled:opacity-50"
    >
      {isPending ? '⏳ Déconnexion...' : '👋 Se déconnecter'}
    </button>
  )
}
