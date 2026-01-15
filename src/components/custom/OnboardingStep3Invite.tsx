"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import type { OnboardingStep3Input } from "@/lib/validations/onboarding"

interface OnboardingStep3InviteProps {
  data: OnboardingStep3Input
  onUpdate: (data: OnboardingStep3Input) => void
  onNext: () => void
  onPrevious: () => void
}

// Local schema for form validation (email only)
const step3FormSchema = z.object({
  email: z.string().email("Format d'email invalide").or(z.literal("")),
})

type Step3FormData = z.infer<typeof step3FormSchema>

export function OnboardingStep3Invite({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: OnboardingStep3InviteProps) {
  const form = useForm<Step3FormData>({
    resolver: zodResolver(step3FormSchema),
    defaultValues: {
      email: data.email,
    },
  })

  const onSubmit = (formData: Step3FormData) => {
    onUpdate({
      email: formData.email,
      skip: false,
    })
    onNext()
  }

  const handleSkip = () => {
    onUpdate({
      email: "",
      skip: true,
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Illustration */}
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Invitez votre co-parent pour partager la gestion des tâches et
          équilibrer la charge mentale.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email du co-parent</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="coparent@email.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Une invitation sera envoyée à cette adresse
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Benefits list */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="font-medium text-sm">Avantages du co-parenting</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 text-green-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Répartition équitable des tâches
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 text-green-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Visualisation de la charge mentale partagée
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 text-green-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Notifications et rappels synchronisés
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Retour
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Plus tard
              </Button>
              <Button
                type="submit"
                disabled={!form.watch("email")}
              >
                Inviter
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
