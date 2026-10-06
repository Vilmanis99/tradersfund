'use client'
import { useId, useRef, useState } from 'react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import { isValidEmail } from '@/lib/formValidation'

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
  const [emailInvalid, setEmailInvalid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackId = useId()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending' || status === 'pending') return

    if (!isValidEmail(email)) {
      setEmailInvalid(true)
      inputRef.current?.focus()
      setStatus('error')
      setMessage(isRussian ? 'Введите корректный адрес электронной почты.' : 'Please enter a valid email address.')
      return
    }

    setStatus('sending')
    setEmailInvalid(false)
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
      setMessage(data.message || (isRussian ? 'Проверьте почту и подтвердите подписку в письме.' : 'Check your inbox and confirm your subscription.'))
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
        ref={inputRef}
        name="email"
        autoComplete="email"
        aria-invalid={emailInvalid}
        aria-describedby={message ? feedbackId : undefined}
        placeholder={isRussian ? 'Ваш адрес электронной почты' : 'Your email address'}
        value={email}
        onChange={e => { setEmail(e.target.value); setEmailInvalid(false); if (status === 'error') { setStatus('idle'); setMessage('') } }}
        disabled={status === 'sending' || status === 'pending'}
        aria-label={isRussian ? 'Адрес электронной почты' : 'Email address'}
        required
      />
      <button type="submit" disabled={status === 'sending' || status === 'pending'}>
        {status === 'sending'
          ? (isRussian ? 'Отправка…' : 'Sending…')
          : status === 'pending'
            ? (isRussian ? 'Проверьте почту' : 'Check your inbox')
            : (isRussian ? 'Подписаться' : 'Subscribe')}
      </button>
      {status === 'pending' && (
        <span id={feedbackId} role="status" className="newsletter-feedback" style={{ color: 'var(--accent)' }}>
          {message}
          {' '}<button type="button" className="newsletter-another-email" onClick={() => { setStatus('idle'); setMessage(''); requestAnimationFrame(() => inputRef.current?.focus()) }}>{isRussian ? 'Другой адрес' : 'Use another email'}</button>
        </span>
      )}
      {status === 'error' && (
        <span id={feedbackId} role="alert" className="newsletter-feedback" style={{ color: 'var(--danger)' }}>
          {message}
        </span>
      )}
    </form>
  )
}
