import IndiaCuratedMatchupPage from '@/components/IndiaCuratedMatchupPage'
import {
  getIndiaMatchupConfig,
  indiaMatchupMetadata,
} from '@/lib/indiaMatchups'

const CONFIG = getIndiaMatchupConfig('bright-funded-vs-fxify')

export const metadata = indiaMatchupMetadata(CONFIG)

export default function Page() {
  return <IndiaCuratedMatchupPage config={CONFIG} />
}
