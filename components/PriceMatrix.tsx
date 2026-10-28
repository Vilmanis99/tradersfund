import type { Challenge } from '@/lib/firms'
import {
  buildPriceMatrix, formatMatrixDate, formatMatrixMoney, formatMatrixSize,
  type PriceMatrixCell, type PriceMatrixLocale,
} from '@/lib/priceMatrix'

/**
 * C5 PriceMatrix (design/article-format-spec.md §4, P2): one compact
 * size × product table instead of one row per tier that repeats the product
 * name and capture date. Shared by EN reviews and RU review pages. Prices stay
 * in the firm's own currency; the caller passes only fresh products.
 */

function englishOrdinal(count: number) {
  const tens = count % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : count % 10 === 1 ? 'st' : count % 10 === 2 ? 'nd' : count % 10 === 3 ? 'rd' : 'th'
  return `${count}${suffix}`
}

const COPY = {
  en: {
    size: 'Account',
    missing: 'Not offered',
    unpublished: 'Not published',
    monthly: '/mo',
    activation: 'activation',
    payLater: 'after passing',
    refundYes: 'Fee refunded',
    refundNo: 'No refund',
    refundUnknown: 'Refund not stated',
    refundConflict: 'Refund: sources conflict, checked',
    refundAfter: (count: number) => `Refunded after ${englishOrdinal(count)} payout`,
    refundCellYes: 'refunded',
    refundCellNo: 'no refund',
    checked: 'Checked',
    note: 'Entry fee in the firm’s own currency, not converted. Discount codes are not applied.',
    scroll: 'Scroll →',
  },
  ru: {
    size: 'Счёт',
    missing: 'Нет размера',
    unpublished: 'Не опубл.',
    monthly: '/мес.',
    activation: 'активация',
    payLater: 'после прохождения',
    refundYes: 'Взнос возвращается',
    refundNo: 'Без возврата',
    refundUnknown: 'Возврат не указан',
    refundConflict: 'Возврат: источники расходятся, проверено',
    refundAfter: (count: number) => `Возврат после ${count}-й выплаты`,
    refundCellYes: 'возврат',
    refundCellNo: 'без возврата',
    checked: 'Проверено',
    note: 'Взнос в валюте фирмы, без конвертации. Промокоды не учтены.',
    scroll: 'Прокрутите →',
  },
} as const

type Props = {
  products: Challenge[]
  firmName: string
  firmSlug: string
  locale: PriceMatrixLocale
  /** Accessible name of the scroll region. */
  ariaLabel: string
  /** Class of the scroll region; RU pages pass `ru-table-wrap` so existing table-region checks keep matching. */
  wrapperClassName?: string
  /** Extra data-* attributes are passed to the <table> (existing crawl/test markers). */
  [dataAttribute: `data-${string}`]: string | number | undefined
  /**
   * Keep an empty, labelled table region when nothing is priced (RU pages: the
   * expired state still shows where prices would be, with a 0 count marker).
   */
  renderEmpty?: boolean
  /** Optional visible title above the matrix (EN reviews). */
  title?: string
  id?: string
}

function refundLabel(value: boolean | null, locale: PriceMatrixLocale) {
  const copy = COPY[locale]
  return value === true ? copy.refundYes : value === false ? copy.refundNo : copy.refundUnknown
}

function Cell({ cell, showRefund, locale }: { cell: PriceMatrixCell; showRefund: boolean; locale: PriceMatrixLocale }) {
  const copy = COPY[locale]
  if (cell.kind === 'missing') return <td className="price-matrix__empty" data-price-matrix-empty="missing"><span aria-hidden="true">—</span><span className="sr-only">{copy.missing}</span></td>
  if (cell.kind === 'unpublished') return <td className="price-matrix__empty" data-price-matrix-empty="unpublished">{copy.unpublished}</td>
  const extras = [
    cell.activationUsd != null ? `+ ${formatMatrixMoney(cell.activationUsd, 'USD')} ${copy.activation}` : null,
    cell.payLaterUsd != null ? `+ ${formatMatrixMoney(cell.payLaterUsd, 'USD')} ${copy.payLater}` : null,
    showRefund && cell.refundable != null ? (cell.refundable ? copy.refundCellYes : copy.refundCellNo) : null,
  ].filter(Boolean)
  return (
    <td data-price-cell={cell.currency}>
      <span className="price-matrix__amount">{formatMatrixMoney(cell.amount, cell.currency)}{cell.monthly ? <small>{copy.monthly}</small> : null}</span>
      {extras.map(extra => <span key={extra} className="price-matrix__extra">{extra}</span>)}
    </td>
  )
}

export default function PriceMatrix({ products, firmName, firmSlug, locale, ariaLabel, wrapperClassName, renderEmpty = false, title, id, ...rest }: Props) {
  const tableData = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith('data-')))
  const matrix = buildPriceMatrix(products, firmName)
  if (!matrix.rows.length) {
    if (!renderEmpty) return null
    return (
      <figure className={`price-matrix price-matrix--${locale}`} id={id} data-price-matrix={firmSlug} data-price-matrix-cells={0}>
        <div className={wrapperClassName ?? 'price-matrix__scroll'} tabIndex={0} role="region" aria-label={ariaLabel} data-price-matrix-columns={0}>
          <table className="price-matrix__table" {...tableData}>
            <thead><tr><th scope="col">{COPY[locale].size}</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </figure>
    )
  }
  const copy = COPY[locale]
  const singleDate = matrix.capturedDates.length === 1 ? matrix.capturedDates[0] : null
  return (
    <figure className={`price-matrix price-matrix--${locale}`} id={id} data-price-matrix={firmSlug} data-price-matrix-cells={matrix.pricedCount}>
      {title && <figcaption className="price-matrix__title">{title}</figcaption>}
      <div className={wrapperClassName ?? 'price-matrix__scroll'} tabIndex={0} role="region" aria-label={ariaLabel}
        data-price-matrix-columns={matrix.columns.length}>
        <table className="price-matrix__table" {...tableData}>
          <thead>
            <tr>
              <th scope="col">{copy.size}</th>
              {matrix.columns.map(column => (
                <th scope="col" key={column.product.productSlug} data-price-matrix-product={column.product.productSlug}>
                  <span className="price-matrix__product">{column.label}</span>
                  {column.refundConflictCheckedAt
                    ? <span className="price-matrix__meta" data-price-matrix-refund-conflict={column.refundConflictCheckedAt}>{copy.refundConflict} <time dateTime={column.refundConflictCheckedAt}>{formatMatrixDate(column.refundConflictCheckedAt, locale)}</time></span>
                    : column.refundUniform && column.refundable === true && column.refundAfterPayouts
                      ? <span className="price-matrix__meta" data-price-matrix-refund-after={column.refundAfterPayouts}>{copy.refundAfter(column.refundAfterPayouts)}</span>
                      : column.refundUniform && <span className="price-matrix__meta">{refundLabel(column.refundable, locale)}</span>}
                  {!singleDate && <span className="price-matrix__meta"><time dateTime={column.capturedAt}>{formatMatrixDate(column.capturedAt, locale)}</time></span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map(row => (
              <tr key={row.sizeUsd}>
                <th scope="row">{formatMatrixSize(row.sizeUsd)}</th>
                {row.cells.map((cell, index) => (
                  <Cell key={matrix.columns[index].product.productSlug} cell={cell} locale={locale} showRefund={!matrix.columns[index].refundUniform} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="price-matrix__note">
        {singleDate
          ? <span className="price-matrix__chip">✓ {copy.checked} <time dateTime={singleDate}>{formatMatrixDate(singleDate, locale)}</time></span>
          : <span className="price-matrix__chip">✓ {copy.checked} <time dateTime={matrix.capturedDates[0]}>{formatMatrixDate(matrix.capturedDates[0], locale)}</time>–<time dateTime={matrix.capturedDates.at(-1)}>{formatMatrixDate(matrix.capturedDates.at(-1)!, locale)}</time></span>}
        {' '}{copy.note}
        {matrix.columns.length > 2 && <span className="price-matrix__hint" aria-hidden="true"> {copy.scroll}</span>}
      </p>
    </figure>
  )
}
