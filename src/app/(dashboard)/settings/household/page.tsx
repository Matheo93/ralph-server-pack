import { getUserId } from "@/lib/auth/actions"
import { redirect } from "next/navigation"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HouseholdSettings } from "@/components/custom/HouseholdSettings"
import { InviteForm } from "@/components/custom/invite-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Household {
  id: string
  name: string
  country: string
  timezone: string
  streak_current: number
  created_at: string
}

interface HouseholdMember {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  is_active: boolean
  joined_at: string
}

async function getHouseholdData(): Promise<{
  household: Household | null
  members: HouseholdMember[]
  currentUserId: string | null
}> {
  const userId = await getUserId()
  if (!userId) return { household: null, members: [], currentUserId: null }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return { household: null, members: [], currentUserId: userId }

  // Get household details
  const household = await queryOne<Household>(`
    SELECT id, name, country, timezone, streak_current, created_at
    FROM households
    WHERE id = $1
  `, [membership.household_id])

  // Get all members
  const members = await query<HouseholdMember>(`
    SELECT
      hm.id,
      hm.user_id,
      u.email,
      u.name,
      hm.role,
      hm.is_active,
      hm.joined_at
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1
    ORDER BY hm.joined_at ASC
  `, [membership.household_id])

  return { household, members, currentUserId: userId }
}

export default async function HouseholdSettingsPage() {
  const { household, members, currentUserId } = await getHouseholdData()

  if (!household || !currentUserId) {
    redirect("/onboarding")
  }

  const currentMember = members.find((m) => m.user_id === currentUserId)
  const isAdmin = currentMember?.role === "admin"

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Retour aux paramètres
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Foyer</h1>
        <p className="text-muted-foreground">
          Gérez les membres et paramètres de votre foyer
        </p>
      </div>

      <div className="space-y-6">
        {/* Household info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du foyer</CardTitle>
            <CardDescription>
              Nom et paramètres généraux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HouseholdSettings
              household={household}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Membres du foyer</CardTitle>
            <CardDescription>
              {members.length} membre{members.length !== 1 ? "s" : ""} dans le foyer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {member.name ?? member.email?.split("@")[0] ?? "Parent"}
                      {member.user_id === currentUserId && (
                        <span className="text-muted-foreground text-sm ml-2">(vous)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role === "admin" ? "Admin" : "Membre"}
                    </Badge>
                    {!member.is_active && (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invite */}
        {isAdmin && (
          <InviteForm />
        )}

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{household.streak_current}</p>
                <p className="text-sm text-muted-foreground">Streak actuel</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Date(household.created_at).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">Membre depuis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
