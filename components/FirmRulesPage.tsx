import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import Breadcrumbs from '@/components/Breadcrumbs'
import FirmRelatedLinks from '@/components/FirmRelatedLinks'
import { jsonLd } from '@/lib/schema'
import { renderVerdictMarkdown } from '@/lib/verdicts'
import { isHiddenExchange, ruRedactExchanges } from '@/lib/ruRulesText'
import {
  RULE_LABELS,
  describeIssues,
  formatRuleValue,
  headlineValue,
  type FieldIssue,
  type RuleRow,
  type RulesLang,
  type RulesPageModel,
} from '@/lib/rulesPages'
import { RUSSIAN_ROUTE_EDITORIAL_DATES } from '@/lib/localizedRoutes'
import { RU_REVIEW_FIRMS, isRuRegisteredPath } from '@/lib/ruRelatedLinks'
import { ruDatesInText } from '@/lib/ruDate'

const SITE = 'https://tradersfundhub.com'

export function formatRulesDate(iso: string | null, lang: RulesLang): string {
  if (!iso) return lang === 'ru' ? 'нет даты' : 'no date'
  const [y, m, d] = iso.split('-')
  if (lang === 'ru') return `${d}.${m}.${y}`
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

const RU_ISSUE: Record<FieldIssue, string> = {
  missing: 'нет в наших данных',
  unconfirmed: 'подтверждено не для всех продуктов',
  contradiction: 'официальные источники противоречат друг другу',
  unsourced: 'нет дословной цитаты с сайта фирмы',
  stale: 'проверка старше 30 дней',
  'review-hold': 'данные на перепроверке после ревью',
}

function issueText(issues: FieldIssue[], lang: RulesLang): string {
  return lang === 'ru' ? issues.map(issue => RU_ISSUE[issue]).join('; ') : describeIssues(issues)
}

const T = {
  en: {
    kicker: 'Rules, checked against the firm’s own pages',
    lead: (firm: string, products: number) => `What ${firm} publishes on drawdown, loss limits, consistency, news trading, EAs, weekend holding and payouts across ${products} ${products === 1 ? 'product' : 'products'}. Every value below is read from ${firm}’s own website; rows we could not confirm say so.`,
    checked: 'Checked',
    sourcesCount: (n: number) => `${n} first-party ${n === 1 ? 'source' : 'sources'}`,
    incompleteTitle: 'Not every rule is confirmed yet',
    incompleteBody: 'These rows are incomplete in our data, so treat them as unverified and check the firm’s site before you buy:',
    tableTitle: 'Rules at a glance',
    colRule: 'Rule',
    colSource: 'Source',
    wording: 'Firm’s wording',
    productTitle: 'Rules by product',
    productCols: ['Product', 'Phases', 'Profit target', 'Min. trading days', 'Daily loss', 'Max loss', 'Drawdown', 'Profit split', 'Checked'],
    instant: 'instant',
    noMin: 'none',
    unverified: 'not confirmed',
    verdictTitle: 'Our take',
    by: 'By',
    sourcesTitle: 'Sources',
    sourcesNote: 'Pages we read for this rules sheet, with the most recent date each was checked.',
    review: (firm: string) => `Read the full ${firm} review`,
    stale: 'Data older than 30 days',
    productCapture: 'product page capture',
  },
  ru: {
    kicker: 'Правила по официальным страницам фирмы',
    lead: (firm: string, products: number) => `Что ${firm} публикует о просадке, лимитах убытка, консистентности, торговле на новостях, советниках, переносе через выходные и выплатах — по ${products} ${products === 1 ? 'продукту' : 'продуктам'}. Каждое значение взято с сайта ${firm}; где подтверждения нет, так и написано.`,
    checked: 'Проверено',
    sourcesCount: (n: number) => `источников с сайта фирмы: ${n}`,
    incompleteTitle: 'Подтверждены не все правила',
    incompleteBody: 'Эти пункты в наших данных неполные — считайте их непроверенными и сверьтесь с сайтом фирмы перед покупкой:',
    tableTitle: 'Правила кратко',
    colRule: 'Правило',
    colSource: 'Источник',
    wording: 'Формулировка фирмы (англ.)',
    productTitle: 'Правила по продуктам',
    productCols: ['Продукт', 'Этапы', 'Цель по прибыли', 'Мин. торговых дней', 'Дневной убыток', 'Макс. убыток', 'Просадка', 'Доля прибыли', 'Проверено'],
    instant: 'без оценки',
    noMin: 'нет',
    unverified: 'не подтверждено',
    verdictTitle: 'Наш вывод',
    by: 'Автор',
    sourcesTitle: 'Источники',
    sourcesNote: 'Страницы, по которым составлена таблица, и дата последней проверки каждой.',
    review: (firm: string) => `Полный обзор ${firm}`,
    stale: 'Данные старше 30 дней',
    productCapture: 'снимок страницы продукта',
  },
} as const

function RowValue({ row, lang }: { row: RuleRow; lang: RulesLang }) {
  const headline = headlineValue(row, lang)
  const varies = row.byProduct && row.byProduct.length > 1 && new Set(row.byProduct.map(item => JSON.stringify(item.value))).size > 1
  return (
    <>
      <strong>{headline}</strong>
      {varies && row.byProduct && (
        <ul className="rules-by-product">
          {row.byProduct.map(item => (
            <li key={item.productSlug}>
              {item.productName}: {formatRuleValue(item.value, row.key, lang)}
            </li>
          ))}
        </ul>
      )}
      {row.summary && headline !== row.summary && !row.summary.startsWith('Product-specific') && !(lang === 'ru' && isHiddenExchange(row.summary)) && (
        <p className="rules-summary">{lang === 'ru' ? <>Дословно в данных: <span lang="en">{ruRedactExchanges(row.summary)}</span></> : row.summary}</p>
      )}
      {row.note && <p className="rules-note"><span lang="en">{lang === 'ru' ? ruDatesInText(ruRedactExchanges(row.note)) : row.note}</span></p>}
      {row.issues.length > 0 && (
        <p className="rules-issue" data-rules-issue={row.issues.join(' ')}>
          {lang === 'ru' ? 'Не подтверждено: ' : 'Not fully confirmed: '}{issueText(row.issues, lang)}
        </p>
      )}
    </>
  )
}

function RowSource({ row, lang }: { row: RuleRow; lang: RulesLang }) {
  const t = T[lang]
  const urls = [...new Map(row.evidence.filter(item => /^https:\/\//.test(item.sourceUrl)).map(item => [item.sourceUrl, item])).values()]
  if (urls.length === 0) return <span>—</span>
  const sourceTitle = (url: string) => `${new URL(url).hostname.replace(/^www\./, '')}${new URL(url).pathname.length > 1 ? new URL(url).pathname.replace(/\/$/, '') : ''}`
  if (lang === 'ru') {
    // RU twins never show raw EN quotes (Code Reviewer 26.10.2026): source, link and capture date only.
    // The data has no Russian paraphrase of the quotes, so none is shown.
    const latestBy = new Map<string, string>()
    for (const item of row.evidence) if (/^https:\/\//.test(item.sourceUrl) && (latestBy.get(item.sourceUrl) ?? '') < item.capturedAt) latestBy.set(item.sourceUrl, item.capturedAt)
    return (
      <ul className="rules-source-list" data-rules-ru-sources>
        {urls.slice(0, 3).map(item => (
          <li key={item.sourceUrl}>
            Источник: <a href={item.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{ruRedactExchanges(sourceTitle(item.sourceUrl))}</a>, проверено {formatRulesDate(latestBy.get(item.sourceUrl) ?? null, 'ru')}{row.key === 'ea' ? ` · ${t.productCapture}` : ''}
          </li>
        ))}
        {urls.length > 3 && <li>+{urls.length - 3}</li>}
      </ul>
    )
  }
  const quotes = row.evidence.filter(item => item.quoteKind === 'verbatim' && item.quote)
  const latest = row.evidence.map(item => item.capturedAt).sort().at(-1) ?? null
  return (
    <>
      <ul className="rules-source-list">
        {urls.slice(0, 3).map(item => (
          <li key={item.sourceUrl}>
            <a href={item.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{new URL(item.sourceUrl).hostname.replace(/^www\./, '')}{new URL(item.sourceUrl).pathname.length > 1 ? new URL(item.sourceUrl).pathname.replace(/\/$/, '') : ''}</a>
          </li>
        ))}
        {urls.length > 3 && <li>+{urls.length - 3}</li>}
      </ul>
      <span className="rules-checked">{t.checked} {formatRulesDate(latest, lang)}{row.key === 'ea' ? ` · ${t.productCapture}` : ''}</span>
      {quotes.length > 0 && (
        <details className="rules-quote">
          <summary>{t.wording}</summary>
          {quotes.slice(0, 3).map((item, index) => (
            <blockquote key={`${item.sourceUrl}-${index}`} lang="en">“{item.quote}”</blockquote>
          ))}
        </details>
      )}
    </>
  )
}

function targetText(targets: RulesPageModel['products'][number]['profitTargets']): string {
  if (!targets) return '—'
  const parts = [targets.phase1, targets.phase2, targets.phase3].filter((value): value is number => typeof value === 'number')
  return parts.length ? parts.map(value => `${value}%`).join(' / ') : '—'
}

export default function FirmRulesPage({ model, lang }: { model: RulesPageModel; lang: RulesLang }) {
  const t = T[lang]
  const firm = model.firm.name
  const path = lang === 'ru' && model.ru ? model.ru.path : model.en.path
  const indexable = lang === 'ru' ? Boolean(model.ru?.indexable) : model.en.indexable
  const verdict = lang === 'ru' ? model.ruVerdict : model.enVerdict
  const ruReview = RU_REVIEW_FIRMS.find(item => item.firm === model.slug && isRuRegisteredPath(item.path))
  const reviewHref = lang === 'ru' ? ruReview?.path ?? null : model.firm.reviewUrl
  const title = lang === 'ru'
    ? `Правила ${firm}: просадка, консистентность, новости, советники и выплаты`
    : `${firm} rules: drawdown, consistency, news trading, EAs and payouts`
  const required = model.rows.filter(row => row.required)
  const extra = model.rows.filter(row => !row.required && row.summary !== null)
  const showPctLoss = model.rules.lossLimitUnit !== 'usd'
  const productCols = showPctLoss ? t.productCols : t.productCols.filter((_, index) => index !== 4 && index !== 5)
  const dateModified = model.newestCapture ?? model.rules.capturedAt

  const crumbs = lang === 'ru'
    ? [
      { name: 'Русская версия', url: '/ru' },
      ...(ruReview ? [{ name: `Обзор ${firm}`, url: ruReview.path }] : []),
      { name: `Правила ${firm}` },
    ]
    : [
      { name: 'Home', url: '/' },
      { name: 'Prop Firms', url: '/prop-firms' },
      ...(model.firm.reviewUrl ? [{ name: `${firm} review`, url: model.firm.reviewUrl }] : []),
      { name: `${firm} rules` },
    ]

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    url: `${SITE}${path}`,
    inLanguage: lang,
    about: { '@type': 'Organization', name: firm, url: model.firm.officialUrl || undefined },
    author: verdict
      ? { '@type': 'Person', name: verdict.author }
      : { '@type': 'Organization', name: 'Traders Fund Hub', url: SITE },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: SITE },
    dateModified,
    citation: model.sources.map(source => source.url),
  }

  const ruVsLinks = lang === 'ru'
    ? Object.keys(RUSSIAN_ROUTE_EDITORIAL_DATES)
      .filter(href => href.includes('-vs-') && href.replace('/ru/', '').split('-vs-').includes(model.slug))
    : []

  return (
    <div className={lang === 'ru' ? 'ru-section' : undefined} style={lang === 'en' ? { maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' } : undefined}>
      <div className={lang === 'ru' ? 'ru-shell ru-content' : undefined}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
        <Breadcrumbs items={crumbs} locale={lang} />

        <header className="rules-hero" data-rules-page={model.slug} data-rules-lang={lang} data-rules-indexable={indexable ? 'true' : 'false'}>
          <span className="section-kicker"><ClipboardCheck size={13} aria-hidden="true" /> {t.kicker}</span>
          <h1 className="rules-title">{title}</h1>
          <p className="rules-lead">{t.lead(firm, model.products.length)}</p>
          <p className="rules-meta" data-rules-checked={`${model.oldestCapture}..${model.newestCapture}`}>
            {t.checked} {formatRulesDate(model.oldestCapture, lang)}
            {model.newestCapture && model.newestCapture !== model.oldestCapture ? ` – ${formatRulesDate(model.newestCapture, lang)}` : ''}
            {' · '}{t.sourcesCount(model.sources.length)}
            {reviewHref ? <>{' · '}<Link href={reviewHref}>{t.review(firm)}</Link></> : null}
          </p>
        </header>

        {model.gaps.length > 0 && (
          <div className="rules-incomplete" role="note" data-rules-gaps={model.gaps.map(gap => gap.key).join(' ')}>
            <strong>{t.incompleteTitle}.</strong> {t.incompleteBody}
            <ul>
              {model.gaps.map(gap => (
                <li key={gap.key}>{RULE_LABELS[gap.key][lang]} — {issueText(gap.issues, lang)}</li>
              ))}
            </ul>
          </div>
        )}

        <section aria-labelledby="rules-table-title" style={{ marginTop: '2rem' }}>
          <h2 id="rules-table-title">{t.tableTitle}</h2>
          <div className="rules-table-wrap">
            <table className="rules-table" data-rules-table={model.slug}>
              <thead>
                <tr><th scope="col">{t.colRule}</th><th scope="col">{firm}</th><th scope="col">{t.colSource}</th></tr>
              </thead>
              <tbody>
                {[...required, ...extra].map(row => (
                  <tr key={row.key} data-rule={row.key} data-rule-field={row.dataField} data-rule-status={row.issues.length ? 'incomplete' : 'ok'}>
                    <th scope="row">{RULE_LABELS[row.key][lang]}</th>
                    <td><RowValue row={row} lang={lang} /></td>
                    <td><RowSource row={row} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {model.products.length > 0 && (
          <section aria-labelledby="rules-products-title" style={{ marginTop: '2rem' }}>
            <h2 id="rules-products-title">{t.productTitle}</h2>
            <div className="rules-table-wrap">
              <table className="rules-table rules-table--products" data-rules-products={model.slug}>
                <thead>
                  <tr>{productCols.map(col => <th key={col} scope="col">{col}</th>)}</tr>
                </thead>
                <tbody>
                  {model.products.map(product => (
                    <tr key={product.productSlug} data-product={product.productSlug}>
                      <th scope="row">{product.productName}</th>
                      <td>{product.phases === 0 ? t.instant : product.phases}</td>
                      <td>{targetText(product.profitTargets)}</td>
                      <td>{product.minTradingDays === null ? t.unverified : product.minTradingDays === 0 ? t.noMin : product.minTradingDays}</td>
                      {showPctLoss && <td>{product.dailyLossPct === null ? '—' : `${product.dailyLossPct}%`}</td>}
                      {showPctLoss && <td>{product.maxLossPct === null ? '—' : `${product.maxLossPct}%`}</td>}
                      <td>{product.drawdownType ? formatRuleValue({ kind: 'text', value: product.drawdownType }, 'drawdownType', lang) : '—'}</td>
                      <td>
                        {product.profitSplitTiers.length > 0
                          ? product.profitSplitTiers.map(tier => `${tier.traderPct}% (${tier.appliesTo})`).join(' · ')
                          : product.profitSplitPct === null ? t.unverified : `${product.profitSplitPct}%`}
                      </td>
                      <td>
                        <a href={product.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{formatRulesDate(product.sourceCapturedAt, lang)}</a>
                        {!product.fresh && <span className="rules-issue"> {t.stale}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {verdict && (
          <section aria-labelledby="rules-verdict-title" className="rules-verdict" data-rules-verdict={verdict.file} style={{ marginTop: '2rem' }}>
            <h2 id="rules-verdict-title">{t.verdictTitle}</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderVerdictMarkdown(lang === 'ru' ? ruRedactExchanges(verdict.body) : verdict.body) }} />
            <p className="rules-meta">{t.by} {verdict.author} · {t.checked} {formatRulesDate(verdict.checkedAt, lang)}</p>
          </section>
        )}

        <section aria-labelledby="rules-sources-title" style={{ marginTop: '2rem' }} data-rules-sources={model.sources.length}>
          <h2 id="rules-sources-title">{t.sourcesTitle}</h2>
          <p className="rules-meta">{t.sourcesNote}</p>
          <ol className="rules-sources">
            {model.sources.map(source => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="nofollow noopener noreferrer">{source.url.replace(/^https:\/\/(www\.)?/, '')}</a>
                {' — '}{t.checked.toLowerCase()} {formatRulesDate(source.capturedAt, lang)}
              </li>
            ))}
            {verdict?.sources
              .filter(source => !model.sources.some(item => item.url === source.url))
              .map(source => (
                <li key={source.url}>
                  {source.url.startsWith('/')
                    ? <Link href={source.url}>{source.title}</Link>
                    : <a href={source.url} target="_blank" rel="nofollow noopener noreferrer">{source.title}</a>}
                </li>
              ))}
          </ol>
        </section>

        {lang === 'en' ? (
          <FirmRelatedLinks firmName={firm} excludeHref={model.en.path} />
        ) : (
          (ruReview || ruVsLinks.length > 0) && (
            <section aria-labelledby="rules-ru-related" style={{ marginTop: '2rem' }} data-rules-ru-related={model.slug}>
              <h2 id="rules-ru-related">{`Ещё о ${firm}`}</h2>
              <ul>
                {ruReview && <li><Link href={ruReview.path}>{`Обзор ${firm}`}</Link> — доступ из России, оплата и выплаты</li>}
                {ruVsLinks.map(href => (
                  <li key={href}>
                    <Link href={href}>{href.replace('/ru/', '').split('-vs-').map(slug => RU_REVIEW_FIRMS.find(item => item.firm === slug)?.name ?? slug).join(' или ')}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
      </div>
    </div>
  )
}
