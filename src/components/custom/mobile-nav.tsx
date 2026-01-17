"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  CheckSquare,
  Calendar,
  ShoppingCart,
  BarChart3,
  Settings,
  Menu,
  Bell,
  CreditCard,
  Shield,
  Trophy,
} from "lucide-react"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: Home },
  { name: "Enfants", href: "/children", icon: Users },
  { name: "Defis", href: "/challenges", icon: Trophy },
  { name: "Taches", href: "/tasks", icon: CheckSquare },
  { name: "Calendrier", href: "/calendar", icon: Calendar },
  { name: "Courses", href: "/shopping", icon: ShoppingCart },
  { name: "Charge mentale", href: "/charge", icon: BarChart3 },
]

const settingsLinks = [
  { name: "Paramètres", href: "/settings", icon: Settings },
  { name: "Notifications", href: "/settings/notifications", icon: Bell },
  { name: "Confidentialité", href: "/settings/privacy", icon: Shield },
  { name: "Facturation", href: "/settings/billing", icon: CreditCard },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="lg:hidden" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            FamilyLoad
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 pt-6 border-t">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Paramètres
          </p>
          <nav className="flex flex-col space-y-1">
            {settingsLinks.map((item) => {
              const isActive =
                pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}
