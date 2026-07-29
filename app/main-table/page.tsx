import { permanentRedirect } from 'next/navigation'

type LegacyDirectorySearchParams =
  Promise<Record<string, string | string[] | undefined>>

export default async function LegacyMainTablePage({
  searchParams,
}: {
  searchParams: LegacyDirectorySearchParams
}) {
  const query = await searchParams
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    } else if (value != null) {
      params.set(key, value)
    }
  }

  const suffix = params.size ? `?${params.toString()}` : ''
  permanentRedirect(`/prop-firms${suffix}`)
}
