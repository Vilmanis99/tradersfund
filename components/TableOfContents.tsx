import type { ArticleHeading } from '@/lib/articleContent'

export default function TableOfContents({ headings }: { headings: ArticleHeading[] }) {
  if (headings.length < 3) return null

  return (
    <nav className="toc article-toc" aria-label="On this page">
      <div className="toc-title">On this page</div>
      <ol>
        {headings.map(h => (
          <li key={h.id}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
