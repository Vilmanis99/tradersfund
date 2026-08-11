import Link from 'next/link'
import {
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  Info,
  Layers,
  Scale,
} from 'lucide-react'
import {
  formatBillingModel,
  formatMoney,
  formatSize,
  type ChallengeMatchup as Matchup,
  type MatchupCostGroup,
  type MatchupRuleRow,
  type RuleValueGroup,
} from '@/lib/challengeMatchup'

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The gap between the cheapest route on each side, stated in the currency
 * both were quoted in. Only reachable when `group.cheapest` is set; unmatched
 * products may still be in the table, so the rival is constrained to the
 * winner's compatible currency-and-billing class.
 */
function costGap(group: MatchupCostGroup): string | null {
  const winner = group.cheapest
  if (!winner) return null
  const rival = group.rows
    .filter(row =>
      row.side !== winner.side
      && row.currency === winner.currency
      && row.pricingModel === winner.pricingModel)
    .sort((x, y) => x.minimumCost - y.minimumCost)[0]
  if (!rival) return null
  const gap = rival.minimumCost - winner.minimumCost
  if (gap <= 0) return null
  const pct = Math.round((gap / rival.minimumCost) * 100)
  return `${formatMoney(gap, winner.currency)} less than ${rival.firmName}'s cheapest route at this tier (${rival.productName}, ${formatMoney(rival.minimumCost, rival.currency)}) — ${pct}% cheaper.`
}

function ValueCell({ groups, uniform }: { groups: RuleValueGroup[]; uniform: boolean }) {
  if (!groups.length) return <td className="cm-rule-cell">—</td>
  return (
    <td className={`cm-rule-cell${uniform ? '' : ' cm-rule-cell--split'}`}>
      {groups.map(group => (
        <div key={group.display} className="cm-rule-value">
          <strong>{group.display}</strong>
          {/* Product names only earn their space when the firm disagrees
              with itself — otherwise every cell repeats the full lineup. */}
          {!uniform && <small>{group.products.join(', ')}</small>}
        </div>
      ))}
    </td>
  )
}

function CostTable({ group }: { group: MatchupCostGroup }) {
  const showR = group.rows.some(row => row.rMultiple != null)
  const showDays = group.rows.some(row => row.dayCount != null)

  return (
    <div className="cm-scroll">
      <table className="cm-table">
        <caption className="cm-caption">
          Cost to a funded {formatSize(group.sizeUsd)} account, every verified product on both sides
        </caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Cost to funded</th>
            <th scope="col">Break-even profit</th>
            {showR && <th scope="col">R-multiple</th>}
            {showDays && <th scope="col">Days @ 1%/day</th>}
          </tr>
        </thead>
        <tbody>
          {group.rows.map(row => (
            <tr
              key={`${row.firmSlug}-${row.productSlug}`}
              className={group.cheapest === row ? 'cm-row--best' : undefined}
            >
              <th scope="row">
                <span className="cm-product">{row.productName}</span>
                <small>
                  {row.firmName} · {formatBillingModel(row.pricingModel)} ·{' '}
                  {row.profitSplitPct}% split
                </small>
              </th>
              <td>
                <span className="cm-figure">{formatMoney(row.minimumCost, row.currency)}</span>
                <small>{row.costBasis}</small>
              </td>
              <td>
                <span className="cm-figure">{formatMoney(row.breakEvenProfit, row.currency)}</span>
                <small>at {row.profitSplitPct}% split</small>
              </td>
              {showR && (
                <td>
                  {row.rMultiple != null ? (
                    <>
                      <span className="cm-figure">{row.rMultiple.toFixed(2)}</span>
                      {/* The cap each ratio is measured against belongs in the
                          row: products in one table sit on different max-loss
                          rules, so a single footnote would state an assumption
                          that only holds for some of them. */}
                      {row.rBasis && <small>{row.rBasis}</small>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              )}
              {showDays && <td>{row.dayCount ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {(showR || showDays) && (
        <p className="cm-footnote">
          {showR && <>R-multiple is break-even profit divided by that product&apos;s own maximum permitted loss — under 1.00 means you can lose more than you need to make to win the fee back. </>}
          {showDays && <>Day count assumes 1% account growth per day, capped by the product&apos;s own daily loss limit. </>}
          Blank cells are figures the firm does not publish.
        </p>
      )}
    </div>
  )
}

export default function ChallengeMatchup({
  matchup,
  prose,
}: {
  matchup: Matchup
  prose: string[]
}) {
  if (!matchup.hasData) return null
  const { a, b } = matchup

  return (
    <section className="cm" aria-label="Product-level challenge comparison">
      <h2 className="cm-h2">
        Product-level: {a.name} vs {b.name}
      </h2>
      <p className="cm-lede">
        The table above compares the two firms. This one compares the products
        you actually buy — {a.productCount + b.productCount} of them, each with
        its own price, split, drawdown rule and source date.
      </p>

      {prose.map(paragraph => (
        <p key={paragraph.slice(0, 48)} className="cm-para">{paragraph}</p>
      ))}

      {/* ── Cost ───────────────────────────────────────────────── */}
      <h3 className="cm-h3">
        <Scale size={16} aria-hidden="true" /> Cost to funded, matched by account size
      </h3>

      {matchup.noSharedSizeNote ? (
        <p className="cm-note">
          <Info size={14} aria-hidden="true" />
          <span>{matchup.noSharedSizeNote}</span>
        </p>
      ) : (
        matchup.costGroups.map(group => {
          const gap = costGap(group)
          return (
          <div key={group.sizeUsd} className="cm-tier">
            <h4 className="cm-h4">{formatSize(group.sizeUsd)} account</h4>
            {group.cheapest && (
              <p className="cm-callout">
                <BadgeCheck size={14} aria-hidden="true" />
                <span>
                  <strong>{group.cheapest.firmName}</strong> is cheaper within the shared{' '}
                  {group.cheapest.currency} {formatBillingModel(group.cheapest.pricingModel).toLowerCase()} class:{' '}
                  {group.cheapest.productName} at{' '}
                  {formatMoney(group.cheapest.minimumCost, group.cheapest.currency)}
                  {gap ? ` — ${gap}` : '.'}
                </span>
              </p>
            )}
            {group.tie && (
              <p className="cm-note">
                <Info size={14} aria-hidden="true" />
                <span>
                  Both firms&apos; cheapest {group.tie.currency}{' '}
                  {formatBillingModel(group.tie.pricingModel).toLowerCase()} route costs{' '}
                  {formatMoney(group.tie.minimumCost, group.tie.currency)} at this tier — a tie.
                </span>
              </p>
            )}
            {group.blockedReason && (
              <p className="cm-note">
                <Info size={14} aria-hidden="true" />
                <span>{group.blockedReason}</span>
              </p>
            )}
            <CostTable group={group} />
          </div>
          )
        })
      )}

      {/* ── Rules ──────────────────────────────────────────────── */}
      <h3 className="cm-h3">
        <Layers size={16} aria-hidden="true" /> Rule-by-rule, product by product
      </h3>
      <p className="cm-para">
        Each cell shows every value that firm&apos;s current products hold.
        Where a firm disagrees with itself the products are named — those are
        the rows a firm-level table has to flatten, and the ones that decide
        whether your strategy is allowed.
        {matchup.intraFirmSplits.length > 0 && (
          <> {matchup.intraFirmSplits.length} of {matchup.ruleRows.length} rows
          split this way in this matchup.</>
        )}
      </p>
      <div className="cm-scroll">
        <table className="cm-table cm-table--rules">
          <caption className="cm-caption">
            Product-level rule comparison, {a.name} vs {b.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Term</th>
              <th scope="col">{a.name}</th>
              <th scope="col">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {matchup.ruleRows.map((row: MatchupRuleRow) => (
              <tr key={row.label} className={row.same ? 'cm-row--same' : undefined}>
                <th scope="row">
                  {row.label}
                  {row.same && <span className="cm-chip">same</span>}
                </th>
                <ValueCell groups={row.a} uniform={row.aUniform} />
                <ValueCell groups={row.b} uniform={row.bUniform} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Change watch ───────────────────────────────────────── */}
      {matchup.watch.length > 0 && (
        <>
          <h3 className="cm-h3">
            <CircleAlert size={16} aria-hidden="true" /> Dated changes affecting these firms
          </h3>
          <div className="cm-watch">
            {matchup.watch.map(entry => (
              <article key={entry.id} className={`cm-watch-item cm-watch-item--${entry.status}`}>
                <div className="cm-watch-head">
                  <strong>{entry.firmName}</strong>
                  <span>{entry.status === 'watch' ? 'Open watch' : 'Verified'}</span>
                </div>
                <p className="cm-watch-title">{entry.title}</p>
                <p className="cm-watch-impact">{entry.traderImpact}</p>
                <footer>
                  <span>Checked {dateLabel(entry.lastCheckedAt)}</span>
                  <Link href={`/prop-firm-challenge-changes#${entry.id}`}>Details</Link>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}

      {/* ── Sources ────────────────────────────────────────────── */}
      <details className="cm-sources">
        <summary>
          Sources ({matchup.sources.length} first-party
          {matchup.sources.length === 1 ? ' page' : ' pages'}
          {matchup.latestCapture ? `, latest capture ${dateLabel(matchup.latestCapture)}` : ''})
        </summary>
        <ul>
          {matchup.sources.map(source => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="nofollow noopener">
                {source.firmName} — {source.productName}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
              <span>captured {dateLabel(source.capturedAt)}</span>
            </li>
          ))}
        </ul>
        <p>
          Every figure above is read from these pages. Products older than 30
          days are removed from the comparison until they are recaptured, so a
          missing product means stale data, not a discontinued plan.
        </p>
      </details>
    </section>
  )
}
