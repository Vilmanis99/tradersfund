/** Editorial date of the /how-we-make-money text (partner lists are read live from firms.json). */
export const HOW_WE_MAKE_MONEY_UPDATED = '2026-10-20'

/**
 * The partnership policy, word for word, shared by the footers and
 * /how-we-make-money so the claim is stated once. The Russian-page ordering
 * sentence reflects components/home/homeData.ts, which sorts /ru rows by
 * russiaStatus from content/data/firms.json before score.
 */
export const PARTNERSHIP_POLICY = {
  en: 'Partnerships never change our scores. Partner firms may get more prominent placement and sign-up buttons, which are always labelled. On Russian pages we place firms open to Russian residents first.',
  ru: 'Партнёрство никогда не влияет на наши оценки. Фирмы-партнёры могут получать более заметное место и кнопки регистрации — такие места всегда помечены. На русскоязычных страницах первыми идут фирмы, доступные резидентам России.',
} as const
