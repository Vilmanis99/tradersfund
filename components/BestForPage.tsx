import Link from 'next/link'
import { ArrowRight, ExternalLink, ListChecks } from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import Breadcrumbs from '@/components/Breadcrumbs'
import FirmLogo from '@/components/FirmLogo'
import RuTelegramBlock from '@/components/RuTelegramBlock'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadge } from '@/components/RuGoLink'
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
    return value.slice(6).replace(/,/g, ' / ')
  }
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
            {lang === 'ru' ? 'Обновлено' : 'Reviewed'} {useCase.lastReviewed}
            {' · '}
            {ranked.length}{' '}
            {lang === 'ru' ? 'фирм' : ranked.length === 1 ? 'firm' : 'firms'}
            {' · '}
            {differingFieldCount}/{BEST_FOR_MIN_DIFF_FIELDS}+{' '}
            {lang === 'ru' ? 'различающихся полей' : 'differing fields'}
            {!indexable ? (
              <>
                {' · '}
                <span data-best-for-gate="noindex">
                  {lang === 'ru' ? 'не индексируется' : 'noindex until gate passes'}
                </span>
              </>
            ) : null}
          </p>
        </header>

        {!indexable && (
          <div
            role="note"
            data-best-for-reasons={reasons.join(' | ')}
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--muted)',
              fontSize: '0.95rem',
            }}
          >
            <strong>{lang === 'ru' ? 'Страница пока noindex.' : 'This page is noindex for now.'}</strong>{' '}
            {lang === 'ru'
              ? 'Нужны вердикт писателя и ≥5 различающихся полей данных между фирмами в рейтинге.'
              : 'It needs a writer verdict and ≥5 differing data fields across the ranked firms.'}
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {reasons.map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {lang === 'ru' && (
          <div style={{ marginTop: '1.5rem' }}>
            <RuTelegramBlock placement={`best-for-${useCase.id}`} />
          </div>
        )}

        <AffiliateDisclosure />

        <p
          data-best-for-sort-rule={useCase.id}
          style={{ marginTop: '1.25rem', color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 720 }}
        >
          {model.sortRule}
        </p>
        {(model.usedScalpingProxy || model.usedTimeLimitProxy) && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }} data-best-for-proxy="true">
            {lang === 'ru'
              ? 'Часть строк использует помеченный запасной критерий, пока Tracker не заполнит новое поле.'
              : 'Some rows use a labelled fallback until Tracker fills the new structured field.'}
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
                      {lang === 'ru' && !row.showRuSignupCta ? <RuAccessBadge firm={row.slug} /> : null}
                    </div>
                    <div className="feature-firm-actions">
                      {lang === 'en' ? (
                        <>
                          <Link
                            href={`/go/${row.slug}?from=best-for-${useCase.id}`}
                            prefetch={false}
                            rel={row.firm.affiliateUrl ? 'sponsored nofollow noopener' : 'nofollow noopener'}
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
                      ) : row.showRuSignupCta ? (
                        <RuGoLink
                          firm={row.slug}
                          href={`/go/${row.slug}?from=ru-best-for-${useCase.id}`}
                          rel={goLinkRel(row.slug)}
                          className="btn-primary feature-firm-cta"
                        >
                          Проверить {row.firm.name} <ArrowRight size={13} aria-hidden="true" />
                        </RuGoLink>
                      ) : (
                        <span className="feature-firm-secondary" data-ru-cta="hidden-not-available">
                          {row.russiaStatus === 'restricted'
                            ? 'Регистрация для РФ ограничена'
                            : 'Статус для РФ не подтверждён — без CTA'}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

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
