import { ruDatesInText } from '@/lib/ruDate'

export interface RussianFaqItem {
  q: string
  a: string
}

export default function RussianFaq({ items }: { items: RussianFaqItem[] }) {
  return (
    <div className="ru-faq">
      {items.map(item => (
        <details key={item.q}>
          <summary>{ruDatesInText(item.q)}</summary>
          <p>{ruDatesInText(item.a)}</p>
        </details>
      ))}
    </div>
  )
}
