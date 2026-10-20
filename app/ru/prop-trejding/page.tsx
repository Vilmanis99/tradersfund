import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import RuPendingLink from '@/components/RuPendingLink'
import { ArrowRight, Briefcase } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'
import Breadcrumbs from '@/components/Breadcrumbs'
import RuFundedNextAccessCaveat, { FUNDEDNEXT_RU_ACCESS_NOTE } from '@/components/RuFundedNextAccessCaveat'

const PATH = '/ru/prop-trejding'
const UPDATED = '14.10.2026'
const UPDATED_ISO = '2026-10-14'
const PRICES_CHECKED = '15.10.2026'
export const revalidate = 86400
const TITLE = 'Проп трейдинг: что это и как начать торговать в 2026'
const DESCRIPTION = 'Что такое проп трейдинг простыми словами: торговля на деньги компании, сколько стоит челлендж, какой капитал дают и какие проп-фирмы доступны из России.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['проп трейдинг', 'что такое проп трейдинг', 'проп трейдинг простыми словами', 'торговля на деньги компании', 'капитал для трейдинга', 'проп трейдер', 'проп счет', 'работа в проп компании', 'как работает проп компания'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

// Цены из content/data/challenges (проверено 14–15.10.2026).
const priceRows = [
  { firm: 'BrightFunded', product: '2-Step Classic', p10: '€97', p100: '€497', split: '80%', checked: '14.10.2026', review: '/ru/obzor-bright-funded' },
  { firm: 'FundedNext', product: 'Stellar Lite (2 фазы)', p10: '$59.99', p100: '$399.99', split: '80%', checked: '15.10.2026', review: '/ru/obzor-fundednext' },
  { firm: 'Crypto Fund Trader', product: 'Evaluation (2 фазы)', p10: '$110', p100: '$660', split: '80%', checked: '14.10.2026', review: '/blog/crypto-fund-trader-review' },
  { firm: 'FundingPips', product: '2 Step Pro', p10: '$55', p100: '$422', split: '80%', checked: '15.10.2026', review: '/ru/obzor-fundingpips' },
  { firm: 'FTMO', product: '2-Step', p10: '€89', p100: '€540', split: '80%', checked: '14.10.2026', review: '/ru/obzor-ftmo' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое проп трейдинг простыми словами?',
    a: 'Это торговля на капитал компании вместо собственных денег. В розничной модели вы платите за оценку (челлендж), а после её прохождения получаете долю прибыли — базово 80% у BrightFunded и FundedNext по нашим данным.',
  },
  {
    q: 'Проп-трейдинг — это развод?',
    a: 'Сама модель — не обман, но и не бесплатные деньги. Вы платите за экзамен, и при нарушении лимита убытка взнос сгорает. Риски — в деталях: симулированные счета (у FundingPips так прямо написано в политике), меняющиеся правила выплат и ограничения по странам. Проверяйте правила, историю выплат и доступ из своей страны до оплаты.',
  },
  {
    q: 'Можно ли заниматься проп-трейдингом без вложений?',
    a: 'Нет. Взнос за челлендж платится всегда: даже счёт без оценки FundedNext Stellar Instant стоит от $59.99 за $2 000 (данные на 15.10.2026). При провале взнос не возвращается.',
  },
  {
    q: 'Торговля на деньги компании — это реальные деньги?',
    a: 'Не всегда. FundingPips в политике ответственной торговли прямо пишет, что все её счета работают в симулированной среде. Выплата — реальная, а торговый счёт — нет. Уточняйте это в правилах конкретной фирмы.',
  },
  {
    q: 'Какие проп-фирмы доступны трейдерам из России?',
    a: `На ${UPDATED} Россию не ограничивают BrightFunded и Crypto Fund Trader (на Match-Trader). FTMO, Topstep, E8 Markets, FXIFY, Maven, Alpha Capital, Apex, Lucid и Tradeify Россию ограничивают; у FundingPips доступ для РФ не ясен. ${FUNDEDNEXT_RU_ACCESS_NOTE}`,
  },
  {
    q: 'Сколько зарабатывает проп-трейдер?',
    a: 'Столько, сколько заработал на счёте, умноженное на долю: при прибыли $1 000 и доле 80% вы получите $800 до комиссий за вывод. Гарантированного дохода нет.',
  },
]

export default function RussianPropTradingPage() {
  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'Проп-трейдинг' }])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    dateModified: UPDATED_ISO,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-prop-trading="guide">
          <div className="ru-eyebrow"><Briefcase size={14} aria-hidden="true" /> Обновлено {UPDATED}</div>
          <h1>Проп-трейдинг: торговля на капитал компании</h1>
          <p className="ru-lead">
            Реклама обещает: «торгуй $100 000 компании и забирай 80%». Звучит как бесплатные деньги. На деле вы покупаете
            экзамен с жёсткими лимитами убытка — и только после него начинается торговля на деньги компании. Разбираем, что такое
            проп трейдинг на самом деле, сколько он стоит и где доступен из России.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Цены и правила — из наших данных по фирмам, с датой проверки.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="prop-trading">
            <strong>Партнёрское раскрытие.</strong> По кнопкам регистрации мы можем получить комиссию. У каждой кнопки — отметка о доступе для РФ на {UPDATED}.
          </div>
        </div>
      </section>

      <section className="ru-section" id="chto-eto">
        <div className="ru-shell ru-content">
          <h2>Что такое проп трейдинг</h2>
          <p>
            Проп-трейдинг (proprietary trading) — торговля на капитал фирмы, а не на свои деньги. Трейдер приносит навык,
            фирма — капитал и правила риска, прибыль делится. Но слово «проп» сегодня описывает три очень разные модели, и путать
            их — первая ошибка новичка. Общее введение — в статье <Link href="/ru/chto-takoe-prop-firma">что такое проп-фирма</Link>.
          </p>
          <h3>Три модели проп-трейдинга</h3>
          <ul>
            <li><strong>Проп-деск.</strong> Отдел банка или фонда: трейдер — сотрудник, торгует реальным капиталом по договору. Вход — через найм, не через оплату.</li>
            <li><strong>Розничный челлендж.</strong> BrightFunded, FundedNext, FTMO и другие: вы платите за оценку, проходите её и получаете долю прибыли.</li>
            <li><strong>Локальные компании на Московской бирже.</strong> Era Trade, PropLive, KasCapital, TeamTraders — договор, отбор, биржевые инструменты. Разбор — в <Link href="/ru/dlya-russkoyazychnykh-treyderov#rossiyskie">списке российских проп-компаний</Link>.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="prostymi-slovami">
        <div className="ru-shell ru-content">
          <h2>Проп-трейдинг простыми словами: пример на цифрах</h2>
          <p>
            Представьте экзамен на права, где за каждую попытку платите вы, а машину после экзамена даёт автошкола — и забирает
            часть ваших заработков таксиста. Так и здесь: вы платите фирме за проверку, торгуете по её правилам и, если доходите до
            цели, получаете счёт и долю прибыли.
          </p>
          <p>
            Пример на FundingPips 2 Step Pro (данные на {PRICES_CHECKED}): счёт $5 000 стоит $29. Цель — 6% в каждой из двух фаз, то есть
            $300; дневной лимит 3% — $150; общий статический лимит 6% — те же $300. Один плохой день на $150 съедает половину
            допустимого убытка. Поэтому цена в $29 — не главная цифра: главная — лимит убытка.
          </p>
        </div>
      </section>

      <section className="ru-section" id="poshagovo">
        <div className="ru-shell ru-content">
          <h2>От взноса до выплаты: пошаговый пример</h2>
          <p>Возьмём BrightFunded 2-Step Classic на $10 000 (данные на {PRICES_CHECKED}):</p>
          <ol>
            <li><strong>Оплата:</strong> €97.</li>
            <li><strong>Фаза 1:</strong> заработать 10% — $1 000, не потеряв за день больше 5% ($500) и за всё время больше 10% ($1 000). Минимум 5 торговых дней.</li>
            <li><strong>Фаза 2:</strong> заработать 5% — $500 при тех же лимитах.</li>
            <li><strong>KYC и договор</strong> — проверка личности и страны проживания.</li>
            <li><strong>Счёт фирмы:</strong> первая выплата — через 30 дней. Заработали $1 000 — при доле 80% получаете $800.</li>
          </ol>
          <p>
            Итог: €97, минимум 5 + 5 торговых дней на оценку, проверка документов и ещё 30 дней до первой выплаты — при условии, что ни
            один день не выйдет за лимит. Если выйдет, всё начинается сначала, с новым взносом.
          </p>
        </div>
      </section>

      <section className="ru-section" id="kak-rabotaet-prop-kompaniya">
        <div className="ru-shell ru-content">
          <h2>Как работает проп-компания</h2>
          <p>
            Путь в розничной модели: оплата челленджа → оценка с целью по прибыли и лимитами убытка → проверка личности (KYC) и
            договор → счёт фирмы → запрос выплаты. Этапы оценки подробно — в разделе{' '}
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работает челлендж</Link>.
          </p>
          <p>
            Ряд фирм прямо пишет, что торговля идёт в симулированной среде: у FundingPips, по её политике ответственной торговли, все
            счета симулированные, а выплата — договорное вознаграждение. Это не обман, но это важно понимать: «капитал компании» здесь —
            скорее условие договора, чем реальные деньги на рынке.
          </p>
        </div>
      </section>

      <section className="ru-section" id="raznica">
        <div className="ru-shell ru-content">
          <h2>Проп-компания, брокер и проп-деск: в чём разница</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-prop-trading-compare="models">
              <caption className="hidden-caption">Сравнение проп-компании, брокера и проп-деска</caption>
              <thead><tr><th></th><th>Розничная проп-компания</th><th>Брокер</th><th>Проп-деск</th></tr></thead>
              <tbody>
                <tr><td><strong>Чьи деньги</strong></td><td>Ваш взнос за оценку; торговый счёт фирмы</td><td>Ваш депозит</td><td>Капитал банка или фонда</td></tr>
                <tr><td><strong>Как попасть</strong></td><td>Оплатить и пройти челлендж</td><td>Открыть счёт и пополнить</td><td>Собеседование, найм</td></tr>
                <tr><td><strong>Что вы теряете при убытке</strong></td><td>Взнос (счёт закрывается)</td><td>Свой депозит</td><td>Работу и бонус</td></tr>
                <tr><td><strong>Доход</strong></td><td>Доля прибыли (базово 80%)</td><td>Вся прибыль минус комиссии</td><td>Оклад и бонус</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kak-zarabatyvaet">
        <div className="ru-shell ru-content">
          <h2>Как зарабатывает проп-фирма</h2>
          <p>
            Из публичных данных видно два источника: взносы за челленджи (включая повторные попытки) и доля прибыли успешных трейдеров —
            при сплите 80% фирма оставляет 20%. Если счета симулированные, как у FundingPips, фирма выплачивает вознаграждение из
            собственных средств, а не из рыночной прибыли. Точную структуру выручки фирмы не раскрывают, поэтому мы её не оцениваем.
          </p>
        </div>
      </section>

      <section className="ru-section" id="ceny">
        <div className="ru-shell ru-content">
          <h2>Сколько стоит проп-трейдинг: цены челленджей</h2>
          <p>Цены двухфазных программ на счета $10 000 и $100 000 — без скидок и дополнительных опций.</p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-prop-trading-prices="10k-100k">
              <caption className="hidden-caption">Цены челленджей проп-фирм на $10K и $100K</caption>
              <thead><tr><th>Фирма</th><th>Программа</th><th>$10K</th><th>$100K</th><th>Базовая доля</th><th>Проверено</th></tr></thead>
              <tbody>
                {priceRows.map(row => (
                  <tr key={row.firm}><td><strong><Link href={row.review}>{row.firm}</Link></strong></td><td>{row.product}</td><td>{row.p10}</td><td>{row.p100}</td><td>{row.split}</td><td>{row.checked}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-muted">BrightFunded и FTMO указывают цены в евро. FTMO для резидентов России недоступна. Промокоды — на странице <Link href="/ru/promokody-prop-firm">промокоды проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="kapital-dlya-treydinga">
        <div className="ru-shell ru-content">
          <h2>Капитал для трейдинга: сколько дают на самом деле</h2>
          <p>
            Максимальный капитал в наших профилях фирм: BrightFunded — до $400 000, FundedNext — до $300 000, Crypto Fund Trader — до
            $200 000, FTMO — до $2 000 000. Это верхняя граница с учётом масштабирования, а не стартовый счёт: в таблице выше обычные
            размеры начинаются с $5 000–$10 000, а самый крупный стандартный счёт у этих программ — $200 000.
          </p>
          <p>
            Считайте доход от доли, а не от капитала. Прибыль $1 000 при доле 80% — это $800 вам. Из суммы вычтите стоимость челленджа и
            неудачных попыток: две попытки BrightFunded на $100K — это уже €994.
          </p>
        </div>
      </section>

      <section className="ru-section" id="prop-schet">
        <div className="ru-shell ru-content">
          <h2>Проп-счёт: что это</h2>
          <p>
            Проп-счёт — счёт фирмы, на котором вы торгуете после оценки (или сразу, в моделях без челленджа). У FundingPips он называется
            мастер-счётом, у других фирм — funded или live. После прохождения FundingPips требует KYC, проверку, соглашение и подключение —
            только потом можно торговать. Подробно — <RuPendingLink href="/ru/funded-account">funded account</RuPendingLink>; как выводить деньги — в разделе{' '}
            <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="terminy">
        <div className="ru-shell ru-content">
          <h2>Термины проп-трейдинга: просадка, сплит, масштабирование</h2>
          <ul>
            <li><strong>Дневной лимит убытка</strong> — сколько можно потерять за день. У BrightFunded 2-Step Classic — 5%, у FundingPips 2 Step Pro — 3%.</li>
            <li><strong>Максимальная (общая) просадка</strong> — предел убытка за всё время. Статическая считается от начального баланса, трейлинговая поднимается вслед за прибылью — и потому жёстче.</li>
            <li><strong>Сплит (profit split)</strong> — ваша доля прибыли. Базово 80% у программ в таблице выше; у FTMO 2-Step — 80% (90% через масштабирование), у FTMO 1-Step и Instant — 90% (по данным на 14.10.2026).</li>
            <li><strong>Цель по прибыли</strong> — сколько нужно заработать в фазе. У FundedNext Stellar Lite — 8% и 4%, у BrightFunded Classic — 10% и 5%.</li>
            <li><strong>Минимальные торговые дни</strong> — например, 5 дней у BrightFunded Classic и FundedNext Stellar Lite.</li>
            <li><strong>Масштабирование</strong> — рост счёта после стабильных выплат. План есть у FundedNext, BrightFunded и FundingPips; условия у каждой фирмы свои.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="plyusy-minusy">
        <div className="ru-shell ru-content">
          <h2>Плюсы и минусы проп-трейдинга</h2>
          <h3>Плюсы</h3>
          <ul>
            <li><strong>Ограниченный риск.</strong> Максимум, что вы теряете, — взнос: от $55 за $10K у FundingPips 2 Step Pro.</li>
            <li><strong>Доступ к большему счёту.</strong> $100K за €497 у BrightFunded вместо собственного депозита такого размера.</li>
            <li><strong>Дисциплина.</strong> Лимиты убытка не дают «отыгрываться».</li>
          </ul>
          <h3>Минусы</h3>
          <ul>
            <li><strong>Взнос сгорает при провале</strong>, а повторные попытки стоят столько же.</li>
            <li><strong>Правила меняются:</strong> FundingPips обновлял условия выплат в августе 2026 года.</li>
            <li><strong>Симулированные счета</strong> у части фирм и ограничения по странам — включая Россию у FTMO, Topstep и других.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="prop-treyder">
        <div className="ru-shell ru-content">
          <h2>Проп-трейдер: кто это и как им стать</h2>
          <p>
            Проп-трейдер — человек, который торгует капиталом фирмы и получает долю прибыли. В розничной модели он не сотрудник, а
            клиент, купивший оценку; доход — только из выплат, без оклада. Хороший проп-трейдер — это прежде всего риск-менеджер:
            при дневном лимите 3% на счёте $10 000 у вас всего $300 на ошибки за день.
          </p>
          <ol>
            <li><strong>Выберите рынок:</strong> форекс и индексы (CFD), крипта или фьючерсы — от этого зависит набор фирм.</li>
            <li><strong>Проверьте доступ из своей страны</strong> по <Link href="/ru/dlya-russkoyazychnykh-treyderov">таблице для россиян</Link>.</li>
            <li><strong>Протестируйте стратегию на демо</strong> с теми же лимитами, что у выбранной программы.</li>
            <li><strong>Купите самый маленький счёт</strong> и пройдите оценку, прежде чем масштабироваться.</li>
            <li><strong>Получите первую выплату</strong> — только она подтверждает, что модель работает для вас. У BrightFunded первая выплата — через 30 дней, у FundedNext Stellar Lite — через 21 день.</li>
          </ol>
          <p>
            Главные ошибки: торговля без учёта дневного лимита, удержание позиций через выходные там, где это запрещено, и VPN вместо
            проверки доступа — FundedNext называет ложные данные о стране основанием для закрытия аккаунта.
          </p>
        </div>
      </section>

      <section className="ru-section" id="rabota-v-prop-kompanii">
        <div className="ru-shell ru-content">
          <h2>Работа в проп-компании: это работа или нет</h2>
          <p>
            В розничной модели «работа в проп-компании» — не трудоустройство: нет оклада, трудового договора и соцпакета, вы клиент,
            купивший оценку, и получаете только долю прибыли. Настоящая работа трейдером по найму — в проп-деске банка или фонда, и туда
            попадают через собеседование, а не через оплату. Российские компании вроде TeamTraders или PropLive описывают отбор в
            команду — условия смотрите в их обзорах: <Link href="/ru/obzor-teamtraders">TeamTraders</Link>, <Link href="/ru/obzor-proplive">PropLive</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="komu-podhodit">
        <div className="ru-shell ru-content">
          <h2>Кому подходит проп-трейдинг, а кому нет</h2>
          <p>
            <strong>Подходит</strong>, если у вас есть стратегия с понятной статистикой, вы держите риск на сделку ниже дневного лимита и
            готовы потерять взнос как плату за попытку. <strong>Не подходит</strong>, если вы ищете «заработок без вложений», торгуете
            новости или держите позиции через выходные там, где это ограничено, или рассчитываете на гарантированный доход.
          </p>
        </div>
      </section>

      <section className="ru-section" id="drugie-strany">
        <div className="ru-shell ru-content">
          <h2>Проп-трейдинг из других стран: ЕС, Казахстан, Израиль</h2>
          <p>
            Русскоязычные трейдеры живут по всему миру, а доступ определяется страной проживания и документом KYC, а не языком. BrightFunded
            и Crypto Fund Trader не ограничивают Россию — и, по нашим данным, не называют в ограничениях и большинство стран ЕС; у
            FundedNext Россию теперь исключает (см. ниже). Казахстан ограничивают FTMO и Lucid Trading; у FundedNext CFD и BrightFunded он не в списке ограничений. Для Израиля
            и других стран проверьте список ограничений выбранной фирмы. Полная таблица — <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для россиян</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="riski">
        <div className="ru-shell ru-content">
          <h2>Риски</h2>
          <p>
            Модель фирмы зарабатывает в том числе на взносах тех, кто не прошёл оценку. Публичной проверенной статистики, какая доля
            трейдеров проходит челлендж, в наших источниках нет — не верьте точным цифрам без источника. Правила меняются: сверяйте дату
            правил перед оплатой.
          </p>
          <p>
            Отдельный риск — страна. FTMO проверяет личность до выхода на счёт фирмы, E8 Markets определяет страну по документу KYC, а
            FundedNext называет VPN и ложные данные о стране основанием для закрытия аккаунта. Попытка обойти ограничение заканчивается
            потерей и взноса, и прибыли — выбирайте фирму, которая принимает вашу страну официально.
          </p>
        </div>
      </section>

      <section className="ru-section" id="nachat">
        <div className="ru-shell">
          <h2>С чего начать</h2>
          <p className="ru-muted">Универсальные фирмы — BrightFunded и Crypto Fund Trader открыты и для России, и для большинства других стран. Сначала прочитайте обзоры: <Link href="/ru/obzor-bright-funded">BrightFunded</Link>, <Link href="/ru/obzor-fundednext">FundedNext</Link>.</p>
          <RuFundedNextAccessCaveat />
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-prop-trejding-start-1" rel={goLinkRel('bright-funded')} className="btn-primary">BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-prop-trejding-start-2" rel={goLinkRel('fundednext')} className="btn-outline">FundedNext CFD <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-prop-trejding-start-3" rel={goLinkRel('crypto-fund-trader')} className="btn-primary">Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Рейтинг проп-компаний</Link>
          </div>
          <div className="ru-actions" data-ru-cta-mode="all-firms-secondary">
            {[['fundingpips', 'FundingPips'], ['ftmo', 'FTMO'], ['topstep', 'Topstep'], ['e8-markets', 'E8 Markets']].map(([slug, name], i) => (
              <RuGoLink key={slug} firm={slug} href={`/go/${slug}?from=ru-prop-trejding-other-${i + 1}`} rel={goLinkRel(slug)} className="btn-outline">{name}</RuGoLink>
            ))}
          </div>
          <div className="ru-notice" data-russian-risk-disclaimer="prop-trading">
            <strong>Риск.</strong> Торговля с плечом связана с высоким риском; взнос за челлендж не возвращается при провале.
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
