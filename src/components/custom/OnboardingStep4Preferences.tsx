"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form"
import type { OnboardingStep4Input } from "@/lib/validations/onboarding"

interface OnboardingStep4PreferencesProps {
  data: OnboardingStep4Input
  onUpdate: (data: OnboardingStep4Input) => void
  onSubmit: () => void
  onPrevious: () => void
  isPending: boolean
}

// Step 4 form schema
const step4FormSchema = z.object({
  daily_reminder_time: z.string().nullable(),
  email_enabled: z.boolean(),
  push_enabled: z.boolean(),
  weekly_summary_enabled: z.boolean(),
})

type Step4FormData = z.infer<typeof step4FormSchema>

export function OnboardingStep4Preferences({
  data,
  onUpdate,
  onSubmit,
  onPrevious,
  isPending,
}: OnboardingStep4PreferencesProps) {
  const form = useForm<Step4FormData>({
    resolver: zodResolver(step4FormSchema),
    defaultValues: {
      daily_reminder_time: data.daily_reminder_time,
      email_enabled: data.email_enabled,
      push_enabled: data.push_enabled,
      weekly_summary_enabled: data.weekly_summary_enabled,
    },
  })

  const handleSubmit = (formData: Step4FormData) => {
    onUpdate({
      daily_reminder_time: formData.daily_reminder_time,
      email_enabled: formData.email_enabled,
      push_enabled: formData.push_enabled,
      weekly_summary_enabled: formData.weekly_summary_enabled,
    })
    onSubmit()
  }

  return (
    <div className="space-y-6">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Daily reminder time */}
          <FormField
            control={form.control}
            name="daily_reminder_time"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Rappel quotidien</FormLabel>
                  <FormDescription>
                    Recevez un résumé de vos tâches du jour
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    type="time"
                    className="w-24"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Email notifications */}
          <FormField
            control={form.control}
            name="email_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Notifications par email
                  </FormLabel>
                  <FormDescription>
                    Rappels et alertes importantes par email
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Push notifications */}
          <FormField
            control={form.control}
            name="push_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Notifications push
                  </FormLabel>
                  <FormDescription>
                    Notifications en temps réel sur votre appareil
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Weekly summary */}
          <FormField
            control={form.control}
            name="weekly_summary_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Bilan hebdomadaire</FormLabel>
                  <FormDescription>
                    Rapport de la répartition de la charge mentale
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={isPending}
            >
              Retour
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Création en cours...
                </>
              ) : (
                "Terminer"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
