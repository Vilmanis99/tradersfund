import fs from 'node:fs'
import path from 'node:path'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { getCorrections } from '@/lib/corrections'

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** Live counts for /about, read from content/data at build time. */
export default function AboutFacts() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const fresh = challenges.filter(product => isChallengeFresh(product)).length
  const latestFirmUpdate = firms.map(firm => firm.lastUpdated).filter(Boolean).sort().at(-1)
  const evidenceFiles = fs.readdirSync(path.join(process.cwd(), 'content/data')).filter(file => /evidence.*\.json$/.test(file)).length
  const watch = getChallengeWatchEntries().length
  const corrections = getCorrections().length
  const facts: Array<[string, string]> = [
    [String(firms.length), 'prop firms tracked'],
    [`${fresh} of ${challenges.length}`, 'products inside the 30-day source window'],
    [String(evidenceFiles), 'dated evidence files (country access, payouts, platforms)'],
    [String(watch), 'entries in the public change watch'],
    [String(corrections), 'published corrections'],
    ...(latestFirmUpdate ? [[formatDate(latestFirmUpdate), 'latest firm-record update'] as [string, string]] : []),
  ]
  return (
    <section className="tf-trust" style={{ padding: 0 }} aria-labelledby="about-facts" data-about-facts>
      <h2 id="about-facts">The data today</h2>
      <ul className="tf-trust__facts">
        {facts.map(([value, label]) => <li key={label}><strong>{value}</strong><span>{label}</span></li>)}
      </ul>
    </section>
  )
}
