"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGlobalShortcuts, formatShortcut } from "@/hooks/useKeyboardShortcuts"
import { scaleIn } from "@/lib/animations"
import { Keyboard } from "lucide-react"

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const shortcuts = useGlobalShortcuts()

  // Listen for custom event to show help
  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener("show-shortcuts-help", handler)
    return () => document.removeEventListener("show-shortcuts-help", handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <AnimatePresence>
            {shortcuts.map((shortcut, index) => (
              <motion.div
                key={shortcut.key + shortcut.description}
                className="flex items-center justify-between py-2 border-b last:border-0"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.05 }}
              >
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
                <kbd className="inline-flex items-center px-2 py-1 font-mono text-xs bg-muted rounded-md border">
                  {formatShortcut(shortcut)}
                </kbd>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Appuyez sur <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Échap</kbd> pour fermer cette fenêtre.
        </p>
      </DialogContent>
    </Dialog>
  )
}
