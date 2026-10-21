/**
 * Mixed-case Russian paths (/RU/obzor-ftmo, /ru/OBZOR-FTMO) are not routes.
 * Production matched them case-insensitively against the prerendered
 * /ru/<slug> output and then failed to render, returning HTTP 500. Every
 * Russian route is lowercase, so the proxy sends them to the lowercase URL.
 *
 * Returns the lowercase pathname, or null when nothing should change. Percent
 * escapes keep their original form (%D0 and %d0 are the same byte), so an
 * encoded path is never redirected just for its hex digits, and the result is
 * always a fixed point: a redirect target never redirects again.
 */
export function russianLowercasePath(pathname: string): string | null {
  const [first = ''] = pathname.split('/').filter(Boolean)
  if (first.toLowerCase() !== 'ru') return null
  const lowered = pathname.replace(/%[0-9a-f]{2}|[^%]+|%/gi, part =>
    part.startsWith('%') ? part : part.toLowerCase())
  return lowered === pathname ? null : lowered
}
