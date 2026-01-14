"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { commonChildTags } from "@/lib/validations/onboarding"
import type { OnboardingStep2Input, OnboardingChildInput } from "@/lib/validations/onboarding"

interface OnboardingStep2ChildrenProps {
  data: OnboardingStep2Input
  onUpdate: (data: OnboardingStep2Input) => void
  onNext: () => void
  onPrevious: () => void
}

function ChildCard({
  child,
  onRemove,
}: {
  child: OnboardingChildInput
  onRemove: () => void
}) {
  const birthDate = new Date(child.birthdate)
  const age = Math.floor(
    (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {child.first_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium">{child.first_name}</p>
          <p className="text-sm text-muted-foreground">{age} ans</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {child.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {child.tags.length > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{child.tags.length - 2}
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
      </div>
    </div>
  )
}

// Simple schema for the add form
const addChildFormSchema = z.object({
  first_name: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
  birthdate: z
    .string()
    .min(1, "La date de naissance est requise"),
})

type AddChildFormData = z.infer<typeof addChildFormSchema>

function AddChildForm({
  onAdd,
  onCancel,
}: {
  onAdd: (child: OnboardingChildInput) => void
  onCancel: () => void
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const form = useForm<AddChildFormData>({
    resolver: zodResolver(addChildFormSchema),
    defaultValues: {
      first_name: "",
      birthdate: "",
    },
  })

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const onSubmit = (data: AddChildFormData) => {
    // Validate birthdate is in the past
    const parsed = new Date(data.birthdate)
    if (isNaN(parsed.getTime()) || parsed >= new Date()) {
      form.setError("birthdate", {
        type: "manual",
        message: "La date de naissance doit être dans le passé",
      })
      return
    }

    onAdd({
      first_name: data.first_name,
      birthdate: data.birthdate,
      tags: selectedTags,
    })
    form.reset()
    setSelectedTags([])
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Prénom" autoFocus {...field} />
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormLabel>Tags (optionnel)</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonChildTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export function OnboardingStep2Children({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: OnboardingStep2ChildrenProps) {
  const [showAddForm, setShowAddForm] = useState(data.children.length === 0)

  const addChild = (child: OnboardingChildInput) => {
    const newData = { children: [...data.children, child] }
    onUpdate(newData)
    setShowAddForm(false)
  }

  const removeChild = (index: number) => {
    const newChildren = data.children.filter((_, i) => i !== index)
    onUpdate({ children: newChildren })
    if (newChildren.length === 0) {
      setShowAddForm(true)
    }
  }

  const handleNext = () => {
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* List of added children */}
      {data.children.length > 0 && (
        <div className="space-y-3">
          {data.children.map((child, index) => (
            <ChildCard
              key={`${child.first_name}-${index}`}
              child={child}
              onRemove={() => removeChild(index)}
            />
          ))}
        </div>
      )}

      {/* Add child form */}
      {showAddForm ? (
        <AddChildForm
          onAdd={addChild}
          onCancel={() => data.children.length > 0 && setShowAddForm(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ajouter un enfant
        </Button>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Retour
        </Button>
        <Button type="button" onClick={handleNext}>
          {data.children.length === 0 ? "Passer" : "Continuer"}
        </Button>
      </div>
    </div>
  )
}
