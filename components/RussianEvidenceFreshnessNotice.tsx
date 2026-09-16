import Link from '@/components/SafeLink'
import { isChallengeFresh } from '@/lib/firms'

export type RussianEvidenceDate = { label: string; capturedAt: string }

/** Guide rules and access checks are dated separately from challenge prices.
 * Retaining a dated explanation never implies that its terms were recaptured. */
export default function RussianEvidenceFreshnessNotice({ evidence }: { evidence: readonly RussianEvidenceDate[] }) {
  const requiresCheck = !evidence.length || evidence.some(item => !isChallengeFresh({ sourceCapturedAt: item.capturedAt }))
  const validDates = evidence
    .map(item => item.capturedAt)
    .filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
  const oldest = validDates[0]
  const latest = validDates.at(-1)
  const staleCount = evidence.filter(item => !isChallengeFresh({ sourceCapturedAt: item.capturedAt })).length
  const dates = evidence.map(item => `${item.label} — ${/^\d{4}-\d{2}-\d{2}$/.test(item.capturedAt) ? item.capturedAt : 'дата не подтверждена'}`)
  if (!requiresCheck) return (
    <div className="ru-source-line" data-russian-guide-source-status="dated">
      Источники проверены по {evidence.length} отдельным пунктам; последний срез — {latest ?? 'дата не подтверждена'}, самый ранний — {oldest ?? 'дата не подтверждена'}.{' '}
      Обновление текста не означает повторную проверку всех условий.{' '}
      <details className="ru-source-details">
        <summary>Показать даты отдельных проверок</summary>
        <ul>{dates.map((date, index) => <li key={`${date}-${index}`}>{date}</li>)}</ul>
      </details>
    </div>
  )
  return (
    <aside className="ru-notice" data-russian-guide-source-status="recapture-required" aria-label="Актуальность источников руководства">
      <strong>Источники требуют повторной проверки.</strong>{' '}
      {evidence.length > 0 && <>Просрочено или не подтверждено {staleCount} из {evidence.length} пунктов; самый ранний датированный срез — {oldest ?? 'дата не подтверждена'}. </>}
      Часть сведений находится за пределами 30-дневного окна проверки или не имеет подтверждённой даты. Правила, ограничения по стране и числовые примеры ниже относятся к датированному разбору, а не подтверждают действующие условия.{' '}
      <details className="ru-source-details">
        <summary>Показать даты отдельных проверок</summary>
        <ul>{dates.map((date, index) => <li key={`${date}-${index}`}>{date}</li>)}</ul>
      </details>{' '}
      До оплаты проверьте нужную программу и свой профиль у фирмы.{' '}
      <Link href="/ru/luchshie-prop-firmy#podbor">Открыть сравнение с датами источников →</Link>
    </aside>
  )
}
