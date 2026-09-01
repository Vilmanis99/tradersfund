import CopyableCodePill from '@/components/CopyableCodePill'
import type { Firm } from '@/lib/firms'

type RussianAffiliateSupportCodeProps = {
  firm?: Firm
  publicOfferPct?: number | null
  placement: string
}

/**
 * A personal support code is an attribution fallback, not a claim that TFH
 * has the largest promotion. The block fails closed until every provenance
 * field is configured; audit-reviews.mjs rejects partial or stale records.
 */
export default function RussianAffiliateSupportCode({
  firm,
  publicOfferPct,
  placement,
}: RussianAffiliateSupportCodeProps) {
  const code = firm?.affiliateSupportCode?.trim()
  const pct = firm?.affiliateSupportDiscountPct
  const sourceUrl = firm?.affiliateSupportProgramUrl
  const verifiedAt = firm?.affiliateSupportVerifiedAt

  if (!code || pct == null || !sourceUrl || !verifiedAt) return null

  const betterPublicOffer = publicOfferPct != null && publicOfferPct > pct
  const firmSlug = firm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div
      className="ru-notice ru-disclosure"
      data-russian-affiliate-support-code={firm.name}
      data-russian-affiliate-support-placement={placement}
    >
      <strong>Персональный код поддержки TFH.</strong>{' '}
      <CopyableCodePill
        code={code}
        pct={pct}
        locale="ru"
        analyticsFirm={firmSlug}
        analyticsPlacement={placement}
        analyticsOfferType="partner_support"
      />{' '}
      Код может сохранить привязку покупки к Traders Fund Hub, если браузерная
      партнёрская сессия не сохранилась; мы можем получить комиссию. Он добавляет
      <strong> 0 баллов</strong> к редакционной оценке.
      {betterPublicOffer ? (
        <> Текущая публичная акция указывает до <strong>{publicOfferPct}%</strong>, поэтому перед оплатой выберите большую применимую скидку: коды могут не суммироваться.</>
      ) : (
        <> Перед оплатой сравните код с текущей публичной акцией и выберите большую применимую скидку: коды могут не суммироваться.</>
      )}{' '}
      Проверено {verifiedAt}.{' '}
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Условия партнёрской программы</a>.
    </div>
  )
}
