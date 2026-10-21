/**
 * RU Telegram channel (live since 21 Oct 2026). Not a partner link: no /go/, no sponsored rel.
 * utm_campaign carries the placement (page slug or 'footer'), like /go/ uses ?from= for utm_campaign.
 */
export const RU_TELEGRAM_CHANNEL = 'https://t.me/tradersfundhub_rus'

export function ruTelegramHref(placement: string) {
  const params = new URLSearchParams({ utm_source: 'site', utm_medium: 'tg_block', utm_campaign: placement })
  return `${RU_TELEGRAM_CHANNEL}?${params.toString()}`
}
