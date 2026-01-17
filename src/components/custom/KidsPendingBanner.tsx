'use client'

import Link from 'next/link'
import { Sparkles, CheckCircle, Gift } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface KidsPendingBannerProps {
  pendingProofs: number
  pendingRedemptions: number
}

export function KidsPendingBanner({
  pendingProofs,
  pendingRedemptions,
}: KidsPendingBannerProps) {
  const total = pendingProofs + pendingRedemptions

  if (total === 0) return null

  return (
    <Card className="border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-50 via-orange-50 to-transparent dark:from-pink-950/30 dark:to-transparent hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Espace Enfants
                <Badge className="bg-pink-500 hover:bg-pink-600">
                  {total}
                </Badge>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pendingProofs > 0 && (
                  <span className="flex items-center gap-1 inline-flex">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {pendingProofs} tâche{pendingProofs > 1 ? 's' : ''} à valider
                  </span>
                )}
                {pendingProofs > 0 && pendingRedemptions > 0 && ' • '}
                {pendingRedemptions > 0 && (
                  <span className="flex items-center gap-1 inline-flex">
                    <Gift className="w-3.5 h-3.5 text-orange-500" />
                    {pendingRedemptions} récompense{pendingRedemptions > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link href="/settings/kids">
            <Button
              size="sm"
              className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-md"
            >
              Valider
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
