import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { Sidebar } from "@/components/custom/sidebar"
import { Header } from "@/components/custom/header"
import { MobileNav } from "@/components/custom/mobile-nav"
import { BottomNav } from "@/components/custom/bottom-nav"
import { InstallPrompt } from "@/components/custom/InstallPrompt"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const membership = await getHousehold()

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
    subscription_status: string
  } | null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <MobileNav />
          <div className="h-6 w-px bg-border lg:hidden" />
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {household?.name && (
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                  {household.name}
                </span>
              )}
              {household && household.streak_current > 0 && (
                <span className="text-sm font-medium text-orange-500">
                  {household.streak_current} jour{household.streak_current > 1 ? "s" : ""} de suite
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center">
              <Header email={user.email ?? ""} householdName={household?.name} />
            </div>
          </div>
        </div>
        <main className="py-4 pb-20 lg:pb-4">{children}</main>
      </div>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
