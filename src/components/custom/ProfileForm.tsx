"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateProfile } from "@/lib/actions/settings"

interface ProfileFormProps {
  profile: {
    id: string
    name: string | null
    language: string
    timezone: string
  }
}

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
]

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/Brussels", label: "Bruxelles (UTC+1)" },
  { value: "Europe/Zurich", label: "Zurich (UTC+1)" },
  { value: "America/Montreal", label: "Montréal (UTC-5)" },
  { value: "Europe/Luxembourg", label: "Luxembourg (UTC+1)" },
]

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(profile.name ?? "")
  const [language, setLanguage] = useState<"fr" | "en">(
    (profile.language as "fr" | "en") || "fr"
  )
  const [timezone, setTimezone] = useState(profile.timezone || "Europe/Paris")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateProfile({
        name: name.trim() || null,
        language,
        timezone,
      })

      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error ?? "Une erreur est survenue")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Ce nom sera visible par les autres membres du foyer
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">Langue</Label>
        <Select value={language} onValueChange={(value) => setLanguage(value as "fr" | "en")} disabled={isPending}>
          <SelectTrigger id="language">
            <SelectValue placeholder="Choisir une langue" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Fuseau horaire</Label>
        <Select value={timezone} onValueChange={setTimezone} disabled={isPending}>
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Choisir un fuseau horaire" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">Profil mis à jour avec succès</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  )
}
