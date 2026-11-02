import type { Metadata } from 'next'
import { BestForRoutePage, bestForMetadata } from '@/lib/bestForRoute'

export const revalidate = 3600

export function generateMetadata(): Metadata {
  return bestForMetadata('news-trading', 'ru')
}

export default function Page() {
  return BestForRoutePage('news-trading', 'ru')
}
