import IndiaCuratedMatchupPage from '@/components/IndiaCuratedMatchupPage'
import {
  getIndiaMatchupConfig,
  indiaMatchupMetadata,
} from '@/lib/indiaMatchups'

const CONFIG = getIndiaMatchupConfig('fundingpips-vs-bright-funded')

export const metadata = indiaMatchupMetadata(CONFIG)

export default function Page() {
  return <IndiaCuratedMatchupPage config={CONFIG} />
}
