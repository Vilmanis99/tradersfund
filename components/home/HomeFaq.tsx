export interface FaqItem { q: string; a: string }

/** Accessible FAQ built on native details; pair with faqPageSchema(items) on the page. */
export default function HomeFaq({ id, title, items }: { id: string; title: string; items: FaqItem[] }) {
  return (
    <section className="th-section th-section--alt" aria-labelledby={id}>
      <div className="th-wrap th-faq">
        <h2 id={id}>{title}</h2>
        {items.map((item, index) => (
          <details key={item.q} open={index === 0}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
