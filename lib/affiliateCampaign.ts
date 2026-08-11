/**
 * India placements share one fail-closed prefix so new India journeys cannot
 * accidentally bypass the RBI named-firm redirect guard.
 */
export function isIndiaCampaign(placement: string) {
  return placement === 'best-prop-firms-in-india' || placement.startsWith('india-')
}
