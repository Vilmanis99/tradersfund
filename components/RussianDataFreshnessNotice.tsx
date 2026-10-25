import Link from '@/components/SafeLink'
import { getAllChallenges, isChallengeFresh } from '@/lib/firms'
import { formatRuDate } from '@/lib/ruDate'

/**
 * Keep historical editorial explanations readable without presenting them as current terms.
 * Article format P2 (merge RU notices): one short callout line stays visible; the explanation
 * and the link to the dated comparison sit in a collapsed block, so the CTA is not pushed down.
 */
export default function RussianDataFreshnessNotice({ firmSlugs }: { firmSlugs: string[] }) {
  const products = getAllChallenges().filter(product => firmSlugs.includes(product.firmSlug))
  const expired = products.filter(product => !isChallengeFresh(product))
  if (products.length && !expired.length) return null
  const dates = products.map(product => product.sourceCapturedAt)
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  const dateRange = dates[0] === dates.at(-1) ? formatRuDate(dates[0]) : `${formatRuDate(dates[0])}–${formatRuDate(dates.at(-1))}`
  return (
    <aside className="ru-notice ru-notice--compact" data-russian-source-status="recapture-required" aria-label="Актуальность условий">
      <strong>Условия требуют повторной проверки.</strong>{' '}
      {dates.length > 0 && <>Источники по программам: {dateRange}. </>}
      Программы старше 30 дней исключены из таблиц цен.
      <details className="ru-source-details">
        <summary>Что это значит</summary>
        <p>
          Описания правил и примеры ниже относятся к датированному обзору, а не подтверждают действующие условия.
          Перед оплатой сверьте правила выбранного счёта у фирмы.{' '}
          <Link href="/ru/luchshie-prop-firmy#podbor">Открыть подбор с датами источников →</Link>
        </p>
      </details>
    </aside>
  )
}
