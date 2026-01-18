"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createHousehold } from "@/lib/actions/household"
import { showToast } from "@/lib/toast-messages"
import { householdSchema } from "@/lib/validations/household"
import type { HouseholdInput } from "@/lib/validations/household"

export function HouseholdForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<HouseholdInput>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: "",
      country: "FR",
      timezone: "Europe/Paris",
    },
  })

  const onSubmit = (data: HouseholdInput) => {
    setError(null)
    startTransition(async () => {
      const result = await createHousehold(data)
      if (!result.success && result.error) {
        setError(result.error)
        showToast.error("householdCreateFailed", result.error)
      } else {
        showToast.success("householdCreated", data.name)
      }
    })
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Créer votre foyer</CardTitle>
        <CardDescription>
          Donnez un nom à votre foyer pour commencer à gérer la charge mentale
          familiale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du foyer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Famille Dupont"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ce nom sera visible par tous les membres du foyer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pays</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="CA">Canada</option>
                      <option value="LU">Luxembourg</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Les tâches automatiques seront adaptées aux règles de votre
                    pays
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuseau horaire</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                      <option value="Europe/Brussels">
                        Europe/Bruxelles (UTC+1)
                      </option>
                      <option value="Europe/Zurich">
                        Europe/Zurich (UTC+1)
                      </option>
                      <option value="America/Montreal">
                        Amérique/Montréal (UTC-5)
                      </option>
                      <option value="Europe/Luxembourg">
                        Europe/Luxembourg (UTC+1)
                      </option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Les rappels seront envoyés selon ce fuseau horaire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Création..." : "Créer mon foyer"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
