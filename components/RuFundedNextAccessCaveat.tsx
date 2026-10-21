/**
 * FundedNext Russia-access caveat for /ru pages. The badge itself stays driven by firms.json
 * (russiaStatus 'restricted' since Prop Firm Tracker data/daily-check-2026-10-20 @ 41f3c05).
 * Sources (checked 20.10.2026):
 * - fundednext.com footer: "The FundedNext Entities do not offer services to residents of the following jurisdictions: ... Belarus, Iran, and Russia ..."
 * - ToS §5.3 (CFD Services) restricted list does not name Russia.
 * - FundedNext Futures: Russia is on the purchase ban list.
 */
export const FUNDEDNEXT_RU_ACCESS_CHECKED = '20.10.2026'
export const FUNDEDNEXT_FOOTER_URL = 'https://fundednext.com/'
export const FUNDEDNEXT_TERMS_URL = 'https://fundednext.com/api_docs/terms-of-service'

/** Plain-text version for FAQ answers, table cells and other string contexts. */
export const FUNDEDNEXT_RU_ACCESS_NOTE = `FundedNext недоступна для резидентов РФ: в подвале сайта fundednext.com сказано, что компании FundedNext не оказывают услуги резидентам России; список в условиях (п. 5.3, CFD) Россию не называет, но мы считаем действующим более строгий источник. FundedNext Futures также запрещает покупку из России (по данным на ${FUNDEDNEXT_RU_ACCESS_CHECKED}). Резидент РФ рискует получить отказ в обслуживании или в выплате.`

export default function RuFundedNextAccessCaveat({ className = 'ru-source-line' }: { className?: string }) {
  return (
    <p className={className} data-russian-fundednext-access-caveat="footer-restricted">
      <strong>FundedNext недоступна для РФ.</strong>{' '}
      В <a href={FUNDEDNEXT_FOOTER_URL} target="_blank" rel="noopener noreferrer">подвале сайта fundednext.com</a> сказано, что
      компании FundedNext не оказывают услуги резидентам России. Список в{' '}
      <a href={FUNDEDNEXT_TERMS_URL} target="_blank" rel="noopener noreferrer">условиях FundedNext</a> (п. 5.3, CFD) Россию не
      называет, но мы считаем действующим более строгий источник; FundedNext Futures также запрещает покупку из России (по
      данным на {FUNDEDNEXT_RU_ACCESS_CHECKED}). Резидент РФ рискует получить отказ в обслуживании или в выплате. Резидентам
      России мы рекомендуем BrightFunded.
    </p>
  )
}
