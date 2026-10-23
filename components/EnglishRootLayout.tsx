import '@/app/globals.css'
import '@/app/light-platform.css'
import '@/app/home.css'
import SiteDocument from '@/components/SiteDocument'

/**
 * English root layout, rendered by app/<section>/layout.tsx for every English
 * top-level section and by app/(home)/layout.tsx for the home page.
 *
 * There is no app/layout.tsx: /ru has its own root layout (app/ru/layout.tsx)
 * so the server-rendered <html lang> is "ru" there and "en" everywhere else.
 * A NEW top-level English route needs a layout.tsx like its siblings (the build
 * fails without one; scripts/test-tech-seo.mjs names the missing folder).
 * Moving between the two locales is a full page load, as a language switch is.
 */
export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument lang="en">{children}</SiteDocument>
}
