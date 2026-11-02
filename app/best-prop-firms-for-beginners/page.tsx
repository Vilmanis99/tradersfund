import type { Metadata } from 'next'
import { BestForRoutePage, bestForMetadata } from '@/lib/bestForRoute'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  return bestForMetadata('beginners', 'en')
}

export default function Page() {
  return BestForRoutePage('beginners', 'en')
}
