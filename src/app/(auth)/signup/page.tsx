import { AuthForm } from "@/components/custom/auth-form"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm mode="signup" />
    </div>
  )
}
