import { useId, type CSSProperties, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { isFundedLiveTier, splitTierCondition, SPLIT_TIERS_COPY, type SplitLang, type SplitTier } from '@/lib/profitSplitDisplay'

/**
 * The tiered split label ("50–80% (tiered)" / «50–80% (по уровням)») as a button that opens a
 * popover listing every published tier with its condition in the page language (Funded Live
 * included, RU from appliesToRu).
 *
 * No JS needed: the HTML popover API (`popovertarget`) toggles it on click, tap, Enter or Space,
 * Esc and an outside tap close it, and the browser exposes the expanded state. The panel is in the
 * top layer, so table and card scrollers never clip it and opening it never moves the layout.
 * The button's aria-describedby points at the panel, so screen readers hear the conditions on focus.
 * Placement: next to the label where CSS anchor positioning exists, else centred on screen
 * (app/globals.css .split-tiers). Browsers without popover support show the panel inline.
 */
export default function SplitTiersDisclosure({ tiers, lang = 'en', splitProduct, children }: {
  tiers: SplitTier[]
  lang?: SplitLang
  /** "<firm>:<product>" when the disclosure itself carries the data-split-product marker. */
  splitProduct?: string
  children: ReactNode
}) {
  const copy = SPLIT_TIERS_COPY[lang]
  const id = `split-tiers-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const anchor = { anchorName: `--${id}` } as CSSProperties
  const anchored = { positionAnchor: `--${id}` } as CSSProperties
  return (
    <div className="split-tiers" data-split-tiers-lang={lang} {...(splitProduct ? { 'data-split-product': splitProduct, 'data-split-display': 'tiered' } : {})}>
      <button type="button" className="split-tiers__trigger" popoverTarget={id} aria-describedby={id} style={anchor}>
        {children}
        <Info className="split-tiers__icon" size={13} aria-hidden="true" focusable="false" />
        <span className="sr-only"> ({copy.hint})</span>
      </button>
      <div id={id} popover="auto" className="split-tiers__panel" role="note" aria-label={copy.heading} style={anchored}>
        <p className="split-tiers__heading">{copy.heading}</p>
        <ul className="split-tiers__list">
          {tiers.map(tier => (
            <li key={`${tier.traderPct}-${tier.appliesTo}`} data-split-tier-stage={isFundedLiveTier(tier) ? 'funded-live' : 'before-live'}>
              <b>{tier.traderPct}%</b> <span>{splitTierCondition(tier, lang)}</span>
            </li>
          ))}
        </ul>
        {tiers.some(isFundedLiveTier) ? <p className="split-tiers__note">{copy.liveNote}</p> : null}
      </div>
    </div>
  )
}
