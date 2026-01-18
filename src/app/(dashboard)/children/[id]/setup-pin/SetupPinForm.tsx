"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, Copy, AlertCircle, Loader2 } from "lucide-react"
import { setupChildPin } from "@/lib/actions/kids-auth"

interface SetupPinFormProps {
  childId: string
  childName: string
  hasExistingAccount: boolean
  kidsLoginUrl: string
}

export function SetupPinForm({ childId, childName, hasExistingAccount, kidsLoginUrl }: SetupPinFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate PIN
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit contenir exactement 4 chiffres")
      return
    }

    if (pin !== confirmPin) {
      setError("Les codes PIN ne correspondent pas")
      return
    }

    startTransition(async () => {
      const result = await setupChildPin(childId, pin)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error ?? "Erreur lors de la configuration")
      }
    })
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(kidsLoginUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (success) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-500 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Le code PIN de {childName} a été configuré avec succès !
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Lien de connexion</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Partagez ce lien avec {childName} pour accéder à son espace
            </p>
            <div className="flex gap-2">
              <Input value={kidsLoginUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => router.push(`/children/${childId}`)}>
              Retour au profil
            </Button>
            <Button className="flex-1" onClick={() => router.push("/children")}>
              Liste des enfants
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin">Code PIN (4 chiffres)</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPin">Confirmer le code PIN</Label>
          <Input
            id="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="text-center text-2xl tracking-widest"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || pin.length !== 4}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Configuration...
          </>
        ) : hasExistingAccount ? (
          "Modifier le PIN"
        ) : (
          "Configurer le PIN"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ce code PIN permettra à {childName} de se connecter à son espace dédié
      </p>
    </form>
  )
}
