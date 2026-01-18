import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { getUserId } from "@/lib/auth/actions"
import { getChild } from "@/lib/actions/children"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import { SetupPinForm } from "./SetupPinForm"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SetupPinPage({ params }: PageProps) {
  const { id } = await params

  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  const child = await getChild(id)
  if (!child) {
    notFound()
  }

  await setCurrentUser(userId)

  // Check if account already exists
  const existingAccount = await queryOne<{ child_id: string }>(
    "SELECT child_id FROM child_accounts WHERE child_id = $1",
    [id]
  )

  // Get base URL for kids login
  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const isLocalOrIP = host.includes("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(host)
  const protocol = isLocalOrIP ? "http" : "https"
  const kidsLoginUrl = `${protocol}://${host}/kids/login/${id}`

  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/children/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {existingAccount ? "Modifier le PIN" : "Configurer l'Espace Enfant"}
          </CardTitle>
          <CardDescription>
            {existingAccount
              ? `Modifiez le code PIN de ${child.first_name}`
              : `Créez un code PIN pour que ${child.first_name} puisse accéder à son espace`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupPinForm
            childId={id}
            childName={child.first_name}
            hasExistingAccount={!!existingAccount}
            kidsLoginUrl={kidsLoginUrl}
          />
        </CardContent>
      </Card>
    </div>
  )
}
