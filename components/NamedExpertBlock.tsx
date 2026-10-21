import { getPublishableExpert, getPublishableExperts, type NamedExpert } from '@/lib/namedExperts'

function ExpertCard({ expert }: { expert: NamedExpert }) {
  return (
    <section className="tf-expert" data-named-expert={expert.authorSlug} aria-labelledby={`expert-${expert.authorSlug}`}>
      {expert.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={expert.photoUrl} alt="" width={96} height={96} className="tf-expert__photo" />
      )}
      <div>
        <h2 id={`expert-${expert.authorSlug}`} className="tf-expert__name">{expert.displayName}</h2>
        {expert.role && <p className="tf-expert__role">{expert.role}</p>}
        {expert.bio.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {expert.credentials.length > 0 && (
          <ul className="tf-expert__credentials">
            {expert.credentials.map(credential => <li key={credential}>{credential}</li>)}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * Gated named-expert block (content/data/named-experts.json). Renders nothing
 * until the expert's name, bio and consent date are all present.
 */
export default function NamedExpertBlock({ authorSlug }: { authorSlug?: string }) {
  const experts = authorSlug
    ? [getPublishableExpert(authorSlug)].filter((expert): expert is NamedExpert => Boolean(expert))
    : getPublishableExperts()
  if (experts.length === 0) return null
  return <>{experts.map(expert => <ExpertCard key={expert.authorSlug} expert={expert} />)}</>
}
