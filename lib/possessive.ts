/** Possessive form: names ending in s take only an apostrophe (E8 Markets', FundingPips'). */
export function possessive(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`
}
