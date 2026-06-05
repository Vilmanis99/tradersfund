import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://tradersfundhub.com'),
  title: {
    default: 'Traders Fund Hub | Best Prop Firm Reviews & Comparisons',
    template: '%s | Traders Fund Hub',
  },
  description: 'Traders Fund Hub is your trusted source for in-depth prop firm reviews, comparisons, and trading education. Find the best prop firm for your needs.',
  keywords: 'prop firms, prop firm reviews, funded trading, FTMO, FundedNext, FundingPips, trading education',
  authors: [{ name: 'Traders Fund Hub' }],
  openGraph: {
    type: 'website',
    siteName: 'Traders Fund Hub',
    url: 'https://tradersfundhub.com',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }} suppressHydrationWarning>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
