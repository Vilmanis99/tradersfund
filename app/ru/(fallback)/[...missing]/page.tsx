import { notFound } from 'next/navigation'

// Unknown /ru/* URLs land here so they render app/ru/not-found.tsx (Russian
// copy, lang="ru" from app/ru/layout.tsx) with HTTP 404. Real Russian routes
// are static segments and always win over this catch-all. The (fallback) route
// group keeps this file out of scans of app/ru/<slug>/page.tsx.
// Render per request so arbitrary unknown /ru/* paths never enter the ISR cache.
export const dynamic = 'force-dynamic'

export default function RussianMissingPage(): never {
  notFound()
}
