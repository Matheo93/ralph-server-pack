"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/auth/actions"
import { NotificationBadge } from "./NotificationBadge"
import { PremiumBadge } from "./PremiumBadge"

interface HeaderProps {
  email: string
  householdName?: string
  notificationCount?: number
  isPremium?: boolean
  isTrialing?: boolean
  daysRemaining?: number | null
}

export function Header({
  email,
  householdName,
  isPremium = false,
  isTrialing = false,
  daysRemaining,
}: HeaderProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  const initials = email
    .split("@")[0]
    ?.slice(0, 2)
    .toUpperCase() ?? "FL"

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {householdName && (
            <span className="text-sm font-medium text-muted-foreground">
              {householdName}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
          <PremiumBadge
            isPremium={isPremium}
            isTrialing={isTrialing}
            daysRemaining={daysRemaining}
            variant={isPremium ? "compact" : "full"}
          />
          <NotificationBadge />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                aria-label="Menu utilisateur"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Mon compte</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Paramètres</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/invite">Inviter un co-parent</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isPending}
                className="text-destructive focus:text-destructive"
              >
                {isPending ? "Déconnexion..." : "Se déconnecter"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
