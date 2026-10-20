'use client'

import { useEffect } from 'react'

// Article format Phase 0 (design/article-format-spec.md C4): marks horizontally
// scrollable table containers so CSS can show the right-edge fade and the
// "Scroll →" hint only when a table really overflows. Attributes only; no
// layout changes, so nothing shifts when it runs.
const SELECTOR = '.article-table-scroll, .ru-table-wrap, .cm-scroll'

function update(el: HTMLElement) {
  const overflowing = el.scrollWidth - el.clientWidth > 2
  const atEnd = !overflowing || el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
  el.dataset.overflowing = String(overflowing)
  el.dataset.atEnd = String(atEnd)
  // Limit the edge fade to the table itself; some containers also hold a footnote.
  const table = el.querySelector(':scope > table')
  if (table instanceof HTMLElement) el.style.setProperty('--table-cue-h', `${Math.round(table.getBoundingClientRect().bottom - el.getBoundingClientRect().top)}px`)
  const frame = el.parentElement?.classList.contains('article-table') ? el.parentElement : null
  if (frame) {
    frame.dataset.overflowing = String(overflowing)
    frame.dataset.atEnd = String(atEnd)
  }
}

export default function TableOverflowCue() {
  useEffect(() => {
    const tracked = new WeakSet<HTMLElement>()
    const resize = new ResizeObserver(entries => entries.forEach(entry => update(entry.target as HTMLElement)))
    const onScroll = (event: Event) => update(event.currentTarget as HTMLElement)
    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach(el => {
        if (tracked.has(el)) return update(el)
        tracked.add(el)
        resize.observe(el)
        el.addEventListener('scroll', onScroll, { passive: true })
        update(el)
      })
    }
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(scan)
    }
    scan()
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [])
  return null
}
