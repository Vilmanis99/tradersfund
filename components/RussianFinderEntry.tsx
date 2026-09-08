'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_FINDER_FILTERS, serializeFinderState, type ChallengeFinderFilters } from '@/lib/challengeComparison'
import { trackSiteEvent } from '@/lib/clientAnalytics'

export default function RussianFinderEntry({ sizes }: { sizes: number[] }) {
  const [size, setSize] = useState(sizes.includes(50000) ? 50000 : sizes[0])
  const [phases, setPhases] = useState<ChallengeFinderFilters['phases']>('all')
  if (!sizes.length) return <Link href="/ru/luchshie-prop-firmy" className="btn-primary">Открыть сравнение фирм <ArrowRight size={16} aria-hidden="true" /></Link>
  return <div className="ru-finder-entry" data-russian-home-finder="programme-entry">
    <label>Размер счёта в USD<select value={size} onChange={event => setSize(Number(event.target.value))}>{sizes.map(value => <option value={value} key={value}>{value.toLocaleString('ru-RU')} USD</option>)}</select></label>
    <label>Оценочные этапы<select value={phases} onChange={event => setPhases(event.target.value as ChallengeFinderFilters['phases'])}><option value="all">Все варианты</option><option value="0">Без челленджа</option><option value="1">1 этап</option><option value="2">2 этапа</option></select></label>
    <Link href={`/ru/luchshie-prop-firmy#${serializeFinderState({ ...DEFAULT_FINDER_FILTERS, size, phases }, [])}`} className="btn-primary" onClick={() => trackSiteEvent('russian_finder_entry', { surface: 'russian_home', account_size: size, phases })}>Сравнить программы <ArrowRight size={16} aria-hidden="true" /></Link>
  </div>
}
