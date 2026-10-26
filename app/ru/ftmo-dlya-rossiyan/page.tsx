import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'
import Breadcrumbs from '@/components/Breadcrumbs'
import RuFundedNextAccessCaveat from '@/components/RuFundedNextAccessCaveat'
import { ruNotListedDate } from '@/lib/ruBasisWording'
import { RU_EXTRA_RUSSIA_BASIS } from '@/lib/ruAccessExtra'
import { ruAccessDate } from '@/lib/ruAccessLabel'

const PATH = '/ru/ftmo-dlya-rossiyan'
const CHECKED = '14.10.2026'
const FTMO_SOURCE = 'https://ftmo.com/en/faq/who-can-join-ftmo/'
const FTMO_AFFILIATE_SOURCE = 'https://ftmo.com/en/faq/are-there-country-restrictions-for-affiliates-and-referred-clients/'
export const revalidate = 86400
const TITLE = 'FTMO для россиян 2026: работает ли в РФ и чем заменить'
const DESCRIPTION = 'FTMO в России не работает: РФ в официальном списке ограниченных стран FTMO. Какие страны СНГ закрыты, риски обхода через VPN и альтернативы для трейдеров из РФ.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['ftmo россия', 'ftmo russia', 'ftmo работает в россии', 'ftmo restricted countries', 'ftmo для россиян'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const restricted = [
  { region: 'Россия (Russian Federation)', status: 'Ограничена полностью' },
  { region: 'Беларусь', status: 'Ограничена полностью' },
  { region: 'Казахстан', status: 'Ограничена полностью' },
  { region: 'Кыргызстан', status: 'Ограничена полностью' },
  { region: 'Узбекистан', status: 'Ограничена полностью' },
  { region: 'Таджикистан', status: 'Ограничена полностью' },
  { region: 'Туркменистан', status: 'Ограничена полностью' },
  { region: 'Украина', status: 'Частично: Крым, Севастополь, Донецкая, Луганская, Херсонская и Запорожская области' },
]

// Upscale: статус для РФ из lib/ruAccessExtra.ts (russiaStatus 'unclear', Условия прочитаны 26.10.2026); ставим после фирм без РФ в списке ограничений.
const UPSCALE_CHECKED = ruAccessDate(RU_EXTRA_RUSSIA_BASIS.upscale.russiaSourceCapturedAt)

const alternatives = [
  { slug: 'bright-funded', name: 'BrightFunded', russia: `Нет в списке ограничений (на ${ruNotListedDate('bright-funded')})`, kyc: 'Исключает лиц из санкционных списков', payout: 'USDC (ERC-20), банк в EUR', review: '/ru/obzor-bright-funded' },
  { slug: 'crypto-fund-trader', name: 'Crypto Fund Trader', russia: `Нет в списке ограничений (на ${ruNotListedDate('crypto-fund-trader')}; Match-Trader)`, kyc: 'Не проверено', payout: 'USDT ERC20/TRC20, BTC, ETH, банк', review: '/blog/crypto-fund-trader-review' },
  { slug: 'upscale', name: 'Upscale', russia: `Статус неясен: Условия (15.05.2026) исключают резидентов стран под санкциями США/ЕС/Великобритании (на ${UPSCALE_CHECKED})`, kyc: 'Для вывода — паспорт и селфи (Условия, п. 6)', payout: 'USDT на свой кошелёк', review: null },
] as const

const faqs: RussianFaqItem[] = [
  {
    q: 'FTMO работает в России?',
    a: `Нет. На ${CHECKED} Russian Federation есть в официальном списке стран FTMO, резидентам которых услуги не предоставляются.`,
  },
  {
    q: 'Какие страны входят в FTMO restricted countries из СНГ?',
    a: 'Россия, Беларусь, Казахстан, Кыргызстан, Узбекистан, Таджикистан и Туркменистан, а также отдельные регионы Украины: Крым, Севастополь, Донецкая, Луганская, Херсонская и Запорожская области. Полный список длиннее и включает страны за пределами СНГ.',
  },
  {
    q: 'Можно ли пройти FTMO через VPN?',
    a: 'Технически вы можете купить челлендж, но до профинансированного этапа FTMO проводит проверку личности (FTMO Identity). Документ резидента РФ её не пройдёт, и потраченный взнос вы, скорее всего, потеряете.',
  },
  {
    q: 'Чем заменить FTMO трейдеру из России?',
    a: `На дату проверки Россию в списках ограничений не называют Crypto Fund Trader (Match-Trader) и BrightFunded; у Upscale статус для РФ неясен (на ${UPSCALE_CHECKED}): Условия (15.05.2026) исключают резидентов стран под санкциями США/ЕС/Великобритании, а для вывода нужен KYC по паспорту; FundedNext с 20.10.2026 резидентам России недоступна (подвал её сайта). Условия у них разные — сравните правила по ссылкам на обзоры.`,
  },
  {
    q: 'Почему на этой странице нет ссылки на регистрацию в FTMO?',
    a: 'Потому что резидент России не может легально пройти FTMO. Кроме того, сама FTMO не начисляет партнёрскую комиссию по заказам из ограниченных стран — то есть сайту, который всё же ведёт россиян в FTMO, это ещё и невыгодно.',
  },
]

export default function FtmoForRussiansPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'FTMO для россиян' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    dateModified: russianRouteDateModified(PATH),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-ftmo-russia="restricted">
          <div className="ru-eyebrow"><ShieldAlert size={14} aria-hidden="true" /> <span className="ru-badge ru-badge--closed">Недоступно для РФ · проверено {CHECKED}</span></div>
          <h1>FTMO для россиян: работает ли FTMO в России и чем его заменить</h1>
          <p className="ru-lead">
            Короткий ответ — нельзя. «Russian Federation» стоит в официальном списке FTMO рядом с Беларусью, Казахстаном
            и ещё четырьмя странами Центральной Азии. Ниже — что именно написано в правилах, что будет, если попробовать
            обойти ограничение, и куда смотреть вместо FTMO.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Источник: <a href={FTMO_SOURCE} target="_blank" rel="nofollow noopener noreferrer">FAQ FTMO «Who can join FTMO»</a>, открыт {CHECKED}.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="ftmo-russia">
            <strong>Партнёрское раскрытие.</strong> На этой странице нет ссылки на регистрацию в FTMO. По кнопкам альтернатив
            Traders Fund Hub может получить комиссию; на изложение правил FTMO это не влияет.
          </div>
        </div>
      </section>

      <section className="ru-section" id="spisok">
        <div className="ru-shell ru-content">
          <h2>Официальный список: FTMO restricted countries для СНГ</h2>
          <p>
            FTMO публикует перечень стран, резидентам которых услуги не оказываются. В нём больше 70 позиций — от Ирана и КНДР
            до небольших островных государств. Для русскоязычных трейдеров важна вот эта часть:
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-ftmo-restricted="cis">
              <caption className="hidden-caption">Ограничения FTMO для стран СНГ и Украины на {CHECKED}</caption>
              <thead><tr><th>Страна / регион</th><th>Статус в FTMO</th></tr></thead>
              <tbody>
                {restricted.map(row => (
                  <tr key={row.region}><td><strong>{row.region}</strong></td><td>{row.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Отдельная деталь, о которой редко пишут: по <a href={FTMO_AFFILIATE_SOURCE} target="_blank" rel="nofollow noopener noreferrer">правилам партнёрской программы</a>{' '}
            FTMO не платит комиссию за клиентов из ограниченных стран. Если блогер всё равно отправляет россиян «по своей
            ссылке» в FTMO, он делает это либо по незнанию, либо не читая правил.
          </p>
        </div>
      </section>

      <section className="ru-section" id="obhod">
        <div className="ru-shell ru-content">
          <h2>Что будет, если обойти ограничение</h2>
          <p>
            Купить челлендж через VPN, возможно, получится. Получить деньги — нет. Перед выходом на профинансированный этап
            FTMO проводит проверку личности (FTMO Identity): паспорт и адрес резидента России её не пройдут. Получается худший
            сценарий — вы оплатили оценку, потратили недели на торговлю и упёрлись в KYC ровно в тот момент, когда должны
            были начать зарабатывать.
          </p>
          <p>
            Чужие документы или «знакомый за границей» — уже не нарушение правил, а риск блокировки выплаты и проблем
            посерьёзнее. Не рекомендуем ни то, ни другое.
          </p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell ru-content">
          <h2>Альтернативы FTMO для трейдеров из России</h2>
          <p>
            BrightFunded и Crypto Fund Trader Россию в списках ограничений не называют. У Upscale статус для РФ неясен
            (на {UPSCALE_CHECKED}): Условия (15.05.2026) исключают резидентов стран под санкциями США/ЕС/Великобритании, а для
            вывода нужен KYC по паспорту; в FAQ сказано иное, но обязывающий текст — Условия.
            Это не копии FTMO: у Upscale и Crypto Fund Trader упор на
            крипту, у BrightFunded — на форекс и индексы, хотя криптопары она тоже предлагает (более 48, по данным справки
            BrightFunded, проверка 20.10.2026). Сравнивайте правила, а не логотипы.
            Правила FTMO и FundedNext по пунктам — в сравнении <Link href="/ru/ftmo-vs-fundednext">«FTMO или FundedNext»</Link>.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-ftmo-alternatives="russia">
              <caption className="hidden-caption">Альтернативы FTMO для трейдеров из России: статус доступа по каждой фирме</caption>
              <thead><tr><th>Фирма</th><th>Россия</th><th>KYC</th><th>Выплаты</th><th></th></tr></thead>
              <tbody>
                {alternatives.map((alt, index) => (
                  <tr key={alt.slug}>
                    <td><strong>{alt.review ? <Link href={alt.review}>{alt.name}</Link> : alt.name}</strong></td>
                    <td>{alt.russia}</td>
                    <td>{alt.kyc}</td>
                    <td>{alt.payout}</td>
                    <td>
                      {alt.slug === 'upscale' ? (
                        // TODO: заменить на /go/upscale после подтверждения партнёрской программы Upscale
                        <a href="https://upscale.trade/ru/" target="_blank" rel="nofollow noopener noreferrer" className="btn-primary">Проверить <ArrowRight size={14} aria-hidden="true" /></a>
                      ) : (
                        <RuGoLink firm={alt.slug} hideBadge href={`/go/${alt.slug}?from=ru-ftmo-dlya-rossiyan-table-${index + 1}`} rel={goLinkRel(alt.slug)} className="btn-primary">
                          Проверить <ArrowRight size={14} aria-hidden="true" />
                        </RuGoLink>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Crypto Fund Trader принимает и криптовалюту — этот способ не зависит от карты (по данным на 14.10.2026).
          </p>
          <RuFundedNextAccessCaveat />
          <p>
            Пошаговое сравнение правил FTMO с ближайшей по механике альтернативой — в разборе{' '}
            <Link href="/ru/ftmo-vs-bright-funded">«FTMO или BrightFunded»</Link>: цена, просадка, сплит, срок выплаты и оплата криптой.
            Полная таблица 15 фирм — на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">«Проп-фирмы для россиян в 2026»</Link>.
            Если вы живёте вне СНГ и FTMO вам доступна, читайте <Link href="/ru/obzor-ftmo">обзор FTMO</Link>; общий
            рейтинг — в разделе <Link href="/ru/luchshie-prop-firmy">лучшие проп-фирмы</Link>.
          </p>
          <div className="ru-notice" data-russian-risk-disclaimer="ftmo-russia">
            <strong>Риск.</strong> Торговля с плечом сопряжена с высоким риском; большинство участников не проходит оценку, а
            плата за челлендж не возвращается. Списки стран меняются — проверяйте их на сайте фирмы перед оплатой.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
