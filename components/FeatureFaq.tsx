import type { FeatureFaq as FaqItem } from '@/lib/features'

/**
 * Renders FAQ entries using the same `.faq-item` / `.faq-question` /
 * `.faq-answer` CSS already defined in globals.css for WP-imported FAQ
 * blocks. Pair with `faqPageSchema()` JSON-LD in the parent route for
 * rich-result eligibility.
 */
export default function FeatureFaq({ faqs }: { faqs: FaqItem[] }) {
  if (!faqs.length) return null
  return (
    <div className="prose" style={{ marginTop: '1rem' }}>
      {faqs.map(({ q, a }) => (
        <div key={q} className="faq-item">
          <div className="faq-question">{q}</div>
          <div className="faq-answer">{a}</div>
        </div>
      ))}
    </div>
  )
}
