import type { ReactNode } from 'react'
import EnglishRootLayout from '@/components/EnglishRootLayout'
import { siteMetadata } from '@/lib/siteMetadata'

// Age gates must run again without a deployment. ISR is request-driven.
export const revalidate = 3600

// English root layout for /compare (<html lang="en"); see components/EnglishRootLayout.tsx.
export const metadata = siteMetadata

export default function CompareLayout({ children }: { children: ReactNode }) {
  return <EnglishRootLayout>{children}</EnglishRootLayout>
}
