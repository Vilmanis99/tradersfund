import evidence from '@/content/data/russian-fundednext-mt5-evidence.json'
import { isChallengeFresh } from '@/lib/firms'

/** Shared dated condition: an EA add-on never overrides account-size limits. */
export default function RussianFundedNextEaNotice({ instant = false }: { instant?: boolean }) {
  const { ea } = evidence
  const fresh = isChallengeFresh({ sourceCapturedAt: ea.sourceCapturedAt })
    && (!instant || isChallengeFresh(evidence.instantEaScope))
  return (
    <aside className="ru-notice" data-russian-fundednext-ea-size={fresh ? 'source-checked' : 'recheck-required'}>
      <strong>Советники: проверьте размер счёта.</strong>{' '}
      В общей статье EA, проверенной <time dateTime={ea.sourceCapturedAt}>{ea.sourceCapturedAt}</time>, счета MT4/MT5 от ${ea.manualOnlyFromAccountSizeUsd.toLocaleString('en-US')} включительно требуют ручной торговли.
      Это касается и инструментов, которые только меняют стоп-лосс, тейк-профит или объём позиции.
      Оплата дополнения EA не отменяет ограничение.{' '}
      {!fresh && <>Дата проверки истекла: перед использованием советника перечитайте действующие условия. </>}
      <a href={ea.sourceUrl} target="_blank" rel="nofollow noopener">Официальное правило EA</a>.
      {instant && <p>Отдельная <a href={evidence.instantEaScope.sourceUrl} target="_blank" rel="nofollow noopener">статья об EA в Stellar Instant</a> не повторяет этот порог и не подтверждает исключение. Для увеличенного счёта заранее уточните применение ограничения у FundedNext. Статья проверена {evidence.instantEaScope.sourceCapturedAt}.</p>}
    </aside>
  )
}
