import { Fragment } from 'react'
import type { ClosedFirmClaimView, ClosedFirmView, ClosedFirmsLocale } from '@/lib/closedFirms'

/**
 * Shared renderer for /prop-firms/closed and its RU version. Entry ids come from the firm slug in
 * content/data/closed-firms.json for both locales, so #<slug> anchors are identical in EN and RU.
 */
export interface ClosedFirmsLabels {
  status: string
  date: string
  quotePrimary: string
  quoteSecondary: string
  otherHistory: string
  source: string
  archivedCopy: string
  note: string
  reportedBy: string
  translation: string
  original: string
  closedHeading: string
  offlineHeading: string
  offlineIntro: string
  /** RU only: «по данным на <date>» after each status. */
  statusAsOf?: (date: string) => string
}

export const CLOSED_FIRMS_LABELS: Record<ClosedFirmsLocale, ClosedFirmsLabels> = {
  en: {
    status: 'Status',
    date: 'Date',
    quotePrimary: 'What the firm said',
    quoteSecondary: 'Reported wording',
    otherHistory: 'Other history',
    source: 'Source',
    archivedCopy: 'archived copy',
    note: 'Note',
    reportedBy: 'Reported by',
    translation: '',
    original: '',
    closedHeading: 'Closed',
    offlineHeading: 'Offline, no official statement',
    offlineIntro: 'The official sites are down, but the firm has not announced a closure.',
  },
  ru: {
    status: 'Статус',
    date: 'Дата',
    quotePrimary: 'Что сказала фирма',
    quoteSecondary: 'Формулировка по сообщению',
    otherHistory: 'Другие события',
    source: 'Источник',
    archivedCopy: 'архивная копия',
    note: 'Примечание',
    reportedBy: 'По данным',
    translation: 'Перевод:',
    original: 'Оригинал:',
    closedHeading: 'Закрылись',
    offlineHeading: 'Не работают, официального заявления нет',
    offlineIntro: 'Официальные сайты недоступны, но фирма не объявляла о закрытии.',
    statusAsOf: date => `по данным на ${formatClosedFirmsDate(date, 'ru', 'numeric')}`,
  },
}

const INTL_LOCALE: Record<ClosedFirmsLocale, string> = { en: 'en-US', ru: 'ru-RU' }

export function formatClosedFirmsDate(value: string, locale: ClosedFirmsLocale, style: 'long' | 'numeric' = 'long') {
  const date = new Date(`${value}T00:00:00Z`)
  return style === 'numeric'
    ? date.toLocaleDateString(INTL_LOCALE[locale], { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : date.toLocaleDateString(INTL_LOCALE[locale], { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function ReportedBy({ claim, labels }: { claim: ClosedFirmClaimView; labels: ClosedFirmsLabels }) {
  if (claim.sourceType !== 'secondary' || !claim.reportedBy) return null
  return (
    <span data-reported-by={claim.reportedBy.name}>
      {`${labels.reportedBy} `}<a href={claim.reportedBy.url} rel="nofollow noopener" target="_blank">{claim.reportedBy.name}</a>:{' '}
    </span>
  )
}

function Claim({ claim, labels, quoted = false }: { claim: ClosedFirmClaimView; labels: ClosedFirmsLabels; quoted?: boolean }) {
  const text = quoted ? <q lang={claim.untranslated ? 'en' : undefined}>{claim.text}</q>
    : claim.untranslated ? <span lang="en">{claim.text}</span> : claim.text
  return (
    <span data-source-type={claim.sourceType}>
      <ReportedBy claim={claim} labels={labels} />
      {claim.original ? (
        <>
          <span data-quote-translation>{labels.translation}</span> {text}
          <br />
          <span data-quote-original>{labels.original} <q lang="en">{claim.original}</q></span>
        </>
      ) : text}
    </span>
  )
}

function FirmEntry({ firm, labels, asOf }: { firm: ClosedFirmView; labels: ClosedFirmsLabels; asOf: string }) {
  return (
    <article id={firm.slug} className="tf-correction" data-closed-firm={firm.slug} data-section={firm.section}>
      <h3>{firm.name}</h3>
      <dl>
        <dt>{labels.status}</dt>
        <dd>
          <Claim claim={firm.status} labels={labels} />
          {labels.statusAsOf && <> <span data-status-as-of={asOf}>({labels.statusAsOf(asOf)})</span></>}
        </dd>
        <dt>{labels.date}</dt>
        <dd><time dateTime={firm.date}><Claim claim={firm.dateLabel} labels={labels} /></time></dd>
        <dt>{firm.quoteLabel ?? (firm.quote.sourceType === 'primary' ? labels.quotePrimary : labels.quoteSecondary)}</dt>
        <dd><Claim claim={firm.quote} labels={labels} quoted /></dd>
        {firm.reported.map(claim => (
          <Fragment key={claim.text}>
            <dt>{labels.otherHistory}</dt>
            <dd><Claim claim={claim} labels={labels} /></dd>
          </Fragment>
        ))}
        <dt>{labels.source}</dt>
        <dd>
          <a href={firm.primarySource} rel="nofollow noopener" target="_blank">{hostOf(firm.primarySource)}</a>
          {firm.archivedSource && (
            <> · <a href={firm.archivedSource} rel="nofollow noopener" target="_blank">{labels.archivedCopy}</a></>
          )}
        </dd>
        {firm.note && (<><dt>{labels.note}</dt><dd>{firm.noteUntranslated ? <span lang="en">{firm.note}</span> : firm.note}</dd></>)}
      </dl>
    </article>
  )
}

/** The "Closed" and "Offline" sections of the page. `asOf` is the capture date of the statuses. */
export default function ClosedFirmsList({
  locale,
  closed,
  offline,
  asOf,
}: {
  locale: ClosedFirmsLocale
  closed: ClosedFirmView[]
  offline: ClosedFirmView[]
  asOf: string
}) {
  const labels = CLOSED_FIRMS_LABELS[locale]
  return (
    <>
      <h2>{labels.closedHeading}</h2>
      {closed.map(firm => <FirmEntry key={firm.slug} firm={firm} labels={labels} asOf={asOf} />)}
      {offline.length > 0 && (
        <>
          <h2>{labels.offlineHeading}</h2>
          <p>{labels.offlineIntro}</p>
          {offline.map(firm => <FirmEntry key={firm.slug} firm={firm} labels={labels} asOf={asOf} />)}
        </>
      )}
    </>
  )
}
