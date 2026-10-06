import type { Challenge, Firm } from './firms'
import { outboundSlug } from './outboundDestinations.ts'

/** Resolve a captured first-party URL, never a destination supplied in a query. */
export function challengeSourceDestination(
  firm: Pick<Firm, 'name' | 'officialUrl'>,
  productSlug: string,
  products: readonly Challenge[],
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) return null
  const product = products.find(item => item.firmSlug === outboundSlug(firm.name) && item.productSlug === productSlug)
  if (!product) return null
  try {
    const source = new URL(product.sourceUrl)
    const official = new URL(firm.officialUrl)
    const domain = official.hostname.toLowerCase().replace(/^www\./, '')
    if (source.protocol !== 'https:' || source.username || source.password || source.port) return null
    if (source.hostname !== domain && !source.hostname.endsWith(`.${domain}`)) return null
    return source.href
  } catch {
    return null
  }
}

export function challengeSourceLink(product: Pick<Challenge, 'firmSlug' | 'productSlug'>) {
  const query = new URLSearchParams({ source: product.productSlug, from: 'review-product-source' })
  return `/go/${product.firmSlug}?${query}`
}
