// Validates content/data/ru-verdicts/*.json (RU Phase 2 verdict copy). Node 22.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'content/data/ru-verdicts'
const firms = JSON.parse(readFileSync('content/data/firms.json', 'utf8')).map(f => f.name)
const STATUSES = ['available', 'restricted', 'unclear', 'unverified']
const LABELS = ['Открыта для РФ', 'Недоступно для РФ', 'Доступ для РФ', 'РФ: неясно', 'РФ: не проверено']
const FORBIDDEN = [/\bМир\b/, /карт[аыу]? «?Мир/i, /bybit/i, /российск\w+ карт/i]
const failures = []
const fail = (file, msg) => failures.push(`${file}: ${msg}`)
const ruDate = iso => iso.split('-').reverse().join('.')
const today = new Date()

for (const file of readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'schema.json')) {
  const d = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const slug = file.replace(/\.json$/, '')
  if (d.route !== `/ru/${slug}`) fail(file, `route ${d.route} does not match file name`)
  const keys = JSON.stringify(d).match(/"[A-Za-z]*(?:[Ff]allback|[Ss]taticStatus|[Oo]verride|statusOverride)[A-Za-z]*"\s*:/g)
  if (keys) fail(file, `fallback/override fields are not allowed (${keys.join(', ')}); badges come only from firms.json russiaStatus`)
  if (d.firmInFirmsJson !== false && !firms.includes(d.firm)) fail(file, `firm ${d.firm} missing from firms.json (set firmInFirmsJson: false; it will show as unverified)`)
  if (d.firmInFirmsJson === false && firms.includes(d.firm)) console.warn(`WARN ${file}: ${d.firm} is now in firms.json; set firmInFirmsJson to true`)
  for (const alt of (d.russiaAccess?.alternatives ?? d.russiaPick?.alternatives ?? [])) if (!firms.includes(alt)) fail(file, `alternative ${alt} missing from firms.json`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dataAsOf ?? '')) fail(file, 'dataAsOf missing')
  if (!d.verdict?.includes(`по данным на ${ruDate(d.dataAsOf ?? '')}`)) fail(file, 'verdict must carry «по данным на <dataAsOf>»')
  const sentences = (d.verdict ?? '').split(/(?<=[.!?])\s+(?=[А-ЯA-Z])/).filter(Boolean).length
  if (sentences < 2 || sentences > 3) fail(file, `verdict has ${sentences} sentences (want 2–3)`)
  const lists = d.type === 'comparison' ? [d.picks?.a, d.picks?.b] : [d.best, d.avoid]
  const [min, max] = d.type === 'comparison' ? [2, 4] : [3, 4]
  lists.forEach((list, i) => { if (!Array.isArray(list) || list.length < min || list.length > max) fail(file, `list ${i} needs ${min}–${max} items`) })
  const ra = d.type === 'comparison' ? d.russiaPick : d.russiaAccess
  if (!ra || ra.statusFrom !== 'russiaStatus') fail(file, 'Russia copy must be driven by russiaStatus')
  if (d.type !== 'comparison') for (const s of STATUSES) if (!ra?.byStatus?.[s]?.text?.includes('{badge}')) fail(file, `russiaAccess.byStatus.${s} missing or without {badge}`)
  const text = JSON.stringify(d)
  for (const label of LABELS) if (text.includes(label)) fail(file, `literal badge label «${label}»; use {badge}/{altBadge}`)
  if (/FundedNext[^"]{0,80}(restricted|недоступн|закрыт|не обслуживает|available|открыт)/i.test(text)) fail(file, 'hard-coded FundedNext access status')
  for (const re of FORBIDDEN) if (re.test(text)) fail(file, `forbidden claim ${re}`)
  const age = (today - new Date(`${d.dataAsOf}T00:00:00Z`)) / 864e5
  if (age > 30) console.warn(`WARN ${file}: dataAsOf ${d.dataAsOf} is ${Math.floor(age)} days old; the block must render as stale`)
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log('ru-verdicts: ok')
