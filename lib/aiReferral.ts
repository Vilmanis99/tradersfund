export type AiReferral = {
  ai_source?: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'copilot'
  ai_source_signal?: 'referrer' | 'utm_source'
}

const HOSTS: Record<string, NonNullable<AiReferral['ai_source']>> = {
  'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt',
  'perplexity.ai': 'perplexity', 'claude.ai': 'claude',
  'gemini.google.com': 'gemini', 'copilot.microsoft.com': 'copilot',
}
const LABELS: Record<string, NonNullable<AiReferral['ai_source']>> = {
  ...HOSTS, chatgpt: 'chatgpt', perplexity: 'perplexity', claude: 'claude', gemini: 'gemini', copilot: 'copilot',
}

/** Classify a platform signal, not a claimed citation. Never emit URLs or prompts.
 * Ordinary Google/Bing referrals cannot identify an AI answer and stay unclassified.
 */
export function aiReferral(referrer: string, search: string): AiReferral {
  try {
    const url = new URL(referrer)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      const host = url.hostname.toLowerCase().replace(/^www\./, '')
      const source = Object.hasOwn(HOSTS, host) ? HOSTS[host] : undefined
      if (source) return { ai_source: source, ai_source_signal: 'referrer' }
    }
  } catch { /* Missing or malformed referrer is not an AI signal. */ }
  const label = (new URLSearchParams(search).get('utm_source') ?? '').trim().toLowerCase()
  const source = Object.hasOwn(LABELS, label) ? LABELS[label] : undefined
  return source ? { ai_source: source, ai_source_signal: 'utm_source' } : {}
}

/** Retain only bounded categories in memory for the current SPA journey. */
export function createAiReferralTracker() {
  let current: AiReferral | undefined
  let previousSource: string | null = null
  return (referrer: string, search: string): AiReferral => {
    const source = new URLSearchParams(search).get('utm_source')
    if (current === undefined) {
      current = aiReferral(referrer, search)
      previousSource = source
    } else if (source !== null && source !== previousSource) {
      current = aiReferral('', search)
      previousSource = source
    }
    return { ...current }
  }
}
