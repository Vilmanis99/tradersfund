import { NextResponse } from 'next/server'
import { startNewsletterDoubleOptIn } from '@/lib/brevo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type NewsletterLocale = 'en' | 'ru'

const MESSAGES = {
  en: {
    rateLimited: 'Too many requests. Try again in a minute.',
    invalidRequest: 'Invalid request.',
    invalidEmail: 'Please enter a valid email address.',
    configuration: 'Newsletter signup is not configured yet. Please try again later.',
    provider: 'We could not start your subscription. Please try again in a few minutes.',
    pending: 'Check your inbox and confirm your subscription.',
  },
  ru: {
    rateLimited: 'Слишком много запросов. Повторите попытку через минуту.',
    invalidRequest: 'Некорректный запрос.',
    invalidEmail: 'Введите корректный адрес электронной почты.',
    configuration: 'Подписка на рассылку пока не настроена. Повторите попытку позже.',
    provider: 'Не удалось начать подписку. Повторите попытку через несколько минут.',
    pending: 'Проверьте входящие и подтвердите подписку.',
  },
} as const

function requestLocale(req: Request): NewsletterLocale {
  return req.headers.get('x-tfh-locale')?.toLowerCase() === 'ru' ? 'ru' : 'en'
}

function localizedJson(
  locale: NewsletterLocale,
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init)
  response.headers.set('Content-Language', locale)
  return response
}

// Naive per-IP rate limiter — fine for the current scale, swap for Upstash
// or similar when traffic justifies it.
const buckets = new Map<string, number[]>()
function rateLimit(ip: string, limit = 5, windowMs = 60_000) {
  const now = Date.now()
  const arr = (buckets.get(ip) || []).filter(t => now - t < windowMs)
  if (arr.length >= limit) return false
  arr.push(now)
  buckets.set(ip, arr)
  return true
}

export async function POST(req: Request) {
  const locale = requestLocale(req)
  const messages = MESSAGES[locale]
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!rateLimit(ip)) {
    return localizedJson(locale, { error: messages.rateLimited }, { status: 429 })
  }

  let body: { email?: string; company?: string }
  try {
    body = await req.json()
  } catch {
    return localizedJson(locale, { error: messages.invalidRequest }, { status: 400 })
  }

  // Honeypot — bots fill hidden fields. Silently 200 so they don't retry.
  if (body.company) {
    return localizedJson(locale, {
      ok: true,
      pending: true,
      message: messages.pending,
    })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return localizedJson(locale, { error: messages.invalidEmail }, { status: 400 })
  }

  const subscription = await startNewsletterDoubleOptIn(email)
  if (!subscription.ok) {
    const configurationError = subscription.reason === 'configuration'
    return localizedJson(
      locale,
      {
        error: configurationError
          ? messages.configuration
          : messages.provider,
      },
      { status: configurationError ? 503 : 502 },
    )
  }

  return localizedJson(locale, {
    ok: true,
    pending: true,
    message: messages.pending,
  })
}
