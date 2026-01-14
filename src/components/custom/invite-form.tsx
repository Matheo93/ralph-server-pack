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
import { inviteCoParent } from "@/lib/actions/household"
import { invitationSchema } from "@/lib/validations/household"
import type { InvitationInput } from "@/lib/validations/household"

export function InviteForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "co_parent",
    },
  })

  const onSubmit = (data: InvitationInput) => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await inviteCoParent(data)
      if (!result.success && result.error) {
        setError(result.error)
      } else {
        setSuccess("Invitation envoyée avec succès!")
        form.reset()
      }
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Inviter un co-parent</CardTitle>
        <CardDescription>
          Invitez une personne à rejoindre votre foyer pour partager la charge
          mentale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="coparent@exemple.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Un email d&apos;invitation sera envoyé à cette adresse
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="co_parent">Co-parent</option>
                      <option value="tiers">Tiers (nounou, grand-parent...)</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Les co-parents ont les mêmes droits, les tiers ont un accès
                    limité
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
