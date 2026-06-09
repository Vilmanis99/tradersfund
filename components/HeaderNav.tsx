'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown, GitCompare, Github, Twitter, Mail } from 'lucide-react'
import { navLinks } from './navLinks'

interface HeaderNavProps {
  /** Human-formatted last-updated label (e.g. "Apr 24"). Empty hides the pill. */
  lastUpdated?: string
}

export default function HeaderNav({ lastUpdated }: HeaderNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [lastPath, setLastPath] = useState(pathname)
  const navRef = useRef<HTMLDivElement | null>(null)

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
      if (e.key === 'Escape') setDropdownOpen(null)
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

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  /**
   * A nav link is "active" when its href exactly matches the pathname OR (for
   * sectional roots like `/blog`) when the current path is nested under it.
   * Home (`/`) is special-cased — it must be an exact match, otherwise every
   * route would light up Home.
   */
  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav ref={navRef} className="desktop-nav" aria-label="Primary">
        {navLinks.map(link => (
          'children' in link && link.children ? (
            <div key={link.label} className="nav-dropdown-wrap">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen === link.label}
                aria-current={isActive(link.href) ? 'page' : undefined}
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
                  role="menu"
                  aria-label={link.label}
                  className="nav-dropdown"
                >
                  {link.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      role="menuitem"
                      className="nav-menu-item"
                      aria-current={isActive(child.href) ? 'page' : undefined}
                    >
                      {child.label}
                    </Link>
                  ))}
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

        <Link href="/compare" className="nav-compare-chip" aria-label="Compare prop firms side-by-side">
          <GitCompare size={14} aria-hidden="true" />
          Compare
        </Link>

        {lastUpdated && (
          <div className="nav-update-pill" title={`Firm data last refreshed ${lastUpdated}`}>
            <span className="nav-update-pill__dot" aria-hidden="true" />
            <span className="nav-update-pill__text">Updated {lastUpdated}</span>
          </div>
        )}
      </nav>

      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setMobileOpen(v => !v)}
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div className="mobile-overlay__aurora" aria-hidden="true">
            <div className="aurora-orb aurora-orb--1" />
            <div className="aurora-orb aurora-orb--2" />
            <div className="aurora-orb aurora-orb--3" />
            <div className="aurora-grid" />
          </div>

          <div className="mobile-overlay__inner">
            <nav className="mobile-overlay__nav" aria-label="Mobile primary">
              {navLinks.map(link => (
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
              <Link href="/compare" className="btn-primary mobile-overlay__cta">
                <GitCompare size={16} aria-hidden="true" />
                Compare firms
              </Link>
              <div className="mobile-overlay__socials" aria-label="Social links">
                <a href="#" aria-label="Twitter" className="mobile-overlay__social"><Twitter size={18} aria-hidden="true" /></a>
                <a href="#" aria-label="GitHub" className="mobile-overlay__social"><Github size={18} aria-hidden="true" /></a>
                <a href="/contact" aria-label="Contact" className="mobile-overlay__social"><Mail size={18} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
