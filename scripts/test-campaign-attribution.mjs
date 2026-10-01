import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { campaignAttribution, createCampaignAttributionTracker } from '../lib/analyticsTaxonomy.ts'
import * as analyticsTaxonomy from '../lib/analyticsTaxonomy.ts'

const incoming = '?utm_source=%D0%AF%D0%BD%D0%B4%D0%B5%D0%BA%D1%81&utm_medium=cpc&utm_campaign=BrightFunded_%D0%9E%D1%81%D0%B5%D0%BD%D1%8C%202026&email=person%40example.com'
const expected = {
  campaign_source: 'яндекс',
  campaign_medium: 'cpc',
  campaign_name: 'brightfunded_осень2026',
}
assert.deepEqual(campaignAttribution(incoming), expected, 'Cyrillic campaign labels survive allowlist sanitization')

const remember = createCampaignAttributionTracker()
assert.deepEqual(remember(''), {}, 'no campaign is invented on a direct visit')
assert.deepEqual(remember(incoming), expected, 'a landing URL sets the tab-local campaign')
assert.deepEqual(remember('?size=50000'), expected, 'finder query state does not erase attribution')
assert.deepEqual(remember(''), expected, 'internal navigation retains attribution without browser storage')
assert.deepEqual(remember('?utm_campaign=second'), { campaign_name: 'second' }, 'a new campaign replaces the previous one')
assert.deepEqual(remember('?utm_campaign=%20%20'), {}, 'an explicit invalid campaign clears the old label')
assert.deepEqual(createCampaignAttributionTracker()(''), {}, 'separate tabs or reloads do not inherit a campaign')
assert.equal(campaignAttribution(`?utm_campaign=${'A'.repeat(80)}`).campaign_name?.length, 60, 'campaign labels are bounded')
assert.deepEqual(campaignAttribution('?email=person%40example.com&city=Moscow'), {}, 'arbitrary query data is never forwarded')

const provider = readFileSync(new URL('../components/AnalyticsProvider.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../lib/clientAnalytics.ts', import.meta.url), 'utf8')
assert(provider.includes('const campaign = currentCampaignAttribution'), 'provider uses the shared client attribution source')
assert(client.includes('...currentCampaignAttribution()'), 'component events use the same attribution source')
assert(!provider.includes('campaignAttribution(window.location.search)'), 'provider cannot silently drop labels after route changes')

const emitted = []
const dispatched = []
const mockWindow = {
  location: { pathname: '/ru', search: incoming },
  queueMicrotask: callback => callback(),
  dispatchEvent: event => dispatched.push(event),
}
const testModule = { exports: {} }
const compiled = ts.transpileModule(client, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
vm.runInNewContext(compiled, {
  module: testModule,
  exports: testModule.exports,
  window: mockWindow,
  CustomEvent: class {
    constructor(type, options) { this.type = type; this.detail = options.detail }
  },
  require: name => {
    if (name === '@vercel/analytics') return { track: (event, properties) => emitted.push({ event, properties }) }
    if (name === './analyticsTaxonomy') return analyticsTaxonomy
    throw new Error(`Unexpected client analytics import: ${name}`)
  },
}, { filename: 'lib/clientAnalytics.ts' })
testModule.exports.trackSiteEvent('russian_funnel_intent', { intent: 'bright_review' })
mockWindow.location.pathname = '/ru/obzor-bright-funded'
mockWindow.location.search = ''
testModule.exports.trackSiteEvent('bright_review_intent', { placement: 'verdict' })
assert.equal(emitted[0].properties.campaign_name, expected.campaign_name, 'landing event keeps the Russian campaign')
assert.equal(emitted[1].properties.campaign_name, expected.campaign_name, 'review event retains it after client navigation')
assert.equal(emitted[1].properties.locale, 'ru', 'review event remains in the Russian content group')
assert.equal(dispatched[1].detail.properties.campaign_source, expected.campaign_source, 'optional analytics receives the same campaign')
assert(!('email' in emitted[1].properties), 'the arbitrary landing query never reaches an event')

console.log('Campaign attribution passed: Cyrillic labels, allowlist, internal navigation, replacement, isolation and emitted event wiring.')
