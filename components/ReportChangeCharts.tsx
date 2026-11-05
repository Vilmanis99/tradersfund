/**
 * Editorial bar / timeline charts for the prop-firm October changes report.
 * Language-agnostic: all visible strings come from `labels` props so EN can reuse.
 * Inline SVG + accessible summary tables. No chart library.
 * Charts count LIVE/verified October rows only; PENDING / OBSERVATION / Sep listed below.
 */
import type { NamedCount, PropFirmChangesReportStats } from '@/lib/propFirmChangesReport'

export type ReportChangeChartsLabels = {
  sectionTitle: string
  sectionLead: string
  byCategoryTitle: string
  byFirmTitle: string
  timelineTitle: string
  categoryLabels: Record<string, string>
  countColumn: string
  nameColumn: string
  dateColumn: string
  notCountedTitle: string
  notCountedLead: string
  pendingLabel: string
  observationLabel: string
  septemberLabel: string
  csvScopeNote: string
  ariaCategory: string
  ariaFirm: string
  ariaTimeline: string
}

type Props = {
  stats: PropFirmChangesReportStats
  labels: ReportChangeChartsLabels
  /** Max firms to show on the firm chart (rest folded into “other” if provided). */
  firmLimit?: number
  otherFirmsLabel?: string
}

function HorizontalBars({
  items,
  ariaLabel,
  maxBars = 12,
}: {
  items: NamedCount[]
  ariaLabel: string
  maxBars?: number
}) {
  const shown = items.slice(0, maxBars)
  const max = Math.max(1, ...shown.map(i => i.count))
  const rowH = 28
  const labelW = 132
  const chartW = 320
  const padR = 36
  const height = shown.length * rowH + 8
  const width = labelW + chartW + padR

  return (
    <svg
      className="report-charts__svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      focusable="false"
    >
      {shown.map((item, index) => {
        const y = 4 + index * rowH
        const barW = Math.max(2, (item.count / max) * chartW)
        const label =
          item.key.length > 18 ? `${item.key.slice(0, 16)}…` : item.key
        return (
          <g key={item.key} transform={`translate(0 ${y})`}>
            <title>{`${item.key}: ${item.count}`}</title>
            <text
              className="report-charts__tick"
              x={labelW - 8}
              y={16}
              textAnchor="end"
            >
              {label}
            </text>
            <rect
              className="report-charts__bar"
              x={labelW}
              y={4}
              width={barW}
              height={16}
              rx={3}
            />
            <text
              className="report-charts__value"
              x={labelW + barW + 6}
              y={16}
            >
              {item.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TimelineBars({
  items,
  ariaLabel,
}: {
  items: NamedCount[]
  ariaLabel: string
}) {
  const max = Math.max(1, ...items.map(i => i.count))
  const barW = 14
  const gap = 4
  const labelW = 28
  const chartH = 100
  const top = 8
  const bottom = 28
  const height = top + chartH + bottom
  const width = labelW + items.length * (barW + gap) + 8

  return (
    <svg
      className="report-charts__svg report-charts__svg--timeline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      focusable="false"
    >
      <line
        className="report-charts__axis"
        x1={labelW}
        y1={top + chartH}
        x2={width - 4}
        y2={top + chartH}
      />
      {items.map((item, index) => {
        const h = Math.max(2, (item.count / max) * chartH)
        const x = labelW + index * (barW + gap)
        const y = top + chartH - h
        const day = item.key.slice(8) // DD
        return (
          <g key={item.key}>
            <title>{`${item.key}: ${item.count}`}</title>
            <rect
              className="report-charts__bar report-charts__bar--timeline"
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
            />
            <text
              className="report-charts__tick"
              x={x + barW / 2}
              y={top + chartH + 14}
              textAnchor="middle"
            >
              {day}
            </text>
            {item.count >= 4 && (
              <text
                className="report-charts__value"
                x={x + barW / 2}
                y={y - 2}
                textAnchor="middle"
              >
                {item.count}
              </text>
            )}
          </g>
        )
      })}
      <text className="report-charts__tick" x={2} y={top + 10}>
        {max}
      </text>
      <text className="report-charts__tick" x={2} y={top + chartH}>
        0
      </text>
    </svg>
  )
}

function SummaryTable({
  caption,
  nameColumn,
  countColumn,
  items,
}: {
  caption: string
  nameColumn: string
  countColumn: string
  items: NamedCount[]
}) {
  return (
    <div className="ru-table-wrap report-charts__table-wrap" tabIndex={0} role="region">
      <table className="ru-table report-charts__table">
        <caption className="report-charts__caption">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{nameColumn}</th>
            <th scope="col">{countColumn}</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.key}>
              <td>{item.key}</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatExcluded(
  rows: PropFirmChangesReportStats['notCountedRows'],
  status: 'pending' | 'observation' | 'september_footnote',
): string {
  return rows
    .filter(r => r.status === status)
    .map(r => `${r.firm} (${r.changeType}, ${r.date})`)
    .join('; ')
}

export default function ReportChangeCharts({
  stats,
  labels,
  firmLimit = 12,
  otherFirmsLabel = 'Other',
}: Props) {
  const categoryItems = stats.byCategory.map(item => ({
    key: labels.categoryLabels[item.key] ?? item.key,
    count: item.count,
  }))

  const topFirms = stats.byFirm.slice(0, firmLimit)
  const rest = stats.byFirm.slice(firmLimit)
  const firmItems =
    rest.length > 0
      ? [
          ...topFirms,
          {
            key: otherFirmsLabel,
            count: rest.reduce((sum, item) => sum + item.count, 0),
          },
        ]
      : topFirms

  const pendingList = formatExcluded(stats.notCountedRows, 'pending')
  const observationList = formatExcluded(stats.notCountedRows, 'observation')
  const septemberList = formatExcluded(stats.notCountedRows, 'september_footnote')

  return (
    <section
      className="report-charts"
      data-report-charts="prop-firm-changes-october-2026"
      data-report-october-count={stats.octoberCount}
      data-report-live-count={stats.liveOctoberCount}
      data-report-csv-rows={stats.totalRows}
      data-report-pending-count={stats.pendingRows.length}
      data-report-observation-count={stats.observationRows.length}
      aria-labelledby="report-charts-title"
    >
      <h2 id="report-charts-title">{labels.sectionTitle}</h2>
      <p className="report-charts__lead">{labels.sectionLead}</p>
      <p className="report-charts__note ru-muted">{labels.csvScopeNote}</p>

      <div className="report-charts__grid">
        <figure className="report-charts__figure" data-report-chart="by-category">
          <figcaption className="report-charts__figcaption">{labels.byCategoryTitle}</figcaption>
          <HorizontalBars items={categoryItems} ariaLabel={labels.ariaCategory} />
          <SummaryTable
            caption={labels.byCategoryTitle}
            nameColumn={labels.nameColumn}
            countColumn={labels.countColumn}
            items={categoryItems}
          />
        </figure>

        <figure className="report-charts__figure" data-report-chart="by-firm">
          <figcaption className="report-charts__figcaption">{labels.byFirmTitle}</figcaption>
          <HorizontalBars items={firmItems} ariaLabel={labels.ariaFirm} maxBars={firmLimit + 1} />
          <SummaryTable
            caption={labels.byFirmTitle}
            nameColumn={labels.nameColumn}
            countColumn={labels.countColumn}
            items={firmItems}
          />
        </figure>
      </div>

      <figure className="report-charts__figure report-charts__figure--timeline" data-report-chart="timeline">
        <figcaption className="report-charts__figcaption">{labels.timelineTitle}</figcaption>
        <div className="report-charts__timeline-scroll">
          <TimelineBars items={stats.byDay} ariaLabel={labels.ariaTimeline} />
        </div>
        <SummaryTable
          caption={labels.timelineTitle}
          nameColumn={labels.dateColumn}
          countColumn={labels.countColumn}
          items={stats.byDay}
        />
      </figure>

      <div
        className="report-charts__not-counted"
        data-report-not-counted={stats.notCountedRows.length}
      >
        <h3 className="report-charts__not-counted-title">{labels.notCountedTitle}</h3>
        <p className="report-charts__note">{labels.notCountedLead}</p>
        {stats.pendingRows.length > 0 && (
          <p className="report-charts__note" data-report-pending-markers={stats.pendingRows.length}>
            <strong>{labels.pendingLabel}</strong> ({stats.pendingRows.length}): {pendingList}
          </p>
        )}
        {stats.observationRows.length > 0 && (
          <p className="report-charts__note" data-report-observation-markers={stats.observationRows.length}>
            <strong>{labels.observationLabel}</strong> ({stats.observationRows.length}): {observationList}
          </p>
        )}
        {stats.septemberFootnoteCount > 0 && (
          <p className="report-charts__note ru-muted" data-report-september-footnote="">
            <strong>{labels.septemberLabel}</strong> ({stats.septemberFootnoteCount}):{' '}
            {septemberList}
          </p>
        )}
      </div>
    </section>
  )
}

/** RU labels for /ru/otchet-izmeneniya-prop-firm-oktyabr-2026 */
export const RU_REPORT_CHART_LABELS: ReportChangeChartsLabels = {
  sectionTitle: 'Сводка по CSV (октябрь 2026)',
  sectionLead:
    'Три диаграммы считают только LIVE/проверенные строки CSV за октябрь 2026. PENDING, OBSERVATION и сентябрьская сноска в счёт не входят — список ниже.',
  byCategoryTitle: 'Изменения по типу (LIVE)',
  byFirmTitle: 'Изменения по компаниям (LIVE)',
  timelineTitle: 'Хронология LIVE по датам наблюдения (октябрь)',
  categoryLabels: {
    rules: 'Правила',
    promo: 'Акции и коды',
    price: 'Цены',
    russia_access: 'Доступ из России',
    restricted_list: 'Списки стран',
    status: 'Статус / закрытия',
  },
  countColumn: 'Число',
  nameColumn: 'Категория / компания',
  dateColumn: 'Дата',
  notCountedTitle: 'Не в счёте: pending / observation',
  notCountedLead:
    'Статус строки: колонка status в CSV (если появится) → журнал изменений → пометка PENDING/OBSERVATION в поле new.',
  pendingLabel: 'PENDING',
  observationLabel: 'OBSERVATION',
  septemberLabel: 'Сентябрьская сноска',
  csvScopeNote:
    'В диаграммах только LIVE. Полные редакционные таблицы — ниже на странице.',
  ariaCategory: 'Горизонтальная столбчатая диаграмма: LIVE-изменения по типу',
  ariaFirm: 'Горизонтальная столбчатая диаграмма: LIVE-изменения по компаниям',
  ariaTimeline: 'Столбчатая диаграмма: LIVE-изменения по дням октября 2026',
}

/** EN labels (for later reuse on /reports/prop-firm-changes-october-2026). */
export const EN_REPORT_CHART_LABELS: ReportChangeChartsLabels = {
  sectionTitle: 'CSV overview (October 2026)',
  sectionLead:
    'Three charts count only LIVE/verified October 2026 CSV rows. PENDING, OBSERVATION and the September footnote are excluded — listed below.',
  byCategoryTitle: 'Changes by type (LIVE)',
  byFirmTitle: 'Changes by firm (LIVE)',
  timelineTitle: 'LIVE timeline by observation date (October)',
  categoryLabels: {
    rules: 'Rules',
    promo: 'Promos & codes',
    price: 'Prices',
    russia_access: 'Russia access',
    restricted_list: 'Restricted-country lists',
    status: 'Status / closures',
  },
  countColumn: 'Count',
  nameColumn: 'Category / firm',
  dateColumn: 'Date',
  notCountedTitle: 'Not counted: pending / observation',
  notCountedLead:
    'Row status: CSV status column (when present) → october change log → PENDING/OBSERVATION text in the new field.',
  pendingLabel: 'PENDING',
  observationLabel: 'OBSERVATION',
  septemberLabel: 'September footnote',
  csvScopeNote:
    'Charts include LIVE rows only. Full editorial tables follow on the page.',
  ariaCategory: 'Horizontal bar chart: LIVE change counts by type',
  ariaFirm: 'Horizontal bar chart: LIVE change counts by firm',
  ariaTimeline: 'Bar chart: LIVE change counts by day in October 2026',
}
