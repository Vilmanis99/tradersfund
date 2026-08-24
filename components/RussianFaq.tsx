export interface RussianFaqItem {
  q: string
  a: string
}

export default function RussianFaq({ items }: { items: RussianFaqItem[] }) {
  return (
    <div className="ru-faq">
      {items.map(item => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}
