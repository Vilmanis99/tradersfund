import { RuRulesPage, ruRulesMetadata } from '@/components/RuRulesRoute'

// Shared rules template (lib/rulesPages.ts). Stays noindex and out of the
// sitemap until the data is complete and fresh, an RU verdict exists
// (content/verdicts/rules/crypto-fund-trader.ru.md) and the route is registered in
// lib/localizedRoutes.ts.
export const revalidate = 3600
export function generateMetadata() {
  return ruRulesMetadata('crypto-fund-trader')
}

export default function Page() {
  return <RuRulesPage slug="crypto-fund-trader" />
}
