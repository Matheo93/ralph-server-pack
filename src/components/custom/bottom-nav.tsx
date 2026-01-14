"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
} from "lucide-react"

const navigation = [
  { name: "Accueil", href: "/dashboard", icon: Home },
  { name: "Enfants", href: "/children", icon: Users },
  { name: "Tâches", href: "/tasks", icon: CheckSquare },
  { name: "Charge", href: "/charge", icon: BarChart3 },
  { name: "Plus", href: "/settings", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:hidden safe-area-bottom"
      aria-label="Navigation principale mobile"
      role="navigation"
    >
      <div className="flex items-center justify-around h-16 px-2" role="menubar">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                "active:scale-95 transition-transform",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.name}
              role="menuitem"
              data-testid={`nav-${item.href.slice(1)}`}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "stroke-[2.5px]"
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none">
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
