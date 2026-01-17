export default function KidsNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl max-w-md text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Page non trouvée
        </h1>
        <p className="text-gray-600 mb-6">
          Oups ! Cette page n&apos;existe pas ou le profil n&apos;est plus disponible.
        </p>
        <a
          href="/kids"
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-full hover:opacity-90 transition-opacity"
        >
          Retour à la sélection
        </a>
      </div>
    </div>
  )
}
