"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { errorShake, fadeInUp } from "@/lib/animations"
import { cn } from "@/lib/utils"

// ============================================
// FORM ERROR TYPES
// ============================================

export type FormErrorVariant = "inline" | "banner" | "toast"

// ============================================
// FORM ERROR PROPS
// ============================================

interface FormErrorProps {
  error: string | null
  variant?: FormErrorVariant
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showIcon?: boolean
}

// ============================================
// FORM ERROR COMPONENT
// ============================================

export function FormError({
  error,
  variant = "banner",
  onRetry,
  onDismiss,
  className,
  showIcon = true,
}: FormErrorProps) {
  if (!error) return null

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          key="form-error"
          variants={errorShake}
          initial="initial"
          animate="error"
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className={cn(
            "overflow-hidden",
            variant === "inline" && "text-sm",
            className
          )}
        >
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className={cn(
              "flex items-start gap-3 rounded-lg border",
              variant === "banner" &&
                "p-4 bg-destructive/5 border-destructive/20",
              variant === "inline" &&
                "p-2 bg-destructive/5 border-destructive/20",
              variant === "toast" &&
                "p-4 bg-background border-destructive/30 shadow-lg"
            )}
          >
            {showIcon && (
              <AlertCircle
                className={cn(
                  "shrink-0 text-destructive",
                  variant === "inline" ? "h-4 w-4 mt-0.5" : "h-5 w-5"
                )}
              />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-destructive font-medium",
                  variant === "inline" ? "text-sm" : "text-base"
                )}
              >
                {error}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onRetry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Réessayer</span>
                </Button>
              )}
              {onDismiss && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fermer</span>
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// FIELD ERROR COMPONENT (for form fields)
// ============================================

interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          key="field-error"
          initial={{ opacity: 0, y: -5, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -5, height: 0 }}
          className={cn(
            "text-sm text-destructive mt-1",
            className
          )}
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

// ============================================
// ERROR ALERT (for critical errors)
// ============================================

interface ErrorAlertProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorAlert({
  title = "Une erreur est survenue",
  message,
  onRetry,
  onDismiss,
  className,
}: ErrorAlertProps) {
  return (
    <motion.div
      variants={errorShake}
      initial="initial"
      animate="error"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 p-4",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-destructive">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              )}
              {onDismiss && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                >
                  Fermer
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// NETWORK ERROR COMPONENT
// ============================================

interface NetworkErrorProps {
  onRetry?: () => void
  className?: string
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-1">Problème de connexion</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Vérifiez votre connexion internet et réessayez.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      )}
    </motion.div>
  )
}
