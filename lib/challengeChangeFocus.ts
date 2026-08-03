export const MAX_FOCUSED_PRODUCTS = 4

const CHALLENGE_PRODUCT_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface ChallengeChangeFocusState {
  requested: boolean
  requestedCount: number
  unavailableCount: number
  products: string[]
}

export interface ChallengeChangeFocusEntry {
  productKeys: string[]
}

export const EMPTY_CHALLENGE_CHANGE_FOCUS: ChallengeChangeFocusState = {
  requested: false,
  requestedCount: 0,
  unavailableCount: 0,
  products: [],
}

export function isChallengeProductKey(value: string) {
  return CHALLENGE_PRODUCT_KEY_PATTERN.test(value)
}

export function validateChallengeProductKeys(keys: string[]) {
  const seen = new Set<string>()
  for (const key of keys) {
    if (!isChallengeProductKey(key)) {
      throw new Error(`Invalid challenge product key: ${key}`)
    }
    if (seen.has(key)) {
      throw new Error(`Duplicate challenge product key: ${key}`)
    }
    seen.add(key)
  }
  return keys
}

export function parseChallengeChangeFocus(
  value: string | null,
  requested: boolean,
  validKeys: ReadonlySet<string>,
): ChallengeChangeFocusState {
  if (!requested) return EMPTY_CHALLENGE_CHANGE_FOCUS
  const requestedProducts = [...new Set(
    (value || '').split(',').slice(0, 20).map(key => key.trim()).filter(Boolean),
  )].slice(0, MAX_FOCUSED_PRODUCTS)
  const products = requestedProducts.filter(key =>
    isChallengeProductKey(key) && validKeys.has(key))
  return {
    requested: true,
    requestedCount: requestedProducts.length,
    unavailableCount: requestedProducts.length - products.length,
    products,
  }
}

export function focusChallengeChangeEntries<T extends ChallengeChangeFocusEntry>(
  entries: readonly T[],
  focus: ChallengeChangeFocusState,
) {
  if (!focus.requested) return [...entries]
  if (!focus.products.length) return []
  const selectedKeys = new Set(focus.products)
  return entries.filter(entry =>
    entry.productKeys.some(key => selectedKeys.has(key)))
}

export function countFocusedProductsWithUpdates(
  entries: readonly ChallengeChangeFocusEntry[],
  products: readonly string[],
) {
  const matchingKeys = new Set(entries.flatMap(entry => entry.productKeys))
  return products.filter(key => matchingKeys.has(key)).length
}
