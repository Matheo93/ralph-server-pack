import { AuthForm } from "@/components/custom/auth-form"

interface LoginPageProps {
  searchParams: Promise<{ magic?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const isMagicLink = params.magic === "true"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm mode={isMagicLink ? "magic-link" : "login"} />
    </div>
  )
}
