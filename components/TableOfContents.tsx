export default function TableOfContents({ html }: { html: string }) {
  // Extract h2 headings from HTML content
  const headings: { text: string; id: string }[] = []
  const regex = /<h2[^>]*>(.*?)<\/h2>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim()
    if (text) {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      headings.push({ text, id })
    }
  }

  if (headings.length < 3) return null

  return (
    <nav className="toc">
      <div className="toc-title">Table of Contents</div>
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
