import { notFound } from 'next/navigation'
import { getChildForLogin } from '@/lib/actions/kids-auth'
import { PinLoginForm } from './PinLoginForm'

interface Props {
  params: Promise<{ childId: string }>
}

export default async function KidsLoginPage({ params }: Props) {
  const { childId } = await params

  // Récupérer les infos de l'enfant
  const result = await getChildForLogin(childId)

  if (!result.success || !result.data) {
    notFound()
  }

  const child = result.data

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 dark:from-slate-900 dark:via-purple-950 dark:to-indigo-950 flex flex-col transition-colors duration-300">
      {/* Header avec retour */}
      <header className="p-4">
        <a
          href="/kids"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <svg
            className="w-6 h-6 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Changer de profil
        </a>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <PinLoginForm child={child} />
      </main>
    </div>
  )
}

export async function generateMetadata({ params }: Props) {
  const { childId } = await params
  const result = await getChildForLogin(childId)

  if (!result.success || !result.data) {
    return {
      title: 'Connexion - FamilyLoad Kids',
    }
  }

  return {
    title: `${result.data.first_name} - Connexion - FamilyLoad Kids`,
    description: `Page de connexion pour ${result.data.first_name}`,
  }
}
