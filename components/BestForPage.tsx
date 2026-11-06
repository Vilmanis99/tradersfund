import Link from 'next/link'
import { ArrowRight, ExternalLink, ListChecks } from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import Breadcrumbs from '@/components/Breadcrumbs'
import FirmLogo from '@/components/FirmLogo'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import { RuGoLink } from '@/components/RuGoLink'
import {
  BEST_FOR_FIELD_SPECS,
  BEST_FOR_MIN_DIFF_FIELDS,
  type BestForPageModel,
  type BestForFieldKey,
} from '@/lib/bestFor'
import { goLinkRel } from '@/lib/russiaAvailability'
import { itemListSchema, jsonLd } from '@/lib/schema'
import { renderVerdictMarkdown } from '@/lib/verdicts'
import { ruPlatformList, ruRedactExchanges } from '@/lib/ruRulesText'
import { localeDate } from '@/lib/ruDate'

const RULE_AVAILABILITY_LABEL: Record<string, { en: string; ru: string }> = {
  allowed: { en: 'Allowed', ru: 'Разрешено' },
  blocked: { en: 'Blocked', ru: 'Запрещено' },
  // Challenge/firm RuleAvailability "restricted" — never print the raw token.
  restricted: { en: 'Limited', ru: 'С ограничениями' },
}

function humanizeFieldToken(token: string, lang: 'en' | 'ru'): string {
  const key = token.trim().toLowerCase()
  if (RULE_AVAILABILITY_LABEL[key]) return RULE_AVAILABILITY_LABEL[key][lang]
  return token.replace(/-/g, ' ')
}

function displayField(key: BestForFieldKey, value: string | null | undefined, lang: 'en' | 'ru'): string {
  if (value == null || value === '') return lang === 'ru' ? 'Не подтверждено' : 'Unverified'
  if (key === 'platforms' && lang === 'ru') return ruPlatformList(value.split('|'))
  if (key === 'profitSplitPct' || key === 'maxLossPct' || key === 'dailyLossPct') return `${value}%`
  if (key === 'entryPriceUsd' || key === 'smallestAccountUsd' || key === 'maxLossUsd' || key === 'dailyLossUsd') {
    return `$${Number(value).toLocaleString('en-US')}`
  }
  if (key === 'minHoldSeconds' && value === 'not-stated') {
    return lang === 'ru' ? 'Не заявлено' : 'Not stated'
  }
  if (key === 'maxTradingDays' && value === 'unlimited') {
    return lang === 'ru' ? 'Без лимита' : 'Unlimited'
  }
  if (value.startsWith('mixed:')) {
    return value.slice(6).split(',').map(token => humanizeFieldToken(token, lang)).join(' / ')
  }
  if (RULE_AVAILABILITY_LABEL[value]) return RULE_AVAILABILITY_LABEL[value][lang]
  return value.replace(/-/g, ' ')
}

export default function BestForPage({ model }: { model: BestForPageModel }) {
  const { useCase, lang, ranked, indexable, verdict, reasons, differingFieldCount, differingFields } = model
  const h1 = model.h1
  const intro = useCase.intro[lang]
  const methodology = useCase.methodology[lang]
  const fieldKeys = useCase.fields

  const crumbs = lang === 'ru'
    ? [
        { name: 'Русская версия', url: '/ru' },
        { name: useCase.label.ru },
      ]
    : [
        { name: 'Home', url: '/' },
        { name: 'Prop Firms', url: '/prop-firms' },
        { name: useCase.label.en },
      ]

  const itemLd = itemListSchema(
    ranked.map(row => row.firm),
    lang === 'ru' ? `Лучшие проп-фирмы — ${useCase.label.ru}` : `Best Prop Firms — ${useCase.label.en}`,
  )

  return (
    <div
      className={lang === 'ru' ? 'ru-section' : undefined}
      style={lang === 'en' ? { maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' } : undefined}
      data-best-for={useCase.id}
      data-best-for-lang={lang}
      data-best-for-indexable={indexable ? 'true' : 'false'}
      data-best-for-diff-fields={differingFieldCount}
    >
      <div className={lang === 'ru' ? 'ru-shell ru-content' : undefined}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemLd) }} />
        <Breadcrumbs items={crumbs} locale={lang} />

        <header style={{ marginTop: '1.5rem' }}>
          <span className="section-kicker">
            <ListChecks size={13} aria-hidden="true" />{' '}
            {lang === 'ru' ? 'Рейтинг по данным' : 'Data-backed ranking'}
          </span>
          <h1 style={{ marginTop: '0.75rem', fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', lineHeight: 1.15 }}>
            {h1}
          </h1>
          <p style={{ marginTop: '1rem', color: 'var(--muted)', maxWidth: 720 }}>
            {lang === 'ru' ? ruRedactExchanges(intro) : intro}
          </p>
          <p className="rules-meta" style={{ marginTop: '0.75rem' }}>
            {lang === 'ru' ? 'Обновлено' : 'Reviewed'} {localeDate(useCase.lastReviewed, lang)}
            {' · '}
            {ranked.length}{' '}
            {lang === 'ru' ? 'фирм' : ranked.length === 1 ? 'firm' : 'firms'}
            {' · '}
            {differingFieldCount}/{BEST_FOR_MIN_DIFF_FIELDS}+{' '}
            {lang === 'ru' ? 'различающихся полей' : 'differing fields'}
          </p>
        </header>

        {/* Gate reasons stay machine-readable only — never show internals to visitors. */}
        {!indexable ? (
          <span
            hidden
            aria-hidden="true"
            data-best-for-gate="noindex"
            data-best-for-gate-reasons={reasons.join(' | ')}
          />
        ) : null}

        {lang === 'ru' && (
          <div style={{ marginTop: '1.5rem' }}>
            <RuTelegramBlock placement={`best-for-${useCase.id}`} />
          </div>
        )}

        <AffiliateDisclosure lang={lang} />

        <p
          data-best-for-sort-rule={useCase.id}
          style={{ marginTop: '1.25rem', color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 720 }}
        >
          {model.sortRule}
        </p>
        {(model.usedScalpingProxy || model.usedTimeLimitProxy) && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }} data-best-for-proxy="true">
            {lang === 'ru'
              ? 'Часть строк использует помеченный запасной критерий, пока фирма не опубликует новое поле.'
              : 'Some rows use a labelled stand-in until the firm publishes the newer rule field.'}
          </p>
        )}
        {useCase.relatedPaths?.[lang]?.length ? (
          <p style={{ marginTop: '0.75rem', fontSize: '0.95rem' }} data-best-for-related="true">
            {lang === 'ru' ? 'См. также:' : 'See also:'}{' '}
            {useCase.relatedPaths[lang]!.map((href, index) => (
              <span key={href}>
                {index > 0 ? ' · ' : null}
                <Link href={href}>{href}</Link>
              </span>
            ))}
          </p>
        ) : null}

        <section aria-labelledby="best-for-list-title" style={{ marginTop: '2rem' }}>
          <h2 id="best-for-list-title">
            {lang === 'ru' ? 'Рейтинг' : 'Ranking'}
          </h2>
          {!ranked.length ? (
            <p style={{ color: 'var(--muted)' }}>
              {lang === 'ru'
                ? 'Пока нет фирм с подтверждёнными данными под этот критерий.'
                : 'No firms currently match this criterion with verified data.'}
            </p>
          ) : (
            <ol
              className="feature-firm-list"
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {ranked.map((row, index) => (
                <li
                  key={row.slug}
                  className="feature-firm-card card"
                  data-firm={row.slug}
                  data-russia-status={row.russiaStatus}
                  style={{ padding: '1.25rem 1.5rem' }}
                >
                  <div className="feature-firm-card-grid">
                    <span className="feature-firm-rank" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="feature-firm-logo-tile">
                      <FirmLogo name={row.firm.name} src={row.firm.logo} />
                    </div>
                    <div className="feature-firm-meta">
                      <strong style={{ fontSize: '1.05rem' }}>{row.firm.name}</strong>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
                        {row.highlight}
                      </p>
                    </div>
                    <div className="feature-firm-actions">
                      {lang === 'en' ? (
                        <>
                          <Link
                            href={`/go/${row.slug}?from=best-for-${useCase.id}`}
                            prefetch={false}
                            rel={goLinkRel(row.slug)}
                            target="_blank"
                            className="btn-primary feature-firm-cta"
                          >
                            Visit {row.firm.name} <ExternalLink size={13} aria-hidden="true" />
                          </Link>
                          {row.firm.reviewUrl ? (
                            <Link href={row.firm.reviewUrl} className="feature-firm-secondary">
                              Read review <ArrowRight size={12} aria-hidden="true" />
                            </Link>
                          ) : null}
                        </>
                      ) : (
                        <RuGoLink
                          firm={row.slug}
                          href={`/go/${row.slug}?from=ru-best-for-${useCase.id}`}
                          rel={goLinkRel(row.slug)}
                          className="btn-primary feature-firm-cta"
                        >
                          Проверить {row.firm.name} <ArrowRight size={13} aria-hidden="true" />
                        </RuGoLink>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {model.excludedRestrictedFirms && model.excludedRestrictedFirms.length > 0 ? (
          <section
            aria-labelledby="best-for-excluded-title"
            data-best-for-excluded-restricted="true"
            style={{ marginTop: '2.5rem' }}
          >
            <h2 id="best-for-excluded-title">
              {lang === 'ru' ? 'Исключены из рейтинга' : 'Excluded from ranking'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 720 }}>
              {lang === 'ru'
                ? 'У этих фирм Россия в списке ограничений на дату проверки — в рейтинг они не входят. Ссылка регистрации и бейдж доступа для РФ остаются:'
                : 'These firms list Russia on their restriction list (checked on the capture date), so they stay out of the ranking. Each still keeps a sign-up link with a Russia-access badge:'}
            </p>
            <ul
              className="feature-firm-list"
              style={{ listStyle: 'none', margin: '1rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {model.excludedRestrictedFirms.map(firm => (
                <li
                  key={firm.slug}
                  className="feature-firm-card card"
                  data-excluded-restricted={firm.slug}
                  data-firm={firm.slug}
                  data-russia-status="restricted"
                  style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    {firm.reviewPath ? (
                      <Link href={firm.reviewPath}><strong>{firm.name}</strong></Link>
                    ) : (
                      <strong>{firm.name}</strong>
                    )}
                    {' '}
                    {lang === 'ru' ? (
                      <span data-best-for-excluded-note="restricted-list">В списке ограничений</span>
                    ) : (
                      <span data-best-for-excluded-note="restricted-list">On restriction list</span>
                    )}
                  </div>
                  {lang === 'ru' ? (
                    <RuGoLink
                      firm={firm.slug}
                      href={`/go/${firm.slug}?from=ru-best-for-${useCase.id}-excluded`}
                      rel={goLinkRel(firm.slug)}
                      className="btn-primary feature-firm-cta"
                    >
                      Проверить {firm.name} <ArrowRight size={13} aria-hidden="true" />
                    </RuGoLink>
                  ) : (
                    <Link
                      href={`/go/${firm.slug}?from=best-for-${useCase.id}-excluded`}
                      prefetch={false}
                      rel={goLinkRel(firm.slug)}
                      target="_blank"
                      className="btn-primary feature-firm-cta"
                    >
                      Visit {firm.name} <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ranked.length > 0 && (
          <section aria-labelledby="best-for-table-title" style={{ marginTop: '2.5rem' }}>
            <h2 id="best-for-table-title">
              {lang === 'ru' ? 'Сравнение полей' : 'Field comparison'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              {lang === 'ru'
                ? `Различающихся полей: ${differingFieldCount} (${differingFields.map(key => BEST_FOR_FIELD_SPECS[key].label.ru).join(', ') || 'нет'}). Для индекса нужно ≥${BEST_FOR_MIN_DIFF_FIELDS}.`
                : `${differingFieldCount} differing fields (${differingFields.map(key => BEST_FOR_FIELD_SPECS[key].label.en).join(', ') || 'none'}). Indexing needs ≥${BEST_FOR_MIN_DIFF_FIELDS}.`}
            </p>
            <div className="rules-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="rules-table" data-best-for-table={useCase.id}>
                <thead>
                  <tr>
                    <th scope="col">{lang === 'ru' ? 'Поле' : 'Field'}</th>
                    {ranked.map(row => (
                      <th key={row.slug} scope="col">{row.firm.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fieldKeys.map(key => (
                    <tr key={key} data-field={key} data-differs={differingFields.includes(key) ? 'true' : 'false'}>
                      <th scope="row">{BEST_FOR_FIELD_SPECS[key].label[lang]}</th>
                      {ranked.map(row => (
                        <td key={row.slug}>{displayField(key, row.fieldValues[key], lang)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {model.unrankedUsd && model.unrankedUsd.length > 0 && (
          <section aria-labelledby="best-for-usd-title" style={{ marginTop: '2.5rem' }} data-best-for-usd-group="true">
            <h2 id="best-for-usd-title">
              {lang === 'ru' ? 'Отдельно: лимиты в USD (без ранга)' : 'Separate: USD-cap products (unranked)'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              {lang === 'ru'
                ? 'Долларовые капы (часто фьючерсы) не переводим в % и не смешиваем с %-рейтингом.'
                : 'Dollar caps (common on futures) are never converted to % and are not mixed into the %-based ranking.'}
            </p>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {model.unrankedUsd.map(row => (
                <li key={`usd-${row.slug}`} className="feature-firm-card card" data-firm={row.slug} data-drawdown-basis="usd" style={{ padding: '1.25rem 1.5rem' }}>
                  <strong>{row.firm.name}</strong>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>{row.highlight}</p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                    {row.fieldValues.maxLossUsd ? `max loss $${Number(row.fieldValues.maxLossUsd).toLocaleString('en-US')}` : null}
                    {row.fieldValues.dailyLossUsd ? ` · daily $${Number(row.fieldValues.dailyLossUsd).toLocaleString('en-US')}` : null}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {verdict && (
          <section
            aria-labelledby="best-for-verdict-title"
            className="rules-verdict"
            data-best-for-verdict={verdict.file}
            style={{ marginTop: '2.5rem' }}
          >
            <h2 id="best-for-verdict-title">{lang === 'ru' ? 'Наш вывод' : 'Our take'}</h2>
            <div
              className="prose"
              dangerouslySetInnerHTML={{
                __html: renderVerdictMarkdown(lang === 'ru' ? ruRedactExchanges(verdict.body) : verdict.body),
              }}
            />
            <p className="rules-meta">
              {lang === 'ru' ? 'Автор' : 'By'} {verdict.author} · {lang === 'ru' ? 'проверено' : 'checked'}{' '}
              {verdict.checkedAt}
            </p>
          </section>
        )}

        <section aria-labelledby="best-for-method-title" style={{ marginTop: '2.5rem' }}>
          <h2 id="best-for-method-title">{lang === 'ru' ? 'Методика' : 'Methodology'}</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 720 }}>
            {lang === 'ru' ? ruRedactExchanges(methodology) : methodology}
          </p>
          {useCase.dataNote ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }} data-best-for-data-note="true">
              {useCase.dataNote}
            </p>
          ) : null}
        </section>

        <p style={{ marginTop: '2rem' }}>
          <Link href={lang === 'ru' ? '/ru/luchshie-prop-firmy' : '/prop-firms'} className="feature-firm-secondary">
            {lang === 'ru' ? 'Ко всем проп-фирмам' : 'Browse all prop firms'} <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  )
}
