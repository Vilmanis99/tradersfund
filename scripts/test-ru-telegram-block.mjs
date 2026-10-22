/**
 * RU Telegram block (components/RuTelegramBlock.tsx) on the prerendered build output.
 * Run after `next build`. Checks that:
 * - every RU review (/ru/obzor-*) and RU comparison (/ru/*-vs-*) renders the in-content
 *   block once, after the verdict box, with utm_campaign = the page slug;
 * - every prerendered RU page renders the RU footer block (utm_campaign=footer);
 * - each link is exactly https://t.me/tradersfundhub_rus?utm_source=site&utm_medium=tg_block&utm_campaign=…,
 *   target="_blank" and rel="noopener" (not sponsored);
 * - no EN page renders the block or links to the channel.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const built = join(root, '.next/server/app')
assert.ok(existsSync(built), 'No build output: run `next build` first')

const CHANNEL = 'https://t.me/tradersfundhub_rus'
const hrefFor = campaign => `${CHANNEL}?utm_source=site&utm_medium=tg_block&utm_campaign=${campaign}`

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.html')) out.push(full)
  }
  return out
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
function telegramLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bdata-ru-telegram-link="([^"]+)"[^>]*>/g)].map(m => {
    const tag = m[0]
    const attr = name => { const v = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return v ? decode(v[1]) : null }
    return { placement: m[1], href: attr('href'), rel: attr('rel'), target: attr('target'), index: m.index }
  })
}
function routeOf(file) {
  const rel = relative(built, file).replace(/\.html$/, '')
  return rel === 'index' ? '/' : `/${rel}`
}

const routeDirs = readdirSync(join(root, 'app/ru')).filter(name => statSync(join(root, 'app/ru', name)).isDirectory() && existsSync(join(root, 'app/ru', name, 'page.tsx')))
const reviewAndCompare = routeDirs.filter(name => /^obzor-/.test(name) || /-vs-/.test(name)).sort()
assert.ok(reviewAndCompare.filter(n => n.startsWith('obzor-')).length >= 8, 'expected at least 8 RU reviews')
assert.ok(reviewAndCompare.filter(n => n.includes('-vs-')).length >= 4, 'expected at least 4 RU comparisons')

const failures = []
const check = (cond, msg) => { if (!cond) failures.push(msg) }
const files = walk(built)
const ruFiles = files.filter(file => /^\/ru(\/|$)/.test(routeOf(file)) && !/_not-found|\(fallback\)/.test(file))
const enFiles = files.filter(file => !/^\/ru(\/|$)/.test(routeOf(file)) && !/_global-error|_not-found/.test(routeOf(file)))

for (const slug of reviewAndCompare) {
  const file = join(built, 'ru', `${slug}.html`)
  if (!existsSync(file)) { failures.push(`/ru/${slug}: no prerendered HTML`); continue }
  const html = readFileSync(file, 'utf8')
  const links = telegramLinks(html)
  const inContent = links.filter(link => link.placement === slug)
  check(inContent.length === 1, `/ru/${slug}: expected 1 in-content Telegram link, got ${inContent.length}`)
  for (const link of inContent) {
    check(link.href === hrefFor(slug), `/ru/${slug}: href ${link.href}`)
    check(link.rel === 'noopener', `/ru/${slug}: rel ${link.rel}`)
    check(link.target === '_blank', `/ru/${slug}: target ${link.target}`)
    // After the verdict box / pick block when the page renders one.
    const verdict = html.search(/data-ru-(?:verdict|pick-verdict)="\/ru\//)
    if (verdict >= 0) check(verdict < link.index, `/ru/${slug}: Telegram block comes before the verdict box`)
    // Never above the main sign-up CTA, so its offset is unchanged: the verdict-box CTA on reviews,
    // the first /go/ link (hero CTA) on comparisons. Era Trade, KasCapital, PropLive and TeamTraders
    // have no CTA of their own yet (not in firms.json), so there is nothing to keep above the block.
    const mainCta = slug.includes('-vs-') ? html.search(/<a\b[^>]*href="\/go\/[^"]+"/) : html.search(/data-ru-verdict-cta="/)
    if (mainCta >= 0) check(mainCta < link.index, `/ru/${slug}: Telegram block comes before the main CTA`)
    else check(!slug.includes('-vs-'), `/ru/${slug}: comparison without a /go/ CTA`)
  }
}

for (const file of ruFiles) {
  const route = routeOf(file)
  const footer = telegramLinks(readFileSync(file, 'utf8')).filter(link => link.placement === 'footer')
  check(footer.length === 1, `${route}: expected 1 RU footer Telegram link, got ${footer.length}`)
  for (const link of footer) {
    check(link.href === hrefFor('footer'), `${route}: footer href ${link.href}`)
    check(link.rel === 'noopener' && link.target === '_blank', `${route}: footer rel/target ${link.rel}/${link.target}`)
  }
}

for (const file of enFiles) {
  const html = readFileSync(file, 'utf8')
  check(!html.includes('t.me/tradersfundhub_rus') && !html.includes('data-ru-telegram'), `${routeOf(file)}: EN page renders the RU Telegram block`)
}

if (failures.length) {
  console.error(failures.map(f => `✗ ${f}`).join('\n'))
  process.exit(1)
}
console.log(`ru-telegram-block ok: ${reviewAndCompare.length} RU reviews/comparisons, ${ruFiles.length} RU pages with the footer block, ${enFiles.length} EN pages without it`)
