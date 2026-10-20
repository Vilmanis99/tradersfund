import data from '@/content/data/corrections.json'

export interface CorrectionEntry {
  id: string
  /** Date the correction was recorded (YYYY-MM-DD). */
  date: string
  firmSlug?: string
  pages: Array<{ path: string; label: string }>
  wasWrong: string
  correction: string
  /** First-party sources the corrected statement now rests on. */
  sources: string[]
  /** Short SHA of the commit that shipped the fix. */
  commit: string
  /** Matching entry in content/data/challenge-watch.json, when one exists. */
  watchId?: string
}

const REPO_COMMIT_BASE = 'https://github.com/Vilmanis99/tradersfund/commit/'

export function getCorrections(): CorrectionEntry[] {
  return [...(data.entries as CorrectionEntry[])].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export function correctionCommitUrl(entry: CorrectionEntry): string {
  return REPO_COMMIT_BASE + entry.commit
}

export function latestCorrectionDate(): string | undefined {
  return getCorrections()[0]?.date
}
