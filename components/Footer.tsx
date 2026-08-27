'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import NewsletterForm from './NewsletterForm'
import AnimatedNumber from './AnimatedNumber'
import AnalyticsPreferencesButton from './AnalyticsPreferencesButton'

type FooterProps = {
  firmCount: number
  pricedChallengeCount: number
  articleCount: number
  latestCapture?: string
  newsletterEnabled: boolean
}

export default function Footer({
  firmCount,
  pricedChallengeCount,
  articleCount,
  latestCapture,
  newsletterEnabled,
}: FooterProps) {
  const pathname = usePathname()
  const isRussian = pathname === '/ru' || pathname.startsWith('/ru/')
  const updatedLabel = latestCapture
    ? new Date(`${latestCapture}T00:00:00Z`).toLocaleDateString(isRussian ? 'ru-RU' : 'en-US', {
    month: 'short',
    year: 'numeric',
      })
    : isRussian ? 'нет данных' : 'Not available'

  const propFirmLinks = isRussian ? [
    { label: 'Рейтинг проп-фирм 2026', href: '/ru/luchshie-prop-firmy' },
    { label: 'Крипто-проп-фирмы', href: '/ru/luchshie-kripto-prop-firmy' },
    { label: 'Без челленджа', href: '/ru/prop-firmy-bez-chelendzha' },
    { label: 'Для русскоязычных трейдеров', href: '/ru/dlya-russkoyazychnykh-treyderov' },
    { label: 'FundedNext или Bright Funded', href: '/ru/fundednext-vs-bright-funded' },
    { label: 'Сравнение FundedNext и FundingPips', href: '/ru/fundednext-vs-fundingpips' },
    { label: 'Промокоды и предложения', href: '/ru/promokody-prop-firm' },
    { label: 'Выплаты проп-фирм', href: '/ru/vyplaty-prop-firm' },
    { label: 'Без KYC: проверка условий', href: '/ru/prop-firmy-bez-kyc' },
    { label: 'Обзор PropLive', href: '/ru/obzor-proplive' },
    { label: 'Обзор Era Trade', href: '/ru/obzor-eratrade' },
    { label: 'Обзор KasCapital', href: '/ru/obzor-kascapital' },
    { label: 'Российские компании', href: '/ru/rossiyskie-prop-kompanii' },
    { label: 'Отзывы проп-фирм', href: '/ru/otzyvy-prop-firm' },
    { label: 'Как работают челленджи', href: '/ru/kak-rabotayut-chellendzhi-prop-firm' },
    { label: 'Глобальные продукты', href: '/prop-firm-challenges' },
  ] : [
    { label: 'Best Prop Firms 2026', href: '/best-prop-firms-2026' },
    { label: 'Global Directory', href: '/prop-firms' },
    { label: 'Compare Challenges', href: '/prop-firm-challenges' },
    { label: 'Challenge Changes', href: '/prop-firm-challenge-changes' },
    { label: 'Best Firms in UK', href: '/best-prop-firms-in-uk' },
    { label: 'Best Firms in US', href: '/best-prop-firms-in-us' },
    { label: 'Best Firms in India', href: '/best-prop-firms-in-india' },
    { label: 'India Challenge Comparison', href: '/best-prop-firms-in-india/challenge-comparison' },
    { label: 'India Comparisons', href: '/best-prop-firms-in-india/compare' },
    { label: 'India Challenge Changes', href: '/best-prop-firms-in-india/challenge-changes' },
    { label: 'Cheapest Firms', href: '/cheapest-prop-firms' },
    { label: 'Discount Codes', href: '/prop-firm-discount-codes' },
    { label: 'Futures Firms', href: '/best-futures-prop-firms' },
    { label: 'Crypto Firms', href: '/best-crypto-prop-firms' },
    { label: 'Swing Trading Firms', href: '/best-swing-trading-prop-firms' },
    { label: 'How Challenges Work', href: '/how-prop-firm-challenges-work' },
  ]
  const reviewLinks = isRussian ? [
    { label: 'Обзор FundedNext', href: '/ru/obzor-fundednext' },
    { label: 'Обзор FundingPips', href: '/ru/obzor-fundingpips' },
    { label: 'Обзор Bright Funded', href: '/ru/obzor-bright-funded' },
    { label: 'Все обзоры на английском', href: '/blog' },
  ] : [
    { label: 'FTMO Review', href: '/blog/ftmo-review' },
    { label: 'FundedNext Review', href: '/blog/fundednext-review' },
    { label: 'FundingPips Review', href: '/blog/funding-pips-review' },
    { label: 'E8 Markets Review', href: '/blog/e8-markets-review' },
    { label: 'Alpha Capital Review', href: '/blog/alpha-capital-review' },
  ]
  const companyLinks = isRussian ? [
    { label: 'Английская версия', href: '/' },
    { label: 'О нас', href: '/about' },
    { label: 'Как оцениваем фирмы', href: '/methodology' },
    { label: 'Авторы', href: '/authors' },
    { label: 'Блог', href: '/blog' },
    { label: 'Контакты', href: '/contact' },
    { label: 'Политика конфиденциальности', href: '/privacy-policy' },
    { label: 'Дисклеймеры', href: '/disclaimers' },
  ] : [
    { label: 'Русская версия', href: '/ru' },
    { label: 'About Us', href: '/about' },
    { label: 'How We Score Firms', href: '/methodology' },
    { label: 'Authors', href: '/authors' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Disclaimers', href: '/disclaimers' },
  ]

  return (
    <footer className="footer-aurora" lang={isRussian ? 'ru' : 'en'}>
      <div className="aurora-orb aurora-orb--3 footer-orb" aria-hidden="true" />
      <div className="footer-accent-line" aria-hidden="true" />

      <div className="footer-shell">
        {/* Stats strip */}
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={firmCount} />
            </span>
            <span className="footer-stat-label">{isRussian ? 'фирм отслеживается' : 'firms tracked'}</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={pricedChallengeCount} />
            </span>
            <span className="footer-stat-label">{isRussian ? 'свежих продуктов с ценой' : 'fresh priced products'}</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-num">
              <AnimatedNumber value={articleCount} />
            </span>
            <span className="footer-stat-label">{isRussian ? 'статей' : 'articles'}</span>
          </div>
          <span className="footer-stat-divider" aria-hidden="true">·</span>
          <div className="footer-stat">
            <span className="footer-stat-label">{isRussian ? 'Обновлено' : 'Updated'}</span>
            <span className="footer-stat-num footer-stat-num--text">{updatedLabel}</span>
          </div>
        </div>

        <div className="footer-grid">
          {/* Brand + Newsletter — glass card */}
          <div className="footer-brand-card">
            <Link href={isRussian ? '/ru' : '/'} className="footer-brand">
              <div className="footer-brand-mark">
                <TrendingUp size={15} color="#fff" />
              </div>
              <span className="footer-brand-name">Traders Fund Hub</span>
            </Link>
            <p className="footer-brand-copy">
              {isRussian
                ? 'Проверяемый источник обзоров проп-фирм, сравнений и обучения трейдингу.'
                : 'Your trusted source for prop firm reviews, comparisons, and trading education.'}
            </p>
            {newsletterEnabled && (
              <>
                <p className="footer-brand-tagline">{isRussian ? 'Еженедельные изменения правил глобальных фирм' : 'Get the weekly rule-change digest'}</p>
                <NewsletterForm placement="footer" locale={isRussian ? 'ru' : 'en'} />
              </>
            )}

          </div>

          {/* Prop Firms */}
          <div className="footer-col">
          <h4 className="footer-eyebrow">{isRussian ? 'Проп-фирмы' : 'Prop Firms'}</h4>
            <ul className="footer-list">
              {propFirmLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Latest reviews — green-tint eyebrow with pulse dot */}
          <div className="footer-col">
            <h4 className="footer-eyebrow footer-eyebrow--live">
              <span className="hero-eyebrow-dot" aria-hidden="true" />
              {isRussian ? 'Последние обзоры' : 'Latest reviews'}
            </h4>
            <ul className="footer-list">
              {reviewLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
          <h4 className="footer-eyebrow">{isRussian ? 'О сайте' : 'Company'}</h4>
            <ul className="footer-list">
              {companyLinks.map(l => <FooterLink key={l.href} {...l} />)}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-legal">
            <p className="footer-bottom-copyright">
              © {new Date().getFullYear()} Traders Fund Hub. {isRussian ? 'Все права защищены.' : 'All rights reserved.'}
            </p>
            {(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) && (
              <AnalyticsPreferencesButton locale={isRussian ? 'ru' : 'en'} />
            )}
          </div>
          <p className="footer-bottom-disclaimer">
            {isRussian
              ? 'Дисклеймер: трейдинг связан со значительным риском убытка. Сайт носит информационный характер и не является финансовой рекомендацией.'
              : 'Disclaimer: Trading involves significant risk of loss. This site is for informational purposes only and does not constitute financial advice.'}
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link href={href} className="footer-link">{label}</Link>
    </li>
  )
}
