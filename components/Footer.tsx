'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import NewsletterForm from './NewsletterForm'
import AnalyticsPreferencesButton from './AnalyticsPreferencesButton'
import { PARTNERSHIP_POLICY } from '@/lib/trustPages'
import { ruDisclosureHref } from '@/lib/ruDisclosure'
import { ruClosedFirmsHref } from '@/lib/closedFirms'

type FooterProps = {
  firmCount: number
  pricedChallengeCount: number
  articleCount: number
  latestCapture?: string
  newsletterEnabled: boolean
}

type FooterLinkItem = { label: string; href: string }
type FooterColumn = { title: string; links: FooterLinkItem[] }

export default function Footer({
  firmCount,
  pricedChallengeCount,
  latestCapture,
  newsletterEnabled,
}: FooterProps) {
  const pathname = usePathname()
  const isRussian = pathname === '/ru' || pathname.startsWith('/ru/')
  const captureDateLabel = latestCapture
    ? new Date(`${latestCapture}T00:00:00Z`).toLocaleDateString(isRussian ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : isRussian ? 'нет данных' : 'Not available'

  const columns: FooterColumn[] = isRussian ? [
    { title: 'Сравнение', links: [
      { label: 'Рейтинг проп-фирм 2026', href: '/ru/luchshie-prop-firmy' },
      { label: 'FundedNext или BrightFunded', href: '/ru/fundednext-vs-bright-funded' },
      { label: 'Промокоды и предложения', href: '/ru/promokody-prop-firm' },
      { label: 'Выплаты проп-фирм', href: '/ru/vyplaty-prop-firm' },
      { label: 'Без KYC: проверка условий', href: '/ru/prop-firmy-bez-kyc' },
      { label: 'Что такое проп-фирма', href: '/ru/chto-takoe-prop-firma' },
    ] },
    { title: 'Для трейдеров', links: [
      { label: 'Для русскоязычных трейдеров', href: '/ru/dlya-russkoyazychnykh-treyderov' },
      { label: 'Российские компании', href: '/ru/dlya-russkoyazychnykh-treyderov#rossiyskie' },
      { label: 'FundedNext Stellar Instant', href: '/ru/fundednext-stellar-instant' },
      { label: 'FundedNext MT5 и EA', href: '/ru/fundednext-mt5' },
    ] },
    { title: 'Обзоры', links: [
      { label: 'Обзор FTMO', href: '/ru/obzor-ftmo' },
      { label: 'Обзор FundedNext', href: '/ru/obzor-fundednext' },
      { label: 'Обзор FundingPips', href: '/ru/obzor-fundingpips' },
      { label: 'Обзор BrightFunded', href: '/ru/obzor-bright-funded' },
      { label: 'Все обзоры (EN)', href: '/blog' },
    ] },
    { title: 'О сайте', links: [
      { label: 'О нас', href: '/about' },
      { label: 'Как оцениваем фирмы', href: '/methodology' },
      { label: 'Как мы зарабатываем', href: ruDisclosureHref() },
      { label: 'Исправления', href: '/corrections' },
      // Shown only while content/data/closed-firms.json is published (same flag as the EN page).
      ...(ruClosedFirmsHref() ? [{ label: 'Закрытые проп-фирмы', href: ruClosedFirmsHref() as string }] : []),
      { label: 'Авторы', href: '/authors' },
      { label: 'Контакты', href: '/contact' },
    ] },
  ] : [
    { title: 'Compare', links: [
      { label: 'Best Prop Firms 2026', href: '/best-prop-firms-2026' },
      { label: 'Firm directory', href: '/prop-firms' },
      { label: 'Compare challenges', href: '/prop-firm-challenges' },
      { label: 'Rule changes', href: '/prop-firm-challenge-changes' },
      { label: 'Cheapest firms', href: '/cheapest-prop-firms' },
      { label: 'Discount codes', href: '/prop-firm-discount-codes' },
      { label: 'How challenges work', href: '/how-prop-firm-challenges-work' },
    ] },
    { title: 'By country & style', links: [
      { label: 'UK', href: '/best-prop-firms-in-uk' },
      { label: 'US', href: '/best-prop-firms-in-us' },
      { label: 'India', href: '/best-prop-firms-in-india' },
      { label: 'India: challenge comparison', href: '/best-prop-firms-in-india/challenge-comparison' },
      { label: 'India: firm matchups', href: '/best-prop-firms-in-india/compare' },
      { label: 'India: rule changes', href: '/best-prop-firms-in-india/challenge-changes' },
      { label: 'Futures', href: '/best-futures-prop-firms' },
      { label: 'Crypto', href: '/best-crypto-prop-firms' },
      { label: 'Swing trading', href: '/best-swing-trading-prop-firms' },
    ] },
    { title: 'Reviews', links: [
      { label: 'FTMO', href: '/blog/ftmo-review' },
      { label: 'FundedNext', href: '/blog/fundednext-review' },
      { label: 'FundingPips', href: '/blog/funding-pips-review' },
      { label: 'E8 Markets', href: '/blog/e8-markets-review' },
      { label: 'Alpha Capital', href: '/blog/alpha-capital-review' },
      { label: 'All reviews & guides', href: '/blog' },
    ] },
    { title: 'Company', links: [
      { label: 'About us', href: '/about' },
      { label: 'How we score firms', href: '/methodology' },
      { label: 'How we make money', href: '/how-we-make-money' },
      { label: 'Corrections', href: '/corrections' },
      { label: 'Closed prop firms', href: '/prop-firms/closed' },
      { label: 'Authors', href: '/authors' },
      { label: 'Contact', href: '/contact' },
    ] },
  ]

  const t = isRussian ? {
    home: '/ru',
    tagline: `Сравнение ${firmCount} проп-фирм: цены, правила и выплаты с датой каждого источника.`,
    independence: PARTNERSHIP_POLICY.ru,
    captureLabel: 'Последний срез продукта',
    products: `${pricedChallengeCount} программ с ценой`,
    disclaimer: 'Трейдинг связан с высоким риском убытка. Информация не является финансовой рекомендацией. Часть ссылок партнёрские.',
    fullDisclaimer: 'Полный текст',
    rights: 'Все права защищены.',
    language: { label: 'English', href: '/', hrefLang: 'en' },
    method: 'Методика',
    privacy: 'Конфиденциальность',
    disclaimers: 'Дисклеймеры',
    nav: 'Навигация по сайту',
  } : {
    home: '/',
    tagline: `Compare ${firmCount} prop firms on fees, rules and payouts, with a date on every source.`,
    independence: PARTNERSHIP_POLICY.en,
    captureLabel: 'Latest product capture',
    products: `${pricedChallengeCount} priced programmes`,
    disclaimer: 'Trading involves significant risk of loss. Information only, not financial advice. Some links are affiliate links.',
    fullDisclaimer: 'Full disclaimers',
    rights: 'All rights reserved.',
    language: { label: 'Русская версия', href: '/ru', hrefLang: 'ru' },
    method: 'Methodology',
    privacy: 'Privacy',
    disclaimers: 'Disclaimers',
    nav: 'Site links',
  }

  return (
    <footer className="tf-foot" lang={isRussian ? 'ru' : 'en'}>
      <div className="tf-foot__shell">
        <div className="tf-foot__top">
          <div className="tf-foot__brand">
            <Link href={t.home} className="tf-foot__logo">
              <span className="tf-foot__mark" aria-hidden="true"><TrendingUp size={16} /></span>
              <span>Traders <b>Fund</b> Hub</span>
            </Link>
            <p className="tf-foot__tagline">{t.tagline}</p>
            <p className="tf-foot__note">{t.independence}</p>
            <p className="tf-foot__fresh">
              <span className="tf-foot__dot" aria-hidden="true" />
              <span>{t.captureLabel} {captureDateLabel}</span>
              <span className="tf-foot__sep" aria-hidden="true">·</span>
              <span>{t.products}</span>
            </p>
            {newsletterEnabled && (
              <div className="tf-foot__newsletter">
                <NewsletterForm placement="footer" locale={isRussian ? 'ru' : 'en'} />
              </div>
            )}
          </div>
          <nav className="tf-foot__cols" aria-label={t.nav}>
            {columns.map(column => (
              <div className="tf-foot__col" key={column.title}>
                <h2 className="tf-foot__heading">{column.title}</h2>
                <ul>
                  {column.links.map(link => (
                    <li key={link.href}><Link href={link.href} className="tf-foot__link">{link.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="tf-foot__disclaimer">
          {t.disclaimer} <Link href="/disclaimers" className="tf-foot__inline">{t.fullDisclaimer} →</Link>
        </p>

        <div className="tf-foot__bottom">
          <p>© {new Date().getFullYear()} Traders Fund Hub. {t.rights}</p>
          <ul className="tf-foot__legal">
            <li><Link href={t.language.href} hrefLang={t.language.hrefLang} lang={t.language.hrefLang} className="tf-foot__link">{t.language.label}</Link></li>
            <li><Link href="/methodology" className="tf-foot__link">{t.method}</Link></li>
            <li><Link href="/privacy-policy" className="tf-foot__link">{t.privacy}</Link></li>
            <li><Link href="/disclaimers" className="tf-foot__link">{t.disclaimers}</Link></li>
            {(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
              || (isRussian && process.env.NEXT_PUBLIC_YANDEX_METRICA_ID)) && (
              <li><AnalyticsPreferencesButton locale={isRussian ? 'ru' : 'en'} /></li>
            )}
          </ul>
        </div>
      </div>
    </footer>
  )
}
