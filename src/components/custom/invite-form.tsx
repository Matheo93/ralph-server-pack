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
import { showToast } from "@/lib/toast-messages"
import { invitationSchema } from "@/lib/validations/household"
import type { InvitationInput } from "@/lib/validations/household"
import { Copy, Check, Mail, Link as LinkIcon } from "lucide-react"

export function InviteForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "co_parent",
    },
  })

  const onSubmit = (data: InvitationInput) => {
    setError(null)
    setInviteLink(null)
    startTransition(async () => {
      const result = await inviteCoParent(data)
      if (!result.success && result.error) {
        setError(result.error)
        showToast.error("generic", result.error)
      } else if (result.data?.token) {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
        setInviteLink(`${baseUrl}/invite/${result.data.token}`)
        showToast.success("inviteSent", data.email)
        form.reset()
      }
    })
  }

  const copyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      showToast.success("copied")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setInviteLink(null)
    setError(null)
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
        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-700 dark:text-green-400">
                  Invitation créée avec succès !
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Partagez ce lien avec la personne que vous souhaitez inviter.
                Le lien expire dans 7 jours.
              </p>

              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const mailtoLink = `mailto:?subject=Invitation FamilyLoad&body=Je t'invite a rejoindre mon foyer sur FamilyLoad ! Clique sur ce lien pour accepter : ${encodeURIComponent(inviteLink)}`
                  window.location.href = mailtoLink
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Envoyer par email
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
              >
                Nouvelle invitation
              </Button>
            </div>
          </div>
        ) : (
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
                      L&apos;adresse email de la personne à inviter
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
                    <FormLabel>Role</FormLabel>
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

              <Button type="submit" className="w-full" disabled={isPending}>
                <LinkIcon className="w-4 h-4 mr-2" />
                {isPending ? "Création..." : "Créer le lien d'invitation"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
