'use client'
import { useState } from 'react'

type Status = 'idle' | 'sending' | 'pending' | 'error'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Try again.')
        return
      }
      setStatus('pending')
      setMessage(data.message || "Thanks — we'll be in touch.")
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Network error. Try again.')
    }
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot — hidden from real users, bots fill it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={e => setCompany(e.target.value)}
        style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
      <input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={status === 'sending'}
        aria-label="Email address"
        required
      />
      <button type="submit" disabled={status === 'sending' || status === 'pending'}>
        {status === 'sending' ? 'Sending…' : status === 'pending' ? 'Done' : 'Subscribe'}
      </button>
      {status === 'pending' && (
        <span role="status" style={{ color: '#22c55e', fontSize: '0.8rem', position: 'absolute', bottom: -20 }}>
          {message}
        </span>
      )}
      {status === 'error' && (
        <span role="alert" style={{ color: '#f87171', fontSize: '0.8rem', position: 'absolute', bottom: -20 }}>
          {message}
        </span>
      )}
    </form>
  )
}
