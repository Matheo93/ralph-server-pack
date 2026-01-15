"use client"

import Link from "next/link"

interface SkipLink {
  href: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
}

const defaultLinks: SkipLink[] = [
  { href: "#main-content", label: "Aller au contenu principal" },
  { href: "#navigation", label: "Aller a la navigation" },
]

export function SkipLinks({ links = defaultLinks }: SkipLinksProps) {
  return (
    <nav aria-label="Liens d'accessibilite" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-2 left-0 right-0 z-[9999] flex justify-center gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="skip-link"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
