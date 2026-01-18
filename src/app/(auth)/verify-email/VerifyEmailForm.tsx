"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { confirmSignup, resendConfirmationCode } from "@/lib/auth/actions"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"

interface VerifyEmailFormProps {
  email: string
}

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1)

    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are entered
    if (digit && index === 5 && newCode.every((d) => d)) {
      handleSubmit(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)

    if (pastedData.length === 6) {
      const newCode = pastedData.split("")
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = (codeString?: string) => {
    const finalCode = codeString ?? code.join("")

    if (finalCode.length !== 6) {
      setError("Veuillez entrer le code à 6 chiffres")
      return
    }

    setError(null)
    setResendMessage(null)
    startTransition(async () => {
      const result = await confirmSignup(email, finalCode)

      if (!result.success && result.error) {
        setError(result.error)
        // Clear code on error
        setCode(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      } else {
        setSuccess(true)
        // Redirect to login after short delay
        setTimeout(() => {
          router.push("/login?verified=true")
        }, 1500)
      }
    })
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)
    setResendMessage(null)

    const result = await resendConfirmationCode(email)

    setIsResending(false)

    if (result.success) {
      setResendMessage("Un nouveau code a été envoyé à votre adresse email")
      // Clear any existing code
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } else {
      setError(result.error ?? "Erreur lors de l'envoi du code")
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Email vérifié</h2>
            <p className="text-muted-foreground">
              Redirection vers la connexion...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Confirmer votre email</CardTitle>
        <CardDescription>
          Entrez le code à 6 chiffres envoyé à{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Code inputs */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold"
                disabled={isPending}
                aria-label={`Chiffre ${index + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {resendMessage && (
            <p className="text-sm text-green-600 text-center">{resendMessage}</p>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={isPending || code.some((d) => !d)}
            onClick={() => handleSubmit()}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              "Vérifier mon email"
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Vous n&apos;avez pas reçu de code ?{" "}
          <button
            type="button"
            className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleResend}
            disabled={isResending || isPending}
          >
            {isResending ? "Envoi en cours..." : "Renvoyer le code"}
          </button>
        </p>
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;inscription
        </Link>
      </CardFooter>
    </Card>
  )
}
