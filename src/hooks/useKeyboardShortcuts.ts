"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

type KeyHandler = () => void

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  handler: KeyHandler
  description: string
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  shortcuts: ShortcutConfig[]
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const metaMatch = shortcut.meta ? event.metaKey : true

        // For shortcuts without modifiers, skip if in input
        const hasModifier = shortcut.ctrl || shortcut.alt || shortcut.shift || shortcut.meta
        if (!hasModifier && isInput) continue

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    },
    [enabled, shortcuts]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Hook for global app shortcuts
 */
export function useGlobalShortcuts() {
  const router = useRouter()

  const shortcuts: ShortcutConfig[] = [
    {
      key: "n",
      handler: () => router.push("/tasks/new"),
      description: "Nouvelle tache",
    },
    {
      key: "d",
      handler: () => router.push("/dashboard"),
      description: "Aller au dashboard",
    },
    {
      key: "t",
      handler: () => router.push("/tasks"),
      description: "Voir les taches",
    },
    {
      key: "c",
      handler: () => router.push("/children"),
      description: "Voir les enfants",
    },
    {
      key: "s",
      handler: () => router.push("/settings"),
      description: "Parametres",
    },
    {
      key: "/",
      ctrl: true,
      handler: () => {
        // Show keyboard shortcuts help modal
        const event = new CustomEvent("show-shortcuts-help")
        document.dispatchEvent(event)
      },
      description: "Afficher l'aide des raccourcis",
    },
  ]

  useKeyboardShortcuts({ shortcuts })

  return shortcuts
}

/**
 * Hook for list navigation with arrow keys
 */
export function useListNavigation<T>(
  items: T[],
  options?: {
    onSelect?: (item: T, index: number) => void
    onActivate?: (item: T, index: number) => void
    enabled?: boolean
    loop?: boolean
  }
) {
  const { onSelect, onActivate, enabled = true, loop = true } = options ?? {}

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentIndex: number) => {
      if (!enabled || items.length === 0) return

      let newIndex: number | null = null

      switch (event.key) {
        case "ArrowDown":
        case "j":
          event.preventDefault()
          newIndex = currentIndex + 1
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1
          }
          break

        case "ArrowUp":
        case "k":
          event.preventDefault()
          newIndex = currentIndex - 1
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0
          }
          break

        case "Home":
          event.preventDefault()
          newIndex = 0
          break

        case "End":
          event.preventDefault()
          newIndex = items.length - 1
          break

        case "Enter":
        case " ":
          event.preventDefault()
          const currentItem = items[currentIndex]
          if (onActivate && currentItem !== undefined) {
            onActivate(currentItem, currentIndex)
          }
          return

        default:
          return
      }

      if (newIndex !== null && newIndex !== currentIndex && onSelect) {
        const item = items[newIndex]
        if (item !== undefined) {
          onSelect(item, newIndex)
        }
      }
    },
    [enabled, items, loop, onSelect, onActivate]
  )

  return { handleKeyDown }
}

/**
 * Hook for escape key to close modals/dialogs
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handler()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handler, enabled])
}

/**
 * Get a formatted shortcut string for display
 */
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []

  if (config.ctrl) parts.push("Ctrl")
  if (config.alt) parts.push("Alt")
  if (config.shift) parts.push("Shift")
  if (config.meta) parts.push("Cmd")

  // Format special keys
  const keyDisplay =
    config.key === " "
      ? "Space"
      : config.key === "/"
        ? "/"
        : config.key.toUpperCase()

  parts.push(keyDisplay)

  return parts.join(" + ")
}
