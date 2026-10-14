import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { RUSSIAN_PLANNED_ROUTES, type RussianPlannedRoutePath } from '@/lib/localizedRoutes'

/** True when app/ru/<slug>/page.tsx exists for a planned route. */
export function isRussianPlannedRoutePublished(route: RussianPlannedRoutePath): boolean {
  const slug = route.replace(/^\/ru\//, '')
  return fs.existsSync(path.join(process.cwd(), 'app/ru', slug, 'page.tsx'))
}

/** Planned routes whose page files exist (safe to link and list in the sitemap). */
export function publishedRussianPlannedRoutes(): RussianPlannedRoutePath[] {
  return RUSSIAN_PLANNED_ROUTES.filter(isRussianPlannedRoutePublished)
}

/** Use for internal links to a planned route: returns null until the page exists, so no 404 links ship. */
export function russianPlannedHref(route: RussianPlannedRoutePath): RussianPlannedRoutePath | null {
  return isRussianPlannedRoutePublished(route) ? route : null
}
