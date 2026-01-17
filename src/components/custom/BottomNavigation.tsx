"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils/index"
import {
  Home,
  CheckSquare,
  Users,
  Calendar,
  MoreHorizontal,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface BottomNavigationProps {
  className?: string
  unreadNotifications?: number
  onVocalClick?: () => void
}

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

const NAV_ITEMS: (NavItem & { activeColor: string; activeBg: string })[] = [
  {
    href: "/dashboard",
    label: "Accueil",
    icon: <Home className="w-5 h-5" />,
    activeColor: "text-primary",
    activeBg: "bg-primary/10",
  },
  {
    href: "/tasks",
    label: "Tâches",
    icon: <CheckSquare className="w-5 h-5" />,
    activeColor: "text-green-600",
    activeBg: "bg-green-50",
  },
  {
    href: "/children",
    label: "Enfants",
    icon: <Users className="w-5 h-5" />,
    activeColor: "text-blue-600",
    activeBg: "bg-blue-50",
  },
  {
    href: "/tasks/week",
    label: "Semaine",
    icon: <Calendar className="w-5 h-5" />,
    activeColor: "text-amber-600",
    activeBg: "bg-amber-50",
  },
]

const MORE_ITEMS: NavItem[] = [
  {
    href: "/household",
    label: "Foyer",
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: "/templates",
    label: "Modèles",
    icon: <CheckSquare className="w-5 h-5" />,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: <MoreHorizontal className="w-5 h-5" />,
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function BottomNavigation({
  className,
  unreadNotifications,
  onVocalClick,
}: BottomNavigationProps) {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden safe-area-bottom",
        className
      )}
    >
      <div className="grid grid-cols-5 h-16">
        {/* Main nav items */}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative py-2 mx-1 rounded-lg",
                active
                  ? `${item.activeColor} ${item.activeBg}`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(active && "scale-110 transition-transform")}>
                {item.icon}
              </div>
              <span className={cn("text-xs", active && "font-medium")}>{item.label}</span>
              {active && (
                <span className={cn(
                  "absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                  item.activeColor.replace("text-", "bg-")
                )} />
              )}
            </Link>
          )
        })}

        {/* More menu */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh]">
            <SheetHeader>
              <SheetTitle>Plus d&apos;options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 py-6">
              {/* Vocal button */}
              <button
                onClick={() => {
                  onVocalClick?.()
                  setIsMoreOpen(false)
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
              >
                <Mic className="w-6 h-6" />
                <span className="text-sm font-medium">Note vocale</span>
              </button>

              {/* More navigation items */}
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted",
                    isActive(item.href) && "bg-primary/10 text-primary"
                  )}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Central FAB for vocal (only visible when not in more menu) */}
      {onVocalClick && (
        <Button
          size="lg"
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={onVocalClick}
          aria-label="Ajouter une note vocale"
        >
          <Mic className="w-6 h-6" />
        </Button>
      )}
    </nav>
  )
}

// =============================================================================
// SPACER COMPONENT
// =============================================================================

/**
 * Add this to the bottom of pages to prevent content
 * from being hidden behind the bottom navigation
 */
export function BottomNavigationSpacer() {
  return <div className="h-20 md:hidden" aria-hidden="true" />
}
