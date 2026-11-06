import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import Link from '@/components/SafeLink'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import ReportChangeCharts, { RU_REPORT_CHART_LABELS } from '@/components/ReportChangeCharts'
import {
  getLanguageAlternates,
  russianRouteDateModified,
  type RussianRoutePath,
} from '@/lib/localizedRoutes'
import {
  emptyPropFirmChangesStats,
  tryLoadPropFirmChangesCsv,
} from '@/lib/propFirmChangesReport'
import { formatRuDate } from '@/lib/ruDate'
import { authorSchema, breadcrumbSchema, jsonLd } from '@/lib/schema'

export const revalidate = 3600

const PATH = '/ru/otchet-izmeneniya-prop-firm-oktyabr-2026' as const satisfies RussianRoutePath
const TITLE = 'Изменения правил и выплат проп-компаний — октябрь 2026'
const H1 = 'Изменения правил и выплат проп-компаний — октябрь 2026'
const DESCRIPTION =
  'Отчёт за октябрь 2026: 56 изменений правил, выплат, цен и промо у проп-компаний. У каждой строки — источник и дата сверки по 31.10. CSV — 56 строк.'
const DATE_PUBLISHED = '2026-11-05'
const CHECKED = '2026-11-01'
const CSV_HREF = '/reports/prop-firm-changes-october-2026.csv'
const BODY_PATH = join(process.cwd(), 'content/data/ru-otchet-oktyabr-2026.html')

export function generateMetadata(): Metadata {
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical: PATH,
      languages: getLanguageAlternates(PATH),
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: PATH,
      type: 'article',
      locale: 'ru_RU',
    },
  }
}

export default function RuOtchetOktyabr2026Page() {
  const chartStats = tryLoadPropFirmChangesCsv() ?? emptyPropFirmChangesStats()
  const bodyHtml = existsSync(BODY_PATH) ? readFileSync(BODY_PATH, 'utf8') : ''
  const dateModified = russianRouteDateModified(PATH)
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Отчёт: изменения проп-компаний — октябрь 2026' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: DATE_PUBLISHED,
    dateModified,
    author: authorSchema('Traders Fund Hub'),
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-report="otchet-oktyabr-2026" data-russian-report-cutoff="2026-10-31">
          <div className="ru-breadcrumb">
            <Link href="/ru">Русская версия</Link>
            {' / '}
            Отчёт: изменения — октябрь 2026
          </div>
          <h1>{H1}</h1>
          <p className="ru-lead">
            Редакционный отчёт по изменениям правил, выплат, цен и акций проп-компаний за октябрь 2026 года.
            Только датированные факты с официальных страниц — без партнёрских ссылок и без призывов к покупке.
            CSV:{' '}
            <a href={CSV_HREF}>prop-firm-changes-october-2026.csv</a>
            {chartStats.totalRows > 0
              ? ` (${chartStats.totalRows} строк до отсечки 31.10.2026).`
              : ' (контент добавляет RU Writer).'}
          </p>
          <div className="ru-review-meta" aria-label="Редакционные данные отчёта">
            <span>Автор: редакция Traders Fund Hub</span>
            <span>Обновлено: {formatRuDate(dateModified)}</span>
            <span>Сверка после отсечки: {formatRuDate(CHECKED)}</span>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-report-article="otchet-oktyabr-2026">
        {chartStats.totalRows > 0 ? (
          <section className="ru-section">
            <div className="ru-shell ru-content">
              <ReportChangeCharts
                stats={chartStats}
                labels={RU_REPORT_CHART_LABELS}
                otherFirmsLabel="Другие"
                lang="ru"
              />
            </div>
          </section>
        ) : null}

        <section className="ru-section">
          {bodyHtml ? (
            <div
              className="ru-shell ru-content"
              data-russian-report-body="otchet-oktyabr-2026"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <div
              className="ru-shell ru-content"
              data-russian-report-body="otchet-oktyabr-2026"
              data-russian-report-stub="awaiting-writer-html"
            >
              <p>Текст отчёта появится после коммита RU Writer (content/data/ru-otchet-oktyabr-2026.html).</p>
            </div>
          )}
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2 id="esche-po-teme">Ещё по теме</h2>
            <ul>
              <li>
                <Link href="/ru/promokody-prop-firm">Актуальные промокоды проп-фирм</Link>
              </li>
              <li>
                <Link href="/ru/dlya-russkoyazychnykh-treyderov">Какие проп-фирмы смотрят на доступ из РФ</Link>
              </li>
              <li>
                <Link href="/ru/vyplaty-prop-firm">Как устроены выплаты в проп-фирмах</Link>
              </li>
              <li>
                <Link href="/ru/luchshie-prop-firmy">Рейтинг проп-компаний</Link>
              </li>
              <li>
                <Link href="/ru/fundingpips-pravila">Правила FundingPips подробно</Link>
              </li>
            </ul>
          </div>
        </section>
      </article>

      <RuRelatedBlock path={PATH} />
    </>
  )
}
