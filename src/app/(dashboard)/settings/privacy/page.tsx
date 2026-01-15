import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserId } from "@/lib/auth/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PrivacyActions } from "@/components/custom/PrivacyActions"
import { Download, Trash2, ShieldCheck, AlertTriangle } from "lucide-react"

export default async function PrivacySettingsPage() {
  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Retour aux paramètres
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Confidentialité et données</h1>
        <p className="text-muted-foreground">
          Gérez vos données personnelles conformément au RGPD
        </p>
      </div>

      <div className="space-y-6">
        {/* Data Protection Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <CardTitle>Protection de vos données</CardTitle>
            </div>
            <CardDescription>
              Vos données sont protégées conformément au Règlement Général sur la Protection des Données (RGPD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>FamilyLoad respecte votre vie privée et vous garantit :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Le droit d&apos;accès à vos données</li>
              <li>Le droit de rectification de vos données</li>
              <li>Le droit à l&apos;effacement (droit à l&apos;oubli)</li>
              <li>Le droit à la portabilité de vos données</li>
              <li>Le droit d&apos;opposition au traitement</li>
            </ul>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <CardTitle>Exporter mes données</CardTitle>
            </div>
            <CardDescription>
              Téléchargez une copie de toutes vos données personnelles au format JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrivacyActions action="export" />
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Supprimer mon compte</CardTitle>
            </div>
            <CardDescription>
              Supprimez définitivement votre compte et toutes vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive mb-1">Action irréversible</p>
                  <p className="text-muted-foreground">
                    La suppression de votre compte entraînera la perte définitive de :
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Toutes vos tâches et leur historique</li>
                    <li>Les données de vos enfants</li>
                    <li>Vos préférences et paramètres</li>
                    <li>Votre abonnement (sans remboursement)</li>
                  </ul>
                </div>
              </div>
            </div>
            <PrivacyActions action="delete" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
