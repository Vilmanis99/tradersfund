import type { Metadata } from 'next'
import '../globals.css'
import '../light-platform.css'
import '../home.css'
import './ru.css'
import SiteDocument from '@/components/SiteDocument'
import { siteMetadata } from '@/lib/siteMetadata'

// Re-run source-age gates on requests after one hour, even without a new deployment.
// This does not refresh source captures; expired evidence still needs editorial review.
export const revalidate = 3600

// Russian root layout: the server renders <html lang="ru">. Metadata is the
// shared site metadata with the same /ru overrides it had as a nested layout.
export const metadata: Metadata = {
  ...siteMetadata,
  robots: { index: true, follow: true },
  keywords: 'проп-фирмы, проп-компании, проп-трейдинг, челлендж проп-фирмы, русскоязычные трейдеры, проп-фирмы для трейдеров, funded account',
}

export default function RussianLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteDocument lang="ru">
      <div lang="ru" className="ru-site" data-russian-locale="pilot" data-locale="ru">
        {children}
      </div>
    </SiteDocument>
  )
}
