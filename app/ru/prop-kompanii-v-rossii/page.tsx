import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import { ArrowRight, MapPin } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel, russiaStatusFor, type RussiaStatus } from '@/lib/russiaAvailability'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/prop-kompanii-v-rossii'
const CHECKED = '14.10.2026'
export const revalidate = 86400
const TITLE = 'Проп компании в России 2026: какие работают с РФ'
const DESCRIPTION = 'Какие проп компании работают с Россией в 2026 году: статус доступа для РФ, оплата и выплаты, российские проп-компании и альтернативы недоступным фирмам. Проверено 14.10.2026.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['проп компании в россии', 'проп компании для трейдеров в россии', 'проп компании в рф', 'проп трейдинг в россии', 'лучшие проп компании в россии', 'российские проп компании', 'проп компании для трейдинга в рф', 'какие проп компании работают с россией', 'проп компании в москве'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const STATUS_LABEL: Record<RussiaStatus, string> = {
  available: 'Открыта для РФ',
  restricted: 'Недоступно для РФ',
  unclear: 'Доступ для РФ не ясен',
  unverified: 'Доступ для РФ не проверен',
}

// Глобальные фирмы с /go/-маршрутом. Порядок: универсальные сначала. Оплата/выплаты — ru-availability.csv (14.10.2026).
const goFirms = [
  { slug: 'bright-funded', name: 'BrightFunded', review: '/ru/obzor-bright-funded', money: 'Оплата: криптовалюта (BTC, USDT, USDC, ETH и др.). Выплаты: USDC (ERC-20), банковский перевод в EUR' },
  { slug: 'fundednext', name: 'FundedNext (CFD)', review: '/ru/obzor-fundednext', money: 'Оплата: криптовалюта, включая Binance Pay; PayPal, Skrill. Выплаты: USDT (ERC20/TRC20), USDC, RiseWorks, банк, карта. FundedNext Futures Россию ограничивает' },
  { slug: 'crypto-fund-trader', name: 'Crypto Fund Trader', review: '/blog/crypto-fund-trader-review', money: 'Оплата: карта, PayPal, Apple Pay, Google Pay, криптовалюта. Выплаты: банк EUR/USD, USDT, BTC, ETH' },
  { slug: 'fundingpips', name: 'FundingPips', review: '/ru/obzor-fundingpips', money: 'Выплаты: карта, USDT/USDC ERC-20, Rise (с KYC), банк' },
  { slug: 'topstep', name: 'Topstep', review: '/blog/topstep-review', money: 'Условия исключают страны под санкциями OFAC и лица из списка SDN' },
  { slug: 'ftmo', name: 'FTMO', review: '/ru/obzor-ftmo', money: 'Россия в официальном списке ограничений' },
  { slug: 'e8-markets', name: 'E8 Markets', review: '/blog/e8-markets-review', money: 'Страна определяется по документу KYC' },
  { slug: 'fxify', name: 'FXIFY', review: '/blog/fxify-review', money: 'Россия в списке ограничений' },
  { slug: 'maven', name: 'Maven', review: '/blog/maven-prop-firm-review', money: 'Россия в списке ограничений' },
  { slug: 'alpha-capital', name: 'Alpha Capital', review: '/blog/alpha-capital-review', money: 'Ограничение по гражданству или резидентству' },
] as const

// Фирмы без /go/-маршрута: статус из ru-availability.csv и Prop Firm Tracker (14.10.2026).
const otherFirms: Array<{ name: string; status: RussiaStatus; note: string; officialUrl?: string }> = [
  { name: 'Upscale', status: 'available', note: 'Ограничений по странам не заявлено, KYC нет, выплаты в USDT на свой кошелёк' },
  { name: 'The5ers', status: 'restricted', note: 'Россия в списке «Forbidden Territories»', officialUrl: 'https://the5ers.com/' },
  { name: 'Funded Trading Plus', status: 'restricted', note: 'Prop Firm Tracker' },
  { name: 'Goat Funded Trader', status: 'restricted', note: 'Prop Firm Tracker' },
  { name: 'Blue Guardian', status: 'unclear', note: 'Prop Firm Tracker' },
]

const localFirms = [
  { name: 'Era Trade', href: '/ru/obzor-eratrade' },
  { name: 'PropLive', href: '/ru/obzor-proplive' },
  { name: 'KasCapital', href: '/ru/obzor-kascapital' },
  { name: 'TeamTraders', href: '/ru/obzor-teamtraders' },
] as const

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие проп компании работают с Россией?',
    a: `На ${CHECKED} Россию не ограничивают BrightFunded, FundedNext (только CFD), Crypto Fund Trader (на Match-Trader) и Upscale. FTMO, The5ers, E8 Markets, FXIFY, Maven, Alpha Capital, Apex, Lucid, Tradeify, Topstep, Funded Trading Plus и Goat Funded Trader — ограничивают. У FundingPips и Blue Guardian доступ для РФ не ясен.`,
  },
  {
    q: 'Какая проп-компания лучшая для трейдера в России?',
    a: 'Единой лучшей нет: для форекса и индексов смотрите BrightFunded и FundedNext CFD, для криптовалют — Crypto Fund Trader и Upscale. Сравните правила в обзорах и рейтинге проп-компаний.',
  },
  {
    q: 'Есть ли российские проп-компании?',
    a: 'Да: Era Trade, PropLive, KasCapital, TeamTraders и другие. Это другая модель — договор, отбор и биржевые инструменты; мы разбираем их в отдельных обзорах, а не в общем рейтинге.',
  },
  {
    q: 'Есть ли проп-компании в Москве?',
    a: 'Мы не проверяли офисы проп-компаний по городам. Глобальные фирмы работают онлайн, а адреса российских компаний смотрите в их документах и в наших обзорах.',
  },
  {
    q: 'Как получить выплату из проп-компании в России?',
    a: 'Чаще всего — в криптовалюте: USDT у FundedNext, Crypto Fund Trader и Upscale, USDC у BrightFunded. Работают ли карты, выпущенные в России, ни одна из этих фирм официально не сообщает.',
  },
  {
    q: 'Можно ли использовать VPN, если фирма не работает с Россией?',
    a: 'Нет. FundedNext называет VPN и ложные данные о стране основанием для закрытия аккаунта, E8 Markets определяет страну по документу KYC. Вы рискуете и взносом, и прибылью.',
  },
]

export default function RussianPropFirmsInRussiaPage() {
  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'Проп-компании в России' }])
  const dateModified = russianRouteDateModified(PATH)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    dateModified,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-prop-firms-russia="hub">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Проп компании в России</div>
          <div className="ru-eyebrow"><MapPin size={14} aria-hidden="true" /> Проверено {CHECKED}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Среди проп-фирм, которые мы проверили, Россию на {CHECKED} не ограничивают четыре: BrightFunded, FundedNext (CFD),
            Crypto Fund Trader и Upscale. Остальные либо прямо называют Russian Federation в списке запрещённых стран, либо закрываются
            формулировкой о санкциях. Ниже — статус каждой фирмы, как платить и получать деньги из РФ и чем заменить недоступные.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Статусы — по официальным спискам ограничений фирм и Prop Firm Tracker, проверено {CHECKED}.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="prop-firms-russia">
            <strong>Партнёрское раскрытие.</strong> По кнопкам регистрации мы можем получить комиссию. У каждой кнопки — отметка о доступе для РФ.
          </div>
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-prop-kompanii-v-rossii-hero-1" rel={goLinkRel('bright-funded')} className="btn-primary btn-glow">BrightFunded <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-prop-kompanii-v-rossii-hero-2" rel={goLinkRel('fundednext')} className="btn-primary">FundedNext CFD <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-prop-kompanii-v-rossii-hero-3" rel={goLinkRel('crypto-fund-trader')} className="btn-primary">Crypto Fund Trader <ArrowRight size={15} aria-hidden="true" /></RuGoLink>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kakie-rabotayut">
        <div className="ru-shell ru-content">
          <h2>Какие проп компании работают с Россией: таблица</h2>
          <p>
            «Открыта для РФ» значит, что Россия не названа в ограничениях фирмы или фирма прямо заявляет об отсутствии географических
            ограничений. Это не письменное разрешение для вашего профиля: перед оплатой сохраните правила с датой.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-prop-firms-russia-table={goFirms.length + otherFirms.length}>
              <caption className="hidden-caption">Доступ проп-компаний для резидентов России, проверено {CHECKED}</caption>
              <thead><tr><th>Проп-компания</th><th>Оплата, выплаты, условия</th><th>Доступ из России (проверено {CHECKED})</th></tr></thead>
              <tbody>
                {goFirms.map((firm, index) => (
                  <tr key={firm.slug} data-russia-status={russiaStatusFor(firm.slug)}>
                    <td><strong><Link href={firm.review}>{firm.name}</Link></strong></td>
                    <td>{firm.money}</td>
                    <td>
                      <RuGoLink firm={firm.slug} href={`/go/${firm.slug}?from=ru-prop-kompanii-v-rossii-table-${index + 1}`} rel={goLinkRel(firm.slug)} className="btn-outline">
                        Сайт {firm.name.replace(' (CFD)', '')}
                      </RuGoLink>
                    </td>
                  </tr>
                ))}
                {otherFirms.map(firm => (
                  <tr key={firm.name} data-russia-status={firm.status}>
                    <td><strong>{firm.name === 'The5ers' ? <RuPendingLink href="/ru/obzor-the5ers">The5ers</RuPendingLink> : firm.name}</strong></td>
                    <td>{firm.note}</td>
                    <td>{firm.officialUrl && <><a href={firm.officialUrl} target="_blank" rel="nofollow noopener noreferrer" className="btn-outline">Официальный сайт</a>{' '}</>}<span className={`ru-badge ru-badge--${firm.status === 'available' ? 'open' : firm.status === 'restricted' ? 'closed' : 'unclear'}`}>{STATUS_LABEL[firm.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">Полная таблица с Беларусью и Казахстаном — на странице <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для россиян</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="dlya-treyderov-v-rossii">
        <div className="ru-shell ru-content">
          <h2>Проп-компании для трейдеров в России: что выбрать</h2>
          <p>
            Для форекса и индексов — <Link href="/ru/obzor-bright-funded">BrightFunded</Link> (цены в евро, выплаты в USDC или EUR) и{' '}
            <Link href="/ru/obzor-fundednext">FundedNext</Link> в CFD-направлении (выплаты в USDT и USDC). Для криптовалют — Crypto Fund
            Trader на Match-Trader и Upscale, который не требует KYC и платит в USDT. У Upscale отсутствие KYC — это и плюс, и риск: меньше
            формальностей, но и меньше юридических гарантий. Сравнение правил — в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>,
            крипто-программы — в разделе <Link href="/ru/luchshie-kripto-prop-firmy">крипто проп-фирмы</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="oplata-vyplaty">
        <div className="ru-shell ru-content">
          <h2>Проп-трейдинг в России: оплата и выплаты</h2>
          <p>
            Главная практическая проблема — не правила фирмы, а деньги. Фирмы официально не сообщают, принимают ли они
            карты, выпущенные в России, поэтому ориентируйтесь на криптовалюту там, где она есть в списке способов оплаты. Выводить прибыль
            проще всего в стейблкоинах: USDT (ERC20/TRC20) у FundedNext и Crypto Fund Trader, USDC (ERC-20) у BrightFunded, USDT на
            собственный кошелёк у Upscale. Сеть выбирайте до запроса выплаты — перевод в неправильной сети не вернуть. Подробно — в разделе{' '}
            <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
          </p>
          <h3>Способы оплаты и выплаты по данным на {CHECKED}</h3>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-prop-firms-russia-payments="2026-10-14">
              <thead><tr><th>Фирма</th><th>Оплата челленджа</th><th>Выплата прибыли</th></tr></thead>
              <tbody>
                <tr><td><strong>BrightFunded</strong></td><td><strong>Криптовалюта:</strong> BTC (в том числе Lightning), USDT (TRC20), USDC (ERC-20), ETH (ERC-20), LTC, TRX, SOL. Также карта</td><td>USDC (ERC-20), банковский перевод в EUR</td></tr>
                <tr><td><strong>FundedNext (CFD)</strong></td><td><strong>Криптовалюта (комиссия 1%):</strong> Binance Pay, BTC, ETH, LTC, DOGE, SOL, USDT (TRC20/ERC20), USDC (ERC20). Также PayPal (1%), Skrill (3%), Apple Pay, Google Pay, карты Visa/Mastercard/Amex на своё имя</td><td>USDT (ERC20/TRC20), USDC, RiseWorks, банк, карта</td></tr>
                <tr><td><strong>Crypto Fund Trader</strong></td><td><strong>Криптовалюта</strong>, а также карта, PayPal, Apple Pay, Google Pay</td><td>банковский перевод EUR/USD, USDT, BTC, ETH</td></tr>
                <tr><td><strong>Upscale</strong></td><td>криптокошелёк</td><td>USDT на собственный (некастодиальный) кошелёк</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line">
            Источники по оплате, по данным на {CHECKED}: BrightFunded — <a href="https://help.brightfunded.com/en/articles/9286623-can-i-pay-for-my-challenge-with-crypto" target="_blank" rel="nofollow noopener noreferrer">оплата криптовалютой</a>,{' '}
            <a href="https://help.brightfunded.com/en/articles/12000749-the-most-frequently-asked-general-questions" target="_blank" rel="nofollow noopener noreferrer">оплата картой</a>; FundedNext —{' '}
            <a href="https://help.fundednext.com/en/articles/8020089-what-are-the-available-payment-methods" target="_blank" rel="nofollow noopener noreferrer">способы оплаты</a>,{' '}
            <a href="https://help.fundednext.com/en/articles/13990618-how-to-complete-a-card-payment-at-fundednext-cfds" target="_blank" rel="nofollow noopener noreferrer">оплата картой</a>; Crypto Fund Trader —{' '}
            <a href="https://cryptofundtrader.com/faq/" target="_blank" rel="nofollow noopener noreferrer">FAQ</a> и <a href="https://cryptofundtrader.com/terms-and-conditions/" target="_blank" rel="nofollow noopener noreferrer">условия (п. 5.5)</a>. Остальное — по справочным страницам фирм, открытым {CHECKED}.
          </p>
          <p>
            Ни одна из этих фирм официально не упоминает карты «Мир», карты российских банков или местные способы оплаты из России и СНГ.
            Пройдёт ли оплата картой Visa или Mastercard, выпущенной в России, мы не знаем. Поэтому для трейдеров из РФ основной путь —
            криптовалюта: у BrightFunded и FundedNext (включая Binance Pay) она есть в официальном списке. У FundedNext есть также PayPal и Skrill.
          </p>
        </div>
      </section>

      <section className="ru-section" id="rossiyskie">
        <div className="ru-shell ru-content">
          <h2>Российские проп-компании</h2>
          <p>
            Российские проп-компании работают по другой модели: договор, отбор в команду, биржевые инструменты. Сравнивать их с
            CFD-челленджами в одной таблице нельзя — у них разные риски и разная экономика. Отдельные разборы:
          </p>
          <ul>
            {localFirms.map(firm => <li key={firm.name}><Link href={firm.href}>{firm.name}</Link></li>)}
          </ul>
          <p>
            Проп компании в Москве ищут часто, но для глобальных фирм город не важен: регистрация, челлендж и выплаты проходят онлайн,
            а доступ определяется страной проживания и документом. Офисы по городам мы не проверяли: адрес и юридическое лицо смотрите в документах компании
            и в наших обзорах.
          </p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell ru-content">
          <h2>Чем заменить проп-компании, недоступные в РФ</h2>
          <ul>
            <li><strong>Вместо FTMO и The5ers</strong> (форекс, индексы) — BrightFunded или FundedNext CFD. Подробно — <Link href="/ru/ftmo-dlya-rossiyan">FTMO для россиян</Link>.</li>
            <li><strong>Вместо E8 Markets, FXIFY, Maven, Alpha Capital</strong> — те же BrightFunded и FundedNext CFD; сравните просадку и цены в обзорах.</li>
            <li><strong>Для крипты</strong> — Crypto Fund Trader и Upscale.</li>
            <li><strong>Фьючерсы</strong> (Apex, Lucid, Tradeify, Topstep): среди фирм в наших данных на {CHECKED} нет фьючерсной проп-фирмы, открытой для России; FundedNext Futures Россию тоже ограничивает.</li>
          </ul>
          <div className="ru-notice" data-russian-risk-disclaimer="prop-firms-russia">
            <strong>Риск.</strong> Торговля с плечом связана с высоким риском; взнос за челлендж не возвращается при провале. Статусы
            меняются — мы перепроверяем их регулярно.
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
