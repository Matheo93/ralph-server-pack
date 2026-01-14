"use client"

import { useState, useTransition, useEffect } from "react"
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
import { createChild, updateChild } from "@/lib/actions/children"
import {
  childSchema,
  calculateAge,
  suggestSchoolLevel,
  suggestSchoolClass,
} from "@/lib/validations/child"
import type { ChildInput } from "@/lib/validations/child"
import type { Child } from "@/types/database"

interface ChildFormProps {
  child?: Child
  mode?: "create" | "edit"
}

export function ChildForm({ child, mode = "create" }: ChildFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [age, setAge] = useState<number | null>(null)

  const form = useForm<ChildInput>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      first_name: child?.first_name ?? "",
      birthdate: child?.birthdate ?? "",
      gender: (child?.gender as "M" | "F" | null) ?? null,
      school_name: child?.school_name ?? "",
      school_level:
        (child?.school_level as
          | "maternelle"
          | "primaire"
          | "college"
          | "lycee"
          | null) ?? null,
      school_class: child?.school_class ?? "",
      tags: (child?.tags as string[]) ?? [],
    },
  })

  const birthdate = form.watch("birthdate")

  useEffect(() => {
    if (birthdate) {
      const calculatedAge = calculateAge(birthdate)
      setAge(calculatedAge)

      // Auto-suggest school level and class
      if (mode === "create" && !form.getValues("school_level")) {
        const suggestedLevel = suggestSchoolLevel(calculatedAge)
        if (suggestedLevel) {
          form.setValue("school_level", suggestedLevel)
        }
      }
      if (mode === "create" && !form.getValues("school_class")) {
        const suggestedClass = suggestSchoolClass(calculatedAge)
        if (suggestedClass) {
          form.setValue("school_class", suggestedClass)
        }
      }
    } else {
      setAge(null)
    }
  }, [birthdate, mode, form])

  const onSubmit = (data: ChildInput) => {
    setError(null)
    startTransition(async () => {
      if (mode === "edit" && child) {
        const result = await updateChild({ id: child.id, ...data })
        if (!result.success && result.error) {
          setError(result.error)
        }
      } else {
        const result = await createChild(data)
        if (!result.success && result.error) {
          setError(result.error)
        }
      }
    })
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {mode === "edit" ? "Modifier l'enfant" : "Ajouter un enfant"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Modifiez les informations de l'enfant"
            : "Ajoutez un enfant à votre foyer pour générer automatiquement les tâches"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Emma" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthdate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  {age !== null && (
                    <FormDescription>
                      {age} an{age > 1 ? "s" : ""}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre (optionnel)</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || null)
                      }
                    >
                      <option value="">Non spécifié</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>École (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="École Jean Jaurès"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="school_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      >
                        <option value="">Non spécifié</option>
                        <option value="maternelle">Maternelle</option>
                        <option value="primaire">Primaire</option>
                        <option value="college">Collège</option>
                        <option value="lycee">Lycée</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CE2"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? mode === "edit"
                  ? "Modification..."
                  : "Ajout..."
                : mode === "edit"
                  ? "Enregistrer les modifications"
                  : "Ajouter l'enfant"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
