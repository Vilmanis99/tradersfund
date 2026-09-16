'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_FINDER_FILTERS, challengeKey, filterChallengeRows, finderTier, finderAccountSizes, resolveFinderSize, serializeFinderState, type ChallengeFinderFilters, type GlobalChallengeRow } from '@/lib/challengeComparison'
import { trackSiteEvent } from '@/lib/clientAnalytics'

export default function RussianFinderEntry({ rows }: { rows: GlobalChallengeRow[] }) {
  const sizes = finderAccountSizes(rows)
  const [requestedSize, setSize] = useState(resolveFinderSize(sizes))
  const [phases, setPhases] = useState<ChallengeFinderFilters['phases']>('all')
  const size = resolveFinderSize(sizes, requestedSize)
  if (size === undefined) return <div><p>Сейчас нет программ с актуальной проверкой источников. Обзоры и пояснения остаются доступны.</p><Link href="/ru/luchshie-prop-firmy" className="btn-primary">Открыть сравнение фирм <ArrowRight size={16} aria-hidden="true" /></Link></div>
  const filters = { ...DEFAULT_FINDER_FILTERS, size, phases }
  const matching = filterChallengeRows(rows, filters)
  const represented = new Set<string>()
  const preview = matching.filter(row => {
    if (represented.has(row.firm.slug)) return false
    represented.add(row.firm.slug)
    return true
  }).slice(0, 3)
  const fee = (row: GlobalChallengeRow) => {
    const tier = finderTier(row, size)!
    const amounts = [
      tier.priceUsd != null && tier.priceUsd > 0 ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(tier.priceUsd) : null,
      tier.priceEur != null && tier.priceEur > 0 ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(tier.priceEur) : null,
    ].filter(Boolean)
    return amounts.length ? amounts.join(' / ') : 'Цена не подтверждена'
  }
  return <div className="ru-home-finder-workspace" data-russian-home-finder="programme-entry">
    <div className="ru-finder-entry">
    <label>Размер счёта в USD<select value={size} onChange={event => setSize(Number(event.target.value))}>{sizes.map(value => <option value={value} key={value}>{value.toLocaleString('ru-RU')} USD</option>)}</select></label>
    <label>Оценочные этапы<select value={phases} onChange={event => setPhases(event.target.value as ChallengeFinderFilters['phases'])}><option value="all">Все варианты</option><option value="0">Без челленджа</option><option value="1">1 этап</option><option value="2">2 этапа</option><option value="3">3 этапа</option></select></label>
    </div>
    <div className="ru-home-finder-results" aria-live="polite" aria-atomic="true">
      <p className="ru-home-finder-count" data-russian-home-result-count={matching.length}>{matching.length ? `Найдено программ: ${matching.length}` : 'Для этих параметров нет программ с текущей проверкой источников'}</p>
      {preview.length > 0 && <ul>{preview.map(row => (
        <li key={challengeKey(row)} data-russian-home-preview-product={challengeKey(row)}>
          <Link href={`/ru/luchshie-prop-firmy#${serializeFinderState(filters, [challengeKey(row)])}`}>
            <span><strong>{row.firm.name}</strong><span>{row.product.name}</span><small>{{ cfd: 'CFD', futures: 'Фьючерсы', crypto: 'Криптовалюты', 'prediction-markets': 'Рынки прогнозов' }[row.product.assetClass]} · Проверено {row.product.capturedAt}</small></span>
            <span className="ru-home-finder-fee"><strong>{fee(row)}</strong><small>{row.product.pricingModel === 'monthly-subscription' ? 'в месяц; доплаты отдельно' : row.product.pricingModel === 'split-payment' ? 'первый взнос' : 'базовый взнос'}</small></span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </li>
      ))}</ul>}
    </div>
    {preview.length > 0 && <p className="home-finder-note">Примеры по алфавиту, по одной программе фирмы. Рынки и порядок оплаты могут различаться. Валюты не пересчитываем; партнёрство не влияет на порядок.</p>}
    <Link href={`/ru/luchshie-prop-firmy#${serializeFinderState(filters, [])}`} className="btn-primary" onClick={() => trackSiteEvent('russian_finder_entry', { surface: 'russian_home', account_size: size, phases })}>Сравнить программы <ArrowRight size={16} aria-hidden="true" /></Link>
  </div>
}
