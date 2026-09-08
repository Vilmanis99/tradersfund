import Link from '@/components/SafeLink'
import { isChallengeFresh } from '@/lib/firms'

export type RussianEvidenceDate = { label: string; capturedAt: string }

/** Guide rules and access checks are dated separately from challenge prices.
 * Retaining a dated explanation never implies that its terms were recaptured. */
export default function RussianEvidenceFreshnessNotice({ evidence }: { evidence: readonly RussianEvidenceDate[] }) {
  const requiresCheck = !evidence.length || evidence.some(item => !isChallengeFresh({ sourceCapturedAt: item.capturedAt }))
  const dates = evidence.map(item => `${item.label} — ${/^\d{4}-\d{2}-\d{2}$/.test(item.capturedAt) ? item.capturedAt : 'дата не подтверждена'}`).join('; ')
  if (!requiresCheck) return (
    <p className="ru-source-line" data-russian-guide-source-status="dated">
      Даты проверки источников: {dates}. Обновление текста не означает повторную проверку всех условий.
    </p>
  )
  return (
    <aside className="ru-notice" data-russian-guide-source-status="recapture-required" aria-label="Актуальность источников руководства">
      <strong>Источники требуют повторной проверки.</strong>{' '}
      {dates && <>Даты проверки: {dates}. </>}
      Часть сведений находится за пределами 30-дневного окна проверки или не имеет подтверждённой даты. Правила, ограничения по стране и числовые примеры ниже относятся к датированному разбору, а не подтверждают действующие условия.
      До оплаты проверьте нужную программу и свой профиль у фирмы.{' '}
      <Link href="/ru/luchshie-prop-firmy#podbor">Открыть сравнение с датами источников →</Link>
    </aside>
  )
}
