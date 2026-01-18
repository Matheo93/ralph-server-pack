"use client"

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fadeInUp, slideInRight } from "@/lib/animations"

// ============================================
// TOAST TYPES
// ============================================

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading"

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastInput = Omit<Toast, "id">

// ============================================
// TOAST CONFIG
// ============================================

const TOAST_DEFAULTS: Record<ToastVariant, { icon: typeof CheckCircle2; duration: number }> = {
  success: { icon: CheckCircle2, duration: 4000 },
  error: { icon: AlertCircle, duration: 6000 },
  warning: { icon: AlertTriangle, duration: 5000 },
  info: { icon: Info, duration: 4000 },
  loading: { icon: Loader2, duration: Infinity },
}

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  loading: "bg-muted border-border text-foreground",
}

const ICON_STYLES: Record<ToastVariant, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
  loading: "text-muted-foreground animate-spin",
}

// ============================================
// TOAST CONTEXT
// ============================================

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: ToastInput) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<ToastInput>) => void
  clearToasts: () => void
  // Convenience methods
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    }
  ) => Promise<T>
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================
// TOAST PROVIDER
// ============================================

interface ToastProviderProps {
  children: ReactNode
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
  maxToasts?: number
}

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const generateId = useCallback(() => {
    return `toast_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
  }, [])

  const addToast = useCallback((input: ToastInput): string => {
    const id = generateId()
    const defaults = TOAST_DEFAULTS[input.variant]

    const toast: Toast = {
      id,
      variant: input.variant,
      title: input.title,
      description: input.description,
      duration: input.duration ?? defaults.duration,
      dismissible: input.dismissible ?? true,
      action: input.action,
    }

    setToasts((prev) => {
      const newToasts = [...prev, toast]
      // Keep only the latest maxToasts
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts)
      }
      return newToasts
    })

    return id
  }, [generateId, maxToasts])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<ToastInput>) => {
    setToasts((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...updates }
          : t
      )
    )
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback(
    (title: string, description?: string) =>
      addToast({ variant: "success", title, description }),
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string) =>
      addToast({ variant: "error", title, description }),
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string) =>
      addToast({ variant: "warning", title, description }),
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string) =>
      addToast({ variant: "info", title, description }),
    [addToast]
  )

  const loading = useCallback(
    (title: string, description?: string) =>
      addToast({ variant: "loading", title, description, dismissible: false }),
    [addToast]
  )

  const promiseHandler = useCallback(
    async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((err: Error) => string)
      }
    ): Promise<T> => {
      const toastId = addToast({
        variant: "loading",
        title: messages.loading,
        dismissible: false,
      })

      try {
        const result = await promise
        updateToast(toastId, {
          variant: "success",
          title: typeof messages.success === "function"
            ? messages.success(result)
            : messages.success,
          dismissible: true,
          duration: TOAST_DEFAULTS.success.duration,
        })
        return result
      } catch (err) {
        updateToast(toastId, {
          variant: "error",
          title: typeof messages.error === "function"
            ? messages.error(err as Error)
            : messages.error,
          dismissible: true,
          duration: TOAST_DEFAULTS.error.duration,
        })
        throw err
      }
    },
    [addToast, updateToast]
  )

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    loading,
    promise: promiseHandler,
  }

  // Position classes
  const positionClasses: Record<typeof position, string> = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-2 pointer-events-none",
          positionClasses[position],
          position.includes("bottom") ? "flex-col-reverse" : "flex-col"
        )}
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ============================================
// TOAST ITEM COMPONENT
// ============================================

interface ToastItemProps {
  toast: Toast
  onDismiss: () => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { variant, title, description, duration, dismissible, action } = toast
  const config = TOAST_DEFAULTS[variant]
  const Icon = config.icon

  // Auto-dismiss timer
  useEffect(() => {
    if (duration && duration !== Infinity) {
      const timer = setTimeout(onDismiss, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onDismiss])

  return (
    <motion.div
      layout
      variants={slideInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg",
        TOAST_STYLES[variant]
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon
          className={cn("h-5 w-5 shrink-0 mt-0.5", ICON_STYLES[variant])}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="text-sm opacity-80 mt-0.5">{description}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium underline mt-2 hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar for timed toasts */}
      {duration && duration !== Infinity && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-lg"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  )
}

// ============================================
// HOOK
// ============================================

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// ============================================
// STANDALONE TOAST FUNCTION (for outside React)
// ============================================

let toastHandlerRef: ToastContextValue | null = null

export function setToastHandler(handler: ToastContextValue) {
  toastHandlerRef = handler
}

// Support both positional and object syntax:
// toast.success("Title", "Description") OR toast.success({ title: "Title", description: "Description" })
type ToastArgs = [string, string?] | [{ title: string; description?: string }]

function parseToastArgs(args: ToastArgs): { title: string; description?: string } {
  if (typeof args[0] === "object") {
    return args[0]
  }
  return { title: args[0], description: args[1] }
}

export const toast = {
  success: (...args: ToastArgs) => {
    const { title, description } = parseToastArgs(args)
    toastHandlerRef?.success(title, description)
  },
  error: (...args: ToastArgs) => {
    const { title, description } = parseToastArgs(args)
    toastHandlerRef?.error(title, description)
  },
  warning: (...args: ToastArgs) => {
    const { title, description } = parseToastArgs(args)
    toastHandlerRef?.warning(title, description)
  },
  info: (...args: ToastArgs) => {
    const { title, description } = parseToastArgs(args)
    toastHandlerRef?.info(title, description)
  },
  loading: (...args: ToastArgs) => {
    const { title, description } = parseToastArgs(args)
    return toastHandlerRef?.loading(title, description)
  },
  dismiss: (id: string) => {
    toastHandlerRef?.removeToast(id)
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    }
  ) => {
    return toastHandlerRef?.promise(promise, messages)
  },
}

// ============================================
// TOAST HANDLER SYNC COMPONENT
// ============================================

export function ToastHandlerSync() {
  const toastContext = useToast()

  useEffect(() => {
    setToastHandler(toastContext)
    return () => {
      toastHandlerRef = null
    }
  }, [toastContext])

  return null
}
