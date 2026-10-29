import { RU_DISCLOSURE } from '@/lib/ruDisclosure'
import { RUSSIAN_ROUTE_EDITORIAL_DATES, RU_CLOSED_FIRMS_EDITORIAL_DATE, RU_CLOSED_FIRMS_PATH } from '@/lib/localizedRoutes'
import { computeRussianRouteLastmods } from '@/lib/sitemapLastmod'

/** Editorial dates kept outside RUSSIAN_ROUTE_EDITORIAL_DATES (writer-owned copy files). */
export const RUSSIAN_ROUTE_EXTRA_EDITORIAL: Record<string, Array<string | null | undefined>> = {
  '/ru/kak-my-zarabatyvaem': [RU_DISCLOSURE.updated],
}

/** Expected content of lib/ruRouteLastmod.generated.ts (written by gen-sitemap-lastmod.mjs). */
export function expectedRussianRouteLastmods(): Record<string, string> {
  return computeRussianRouteLastmods({ ...RUSSIAN_ROUTE_EDITORIAL_DATES, [RU_CLOSED_FIRMS_PATH]: RU_CLOSED_FIRMS_EDITORIAL_DATE }, RUSSIAN_ROUTE_EXTRA_EDITORIAL)
}
