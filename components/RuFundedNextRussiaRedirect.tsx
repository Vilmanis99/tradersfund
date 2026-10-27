import Link from 'next/link'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { RuAccessBadgeView } from './RuAccessBadgeView'
import { FUNDEDNEXT_RU_ACCESS_CHECKED } from './RuFundedNextAccessCaveat'
import { formatRuDate } from '@/lib/ruDate'

/**
 * Top-of-page note for /ru pages whose topic is FundedNext itself. The page keeps its
 * topic for Russian-speaking traders in other countries, but Russian residents are sent
 * to BrightFunded. Status comes from firms.json via russiaStatusFor only.
 */
export default function RuFundedNextRussiaRedirect({ alternativeHref }: { alternativeHref?: string }) {
  if (russiaStatusFor('fundednext') !== 'restricted') return null
  return (
    <div className="ru-notice" data-russian-fundednext-russia-redirect="bright-funded">
      <RuAccessBadgeView firm="fundednext" status="restricted" hint={false} />{' '}
      <strong>Резидентам России FundedNext недоступна</strong> (по данным на {formatRuDate(FUNDEDNEXT_RU_ACCESS_CHECKED)}).
      Этот материал — для русскоязычных трейдеров из других стран. Если вы живёте в России, начните с BrightFunded:{' '}
      <Link href="/ru/obzor-bright-funded">русский обзор BrightFunded</Link>
      {alternativeHref ? <>{' · '}<Link href={alternativeHref}>карточка BrightFunded на этой странице</Link></> : null}.
    </div>
  )
}
