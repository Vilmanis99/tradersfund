'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Link2, Plus, Scale, SlidersHorizontal, X } from 'lucide-react'
import {
  challengeKey, DEFAULT_FINDER_FILTERS, filterChallengeRows, finderTier, parseFinderState,
  serializeFinderState, tierCurrency, tierPrice,
  type ChallengeFinderFilters, type GlobalChallengeRow, type GlobalChallengeTier,
} from '@/lib/challengeComparison'
import { trackSiteEvent } from '@/lib/clientAnalytics'
import { russianPayoutRequestLabel } from '@/lib/russianProgrammeLabels'

const UNKNOWN = 'Нет подтверждённых данных'
const percent = (value: number | null) => value == null ? UNKNOWN : `${value}%`
const money = (value: number | null, currency: 'USD' | 'EUR') => value == null ? UNKNOWN : new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
const accountLabel = (size: number) => money(size, 'USD')
const phaseLabel = (phases: number) => phases === 0 ? 'Без оценки' : `${phases} ${phases === 1 ? 'этап' : 'этапа'}`
const drawdownLabel = (value: string | null) => ({ static: 'Статическая', trailing: 'Трейлинг', 'eod-trailing': 'Трейлинг по итогам дня', 'balance-based': 'По балансу' }[value ?? ''] ?? UNKNOWN)
const ruleLabel = (value: boolean | 'restricted' | null) => value == null ? 'Не подтверждено' : value === 'restricted' ? 'С ограничениями' : value ? 'Разрешено' : 'Запрещено'
function payoutLabel(row: GlobalChallengeRow) {
  return russianPayoutRequestLabel(row.product)
}
function priceLabel(tier: GlobalChallengeTier | undefined) {
  if (!tier) return 'Этот размер не представлен'
  const currency = tierCurrency(tier)
  return currency ? money(tierPrice(tier, currency), currency) : UNKNOWN
}
function fundedCostLabel(tier: GlobalChallengeTier | undefined) {
  if (!tier) return 'Этот размер не представлен'
  const currency = tierCurrency(tier)
  return currency ? money(currency === 'USD' ? tier.costToFundedUsd : tier.costToFundedEur, currency) : UNKNOWN
}
function targets(row: GlobalChallengeRow) {
  if (row.product.phases === 0) return 'Нет оценочных этапов'
  return Array.from({ length: row.product.phases }, (_, index) => {
    const key = `phase${index + 1}` as keyof NonNullable<GlobalChallengeRow['product']['profitTargets']>
    const value = row.product.profitTargets?.[key]
    return value == null ? 'нет данных' : `${value}%`
  }).join(' → ')
}
function createFinderHashStore() {
  let snapshot = typeof window === 'undefined' ? '' : window.location.hash
  return {
    getSnapshot: () => snapshot,
    subscribe(callback: () => void) {
      const update = () => {
        const next = window.location.hash
        // Article section links are navigation, not a request to erase the shortlist.
        if (!new URLSearchParams(next.slice(1)).has('size')) return
        snapshot = next
        callback()
      }
      const restoreHistory = () => { snapshot = window.location.hash; callback() }
      window.addEventListener('hashchange', update)
      window.addEventListener('popstate', restoreHistory)
      update()
      return () => {
        window.removeEventListener('hashchange', update)
        window.removeEventListener('popstate', restoreHistory)
      }
    },
  }
}
const serverHash = () => ''

function ProgrammeCaveat({ row }: { row: GlobalChallengeRow }) {
  const product = row.product
  return <div className="ru-finder-caveat">
    <strong>Что это меняет для трейдера</strong>
    <p>{product.drawdownType === 'static'
      ? 'Статический общий лимит не поднимается вслед за прибылью. Дневной лимит и учёт открытого убытка всё равно нужно проверять отдельно.'
      : product.drawdownType === 'trailing'
        ? 'Подвижный лимит может подняться вслед за ростом счёта. После отката допустимый убыток может оказаться меньше, чем предполагает начальный процент.'
        : 'Способ пересчёта лимита важнее одного процента: сравните базу расчёта и момент фиксации убытка в правилах программы.'}</p>
    {product.phases === 0 && <p>Отсутствие оценки не отменяет условий выплаты. Взнос не является депозитом, а размер счёта — суммой, которую можно вывести.</p>}
    {product.consistencyRulePct != null && <p>Правило стабильности: {product.consistencyRulePct}%. Уточните, как считается доля лучшего дня и на каком этапе применяется ограничение.</p>}
    {product.phases > 0 && (product.fundedDailyLossPct != null || product.fundedMaxLossPct != null || product.fundedDrawdownType != null) && <p>После оценки условия могут отличаться: дневной лимит {percent(product.fundedDailyLossPct)}, общий {percent(product.fundedMaxLossPct)}, расчёт — {drawdownLabel(product.fundedDrawdownType)}. Пустое поле означает отсутствие отдельного подтверждения, а не отсутствие лимита.</p>}
    {product.changeSignals.length > 0 && <p>Есть замечания к источникам или изменения правил. Проверьте их в подробном обзоре до покупки.</p>}
    {row.firm.slug === 'bright-funded' && <p>Справочник Bright Funded противоречиво описывает двухнедельные выплаты и платную опцию. Не считайте сокращённый цикл частью базовой цены без подтверждения фирмы.</p>}
  </div>
}

export default function RussianChallengeFinder({ initialRows }: { initialRows: GlobalChallengeRow[] }) {
  const [hashStore] = useState(createFinderHashStore)
  const hash = useSyncExternalStore(hashStore.subscribe, hashStore.getSnapshot, serverHash)
  const { filters, selected } = useMemo(() => parseFinderState(hash, initialRows), [hash, initialRows])
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const rows = useMemo(() => filterChallengeRows(initialRows, filters), [initialRows, filters])
  const sizes = useMemo(() => [...new Set(initialRows.flatMap(row => row.product.tiers.map(tier => tier.sizeUsd)))].sort((a, b) => a - b), [initialRows])
  const compared = selected.flatMap(key => initialRows.filter(row => challengeKey(row) === key))
  const firmCount = new Set(initialRows.map(row => row.firm.slug)).size

  function openComparison() {
    const target = document.getElementById('sravnenie-programm')
    target?.focus({ preventScroll: true })
    // Results can span many mobile screens. Jump directly instead of a long animation;
    // this also avoids motion for users who request reduced animations.
    target?.scrollIntoView({ behavior: 'instant', block: 'start' })
    trackSiteEvent('challenge_comparison_opened', { surface: 'russian_finder', shortlist_count: compared.length })
  }

  function commit(nextFilters: ChallengeFinderFilters, nextSelected: string[]) {
    const fragment = serializeFinderState(nextFilters, nextSelected)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${fragment}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    setCopyState('idle')
  }
  function change<K extends keyof ChallengeFinderFilters>(key: K, value: ChallengeFinderFilters[K]) {
    const next = { ...filters, [key]: value }
    if (key === 'currency') {
      next.budget = null
      if (value === 'all' && next.sort === 'fee') next.sort = 'name'
    }
    commit(next, selected)
    trackSiteEvent('challenge_filter_used', { surface: 'russian_finder', filter: key, value: String(value) })
  }
  function toggle(row: GlobalChallengeRow) {
    const key = challengeKey(row)
    const removing = selected.includes(key)
    if (!removing && selected.length >= 3) return
    commit(filters, removing ? selected.filter(item => item !== key) : [...selected, key])
    trackSiteEvent(removing ? 'challenge_shortlist_remove' : 'challenge_shortlist_add', { surface: 'russian_finder', product: key })
  }
  async function copy() {
    const url = `${window.location.origin}${window.location.pathname}#${serializeFinderState(filters, selected)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      trackSiteEvent('challenge_shortlist_copied', { surface: 'russian_finder', shortlist_count: selected.length })
    } catch { setCopyState('failed') }
  }

  return <section className="ru-section ru-finder" id="podbor" data-russian-challenge-finder="product-first">
    <div className="ru-shell">
      <div className="ru-finder-heading"><div>
        <div className="ru-eyebrow"><Scale size={15} aria-hidden="true" /> Сравнение конкретных программ</div>
        <h2>Подберите челлендж под свой бюджет и правила</h2>
        <p className="ru-muted">Фирм в текущем наборе: {firmCount}; программ: {initialRows.length}. Выберите размер счёта, затем сопоставьте до 3 программ. Регистрация не нужна.</p>
      </div></div>
      <p className="ru-finder-disclosure" data-russian-affiliate-disclosure="challenge-finder">FundedNext, Bright Funded и FundingPips — партнёры сайта; мы можем получить комиссию при покупке по ссылке. Партнёрство не влияет на фильтры и сортировку. По умолчанию фирмы расположены по алфавиту.</p>
      {initialRows.length === 0 ? <div className="ru-notice" role="status">Данные требуют повторной проверки. До обновления цены и сравнение программ скрыты; обзоры ниже остаются доступны.</div> : <>
        <div className="ru-finder-filters" aria-label="Фильтры программ">
          <label>Размер счёта в USD<select value={filters.size} onChange={event => change('size', Number(event.target.value))}>{sizes.map(size => <option key={size} value={size}>{accountLabel(size)}</option>)}</select></label>
          <label>Оценочные этапы<select value={filters.phases} onChange={event => change('phases', event.target.value as ChallengeFinderFilters['phases'])}><option value="all">Все варианты</option><option value="0">Без челленджа</option><option value="1">1 этап</option><option value="2">2 этапа</option><option value="3">3 этапа</option></select></label>
          <label>Валюта взноса<select value={filters.currency} onChange={event => change('currency', event.target.value as ChallengeFinderFilters['currency'])}><option value="all">USD и EUR отдельно</option><option value="USD">USD — доллары</option><option value="EUR">EUR — евро</option></select></label>
          <label>Бюджет на взнос {filters.currency !== 'all' ? `(${filters.currency})` : ''}<input type="number" min="1" step="any" inputMode="decimal" disabled={filters.currency === 'all'} value={filters.budget ?? ''} placeholder={filters.currency === 'all' ? 'Сначала выберите валюту' : 'Без ограничения'} onChange={event => { const value = Number(event.target.value); change('budget', Number.isFinite(value) && value > 0 ? value : null) }} /></label>
        </div>
        <details className="ru-finder-advanced"><summary><SlidersHorizontal size={16} aria-hidden="true" /> Просадка и сортировка</summary><div className="ru-finder-filters">
          <label>Тип общей просадки<select value={filters.drawdown} onChange={event => change('drawdown', event.target.value as ChallengeFinderFilters['drawdown'])}><option value="all">Все способы расчёта</option><option value="static">Статическая</option><option value="trailing">Трейлинг</option><option value="eod-trailing">Трейлинг по итогам дня</option><option value="balance-based">По балансу</option></select></label>
          <label>Порядок результатов<select value={filters.sort} onChange={event => change('sort', event.target.value as ChallengeFinderFilters['sort'])}><option value="name">По названию фирмы</option><option value="fee" disabled={filters.currency === 'all'}>По цене в выбранной валюте</option><option value="payout">По сроку первого запроса выплаты</option></select></label>
        </div><p>Платформу уточняйте для выбранной программы и своей страны: общий список платформ фирмы не гарантирует доступность на каждом счёте.</p></details>
        <div className="ru-finder-toolbar">
          <p role="status" aria-live="polite">Найдено программ: <strong>{rows.length}</strong> · размер {accountLabel(filters.size)}</p>
          <button type="button" onClick={() => { commit({ ...DEFAULT_FINDER_FILTERS }, []); trackSiteEvent('challenge_filters_reset', { surface: 'russian_finder' }) }}>Сбросить всё</button>
          <button type="button" onClick={copy}><Link2 size={15} aria-hidden="true" />{copyState === 'copied' ? 'Ссылка скопирована' : 'Поделиться подбором'}</button>
        </div>
        {copyState === 'failed' && <p role="status">Не удалось скопировать автоматически. Скопируйте адрес этой страницы: выбранные параметры уже сохранены в нём.</p>}
        <p className="ru-source-line">Базовые взносы по датированным источникам, без временных скидок и дополнительных опций. Цены в разных валютах не пересчитываем. Размер счёта — номинал, а не доступная для вывода сумма.</p>
        <div className="ru-finder-selection" aria-label="Выбор для сравнения">
          <p role="status">{compared.length === 0 ? 'Нажмите «Сравнить» на 2–3 программах: таблица покажет различия в цене, просадке и выплатах.' : `Выбрано: ${compared.length}/3. ${compared.length === 1 ? 'Добавьте ещё одну программу.' : 'Можно открыть таблицу отличий.'}`}</p>
          {compared.length > 0 && <><ul>{compared.map(row => <li key={challengeKey(row)}><span>{row.firm.name} · {row.product.name}</span><button type="button" aria-label={`Убрать из подборки ${row.firm.name} ${row.product.name}`} onClick={() => toggle(row)}><X size={15} aria-hidden="true" /></button></li>)}</ul><button type="button" onClick={openComparison}>Открыть таблицу сравнения <ArrowRight size={15} aria-hidden="true" /></button></>}
        </div>
        {rows.length === 0 && <div className="ru-notice">В нашем текущем наборе нет программы с таким сочетанием условий. Измените бюджет, размер или этапы. Это не означает, что таких предложений нет на всём рынке.</div>}
        <div className="ru-finder-results">
          {rows.map(row => {
            const tier = finderTier(row, filters.size)!
            const key = challengeKey(row)
            const isSelected = selected.includes(key)
            return <article className={`ru-finder-card${isSelected ? ' ru-finder-card--selected' : ''}`} key={key} data-finder-product={key}>
              <header><Image src={row.firm.logo} alt="" width={38} height={38} /><div><span>{row.firm.name}</span><h3>{row.product.name}</h3></div><span className="ru-finder-phase">{phaseLabel(row.product.phases)}</span></header>
              <div className="ru-finder-price"><strong>{priceLabel(tier)}</strong><span>базовый взнос{row.product.pricingModel === 'monthly-subscription' ? ' за месяц' : ''}</span></div>
              <dl className="ru-finder-facts"><div><dt>Цель оценки</dt><dd>{targets(row)}</dd></div><div><dt>Общий лимит убытка</dt><dd>{percent(row.product.maxLossPct)} · {drawdownLabel(row.product.drawdownType)}</dd></div><div><dt>Дневной лимит</dt><dd>{percent(row.product.dailyLossPct)}</dd></div><div><dt>Доля трейдера</dt><dd>{percent(row.product.profitSplitPct)}</dd></div></dl>
              <p className="ru-finder-payout"><strong>Первый запрос выплаты:</strong> {payoutLabel(row)}. Дополнительные условия и проверка правил сохраняются.</p>
              <details className="ru-finder-details"><summary>Важные ограничения и полная стоимость</summary>
                <p>Минимальные учтённые обязательные платежи{row.product.phases > 0 ? ' до счёта после оценки' : ' для начала участия'}: <strong>{fundedCostLabel(tier)}</strong>. Повторные попытки, дополнительные месяцы и необязательные опции не включены. Это не средний расход и не гарантия выплаты.</p>
                <ul><li>Новости: {ruleLabel(row.product.rules.news)}</li><li>Советники: {ruleLabel(row.product.rules.ea)}</li><li>Выходные: {ruleLabel(row.product.rules.weekend)}</li></ul>
                <ProgrammeCaveat row={row} />
                <p>Цены и правила: <a href={row.product.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">официальный источник</a> · {row.product.capturedAt}.</p>
              </details>
              <div className="ru-finder-card-actions"><button type="button" aria-pressed={isSelected} aria-label={`${isSelected ? 'Убрать из сравнения' : 'Сравнить'} ${row.firm.name} ${row.product.name}`} disabled={!isSelected && selected.length >= 3} onClick={() => toggle(row)}>{isSelected ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{isSelected ? 'В сравнении' : 'Сравнить'}</button><Link href={row.firm.reviewUrl}>Разбор правил <ArrowRight size={14} aria-hidden="true" /></Link></div>
              <Link className="ru-finder-visit" href={`/go/${row.firm.slug}?from=ru-challenge-finder-${row.product.slug}`} prefetch={false} rel={row.firm.isPartner ? 'sponsored nofollow noopener' : 'nofollow noopener'}>Проверить условия у {row.firm.name} ↗</Link>
              <span className="ru-source-line">Данные проверены: {row.product.capturedAt}{row.firm.isPartner ? ' · Партнёрская ссылка' : ' · Без партнёрской комиссии'}</span>
            </article>
          })}
        </div>
        {compared.length > 0 && <aside className="ru-finder-shortlist-bar" aria-label="Панель выбранных программ"><span>В сравнении: {compared.length}/3</span><button type="button" onClick={openComparison}>Посмотреть отличия <ArrowRight size={15} aria-hidden="true" /></button><button type="button" aria-label="Очистить сравнение" onClick={() => commit(filters, [])}><X size={16} aria-hidden="true" /></button></aside>}
        {compared.length > 0 && <section id="sravnenie-programm" tabIndex={-1} className="ru-finder-comparison" aria-label="Выбранные программы" data-finder-shortlist="three-products">
          <div className="ru-finder-toolbar"><h3>Ваше сравнение · {compared.length}/3</h3><button type="button" onClick={copy}><Link2 size={15} aria-hidden="true" />Поделиться сравнением</button></div>
          {compared.length === 1 && <p>Добавьте ещё одну программу, чтобы увидеть отличия рядом.</p>}
          <p className="ru-finder-scroll-hint">На узком экране прокрутите таблицу вправо, чтобы увидеть все выбранные программы.</p>
          <div className="ru-finder-table-wrap" tabIndex={0} role="region" aria-label="Таблица сравнения; на узком экране прокручивается вправо"><table>
            <caption>Один размер: {accountLabel(filters.size)}. Разные валюты не означают равную стоимость.</caption>
            <thead><tr><th scope="col">Условие</th>{compared.map(row => <th scope="col" key={challengeKey(row)}>{row.firm.name}<br />{row.product.name}<button type="button" aria-label={`Убрать ${row.product.name}`} onClick={() => toggle(row)}><X size={16} aria-hidden="true" /></button></th>)}</tr></thead>
            <tbody>{[
              ['Базовый взнос', (row: GlobalChallengeRow) => priceLabel(finderTier(row, filters.size))],
              ['Минимальные обязательные платежи', (row: GlobalChallengeRow) => fundedCostLabel(finderTier(row, filters.size))],
              ['Этапы и цели', (row: GlobalChallengeRow) => `${phaseLabel(row.product.phases)} · ${targets(row)}`],
              ['Дневной / общий лимит', (row: GlobalChallengeRow) => `${percent(row.product.dailyLossPct)} / ${percent(row.product.maxLossPct)}`],
              ['Расчёт общей просадки', (row: GlobalChallengeRow) => drawdownLabel(row.product.drawdownType)],
              ['Доля трейдера', (row: GlobalChallengeRow) => percent(row.product.profitSplitPct)],
              ['Первый запрос выплаты', payoutLabel],
              ['Новости / советники', (row: GlobalChallengeRow) => `${ruleLabel(row.product.rules.news)} / ${ruleLabel(row.product.rules.ea)}`],
              ['Дата источника', (row: GlobalChallengeRow) => row.product.capturedAt],
            ].map(([label, read]) => {
              const values = compared.map(row => (read as (row: GlobalChallengeRow) => string)(row))
              const different = new Set(values).size > 1
              return <tr key={label as string} className={different ? 'ru-finder-different' : undefined}><th scope="row">{label as string}{different && <small>Есть отличия</small>}</th>{values.map((value, index) => <td key={challengeKey(compared[index])}>{value}</td>)}</tr>
            })}</tbody>
          </table></div>
          <p>Подсветка показывает различия, а не победителя. Меньший взнос не компенсирует неподходящие правила просадки или выплаты.</p>
        </section>}
      </>}
      <div className="ru-notice ru-finder-country" data-russian-country-boundary="finder-not-access"><strong>Сравнение не подтверждает доступность программы для вас.</strong> До оплаты проверьте гражданство, страну проживания, документы, способы оплаты и получения прибыли. <Link href="/ru/dlya-russkoyazychnykh-treyderov">Как проверить страну и KYC →</Link></div>
    </div>
  </section>
}
