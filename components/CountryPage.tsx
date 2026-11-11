import Link from 'next/link'
import { ArrowRight, Globe2 } from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import Breadcrumbs from '@/components/Breadcrumbs'
import FirmLogo from '@/components/FirmLogo'
import LandingFirmList from '@/components/LandingFirmList'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import { RuAccessBadge, RuGoLink } from '@/components/RuGoLink'
import { displayField } from '@/components/BestForPage'
import { BEST_FOR_FIELD_SPECS, type BestForFieldKey } from '@/lib/bestFor'
import {
  COUNTRY_EVIDENCE_MAX_AGE_DAYS,
  COUNTRY_MIN_DIFF_FIELDS,
  joinNatural,
  type CountryEvidenceGroup,
  type CountryPageModel,
} from '@/lib/countryPages'
import type { LandingFirm } from '@/lib/landings'
import { goLinkRel } from '@/lib/russiaAvailability'
import { itemListSchema, jsonLd } from '@/lib/schema'
import { renderVerdictMarkdown } from '@/lib/verdicts'
import { ruRedactExchanges } from '@/lib/ruRulesText'
import { localeDate } from '@/lib/ruDate'

/** RU null cell: never the «подтвержд…» stem used by the shared best-for helper. */
function fieldCell(key: BestForFieldKey, value: string | null | undefined, lang: 'en' | 'ru'): string {
  if (value == null || value === '') return lang === 'ru' ? 'Нет данных' : 'Unverified'
  return displayField(key, value, lang)
}

const COPY = {
  en: {
    kicker: 'Country policy check',
    intro: (name: string, count: number) =>
      `This list only includes firms whose own first-party policy, captured within the last ${COUNTRY_EVIDENCE_MAX_AGE_DAYS} days, does not exclude ${name}, and whose mapped products have current data. ${count === 1 ? '1 firm qualifies' : `${count} firms qualify`} right now. Editorial score sets the order; affiliate status adds 0 points.`,
    disclaimer: 'Policy-supported access is not a completed checkout, KYC approval, payout test, or legal opinion. Recheck residency, identity documents, payment method, platform and payout route on the firm’s own site before paying.',
    listTitle: 'Firms with a current country policy',
    empty: 'No firm currently has a first-party country policy captured inside the freshness window with current product data.',
    tableTitle: 'Rule comparison',
    tableNote: (count: number) => `${count} of these fields differ between the listed firms.`,
    field: 'Field',
    verdictTitle: 'Our take',
    by: 'By', checked: 'checked',
    methodTitle: 'Methodology',
    method: `A firm appears only when (1) its own policy page, captured within ${COUNTRY_EVIDENCE_MAX_AGE_DAYS} days, supports access from this country, and (2) every product we map to that policy has a current structured record. A partial product mapping removes the firm. A missing restriction list, local address, domain, or payment rail does not qualify by itself. Order: editorial score, then name.`,
    excluded: (n: number) => `${n} further evidence ${n === 1 ? 'record is' : 'records are'} outside the freshness window or ${n === 1 ? 'lacks' : 'lack'} current product data, so ${n === 1 ? 'it is' : 'they are'} not listed.`,
    reviewed: 'Sources checked',
    firms: (n: number) => (n === 1 ? 'firm' : 'firms'),
    back: 'Browse all prop firms',
  },
  ru: {
    kicker: 'Проверка политики по стране',
    intro: (name: string, count: number) =>
      `В список попадают только фирмы, чья собственная политика (первоисточник не старше ${COUNTRY_EVIDENCE_MAX_AGE_DAYS} дней) не исключает трейдеров ${name}, а данные по продуктам актуальны. Сейчас таких фирм: ${count}. Порядок — по данным; партнёрство не даёт баллов.`,
    disclaimer: 'Доступ по политике фирмы — это не завершённая оплата, не прохождение KYC, не тест выплаты и не юридическое заключение. Перед оплатой проверьте резидентство, документы, способ оплаты, платформу и способ выплаты на сайте фирмы.',
    listTitle: 'Фирмы с актуальной политикой по стране',
    empty: 'Сейчас нет фирм с первоисточником по стране в окне актуальности и актуальными данными по продуктам.',
    tableTitle: 'Сравнение правил',
    tableNote: (count: number) => `Различающихся полей между фирмами: ${count}.`,
    field: 'Поле',
    verdictTitle: 'Наш вывод',
    by: 'Автор', checked: 'проверено',
    methodTitle: 'Методика',
    method: `Фирма попадает в список, только если (1) её собственная страница с политикой по странам прочитана не позже чем ${COUNTRY_EVIDENCE_MAX_AGE_DAYS} дней назад и не исключает эту страну, и (2) по каждому привязанному продукту есть актуальная запись. Если актуальна только часть продуктов, фирма не показывается. Сначала идут фирмы, у которых России нет в списке ограничений на дату проверки, затем остальные; внутри групп — редакционная оценка.`,
    excluded: (n: number) => `Ещё записей вне окна актуальности или без актуальных данных по продуктам: ${n}. Они не показаны.`,
    reviewed: 'Источники прочитаны',
    firms: () => 'фирм',
    back: 'Ко всем проп-фирмам',
  },
} as const

const ASSET_LABEL: Record<string, { en: string; ru: string }> = {
  cfd: { en: 'CFD', ru: 'CFD' },
  futures: { en: 'Futures', ru: 'Фьючерсы' },
  crypto: { en: 'Crypto', ru: 'Крипто' },
}

/** "Futures · Match-Trader only" — the row's own scope; empty when the row sets neither. */
function groupScope(group: CountryEvidenceGroup, lang: 'en' | 'ru'): string {
  const parts: string[] = []
  const asset = group.evidence.assetClass?.trim()
  if (asset) parts.push(ASSET_LABEL[asset]?.[lang] ?? asset)
  const platform = group.evidence.platformConstraint?.trim()
  if (platform) parts.push(lang === 'ru' ? `Платформа: ${platform}` : `Platform: ${platform}`)
  return parts.join(' · ')
}

function groupProducts(group: CountryEvidenceGroup, lang: 'en' | 'ru'): string {
  return joinNatural(group.products.map(product => product.productName), lang)
}

export default function CountryPage({ model }: { model: CountryPageModel }) {
  const { country, lang, ranked, indexable, reasons, verdict, differingFieldCount, fields, firmCount } = model
  const t = COPY[lang]
  const placeName = lang === 'ru' ? `страны «${country.names.ru ?? country.displayName}»` : country.displayName
  const crumbs = lang === 'ru'
    ? [{ name: 'Русская версия', url: '/ru' }, { name: country.names.ru ?? country.displayName }]
    : [{ name: 'Home', url: '/' }, { name: 'Prop Firms', url: '/prop-firms' }, { name: country.displayName }]
  const itemLd = itemListSchema(ranked.map(row => row.firm), model.h1)
  const fromParam = `country-${country.slug}`

  const enCards: LandingFirm[] = ranked.map(row => ({
    firm: row.firm,
    sortKey: row.firm.score,
    highlight: row.highlight,
    trailingMetricLabel: `${country.displayName} access`,
    trailingMetricValue: 'Policy',
    // One line per evidence row: its own products, scope (asset class / platform) and policy text.
    note: row.groups.map(group => {
      const scope = groupScope(group, 'en')
      return `${scope ? `${scope}: ` : ''}${groupProducts(group, 'en')}. ${group.evidence.evidenceSummary} ${group.evidence.decisionNote}`
    }).join(' '),
    evidenceLinks: row.groups.map(group => {
      const scope = groupScope(group, 'en')
      return {
        label: `${group.evidence.evidenceLabel}${scope ? ` (${scope})` : ''}`,
        url: group.evidence.sourceUrl,
        capturedAt: group.evidence.sourceCapturedAt,
      }
    }),
    lastmodProductSlugs: row.products.map(product => product.productSlug),
  }))

  return (
    <div
      className={lang === 'ru' ? 'ru-section' : undefined}
      style={lang === 'en' ? { maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' } : undefined}
      data-country-page={country.slug}
      data-country-code={country.countryCode ?? undefined}
      data-country-lang={lang}
      data-country-indexable={indexable ? 'true' : 'false'}
      data-country-diff-fields={differingFieldCount}
    >
      <div className={lang === 'ru' ? 'ru-shell ru-content' : undefined}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
        <Breadcrumbs items={crumbs} locale={lang} />

        <header style={{ marginTop: '1.5rem' }}>
          <span className="section-kicker">
            <Globe2 size={13} aria-hidden="true" /> {t.kicker}
          </span>
          <h1 style={{ marginTop: '0.75rem', fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', lineHeight: 1.15 }}>{model.h1}</h1>
          <p style={{ marginTop: '1rem', color: 'var(--muted)', maxWidth: 720 }}>{t.intro(placeName, firmCount)}</p>
          <p className="rules-meta" style={{ marginTop: '0.75rem' }}>
            {model.latestSourceDate ? <>{t.reviewed} {localeDate(model.latestSourceDate, lang)}{' · '}</> : null}
            {firmCount} {t.firms(firmCount)}
          </p>
        </header>

        {/* Gate reasons stay machine-readable only — never show internals to visitors. */}
        {!indexable ? (
          <span hidden aria-hidden="true" data-country-gate="noindex" data-country-gate-reasons={reasons.join(' | ')} />
        ) : null}

        <div
          className="post-sidebar-card"
          data-country-disclaimer="policy-not-checkout"
          style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--gold)', padding: '1.15rem 1.3rem', lineHeight: 1.65 }}
        >
          {t.disclaimer}
        </div>

        {lang === 'ru' && (
          <div style={{ marginTop: '1.5rem' }}>
            <RuTelegramBlock placement={fromParam} />
          </div>
        )}

        <AffiliateDisclosure lang={lang} />

        <section aria-labelledby="country-list-title" style={{ marginTop: '2rem' }}>
          <h2 id="country-list-title">{t.listTitle}</h2>
          {!ranked.length ? (
            <p style={{ color: 'var(--muted)' }}>{t.empty}</p>
          ) : lang === 'en' ? (
            <LandingFirmList ranked={enCards} fromParam={fromParam} />
          ) : (
            <ol className="feature-firm-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ranked.map((row, index) => (
                <li
                  key={row.slug}
                  className="feature-firm-card card"
                  data-firm={row.slug}
                  data-russia-status={row.russiaStatus}
                  data-ru-signup-cta={row.showRuSignupCta ? 'true' : 'false'}
                  style={{ padding: '1.25rem 1.5rem' }}
                >
                  <div className="feature-firm-card-grid">
                    <span className="feature-firm-rank" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div className="feature-firm-logo-tile"><FirmLogo name={row.firm.name} src={row.firm.logo} /></div>
                    <div className="feature-firm-meta">
                      <strong style={{ fontSize: '1.05rem' }}>{row.firm.name}</strong>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>{row.highlight}</p>
                      <ul style={{ listStyle: 'none', margin: '0.35rem 0 0', padding: 0, display: 'grid', gap: '0.3rem' }}>
                        {row.groups.map(group => {
                          const scope = groupScope(group, 'ru')
                          return (
                            <li
                              key={`${group.evidence.sourceUrl}:${group.products.map(product => product.productSlug).join(',')}`}
                              data-country-group={group.evidence.assetClass ?? 'all'}
                              data-country-platform-constraint={group.evidence.platformConstraint ? 'true' : undefined}
                              style={{ fontSize: '0.85rem' }}
                            >
                              {scope ? <strong>{scope}: </strong> : null}
                              {groupProducts(group, 'ru')}{' · '}
                              <a href={group.evidence.sourceUrl} target="_blank" rel="nofollow noopener" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                                Первоисточник по стране, {localeDate(group.evidence.sourceCapturedAt, 'ru')}
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    <div className="feature-firm-actions">
                      {row.showRuSignupCta ? (
                        <RuGoLink
                          firm={row.slug}
                          href={`/go/${row.slug}?from=ru-${fromParam}`}
                          rel={goLinkRel(row.slug)}
                          className="btn-primary feature-firm-cta"
                        >
                          Проверить {row.firm.name} <ArrowRight size={13} aria-hidden="true" />
                        </RuGoLink>
                      ) : (
                        <RuAccessBadge firm={row.slug} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {model.excludedCount > 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.75rem' }} data-country-excluded={model.excludedCount}>
              {t.excluded(model.excludedCount)}
            </p>
          ) : null}
        </section>

        {ranked.length > 0 && (
          <section aria-labelledby="country-table-title" style={{ marginTop: '2.5rem' }}>
            <h2 id="country-table-title">{t.tableTitle}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>{t.tableNote(differingFieldCount)}</p>
            <div className="rules-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="rules-table" data-country-table={country.slug}>
                <thead>
                  <tr>
                    <th scope="col">{t.field}</th>
                    {ranked.map(row => <th key={row.slug} scope="col">{row.firm.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(key => (
                    <tr key={key} data-field={key} data-differs={model.differingFields.includes(key) ? 'true' : 'false'}>
                      <th scope="row">{BEST_FOR_FIELD_SPECS[key].label[lang]}</th>
                      {ranked.map(row => <td key={row.slug}>{fieldCell(key, row.fieldValues[key], lang)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {verdict && (
          <section aria-labelledby="country-verdict-title" className="rules-verdict" data-country-verdict={verdict.file} style={{ marginTop: '2.5rem' }}>
            <h2 id="country-verdict-title">{t.verdictTitle}</h2>
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: renderVerdictMarkdown(lang === 'ru' ? ruRedactExchanges(verdict.body) : verdict.body) }}
            />
            <p className="rules-meta">{t.by} {verdict.author} · {t.checked} {localeDate(verdict.checkedAt, lang)}</p>
          </section>
        )}

        <section aria-labelledby="country-method-title" style={{ marginTop: '2.5rem' }}>
          <h2 id="country-method-title">{t.methodTitle}</h2>
          {model.methodology ? (
            <p style={{ color: 'var(--muted)', maxWidth: 720 }} data-country-methodology="evidence-file">{model.methodology}</p>
          ) : null}
          <p style={{ color: 'var(--muted)', maxWidth: 720 }}>{t.method}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 720 }}>
            {lang === 'ru'
              ? `Для индексации страницы нужны вывод редакции и не меньше ${COUNTRY_MIN_DIFF_FIELDS} различающихся полей.`
              : `The page is indexed only with an editorial verdict and at least ${COUNTRY_MIN_DIFF_FIELDS} differing fields.`}
          </p>
        </section>

        <p style={{ marginTop: '2rem' }}>
          <Link href={lang === 'ru' ? '/ru/luchshie-prop-firmy' : '/prop-firms'} className="feature-firm-secondary">
            {t.back} <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  )
}
