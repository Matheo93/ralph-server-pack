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
import { updateHousehold } from "@/lib/actions/settings"

interface HouseholdSettingsProps {
  household: {
    id: string
    name: string
    country: string
    timezone: string
  }
  isAdmin: boolean
}

const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "CA", label: "Canada" },
  { value: "LU", label: "Luxembourg" },
]

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/Brussels", label: "Bruxelles (UTC+1)" },
  { value: "Europe/Zurich", label: "Zurich (UTC+1)" },
  { value: "America/Montreal", label: "Montréal (UTC-5)" },
  { value: "Europe/Luxembourg", label: "Luxembourg (UTC+1)" },
]

export function HouseholdSettings({ household, isAdmin }: HouseholdSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(household.name)
  const [country, setCountry] = useState<"FR" | "BE" | "CH" | "CA" | "LU">(
    (household.country as "FR" | "BE" | "CH" | "CA" | "LU") || "FR"
  )
  const [timezone, setTimezone] = useState(household.timezone || "Europe/Paris")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      setError("Vous devez être administrateur pour modifier le foyer")
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateHousehold({
        name: name.trim(),
        country,
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
        <Label htmlFor="householdName">Nom du foyer</Label>
        <Input
          id="householdName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Notre famille"
          disabled={isPending || !isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Pays</Label>
        <Select
          value={country}
          onValueChange={(value) => setCountry(value as "FR" | "BE" | "CH" | "CA" | "LU")}
          disabled={isPending || !isAdmin}
        >
          <SelectTrigger id="country">
            <SelectValue placeholder="Choisir un pays" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Le pays détermine les templates de tâches disponibles
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="householdTimezone">Fuseau horaire</Label>
        <Select
          value={timezone}
          onValueChange={setTimezone}
          disabled={isPending || !isAdmin}
        >
          <SelectTrigger id="householdTimezone">
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
        <p className="text-sm text-green-600">Foyer mis à jour avec succès</p>
      )}

      {isAdmin ? (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Seul l'administrateur peut modifier ces paramètres
        </p>
      )}
    </form>
  )
}
