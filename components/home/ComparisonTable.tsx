'use client'

import { useState } from 'react'
import Link from 'next/link'
import FirmLogo from '../FirmLogo'
import { RuAccessBadgeView } from '../RuAccessBadgeView'
import { HOME_COPY, type HomeLocale } from './copy'
import type { ComparisonRow } from './types'
import { localeDate } from '@/lib/ruDate'
import { hasTieredSplit, profitSplitText, profitSplitValue, TIERED_LABEL } from '@/lib/profitSplitDisplay'

type Chip = 'all' | 'open' | 'cfd' | 'futures' | 'one' | 'two'

function matches(row: ComparisonRow, chip: Chip) {
  switch (chip) {
    case 'open': return row.russiaStatus === 'available'
    case 'cfd': return row.assetClass === 'cfd'
    case 'futures': return row.assetClass === 'futures'
    case 'one': return row.phases === 1
    case 'two': return row.phases === 2
    default: return true
  }
}

/**
 * Server-rendered comparison (all rows in the initial HTML); chips filter on
 * the client. Desktop shows a sticky-header table, mobile a swipe-card row.
 */
export default function ComparisonTable({ rows, locale, placement }: { rows: ComparisonRow[]; locale: HomeLocale; placement: string }) {
  const t = HOME_COPY[locale]
  const [chip, setChip] = useState<Chip>('all')
  const chips: Chip[] = locale === 'ru' ? ['all', 'open', 'cfd', 'futures', 'one', 'two'] : ['all', 'cfd', 'futures', 'one', 'two']
  const visible = rows.filter(row => matches(row, chip))
  const money = (row: ComparisonRow) => row.priceBreakdown ?? new Intl.NumberFormat(t.locale, { style: 'currency', currency: row.currency, maximumFractionDigits: 0 }).format(row.price)
  const na = <span className="th-na" title={t.notPublished}><span aria-hidden="true">—</span><span className="sr-only">{t.notPublished}</span></span>
  const pct = (value: number | null) => value == null ? na : `${value}%`
  const split = (row: ComparisonRow) => profitSplitText(row, locale === 'ru' ? 'ru' : 'en') ?? na
  const visit = (row: ComparisonRow, className: string, layout: 'table' | 'cards') => row.goHref
    ? <Link href={`${row.goHref}?from=${placement}-${layout}`} prefetch={false} rel="sponsored nofollow noopener" target="_blank" className={className} data-russia-status={row.russiaStatus ?? undefined}>{t.visit}</Link>
    : <Link href={row.reviewUrl} className={className.replace('th-btn--amber', 'th-btn--ghost')}>{t.review}</Link>
  const official = (row: ComparisonRow) => row.officialUrl
    ? <a href={row.officialUrl} target="_blank" rel="nofollow noopener" className="th-link" data-home-official-site={row.firmSlug}>{t.official} <span aria-hidden="true">↗</span><span className="sr-only"> ({locale === 'ru' ? 'откроется в новой вкладке' : 'opens in a new tab'})</span></a>
    : null
  // goHref is set only for firms with an affiliate link (homeData.ts), so this
  // labels exactly the rows whose amber sign-up button is a partner link.
  const partnerPill = (row: ComparisonRow) => row.goHref
    ? <span className="partner-pill" data-partner-label={row.firmSlug} title={t.partnerTitle}>{t.partner}</span>
    : null
  const badge = (row: ComparisonRow) => row.russiaStatus ? <RuAccessBadgeView firm={row.firmSlug} status={row.russiaStatus} basisDate={row.russiaBasisDate} hint={false} /> : null

  return (
    <div className="th-compare" data-home-comparison={locale}>
      <div className="th-chips" role="group" aria-label={t.filterLabel}>
        {chips.map(key => (
          <button key={key} type="button" className="th-chip" aria-pressed={chip === key} onClick={() => setChip(key)}>{t.chips[key]}</button>
        ))}
      </div>
      {visible.length === 0 ? <p className="th-muted">{t.empty}</p> : null}
      <div className="th-table-scroll" tabIndex={0} role="region" aria-label={t.tableLabel}>
        <table className="th-table">
          <thead><tr>
            <th scope="col">{t.cols.firm}</th><th scope="col">{t.cols.programme}</th><th scope="col">{t.cols.fee}</th><th scope="col">{t.cols.target}</th>
            <th scope="col">{t.cols.loss}</th><th scope="col">{t.cols.split}</th><th scope="col" className="th-col--opt">{t.cols.payout}</th><th scope="col" className="th-col--opt">{t.cols.checked}</th><th scope="col"><span className="sr-only">{t.visit}</span></th>
          </tr></thead>
          <tbody>
            {visible.map(row => (
              <tr key={row.firmSlug} data-home-comparison-firm={row.firmSlug}>
                <th scope="row">
                  <div className="th-firm">
                    <FirmLogo name={row.firmName} src={row.logo} size={36} />
                    <div><strong>{row.firmName}</strong> {partnerPill(row)}<span className="th-score">★ {row.score.toFixed(1)}/10{row.trustpilot ? ` · Trustpilot ${row.trustpilot}` : ''}</span></div>
                  </div>
                </th>
                <td className="th-muted">{row.product}</td>
                <td className="th-num"><b>{money(row)}</b>{row.pricingModel === 'monthly-subscription' ? <small> {t.subscription}</small> : null}</td>
                <td className="th-num">{pct(row.profitTarget)}</td>
                <td className="th-num">{pct(row.dailyLossPct)} / {pct(row.maxLossPct)}</td>
                <td className="th-num" data-split-product={`${row.firmSlug}:${row.productSlug}`} data-split-display={hasTieredSplit(row) ? 'tiered' : 'flat'}>{hasTieredSplit(row) ? <>{profitSplitValue(row)}<br /><small>({TIERED_LABEL[locale === 'ru' ? 'ru' : 'en']})</small></> : split(row)}</td>
                <td className="th-col--opt">{row.payoutFrequency ? t.payout[row.payoutFrequency] ?? row.payoutFrequency : na}</td>
                <td className="th-muted th-small th-col--opt"><time dateTime={row.checkedOn}>{localeDate(row.checkedOn, locale)}</time></td>
                <td><div className="th-row-actions" data-row-badge={badge(row) ? 'after-cta' : undefined}>{visit(row, 'th-btn th-btn--amber th-btn--sm', 'table')}{badge(row)}{row.goHref ? <Link href={row.reviewUrl} className="th-link">{t.review}</Link> : official(row)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="th-swipe-hint th-small th-muted" aria-hidden="true">{t.swipe} →</p>
      <ul className="th-cards">
        {visible.map(row => (
          <li key={row.firmSlug} className="th-card">
            <div className="th-firm"><FirmLogo name={row.firmName} src={row.logo} size={40} /><div><strong>{row.firmName}</strong> {partnerPill(row)}<span className="th-score">★ {row.score.toFixed(1)}/10</span></div></div>
            <span className="th-small th-muted">{row.product}</span>
            <dl className="th-facts">
              <div><dt>{t.cols.fee}</dt><dd>{money(row)}</dd></div>
              <div><dt>{t.cols.split}</dt><dd data-split-product={`${row.firmSlug}:${row.productSlug}`} data-split-display={hasTieredSplit(row) ? 'tiered' : 'flat'}>{split(row)}</dd></div>
              <div><dt>{t.cols.loss}</dt><dd>{pct(row.dailyLossPct)} / {pct(row.maxLossPct)}</dd></div>
            </dl>
            {visit(row, 'th-btn th-btn--amber th-btn--block', 'cards')}
            {row.goHref ? null : official(row)}
            {badge(row)}
          </li>
        ))}
      </ul>
    </div>
  )
}
