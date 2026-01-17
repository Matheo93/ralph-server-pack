import type { Metadata, Viewport } from 'next'
import './kids-animations.css'

export const metadata: Metadata = {
  title: {
    template: '%s | FamilyLoad Kids',
    default: 'FamilyLoad Kids',
  },
  description: 'Interface enfants de FamilyLoad - Accomplis tes missions et gagne des récompenses !',
  manifest: '/manifest.json',
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FED7AA', // Orange clair pour l'interface enfants
}

export default function KidsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 relative overflow-hidden">

      {/* Animated floating shapes background - game-like atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {/* Large gradient orbs with gentle animation */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-pink-300/40 to-purple-300/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-br from-yellow-300/40 to-orange-300/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/3 -right-20 w-48 h-48 bg-gradient-to-br from-cyan-300/30 to-teal-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-2/3 left-10 w-40 h-40 bg-gradient-to-br from-lime-300/30 to-green-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }} />

        {/* Floating emojis - more playful with varied animations */}
        <div className="absolute top-[8%] left-[5%] text-4xl opacity-60 animate-bounce" style={{ animationDuration: '2.5s' }}>🌟</div>
        <div className="absolute top-[15%] right-[10%] text-3xl opacity-60 animate-float-up" style={{ animationDelay: '0.3s' }}>🎈</div>
        <div className="absolute top-[35%] left-[3%] text-3xl opacity-50 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}>🦋</div>
        <div className="absolute top-[50%] right-[5%] text-4xl opacity-50 animate-wiggle">🎨</div>
        <div className="absolute top-[70%] left-[8%] text-3xl opacity-50 animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '0.5s' }}>🏆</div>
        <div className="absolute top-[80%] right-[12%] text-4xl opacity-60 animate-float-up" style={{ animationDelay: '1s' }}>🎮</div>
        <div className="absolute top-[25%] left-[90%] text-2xl opacity-40 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1.5s' }}>💎</div>
        <div className="absolute top-[60%] left-[92%] text-3xl opacity-40 animate-rainbow-glow">🌈</div>

        {/* Additional fun emojis */}
        <div className="absolute top-[5%] left-[50%] text-3xl opacity-50 animate-bounce" style={{ animationDuration: '2.8s' }}>🚀</div>
        <div className="absolute top-[42%] left-[15%] text-2xl opacity-40 animate-wiggle">🎪</div>
        <div className="absolute top-[88%] left-[40%] text-3xl opacity-50 animate-float-up" style={{ animationDelay: '0.5s' }}>🦄</div>

        {/* Sparkle stars with rainbow glow */}
        <div className="absolute top-[12%] left-[25%] text-yellow-400/50 text-2xl animate-ping" style={{ animationDuration: '2s' }}>✨</div>
        <div className="absolute top-[45%] right-[25%] text-pink-400/50 text-xl animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>✨</div>
        <div className="absolute top-[75%] left-[30%] text-purple-400/50 text-lg animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}>✨</div>
        <div className="absolute top-[28%] right-[35%] text-cyan-400/50 text-xl animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.8s' }}>⭐</div>

        {/* Floating bubbles effect - more varied */}
        <div className="absolute top-[20%] left-[45%] w-8 h-8 bg-gradient-to-br from-white/40 to-pink-200/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '4s', animationDelay: '0.2s' }} />
        <div className="absolute top-[55%] left-[55%] w-6 h-6 bg-gradient-to-br from-white/40 to-purple-200/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3.5s', animationDelay: '0.7s' }} />
        <div className="absolute top-[40%] left-[75%] w-10 h-10 bg-gradient-to-br from-white/40 to-cyan-200/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '5s', animationDelay: '1.2s' }} />
        <div className="absolute top-[65%] left-[20%] w-7 h-7 bg-gradient-to-br from-white/40 to-lime-200/40 rounded-full animate-float-up shadow-lg" style={{ animationDelay: '0.4s' }} />
        <div className="absolute top-[85%] left-[65%] w-5 h-5 bg-gradient-to-br from-white/40 to-yellow-200/40 rounded-full animate-bounce shadow-lg" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />

        {/* Confetti elements - falling slowly */}
        <div className="absolute w-3 h-3 bg-pink-400 rounded-sm animate-confetti" style={{ left: '10%', animationDuration: '8s', animationDelay: '0s' }} />
        <div className="absolute w-2 h-4 bg-yellow-400 rounded-sm animate-confetti" style={{ left: '25%', animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute w-3 h-2 bg-cyan-400 rounded-sm animate-confetti" style={{ left: '40%', animationDuration: '9s', animationDelay: '1s' }} />
        <div className="absolute w-2 h-3 bg-purple-400 rounded-sm animate-confetti" style={{ left: '60%', animationDuration: '11s', animationDelay: '3s' }} />
        <div className="absolute w-4 h-2 bg-green-400 rounded-sm animate-confetti" style={{ left: '75%', animationDuration: '8.5s', animationDelay: '0.5s' }} />
        <div className="absolute w-2 h-2 bg-orange-400 rounded-full animate-confetti" style={{ left: '90%', animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
