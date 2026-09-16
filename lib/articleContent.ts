export interface ArticleHeading { text: string; id: string }

function plainText(html: string) {
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
  return [...attrs.matchAll(idAttribute)].map(match => plainText(match[1] ?? match[2] ?? match[3]))
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
  const html = source.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<h2\b([^>]*)>([\s\S]*?)<\/h2>|<table\b[^>]*>[\s\S]*?<\/table>/gi, (markup, attrs: string | undefined, content: string | undefined) => {
    if (/^<table\b/i.test(markup)) {
      tableNumber += 1
      const label = escapeAttribute(`Table ${tableNumber}: ${section}. Scroll horizontally to see all columns.`)
      return `<div class="article-table-scroll" tabindex="0" role="region" aria-label="${label}">${markup}</div>`
    }
    if (attrs === undefined || content === undefined) return markup
    const text = plainText(content)
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
