'use client'

import useCopyCode from '../useCopyCode'
import { trackSiteEvent } from '@/lib/clientAnalytics'
import { HOME_COPY, type HomeLocale } from './copy'

/** Dashed code box with a copy button. Only rendered for verified deals.json codes. */
export default function CopyCodeBox({ code, label, locale, firm, placement, pct }: {
  code: string; label: string; locale: HomeLocale; firm: string; placement: string; pct?: number
}) {
  const t = HOME_COPY[locale]
  const { copied, failed, copy } = useCopyCode(code)
  const onCopy = async () => {
    if (await copy()) trackSiteEvent('discount_code_copied', { firm, placement, offer_type: 'public_checkout', discount_pct: pct ?? 0 })
  }
  return (
    <div className="th-code" data-home-offer-code={firm}>
      <span className="th-code__label">{label}</span>
      <code>{code}</code>
      <button type="button" onClick={onCopy} aria-live="polite" aria-label={`${t.copy} ${code}`}>{copied ? t.copied : t.copy}</button>
      {failed ? <span role="status" className="th-code__failed">{t.copyFailed} <code style={{ userSelect: 'all' }}>{code}</code></span> : null}
    </div>
  )
}
