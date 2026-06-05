'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { navLinks } from './Header'

export default function HeaderNav() {
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

  return (
    <>
      <nav ref={navRef} className="desktop-nav" aria-label="Primary" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {navLinks.map(link => (
          'children' in link && link.children ? (
            <div key={link.label} style={{ position: 'relative' }}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen === link.label}
                onClick={() => setDropdownOpen(v => (v === link.label ? null : link.label))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: dropdownOpen === link.label ? '#fff' : '#94a3b8',
                  fontSize: '0.9rem', fontWeight: 500,
                  padding: '8px 14px', borderRadius: 6,
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
                <ChevronDown size={14} style={{ transform: dropdownOpen === link.label ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} aria-hidden="true" />
              </button>
              {dropdownOpen === link.label && (
                <div
                  role="menu"
                  aria-label={link.label}
                  style={{
                    position: 'absolute', top: '100%', left: 0,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 8, minWidth: 220,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    marginTop: 4,
                  }}
                >
                  {link.children.map(child => (
                    <Link key={child.href} href={child.href} role="menuitem" className="nav-menu-item">
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link key={link.href} href={link.href} className="nav-link" aria-current={pathname === link.href ? 'page' : undefined}>
              {link.label}
            </Link>
          )
        ))}
      </nav>

      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setMobileOpen(v => !v)}
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, marginLeft: 8 }}
      >
        {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {mobileOpen && (
        <div id="mobile-menu" style={{ position: 'absolute', top: 64, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
          {navLinks.map(link => (
            <div key={link.label}>
              <Link href={link.href} className="mobile-nav-link">
                {link.label}
              </Link>
              {'children' in link && link.children?.map(child => (
                <Link key={child.href} href={child.href} className="mobile-nav-link" style={{ paddingLeft: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
