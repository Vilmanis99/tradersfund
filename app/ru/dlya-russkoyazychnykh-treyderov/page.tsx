import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { RuRelatedLinks } from '@/components/RuPendingLink'
import { ArrowRight, Globe2, ShieldCheck, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { RuGoLink } from '@/components/RuGoLink'

const PATH = '/ru/dlya-russkoyazychnykh-treyderov'
const CHECKED = '14.10.2026'
const CHECKED_ISO = '2026-10-14'
export const revalidate = 3600
const TITLE = 'Проп-фирмы для россиян в 2026: кто принимает трейдеров из РФ (проверено 10.2026)'
const DESCRIPTION = 'Какие проп-компании работают с Россией в 2026 году: таблица 15 фирм со статусом для РФ, Беларуси и Казахстана, способами выплаты и ссылками на официальные правила.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'проп фирмы для россиян',
    'проп компании для россиян',
    'проп компании которые работают в россии',
    'проп компании работающие с россией',
    'проп трейдинг в россии',
    'проп компании форекс для россиян',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

type Row = {
  firm: string
  russia: string
  belarus: string
  kazakhstan: string
  payout: string
  status: 'open' | 'unclear' | 'closed'
  source: string
  review?: string
}

// Источник: ru-availability.csv, проверка 2026-10-14. «не указано» = страна не названа в списке ограничений,
// это не письменное подтверждение доступа. «не проверено» = данных нет, не додумывать.
const rows: Row[] = [
  { firm: 'Upscale', russia: 'Принимает (ограничений по странам не заявлено)', belarus: 'Принимает', kazakhstan: 'Принимает', payout: 'Оплата криптовалютой; выплаты в USDT на собственный некастодиальный кошелёк; KYC нет', status: 'open', source: 'https://upscale.trade/ru/faq' },
  { firm: 'Crypto Fund Trader', russia: 'На Match-Trader ограничений по странам нет; MT5 закрыт только для резидентов США (по данным на 14.10.2026)', belarus: 'Так же', kazakhstan: 'Так же', payout: 'Оплата: карта, PayPal, Apple Pay, Google Pay, криптовалюта. Выплаты: банк EUR/USD, USDT ERC20/TRC20, BTC, ETH', status: 'open', source: 'https://cryptofundtrader.com/faq/', review: '/blog/crypto-fund-trader-review' },
  { firm: 'BrightFunded', russia: 'Не в списке ограничений', belarus: 'Не в списке', kazakhstan: 'Не в списке', payout: 'Оплата: криптовалюта (BTC вкл. Lightning, USDT TRC20, USDC ERC-20, ETH, LTC, TRX, SOL) или карта. Выплаты: USDC (ERC-20), банковский перевод в EUR', status: 'open', source: 'https://help.brightfunded.com/en/articles/9286630-what-countries-are-restricted-at-brightfunded', review: '/ru/obzor-bright-funded' },
  { firm: 'FundedNext (CFD)', russia: 'Не в списке ограничений CFD', belarus: 'Ограничена', kazakhstan: 'Не в списке', payout: 'Оплата: криптовалюта (1%; Binance Pay, BTC, ETH, LTC, DOGE, SOL, USDT, USDC), PayPal (1%), Skrill (3%), Apple/Google Pay, карты на своё имя. Выплаты: USDT (ERC20/TRC20), USDC, RiseWorks, банк, карта', status: 'open', source: 'https://help.fundednext.com/en/articles/8020080-are-any-countries-restricted-on-fundednext-cfds', review: '/ru/obzor-fundednext' },
  { firm: 'FundedNext Futures', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Не в списке', payout: 'Не проверено', status: 'closed', source: 'https://fundednext.com/terms-of-service' },
  { firm: 'FundingPips', russia: 'Неясно: Россия прямо не названа, но исключены страны из санкционных списков FATF и ЕС/ООН', belarus: 'Неясно', kazakhstan: 'Не названа', payout: 'Карта, USDT/USDC ERC-20, Rise (Rise требует KYC), банк', status: 'unclear', source: 'https://fundingpips.com/terms-and-conditions', review: '/ru/obzor-fundingpips' },
  { firm: 'Topstep', russia: 'Неясно: исключены страны под всеобъемлющими санкциями OFAC и лица из списка SDN; Россия в найденном фрагменте не названа', belarus: 'Не названа', kazakhstan: 'Не названа', payout: 'Не проверено', status: 'unclear', source: 'https://www.topstep.com/terms-of-use/' },
  { firm: 'FTMO', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Ограничена', payout: 'Не проверено', status: 'closed', source: 'https://ftmo.com/en/faq/who-can-join-ftmo/', review: '/ru/ftmo-dlya-rossiyan' },
  { firm: 'The5ers', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Не в списке', payout: 'Не проверено', status: 'closed', source: 'https://the5ers.com/faq/' },
  { firm: 'E8 Markets', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Не проверено', payout: 'Не проверено', status: 'closed', source: 'https://help.e8markets.com/en/articles/5514278-accepted-countries' },
  { firm: 'FXIFY', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Не проверено', payout: 'Не проверено', status: 'closed', source: 'https://fxify.com/faqs/all-faqs/what-countries-are-accepted/' },
  { firm: 'Maven', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Не в списке', payout: 'Не проверено', status: 'closed', source: 'https://maventrading.com/faq' },
  { firm: 'Alpha Capital', russia: 'Ограничена (по гражданству или резидентству)', belarus: 'Ограничена', kazakhstan: 'Не проверено', payout: 'Не проверено', status: 'closed', source: 'https://help.alphacapitalgroup.uk/en/articles/8775575-countries-with-limitations' },
  { firm: 'Apex Trader Funding', russia: 'Ограничена', belarus: 'Не проверено', kazakhstan: 'Не проверено', payout: 'Не проверено', status: 'closed', source: 'https://apextraderfunding.com/help-center/getting-started/restricted-countries/' },
  { firm: 'Tradeify', russia: 'Ограничена', belarus: 'Не проверено', kazakhstan: 'Не проверено', payout: 'Не проверено', status: 'closed', source: 'https://help.tradeify.co/en/articles/10495888-rules-restricted-countries' },
  { firm: 'Lucid Trading', russia: 'Ограничена', belarus: 'Ограничена', kazakhstan: 'Ограничена', payout: 'Не проверено', status: 'closed', source: 'https://support.lucidtrading.com/en/articles/11404636-restricted-countries' },
]

const badge: Record<Row['status'], string> = {
  open: `Открыта для РФ · проверено ${CHECKED}`,
  unclear: `Неясно — ждём письменного ответа · проверено ${CHECKED}`,
  closed: `Недоступно для РФ · проверено ${CHECKED}`,
}

// Российские проп-компании — блок перенесён со страницы /ru/dlya-russkoyazychnykh-treyderov#rossiyskie (слияние).
const localFirms = [
  { name: 'Era Trade', href: '/ru/obzor-eratrade' },
  { name: 'PropLive', href: '/ru/obzor-proplive' },
  { name: 'KasCapital', href: '/ru/obzor-kascapital' },
  { name: 'TeamTraders', href: '/ru/obzor-teamtraders' },
  { name: 'А-Лаб', href: null },
  { name: 'Trade System', href: null },
] as const

const faqs: RussianFaqItem[] = [
  {
    q: 'Какие проп-компании работают с Россией в 2026 году?',
    a: `На ${CHECKED} без оговорок по России работают Upscale (ограничений по странам не заявлено) и Crypto Fund Trader на платформе Match-Trader. BrightFunded и CFD-направление FundedNext не включают Россию в свои списки ограничений. FTMO, The5ers, E8 Markets, FXIFY, Maven, Alpha Capital, Apex, Tradeify, Lucid Trading и FundedNext Futures Россию ограничивают.`,
  },
  {
    q: 'Можно ли пройти челлендж FTMO из России?',
    a: 'Нет. Россия есть в официальном списке стран FTMO, где услуги не предоставляются. Подробности и альтернативы — на странице «FTMO для россиян».',
  },
  {
    q: 'Почему нельзя просто включить VPN?',
    a: 'VPN не меняет гражданство, резидентство и документы для KYC. FundedNext прямо указывает, что использование VPN или ложных данных о стране ведёт к закрытию аккаунта; страна у E8 Markets определяется по документу KYC, а не по IP. Риск — потерять и оплату челленджа, и прибыль.',
  },
  {
    q: 'Отсутствие России в списке ограничений — это гарантия?',
    a: 'Нет. Это лишь значит, что страна не названа. FundedNext, например, оставляет за собой право блокировать санкционные страны и страны, с которыми не работают её платёжные провайдеры, а BrightFunded исключает лиц из санкционных списков. Перед оплатой задайте вопрос поддержке и сохраните ответ.',
  },
  {
    q: 'Есть ли российские проп-компании?',
    a: 'Да, например Era Trade, PropLive, KasCapital, TeamTraders, А-Лаб и Trade System. Мы описываем их как проверяемые примеры, а не как рейтинг: полный захват цен, правил и истории выплат по ним пока не проведён.',
  },
  {
    q: 'Как получить выплату из проп-фирмы в России?',
    a: 'Чаще всего — в криптовалюте: Upscale платит в USDT, Crypto Fund Trader — в USDT, BTC или ETH, FundedNext — в USDT и USDC, BrightFunded — в USDC. Подробнее о выводе — в разделе о выплатах проп-фирм.',
  },
]

export default function RussiaAvailabilityPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Проп-фирмы для россиян' },
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
    dateModified: CHECKED_ISO,
  }
  const openCount = rows.filter(r => r.status === 'open').length
  const closedCount = rows.filter(r => r.status === 'closed').length

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russia-availability-hub="2026-10">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Проп-фирмы для россиян</div>
          <div className="ru-eyebrow"><Globe2 size={14} aria-hidden="true" /> Статус для РФ · проверено {CHECKED}</div>
          <h1>Проп-фирмы для россиян в 2026: кто принимает трейдеров из РФ</h1>
          <p className="ru-lead">
            Из 15 проп-фирм, чьи правила мы открыли {CHECKED}, ограничений для России не называют только четыре.
            Остальные либо прямо пишут «Russian Federation» в списке запрещённых стран, либо прячут Россию за
            формулировкой «санкционные юрисдикции». Ниже — кто есть кто, со ссылкой на первоисточник по каждой строке.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Источники открыты {CHECKED}.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="russia-hub" data-russian-country-boundary="diaspora-not-access">
            <strong>Партнёрское раскрытие.</strong>{' '}
            По кнопкам регистрации Traders Fund Hub может получить комиссию. Кнопки стоят только у фирм, которые на {CHECKED}
            не ограничивают Россию; на порядок таблицы и статусы это не влияет.
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{openCount}</strong><span>открыты или не называют РФ</span></div>
            <div className="ru-stat"><strong>2</strong><span>неясно, ждём ответа поддержки</span></div>
            <div className="ru-stat"><strong>{closedCount}</strong><span>продуктов ограничивают РФ</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="tablica">
        <div className="ru-shell ru-content">
          <h2>Таблица: какие проп-компании работают в России</h2>
          <p>
            «Не в списке» означает, что страна не названа в официальном перечне ограничений — это не письменное
            разрешение. «Не проверено» — данных в первоисточнике мы не нашли и ничего не додумываем.
            У FundedNext два направления с разными правилами, поэтому строк 16, а фирм 15.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russia-availability-table="15-firms">
              <caption className="hidden-caption">Статус 15 проп-фирм для России, Беларуси и Казахстана на {CHECKED}</caption>
              <thead>
                <tr>
                  <th>Фирма</th>
                  <th>Статус</th>
                  <th>Россия</th>
                  <th>Беларусь</th>
                  <th>Казахстан</th>
                  <th>Оплата и выплаты</th>
                  <th>Источник</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.firm} data-russia-status={row.status}>
                    <td><strong>{row.review ? <Link href={row.review}>{row.firm}</Link> : row.firm}</strong></td>
                    <td><span className={`ru-badge ru-badge--${row.status}`}>{badge[row.status]}</span></td>
                    <td>{row.russia}</td>
                    <td>{row.belarus}</td>
                    <td>{row.kazakhstan}</td>
                    <td>{row.payout}</td>
                    <td><a href={row.source} target="_blank" rel="nofollow noopener noreferrer">правила</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line" data-russian-diaspora-payment-sources="2026-10-14">
            Способы оплаты и выплат BrightFunded и FundedNext — по данным на 14.10.2026:{' '}
            <a href="https://help.brightfunded.com/en/articles/9286623" target="_blank" rel="nofollow noopener noreferrer">справка BrightFunded 1</a>,{' '}
            <a href="https://help.brightfunded.com/en/articles/12000749" target="_blank" rel="nofollow noopener noreferrer">справка BrightFunded 2</a>,{' '}
            <a href="https://help.fundednext.com/en/articles/8020089" target="_blank" rel="nofollow noopener noreferrer">справка FundedNext 1</a>,{' '}
            <a href="https://help.fundednext.com/en/articles/13990618" target="_blank" rel="nofollow noopener noreferrer">справка FundedNext 2</a>.
            Работу карт «Мир» и карт российских банков мы не подтверждали.
          </p>
          <p className="ru-source-line">
            Apex Trader Funding и Tradeify закрыли свои страницы от нашего сборщика (ошибка 403): статус взят из
            поисковой выдачи и агрегатора funded.now, поэтому уверенность средняя.
          </p>
        </div>
      </section>

      <section className="ru-section" id="otkryty">
        <div className="ru-shell">
          <h2>Четыре проп-фирмы, открытые для России</h2>
          <div className="ru-grid">
            <article className="ru-card" data-russia-open="upscale">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Upscale</h3>
              <p className="ru-muted">Ограничений по странам не заявлено, KYC нет (вход через Telegram, Google или кошелёк), выплаты в USDT на собственный некастодиальный кошелёк. Обратная сторона отсутствия KYC — меньше юридических гарантий: оценивайте риск сами.</p>
              <div className="ru-actions">
                {/* TODO: заменить на /go/upscale после подтверждения партнёрской программы Upscale и добавления фирмы в firms.json */}
                <a href="https://upscale.trade/ru/" target="_blank" rel="nofollow noopener noreferrer" className="btn-primary">
                  Открыть Upscale <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </article>
            <article className="ru-card" data-russia-open="crypto-fund-trader">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Crypto Fund Trader</h3>
              <p className="ru-muted">На Match-Trader ограничений по странам нет; MT5 закрыт только для резидентов США. Выплаты — USDT ERC20/TRC20, BTC, ETH или банк. Работают ли карты, выпущенные в России, фирма не сообщает; криптовалюта от карты не зависит.</p>
              <div className="ru-actions">
                <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-dlya-russkoyazychnykh-treyderov-cards" rel="nofollow noopener" className="btn-primary">
                  Проверить Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" />
                </RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russia-open="bright-funded">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>BrightFunded</h3>
              <p className="ru-muted">В списке ограничений — Куба, Иран, КНДР, Сирия, Вьетнам и Пакистан; России нет. При этом фирма исключает лиц из санкционных списков. Выплаты — USDC (ERC-20) или банковский перевод в EUR.</p>
              <div className="ru-actions">
                <Link href="/ru/obzor-bright-funded" className="btn-outline">Обзор</Link>
                <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-dlya-russkoyazychnykh-treyderov-cards" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить BrightFunded <ArrowRight size={14} aria-hidden="true" />
                </RuGoLink>
              </div>
            </article>
            <article className="ru-card" data-russia-open="fundednext">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>FundedNext (только CFD)</h3>
              <p className="ru-muted">Россия не названа в списке ограничений CFD, но FundedNext Futures её ограничивает — не перепутайте продукт при оплате. Пункт 5.5 условий позволяет фирме блокировать санкционные страны и страны, которые не обслуживают её платёжные провайдеры. Выплаты — USDT, USDC, RiseWorks, банк, карта.</p>
              <div className="ru-actions">
                <Link href="/ru/obzor-fundednext" className="btn-outline">Обзор</Link>
                <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-dlya-russkoyazychnykh-treyderov-cards" rel="sponsored nofollow noopener" className="btn-primary">
                  Проверить FundedNext CFD <ArrowRight size={14} aria-hidden="true" />
                </RuGoLink>
              </div>
            </article>
          </div>
          <p className="ru-source-line">
            FundingPips и Topstep: кнопок нет, пока поддержка письменно не подтвердит, что принимает резидентов РФ.
          </p>
        </div>
      </section>

      <section className="ru-section" id="pochemu">
        <div className="ru-shell ru-content">
          <h2>Почему проп-фирмы закрываются для России</h2>
          <p>
            Причин три, и все они видны в самих правилах. Первая — санкции: FundingPips исключает юрисдикции из
            санкционных списков FATF и ЕС/ООН, Topstep — страны под всеобъемлющими санкциями OFAC и лиц из списка SDN.
            Вторая — платёжные провайдеры: FundedNext прямо оговаривает право блокировать страны, с которыми не работают
            её провайдеры, — а фирмы официально не сообщают, принимаются ли карты, выпущенные в России, даже там, где страна формально не запрещена.
            Третья — KYC: Alpha Capital смотрит и на гражданство, и на резидентство, а E8 Markets определяет страну по
            документу, а не по IP. Россиянин, живущий в другой стране, у Alpha Capital всё равно попадает под ограничение.
          </p>
        </div>
      </section>

      <section className="ru-section" id="vpn">
        <div className="ru-shell ru-content">
          <h2>VPN и чужие данные: почему аккаунт закроют</h2>
          <p>
            Схема «зайду через VPN, а выплату получу на крипту» ломается на KYC. FTMO проверяет личность (FTMO Identity)
            до выхода на профинансированный счёт, E8 Markets сверяет страну с документом, а FundedNext в своих правилах
            называет VPN и ложное указание страны основанием для закрытия аккаунта. Посчитайте: вы платите за челлендж,
            проходите оценку, доходите до первой выплаты — и на проверке документов теряете и взнос, и прибыль.
            Если ваша страна закрыта, выбирайте фирму из четырёх открытых, а не обходной путь.
          </p>
        </div>
      </section>

      <section className="ru-section" id="proverka">
        <div className="ru-shell ru-content">
          <h2>Как проверить проп-фирму самостоятельно</h2>
          <ol>
            <li><strong>Найдите официальный список ограничений</strong> — обычно это раздел FAQ или справки «restricted countries». Ищите «Russian Federation» и «sanctions».</li>
            <li><strong>Проверьте продукт, а не бренд.</strong> У FundedNext CFD и Futures разные списки.</li>
            <li><strong>Выясните, что проверяет KYC:</strong> гражданство, резидентство или документ.</li>
            <li><strong>Сверьте оплату и выплату.</strong> Если принимают только карты и PayPal, учтите: фирмы официально не сообщают, принимаются ли карты, выпущенные в России; ищите крипту.</li>
            <li><strong>Напишите в поддержку</strong> и сохраните письменный ответ до оплаты — особенно для FundingPips и Topstep.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="rossiyskie">
        <div className="ru-shell ru-content" data-merged-from="/ru/dlya-russkoyazychnykh-treyderov#rossiyskie">
          <h2>Российские проп-компании: шесть проверяемых примеров</h2>
          <p>
            Если вам нужен не CFD-челлендж, а локальный рынок (MOEX, рублёвый договор, стажировка), смотрите российских
            операторов. Это не рейтинг и не совет регистрироваться: полный захват цен, правил и истории выплат по ним мы
            пока не провели.
          </p>
          <ul>
            {localFirms.map(firm => (
              <li key={firm.name}>{firm.href ? <Link href={firm.href}>{firm.name} — отдельный обзор</Link> : firm.name}</li>
            ))}
          </ul>
          <p>
            Партнёрские условия: у Era Trade опубликована программа с 5% за прямые покупки и уровнями до 60%; PropLive предлагает
            наставникам и школам долю до 50% от прибыли учеников; Trade System не раскрывает ставку для издателей; у KasCapital,
            А-Лаб и TeamTraders публичных партнёрских условий не найдено.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Что читать дальше</h2>
          <ul>
            <li><Link href="/ru/ftmo-dlya-rossiyan">FTMO для россиян: почему недоступно и чем заменить</Link></li>
            <li><Link href="/ru/luchshie-prop-firmy">Рейтинг проп-фирм</Link></li>
            <li><Link href="/ru/vyplaty-prop-firm">Выплаты проп-фирм: USDT, USDC, Rise</Link></li>
            <li><Link href="/ru/promokody-prop-firm">Промокоды проп-фирм</Link></li>
          </ul>
          <div className="ru-notice" data-russian-risk-disclaimer="russia-hub">
            <strong>Риск.</strong> Торговля на рынках с плечом связана с высоким риском; большинство участников не проходит
            челлендж, а оплата за него не возвращается. Статусы стран меняются — мы перепроверяем их еженедельно, дата последней
            проверки указана в каждой строке.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <RuRelatedLinks marker="diaspora" items={[{ href: '/ru/prop-kompanii-v-rossii', label: 'проп-компании в России' }, { href: '/ru/obzor-the5ers', label: 'обзор The5ers' }]} />
          <h2>Частые вопросы</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
