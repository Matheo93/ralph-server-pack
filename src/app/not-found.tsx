"use client"

import Link from "next/link"
import { Home, ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Illustration 404 */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-blue-100 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl">🔍</div>
          </div>
        </div>

        {/* Contenu */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Page introuvable
          </h1>
          <p className="text-gray-600 mb-6">
            Oups ! La page que vous recherchez n&apos;existe pas ou a été déplacée.
            Pas de panique, vous pouvez retourner à l&apos;accueil.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
            >
              <Home className="h-5 w-5" />
              Accueil
            </Link>
            <button
              onClick={() => typeof window !== "undefined" && window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">Vous cherchez peut-être :</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/60 rounded-full hover:bg-white transition-colors"
            >
              <Search className="h-3 w-3" />
              Tableau de bord
            </Link>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/60 rounded-full hover:bg-white transition-colors"
            >
              <Search className="h-3 w-3" />
              Mes tâches
            </Link>
            <Link
              href="/kids"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/60 rounded-full hover:bg-white transition-colors"
            >
              <Search className="h-3 w-3" />
              Espace enfants
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
