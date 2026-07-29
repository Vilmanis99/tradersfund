import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  IndianRupee,
  Scale,
  ShieldCheck,
  Swords,
  WalletCards,
} from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import IndiaChallengeComparison from '@/components/IndiaChallengeComparison'
import ProductChangeSignals from '@/components/ProductChangeSignals'
import { INDIA_EVIDENCE_BY_SLUG, type IndiaEvidenceField } from '@/lib/india'
import {
  INDIA_MATCHUPS,
  indiaMatchupPath,
  type IndiaMatchupConfig,
} from '@/lib/indiaMatchups'
import {
  buildIndiaMatcherFirms,
  type IndiaMatcherFirm,
  type IndiaMatcherProduct,
} from '@/lib/indiaMatcher'
import { buildLandingPayload, getLandingBySlug } from '@/lib/landings'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'

function getMatchupFirms(config: IndiaMatchupConfig) {
  const landing = getLandingBySlug('best-prop-firms-in-india')
  if (!landing) throw new Error('India landing configuration is missing')
  const { ranked } = buildLandingPayload(landing)
  const matchupFirms = buildIndiaMatcherFirms(ranked.map(entry => entry.firm))
    .filter(firm => config.firmSlugs.includes(firm.slug))
  const firmA = matchupFirms.find(firm => firm.slug === config.firmSlugs[0])
  const firmB = matchupFirms.find(firm => firm.slug === config.firmSlugs[1])
  if (!firmA || !firmB) {
    throw new Error(`${config.title} firms must both pass the current India gate`)
  }
  return { firmA, firmB, matchupFirms: [firmA, firmB] }
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function compactMoney(value: number, currency: 'USD' | 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function numberRange(values: number[], suffix = '') {
  if (!values.length) return 'Unverified'
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  if (sorted.length === 1) return `${sorted[0]}${suffix}`
  return `${sorted[0]}${suffix}–${sorted.at(-1)}${suffix}`
}

function compactAccount(value: number) {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`
  if (value >= 1_000) return `$${value / 1_000}K`
  return `$${value}`
}

function accountRange(firm: IndiaMatcherFirm) {
  const values = firm.products.flatMap(product => product.accountSizesUsd)
  if (!values.length) return 'Unverified'
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  if (sorted.length === 1) return compactAccount(sorted[0])
  return `${compactAccount(sorted[0])}–${compactAccount(sorted.at(-1)!)}`
}

function entryRange(firm: IndiaMatcherFirm) {
  const values = new Map<'USD' | 'EUR', number[]>()
  for (const tier of firm.products.flatMap(product => product.pricedTiers)) {
    const list = values.get(tier.price.currency) ?? []
    list.push(tier.price.amount)
    values.set(tier.price.currency, list)
  }
  const labels = [...values.entries()].map(([currency, amounts]) => {
    const sorted = [...new Set(amounts)].sort((a, b) => a - b)
    const first = compactMoney(sorted[0], currency)
    const last = compactMoney(sorted.at(-1)!, currency)
    return first === last ? first : `${first}–${last}`
  })
  return labels.join(' / ') || 'Public fee unverified'
}

function earliestPayout(firm: IndiaMatcherFirm) {
  const products = firm.products
    .filter(product => product.payoutFirstDays != null)
    .sort((a, b) => productPayoutDay(a) - productPayoutDay(b))
  const first = products[0]
  if (!first || first.payoutFirstDays == null) {
    return { days: null, label: 'Unverified', product: null }
  }
  return {
    days: first.payoutFirstDays,
    label: first.payoutFirstDays === 0
      ? 'On request'
      : `Day ${first.payoutFirstDays}`,
    product: first.name,
  }
}

function productPayoutDay(product: IndiaMatcherProduct) {
  return product.payoutFirstDays ?? Number.POSITIVE_INFINITY
}

function splitRange(firm: IndiaMatcherFirm) {
  return numberRange(
    firm.products.flatMap(product =>
      product.profitSplitPct == null ? [] : [product.profitSplitPct]),
    '%',
  )
}

function lossRange(firm: IndiaMatcherFirm) {
  return numberRange(
    firm.products.flatMap(product =>
      product.maxLossPct == null ? [] : [product.maxLossPct]),
    '%',
  )
}

function ruleCoverage(
  firm: IndiaMatcherFirm,
  test: (product: IndiaMatcherProduct) => boolean,
) {
  const count = firm.products.filter(test).length
  return `${count}/${firm.products.length} products`
}

function changeSignalCount(firm: IndiaMatcherFirm) {
  return firm.products.reduce(
    (count, product) => count + product.changeSignals.length,
    0,
  )
}

function payoutRailList(firm: IndiaMatcherFirm) {
  return firm.payoutRails
    .map(rail => rail === 'rise' ? 'Rise' : rail[0].toUpperCase() + rail.slice(1))
    .join(', ')
}

function statusLabel(field: IndiaEvidenceField) {
  if (field.status === 'verified') return 'Verified'
  if (field.status === 'partial') return 'Partial'
  return 'Unknown'
}

function contextualWinner(
  a: IndiaMatcherFirm,
  b: IndiaMatcherFirm,
  valueFor: (firm: IndiaMatcherFirm) => number | null,
  direction: 'higher' | 'lower',
) {
  const aValue = valueFor(a)
  const bValue = valueFor(b)
  if (aValue == null && bValue == null) return 'No verified leader'
  if (aValue == null) return `${b.name} among verified values`
  if (bValue == null) return `${a.name} among verified values`
  if (aValue === bValue) return 'Tie'
  const aWins = direction === 'higher' ? aValue > bValue : aValue < bValue
  return aWins ? a.name : b.name
}

function EvidenceCell({ field }: { field: IndiaEvidenceField }) {
  return (
    <div className="india-matchup-evidence-cell">
      <strong data-status={field.status}>{statusLabel(field)}</strong>
      <span>{field.summary}</span>
      {field.sourceUrls[0] ? (
        <a href={field.sourceUrls[0]} target="_blank" rel="nofollow noopener">
          First-party source <ExternalLink size={9} aria-hidden="true" />
        </a>
      ) : (
        <em>No public source captured</em>
      )}
    </div>
  )
}

function FirmHeader({ firm }: { firm: IndiaMatcherFirm }) {
  return (
    <div className="india-matchup-firm-head">
      <Image src={firm.logo} alt="" width={42} height={42} />
      <div>
        <span>{firm.name}</span>
        <small>
          {firm.products.length} eligible product{firm.products.length === 1 ? '' : 's'}
        </small>
      </div>
    </div>
  )
}

export default function IndiaCuratedMatchupPage({
  config,
}: {
  config: IndiaMatchupConfig
}) {
  const { firmA, firmB, matchupFirms } = getMatchupFirms(config)
  const evidenceA = INDIA_EVIDENCE_BY_SLUG[config.firmSlugs[0]]
  const evidenceB = INDIA_EVIDENCE_BY_SLUG[config.firmSlugs[1]]
  if (!evidenceA || !evidenceB) {
    throw new Error('India evidence is missing for the matchup')
  }

  const payoutA = earliestPayout(firmA)
  const payoutB = earliestPayout(firmB)
  const latestCapture = [
    firmA.evidenceCapturedAt,
    firmB.evidenceCapturedAt,
    ...matchupFirms.flatMap(firm => firm.products.map(product => product.capturedAt)),
  ].sort().at(-1)!
  const totalProducts = firmA.products.length + firmB.products.length
  if (totalProducts !== config.expectedProductCount) {
    throw new Error(
      `Refresh ${config.title}: expected ${config.expectedProductCount} products, `
      + `received ${totalProducts}`,
    )
  }
  const totalSignals = changeSignalCount(firmA) + changeSignalCount(firmB)
  const relatedMatchups = Object.values(INDIA_MATCHUPS)
    .filter(matchup => matchup.slug !== config.slug)
  const shortlist = [
    `${firmA.slug}:${config.representativeProducts[0]}`,
    `${firmB.slug}:${config.representativeProducts[1]}`,
  ].join(',')
  if (
    !firmA.products.some(product => product.slug === config.representativeProducts[0])
    || !firmB.products.some(product => product.slug === config.representativeProducts[1])
  ) {
    throw new Error(`${config.title} representative shortlist is stale`)
  }
  const campaign = `india-matchup-${config.slug.replace('-vs-', '-')}`
  const comparisonUrl = '/best-prop-firms-in-india/challenge-comparison'
    + `?shortlist=${encodeURIComponent(shortlist)}`
    + `&priority=${config.defaultPriority}`

  const decisionCards = [
    {
      label: 'Broader eligible lineup',
      winner: contextualWinner(
        firmA,
        firmB,
        firm => firm.products.length,
        'higher',
      ),
      detail: `${firmA.products.length} ${firmA.name} paths versus ${firmB.products.length} ${firmB.name} paths pass the current India and freshness gates.`,
    },
    {
      label: 'Earliest verified request point',
      winner: contextualWinner(
        firmA,
        firmB,
        firm => earliestPayout(firm).days,
        'lower',
      ),
      detail: `${firmA.name}: ${payoutA.label}; ${firmB.name}: ${payoutB.label}. Request timing is not payout receipt timing.`,
    },
    {
      label: 'More published payout rails',
      winner: contextualWinner(
        firmA,
        firmB,
        firm => firm.payoutRails.length,
        'higher',
      ),
      detail: `${firmA.name}: ${payoutRailList(firmA)}. ${firmB.name}: ${payoutRailList(firmB)}. Indian delivery remains unverified.`,
    },
    {
      label: 'India evidence completeness',
      winner: contextualWinner(
        firmA,
        firmB,
        firm => firm.evidenceScore,
        'higher',
      ),
      detail: `${firmA.name}: ${firmA.evidenceScore}/12; ${firmB.name}: ${firmB.evidenceScore}/12. This measures field completeness, not quality or RBI authorisation.`,
    },
  ]

  const faqs = [
    {
      q: `Is ${firmA.name} or ${firmB.name} better for Indian traders?`,
      a: `There is no universal winner. ${firmA.name} currently has ${firmA.products.length} eligible products and an earliest verified first-request point of ${payoutA.label}. ${firmB.name} publishes ${firmB.payoutRails.length} payout rail${firmB.payoutRails.length === 1 ? '' : 's'} in the captured evidence. The better fit depends on the exact product, risk rules, checkout currency and payout route.`,
    },
    {
      q: `Are ${firmA.name} and ${firmB.name} authorised by the RBI?`,
      a: `No authorisation claim is made. Neither name was found on the RBI Alert List snapshot dated ${dateLabel(evidenceA.rbiAlert.sourceListUpdatedAt)}, but RBI says absence from its non-exhaustive list must not be treated as authorisation.`,
    },
    {
      q: 'Which firm has the faster published first payout?',
      a: `${firmA.name} has an earliest captured request point of ${payoutA.label}; ${firmB.name} has ${payoutB.label}. These are request-eligibility dates, not promises that money reaches an Indian bank or wallet on that day.`,
    },
    {
      q: `Can ${firmA.name} and ${firmB.name} prices be compared directly?`,
      a: `Not from face values alone. The current captured portfolios show ${entryRange(firmA)} for ${firmA.name} and ${entryRange(firmB)} for ${firmB.name}. Missing prices remain unranked; any cross-currency decision needs one current INR rate plus the same card, bank or wallet markup assumptions.`,
    },
    {
      q: 'Do affiliate links decide the winner?',
      a: 'No. Affiliate status contributes zero points to the India evidence score, product filters, decision memo and contextual calls. A firm without an approved partner link remains unmonetized.',
    },
  ]

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Best Prop Firms in India', url: '/best-prop-firms-in-india' },
    { name: `${config.title} India` },
  ])
  const faq = faqPageSchema(faqs)

  const firmRows = [
    {
      label: 'Eligible products',
      a: `${firmA.products.length} · ${accountRange(firmA)} accounts`,
      b: `${firmB.products.length} · ${accountRange(firmB)} accounts`,
    },
    {
      label: 'Published entry range',
      a: entryRange(firmA),
      b: entryRange(firmB),
    },
    {
      label: 'Earliest first request',
      a: `${payoutA.label}${payoutA.product ? ` · ${payoutA.product}` : ''}`,
      b: `${payoutB.label}${payoutB.product ? ` · ${payoutB.product}` : ''}`,
    },
    {
      label: 'Published profit split',
      a: splitRange(firmA),
      b: splitRange(firmB),
    },
    {
      label: 'Published max-loss range',
      a: lossRange(firmA),
      b: lossRange(firmB),
    },
    {
      label: 'EA fully allowed',
      a: ruleCoverage(firmA, product => product.rules.ea === true),
      b: ruleCoverage(firmB, product => product.rules.ea === true),
    },
    {
      label: 'Overnight + weekend allowed',
      a: ruleCoverage(
        firmA,
        product => product.rules.overnight === true && product.rules.weekend === true,
      ),
      b: ruleCoverage(
        firmB,
        product => product.rules.overnight === true && product.rules.weekend === true,
      ),
    },
    {
      label: 'Published payout rails',
      a: payoutRailList(firmA),
      b: payoutRailList(firmB),
    },
    {
      label: 'India evidence score',
      a: `${firmA.evidenceScore}/12`,
      b: `${firmB.evidenceScore}/12`,
    },
    {
      label: 'Dated change signals',
      a: changeSignalCount(firmA).toString(),
      b: changeSignalCount(firmB).toString(),
    },
  ]

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="blog-hero india-matchup-hero">
        <div className="aurora-orb aurora-orb--1" aria-hidden />
        <div className="aurora-orb aurora-orb--2" aria-hidden />
        <div className="aurora-grid" aria-hidden />
        <div className="home-shell" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/best-prop-firms-in-india" className="post-back">
            ← Best prop firms in India
          </Link>
          <div className="hero-eyebrow" style={{ marginBottom: '1.2rem' }}>
            <Swords size={12} aria-hidden="true" />
            India-specific matchup · {totalProducts} products · checked {dateLabel(latestCapture)}
          </div>
          <h1 className="blog-hero-title">
            {config.title} <span className="gradient-text">for India</span>
          </h1>
          <p className="blog-hero-sub">
            {config.heroDescription}
          </p>
          <div className="challenge-change-hero-actions">
            <Link href="#india-matchup-verdict" className="btn-primary btn-glow">
              See the constraint verdict <ArrowRight size={15} />
            </Link>
            <Link href={comparisonUrl} className="btn-outline">
              Open the 2-product decision memo
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section india-matchup-intro">
        <div className="home-shell">
          <AffiliateDisclosure />
          <div className="india-matchup-stat-grid">
            {[
              { value: totalProducts.toString(), label: 'eligible products', Icon: Scale },
              { value: '2', label: 'India-screened firms', Icon: ShieldCheck },
              { value: totalSignals.toString(), label: 'product change signals', Icon: FileCheck2 },
              { value: '0', label: 'affiliate ranking points', Icon: BadgeCheck },
            ].map(({ value, label, Icon }) => (
              <article key={label} className="post-sidebar-card india-matchup-stat">
                <Icon size={15} aria-hidden="true" />
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="india-matchup-verdict"
        className="home-section home-section--alt"
        aria-labelledby="india-matchup-verdict-heading"
      >
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-verdict-heading" className="section-title">
                <Swords size={18} aria-hidden="true" />
                The short answer: choose by constraint
              </h2>
              <p className="section-sub-text">
                These calls compare the current source set. They are not a permanent brand ranking.
              </p>
            </div>
            <span className="section-sub">
              <FileCheck2 size={13} aria-hidden="true" /> Updated with product captures
            </span>
          </div>
          <div className="india-matchup-decision-grid">
            {decisionCards.map(card => (
              <article key={card.label} className="india-matchup-decision-card">
                <span>{card.label}</span>
                <strong>{card.winner}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
            <article className="india-matchup-decision-card india-matchup-decision-card--caution">
              <span>Lowest INR checkout cost</span>
              <strong>No source-safe winner yet</strong>
              <p>
                Face-value prices use the firms&apos; published currencies. Apply one current INR
                rate and payment markup in the checkout planner before comparing.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-matchup-table-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-table-heading" className="section-title">
                <Scale size={18} aria-hidden="true" />
                {config.title} at a glance
              </h2>
              <p className="section-sub-text">
                Portfolio ranges stay separate from India evidence claims.
              </p>
            </div>
          </div>
          <div className="india-matchup-table-wrap">
            <table className="india-matchup-table">
              <thead>
                <tr>
                  <th scope="col">Decision factor</th>
                  <th scope="col"><FirmHeader firm={firmA} /></th>
                  <th scope="col"><FirmHeader firm={firmB} /></th>
                </tr>
              </thead>
              <tbody>
                {firmRows.map(row => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.a}</td>
                    <td>{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="india-matchup-table-note">
            A blank source field remains unverified. “Allowed” means the captured rule is explicitly
            true; restricted and unknown rules do not count toward coverage.
          </p>
        </div>
      </section>

      <section className="home-section home-section--alt" aria-labelledby="india-matchup-evidence-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-evidence-heading" className="section-title">
                <ShieldCheck size={18} aria-hidden="true" />
                India evidence, side by side
              </h2>
              <p className="section-sub-text">
                Country availability, KYC and payout claims are dated separately from product rules.
              </p>
            </div>
          </div>
          <div className="india-matchup-evidence-grid">
            {[
              { firm: firmA, evidence: evidenceA },
              { firm: firmB, evidence: evidenceB },
            ].map(({ firm, evidence }) => (
              <article key={firm.slug} className="post-sidebar-card india-matchup-evidence-card">
                <FirmHeader firm={firm} />
                <dl>
                  <div>
                    <dt>RBI Alert List snapshot</dt>
                    <dd>
                      <strong data-status="verified">Not found</strong>
                      <span>{evidence.rbiAlert.summary}</span>
                      <a
                        href={evidence.rbiAlert.sourceUrl}
                        target="_blank"
                        rel="nofollow noopener"
                      >
                        RBI list dated {dateLabel(evidence.rbiAlert.sourceListUpdatedAt)}
                        <ExternalLink size={9} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Country availability</dt>
                    <dd><EvidenceCell field={evidence.country} /></dd>
                  </div>
                  <div>
                    <dt>KYC</dt>
                    <dd><EvidenceCell field={evidence.kyc} /></dd>
                  </div>
                  <div>
                    <dt>Payout</dt>
                    <dd><EvidenceCell field={evidence.payout} /></dd>
                  </div>
                  <div>
                    <dt>Fees</dt>
                    <dd><EvidenceCell field={evidence.fees} /></dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd><EvidenceCell field={evidence.currency} /></dd>
                  </div>
                </dl>
                <div className="india-matchup-unresolved">
                  <CircleAlert size={13} aria-hidden="true" />
                  <span>{evidence.unresolved}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="india-matchup-products-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-products-heading" className="section-title">
                <WalletCards size={18} aria-hidden="true" />
                {`Compare all ${totalProducts} eligible products`}
              </h2>
              <p className="section-sub-text">
                Product names matter: steps, drawdown, payout timing and rule permissions differ
                inside each firm.
              </p>
            </div>
          </div>
          <div className="india-matchup-change-signals">
            {matchupFirms.flatMap(firm =>
              firm.products.flatMap(product =>
                product.changeSignals.length ? (
                  <article key={`${firm.slug}:${product.slug}`}>
                    <strong>{firm.name} · {product.name}</strong>
                    <ProductChangeSignals signals={product.changeSignals} />
                  </article>
                ) : [],
              ),
            )}
          </div>
        </div>
      </section>

      <IndiaChallengeComparison firms={matchupFirms} />

      <section className="home-section" aria-labelledby="india-matchup-faq-heading">
        <div className="home-shell">
          <div className="section-head">
            <div>
              <h2 id="india-matchup-faq-heading" className="section-title">
                {config.title} India FAQ
              </h2>
            </div>
          </div>
          <div className="india-matchup-faq-grid">
            {faqs.map(item => (
              <article key={item.q} className="post-sidebar-card">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {relatedMatchups.length > 0 && (
        <section className="home-section home-section--alt" aria-labelledby="india-related-matchups-heading">
          <div className="home-shell">
            <div className="section-head">
              <div>
                <h2 id="india-related-matchups-heading" className="section-title">
                  Related India matchups
                </h2>
                <p className="section-sub-text">
                  Curated pairs only—each route must add a distinct decision question.
                </p>
              </div>
              <Link href="/best-prop-firms-in-india/compare" className="btn-outline">
                Browse all India matchups <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="india-matchup-faq-grid">
              {relatedMatchups.map(matchup => (
                <Link
                  key={matchup.slug}
                  href={indiaMatchupPath(matchup)}
                  className="post-sidebar-card"
                  style={{ padding: '1rem', textDecoration: 'none' }}
                >
                  <span className="bento-tile-eyebrow">India head-to-head</span>
                  <strong style={{ display: 'block', color: '#fff', marginTop: '0.4rem' }}>
                    {matchup.title}
                  </strong>
                  <span style={{
                    display: 'block',
                    color: 'var(--muted)',
                    fontSize: '0.7rem',
                    lineHeight: 1.5,
                    marginTop: '0.35rem',
                  }}>
                    {matchup.metaDescription}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section home-section--alt">
        <div className="home-shell">
          <div className="cta-final india-matchup-final">
            <span className="bento-tile-eyebrow">
              <IndianRupee size={12} aria-hidden="true" /> Verify before checkout
            </span>
            <h2 className="cta-final-title">
              Pick the product first, then recheck the live offer
            </h2>
            <p className="cta-final-sub">
              Most funded-stage accounts are simulated. Confirm the contract, checkout currency,
              current rules and Indian payout route before paying.
            </p>
            <div className="india-matchup-partner-grid">
              {matchupFirms.map(firm => (
                <article key={firm.slug}>
                  <FirmHeader firm={firm} />
                  {firm.isPartner ? (
                    <Link
                      href={`/go/${firm.slug}?from=${campaign}`}
                      prefetch={false}
                      target="_blank"
                      rel="sponsored nofollow noopener"
                      className="btn-primary"
                    >
                      View {firm.name} plans <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={firm.products[0].sourceUrl}
                      target="_blank"
                      rel="nofollow noopener"
                      className="btn-primary"
                    >
                      View official terms <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  <Link href={firm.reviewUrl} className="btn-outline">
                    Read review <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
            <div className="cta-final-row">
              <Link href="/best-prop-firms-in-india#india-checkout-planner-heading" className="btn-outline">
                Estimate INR checkout
              </Link>
              <Link href="/best-prop-firms-in-india/payout-methods" className="btn-outline">
                Compare payout rails
              </Link>
              <Link href="/best-prop-firms-in-india/challenge-changes" className="btn-outline">
                Check India rule changes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
