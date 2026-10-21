import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { russianLowercasePath } from './lib/russianPathCase'

// 308 mixed-case /ru paths to their lowercase URL (see lib/russianPathCase.ts).
// The query string is kept; lowercase paths pass straight through, so this can
// never loop. Only /ru-prefixed paths reach it: /go/, /_next and public assets
// are outside the matcher.
export function proxy(request: NextRequest) {
  const target = russianLowercasePath(request.nextUrl.pathname)
  if (!target) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = target
  return NextResponse.redirect(url, 308)
}

export const config = {
  // Matches a first segment spelled RU/Ru/rU, or a /ru path containing an
  // uppercase letter. Plain lowercase /ru URLs do not invoke the proxy.
  matcher: ['/((?:RU|Ru|rU)(?:/.*)?)', '/(ru/[^A-Z]*[A-Z].*)'],
}
