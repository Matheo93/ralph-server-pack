"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEvent,
} from "@/lib/actions/calendar"
import { showToast } from "@/lib/toast-messages"
import {
  EVENT_TYPE_LABELS,
  RECURRENCE_LABELS,
  EVENT_COLORS,
  type EventType,
  type Recurrence,
} from "@/lib/validations/calendar"

interface EventFormDialogProps {
  open: boolean
  onClose: () => void
  event: CalendarEvent | null
  defaultDate: Date | null
  children: Array<{ id: string; first_name: string }>
  householdMembers: Array<{ user_id: string; name: string | null }>
}

export function EventFormDialog({
  open,
  onClose,
  event,
  defaultDate,
  children,
  householdMembers,
}: EventFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!event

  const defaultStartDate = event
    ? format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm")
    : defaultDate
    ? format(defaultDate, "yyyy-MM-dd'T'09:00")
    : format(new Date(), "yyyy-MM-dd'T'09:00")

  const defaultEndDate = event?.end_date
    ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm")
    : ""

  const handleSubmit = (formData: FormData) => {
    setError(null)

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const startDateStr = formData.get("start_date") as string
    const endDateStr = formData.get("end_date") as string
    const allDay = formData.get("all_day") === "on"
    const eventType = formData.get("event_type") as EventType
    const recurrence = formData.get("recurrence") as Recurrence
    const assignedTo = formData.get("assigned_to") as string
    const childId = formData.get("child_id") as string
    const location = formData.get("location") as string
    const color = formData.get("color") as string

    if (!title.trim()) {
      setError("Le titre est requis")
      return
    }

    const startDate = new Date(startDateStr).toISOString()
    const endDate = endDateStr ? new Date(endDateStr).toISOString() : null

    startTransition(async () => {
      if (isEditing && event) {
        const result = await updateCalendarEvent({
          id: event.id,
          title,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          all_day: allDay,
          event_type: eventType,
          recurrence,
          assigned_to: assignedTo === "none" ? null : (assignedTo || null),
          child_id: childId === "none" ? null : (childId || null),
          location: location || null,
          color,
        })

        if (result.success) {
          showToast.success("eventUpdated", title)
          onClose()
        } else {
          setError(result.error || "Erreur lors de la mise à jour")
          showToast.error("eventCreateFailed", result.error || "Erreur lors de la mise à jour")
        }
      } else {
        const result = await createCalendarEvent({
          title,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          all_day: allDay,
          event_type: eventType,
          recurrence,
          assigned_to: assignedTo === "none" ? null : (assignedTo || null),
          child_id: childId === "none" ? null : (childId || null),
          location: location || null,
          color,
          reminder_minutes: 30,
        })

        if (result.success) {
          showToast.success("eventCreated", title)
          onClose()
        } else {
          setError(result.error || "Erreur lors de la création")
          showToast.error("eventCreateFailed", result.error || "Erreur lors de la création")
        }
      }
    })
  }

  const handleDelete = () => {
    if (!event || !confirm("Supprimer cet événement ?")) return

    startTransition(async () => {
      const result = await deleteCalendarEvent(event.id)
      if (result.success) {
        showToast.success("eventDeleted", event.title)
        onClose()
      } else {
        setError(result.error || "Erreur lors de la suppression")
        showToast.error("generic", result.error || "Erreur lors de la suppression")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'événement" : "Nouvel événement"}
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={event?.title || ""}
              placeholder="Ex: RDV pédiatre"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Type</Label>
              <Select name="event_type" defaultValue={event?.event_type || "general"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <Select name="color" defaultValue={event?.color || EVENT_COLORS.primary}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_COLORS).map(([name, hex]) => (
                    <SelectItem key={hex} value={hex}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: hex }} />
                        <span className="capitalize">{name === "primary" ? "Indigo" : name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all_day"
              name="all_day"
              defaultChecked={event?.all_day || false}
            />
            <Label htmlFor="all_day" className="font-normal">
              Toute la journée
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Début *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="datetime-local"
                defaultValue={defaultStartDate}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fin</Label>
              <Input
                id="end_date"
                name="end_date"
                type="datetime-local"
                defaultValue={defaultEndDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Récurrence</Label>
            <Select name="recurrence" defaultValue={event?.recurrence || "none"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigné à</Label>
              <Select name="assigned_to" defaultValue={event?.assigned_to || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Personne</SelectItem>
                  {householdMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name || "Membre"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="child_id">Enfant concerné</Label>
              <Select name="child_id" defaultValue={event?.child_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              name="location"
              defaultValue={event?.location || ""}
              placeholder="Ex: Cabinet du Dr Martin, 10 rue..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={event?.description || ""}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
