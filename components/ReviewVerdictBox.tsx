import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import FirmLogo from './FirmLogo'
import TrustpilotRating from './TrustpilotRating'
import AffiliateDisclosure from './AffiliateDisclosure'
import { firmSlug } from '@/lib/firmSlug'
import type { Challenge, DrawdownType, Firm, FirmRatings } from '@/lib/firms'
import { payoutWait } from '@/lib/payoutWait'

/**
 * Phase 1 preview of the review VerdictBox (design/article-format-spec.md §3.2, C3).
 * Every figure comes from firms.json and the challenge captures. Facts that are
 * missing are not shown, and sub-score bars render only when every
 * `ratings.*` axis has a value.
 */

const DRAWDOWN_LABEL: Record<DrawdownType, string> = {
  static: 'static',
  trailing: 'trailing',
  'eod-trailing': 'EOD trailing',
  'balance-based': 'balance-based',
}

const RATING_LABELS: Array<[keyof FirmRatings, string]> = [
  ['conditions', 'Conditions'],
  ['payouts', 'Payouts'],
  ['platform', 'Platform'],
  ['support', 'Support'],
]

function shortName(firm: Firm, product: Challenge) {
  const escaped = firm.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return product.productName.replace(new RegExp(`^${escaped}\\s*(?:Challenge:?\\s*)?`, 'i'), '').trim() || product.productName
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function price(size: Challenge['accountSizes'][number] | undefined) {
  if (!size) return null
  if (size.priceUsd != null) return `$${size.priceUsd.toLocaleString('en-US')}`
  if (size.priceEur != null) return `€${size.priceEur.toLocaleString('en-US')}`
  return null
}

/** One value per product; collapsed to a single value when every product agrees. */
function perProduct(firm: Firm, products: Challenge[], value: (product: Challenge) => string | null) {
  const rows = products.map(product => ({ name: shortName(firm, product), value: value(product) }))
  if (rows.some(row => row.value == null)) return null
  const distinct = new Set(rows.map(row => row.value))
  if (distinct.size === 1) return rows[0].value
  return rows.map(row => `${row.value} (${row.name})`).join(' · ')
}

function targets(product: Challenge) {
  const t = product.profitTargets
  if (!t) return null
  const steps = [t.phase1, t.phase2, t.phase3].filter((v): v is number => v != null)
  return steps.length ? steps.map(v => `${v}%`).join(' → ') : null
}

export type SourcedLine = { text: string; fields: string[] }

export function buildVerdictFacts(firm: Firm, products: Challenge[]) {
  const facts: Array<{ label: string; value: string; fields: string[] }> = []
  const add = (label: string, value: string | null, fields: string[]) => { if (value) facts.push({ label, value, fields }) }
  if (!products.length) {
    add('Platforms', firm.platforms?.length ? firm.platforms.join(' · ') : null, ['firms.json platforms'])
    return facts
  }
  add('Price at $100K', perProduct(firm, products, product => price(product.accountSizes.find(size => size.sizeUsd === 100000))), ['challenges accountSizes[sizeUsd=100000].priceUsd|priceEur'])
  add('Profit target', perProduct(firm, products, targets), ['challenges profitTargets'])
  add('Daily / max loss', perProduct(firm, products, product =>
    product.dailyLossPct != null && product.maxLossPct != null
      ? `${product.dailyLossPct}% / ${product.maxLossPct}%${product.drawdownType ? ` ${DRAWDOWN_LABEL[product.drawdownType]}` : ''}`
      : null), ['challenges dailyLossPct', 'maxLossPct', 'drawdownType'])
  add('Profit split', perProduct(firm, products, product => product.profitSplitPct != null ? `${product.profitSplitPct}%` : null), ['challenges profitSplitPct'])
  add('First payout', perProduct(firm, products, product => payoutWait(product)?.short ?? null), ['challenges payoutFirstDays', 'notes (business days)'])
  add('Platforms', firm.platforms?.length ? firm.platforms.join(' · ') : null, ['firms.json platforms'])
  return facts
}

function priceRange(product: Challenge) {
  const eur = product.accountSizes.map(size => size.priceEur).filter((v): v is number => v != null)
  const usd = product.accountSizes.map(size => size.priceUsd).filter((v): v is number => v != null)
  // One currency only; never mix EUR and USD in a range.
  const [values, symbol] = eur.length && !usd.length ? [eur, '€'] : usd.length && !eur.length ? [usd, '$'] : [[], '']
  if (!values.length) return null
  const fmt = (v: number) => `${symbol}${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  const lo = Math.min(...values), hi = Math.max(...values)
  return lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`
}

/**
 * Best-for / not-for lines: EN Writer's copy as templates, every figure read
 * from the product captures (drawdown from the product files, not the firm-level field).
 */
export function buildFitLines(firm: Firm, products: Challenge[]) {
  const best: SourcedLine[] = []
  const avoid: SourcedLine[] = []
  const staticProduct = products.find(product => product.phases > 0 && product.drawdownType === 'static' && product.maxLossPct != null)
  if (staticProduct) best.push({ text: `Traders who want a fixed floor: ${shortName(firm, staticProduct)} max loss is a static ${staticProduct.maxLossPct}%`, fields: [`${staticProduct.productSlug}.drawdownType`, `${staticProduct.productSlug}.maxLossPct`] })
  const refundable = products.find(product => product.accountSizes.length > 0 && product.accountSizes.every(size => size.refundable === true))
  if (refundable) best.push({ text: `Getting your fee back: every ${shortName(firm, refundable)} account size is refundable`, fields: [`${refundable.productSlug}.accountSizes[].refundable`] })
  // No generated consistency-rule line: the captures do not record where a rule
  // applies (evaluation, funded stage, a payout route), and an unscoped line misleads.
  // Scoped wording comes from writer overrides in content/data/verdict-copy.json.
  const nonRefundable = products.find(product => product.accountSizes.length > 0 && product.accountSizes.every(size => size.refundable === false))
  if (nonRefundable) {
    const range = priceRange(nonRefundable)
    avoid.push({
      text: range
        ? `${shortName(firm, nonRefundable)} buyers hoping for a refund: its ${range} fee isn't refundable`
        : `${shortName(firm, nonRefundable)} buyers hoping for a refund: its fee isn't refundable`,
      fields: [`${nonRefundable.productSlug}.accountSizes[].refundable`, ...(range ? [`${nonRefundable.productSlug}.accountSizes[].priceUsd|priceEur`] : [])],
    })
  }
  if (products.length && products.every(product => product.assetClass === 'cfd')) avoid.push({ text: 'Futures traders: every captured product is a CFD evaluation', fields: ['challenges[].assetClass'] })
  return { best: best.slice(0, 2), avoid: avoid.slice(0, 2) }
}

export default function ReviewVerdictBox({
  firm,
  products,
  verdict,
  compare,
  sourcesHref,
  bestForOverride,
  notForOverride,
  wip = false,
}: {
  firm: Firm
  products: Challenge[]
  /** First sentence of the review's own "Verdict" section. */
  verdict: string | null
  compare?: { href: string; label: string }
  sourcesHref: string
  /** Writer overrides from content/data/verdict-copy.json. */
  bestForOverride?: string[]
  notForOverride?: string[]
  /** Show the 'Preview, work in progress' tag. */
  wip?: boolean
}) {
  const slug = firmSlug(firm.name)
  const hasAffiliate = Boolean(firm.affiliateUrl)
  const facts = buildVerdictFacts(firm, products)
  const generated = buildFitLines(firm, products)
  const fit = {
    best: bestForOverride?.length ? bestForOverride.slice(0, 2) : generated.best.map(line => line.text),
    avoid: notForOverride?.length ? notForOverride.slice(0, 2) : generated.avoid.map(line => line.text),
  }
  const checked = products.map(product => product.sourceCapturedAt).filter(Boolean).sort()[0]
  const ratings = firm.ratings
  const showBars = Boolean(ratings) && RATING_LABELS.every(([key]) => typeof ratings?.[key] === 'number')

  return (
    <section className="review-verdict" aria-labelledby="review-verdict-title" data-review-verdict={slug}>
      {wip && <span className="review-verdict__wip">Preview, work in progress</span>}
      <div className="review-verdict__head">
        <FirmLogo name={firm.name} src={firm.logo} size={52} />
        <div className="review-verdict__id">
          <p id="review-verdict-title" className="review-verdict__name">{firm.name}</p>
          <div className="review-verdict__sub">
            <TrustpilotRating firm={firm} label />
            {firm.founded && <span>Since {firm.founded}</span>}
          </div>
        </div>
        <div className="review-verdict__score">
          <div className="review-verdict__score-n" aria-label={`Our score: ${firm.score} out of 10`}>
            {firm.score}<small>/10</small>
          </div>
          <Link href="/methodology">How we score</Link>
        </div>
      </div>

      {showBars && (
        <ul className="review-verdict__bars" aria-label="Sub-scores">
          {RATING_LABELS.map(([key, label]) => (
            <li key={key}><span>{label}</span><span className="review-verdict__bar"><i style={{ width: `${(ratings![key] as number) * 10}%` }} /></span><b>{ratings![key]}</b></li>
          ))}
        </ul>
      )}

      {verdict && <p className="review-verdict__line">{verdict}</p>}

      <div className="review-verdict__quick">
        <Link
          href={`/go/${slug}?from=review-cta`}
          prefetch={false}
          rel={hasAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
          target="_blank"
          className={hasAffiliate ? 'btn-primary btn-glow' : 'btn-primary'}
          data-verdict-cta
        >
          {hasAffiliate ? `Visit ${firm.name}` : 'View official plans'} <ExternalLink size={14} aria-hidden="true" />
        </Link>
        <span className="review-verdict__quick-note">{hasAffiliate ? 'Partner link · we may earn a commission' : 'Official site · no affiliate deal'}</span>
      </div>

      {(fit.best.length > 0 || fit.avoid.length > 0) && (
        <div className="review-verdict__fit">
          {fit.best.length > 0 && (
            <div className="review-verdict__fit-yes">
              <p className="review-verdict__fit-h">✓ Best for</p>
              <ul>{fit.best.map(line => <li key={line}>{line}</li>)}</ul>
            </div>
          )}
          {fit.avoid.length > 0 && (
            <div className="review-verdict__fit-no">
              <p className="review-verdict__fit-h">✕ Not for</p>
              <ul>{fit.avoid.map(line => <li key={line}>{line}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="review-verdict__facts">
          {facts.map(fact => (
            <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
          ))}
        </dl>
      )}

      <div className="review-verdict__cta">
        {compare && <Link href={compare.href} className="btn-outline">{compare.label}</Link>}
        {checked && (
          <a href={sourcesHref} className="review-verdict__checked">✓ Data checked {formatDate(checked)}</a>
        )}
      </div>
      {!hasAffiliate && (
        <span hidden data-outbound-relationship="official">
          This link opens {firm.name}&apos;s official website without affiliate tracking.
        </span>
      )}
      <AffiliateDisclosure firmName={firm.name} hasAffiliate={hasAffiliate} />
    </section>
  )
}
