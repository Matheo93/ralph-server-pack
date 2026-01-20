"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, CheckSquare, Calendar, ShoppingCart, Scale, Settings, Sparkles, Trophy } from "lucide-react"
import { PremiumBadge } from "./PremiumBadge"
import { Logo } from "@/components/ui/logo"

const navigation = [
  {
    name: "Tableau de bord",
    href: "/dashboard",
    icon: Home,
    color: "text-primary",
    bgActive: "bg-primary/10",
    tourId: "nav-dashboard",
  },
  {
    name: "Enfants",
    href: "/children",
    icon: Users,
    color: "text-blue-500",
    bgActive: "bg-blue-50",
    tourId: "nav-children",
  },
  {
    name: "Défis",
    href: "/challenges",
    icon: Trophy,
    color: "text-orange-500",
    bgActive: "bg-orange-50",
    tourId: "nav-challenges",
  },
  {
    name: "Tâches",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-green-500",
    bgActive: "bg-green-50",
    tourId: "nav-tasks",
  },
  {
    name: "Calendrier",
    href: "/calendar",
    icon: Calendar,
    color: "text-indigo-500",
    bgActive: "bg-indigo-50",
    tourId: "nav-calendar",
  },
  {
    name: "Courses",
    href: "/shopping",
    icon: ShoppingCart,
    color: "text-pink-500",
    bgActive: "bg-pink-50",
    tourId: "nav-shopping",
  },
  {
    name: "Charge mentale",
    href: "/charge",
    icon: Scale,
    color: "text-amber-500",
    bgActive: "bg-amber-50",
    highlight: true,
    tourId: "nav-charge",
  },
  {
    name: "Paramètres",
    href: "/settings",
    icon: Settings,
    color: "text-slate-500",
    bgActive: "bg-slate-50",
    tourId: "nav-settings",
  },
]

interface SidebarProps {
  isPremium?: boolean
  isTrialing?: boolean
  daysRemaining?: number | null
}

export function Sidebar({
  isPremium = false,
  isTrialing = false,
  daysRemaining,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-border/50 bg-sidebar">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          {/* Logo */}
          <div className="flex flex-shrink-0 items-center px-4 mb-2">
            <Link href="/dashboard" className="group">
              <Logo size="md" animated />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 space-y-1 px-3">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-tour={item.tourId}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? `${item.bgActive} ${item.color} shadow-sm`
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    item.highlight && !isActive && "relative"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      isActive ? item.color : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="flex-1">{item.name}</span>

                  {/* Highlight badge for "Charge mentale" */}
                  {item.highlight && !isActive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-semibold">
                      <Sparkles className="w-3 h-3" />
                      USP
                    </span>
                  )}

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full",
                      item.color.replace("text-", "bg-")
                    )} />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom section - Premium badge or upgrade CTA */}
          <PremiumBadge
            isPremium={isPremium}
            isTrialing={isTrialing}
            daysRemaining={daysRemaining}
            variant="sidebar"
          />
        </div>
      </div>
    </aside>
  )
}
