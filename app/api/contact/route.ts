import { NextResponse } from 'next/server'

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

  let body: { name?: string; email?: string; message?: string; company?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot — bots fill hidden fields.
  if (body.company) return NextResponse.json({ ok: true, pending: true })

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const message = body.message?.trim()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
  }

  // TODO(brevo): wire to actual delivery (transactional email, Slack webhook, etc).
  // For now, log the submission so it's visible in dev / hosting logs and tell the
  // user honestly that delivery isn't live yet — better than the old client-stub
  // that silently lost every message.
  console.log(`[contact] ${new Date().toISOString()} ${ip} ${name} <${email}>: ${message.slice(0, 120)}`)

  return NextResponse.json({
    ok: true,
    pending: true,
    message: "Thanks — your message was logged. We'll respond when our contact pipeline is live.",
  })
}
