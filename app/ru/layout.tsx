import type { Metadata } from 'next'
import './ru.css'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  keywords: 'проп-фирмы, проп-компании, проп-трейдинг, челлендж проп-фирмы, русскоязычные трейдеры, проп-фирмы для трейдеров, funded account',
}

export default function RussianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ru" className="ru-site" data-russian-locale="pilot">
      {children}
    </div>
  )
}
