/** Editorial date of the /how-we-make-money text (partner lists are read live from firms.json). */
export const HOW_WE_MAKE_MONEY_UPDATED = '2026-10-20'

/**
 * The partnership policy, word for word, shared by the footers,
 * /how-we-make-money and /ru/kak-my-zarabatyvaem so the claim is stated once.
 * Russia-first ordering is enforced in code in two places: the /ru home
 * table (components/home/homeData.ts: russiaStatus, then score) and the
 * /ru/luchshie-prop-firmy hub (lib/russianRanking.ts: editorial pins from
 * content/data/ru-ranking.json apply only while the firm is 'available',
 * then russiaStatus). Other RU pages are ordered editorially, hence "usually".
 */
export const PARTNERSHIP_POLICY = {
  en: 'Partnerships never change our scores. Partner firms may get more prominent placement and sign-up buttons. Partner links are tagged as sponsored, and the page says we may earn a commission. On Russian pages, firms open to Russian residents are usually listed first, and the Russian home table and ranking hub always put them first.',
  ru: 'Партнёрство никогда не влияет на наши оценки. Фирмы-партнёры могут получать более заметное место и кнопки регистрации. Партнёрские ссылки размечены как рекламные, а на странице сказано, что мы можем получить комиссию. На русскоязычных страницах фирмы, доступные резидентам России, обычно идут первыми, а в таблице на главной и в русскоязычном рейтинге — всегда.',
} as const
