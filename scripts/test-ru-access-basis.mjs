// Guard for russiaBasis 'not-on-restricted-list' (EA 2026-10-23): a firm that is 'available' only because Russia is
// absent from its restricted list never renders «Открыта для РФ» in built RU HTML; its badge is the neutral
// «нет в списке ограничений (на DD.MM.YYYY)» with the date from data. Also guards that the basis changes no ordering:
// BrightFunded stays the first CTA and Russia-open firms keep sorting first on /ru and /ru/luchshie-prop-firmy.
// Pending 'available' (firms-pending.json only, EA 2026-10-26): neutral basis badge, data date or undated, never «Открыта для РФ».
// A pending entry with russiaBasis 'no-published-country-list' (TeamTraders: no country list at all) reads
// «ограничений по странам не опубликовано (на DD.MM.YYYY)»; firms that publish a list (BrightFunded, CFT) keep
// «нет в списке ограничений (на DD.MM.YYYY)». Both wordings are pinned here and in test:russia-status-pending.
// Server test (next start): node scripts/test-ru-access-basis.mjs [http://127.0.0.1:PORT]
// Optional RU_ORDER_BASE_URL=<base server> also requires the CTA order on both pages to equal the base build's.
import { readFileSync } from 'node:fs'
import { localPreviewUrl } from './local-preview-url.mjs'

const base = localPreviewUrl(process.argv[2]).replace(/\/$/, '')
const orderBase = process.env.RU_ORDER_BASE_URL?.replace(/\/$/, '')
const failures = []
const fail = msg => failures.push(msg)

const LEGACY = { brightfunded: 'bright-funded' }
const slugOf = name => { const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return LEGACY[s] ?? s }
const ruDate = iso => iso.split('-').reverse().join('.')
const LABEL = iso => (iso ? `нет в списке ограничений (на ${ruDate(iso)})` : 'нет в списке ограничений')
const NO_LIST_LABEL = iso => (iso ? `ограничений по странам не опубликовано (на ${ruDate(iso)})` : 'ограничений по странам не опубликовано')
const PENDING_LABEL = p => (p.basis === 'no-published-country-list' ? NO_LIST_LABEL(p.date) : LABEL(p.date))

const firms = JSON.parse(readFileSync('content/data/firms.json', 'utf8'))
const statusBySlug = Object.fromEntries(firms.map(f => [slugOf(f.name), f.russiaStatus ?? 'unverified']))
/** slug -> { name, date } for every list-absence firm (firms.json + lib/ruAccessExtra.ts). */
const basis = new Map()
for (const f of firms) {
  if (f.russiaBasis == null) continue
  if (!['not-on-restricted-list', 'positive-evidence'].includes(f.russiaBasis)) fail(`firms.json ${f.name}: unknown russiaBasis ${f.russiaBasis}`)
  if (f.russiaBasis !== 'not-on-restricted-list') continue
  if (f.russiaStatus !== 'available') fail(`firms.json ${f.name}: russiaBasis without russiaStatus 'available'`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.russiaSourceCapturedAt ?? '')) fail(`firms.json ${f.name}: russiaBasis needs russiaSourceCapturedAt YYYY-MM-DD`)
  basis.set(slugOf(f.name), { name: f.name, date: f.russiaSourceCapturedAt })
}
const extra = readFileSync('lib/ruAccessExtra.ts', 'utf8')
for (const m of extra.matchAll(/(\w+): \{\s*(?:russiaStatus: '\w+',\s*)?basis: 'not-on-restricted-list',\s*capturedAt: '(\d{4}-\d{2}-\d{2})'/g)) basis.set(m[1], { name: m[1] === 'upscale' ? 'Upscale' : m[1], date: m[2] })
for (const slug of ['bright-funded', 'crypto-fund-trader']) if (!basis.has(slug)) fail(`${slug}: expected russiaBasis 'not-on-restricted-list' in data`)
// (h) /ru/dlya-russkoyazychnykh-treyderov meta description (RU Writer 2026-10-28): the audit reads DESCRIPTION as a static
// single-quoted literal, so its «(на DD.MM.YYYY)» cannot call ruNotListedDates(['bright-funded', 'crypto-fund-trader']).
// Pin it to that data date (fails when Tracker moves it), and pin «15 фирм» / Беларусь / Казахстан to the rendered table source.
{
  const dlyaSource = readFileSync('app/ru/dlya-russkoyazychnykh-treyderov/page.tsx', 'utf8')
  const dlyaDescription = dlyaSource.match(/const DESCRIPTION = '([^']+)'/)?.[1] ?? ''
  const notListed = [...new Set(['bright-funded', 'crypto-fund-trader'].map(slug => basis.get(slug)?.date).filter(Boolean).map(ruDate))].join(' / ')
  if (!dlyaDescription.includes(`(на ${notListed})`)) fail(`/ru/dlya-russkoyazychnykh-treyderov: DESCRIPTION must carry «(на ${notListed})» (ruNotListedDates for BrightFunded/CFT); got "${dlyaDescription}"`)
  const rowsBlock = dlyaSource.match(/const rows: Row\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ''
  const tableFirms = new Set([...rowsBlock.matchAll(/\{ firm: '([^']+)'/g)].map(m => m[1].replace(/ \(CFD\)$| Futures$/, '')))
  const describedFirms = Number(dlyaDescription.match(/(\d+) фирм/)?.[1])
  if (tableFirms.size !== describedFirms) fail(`/ru/dlya-russkoyazychnykh-treyderov: DESCRIPTION says ${describedFirms} фирм, table rows cover ${tableFirms.size}`)
  if (dlyaDescription.includes('Беларуси и Казахстана') && !(dlyaSource.includes('<th>Беларусь</th>') && dlyaSource.includes('<th>Казахстан</th>'))) fail('/ru/dlya-russkoyazychnykh-treyderov: DESCRIPTION names Беларусь/Казахстан but the table has no such columns')
}
// Upscale (Prop Firm Tracker 2026-10-26, Terms of Use 15.05.2026): russiaStatus 'unclear', no list-absence basis.
const upscaleStatus = extra.match(/upscale: \{\s*russiaStatus: '(\w+)'/)?.[1] ?? null
if (upscaleStatus !== 'unclear') fail(`upscale: expected russiaStatus 'unclear' in lib/ruAccessExtra.ts, got ${upscaleStatus}`)
if (basis.has('upscale')) fail(`upscale: russiaBasis 'not-on-restricted-list' must not return without Tracker evidence`)
/** (e) Upscale copy that would present it as open for Russia / without KYC (RU Writer 2026-10-26). */
const UPSCALE_OPEN_COPY = [/нет в (?:её |их )?списк(?:е|ах) ограничений/i, /KYC нет/i, /Нет KYC/i, /не требует KYC/i, /Ограничений по странам не заявлено/i, /Географических ограничений нет/i, /открыт[аы]? (?:и )?для (?:РФ|России)/i, /не ограничивают Россию/i]
let upscaleSentences = 0
const positiveFirms = firms.filter(f => f.russiaStatus === 'available' && f.russiaBasis !== 'not-on-restricted-list').map(f => slugOf(f.name))
const basisNames = [...basis.values()].map(b => b.name)
// Pending 'available' firms (content/data/firms-pending.json only, EA 2026-10-26, e.g. TeamTraders): never «Открыта для РФ»;
// the badge is the neutral basis label with the entry's own russiaSourceCapturedAt, undated when it has none; status stays non-available.
const firmSlugs = new Set(firms.map(f => slugOf(f.name)))
const pendingOpen = new Map()
for (const f of JSON.parse(readFileSync('content/data/firms-pending.json', 'utf8')).firms) {
  if (f.russiaStatus !== 'available') continue
  const keys = [...new Set([slugOf(f.name), f.slug ? slugOf(f.slug) : null])].filter(Boolean)
  if (keys.some(k => firmSlugs.has(k))) continue
  const date = /^\d{4}-\d{2}-\d{2}$/.test(f.russiaSourceCapturedAt ?? '') ? f.russiaSourceCapturedAt : null
  const pendingBasis = f.russiaBasis === 'no-published-country-list' ? 'no-published-country-list' : 'not-on-restricted-list'
  if (f.russiaBasis != null && !['no-published-country-list', 'not-on-restricted-list'].includes(f.russiaBasis)) fail(`firms-pending ${f.name}: unknown russiaBasis ${f.russiaBasis}`)
  for (const k of keys) pendingOpen.set(k, { name: f.name, date, basis: pendingBasis })
}
const teamTraders = pendingOpen.get('teamtraders')
if (!teamTraders || teamTraders.basis !== 'no-published-country-list' || teamTraders.date !== '2026-10-20') fail(`TeamTraders: expected russiaBasis 'no-published-country-list' dated 2026-10-20 in firms-pending.json, got ${JSON.stringify(teamTraders)}`)
const listSeen = new Map()
const pendingNames = [...new Set([...pendingOpen.values()].map(p => p.name))]
let pendingBadges = 0
const pendingSeen = new Map()

async function get(path, root = base) {
  const res = await fetch(`${root}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.text()
}

const sitemap = await get('/sitemap.xml')
const ruPaths = [...new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/ru(?:\/[^<]*)?)<\/loc>/g)].map(m => m[1].replace(/\/$/, '') || '/ru'))]
if (!ruPaths.includes('/ru')) ruPaths.unshift('/ru')
if (ruPaths.length < 20) fail(`sitemap lists only ${ruPaths.length} RU pages`)

// React text-boundary comments (<!-- -->) are dropped first so «<!-- -->Открыта для РФ<!-- -->» still counts as a quoted label.
const visible = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<style\b[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ')
/** The <tr> that contains index, or '' when the badge is not inside a table row. */
function enclosingRow(html, index) {
  const start = html.lastIndexOf('<tr', index)
  if (start < 0 || !/^<tr[\s>]/.test(html.slice(start, start + 4))) return ''
  const end = html.indexOf('</tr>', start)
  return end > index ? html.slice(start, end) : ''
}
let neutralBadges = 0
let datedProse = 0
const datesSeen = new Map()
for (const path of ruPaths) {
  const html = await get(path)
  // (a) every badge of a basis firm is neutral with the data date.
  for (const m of html.matchAll(/<span class="ru-badge ru-badge--([a-z]+)"([^>]*)>([^<]*)<\/span>/g)) {
    const [, modifier, attrs, label] = m
    const firm = attrs.match(/data-russia-firm="([a-z0-9-]+)"/)?.[1] ?? null
    const rawFirm = attrs.match(/data-russia-firm="([^"]+)"/)?.[1] ?? null
    const pend = rawFirm ? pendingOpen.get(slugOf(rawFirm)) : undefined
    if (pend) {
      pendingBadges++
      pendingSeen.set(pend.name, `${path} «${label}»`)
      if (modifier !== 'neutral' || !attrs.includes(`data-russia-basis="${pend.basis}"`)) fail(`${path}: pending-available ${pend.name} badge is ru-badge--${modifier} «${label}» (${attrs.match(/data-russia-basis="[^"]*"/)?.[0] ?? 'no basis'}), expected the neutral ${pend.basis} badge`)
      if (label !== PENDING_LABEL(pend)) fail(`${path}: pending-available ${pend.name} badge reads «${label}», expected «${PENDING_LABEL(pend)}» (${pend.date ? 'firms-pending russiaSourceCapturedAt' : 'no pending date: undated'})`)
      if (!attrs.includes('data-russia-pending="available"')) fail(`${path}: pending-available ${pend.name} badge lacks data-russia-pending="available"`)
      if (attrs.includes('data-russia-status="available"')) fail(`${path}: pending-available ${pend.name} badge must not carry data-russia-status="available" (ranking/counters/CTA treat it as not available)`)
      continue
    }
    const b = firm ? basis.get(firm) : null
    if (b) {
      neutralBadges++
      datesSeen.set(firm, label)
      if (modifier !== 'neutral' || !attrs.includes('data-russia-basis="not-on-restricted-list"')) fail(`${path}: ${firm} badge is ru-badge--${modifier} «${label}», expected neutral`)
      if (label !== LABEL(b.date)) fail(`${path}: ${firm} badge reads «${label}», expected «${LABEL(b.date)}» (data date)`)
      if (['bright-funded', 'crypto-fund-trader'].includes(firm)) listSeen.set(firm, label)
      if (!attrs.includes('data-russia-status="available"')) fail(`${path}: ${firm} badge lost data-russia-status="available"`)
    }
    if (/открыт[аы] для РФ/i.test(label)) {
      if (b) continue // already reported above
      // Badge without data-russia-firm (curated tables): look at the enclosing row.
      const row = enclosingRow(html, m.index)
      const named = basisNames.find(name => visible(row).includes(name))
      if (named) fail(`${path}: «${label}» rendered for ${named} (russiaBasis not-on-restricted-list)`)
      const pendingNamed = pendingNames.find(name => visible(row).includes(name)) ?? (rawFirm && pendingOpen.get(slugOf(rawFirm))?.name)
      if (pendingNamed) fail(`${path}: «${label}» rendered for pending-available ${pendingNamed} (firms-pending.json only)`)
      if (!firm && !named && positiveFirms.length === 0) fail(`${path}: «${label}» badge rendered but no firm has positive Russia evidence`)
      if (firm && !positiveFirms.includes(firm)) fail(`${path}: «${label}» badge for ${firm} without positive evidence`)
    }
    if (b === null && modifier === 'neutral') {
      const row = enclosingRow(html, m.index)
      const named = [...basis.values()].find(v => visible(row).includes(v.name))
      const pendingRow = [...pendingOpen.values()].find(v => visible(row).includes(v.name))
      if (!named && pendingRow) { pendingBadges++; if (label !== PENDING_LABEL(pendingRow)) fail(`${path}: pending-available ${pendingRow.name} row badge reads «${label}», expected «${PENDING_LABEL(pendingRow)}»`); continue }
      if (!named) fail(`${path}: neutral badge «${label}» outside a basis firm row`)
      else { neutralBadges++; if (label !== LABEL(named.date)) fail(`${path}: ${named.name} row badge reads «${label}», expected «${LABEL(named.date)}»`) }
    }
  }
  // (b) body prose: «открыта/открыты/открыт (и) для РФ/России» next to a basis firm in the same sentence. A quoted label being defined
  // («Открыта для РФ» ставим только при …) is allowed.
  const text = visible(html)
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    for (const m of sentence.matchAll(/открыт[аы]? (?:и )?для (?:РФ|России)/gi)) {
      if (sentence[m.index - 1] === '«') continue
      const named = basisNames.find(name => sentence.includes(name))
      if (named) fail(`${path}: prose «${m[0]}» next to ${named}: "${sentence.slice(0, 160)}"`)
    }
  }
  // (e) Upscale: no sentence naming Upscale (body or meta description) may call it open for Russia, KYC-free or list-absent;
  // its badge carries the data status; no «Открыть Upscale» CTA.
  const descriptionE = (html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  // Tables have no sentence breaks between rows, so prose is read without tables and each table row on its own.
  const proseE = visible(html.replace(/<table\b[\s\S]*?<\/table>/g, ' ').replace(/<\/(?:p|li|h[1-6]|div|article|summary)>|<h[1-6][\s>]/g, m => `. ${m}`))
  const rowsE = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(m => visible(m[0]))
  for (const sentence of [...`${descriptionE} ${proseE}`.split(/(?<=[.!?])\s+/), ...rowsE]) {
    if (!sentence.includes('Upscale')) continue
    upscaleSentences++
    const hit = UPSCALE_OPEN_COPY.find(re => re.test(sentence))
    if (hit) fail(`${path}: Upscale sentence matches ${hit}: "${sentence.slice(0, 160)}"`)
  }
  if (/Открыть Upscale/.test(text)) fail(`${path}: «Открыть Upscale» CTA`)
  for (const m of html.matchAll(/data-russia-firm="upscale"[^>]*>|data-russia-status="([a-z]+)"[^>]*data-russia-firm="upscale"/g)) {
    const status = m[0].match(/data-russia-status="([a-z]+)"/)?.[1]
    if (status && status !== upscaleStatus) fail(`${path}: Upscale badge status ${status}, data says ${upscaleStatus}`)
  }
  // (d) dated prose (RU Writer 2026-10-26): «… нет в (её/их) списке/списках ограничений (на DD.MM.YYYY)» in body text or the
  // meta description, in a sentence naming a basis firm, must carry that firm's data date (SEO literals cannot read data).
  const description = (html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  for (const sentence of `${description} ${text}`.split(/(?<=[.!?])\s+/)) {
    const named = [...basis.values()].filter(b => sentence.includes(b.name))
    if (!named.length) continue
    for (const m of sentence.matchAll(/нет в (?:её |их )?списк(?:е|ах) ограничений \(?на (\d{2}\.\d{2}\.\d{4})/g)) {
      if (!named.some(b => ruDate(b.date) === m[1])) fail(`${path}: «${m[0]}» next to ${named.map(b => b.name).join(', ')} but data date is ${named.map(b => ruDate(b.date)).join(' / ')}: "${sentence.slice(0, 160)}"`)
      else datedProse++
    }
  }
  // (f) TeamTraders publishes no country list: no sentence naming it may say it is absent from a list.
  for (const sentence of `${description} ${text}`.split(/(?<=[.!?])\s+/)) {
    // Nav lists have no sentence breaks, so only the phrase within 80 chars after the name counts.
    if (/TeamTraders[^.!?]{0,80}?нет в (?:её |их )?списк(?:е|ах) ограничений/.test(sentence)) fail(`${path}: TeamTraders (no published country list) described as «нет в списке ограничений»: "${sentence.slice(0, 160)}"`)
  }
}
if (upscaleSentences < 5) fail(`only ${upscaleSentences} RU sentences name Upscale; check (e) found too little copy`)
if (teamTraders && !pendingSeen.has('TeamTraders')) fail('no TeamTraders badge found on any RU page')
else if (teamTraders && !pendingSeen.get('TeamTraders').endsWith('«ограничений по странам не опубликовано (на 20.10.2026)»')) fail(`TeamTraders badge: ${pendingSeen.get('TeamTraders')}`)
for (const slug of ['bright-funded', 'crypto-fund-trader']) {
  if (!listSeen.has(slug)) fail(`${slug}: no badge found (expected «нет в списке ограничений (на …)»)`)
  else if (!/^нет в списке ограничений \(на \d{2}\.\d{2}\.\d{4}\)$/.test(listSeen.get(slug))) fail(`${slug}: badge reads «${listSeen.get(slug)}»`)
}
if (pendingOpen.size && pendingBadges === 0) fail(`no badge found for pending-available ${pendingNames.join(', ')}: check (g) covered nothing`)
// pending-available firms never count as available for the ranking-order rule (statusBySlug is firms.json only).
for (const [slug, p] of pendingOpen) if (statusBySlug[slug] === 'available') fail(`${p.name}: pending-available counted as 'available' in the status map`)
if (neutralBadges < 10) fail(`only ${neutralBadges} neutral basis badges found across ${ruPaths.length} RU pages`)

// (c) ordering unchanged: BrightFunded first; Russia-open firms first (first-appearance order of /go/ CTAs).
const ctaOrder = html => { const seen = []; for (const m of html.matchAll(/href="\/go\/([a-z0-9-]+)[?"]/g)) if (!seen.includes(m[1])) seen.push(m[1]); return seen }
for (const path of ['/ru', '/ru/luchshie-prop-firmy']) {
  const order = ctaOrder(await get(path))
  if (order[0] !== 'bright-funded') fail(`${path}: first CTA is ${order[0]}, expected bright-funded`)
  const firstClosed = order.findIndex(slug => statusBySlug[slug] !== 'available')
  const lateOpen = order.slice(firstClosed < 0 ? order.length : firstClosed).filter(slug => statusBySlug[slug] === 'available')
  if (lateOpen.length) fail(`${path}: Russia-open firms ${lateOpen.join(', ')} sort after ${order[firstClosed]}`)
  if (orderBase) {
    const baseOrder = ctaOrder(await get(path, orderBase))
    if (JSON.stringify(order) !== JSON.stringify(baseOrder)) fail(`${path}: CTA order differs from base\n  base: ${baseOrder.join(' ')}\n  now:  ${order.join(' ')}`)
    else console.log(`${path}: CTA order equals base (${order.length} firms): ${order.join(' ')}`)
  }
}

if (failures.length) {
  console.error(`test:ru-access-basis FAILED (${failures.length})\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`test:ru-access-basis OK: ${ruPaths.length} RU pages, ${neutralBadges} neutral basis badges, ${datedProse} dated «нет в списке ограничений» phrases (${[...datesSeen].map(([k, v]) => `${k} «${v}»`).join('; ')}), no «Открыта для РФ» for ${basisNames.join(', ')}; pending-available neutral: ${[...pendingSeen].map(([k, v]) => `${k} ${v}`).join('; ') || 'none'}; Upscale '${upscaleStatus}' in ${upscaleSentences} sentences, no open/KYC-free copy`)
