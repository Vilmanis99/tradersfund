import '@/app/globals.css'
import '@/app/light-platform.css'
import '@/app/home.css'
import type { Metadata } from 'next'
import SiteDocument from '@/components/SiteDocument'
import EnglishNotFound, { metadata as notFoundMetadata } from '@/components/EnglishNotFound'
import { siteMetadata } from '@/lib/siteMetadata'

// With per-locale root layouts there is no single layout for URLs that match
// no route, so Next serves this document for them (HTTP 404), with the same
// English 404 as before. Unknown /ru/* URLs still reach app/ru/(fallback) and
// get the Russian 404.
export const metadata: Metadata = { ...siteMetadata, ...notFoundMetadata }

export default function GlobalNotFound() {
  return (
    <SiteDocument lang="en">
      <EnglishNotFound />
    </SiteDocument>
  )
}
