const BREVO_API_BASE = 'https://api.brevo.com/v3'

type BrevoResult =
  | { ok: true }
  | { ok: false; reason: 'configuration' | 'provider' }

function positiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function httpUrl(value: string | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )
}

export function isContactDeliveryConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.BREVO_CONTACT_TO_EMAIL &&
    process.env.BREVO_CONTACT_FROM_EMAIL,
  )
}

export function isNewsletterConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY &&
    positiveInteger(process.env.BREVO_NEWSLETTER_LIST_ID) &&
    positiveInteger(process.env.BREVO_NEWSLETTER_DOI_TEMPLATE_ID) &&
    httpUrl(process.env.BREVO_NEWSLETTER_REDIRECT_URL),
  )
}

async function brevoRequest(path: string, body: object): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { ok: false, reason: 'configuration' }

  try {
    const response = await fetch(`${BREVO_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[brevo] ${path} returned HTTP ${response.status}`)
      return { ok: false, reason: 'provider' }
    }

    return { ok: true }
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error(`[brevo] ${path} request failed (${errorName})`)
    return { ok: false, reason: 'provider' }
  }
}

export async function sendContactEmail(input: {
  name: string
  email: string
  message: string
  category?: 'contact' | 'india-evidence'
}): Promise<BrevoResult> {
  const toEmail = process.env.BREVO_CONTACT_TO_EMAIL
  const fromEmail = process.env.BREVO_CONTACT_FROM_EMAIL
  const fromName = process.env.BREVO_CONTACT_FROM_NAME || 'Traders Fund Hub'

  if (!toEmail || !fromEmail) return { ok: false, reason: 'configuration' }

  const headerSafeName = input.name.replace(/[\r\n]+/g, ' ').trim()
  const safeName = escapeHtml(input.name)
  const safeEmail = escapeHtml(input.email)
  const safeMessage = escapeHtml(input.message).replace(/\r?\n/g, '<br>')
  const isIndiaEvidence = input.category === 'india-evidence'

  return brevoRequest('/smtp/email', {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: toEmail, name: 'Traders Fund Hub' }],
    replyTo: { email: input.email, name: headerSafeName },
    subject: isIndiaEvidence
      ? `India evidence submission from ${headerSafeName}`
      : `Website enquiry from ${headerSafeName}`,
    textContent: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
    htmlContent: `<html><body><p><strong>Name:</strong> ${safeName}<br><strong>Email:</strong> ${safeEmail}</p><p>${safeMessage}</p></body></html>`,
    tags: [isIndiaEvidence ? 'india-evidence' : 'website-contact'],
  })
}

export async function startNewsletterDoubleOptIn(email: string): Promise<BrevoResult> {
  const listId = positiveInteger(process.env.BREVO_NEWSLETTER_LIST_ID)
  const templateId = positiveInteger(process.env.BREVO_NEWSLETTER_DOI_TEMPLATE_ID)
  const redirectionUrl = httpUrl(process.env.BREVO_NEWSLETTER_REDIRECT_URL)

  if (!listId || !templateId || !redirectionUrl) {
    return { ok: false, reason: 'configuration' }
  }

  return brevoRequest('/contacts/doubleOptinConfirmation', {
    email,
    includeListIds: [listId],
    templateId,
    redirectionUrl,
  })
}
