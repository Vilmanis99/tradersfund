import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { firmSlug } from '@/lib/firmSlug'
import { getAllFirms, getChallengesByFirm, isChallengeFresh, type Challenge, type Firm } from '@/lib/firms'
import { getRuCompareVerdict, getRuReviewVerdict } from '@/lib/ruVerdicts'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { compareRussianRanking } from '@/lib/russianRanking'

/** RU Phase 2: Phase 1 verdict layout with RU labels and ru-RU formatting. */

const DRAWDOWN_RU: Record<string, string> = { static: 'статичный', trailing: 'трейлинг', 'eod-trailing': 'EOD-трейлинг', 'balance-based': 'по балансу' }

export function ruDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : iso
}
const num = (value: number, digits = 2) => value.toLocaleString('ru-RU', { maximumFractionDigits: digits })
const money = (value: number, currency: 'USD' | 'EUR') => new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value)
function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10
  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many
}

/** First payout in RU: business days only where the notes say so; 0 = no minimum wait. */
export function ruPayoutWait(product: Pick<Challenge, 'payoutFirstDays' | 'notes'>) {
  const days = product.payoutFirstDays
  if (days == null) return null
  if (days === 0) return 'без минимального ожидания'
  const business = (product.notes ?? []).some(note => new RegExp(`\\b${days}[- ]business[- ]days?\\b`, 'i').test(note))
  return business ? `через ${days} ${plural(days, 'рабочий день', 'рабочих дня', 'рабочих дней')}` : `с ${days}-го дня`
}

function shortName(firm: { name: string }, product: Challenge) {
  const escaped = firm.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return product.productName.replace(new RegExp(`^${escaped}\\s*(?:Challenge:?\\s*)?`, 'i'), '').trim() || product.productName
}
/** 100K cost to funded: list price plus any mandatory activation or pay-later fee (as on EN). */
function price100k(product: Challenge) {
  const size = product.accountSizes.find(tier => tier.sizeUsd === 100000)
  if (size?.priceUsd != null) {
    const activation = size.activationFeeUsd ?? product.activationFeeUsd ?? 0
    const later = size.payLaterUsd ?? 0
    return { value: size.priceUsd + activation + later, currency: 'USD' as const, base: size.priceUsd, activation, later }
  }
  if (size?.priceEur != null) return { value: size.priceEur, currency: 'EUR' as const, base: size.priceEur, activation: 0, later: 0 }
  return null
}
function priceText(p: NonNullable<ReturnType<typeof price100k>>) {
  const parts = [p.activation ? `${money(p.activation, p.currency)} активация` : null, p.later ? `${money(p.later, p.currency)} после прохождения` : null].filter(Boolean)
  return parts.length ? `${money(p.value, p.currency)} (${money(p.base, p.currency)} + ${parts.join(' + ')})` : money(p.value, p.currency)
}

function perProduct(firm: Firm, products: Challenge[], value: (product: Challenge) => string | null) {
  const rows = products.map(product => ({ name: shortName(firm, product), value: value(product) }))
  if (!rows.length || rows.some(row => row.value == null)) return null
  if (new Set(rows.map(row => row.value)).size === 1) return rows[0].value
  return rows.map(row => `${row.value} (${row.name})`).join(' · ')
}

export function freshProductsFor(slug: string) {
  return getChallengesByFirm(slug).filter(product => isChallengeFresh(product))
}

export function buildRuFacts(firm: Firm, products: Challenge[]) {
  const facts: Array<{ label: string; value: string }> = []
  const add = (label: string, value: string | null) => { if (value) facts.push({ label, value }) }
  if (products.length) {
    add('Цена счёта 100K', perProduct(firm, products, product => { const p = price100k(product); return p ? priceText(p) : null }))
    add('Цель прибыли', perProduct(firm, products, product => {
      const t = product.profitTargets; if (!t) return null
      const steps = [t.phase1, t.phase2, t.phase3].filter((v): v is number => v != null)
      return steps.length ? steps.map(v => `${num(v)}%`).join(' → ') : null
    }))
    add('Лимит в день / общий', perProduct(firm, products, product => product.dailyLossPct != null && product.maxLossPct != null
      ? `${num(product.dailyLossPct)}% / ${num(product.maxLossPct)}%${product.drawdownType ? `, ${DRAWDOWN_RU[product.drawdownType] ?? product.drawdownType}` : ''}` : null))
    add('Доля трейдера', perProduct(firm, products, product => product.profitSplitPct != null ? `${num(product.profitSplitPct)}%` : null))
    add('Первая выплата', perProduct(firm, products, ruPayoutWait))
  }
  add('Платформы', firm.platforms?.length ? firm.platforms.join(' · ') : null)
  return facts
}

function findFirm(name: string) {
  return getAllFirms().find(firm => firm.name === name) ?? null
}

/** Sign-up CTA: every firm in firms.json keeps one; sponsored only with an affiliateUrl. */
function RuCta({ firm, from, compact = false }: { firm: Firm; from: string; compact?: boolean }) {
  const slug = firmSlug(firm.name)
  const partner = Boolean(firm.affiliateUrl)
  return (
    <div className={compact ? 'ru-p1-cta ru-p1-cta--compact' : 'ru-p1-cta'}>
      <RuGoLink
        firm={slug}
        href={`/go/${slug}?from=${from}`}
        prefetch={false}
        rel={partner ? 'sponsored nofollow noopener' : 'nofollow noopener'}
        target="_blank"
        className="btn-primary"
        data-ru-verdict-cta={slug}
      >
        {partner ? `Перейти на сайт ${firm.name}` : `Официальный сайт ${firm.name}`} <ExternalLink size={13} aria-hidden="true" />
      </RuGoLink>
      <span className="ru-p1-cta__note">{partner ? 'Партнёрская ссылка · мы можем получить комиссию' : 'Официальный сайт · без партнёрского соглашения'}</span>
    </div>
  )
}

export function RuReviewVerdictBox({ route, campaign, sourcesHref, terms }: { route: string; campaign: string; sourcesHref?: string; terms?: ReactNode }) {
  const verdict = getRuReviewVerdict(route)
  if (!verdict) return terms ? <section className="ru-section ru-p1-verdict-section"><div className="ru-shell">{terms}</div></section> : null
  const firm = findFirm(verdict.firm)
  const products = firm ? freshProductsFor(firmSlug(firm.name)) : []
  const facts = firm && products.length ? buildRuFacts(firm, products) : []
  const checked = products.map(product => product.sourceCapturedAt).sort()[0] ?? verdict.dataAsOf
  return (
    <section className="ru-section ru-p1-verdict-section">
      <div className="ru-shell">
        <div className="ru-p1-verdict" data-ru-verdict={route} aria-labelledby="ru-verdict-title">
          <div className="ru-p1-verdict__head">
            <div>
              <p id="ru-verdict-title" className="ru-p1-verdict__name">{verdict.firm}</p>
              {/* One Russia badge per box: it sits on the CTA row (RuCta -> RuGoLink). Header badge only when there is no CTA. */}
              {!firm && <RuAccessBadgeView firm={verdict.firm} status={verdict.status} basisDate={verdict.basisDate} pendingNotListed={verdict.pendingNotListed} />}
            </div>
            {firm && <div className="ru-p1-verdict__score" aria-label={`Наша оценка: ${num(firm.score, 1)} из 10`}><strong>{firm.score.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><span>/10</span></div>}
          </div>
          <p className="ru-p1-verdict__line">{verdict.verdict}</p>
          {firm && <RuCta firm={firm} from={`ru-${campaign}-verdict-box`} compact />}
          <div className="ru-p1-verdict__fit">
            {verdict.best.length > 0 && <div><p className="ru-p1-verdict__h">Подойдёт, если…</p><ul>{verdict.best.map(line => <li key={line}>{line}</li>)}</ul></div>}
            {verdict.avoid.length > 0 && <div><p className="ru-p1-verdict__h">Не подойдёт, если…</p><ul>{verdict.avoid.map(line => <li key={line}>{line}</li>)}</ul></div>}
          </div>
          {facts.length > 0 && (
            <dl className="ru-p1-verdict__facts">
              {facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
          )}
          <p className="ru-p1-verdict__checked">
            {sourcesHref ? <a href={sourcesHref}>✓ Данные проверены {ruDate(checked)}</a> : <>✓ Данные проверены {ruDate(checked)}</>}
            {firm?.affiliateUrl ? ' · Партнёрская ссылка раскрыта: мы можем получить комиссию, это не меняет данные и вывод.' : ''}
          </p>
        </div>
        {terms}
      </div>
    </section>
  )
}

/** Hero facts strip collapsed under the verdict box («Проверенные условия»). */
export function RuCapturedTerms({ children }: { children: ReactNode }) {
  return (
    <details className="ru-p1-terms">
      <summary>Проверенные условия</summary>
      {children}
    </details>
  )
}

/** Existing review TOC as a sticky right rail (desktop) and a fold-out (mobile). */
export function RuArticleToc({ children }: { children: ReactNode }) {
  return (
    <>
      <details className="ru-p1-toc-mobile"><summary>Содержание</summary>{children}</details>
      <div className="ru-p1-rail-inner">{children}</div>
    </>
  )
}

function compareFacts(firm: Firm, products: Challenge[]) {
  const priced = products.map(product => ({ product, price: price100k(product) })).filter(row => row.price != null)
  const currency = priced.length && priced.every(row => row.price!.currency === priced[0].price!.currency) ? priced[0].price!.currency : null
  const cheapest = currency ? [...priced].sort((x, y) => x.price!.value - y.price!.value)[0] : null
  const splits = products.map(product => product.profitSplitPct).filter((v): v is number => v != null)
  const losses = products.map(product => product.maxLossPct).filter((v): v is number => v != null)
  const waits = products.filter(product => product.payoutFirstDays != null).sort((x, y) => x.payoutFirstDays! - y.payoutFirstDays!)
  const range = (values: number[]) => values.length ? (Math.min(...values) === Math.max(...values) ? `${num(values[0])}%` : `${num(Math.min(...values))}–${num(Math.max(...values))}%`) : null
  return {
    currency,
    rows: {
      'Мин. цена 100K': cheapest ? `${priceText(cheapest.price!)}, ${shortName(firm, cheapest.product)}` : null,
      'Базовая доля': range(splits),
      'Макс. убыток': range(losses),
      'Самая ранняя выплата': waits[0] ? `${ruPayoutWait(waits[0])} (${shortName(firm, waits[0])})` : null,
    } as Record<string, string | null>,
  }
}

export function RuComparePickVerdict({ route, campaign }: { route: string; campaign: string }) {
  const verdict = getRuCompareVerdict(route)
  if (!verdict) return null
  const sides = (['a', 'b'] as const).map(key => {
    const name = key === 'a' ? verdict.a : verdict.b
    const firm = findFirm(name)
    const products = firm ? freshProductsFor(firmSlug(firm.name)) : []
    return { key, name, firm, products, status: key === 'a' ? verdict.statusA : verdict.statusB, picks: verdict.picks[key] }
  })
  // Stale-data guard, as on EN: no pick block when either side lacks a fresh capture.
  if (sides.some(side => !side.firm || !side.products.length)) return null
  const facts = sides.map(side => compareFacts(side.firm!, side.products))
  const labels = Object.keys(facts[0].rows).filter(label => facts.some(f => f.rows[label]))
  const mixed = facts[0].currency && facts[1].currency && facts[0].currency !== facts[1].currency
  // CTA blocks follow the RU ranking (open-for-Russia pin, then status); the title and facts table keep slug order.
  const ranked = [...sides].sort((x, y) => compareRussianRanking(
    { slug: firmSlug(x.firm!.name), score: x.firm!.score, name: x.firm!.name },
    { slug: firmSlug(y.firm!.name), score: y.firm!.score, name: y.firm!.name },
    russiaStatusFor,
  ))
  return (
    <section className="ru-section ru-p1-pick-section">
      <div className="ru-shell">
        <div className="ru-p1-pick" data-ru-pick-verdict={route} aria-labelledby="ru-pick-title">
          <h2 id="ru-pick-title" className="ru-p1-pick__title">{verdict.a} или {verdict.b}: что выбрать</h2>
          <p className="ru-p1-pick__checked">По данным на {ruDate(verdict.dataAsOf)}</p>
          <p className="ru-p1-pick__line">{verdict.verdict}</p>
          <div className="ru-p1-pick__quick" data-ru-pick-quick>
            {ranked.map(side => <RuCta key={side.key} firm={side.firm!} from={`ru-pick-quick-${campaign}`} compact />)}
          </div>
          <div className="ru-p1-pick__cols">
            {ranked.map(side => (
              <div key={side.key} className="ru-p1-pick__col">
                <p className="ru-p1-pick__h">{side.picks.length ? `Выбирайте ${side.name}, если…` : side.name}</p>
                {/* One Russia badge per column: it follows the CTA below (RuCta -> RuGoLink). */}
                {side.picks.length > 0 && <ul>{side.picks.map(line => <li key={line}>{line}</li>)}</ul>}
                <RuCta firm={side.firm!} from={`ru-pick-${campaign}`} />
              </div>
            ))}
          </div>
          {verdict.note && <p className="ru-p1-pick__note" data-ru-pick-russia-note>{verdict.note}</p>}
          {labels.length > 0 && (
            <div className="ru-p1-pick__facts-wrap">
              <table className="ru-p1-pick__facts">
                <caption className="sr-only">Ключевые условия рядом</caption>
                <thead><tr><th scope="col"><span className="sr-only">Условие</span></th><th scope="col">{verdict.a}</th><th scope="col">{verdict.b}</th></tr></thead>
                <tbody>
                  {labels.map(label => <tr key={label}><th scope="row">{label}</th><td>{facts[0].rows[label] ?? '—'}</td><td>{facts[1].rows[label] ?? '—'}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          {mixed && <p className="ru-p1-pick__note">Цены указаны в разных валютах (EUR и USD) так, как их публикуют фирмы, и не ранжируются между собой.</p>}
          <p className="ru-p1-pick__note"><Link href="/ru/dlya-russkoyazychnykh-treyderov" prefetch={false}>Как проверить доступ из своей страны →</Link></p>
        </div>
      </div>
    </section>
  )
}
