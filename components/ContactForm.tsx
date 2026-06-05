'use client'
import { useState } from 'react'

type Status = 'idle' | 'sending' | 'pending' | 'error'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return

    setStatus('sending')
    setFeedback('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setFeedback(data.error || 'Something went wrong. Try again.')
        return
      }
      setStatus('pending')
      setFeedback(data.message || "Thanks — we'll respond as soon as possible.")
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('error')
      setFeedback('Network error. Try again.')
    }
  }

  if (status === 'pending') {
    return (
      <div role="status" style={{ padding: '2rem', background: 'rgba(39,161,123,0.08)', border: '1px solid rgba(39,161,123,0.25)', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Message received</p>
        <p style={{ color: 'var(--muted)' }}>{feedback}</p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
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
      <div>
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={status === 'sending'}
          required
        />
      </div>
      <div>
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'sending'}
          required
        />
      </div>
      <div>
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="How can we help you?"
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={status === 'sending'}
          required
        />
      </div>
      <button
        type="submit"
        className="btn-primary"
        disabled={status === 'sending'}
        style={{ marginTop: '0.5rem', opacity: status === 'sending' ? 0.7 : 1 }}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
      {status === 'error' && (
        <p role="alert" style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {feedback}
        </p>
      )}
    </form>
  )
}
