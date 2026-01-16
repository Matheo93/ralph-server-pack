"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, CheckSquare, Scale, Settings, Sparkles } from "lucide-react"

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
    name: "Tâches",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-green-500",
    bgActive: "bg-green-50",
    tourId: "nav-tasks",
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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-border/50 bg-sidebar">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          {/* Logo */}
          <div className="flex flex-shrink-0 items-center px-4 mb-2">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <span className="text-xl">👨‍👩‍👧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FamilyLoad</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Charge mentale simplifiée</p>
              </div>
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

          {/* Bottom section - Quick tip */}
          <div className="px-3 pb-4">
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/20 p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">💡</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Astuce du jour</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Utilisez la commande vocale pour ajouter des tâches rapidement !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
