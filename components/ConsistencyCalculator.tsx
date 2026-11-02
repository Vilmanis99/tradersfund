'use client'

/**
 * In-article consistency-rule calculator. Props are a projected public preset
 * list only — never raw firm/challenge records.
 */

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BASIS_LABELS,
  calculateConsistencyShare,
  formatShare,
  formatUsd,
  type ConsistencyCalcBasis,
  type ConsistencyPreset,
} from '@/lib/consistencyCalculator'

export type ConsistencyCalculatorProps = {
  presets: ConsistencyPreset[]
  defaultPreset?: string
  /** Hide the widget's own title + lede when the host page already shows them. */
  hideHeader?: boolean
}

const CUSTOM_ID = 'custom'

const BASIS_OPTIONS: ConsistencyCalcBasis[] = [
  'total-profit',
  'payout-cycle-profit',
  'profit-target',
  'per-trade',
  'not-stated',
]

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseLimit(raw: string): number | null {
  const cleaned = raw.replace(/%/g, '').trim()
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export default function ConsistencyCalculator({
  presets,
  defaultPreset,
  hideHeader = false,
}: ConsistencyCalculatorProps) {
  const uid = useId()
  const presetId = defaultPreset && presets.some(p => p.id === defaultPreset)
    ? defaultPreset
    : presets[0]?.id ?? CUSTOM_ID

  const [selectedId, setSelectedId] = useState(presetId)
  const [limitRaw, setLimitRaw] = useState(() => {
    const p = presets.find(x => x.id === presetId)
    return p?.limitPct != null ? String(p.limitPct) : '50'
  })
  const [basis, setBasis] = useState<ConsistencyCalcBasis>(() => {
    const p = presets.find(x => x.id === presetId)
    return p?.basis ?? 'total-profit'
  })
  const [bestDayRaw, setBestDayRaw] = useState('2400')
  const [applicableRaw, setApplicableRaw] = useState('3600')
  const [limitTouched, setLimitTouched] = useState(false)
  const [basisTouched, setBasisTouched] = useState(false)

  const selected = selectedId === CUSTOM_ID ? null : presets.find(p => p.id === selectedId) ?? null

  function applyPreset(id: string) {
    setSelectedId(id)
    setLimitTouched(false)
    setBasisTouched(false)
    if (id === CUSTOM_ID) return
    const p = presets.find(x => x.id === id)
    if (!p) return
    if (p.limitPct != null) setLimitRaw(String(p.limitPct))
    setBasis(p.basis)
  }

  const limitPct = selected?.kind === 'no-rule' ? null : parseLimit(limitRaw)
  const bestDay = parseMoney(bestDayRaw)
  const applicable = parseMoney(applicableRaw)
  const activeBasis = basisTouched || selectedId === CUSTOM_ID ? basis : (selected?.basis ?? basis)
  const activeLimit = limitTouched || selectedId === CUSTOM_ID
    ? limitPct
    : (selected?.limitPct ?? limitPct)
  const inequality = selected?.inequality ?? 'lte'

  const result = useMemo(() => {
    if (selected?.kind === 'no-rule') return null
    if (activeBasis === 'not-stated') return null
    if (bestDay == null || applicable == null || activeLimit == null) return null
    return calculateConsistencyShare({
      bestDay,
      applicable,
      limitPct: activeLimit,
      inequality,
    })
  }, [selected?.kind, activeBasis, bestDay, applicable, activeLimit, inequality])

  const applicableLabel =
    activeBasis === 'profit-target' ? 'Profit target ($)' : 'Applicable profit ($)'

  const applicableHelp =
    activeBasis === 'total-profit'
      ? 'Closed profits and losses that the firm counts in the consistency window — for FTMO 1-Step (orders from 12 Oct 2026) that is cumulative closed P&L.'
      : activeBasis === 'payout-cycle-profit'
        ? 'Profit earned since the last approved payout or reward; the window restarts after payout when the firm says it resets.'
        : activeBasis === 'profit-target'
          ? 'The fixed evaluation profit target the firm publishes for the account size — only when the firm measures the best day against that target.'
          : 'Use the firm’s named profit figure. If the basis is not stated, confirm on the live rules page before sizing trades.'

  const showMath = selected?.kind !== 'no-rule' && activeBasis !== 'not-stated'

  const sectionAria = hideHeader
    ? { 'aria-label': 'Consistency rule calculator' as const }
    : { 'aria-labelledby': `${uid}-title` as const }

  return (
    <section
      className="consistency-calc"
      id="consistency-rule-calculator"
      data-article-diagram-rendered="consistency-calculator"
      {...sectionAria}
    >
      {!hideHeader && (
        <div className="consistency-calc__header">
          <h3 className="consistency-calc__title" id={`${uid}-title`}>
            Consistency rule calculator
          </h3>
          <p className="consistency-calc__lede">
            Pick a firm preset or enter a custom limit, then plug in your best closed day and the profit figure the firm names. Pass/fail here is an estimate. The firm’s own dashboard, timezone cut-off, and open-position rules decide eligibility.
          </p>
        </div>
      )}

      <div className="consistency-calc__grid">
        <div className="consistency-calc__fields">
          <label className="consistency-calc__field" htmlFor={`${uid}-preset`}>
            <span className="consistency-calc__label">Firm / product preset</span>
            <select
              id={`${uid}-preset`}
              className="consistency-calc__control"
              value={selectedId}
              onChange={e => applyPreset(e.target.value)}
            >
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              <option value={CUSTOM_ID}>Custom (enter your own limit %)</option>
            </select>
            <span className="consistency-calc__help">
              Prefills the limit % and, when the firm states one, the profit base. Firms that publish no consistency rule are listed at the end; there is nothing to check for them.
            </span>
          </label>

          {selected?.kind === 'no-rule' ? (
            <div className="consistency-calc__empty" role="status">
              <p>{selected.emptyState}</p>
              {selected.reviewHref && (
                <p>
                  <Link href={selected.reviewHref}>{selected.firmName ?? 'Firm'} review</Link>
                  {selected.firmName === 'BrightFunded' && (
                    <>
                      {' · '}
                      <Link href="/go/bright-funded" prefetch={false}>Check BrightFunded’s live terms</Link>
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <>
              <label className="consistency-calc__field" htmlFor={`${uid}-limit`}>
                <span className="consistency-calc__label">Consistency limit (%)</span>
                <input
                  id={`${uid}-limit`}
                  className="consistency-calc__control"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={99}
                  step={1}
                  value={limitRaw}
                  onChange={e => {
                    setLimitTouched(true)
                    setLimitRaw(e.target.value)
                  }}
                  aria-describedby={`${uid}-limit-help`}
                />
                <span className="consistency-calc__help" id={`${uid}-limit-help`}>
                  The maximum share the best day (or largest winning trade, on rare products) may take of the firm’s named profit base. Enter a number from 1 to 99.
                </span>
              </label>

              <label className="consistency-calc__field" htmlFor={`${uid}-basis`}>
                <span className="consistency-calc__label">Measured against</span>
                <select
                  id={`${uid}-basis`}
                  className="consistency-calc__control"
                  value={activeBasis}
                  onChange={e => {
                    setBasisTouched(true)
                    setBasis(e.target.value as ConsistencyCalcBasis)
                  }}
                >
                  {BASIS_OPTIONS.map(key => (
                    <option key={key} value={key}>{BASIS_LABELS[key]}</option>
                  ))}
                </select>
                <span className="consistency-calc__help">
                  Use the firm’s words, not a guessed formula. If the firm doesn&apos;t say what the percentage is measured against, choose “Not stated by the firm”.
                </span>
              </label>

              {(selected?.basisNote || activeBasis === 'not-stated') && (
                <p className="consistency-calc__warn" role="status">
                  {selected?.basisNote
                    ?? 'This product’s help page does not state a single profit base clearly enough for us to prefill one.'}
                </p>
              )}

              <label className="consistency-calc__field" htmlFor={`${uid}-bestday`}>
                <span className="consistency-calc__label">Best day profit ($)</span>
                <input
                  id={`${uid}-bestday`}
                  className="consistency-calc__control"
                  type="text"
                  inputMode="decimal"
                  value={bestDayRaw}
                  onChange={e => setBestDayRaw(e.target.value)}
                  aria-describedby={`${uid}-bestday-help`}
                />
                <span className="consistency-calc__help" id={`${uid}-bestday-help`}>
                  Net profit of the single most profitable closed trading day in the firm’s timezone (or the largest winning trade if the preset is per-trade). Do not count open floating P&amp;L unless the firm says to.
                </span>
              </label>

              {showMath && (
                <label className="consistency-calc__field" htmlFor={`${uid}-applicable`}>
                  <span className="consistency-calc__label">{applicableLabel}</span>
                  <input
                    id={`${uid}-applicable`}
                    className="consistency-calc__control"
                    type="text"
                    inputMode="decimal"
                    value={applicableRaw}
                    onChange={e => setApplicableRaw(e.target.value)}
                    aria-describedby={`${uid}-applicable-help`}
                  />
                  <span className="consistency-calc__help" id={`${uid}-applicable-help`}>
                    {applicableHelp}
                  </span>
                </label>
              )}
            </>
          )}

          {selected?.stageNote && selected.kind !== 'no-rule' && (
            <p className="consistency-calc__note">{selected.stageNote}</p>
          )}
        </div>

        <div
          className="consistency-calc__results"
          aria-live="polite"
          aria-atomic="true"
          id={`${uid}-results`}
        >
          <h4 className="consistency-calc__results-title">Result</h4>
          {selected?.kind === 'no-rule' ? (
            <p className="consistency-calc__muted">No best-day % to calculate for this preset.</p>
          ) : activeBasis === 'not-stated' ? (
            <p className="consistency-calc__muted">
              We will not invent a pass/fail math path while the profit base is not stated. Open the source link and use the firm’s dashboard figures.
            </p>
          ) : result == null ? (
            <p className="consistency-calc__muted">
              Enter a best-day profit, an applicable profit above zero, and a limit between 1 and 99.
            </p>
          ) : (
            <dl className="consistency-calc__dl">
              <div>
                <dt>Your consistency share</dt>
                <dd>
                  {formatUsd(bestDay!)} / {formatUsd(applicable!)} × 100 = <strong>{formatShare(result.sharePct)}</strong>
                </dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>
                  <span
                    className={
                      result.pass
                        ? 'consistency-calc__badge consistency-calc__badge--pass'
                        : 'consistency-calc__badge consistency-calc__badge--fail'
                    }
                  >
                    {result.pass ? 'Pass' : 'Fail / over limit'}
                  </span>
                  <span className="consistency-calc__muted">
                    {' '}
                    ({inequality === 'lt' ? 'strictly below' : 'at or below'} {activeLimit}%)
                  </span>
                </dd>
              </div>
              <div>
                <dt>Profit base needed</dt>
                <dd>{formatUsd(result.requiredApplicable)}</dd>
              </div>
              <div>
                <dt>Extra profit still needed</dt>
                <dd>{formatUsd(result.extraNeeded)}</dd>
              </div>
            </dl>
          )}

          {selected?.sourceUrl && (
            <p className="consistency-calc__source">
              Source:{' '}
              <a href={selected.sourceUrl} rel="noopener noreferrer" target="_blank">
                {selected.firmName ?? 'Firm'}
              </a>
              {selected.sourceCapturedAt ? ` · checked ${selected.sourceCapturedAt}` : null}
              {selected.reviewHref ? (
                <>
                  {' · '}
                  <Link href={selected.reviewHref}>Review</Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>

      <p className="consistency-calc__disclaimer">
        This tool is an <strong>estimate</strong> for education only. It cannot see open positions, the firm’s exact day boundary, news-window adjustments, or dashboard rounding. <strong>The firm’s own platform decides</strong> whether an evaluation is complete or a payout is eligible. Rules change; re-check the linked source on the day you trade. We may earn a commission when you use our partner links; that does not change the quoted rules or scores.
      </p>
    </section>
  )
}
