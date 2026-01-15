"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  CheckSquare,
  Scale,
  Settings,
} from "lucide-react"

const navigation = [
  {
    name: "Accueil",
    href: "/dashboard",
    icon: Home,
    color: "text-primary",
    bgActive: "bg-primary/10",
  },
  {
    name: "Enfants",
    href: "/children",
    icon: Users,
    color: "text-blue-500",
    bgActive: "bg-blue-50",
  },
  {
    name: "Tâches",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-green-500",
    bgActive: "bg-green-50",
  },
  {
    name: "Charge",
    href: "/charge",
    icon: Scale,
    color: "text-amber-500",
    bgActive: "bg-amber-50",
  },
  {
    name: "Plus",
    href: "/settings",
    icon: Settings,
    color: "text-slate-500",
    bgActive: "bg-slate-50",
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t lg:hidden safe-area-bottom"
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
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200",
                "active:scale-95",
                isActive
                  ? item.color
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.name}
              role="menuitem"
              data-testid={`nav-${item.href.slice(1)}`}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                isActive && item.bgActive
              )}>
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive && "stroke-[2.5px]"
                  )}
                  aria-hidden="true"
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none mt-1",
                isActive && "font-semibold"
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
