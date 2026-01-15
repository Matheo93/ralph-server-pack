"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/index"

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profil", icon: "👤" },
  { href: "/settings/household", label: "Foyer", icon: "🏠" },
  { href: "/settings/preferences", label: "Préférences", icon: "💪" },
  { href: "/settings/notifications", label: "Notifications", icon: "🔔" },
  { href: "/settings/templates", label: "Templates", icon: "📋" },
  { href: "/settings/exclusions", label: "Exclusions", icon: "📅" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
