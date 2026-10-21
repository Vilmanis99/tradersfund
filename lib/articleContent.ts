export interface ArticleHeading { text: string; id: string }

export function articlePlainText(html: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }
  return html.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return entities[name.toLowerCase()] ?? entity
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity
  }).replace(/\s+/g, ' ').trim()
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const idAttribute = /\s+id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
function readIds(attrs: string) {
  return [...attrs.matchAll(idAttribute)].map(match => articlePlainText(match[1] ?? match[2] ?? match[3]))
}

/** Extract only authored, visible question/answer pairs from a named section.
 * Repository HTML is trusted; comments and scripts never become answers.
 */
export function extractArticleFaq(source: string, sectionName = 'FAQ') {
  const clean = source.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
  const sections = [...clean.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)]
  const section = sections.find(match => articlePlainText(match[1]).toLowerCase() === sectionName.toLowerCase())
  if (!section) return []
  return [...section[2].matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/gi)]
    .map(match => ({
      q: articlePlainText(match[1]),
      a: [...match[2].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(p => articlePlainText(p[1])).filter(Boolean).join(' '),
    }))
    .filter(({ q, a }) => q && a)
}

// ── Phase 0 article format (design/article-format-spec.md §4 C4, C7; §5) ──

const TABLE_TAGS = /<(table|thead|tbody|tfoot|tr|th|td|caption|col|colgroup)\b([^>]*)>/gi
const STYLE_ATTR = /\s+style\s*=\s*(?:"[^"]*"|'[^']*')/gi
const CLASS_ATTR = /\s+class\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const ROW = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
const CELL = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi
// A cell counts as numeric when it is a figure, price, percentage or range of those.
const FIGURE = String.raw`(?:US\$|[$€£₹])?\s?\d[\d,.]*\s?(?:%|[kK]|x)?`
const NUMERIC_CELL = new RegExp(String.raw`^[~≈<>]?\s*${FIGURE}(?:\s?(?:[–-]|to)\s?${FIGURE})?$`)
const EMPTY_CELL = /^(?:[—–-]|n\/a)?$/i

function addClass(attrs: string, name: string) {
  const match = attrs.match(CLASS_ATTR)
  if (!match) return `${attrs} class="${name}"`
  const existing = match[1] ?? match[2] ?? ''
  return attrs.replace(CLASS_ATTR, ` class="${`${existing} ${name}`.trim()}"`)
}

/** Drop authored inline styles so the theme controls tables; keep bold emphasis as a class. */
function stripTableStyles(markup: string) {
  return markup.replace(TABLE_TAGS, (_tag, name: string, attrs: string) => {
    const styles = [...attrs.matchAll(/\s+style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m => m[1] ?? m[2] ?? '').join(';')
    let next = attrs.replace(STYLE_ATTR, '')
    if (/^t[hd]$/i.test(name) && /font-weight\s*:\s*(?:[6-9]00|bold)/i.test(styles)) next = addClass(next, 'cell-strong')
    if (/^tr$/i.test(name) && /background\s*:\s*var\(--bg3\)/i.test(styles)) next = addClass(next, 'row-shaded')
    return `<${name}${next}>`
  })
}

/**
 * Table layout data for CSS: column count, a data-label per body cell (taken
 * from the header row) for the stacked mobile view, and right-aligned numeric
 * columns. Tables with colspan/rowspan or no header row keep the plain layout.
 */
function annotateTable(markup: string) {
  const rows = [...markup.matchAll(ROW)].map(match => match[0])
  const theadRow = markup.match(/<thead\b[^>]*>[\s\S]*?(<tr\b[^>]*>[\s\S]*?<\/tr>)/i)?.[1]
  const firstRow = rows[0]
  const headerRow = theadRow
    ?? (firstRow && [...firstRow.matchAll(CELL)].every(cell => cell[1].toLowerCase() === 'th') ? firstRow : undefined)
  const header = headerRow ? [...headerRow.matchAll(CELL)].map(cell => articlePlainText(cell[3])) : []
  const hasSpan = /\s(?:colspan|rowspan)\s*=/i.test(markup)
  const bodyRows = rows.filter(row => row !== headerRow)
  const columns = header.length || Math.max(0, ...rows.map(row => [...row.matchAll(CELL)].length))
  const cellsByColumn: string[][] = Array.from({ length: columns }, () => [])
  for (const row of bodyRows) {
    [...row.matchAll(CELL)].forEach((cell, index) => cellsByColumn[index]?.push(articlePlainText(cell[3])))
  }
  const numericColumns = new Set(cellsByColumn.flatMap((cells, index) => {
    if (index === 0 || hasSpan) return []
    const filled = cells.filter(text => !EMPTY_CELL.test(text))
    return filled.length > 0 && filled.every(text => NUMERIC_CELL.test(text)) ? [index] : []
  }))
  const labelled = Boolean(header.length) && !hasSpan
  let html = markup
  if (labelled || numericColumns.size) {
    html = markup.replace(ROW, row => {
      const isHeader = row === headerRow
      let index = 0
      return row.replace(CELL, (_cell, tag: string, attrs: string, content: string) => {
        let next = attrs
        if (numericColumns.has(index)) next = addClass(next, 'num')
        if (labelled && !isHeader && header[index] && !/\sdata-label\s*=/i.test(next)) {
          next = `${next} data-label="${escapeAttribute(header[index])}"`
        }
        index += 1
        return `<${tag}${next}>${content}</${tag}>`
      })
    })
  }
  // §5: tables with ≤3 columns stay tables on mobile; wider labelled tables become cards.
  const layout = labelled && columns > 3 ? 'cards' : 'table'
  return { html, columns, layout }
}

const CALLOUTS: Array<{ lead: RegExp; kind: 'warning' | 'info' | 'example' | 'method'; collapsed?: boolean }> = [
  { lead: /^the gotchas?(?: in that table)?:$/i, kind: 'warning' },
  { lead: /^converting:$/i, kind: 'info' },
  { lead: /^worked example\.$/i, kind: 'example' },
  { lead: /^where these prices come from\.$/i, kind: 'method', collapsed: true },
]

/** C7: a paragraph that opens with a known bold lead becomes a callout; text is unchanged. */
function convertCallout(markup: string) {
  const match = markup.match(/^<p\b([^>]*)>(\s*<strong>([\s\S]*?)<\/strong>)([\s\S]*)<\/p>$/i)
  if (!match) return markup
  const [, attrs, leadHtml, leadInner, rest] = match
  const rule = CALLOUTS.find(callout => callout.lead.test(articlePlainText(leadInner)))
  if (!rule) return markup
  const className = `article-callout article-callout--${rule.kind}`
  if (rule.collapsed) {
    return `<details class="${className}" data-callout="${rule.kind}"><summary>${leadHtml.trim()}</summary><p${attrs}>${rest.trim()}</p></details>`
  }
  return `<div class="${className}" data-callout="${rule.kind}" role="note">${markup}</div>`
}

/** Enhance trusted repository article HTML, not arbitrary user-supplied markup.
 * Keep authored anchors and table contents; derive navigation from the same pass.
 */
export function prepareArticleContent(source: string): { html: string; headings: ArticleHeading[] } {
  const headings: ArticleHeading[] = []
  // Reserve later authored IDs too, so a generated heading cannot steal one.
  const reserved = new Set([...source.matchAll(/<[a-z][^>]*>/gi)].flatMap(match => readIds(match[0])))
  const used = new Set([...source.matchAll(/<(?!h2\b)[a-z][^>]*>/gi)].flatMap(match => readIds(match[0])))
  let tableNumber = 0
  let section = 'Article data'
  const html = source.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<h2\b([^>]*)>([\s\S]*?)<\/h2>|<table\b[^>]*>[\s\S]*?<\/table>|<p\b[^>]*>\s*<strong>[\s\S]*?<\/p>/gi, (markup, attrs: string | undefined, content: string | undefined) => {
    if (/^<table\b/i.test(markup)) {
      tableNumber += 1
      const label = escapeAttribute(`Table ${tableNumber}: ${section}. Scroll horizontally to see all columns.`)
      const table = annotateTable(stripTableStyles(markup))
      return `<div class="article-table" data-cols="${table.columns}" data-layout="${table.layout}"><div class="article-table-scroll" tabindex="0" role="region" aria-label="${label}">${table.html}</div><span class="article-table__hint" aria-hidden="true">Scroll →</span></div>`
    }
    if (/^<p\b/i.test(markup)) return convertCallout(markup)
    if (attrs === undefined || content === undefined) return markup
    const text = articlePlainText(content)
    if (!text) return markup
    const authoredId = readIds(attrs)[0]
    // Retain the existing English auto-generated fragment convention for old links.
    const legacySlug = content.replace(/<[^>]+>/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const base = authoredId || legacySlug || text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section'
    let id = base
    let suffix = 2
    while (used.has(id) || (id !== authoredId && reserved.has(id))) id = `${base}-${suffix++}`
    used.add(id)
    headings.push({ text, id })
    section = text
    return `<h2${attrs.replace(idAttribute, '')} id="${escapeAttribute(id)}">${content}</h2>`
  })
  return { html, headings }
}

/** First sentence of the review's own "Verdict" section, unchanged. */
export function firstVerdictSentence(content: string) {
  const match = content.match(/<h2\b[^>]*>\s*(?:<strong>)?\s*Verdict\s*(?:<\/strong>)?\s*<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)
  if (!match) return null
  const text = articlePlainText(match[1])
  const sentence = text.match(/^[\s\S]+?[.!?](?=\s+[A-Z]|$)/)
  const first = (sentence ? sentence[0] : text).trim()
  // A sentence that describes the article ("This X review covers…") is not a verdict.
  if (!first || /^this\b[^.]*\breview\b/i.test(first)) return null
  return first
}
