import type { ReactNode } from 'react'
import FirmLogo from '../FirmLogo'
import CopyCodeBox from './CopyCodeBox'
import { HOME_COPY, type HomeLocale } from './copy'

export interface OfferFact { label: string; value: string }

/**
 * Commercial partner card. The code box renders only when a verified
 * deals.json code is passed; otherwise it is omitted rather than faked.
 */
export default function FeaturedOfferCard({ logoClassName, locale, firmSlug, firmName, logo, score, badge, title, facts, code, placement, primary, secondary, children, data }: {
  logoClassName?: string; locale: HomeLocale; firmSlug: string; firmName: string; logo?: string; score?: number; badge?: ReactNode; title?: ReactNode
  facts: OfferFact[]; code?: { code: string; pct?: number; amountLabel: string } | null; placement: string
  primary: ReactNode; secondary?: ReactNode; children?: ReactNode; data?: Record<string, string>
}) {
  const t = HOME_COPY[locale]
  return (
    <article className="th-offer" {...data}>
      <span className="th-offer__sponsored">{t.sponsored}</span>
      <div className="th-offer__head">
        <span className={logoClassName}><FirmLogo name={firmName} src={logo} size={52} /></span>
        <div>
          {title ?? <h3>{firmName}</h3>}
          <div className="th-offer__meta">
            {score != null ? <span className="th-score">★ {score.toFixed(1)}/10</span> : null}
            {badge}
          </div>
        </div>
      </div>
      {facts.length ? <dl className="th-facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
      {children ? <div className="th-offer__notes">{children}</div> : null}
      {code ? <CopyCodeBox code={code.code} pct={code.pct} label={`${t.code} · ${code.amountLabel}`} locale={locale} firm={firmSlug} placement={placement} /> : null}
      <div className="th-offer__actions">{primary}{secondary}</div>
    </article>
  )
}
