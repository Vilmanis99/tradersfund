import { NextResponse } from 'next/server'
import { startNewsletterDoubleOptIn } from '@/lib/brevo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  let body: { email?: string; company?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot — bots fill hidden fields. Silently 200 so they don't retry.
  if (body.company) {
    return NextResponse.json({
      ok: true,
      pending: true,
      message: 'Check your inbox and confirm your subscription.',
    })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const subscription = await startNewsletterDoubleOptIn(email)
  if (!subscription.ok) {
    const configurationError = subscription.reason === 'configuration'
    return NextResponse.json(
      {
        error: configurationError
          ? 'Newsletter signup is not configured yet. Please try again later.'
          : 'We could not start your subscription. Please try again in a few minutes.',
      },
      { status: configurationError ? 503 : 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    message: 'Check your inbox and confirm your subscription.',
  })
}
