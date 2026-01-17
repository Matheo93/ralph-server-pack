import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser, query, queryOne } from "@/lib/aws/database"
import { getAllExclusions, type MemberExclusion } from "@/lib/actions/settings"
import { SettingsNav } from "@/components/custom/SettingsNav"
import { ExclusionsClient } from "./ExclusionsClient"

export const metadata: Metadata = {
  title: "Exclusions temporaires - Paramètres",
  description: "Gérer les exclusions temporaires des membres du foyer",
}

interface HouseholdMember {
  id: string
  name: string | null
  email: string
}

async function getHouseholdMembers(): Promise<HouseholdMember[]> {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return []

  const members = await query<{ user_id: string; name: string | null; email: string }>(`
    SELECT
      hm.user_id as id,
      u.name,
      u.email
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
    ORDER BY u.name, u.email
  `, [membership.household_id])

  return members.map(m => ({
    id: m.user_id,
    name: m.name,
    email: m.email,
  }))
}

export default async function ExclusionsPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")

  const [members, exclusions] = await Promise.all([
    getHouseholdMembers(),
    getAllExclusions(),
  ])

  return (
    <div className="container max-w-4xl py-6 px-4 space-y-6">
      <SettingsNav />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Exclusions temporaires</h1>
        <p className="text-muted-foreground">
          Gérez les périodes où un membre n'est pas disponible pour recevoir des tâches.
        </p>
      </div>

      <ExclusionsClient members={members} initialExclusions={exclusions} />
    </div>
  )
}
