/**
 * RU render-layer wording for the rules template (RU twins only; EN data and
 * EN pages are untouched).
 * Team rule: RU pages never name Bybit. Platform lists follow the CFT review
 * (app/ru/obzor-crypto-fund-trader): «две основные — Match-Trader и MT5», and
 * the exchange route stays unnamed as «сторонняя криптобиржа» (as on Era Trade).
 */
export const RU_THIRD_PARTY_EXCHANGE = 'сторонняя криптобиржа'

/** Crypto-exchange names that RU pages never show. */
const HIDDEN_EXCHANGES = /\bbybit\b/i
const HIDDEN_EXCHANGES_GLOBAL = /\bbybit\b/gi

export function isHiddenExchange(name: string): boolean {
  return HIDDEN_EXCHANGES.test(name)
}

/** Any free text on a RU page: hidden exchange names become «сторонняя криптобиржа». */
export function ruRedactExchanges(text: string): string {
  return text.replace(HIDDEN_EXCHANGES_GLOBAL, RU_THIRD_PARTY_EXCHANGE)
}

/** Platform list for RU: main platforms named, the exchange route unnamed. */
export function ruPlatformList(items: readonly string[]): string {
  const main = items.filter(item => !isHiddenExchange(item))
  if (main.length === items.length) return items.join(', ')
  const named = main.length === 2
    ? `две основные — ${main[0]} и ${main[1]}`
    : main.length > 0 ? `основные — ${main.join(', ')}` : ''
  return named ? `${named}; третий вариант — ${RU_THIRD_PARTY_EXCHANGE}` : RU_THIRD_PARTY_EXCHANGE
}
