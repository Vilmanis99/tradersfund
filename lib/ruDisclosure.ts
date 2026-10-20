import copy from '../content/data/ru-how-we-make-money.json'

export const RU_DISCLOSURE_PATH = '/ru/kak-my-zarabatyvaem'
const EN_DISCLOSURE_PATH = '/how-we-make-money'

export interface RuDisclosureSection {
  heading: string
  paragraphs: string[]
}

export interface RuDisclosureCopy {
  published: boolean
  updated: string | null
  title: string
  description: string
  h1: string
  lead: string
  partnersHeading: string
  sections: RuDisclosureSection[]
}

export const RU_DISCLOSURE = copy as RuDisclosureCopy

/** True only when the copy is published and complete enough to render. */
export function isRuDisclosureReady(data: RuDisclosureCopy = RU_DISCLOSURE): boolean {
  return data.published === true
    && Boolean(data.title.trim() && data.description.trim() && data.h1.trim())
    && data.sections.some(section => section.heading.trim() && section.paragraphs.some(p => p.trim()))
}

/** Where the RU footer's «Как мы зарабатываем» link points. */
export function ruDisclosureHref(): string {
  return isRuDisclosureReady() ? RU_DISCLOSURE_PATH : EN_DISCLOSURE_PATH
}
