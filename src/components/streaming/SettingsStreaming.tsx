import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton for ProfileForm section
 */
export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
          <CardDescription>
            Ces informations sont utilisées pour personnaliser votre expérience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-10 w-full" shimmer />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-10 w-full" shimmer />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" shimmer />
            <Skeleton className="h-10 w-full" shimmer />
          </div>
          <Skeleton className="h-10 w-32" shimmer />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse email</CardTitle>
          <CardDescription>
            Votre adresse email ne peut pas être modifiée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-48" shimmer />
          <Skeleton className="h-3 w-36 mt-1" shimmer />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton for HouseholdSettings section
 */
export function HouseholdSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Household info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du foyer</CardTitle>
          <CardDescription>Nom et paramètres généraux</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" shimmer />
            <Skeleton className="h-10 w-full" shimmer />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-10 w-full" shimmer />
          </div>
          <Skeleton className="h-10 w-32" shimmer />
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Membres du foyer</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32 inline-block" shimmer />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" shimmer />
                  <Skeleton className="h-4 w-36" shimmer />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" shimmer />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-8 w-12" shimmer />
              <Skeleton className="h-4 w-20 mt-1" shimmer />
            </div>
            <div>
              <Skeleton className="h-8 w-24" shimmer />
              <Skeleton className="h-4 w-20 mt-1" shimmer />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton for NotificationSettings section
 */
export function NotificationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Canaux de notification</CardTitle>
          <CardDescription>
            Choisissez comment recevoir vos notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" shimmer />
                <Skeleton className="h-4 w-48" shimmer />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" shimmer />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rappels quotidiens</CardTitle>
          <CardDescription>
            Recevez un résumé des tâches du jour
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" shimmer />
                <Skeleton className="h-4 w-40" shimmer />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumés et alertes</CardTitle>
          <CardDescription>
            Notifications périodiques et alertes spéciales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-36" shimmer />
                <Skeleton className="h-4 w-52" shimmer />
              </div>
              <Skeleton className="h-4 w-16" shimmer />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton for BillingContent section
 */
export function BillingContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Subscription status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Abonnement</CardTitle>
            <Skeleton className="h-6 w-20 rounded-full" shimmer />
          </div>
          <CardDescription>Gérez votre abonnement Premium</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" shimmer />
              <Skeleton className="h-4 w-32" shimmer />
            </div>
            <Skeleton className="h-10 w-28" shimmer />
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card>
        <CardHeader>
          <CardTitle>Moyen de paiement</CardTitle>
          <CardDescription>Carte bancaire enregistrée</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-14 rounded" shimmer />
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" shimmer />
                <Skeleton className="h-4 w-20" shimmer />
              </div>
            </div>
            <Skeleton className="h-9 w-24" shimmer />
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" shimmer />
                  <Skeleton className="h-4 w-24" shimmer />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" shimmer />
                  <Skeleton className="h-8 w-8 rounded" shimmer />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Generic settings page skeleton with back button
 */
export function SettingsPageSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Skeleton className="h-9 w-40 mb-4" shimmer />
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" shimmer />
            <Skeleton className="h-4 w-48" shimmer />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" shimmer />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
