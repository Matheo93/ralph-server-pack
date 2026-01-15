"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe, Loader2, Check } from "lucide-react"

const locales = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
] as const

interface LanguageSwitcherProps {
  currentLocale?: string
  className?: string
}

export function LanguageSwitcher({ currentLocale = "fr", className }: LanguageSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState(currentLocale)

  const handleLocaleChange = (locale: string) => {
    setSelected(locale)
    startTransition(() => {
      // Set locale cookie
      document.cookie = `locale=${locale};path=/;max-age=31536000`
      // Refresh the page to apply new locale
      router.refresh()
    })
  }

  const currentLocaleData = locales.find((l) => l.code === selected) ?? locales[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              <span className="mr-1">{currentLocaleData?.flag}</span>
              <span className="hidden sm:inline">{currentLocaleData?.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
            className="flex items-center justify-between"
          >
            <span>
              {locale.flag} {locale.name}
            </span>
            {selected === locale.code && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
