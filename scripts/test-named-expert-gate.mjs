/**
 * Named-expert gate (content/data/named-experts.json, lib/namedExperts.ts).
 * The Edris Derakhshi expert block stays off until his own name, bio and written
 * consent date are recorded. While it is off nothing may render, reach JSON-LD
 * or add a URL. Run after `npm run build` to also check the prerendered pages.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'

const root = new URL('..', import.meta.url).pathname
const jiti = createJiti(import.meta.url)
const { isPublishableExpert, getPublishableExpert } = await jiti.import('../lib/namedExperts.ts')
const data = JSON.parse(readFileSync(join(root, 'content/data/named-experts.json'), 'utf8'))

const filled = { authorSlug: 'x', displayName: 'Name', role: 'Role', bio: 'Bio supplied by the person.', credentials: [], photoUrl: null, consentConfirmedAt: '2026-10-01' }
assert.equal(isPublishableExpert(filled), true, 'a complete, consented entry is publishable')
for (const [field, value] of [['displayName', ''], ['displayName', '   '], ['bio', ''], ['consentConfirmedAt', null], ['consentConfirmedAt', '01.10.2026'], ['consentConfirmedAt', 'yes']]) {
  assert.equal(isPublishableExpert({ ...filled, [field]: value }), false, `missing or invalid ${field} keeps the block off`)
}
assert.equal(isPublishableExpert(undefined), false)

const edris = data.experts.find(expert => expert.authorSlug === 'edris-derakhshi')
assert(edris, 'named-experts.json keeps the edris-derakhshi slot')
const edrisOn = Boolean(getPublishableExpert('edris-derakhshi'))
assert.equal(edrisOn, isPublishableExpert(edris), 'lookup and gate agree')

// Off by default: an unconsented entry must not carry invented material.
if (!edrisOn) {
  assert(!edris.consentConfirmedAt, 'gate is off only because consent is not recorded')
  assert.equal(edris.credentials.length, 0, 'no credentials while consent is missing')
  assert.equal(edris.photoUrl, null, 'no photo while consent is missing')
}

const html = page => join(root, '.next/server/app', `${page}.html`)
const pages = ['about', 'authors', 'authors/edris-derakhshi', 'how-we-make-money', 'corrections']
if (pages.every(page => existsSync(html(page)))) {
  for (const page of pages) {
    const body = readFileSync(html(page), 'utf8')
    if (!edrisOn) {
      assert(!body.includes('data-named-expert'), `${page}: named-expert block is not rendered while the gate is off`)
      const ld = [...body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
      for (const key of ['reviewedBy', 'hasCredential', 'knowsAbout', 'alumniOf', 'award']) {
        assert(!ld.includes(`"${key}"`), `${page}: no ${key} in JSON-LD while the gate is off`)
      }
    }
  }
  console.log('named expert gate: ok (source + prerendered pages)')
} else {
  console.log('named expert gate: ok (source only; run after npm run build to check pages)')
}
