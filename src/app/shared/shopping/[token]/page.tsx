import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSharedShoppingList } from "@/lib/actions/shopping-share"
import { SharedShoppingListView } from "./SharedShoppingListView"

interface SharedShoppingPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: SharedShoppingPageProps): Promise<Metadata> {
  const { token } = await params
  const result = await getSharedShoppingList(token)

  if (!result.success || !result.data) {
    return {
      title: "Liste introuvable | FamilyLoad",
      description: "Cette liste de courses n'existe pas ou n'est plus disponible.",
    }
  }

  const { list } = result.data

  return {
    title: `${list.name} | Liste partagee | FamilyLoad`,
    description: `Liste de courses partagee: ${list.item_count} articles, ${list.checked_count} coches.`,
    openGraph: {
      title: `${list.name} - Liste de courses`,
      description: `${list.item_count} articles a acheter`,
      type: "website",
    },
  }
}

export default async function SharedShoppingPage({ params }: SharedShoppingPageProps) {
  const { token } = await params
  const result = await getSharedShoppingList(token)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Liste introuvable</h1>
          <p className="text-muted-foreground">
            {result.error || "Ce lien de partage n'est plus valide ou a expire."}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Retour a l'accueil
          </a>
        </div>
      </div>
    )
  }

  return <SharedShoppingListView list={result.data.list} items={result.data.items} />
}
