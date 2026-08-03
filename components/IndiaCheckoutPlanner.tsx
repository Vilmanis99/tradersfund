'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ExternalLink,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react'
import { trackSiteEvent as track } from '@/lib/clientAnalytics'
import type { IndiaMatcherFirm } from '@/lib/indiaMatcher'

const FIELD_STYLE = {
  width: '100%',
  minHeight: 46,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg3)',
  color: '#fff',
  padding: '0 0.8rem',
  fontSize: '0.88rem',
  fontWeight: 700,
} as const

function sourceMoney(amount: number, currency: 'USD' | 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function inrMoney(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function accountSize(sizeUsd: number) {
  return `$${sizeUsd.toLocaleString('en-US')}`
}

function nonNegativeNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function positiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function PlannerField({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: '0.4rem' }}>
      <span style={{ color: 'var(--text)', fontSize: '0.76rem', fontWeight: 800 }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ color: 'var(--muted)', fontSize: '0.68rem', lineHeight: 1.45 }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export default function IndiaCheckoutPlanner({ firms }: { firms: IndiaMatcherFirm[] }) {
  const pricedFirms = useMemo(
    () => firms.flatMap(firm => {
      const products = firm.products.filter(product => product.pricedTiers.length > 0)
      return products.length ? [{ ...firm, products }] : []
    }),
    [firms],
  )
  const unpricedFirmNames = useMemo(
    () => firms
      .filter(firm => !firm.products.some(product => product.pricedTiers.length > 0))
      .map(firm => firm.name),
    [firms],
  )

  const firstFirm = pricedFirms[0]
  const [firmSlug, setFirmSlug] = useState(firstFirm?.slug ?? '')
  const [productSlug, setProductSlug] = useState(firstFirm?.products[0]?.slug ?? '')
  const [tierIndex, setTierIndex] = useState(0)
  const [rateInput, setRateInput] = useState('')
  const [markupInput, setMarkupInput] = useState('0')
  const [otherChargesInput, setOtherChargesInput] = useState('0')
  const contextualLoadRef = useRef('')
  const completedEstimateRef = useRef('')

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const requestedFirmSlug = params.get('costFirm')
      const requestedProductSlug = params.get('costProduct')
      if (!requestedFirmSlug || !requestedProductSlug) return

      const requestedFirm = pricedFirms.find(firm => firm.slug === requestedFirmSlug)
      const requestedProduct = requestedFirm?.products.find(
        product => product.slug === requestedProductSlug,
      )
      if (!requestedFirm || !requestedProduct) return

      const requestedSizeParam = params.get('costSize')
      const requestedSize = requestedSizeParam == null ? null : Number(requestedSizeParam)
      const requestedTierIndex = requestedSize != null && Number.isFinite(requestedSize)
        ? requestedProduct.pricedTiers.findIndex(tier => tier.sizeUsd === requestedSize)
        : -1
      const nextTierIndex = requestedTierIndex >= 0 ? requestedTierIndex : 0
      setFirmSlug(requestedFirm.slug)
      setProductSlug(requestedProduct.slug)
      setTierIndex(nextTierIndex)

      const contextKey = `${requestedFirm.slug}:${requestedProduct.slug}:${nextTierIndex}`
      if (contextualLoadRef.current !== contextKey) {
        contextualLoadRef.current = contextKey
        track('challenge_inr_planner_loaded', {
          product: `${requestedFirm.slug}:${requestedProduct.slug}`,
          size: String(requestedProduct.pricedTiers[nextTierIndex]?.sizeUsd ?? 'default'),
        })
      }
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [pricedFirms])

  const selectedFirm = pricedFirms.find(firm => firm.slug === firmSlug) ?? firstFirm
  const selectedProduct = selectedFirm?.products.find(product => product.slug === productSlug)
    ?? selectedFirm?.products[0]
  const selectedTier = selectedProduct?.pricedTiers[
    Math.min(tierIndex, Math.max(0, selectedProduct.pricedTiers.length - 1))
  ]

  if (!selectedFirm || !selectedProduct || !selectedTier) return null

  const rate = positiveNumber(rateInput)
  const markupPct = nonNegativeNumber(markupInput)
  const otherCharges = nonNegativeNumber(otherChargesInput)
  const converted = rate == null ? null : selectedTier.price.amount * rate
  const markup = converted == null ? null : converted * (markupPct / 100)
  const total = converted == null || markup == null
    ? null
    : converted + markup + otherCharges
  const pricedProductCount = pricedFirms.reduce(
    (count, firm) => count + firm.products.length,
    0,
  )

  const changeFirm = (nextSlug: string) => {
    const nextFirm = pricedFirms.find(firm => firm.slug === nextSlug)
    setFirmSlug(nextSlug)
    setProductSlug(nextFirm?.products[0]?.slug ?? '')
    setTierIndex(0)
    track('challenge_inr_planner_use', { control: 'firm', selection: nextSlug })
  }

  const changeProduct = (nextSlug: string) => {
    setProductSlug(nextSlug)
    setTierIndex(0)
    track('challenge_inr_planner_use', {
      control: 'product',
      selection: `${selectedFirm.slug}:${nextSlug}`,
    })
  }

  const changeTier = (nextIndex: number) => {
    setTierIndex(nextIndex)
    const nextTier = selectedProduct.pricedTiers[nextIndex]
    track('challenge_inr_planner_use', {
      control: 'tier',
      selection: nextTier?.sizeUsd ?? 'unknown',
    })
  }

  const productKey = `${selectedFirm.slug}:${selectedProduct.slug}`
  const campaign = `india-inr-planner-${selectedProduct.slug}-${selectedTier.price.currency.toLowerCase()}`
  const actionHref = selectedFirm.isPartner
    ? `/go/${selectedFirm.slug}?from=${campaign}`
    : `${selectedFirm.reviewUrl}?from=india-inr-planner`

  return (
    <section className="home-section" aria-labelledby="india-checkout-planner-heading">
      <div className="home-shell">
        <div className="section-head">
          <div>
            <h2 id="india-checkout-planner-heading" className="section-title">
              <IndianRupee size={18} style={{ color: 'var(--accent-light)' }} />
              Estimate your INR checkout
            </h2>
            <p className="section-sub-text">
              Apply the exchange rate shown by your own bank, card, or payment provider to a
              source-captured challenge fee. We never substitute a stale INR conversion.
            </p>
          </div>
          <span className="section-sub">
            <ShieldCheck size={13} /> Your numbers stay in this browser
          </span>
        </div>

        <div
          className="post-sidebar-card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: 'clamp(1rem, 3vw, 2rem)',
            padding: 'clamp(1.15rem, 3vw, 1.75rem)',
          }}
        >
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '0.9rem',
              }}
            >
              <PlannerField id="india-cost-firm" label="Firm">
                <select
                  id="india-cost-firm"
                  value={selectedFirm.slug}
                  onChange={event => changeFirm(event.target.value)}
                  style={FIELD_STYLE}
                >
                  {pricedFirms.map(firm => (
                    <option key={firm.slug} value={firm.slug}>
                      {firm.name}
                    </option>
                  ))}
                </select>
              </PlannerField>

              <PlannerField id="india-cost-product" label="Program">
                <select
                  id="india-cost-product"
                  value={selectedProduct.slug}
                  onChange={event => changeProduct(event.target.value)}
                  style={FIELD_STYLE}
                >
                  {selectedFirm.products.map(product => (
                    <option key={product.slug} value={product.slug}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </PlannerField>

              <PlannerField id="india-cost-tier" label="Account size">
                <select
                  id="india-cost-tier"
                  value={tierIndex}
                  onChange={event => changeTier(Number(event.target.value))}
                  style={FIELD_STYLE}
                >
                  {selectedProduct.pricedTiers.map((tier, index) => (
                    <option key={`${tier.sizeUsd}-${index}`} value={index}>
                      {accountSize(tier.sizeUsd)} — {sourceMoney(tier.price.amount, tier.price.currency)}
                    </option>
                  ))}
                </select>
              </PlannerField>

              <PlannerField
                id="india-cost-rate"
                label={`Your current ₹ per ${selectedTier.price.currency}`}
                hint="Use the rate displayed by the payment method you intend to use."
              >
                <input
                  id="india-cost-rate"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder={selectedTier.price.currency === 'USD' ? 'e.g. rate per US dollar' : 'e.g. rate per euro'}
                  value={rateInput}
                  onChange={event => setRateInput(event.target.value)}
                  onBlur={event => {
                    const rateValue = event.currentTarget.value.trim()
                    const completionKey = `${productKey}:${selectedTier.sizeUsd}:${rateValue}`
                    if (
                      positiveNumber(rateValue) != null
                      && completedEstimateRef.current !== completionKey
                    ) {
                      completedEstimateRef.current = completionKey
                      track('challenge_inr_estimate_completed', {
                        product: productKey,
                        currency: selectedTier.price.currency,
                      })
                    }
                  }}
                  style={FIELD_STYLE}
                />
              </PlannerField>

              <PlannerField
                id="india-cost-markup"
                label="FX or processor markup (%)"
                hint="Enter 0 if your displayed exchange rate already includes the markup."
              >
                <input
                  id="india-cost-markup"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={markupInput}
                  onChange={event => setMarkupInput(event.target.value)}
                  style={FIELD_STYLE}
                />
              </PlannerField>

              <PlannerField
                id="india-cost-other"
                label="Other checkout charges (₹)"
                hint="Optional manual amount for any bank, tax, or processor charge shown to you."
              >
                <input
                  id="india-cost-other"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={otherChargesInput}
                  onChange={event => setOtherChargesInput(event.target.value)}
                  style={FIELD_STYLE}
                />
              </PlannerField>
            </div>

            <p style={{ margin: '1rem 0 0', color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.55 }}>
              {pricedProductCount} products across {pricedFirms.length} firms have a public fee.
              {unpricedFirmNames.length > 0 && (
                <> {unpricedFirmNames.join(', ')} remains excluded because its first-party challenge fee is not publicly verifiable.</>
              )}
            </p>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(167, 139, 250, 0.22)',
              background: 'linear-gradient(145deg, rgba(124,58,237,0.12), rgba(15,23,42,0.72))',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span className="bento-tile-eyebrow">
              <Calculator size={12} /> Checkout estimate
            </span>
            <div style={{ marginTop: '0.8rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
              Published fee
            </div>
            <div style={{ marginTop: '0.15rem', color: '#fff', fontSize: '1.25rem', fontWeight: 900 }}>
              {sourceMoney(selectedTier.price.amount, selectedTier.price.currency)}
            </div>

            <div
              aria-live="polite"
              style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                Estimated amount at checkout
              </div>
              <div style={{
                marginTop: '0.2rem',
                color: total == null ? 'var(--muted)' : 'var(--accent-light)',
                fontSize: 'clamp(1.65rem, 4vw, 2.35rem)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
              }}>
                {total == null ? 'Enter your rate' : inrMoney(total)}
              </div>
            </div>

            {converted != null && markup != null && (
              <dl style={{ margin: '1rem 0 0', display: 'grid', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Converted fee</dt>
                  <dd style={{ margin: 0, color: 'var(--text)', fontSize: '0.75rem', fontWeight: 800 }}>
                    {inrMoney(converted)}
                  </dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Entered markup</dt>
                  <dd style={{ margin: 0, color: 'var(--text)', fontSize: '0.75rem', fontWeight: 800 }}>
                    {inrMoney(markup)}
                  </dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Other entered charges</dt>
                  <dd style={{ margin: 0, color: 'var(--text)', fontSize: '0.75rem', fontWeight: 800 }}>
                    {inrMoney(otherCharges)}
                  </dd>
                </div>
              </dl>
            )}

            <p style={{ margin: '1rem 0 0', color: 'var(--muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
              Fee captured {new Date(selectedProduct.capturedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}. This estimate is not a quote and does not assume a discount. Refund status:{' '}
              {selectedTier.refundable === true
                ? 'published as refundable'
                : selectedTier.refundable === false
                  ? 'published as non-refundable'
                  : 'not verified'}.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              {selectedFirm.isPartner ? (
                <Link
                  href={actionHref}
                  prefetch={false}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className="btn-primary"
                  onClick={() => track('challenge_offer_open', {
                    surface: 'india-planner',
                    product: productKey,
                  })}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Check the live checkout <ExternalLink size={14} />
                </Link>
              ) : (
                <Link
                  href={actionHref}
                  className="btn-outline"
                  onClick={() => track('challenge_review_open', {
                    surface: 'india-planner',
                    product: productKey,
                  })}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Read the sourced review <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>

        <p style={{ margin: '0.8rem 0 0', color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.55 }}>
          Exchange-rate, markup, and other-charge inputs are not sent with the outbound click. The campaign
          label records only the selected product placement and whether its published fee was USD or EUR.
        </p>
      </div>
    </section>
  )
}
