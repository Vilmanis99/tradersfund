'use client'

import { useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { PickerFirm } from './challengeFacts'

const COPY = {
  en: { first: 'First firm', second: 'Second firm', submit: 'Compare', same: 'Pick two different firms.' },
  ru: { first: 'Первая фирма', second: 'Вторая фирма', submit: 'Сравнить', same: 'Выберите две разные фирмы.' },
} as const

/** Same rule as lib/comparisons canonicalMatchupSlug (kept local so no server code ships to the client). */
function canonical(a: string, b: string) {
  return [a, b].sort().join('-vs-')
}

/**
 * Two selects and a Compare button. With JS the button opens the pair's page
 * (canonical order; the RU page where one exists). Without JS the form submits
 * to `fallbackHref`, the full comparison directory, so it still leads somewhere real.
 */
export default function FirmPairPicker({ locale, firms, pairHrefs, fallbackHref, initial }: {
  locale: 'en' | 'ru'
  firms: PickerFirm[]
  pairHrefs: Record<string, string>
  fallbackHref: string
  initial: [string, string]
}) {
  const t = COPY[locale]
  const router = useRouter()
  const id = useId()
  const [a, setA] = useState(initial[0])
  const [b, setB] = useState(initial[1])
  const same = a !== '' && a === b

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!a || !b || same) return
    router.push(pairHrefs[canonical(a, b)] ?? fallbackHref)
  }

  return (
    <form className="uc-picker" action={fallbackHref} method="get" onSubmit={onSubmit} data-home-firm-picker={locale}>
      <div className="uc-picker__fields">
        <label className="uc-picker__field">
          <span>{t.first}</span>
          <select name="a" value={a} onChange={event => setA(event.target.value)}>
            {firms.map(firm => <option key={firm.slug} value={firm.slug}>{firm.name}</option>)}
          </select>
        </label>
        <span className="uc-picker__vs" aria-hidden="true">vs</span>
        <label className="uc-picker__field">
          <span>{t.second}</span>
          <select name="b" value={b} onChange={event => setB(event.target.value)}>
            {firms.map(firm => <option key={firm.slug} value={firm.slug}>{firm.name}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" className="th-btn th-btn--ghost th-btn--sm uc-picker__submit" disabled={same} aria-describedby={same ? `${id}-same` : undefined}>{t.submit}</button>
      {same ? <p id={`${id}-same`} className="uc-picker__hint" role="status">{t.same}</p> : null}
    </form>
  )
}
