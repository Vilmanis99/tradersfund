import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default function HeaderBrand({ lang }: { lang: 'en' | 'ru' }) {
  const isRussian = lang === 'ru'

  return (
    <Link
      href={isRussian ? '/ru' : '/'}
      className="site-header__brand"
      aria-label={isRussian ? 'Главная Traders Fund Hub на русском' : 'Traders Fund Hub home'}
      hrefLang={isRussian ? 'ru' : 'en'}
    >
      <div className="site-header__logo" aria-hidden="true">
        <TrendingUp size={18} color="#fff" />
      </div>
      <span className="site-header__wordmark">
        Traders <span className="gradient-text--animated">Fund</span> Hub
      </span>
    </Link>
  )
}
