import { getUserId } from "@/lib/auth/actions"
import { redirect } from "next/navigation"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "@/components/custom/ProfileForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface UserProfile {
  id: string
  email: string
  name: string | null
  language: string
  timezone: string
  created_at: string
}

async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getUserId()
  if (!userId) return null

  await setCurrentUser(userId)

  const user = await queryOne<UserProfile>(`
    SELECT id, email, name, language, timezone, created_at
    FROM users
    WHERE id = $1
  `, [userId])

  return user
}

export default async function ProfileSettingsPage() {
  const profile = await getUserProfile()

  if (!profile) {
    redirect("/login")
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Retour aux paramètres
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
            <CardDescription>
              Ces informations sont utilisées pour personnaliser votre expérience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse email</CardTitle>
            <CardDescription>
              Votre adresse email ne peut pas être modifiée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Membre depuis le{" "}
              {new Date(profile.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
