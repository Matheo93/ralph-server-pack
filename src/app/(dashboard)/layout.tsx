import { redirect } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"
import { getUser } from "@/lib/auth/actions"
import { getHousehold, getHouseholdMembers } from "@/lib/actions/household"
import { QueryProvider } from "@/lib/providers/QueryProvider"
import { PopupCoordinatorProvider } from "@/lib/providers/PopupCoordinator"
import { Sidebar } from "@/components/custom/sidebar"
import { Header } from "@/components/custom/header"
import { MobileNav } from "@/components/custom/mobile-nav"
import { BottomNav } from "@/components/custom/bottom-nav"
import { InstallPrompt } from "@/components/custom/InstallPrompt"
import { UpdatePrompt } from "@/components/custom/UpdatePrompt"
import { SkipLinks } from "@/components/custom/SkipLinks"
import { KeyboardShortcutsHelp } from "@/components/custom/KeyboardShortcutsHelp"
import { OfflineIndicator } from "@/components/custom/OfflineIndicator"
import { PageTransitionProvider, PageWrapper } from "@/components/custom/PageTransition"
import { UnifiedFAB } from "@/components/custom/UnifiedFAB"
import { CoachMarksProvider } from "@/components/custom/CoachMarks"
import { PushPermissionPrompt } from "@/components/custom/PushPermissionPrompt"
import { OnboardingTutorial } from "@/components/custom/OnboardingTutorial"
import { MagicChat } from "@/components/custom/MagicChat"
import { InviteCoParentCTA } from "@/components/custom/InviteCoParentCTA"
import { RoutePrefetcher } from "@/components/custom/RoutePrefetcher"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Parallel data fetching for faster initial load
  const [user, membership] = await Promise.all([
    getUser(),
    getHousehold(),
  ])

  if (!user) {
    redirect("/login")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const household = membership.households as {
    id: string
    name: string
    country: string
    timezone: string
    streak_current: number
    streak_best: number
    subscription_status: string | null
    subscription_ends_at: string | null
  } | null

  // Parallel fetch for members and i18n (these don't depend on each other)
  const [members, locale, messages] = await Promise.all([
    household ? getHouseholdMembers(household.id) : Promise.resolve([]),
    getLocale(),
    getMessages(),
  ])
  const memberCount = members.length

  // Calculate premium status
  // Premium is true if:
  // 1. Status is "active" or "premium" (paid subscription - may not have end date if auto-renew)
  // 2. Status is "trial/trialing" with a valid end date in the future
  const now = new Date()
  const subscriptionEndsAt = household?.subscription_ends_at
    ? new Date(household.subscription_ends_at)
    : null
  const subscriptionStatus = household?.subscription_status ?? null
  const isTrialing = subscriptionStatus === "trial" || subscriptionStatus === "trialing"
  const isActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "premium" || isTrialing
  // Active/premium status = premium (auto-renew subscriptions may not have end date)
  // Trial status = premium only if end date is in the future
  const isPremium = subscriptionStatus === "active" || subscriptionStatus === "premium" || (isActiveSubscription && subscriptionEndsAt !== null && subscriptionEndsAt > now)

  let daysRemaining: number | null = null
  if (subscriptionEndsAt) {
    daysRemaining = Math.ceil(
      (subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysRemaining < 0) daysRemaining = 0
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <PopupCoordinatorProvider>
        <CoachMarksProvider>
        <PageTransitionProvider>
          <SkipLinks />
          <div className="min-h-screen bg-background">
            <Sidebar
              isPremium={isPremium}
              isTrialing={isTrialing}
              daysRemaining={daysRemaining}
            />
            <div className="lg:pl-64">
              <header
                id="navigation"
                className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8"
              >
                <MobileNav />
                <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />
                <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                  <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {household?.name && (
                      <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                        {household.name}
                      </span>
                    )}
                    {household && household.streak_current > 0 && (
                      <span data-tour="header-streak" className="text-sm font-medium text-orange-500" aria-label={`Streak de ${household.streak_current} jours`}>
                        {household.streak_current} jour{household.streak_current > 1 ? "s" : ""} de suite
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center">
                    <Header
                      email={user.email ?? ""}
                      householdName={household?.name}
                      isPremium={isPremium}
                      isTrialing={isTrialing}
                      daysRemaining={daysRemaining}
                    />
                  </div>
                </div>
              </header>
              <main id="main-content" className="py-4 pb-20 lg:pb-4" role="main">
                <PageWrapper>
                  {children}
                </PageWrapper>
              </main>
            </div>
            <BottomNav />
            <UnifiedFAB />
            <InstallPrompt />
            <UpdatePrompt position="bottom" />
            <KeyboardShortcutsHelp />
            <OfflineIndicator showOnlineStatus />
            <PushPermissionPrompt compact showAfterMs={10000} />
            <InviteCoParentCTA memberCount={memberCount} />
            <OnboardingTutorial />
            <MagicChat
              isPremium={isPremium}
              householdId={household?.id ?? ""}
            />
            <RoutePrefetcher contextual />
          </div>
        </PageTransitionProvider>
        </CoachMarksProvider>
        </PopupCoordinatorProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  )
}
