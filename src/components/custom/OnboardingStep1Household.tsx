"use client"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  onboardingStep1Schema,
  countryTimezones,
  countryLabels,
} from "@/lib/validations/onboarding"
import type { OnboardingStep1Input } from "@/lib/validations/onboarding"

interface OnboardingStep1HouseholdProps {
  data: OnboardingStep1Input
  onUpdate: (data: OnboardingStep1Input) => void
  onNext: () => void
}

export function OnboardingStep1Household({
  data,
  onUpdate,
  onNext,
}: OnboardingStep1HouseholdProps) {
  const form = useForm<OnboardingStep1Input>({
    resolver: zodResolver(onboardingStep1Schema),
    defaultValues: data,
  })

  const selectedCountry = form.watch("country")
  const timezones = countryTimezones[selectedCountry] || []

  // Update timezone when country changes
  const handleCountryChange = (country: string) => {
    const tzOptions = countryTimezones[country] || []
    const firstTz = tzOptions[0]?.value || "Europe/Paris"
    form.setValue("country", country as "FR" | "BE" | "CH" | "CA" | "LU")
    form.setValue("timezone", firstTz)
  }

  const onSubmit = (formData: OnboardingStep1Input) => {
    onUpdate(formData)
    onNext()
  }

  return (
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
                  autoFocus
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
              <Select
                onValueChange={handleCountryChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un pays" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(countryLabels).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Les tâches automatiques seront adaptées aux règles de votre pays
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un fuseau horaire" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Les rappels seront envoyés selon ce fuseau horaire
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">
            Continuer
          </Button>
        </div>
      </form>
    </Form>
  )
}
