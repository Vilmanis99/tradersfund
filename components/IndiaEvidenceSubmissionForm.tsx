'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileCheck2, Send } from 'lucide-react'

type Status = 'idle' | 'sending' | 'success' | 'error'

const SELECT_STYLE = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: '#fff',
  padding: '0 0.8rem',
  fontSize: '0.88rem',
} as const

export default function IndiaEvidenceSubmissionForm({
  firms,
}: {
  firms: { slug: string; name: string }[]
}) {
  const [firmSlug, setFirmSlug] = useState(firms[0]?.slug ?? '')
  const [stage, setStage] = useState('checkout')
  const [outcome, setOutcome] = useState('successful')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [company, setCompany] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    if (!confirmed) {
      setStatus('error')
      setFeedback('Confirm that this is your own experience before submitting.')
      return
    }
    if (notes.trim().length < 20) {
      setStatus('error')
      setFeedback('Please add at least 20 characters describing what happened.')
      return
    }

    const firm = firms.find(item => item.slug === firmSlug)
    const message = [
      '[INDIA EVIDENCE SUBMISSION]',
      `Firm: ${firm?.name ?? firmSlug}`,
      `Stage: ${stage}`,
      `Outcome: ${outcome}`,
      '',
      notes.trim(),
      '',
      'Submitter confirmed this is their own experience and agreed to editorial follow-up.',
    ].join('\n')

    setStatus('sending')
    setFeedback('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          company,
          category: 'india-evidence',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setStatus('error')
        setFeedback(data.error || 'We could not send the submission. Please try again.')
        return
      }

      setStatus('success')
      setFeedback('Submission received. We may reply to request redacted supporting evidence.')
      setName('')
      setEmail('')
      setNotes('')
      setConfirmed(false)
    } catch {
      setStatus('error')
      setFeedback('Network error. Please try again.')
    }
  }

  return (
    <section className="home-section" aria-labelledby="india-proof-heading">
      <div className="home-shell" style={{ maxWidth: 980 }}>
        <div className="section-head">
          <div>
            <h2 id="india-proof-heading" className="section-title">
              <FileCheck2 size={18} style={{ color: 'var(--accent-light)' }} />
              Help close an India evidence gap
            </h2>
            <p className="section-sub-text">
              Personally tried checkout, KYC, or a payout from India? Send the outcome for editorial
              verification. Submissions never auto-publish or automatically change a ranking.
            </p>
          </div>
        </div>

        {status === 'success' ? (
          <div
            role="status"
            className="post-sidebar-card"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderColor: 'rgba(34, 197, 94, 0.3)',
            }}
          >
            <h3 style={{ margin: 0, color: '#86efac', fontSize: '1rem' }}>Evidence lead received</h3>
            <p style={{ margin: '0.55rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              {feedback}
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              style={{
                marginTop: '0.85rem',
                border: 0,
                background: 'transparent',
                color: 'var(--accent-light)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Submit another experience
            </button>
          </div>
        ) : (
          <form
            className="contact-form post-sidebar-card"
            onSubmit={handleSubmit}
            noValidate
            style={{ maxWidth: 'none', padding: '1.35rem' }}
          >
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={event => setCompany(event.target.value)}
              style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.9rem',
            }}>
              <div>
                <label htmlFor="india-proof-firm">Firm</label>
                <select
                  id="india-proof-firm"
                  value={firmSlug}
                  onChange={event => setFirmSlug(event.target.value)}
                  disabled={status === 'sending'}
                  style={SELECT_STYLE}
                >
                  {firms.map(firm => (
                    <option key={firm.slug} value={firm.slug}>{firm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="india-proof-stage">Stage tested</label>
                <select
                  id="india-proof-stage"
                  value={stage}
                  onChange={event => setStage(event.target.value)}
                  disabled={status === 'sending'}
                  style={SELECT_STYLE}
                >
                  <option value="checkout">Purchase / checkout</option>
                  <option value="kyc">KYC / funded activation</option>
                  <option value="payout">Payout / withdrawal</option>
                </select>
              </div>
              <div>
                <label htmlFor="india-proof-outcome">Outcome</label>
                <select
                  id="india-proof-outcome"
                  value={outcome}
                  onChange={event => setOutcome(event.target.value)}
                  disabled={status === 'sending'}
                  style={SELECT_STYLE}
                >
                  <option value="successful">Successful</option>
                  <option value="rejected">Rejected or unavailable</option>
                  <option value="pending">Pending or unresolved</option>
                </select>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '0.9rem',
            }}>
              <div>
                <label htmlFor="india-proof-name">Name</label>
                <input
                  id="india-proof-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  disabled={status === 'sending'}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label htmlFor="india-proof-email">Email for verification follow-up</label>
                <input
                  id="india-proof-email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={status === 'sending'}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="india-proof-notes">What happened?</label>
              <textarea
                id="india-proof-notes"
                value={notes}
                onChange={event => setNotes(event.target.value)}
                disabled={status === 'sending'}
                placeholder="Include the payment or payout method, approximate date, processing time, and any rejection message. Do not include sensitive numbers."
                required
              />
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              color: 'var(--text)',
              fontSize: '0.8rem',
              lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={event => setConfirmed(event.target.checked)}
                disabled={status === 'sending'}
                style={{ width: 16, height: 16, padding: 0, margin: '3px 0 0', flex: '0 0 auto' }}
              />
              This is my own experience, and the editorial team may email me to request redacted evidence.
            </label>

            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.5 }}>
              Never submit an ID image, account password, full card or bank number, wallet address, tax
              identifier, or unredacted account ID. See our <Link href="/privacy-policy" style={{ color: 'var(--accent-light)' }}>privacy policy</Link>.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              flexWrap: 'wrap',
            }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={status === 'sending'}
                style={{ opacity: status === 'sending' ? 0.7 : 1 }}
              >
                {status === 'sending' ? 'Sending…' : 'Send for verification'} <Send size={13} />
              </button>
              {status === 'error' && (
                <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: '0.8rem' }}>
                  {feedback}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
