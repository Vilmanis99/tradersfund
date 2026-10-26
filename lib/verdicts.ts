// Explicit extensions keep this module executable from the Node test scripts.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

/**
 * Hand-written verdicts for programmatic pages (W44, Dev spec 26.10.2026).
 *
 *   content/verdicts/rules/<firm-slug>.md      EN verdict on /prop-firms/<firm-slug>/rules
 *   content/verdicts/rules/<firm-slug>.ru.md   RU verdict on the RU rules twin (/ru/<firm>-pravila)
 *   content/verdicts/vs/<pair-slug>.md         EN verdict on /compare/<pair-slug>
 *
 * <pair-slug> is the canonical alphabetical matchup from lib/comparisons.ts
 * (canonicalMatchupSlug), e.g. bright-funded-vs-ftmo.
 *
 * Frontmatter (all required):
 *   slug:      firm slug or pair slug; must equal the file name
 *   lang:      en | ru; must match the file suffix (.md = en, .ru.md = ru)
 *   checkedAt: YYYY-MM-DD, the date the writer checked every claim against the data
 *   sources:   [{ title, url }], at least one; url is https://… or a site path (/blog/…)
 *   author:    display name
 * Optional, not rendered: firm, dataAsOf (YYYY-MM-DD), fieldsUsed [], dataFiles []
 * (repo files the writer read, e.g. content/data/firms.json — never put repo paths in sources).
 * Body: markdown, 120–250 words (paragraphs, **bold**, *italic*, [links](url), "- " lists).
 *
 * A missing file means "no verdict": the section is omitted and the rules page
 * stays noindex (RULES_REQUIRE_VERDICT in lib/rulesPages.ts). A present but
 * invalid file fails the build loudly instead of silently disappearing.
 */
export type VerdictKind = 'rules' | 'vs'
export type VerdictLang = 'en' | 'ru'

export interface VerdictSource { title: string; url: string }
export interface Verdict {
  kind: VerdictKind
  slug: string
  lang: VerdictLang
  checkedAt: string
  sources: VerdictSource[]
  author: string
  body: string
  wordCount: number
  file: string
}

export const VERDICT_MIN_WORDS = 120
export const VERDICT_MAX_WORDS = 250

export function verdictDir(kind: VerdictKind, root = process.cwd()): string {
  return path.join(root, 'content/verdicts', kind)
}

export function verdictFile(kind: VerdictKind, slug: string, lang: VerdictLang = 'en', root = process.cwd()): string {
  return path.join(verdictDir(kind, root), lang === 'ru' ? `${slug}.ru.md` : `${slug}.md`)
}

/** Words as a reader sees them: markdown link targets and syntax are not counted. */
export function verdictWordCount(markdown: string): number {
  const text = markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, ' ')
    .replace(/^\s*-\s+/gm, ' ')
  return text.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Validation problems for one parsed verdict file; empty when valid. */
export function verdictProblems(
  data: Record<string, unknown>,
  body: string,
  expected: { kind: VerdictKind; slug: string; lang: VerdictLang },
): string[] {
  const problems: string[] = []
  if (data.slug !== expected.slug) problems.push(`slug must be "${expected.slug}" (got ${JSON.stringify(data.slug)})`)
  if (data.lang !== expected.lang) problems.push(`lang must be "${expected.lang}" (got ${JSON.stringify(data.lang)})`)
  // gray-matter (js-yaml) turns unquoted dates into Date objects; accept both.
  const checkedAt = data.checkedAt instanceof Date ? data.checkedAt.toISOString().slice(0, 10) : data.checkedAt
  if (typeof checkedAt !== 'string' || !isRealIsoDate(checkedAt)) problems.push('checkedAt must be a real YYYY-MM-DD date')
  if (typeof data.author !== 'string' || !data.author.trim()) problems.push('author is required')
  const sources = data.sources
  if (!Array.isArray(sources) || sources.length === 0) {
    problems.push('sources must list at least one { title, url }')
  } else {
    sources.forEach((source, index) => {
      const item = source as Partial<VerdictSource> | null
      if (!item || typeof item.title !== 'string' || !item.title.trim()) problems.push(`sources[${index}].title is required`)
      if (!item || typeof item.url !== 'string' || !/^(https:\/\/[^\s]+|\/[^\s/][^\s]*)$/.test(item.url)) problems.push(`sources[${index}].url must be an https URL or a site path starting with /`)
    })
  }
  if (data.dataAsOf !== undefined) {
    const dataAsOf = data.dataAsOf instanceof Date ? data.dataAsOf.toISOString().slice(0, 10) : data.dataAsOf
    if (typeof dataAsOf !== 'string' || !isRealIsoDate(dataAsOf)) problems.push('dataAsOf must be a real YYYY-MM-DD date when present')
  }
  const words = verdictWordCount(body)
  if (words < VERDICT_MIN_WORDS || words > VERDICT_MAX_WORDS) {
    problems.push(`body must be ${VERDICT_MIN_WORDS}–${VERDICT_MAX_WORDS} words (got ${words})`)
  }
  return problems
}

export function loadVerdict(kind: VerdictKind, slug: string, lang: VerdictLang = 'en', root = process.cwd()): Verdict | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const file = verdictFile(kind, slug, lang, root)
  if (!fs.existsSync(file)) return null
  const parsed = matter(fs.readFileSync(file, 'utf8'))
  const data = parsed.data as Record<string, unknown>
  const body = parsed.content.trim()
  const problems = verdictProblems(data, body, { kind, slug, lang })
  if (problems.length) {
    throw new Error(`Invalid verdict ${path.relative(root, file)}: ${problems.join('; ')}`)
  }
  const checkedAt = data.checkedAt instanceof Date ? data.checkedAt.toISOString().slice(0, 10) : String(data.checkedAt)
  return {
    kind,
    slug,
    lang,
    checkedAt,
    sources: (data.sources as VerdictSource[]).map(source => ({ title: source.title.trim(), url: source.url.trim() })),
    author: String(data.author).trim(),
    body,
    wordCount: verdictWordCount(body),
    file: path.relative(root, file),
  }
}

/** Every verdict file on disk, for validation tests. */
export function listVerdictFiles(root = process.cwd()): Array<{ kind: VerdictKind; slug: string; lang: VerdictLang; file: string }> {
  const out: Array<{ kind: VerdictKind; slug: string; lang: VerdictLang; file: string }> = []
  for (const kind of ['rules', 'vs'] as const) {
    const dir = verdictDir(kind, root)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith('.md') || name.startsWith('_') || name.toUpperCase() === 'README.MD') continue
      const lang: VerdictLang = name.endsWith('.ru.md') ? 'ru' : 'en'
      const slug = name.replace(/\.ru\.md$|\.md$/, '')
      out.push({ kind, slug, lang, file: path.join(dir, name) })
    }
  }
  return out
}

/* ── Minimal, escaped markdown → HTML for verdict bodies ───────────── */

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(text: string): string {
  let html = escapeHtml(text)
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    const url = href.replace(/&amp;/g, '&')
    if (url.startsWith('/go/')) {
      return `<a href="${escapeHtml(url)}" rel="sponsored nofollow noopener" target="_blank">${label}</a>`
    }
    if (url.startsWith('/')) return `<a href="${escapeHtml(url)}">${label}</a>`
    if (/^https:\/\//.test(url)) {
      return `<a href="${escapeHtml(url)}" rel="nofollow noopener noreferrer" target="_blank">${label}</a>`
    }
    return label
  })
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return html
}

export function renderVerdictMarkdown(markdown: string): string {
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n{2,}/).map(block => block.trim()).filter(Boolean)
  return blocks.map(block => {
    const lines = block.split('\n')
    if (lines.every(line => /^\s*-\s+/.test(line))) {
      return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`
    }
    return `<p>${inline(lines.join(' '))}</p>`
  }).join('\n')
}
