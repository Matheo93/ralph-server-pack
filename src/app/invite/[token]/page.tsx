import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { acceptInvitation } from "@/lib/actions/household"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const user = await getUser()

  // Verify invitation exists and is valid
  const supabase = await createClient()
  const { data: invitation } = await supabase
    .from("invitations")
    .select(
      `
      id,
      email,
      role,
      expires_at,
      accepted_at,
      households (
        name
      )
    `
    )
    .eq("token", token)
    .single()

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              Cette invitation n&apos;existe pas ou a été annulée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Retour à la connexion</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invitation.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation déjà acceptée</CardTitle>
            <CardDescription>
              Cette invitation a déjà été utilisée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Aller au tableau de bord</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation expirée</CardTitle>
            <CardDescription>
              Cette invitation a expiré. Demandez à l&apos;expéditeur d&apos;en
              envoyer une nouvelle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Retour à la connexion</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If not logged in, redirect to signup with callback
  if (!user) {
    redirect(`/signup?next=/invite/${token}`)
  }

  // Accept invitation
  const result = await acceptInvitation(token)

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Aller au tableau de bord</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Should redirect from acceptInvitation, but fallback
  redirect("/dashboard")
}
