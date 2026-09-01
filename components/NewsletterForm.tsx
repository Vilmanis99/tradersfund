'use client'
import { useState } from 'react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'

type Status = 'idle' | 'sending' | 'pending' | 'error'

export default function NewsletterForm({
  placement = 'unknown',
  locale = 'en',
}: { placement?: string; locale?: 'en' | 'ru' }) {
  const isRussian = locale === 'ru'
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage(isRussian ? 'Введите корректный адрес электронной почты.' : 'Please enter a valid email address.')
      return
    }

    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TFH-Locale': locale,
        },
        body: JSON.stringify({ email, company }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || (isRussian ? 'Произошла ошибка. Повторите попытку.' : 'Something went wrong. Try again.'))
        return
      }
      setStatus('pending')
      setMessage(data.message || (isRussian ? 'Спасибо — подтвердите подписку в письме.' : "Thanks — we'll be in touch."))
      if (!company) {
        track('newsletter_double_opt_in_started', { placement, locale })
      }
      setEmail('')
    } catch {
      setStatus('error')
      setMessage(isRussian ? 'Ошибка сети. Повторите попытку.' : 'Network error. Try again.')
    }
  }

  return (
    <form
      className="newsletter-form"
      onSubmit={handleSubmit}
      noValidate
      data-clarity-mask="true"
      data-russian-newsletter={isRussian ? 'global-rule-digest' : undefined}
    >
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
        placeholder={isRussian ? 'Ваш адрес электронной почты' : 'Your email address'}
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={status === 'sending'}
        aria-label={isRussian ? 'Адрес электронной почты' : 'Email address'}
        required
      />
      <button type="submit" disabled={status === 'sending' || status === 'pending'}>
        {status === 'sending'
          ? (isRussian ? 'Отправка…' : 'Sending…')
          : status === 'pending'
            ? (isRussian ? 'Подтвердить адрес' : 'Confirm email')
            : (isRussian ? 'Подписаться' : 'Subscribe')}
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
