import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ListOrdered } from 'lucide-react'

// Served with HTTP 404 for unknown /ru/* URLs and notFound() calls under /ru.
export const metadata: Metadata = {
  title: { absolute: 'Страница не найдена | TradersFundHub' },
  description: 'Такой страницы нет или она переехала. Вернитесь на русскую версию TradersFundHub или откройте рейтинг проп-фирм.',
  robots: { index: false, follow: true },
}

export default function RussianNotFound() {
  return (
    <div lang="ru" style={{ maxWidth: 640, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }} data-russian-not-found>
      <p style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
        404
      </p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: 'var(--text)', marginBottom: '1rem', lineHeight: 1.15 }}>
        Страница не найдена
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '2rem' }}>
        Такой страницы нет или она переехала. Начните с русской версии сайта или сразу откройте рейтинг проп-фирм.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/ru" className="btn-primary">
          <ArrowLeft size={16} aria-hidden="true" /> На главную
        </Link>
        <Link href="/ru/luchshie-prop-firmy" className="btn-outline">
          <ListOrdered size={16} aria-hidden="true" /> Рейтинг проп-фирм
        </Link>
      </div>
    </div>
  )
}
