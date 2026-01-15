import { getUserId } from "@/lib/auth/actions"
import { redirect } from "next/navigation"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationSettings } from "@/components/custom/NotificationSettings"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface NotificationPreferences {
  push_enabled: boolean
  email_enabled: boolean
  daily_reminder_time: string | null
  reminder_before_deadline_hours: number
  weekly_summary_enabled: boolean
  balance_alert_enabled: boolean
}

async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const userId = await getUserId()
  if (!userId) return null

  await setCurrentUser(userId)

  const prefs = await queryOne<NotificationPreferences>(`
    SELECT
      push_enabled,
      email_enabled,
      daily_reminder_time,
      reminder_before_deadline_hours,
      weekly_summary_enabled,
      balance_alert_enabled
    FROM user_preferences
    WHERE user_id = $1
  `, [userId])

  // Return defaults if no preferences exist
  if (!prefs) {
    return {
      push_enabled: true,
      email_enabled: true,
      daily_reminder_time: "08:00",
      reminder_before_deadline_hours: 24,
      weekly_summary_enabled: true,
      balance_alert_enabled: true,
    }
  }

  return prefs
}

export default async function NotificationSettingsPage() {
  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  const preferences = await getNotificationPreferences()

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Retour aux paramètres
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Configurez quand et comment vous souhaitez être notifié
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Canaux de notification</CardTitle>
            <CardDescription>
              Choisissez comment recevoir vos notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings preferences={preferences} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rappels quotidiens</CardTitle>
            <CardDescription>
              Recevez un résumé des tâches du jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rappel du matin</p>
                  <p className="text-sm text-muted-foreground">
                    {preferences?.daily_reminder_time
                      ? `Tous les jours à ${preferences.daily_reminder_time}`
                      : "Désactivé"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Avant deadline</p>
                  <p className="text-sm text-muted-foreground">
                    Rappel {preferences?.reminder_before_deadline_hours ?? 24}h avant chaque deadline
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumés et alertes</CardTitle>
            <CardDescription>
              Notifications périodiques et alertes spéciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Résumé hebdomadaire</p>
                  <p className="text-sm text-muted-foreground">
                    Bilan de la semaine par email
                  </p>
                </div>
                <span className={preferences?.weekly_summary_enabled ? "text-green-600" : "text-muted-foreground"}>
                  {preferences?.weekly_summary_enabled ? "Activé" : "Désactivé"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alerte déséquilibre</p>
                  <p className="text-sm text-muted-foreground">
                    Notification si la charge est mal répartie ({">"} 60/40)
                  </p>
                </div>
                <span className={preferences?.balance_alert_enabled ? "text-green-600" : "text-muted-foreground"}>
                  {preferences?.balance_alert_enabled ? "Activé" : "Désactivé"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
