import type { Metadata } from 'next'
import { BestForRoutePage, bestForMetadata } from '@/lib/bestForRoute'

// Sibling of this section's root layout: title: { absolute: ... } is set in bestForMetadata.

export const revalidate = 3600

export function generateMetadata(): Metadata {
  return bestForMetadata('eas', 'en')
}

export default function Page() {
  return BestForRoutePage('eas', 'en')
}
