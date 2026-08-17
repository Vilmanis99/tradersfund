export interface ComparisonDirectoryRow {
  matchup: string
  firmAName: string
  firmBName: string
  productCount: number
  sourceCount: number
  evidenceDate: string | null
  editorial: boolean
}

export function normalizeComparisonQuery(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchesQuery(row: ComparisonDirectoryRow, query: string): boolean {
  if (!query) return true
  const haystack = normalizeComparisonQuery(
    `${row.firmAName} ${row.firmBName} ${row.matchup}`,
  )
  return query.split(/\s+/).every(token => haystack.includes(token))
}

/**
 * With no query, featured editorial cards stay in their section above the
 * directory. Once a trader searches, the whole pair library participates
 * and editorial results sort first without changing the evidence fields.
 */
export function filterComparisonRows(
  rows: ComparisonDirectoryRow[],
  query: string,
): ComparisonDirectoryRow[] {
  const normalizedQuery = normalizeComparisonQuery(query)
  const matching = rows.filter(row => (
    normalizedQuery ? matchesQuery(row, normalizedQuery) : !row.editorial
  ))
  return normalizedQuery
    ? matching.sort((a, b) =>
      Number(b.editorial) - Number(a.editorial)
      || a.firmAName.localeCompare(b.firmAName)
      || a.firmBName.localeCompare(b.firmBName))
    : matching
}
