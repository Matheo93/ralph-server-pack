"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateNotificationPreferences } from "@/lib/actions/settings"
import { Bell, Loader2 } from "lucide-react"
import { showToast } from "@/lib/toast-messages"

interface NotificationSettingsProps {
  preferences: {
    push_enabled: boolean
    email_enabled: boolean
    daily_reminder_time: string | null
    reminder_before_deadline_hours: number
    weekly_summary_enabled: boolean
    balance_alert_enabled: boolean
  } | null
}

const REMINDER_TIMES = [
  { value: "07:00", label: "07:00" },
  { value: "08:00", label: "08:00" },
  { value: "09:00", label: "09:00" },
  { value: "10:00", label: "10:00" },
  { value: "disabled", label: "Désactivé" },
]

const BEFORE_DEADLINE_OPTIONS = [
  { value: "12", label: "12 heures avant" },
  { value: "24", label: "24 heures avant" },
  { value: "48", label: "48 heures avant" },
  { value: "72", label: "72 heures avant" },
]

export function NotificationSettings({ preferences }: NotificationSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [pushEnabled, setPushEnabled] = useState(preferences?.push_enabled ?? true)
  const [emailEnabled, setEmailEnabled] = useState(preferences?.email_enabled ?? true)
  const [reminderTime, setReminderTime] = useState(
    preferences?.daily_reminder_time ?? "08:00"
  )
  const [beforeDeadline, setBeforeDeadline] = useState(
    String(preferences?.reminder_before_deadline_hours ?? 24)
  )
  const [weeklySummary, setWeeklySummary] = useState(
    preferences?.weekly_summary_enabled ?? true
  )
  const [balanceAlert, setBalanceAlert] = useState(
    preferences?.balance_alert_enabled ?? true
  )
  const [testingPush, setTestingPush] = useState(false)
  const [pushTestResult, setPushTestResult] = useState<string | null>(null)

  const handleTestPush = async () => {
    setTestingPush(true)
    setPushTestResult(null)

    try {
      // Check if the browser supports notifications
      if (!("Notification" in window)) {
        setPushTestResult("Votre navigateur ne supporte pas les notifications push")
        return
      }

      // Request permission if needed
      if (Notification.permission === "denied") {
        setPushTestResult("Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur.")
        return
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          setPushTestResult("Permission refusée pour les notifications")
          return
        }
      }

      // For now just show a local notification as test
      // In production, this would register the FCM token and send a test via the server
      new Notification("Test FamilyLoad", {
        body: "Les notifications push fonctionnent correctement !",
        icon: "/icons/icon-192x192.png",
      })

      setPushTestResult("Notification envoyée ! Vérifiez votre écran.")
      showToast.info("pushSent")
    } catch (error) {
      console.error("Push test error:", error)
      setPushTestResult("Erreur lors du test des notifications")
      showToast.error("pushTestFailed")
    } finally {
      setTestingPush(false)
    }
  }

  const handleSave = () => {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateNotificationPreferences({
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        daily_reminder_time: reminderTime === "disabled" ? null : reminderTime,
        reminder_before_deadline_hours: parseInt(beforeDeadline, 10),
        weekly_summary_enabled: weeklySummary,
        balance_alert_enabled: balanceAlert,
      })

      if (result.success) {
        setSuccess(true)
        showToast.success("notificationsUpdated")
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const errorMessage = result.error ?? "Une erreur est survenue"
        setError(errorMessage)
        showToast.error("notificationsUpdateFailed", errorMessage)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Push notifications */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push">Notifications push</Label>
            <p className="text-sm text-muted-foreground">
              Recevoir des notifications sur votre appareil
            </p>
          </div>
          <Switch
            id="push"
            checked={pushEnabled}
            onCheckedChange={setPushEnabled}
            disabled={isPending}
          />
        </div>
        {pushEnabled && (
          <div className="flex items-center gap-3 ml-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPush}
              disabled={testingPush || isPending}
            >
              {testingPush ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-3 w-3" />
                  Tester les notifications
                </>
              )}
            </Button>
            {pushTestResult && (
              <span className="text-sm text-muted-foreground">{pushTestResult}</span>
            )}
          </div>
        )}
      </div>

      {/* Email notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email">Notifications email</Label>
          <p className="text-sm text-muted-foreground">
            Recevoir des rappels par email
          </p>
        </div>
        <Switch
          id="email"
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
          disabled={isPending}
        />
      </div>

      {/* Daily reminder time */}
      <div className="space-y-2">
        <Label htmlFor="reminderTime">Rappel quotidien</Label>
        <Select
          value={reminderTime}
          onValueChange={setReminderTime}
          disabled={isPending}
        >
          <SelectTrigger id="reminderTime" className="w-[180px]">
            <SelectValue placeholder="Heure du rappel" />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_TIMES.map((time) => (
              <SelectItem key={time.value} value={time.value}>
                {time.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Before deadline */}
      <div className="space-y-2">
        <Label htmlFor="beforeDeadline">Rappel avant deadline</Label>
        <Select
          value={beforeDeadline}
          onValueChange={setBeforeDeadline}
          disabled={isPending}
        >
          <SelectTrigger id="beforeDeadline" className="w-[180px]">
            <SelectValue placeholder="Délai" />
          </SelectTrigger>
          <SelectContent>
            {BEFORE_DEADLINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly summary */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="weekly">Résumé hebdomadaire</Label>
          <p className="text-sm text-muted-foreground">
            Email récapitulatif chaque dimanche
          </p>
        </div>
        <Switch
          id="weekly"
          checked={weeklySummary}
          onCheckedChange={setWeeklySummary}
          disabled={isPending}
        />
      </div>

      {/* Balance alert */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="balance">Alerte déséquilibre</Label>
          <p className="text-sm text-muted-foreground">
            Notification si la charge mentale est mal répartie
          </p>
        </div>
        <Switch
          id="balance"
          checked={balanceAlert}
          onCheckedChange={setBalanceAlert}
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">Préférences mises à jour</p>
      )}

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  )
}
