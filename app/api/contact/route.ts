import { NextResponse } from 'next/server'
import { sendContactEmail } from '@/lib/brevo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Same naive per-IP limiter as /api/newsletter. Swap for Upstash when scale demands.
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

  let body: {
    name?: string
    email?: string
    message?: string
    company?: string
    category?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot — bots fill hidden fields.
  if (body.company) {
    return NextResponse.json({
      ok: true,
      message: 'Thanks — your message was sent to our editorial inbox.',
    })
  }

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const message = body.message?.trim()
  const category = body.category === 'india-evidence' ? 'india-evidence' : 'contact'

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
  }
  if (name.length > 100 || message.length > 5_000) {
    return NextResponse.json({ error: 'Your message is too long.' }, { status: 400 })
  }

  const delivery = await sendContactEmail({ name, email, message, category })
  if (!delivery.ok) {
    const configurationError = delivery.reason === 'configuration'
    return NextResponse.json(
      {
        error: configurationError
          ? 'Contact delivery is not configured yet. Please try again later.'
          : 'We could not send your message. Please try again in a few minutes.',
      },
      { status: configurationError ? 503 : 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Thanks — your message was sent to our editorial inbox.',
  })
}
