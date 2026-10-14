import type { ReactNode } from 'react'
import Link from 'next/link'

export interface HeroCounter { value: string; label: string }
export interface HeroAction { href: string; label: string; variant?: 'primary' | 'secondary'; hrefLang?: string }

/** Dark, server-rendered hero: eyebrow, single H1, lead, CTAs, counters and an aside panel. */
export default function HeroBlock({ id, eyebrow, title, lead, actions, counters, aside, data }: {
  id: string; eyebrow: ReactNode; title: ReactNode; lead: ReactNode; actions: HeroAction[]; counters: HeroCounter[]; aside?: ReactNode
  data?: Record<string, string>
}) {
  return (
    <section className="th-hero" aria-labelledby={id} {...data}>
      <div className="th-wrap th-hero__grid">
        <div className="th-hero__copy">
          <span className="th-eyebrow">{eyebrow}</span>
          <h1 id={id} className="th-hero__title">{title}</h1>
          <p className="th-hero__lead">{lead}</p>
          <div className="th-hero__actions">
            {actions.map(action => (
              <Link key={action.href} href={action.href} hrefLang={action.hrefLang} className={`th-btn th-btn--lg ${action.variant === 'secondary' ? 'th-btn--on-dark' : 'th-btn--amber'}`}>{action.label}</Link>
            ))}
          </div>
          <dl className="th-counters">
            {counters.map(counter => <div key={counter.label}><dt>{counter.label}</dt><dd>{counter.value}</dd></div>)}
          </dl>
        </div>
        {aside ? <div className="th-hero__aside">{aside}</div> : null}
      </div>
    </section>
  )
}
