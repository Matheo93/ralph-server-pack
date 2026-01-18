'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { verifyChildPin } from '@/lib/actions/kids-auth'

interface PinLoginFormProps {
  child: {
    id: string
    first_name: string
    avatar_url: string | null
  }
}

const PIN_LENGTH = 4

export function PinLoginForm({ child }: PinLoginFormProps) {
  const router = useRouter()
  const [pin, setPin] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus sur l'input invisible au montage
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Soumettre automatiquement quand 4 chiffres sont entrés
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handleSubmit()
    }
  }, [pin])

  const handleSubmit = () => {
    if (pin.length !== PIN_LENGTH || isPending) return

    setError(null)
    startTransition(async () => {
      const result = await verifyChildPin({
        childId: child.id,
        pin: pin.join(''),
      })

      if (result.success) {
        // Redirection vers le dashboard
        router.push(`/kids/${child.id}/dashboard`)
      } else {
        // Erreur: shake animation + reset
        setShake(true)
        setError(result.error ?? 'Erreur de connexion')
        setTimeout(() => {
          setShake(false)
          setPin([])
        }, 500)
      }
    })
  }

  const handleKeyPress = (digit: string) => {
    if (isPending) return

    if (digit === 'delete') {
      setPin((prev) => prev.slice(0, -1))
      setError(null)
      return
    }

    if (pin.length < PIN_LENGTH) {
      setPin((prev) => [...prev, digit])
    }
  }

  // Clavier invisible pour mobile
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(value.split(''))
    setError(null)
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Avatar et nom */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Avatar className="w-24 h-24 mx-auto border-4 border-white dark:border-slate-700 shadow-lg mb-4">
          {child.avatar_url ? (
            <AvatarImage src={child.avatar_url} alt={`Avatar de ${child.first_name}`} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-500 text-white text-3xl font-bold" aria-hidden="true">
            {child.first_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Salut {child.first_name} ! 👋
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mt-2">Entre ton code secret</p>
      </motion.div>

      {/* Input invisible pour mobile keyboard */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={PIN_LENGTH}
        value={pin.join('')}
        onChange={handleInputChange}
        className="sr-only"
        autoComplete="one-time-code"
        aria-label="Code PIN à 4 chiffres"
        aria-describedby={error ? "pin-error" : undefined}
      />

      {/* Indicateurs PIN */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="flex justify-center gap-4 mb-6"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.8 }}
            animate={{
              scale: pin[index] ? 1.1 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-5 h-5 rounded-full transition-colors ${
              pin[index]
                ? 'bg-pink-500 dark:bg-pink-400'
                : 'bg-gray-200 dark:bg-slate-600'
            }`}
          />
        ))}
      </motion.div>

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            id="pin-error"
            role="alert"
            aria-live="assertive"
            className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 text-center py-3 px-4 rounded-2xl mb-6 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clavier numérique */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map(
          (digit, index) => {
            if (digit === '') {
              return <div key={index} />
            }

            const isDelete = digit === 'delete'

            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleKeyPress(digit)}
                disabled={isPending}
                aria-label={isDelete ? 'Effacer' : `Chiffre ${digit}`}
                className={`
                  h-16 rounded-2xl font-bold text-2xl
                  transition-colors focus:outline-none focus:ring-4 focus:ring-pink-300 dark:focus:ring-purple-500
                  ${isDelete
                    ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-md'
                  }
                  ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isDelete ? (
                  <svg
                    className="w-6 h-6 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                    />
                  </svg>
                ) : (
                  digit
                )}
              </motion.button>
            )
          }
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-medium">Vérification...</span>
          </div>
        </motion.div>
      )}

      {/* Aide */}
      <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-8">
        Tu as oublié ton code ? Demande à tes parents de le réinitialiser.
      </p>
    </div>
  )
}
