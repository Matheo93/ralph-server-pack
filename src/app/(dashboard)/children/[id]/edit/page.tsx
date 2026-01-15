import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getChild } from "@/lib/actions/children"
import { ChildForm } from "@/components/custom/child-form"
import { Button } from "@/components/ui/button"

interface EditChildPageProps {
  params: Promise<{ id: string }>
}

export default async function EditChildPage({ params }: EditChildPageProps) {
  const { id } = await params
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const child = await getChild(id)

  if (!child) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/children">
          <Button variant="ghost" className="mb-4">
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">Modifier {child.first_name}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Modifiez les informations de l&apos;enfant
        </p>
      </div>

      <div className="max-w-lg">
        <ChildForm child={child} mode="edit" />
      </div>
    </div>
  )
}
