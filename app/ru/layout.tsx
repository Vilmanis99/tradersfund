import type { Metadata } from 'next'
import './ru.css'

// Re-run source-age gates on requests after one hour, even without a new deployment.
// This does not refresh source captures; expired evidence still needs editorial review.
export const revalidate = 3600

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  keywords: 'проп-фирмы, проп-компании, проп-трейдинг, челлендж проп-фирмы, русскоязычные трейдеры, проп-фирмы для трейдеров, funded account',
}

export default function RussianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ru" className="ru-site" data-russian-locale="pilot" data-locale="ru">
      {children}
    </div>
  )
}
