'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown, GitCompare, Languages, Mail } from 'lucide-react'
import { getAlternateLanguageHref } from '@/lib/localizedRoutes'
import { navLinks } from './navLinks'

const russianNavLinks = [
  { label: 'Главная', href: '/ru' },
  {
    label: 'Проп-фирмы',
    href: '/ru/luchshie-prop-firmy',
    children: [
      { label: 'Рейтинг глобальных фирм', href: '/ru/luchshie-prop-firmy' },
      { label: 'FundedNext против Bright Funded', href: '/ru/fundednext-vs-bright-funded' },
      { label: 'Без челленджа', href: '/ru/prop-firmy-bez-chelendzha' },
      { label: 'Проп-фирмы с cTrader', href: '/ru/prop-firmy-s-ctrader' },
      { label: 'Крипто-проп', href: '/ru/luchshie-kripto-prop-firmy' },
      { label: 'Местные компании', href: '/ru/rossiyskie-prop-kompanii' },
    ],
  },
  {
    label: 'Обзоры',
    href: '/ru/obzor-fundednext',
    children: [
      { label: 'FundedNext', href: '/ru/obzor-fundednext' },
      { label: 'Bright Funded', href: '/ru/obzor-bright-funded' },
      { label: 'FTMO', href: '/ru/obzor-ftmo' },
      { label: 'FundingPips', href: '/ru/obzor-fundingpips' },
    ],
  },
  {
    label: 'Гайды',
    href: '/ru/dlya-russkoyazychnykh-treyderov',
    children: [
      { label: 'Для русскоязычных за рубежом', href: '/ru/dlya-russkoyazychnykh-treyderov' },
      { label: 'Выплаты', href: '/ru/vyplaty-prop-firm' },
      { label: 'Проверка KYC', href: '/ru/prop-firmy-bez-kyc' },
      { label: 'Как работают челленджи', href: '/ru/kak-rabotayut-chellendzhi-prop-firm' },
    ],
  },
  { label: 'Промокоды', href: '/ru/promokody-prop-firm' },
] as const

interface HeaderNavProps {
  /** Current source-check coverage, e.g. "13/15 source-checked". */
  dataStatus?: string
}

export default function HeaderNav({ dataStatus }: HeaderNavProps) {
  const pathname = usePathname()
  const isRussian = pathname === '/ru' || pathname.startsWith('/ru/')
  const activeNavLinks = isRussian ? russianNavLinks : navLinks
  const languageHref = getAlternateLanguageHref(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [lastPath, setLastPath] = useState(pathname)
  const navRef = useRef<HTMLDivElement | null>(null)
  const mobileDialogRef = useRef<HTMLDialogElement | null>(null)

  // The server-rendered /ru layout and response header establish the Russian
  // language boundary for crawlers. Keep the document root in sync after
  // hydration and during client-side navigation so assistive technology does
  // not continue treating Russian pages as English (or vice versa).
  useEffect(() => {
    document.documentElement.lang = isRussian ? 'ru' : 'en'
  }, [isRussian])

  // Close menus on route change (adjust state during render — React 19 pattern).
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMobileOpen(false)
    setDropdownOpen(null)
  }

  // Outside-click and Escape-key dismissal for the desktop dropdown.
  useEffect(() => {
    if (!dropdownOpen) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDropdownOpen(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        navRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

  // Native modal dialog provides focus containment, Escape and inert background.
  // Keep scroll locking scoped to the time it is open, including route changes.
  useEffect(() => {
    if (!mobileOpen) return
    const dialog = mobileDialogRef.current
    if (!dialog) return
    dialog.showModal()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 1001px)')
    const onDesktop = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change', onDesktop)
    onDesktop()
    return () => {
      dialog.close()
      document.body.style.overflow = prev
      desktop.removeEventListener('change', onDesktop)
    }
  }, [mobileOpen])

  /**
   * A nav link is "active" when its href exactly matches the pathname OR (for
   * sectional roots like `/blog`) when the current path is nested under it.
   * Home (`/`) is special-cased — it must be an exact match, otherwise every
   * route would light up Home.
   */
  function isActive(href: string): boolean {
    if (href === '/' || href === '/ru') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav
        ref={navRef}
        className="desktop-nav"
        lang={isRussian ? 'ru' : 'en'}
        aria-label={isRussian ? 'Основная навигация' : 'Primary'}
      >
        {activeNavLinks.map((link, index) => (
          'children' in link && link.children ? (
            <div key={link.label} className="nav-dropdown-wrap" onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDropdownOpen(null)
            }}>
              <button
                type="button"
                aria-expanded={dropdownOpen === link.label}
                aria-controls={`desktop-nav-group-${index}`}
                data-active={isActive(link.href) || link.children.some(child => isActive(child.href)) || undefined}
                onClick={() => setDropdownOpen(v => (v === link.label ? null : link.label))}
                className="nav-link nav-link--button"
              >
                {link.label}
                <ChevronDown
                  size={14}
                  className="nav-link__chev"
                  data-open={dropdownOpen === link.label || undefined}
                  aria-hidden="true"
                />
              </button>
              {dropdownOpen === link.label && (
                <div
                  id={`desktop-nav-group-${index}`}
                  className={`nav-dropdown${link.children.length > 8 ? ' nav-dropdown--wide' : ''}`}
                >
                  <ul className="nav-dropdown-links">
                  {link.children.map(child => (
                    <li key={child.href}>
                    <Link
                      href={child.href}
                      className="nav-menu-item"
                      aria-current={isActive(child.href) ? 'page' : undefined}
                    >
                      {child.label}
                    </Link>
                    </li>
                  ))}
                  </ul>
                  {dataStatus && !isRussian && link.href === '/prop-firms' && (
                    <Link href="/prop-firm-challenge-changes" className="nav-source-status">
                      Source-check coverage: {dataStatus}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          )
        ))}

        <Link
          href={isRussian ? '/ru/luchshie-prop-firmy' : '/prop-firm-challenges'}
          className="nav-compare-chip"
          aria-label={isRussian ? 'Сравнить проп-фирмы' : 'Compare prop-firm challenge products'}
        >
          <GitCompare size={14} aria-hidden="true" />
          {isRussian ? 'Сравнить' : 'Compare'}
        </Link>

        <Link
          href={languageHref}
          hrefLang={isRussian ? 'en' : 'ru'}
          lang={isRussian ? 'en' : 'ru'}
          className="nav-link"
          aria-label={isRussian ? 'Открыть английскую версию' : 'Открыть русскую версию'}
        >
          <Languages size={14} aria-hidden="true" />
          {isRussian ? 'EN' : 'RU'}
        </Link>

      </nav>

      <button
        type="button"
        className="mobile-toggle"
        onClick={() => { setDropdownOpen(null); setMobileOpen(true) }}
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        aria-label={mobileOpen
          ? (isRussian ? 'Закрыть меню' : 'Close menu')
          : (isRussian ? 'Открыть меню' : 'Open menu')}
      >
        {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      {mobileOpen && (
        <dialog
          ref={mobileDialogRef}
          id="mobile-menu"
          className="mobile-overlay"
          aria-label={isRussian ? 'Навигация по сайту' : 'Site navigation'}
          onCancel={() => setMobileOpen(false)}
        >
          <div className="mobile-overlay__inner">
            <div className="mobile-overlay__head">
              <Link href={isRussian ? '/ru' : '/'}>{isRussian ? 'Главная' : 'Home'}</Link>
              <button type="button" className="mobile-overlay__close" onClick={() => setMobileOpen(false)}>
                {isRussian ? 'Закрыть' : 'Close'} <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav
              className="mobile-overlay__nav"
              lang={isRussian ? 'ru' : 'en'}
              aria-label={isRussian ? 'Основная мобильная навигация' : 'Mobile primary'}
            >
              {activeNavLinks.map(link => (
                <div key={link.label} className="mobile-overlay__section">
                  <Link
                    href={link.href}
                    className="mobile-overlay__link"
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                  {'children' in link && link.children?.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="mobile-overlay__sublink"
                      aria-current={isActive(child.href) ? 'page' : undefined}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>

            <div className="mobile-overlay__footer">
              <Link
                href={isRussian ? '/ru/luchshie-prop-firmy' : '/prop-firm-challenges'}
                className="btn-primary mobile-overlay__cta"
              >
                <GitCompare size={16} aria-hidden="true" />
                {isRussian ? 'Сравнить фирмы' : 'Compare challenges'}
              </Link>
              <div className="mobile-overlay__socials">
                <Link
                  href={languageHref}
                  hrefLang={isRussian ? 'en' : 'ru'}
                  lang={isRussian ? 'en' : 'ru'}
                  aria-label={isRussian ? 'Открыть английскую версию' : 'Открыть русскую версию'}
                  className="mobile-overlay__social"
                >
                  <Languages size={18} aria-hidden="true" /> {isRussian ? 'EN' : 'RU'}
                </Link>
                <Link href="/contact" hrefLang="en" className="mobile-overlay__social"><Mail size={18} aria-hidden="true" /> {isRussian ? 'Контакты (EN)' : 'Contact'}</Link>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}
