import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import { ArrowRight, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/funded-account'
const UPDATED = '14.10.2026'
const UPDATED_ISO = '2026-10-14'
export const revalidate = 86400
const TITLE = 'Funded account (фандед аккаунт): что это и как получить'
const DESCRIPTION = 'Funded account (фандед аккаунт) — что это, как получить через челлендж или instant funding, реальный ли это счёт, как выводить прибыль и где открыть из России.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['funded account', 'фандед аккаунт', 'финансируемый аккаунт', 'funded account что это'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

// content/data/challenges, проверено 29.09.2026 (Crypto Fund Trader — 08.09.2026).
const sizeRows = [
  { firm: 'BrightFunded', product: '2-Step Classic', sizes: '$5K–$200K', from: '€49 за $5K', top: '€997 за $200K', checked: '14.10.2026' },
  { firm: 'FundedNext', product: 'Stellar Lite', sizes: '$5K–$200K', from: '$32.99 за $5K', top: '$798.99 за $200K', checked: '15.10.2026' },
  { firm: 'Crypto Fund Trader', product: 'Evaluation', sizes: '$5K–$200K', from: '$58 за $5K', top: '$1 250 за $200K', checked: '14.10.2026' },
  { firm: 'FundingPips', product: '2 Step Pro', sizes: '$5K–$200K', from: '$29 за $5K', top: '$844 за $200K', checked: '15.10.2026' },
]

const payouts = [
  { firm: 'BrightFunded', methods: 'USDC (ERC-20), банковский перевод в EUR', split: '80%' },
  { firm: 'FundedNext (CFD)', methods: 'USDT (ERC20/TRC20), USDC, RiseWorks, банк, карта', split: '80%' },
  { firm: 'Crypto Fund Trader', methods: 'Банк EUR/USD, USDT ERC20/TRC20, BTC, ETH', split: '80% (Evaluation)' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Funded account — что это?',
    a: 'Это счёт проп-фирмы, на котором вы торгуете после прохождения оценки (или сразу, в моделях instant funding) и получаете долю прибыли. По-русски его называют фандед аккаунт или финансируемый аккаунт.',
  },
  {
    q: 'Фандед аккаунт — это реальные деньги?',
    a: 'Зависит от фирмы. FundingPips прямо пишет, что все её счета, включая мастер-счёт, работают в симулированной среде; реальны только выплаты. Ищите формулировку о симулированных счетах в правилах выбранной фирмы.',
  },
  {
    q: 'Можно ли получить funded account без челленджа?',
    a: 'Да, через instant funding: например, FundedNext Stellar Instant (от $59.99 за $2 000 на 29.09.2026) или FundingPips Zero. Взнос платится всё равно, а KYC и договор никто не отменяет.',
  },
  {
    q: 'Где получить финансируемый аккаунт из России?',
    a: `На ${UPDATED} Россию не ограничивают BrightFunded, FundedNext (только CFD) и Crypto Fund Trader (на Match-Trader). FTMO, Topstep, E8 Markets, FXIFY, Maven, Alpha Capital, Apex, Lucid и Tradeify Россию ограничивают; у FundingPips доступ для РФ не ясен.`,
  },
  {
    q: 'Можно ли потерять funded account?',
    a: 'Да. Нарушение дневного или общего лимита убытка закрывает счёт так же, как на этапе оценки. Ложные данные о стране или VPN — тоже основание для закрытия: FundedNext указывает это в своих правилах.',
  },
]

export default function RussianFundedAccountPage() {
  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'Funded account' }])
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-funded-account="guide">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Funded account</div>
          <div className="ru-eyebrow"><WalletCards size={14} aria-hidden="true" /> Обновлено {UPDATED}</div>
          <h1>Funded account (фандед аккаунт): что это и как получить</h1>
          <p className="ru-lead">
            Большинство думает, что пройти челлендж — это победа. На самом деле с этого момента только начинается работа:
            KYC, договор, новые правила выплат. Funded account — это не приз, а контракт. Разберём, что в нём написано, а фирмы
            сравним в <Link href="/ru/luchshie-prop-firmy">рейтинге проп-компаний</Link>.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Данные по фирмам — с датой проверки у каждой цифры.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="funded-account">
            <strong>Партнёрское раскрытие.</strong> По кнопкам регистрации мы можем получить комиссию. У каждой кнопки — отметка о доступе для РФ на {UPDATED}.
          </div>
        </div>
      </section>

      <section className="ru-section" id="chto-eto">
        <div className="ru-shell ru-content">
          <h2>Что такое funded account</h2>
          <p>
            Funded account (фандед аккаунт, финансируемый аккаунт) — счёт проп-фирмы, на котором трейдер торгует после оценки и
            получает долю прибыли: базово 80% у BrightFunded и FundedNext по нашим данным. Названия у фирм разные: у FundingPips это
            «мастер-счёт» (Master Account), у других — funded, verified или live. Общий принцип один: ваши деньги — только взнос, а
            лимиты убытка задаёт фирма. Что такое проп-трейдинг в целом — <RuPendingLink href="/ru/prop-trejding">отдельный разбор</RuPendingLink>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="kak-poluchit">
        <div className="ru-shell ru-content">
          <h2>Как получить фандед аккаунт: челлендж или instant funding</h2>
          <h3>Через челлендж</h3>
          <p>
            Классический путь: одна или две фазы оценки с целью по прибыли и лимитами убытка. Например, у BrightFunded 2-Step Classic цели
            10% и 5%, у FundedNext Stellar Lite — 8% и 4% (данные на 29.09.2026). После прохождения — проверка. У FundingPips это четыре
            шага: KYC, внутренняя проверка, соглашение с клиентом и подключение; два внутренних этапа могут занять до 2 рабочих дней каждый.
          </p>
          <h3>Instant funding — без оценки</h3>
          <p>
            Модели вроде <Link href="/ru/fundednext-stellar-instant">FundedNext Stellar Instant</Link> и FundingPips Zero выдают счёт сразу,
            но дороже: Stellar Instant на $10 000 стоит $299.99, а Stellar Lite с оценкой — $59.99 (29.09.2026). Ловушка — в правилах:
            у Stellar Instant трейлинговая просадка 6% и доля 70%, у Zero — плавающий лимит 5% и минимум прибыльных дней. Сравнение —
            на странице <Link href="/ru/prop-firmy-bez-chelendzha">проп-фирмы без челленджа</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="razmery">
        <div className="ru-shell ru-content">
          <h2>Размеры funded account и цены</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-funded-sizes="four-firms">
              <caption className="hidden-caption">Размеры и цены funded account у четырёх фирм</caption>
              <thead><tr><th>Фирма</th><th>Программа</th><th>Размеры</th><th>Минимум</th><th>Максимум</th><th>Проверено</th></tr></thead>
              <tbody>
                {sizeRows.map(row => <tr key={row.firm}><td><strong>{row.firm}</strong></td><td>{row.product}</td><td>{row.sizes}</td><td>{row.from}</td><td>{row.top}</td><td>{row.checked}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="ru-muted">Цены без скидок. Актуальные коды — на странице <Link href="/ru/promokody-prop-firm">промокоды проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="pravila">
        <div className="ru-shell ru-content">
          <h2>Правила funded account: лимиты, стабильность, выходные, новости</h2>
          <ul>
            <li><strong>Лимиты убытка</strong> обычно сохраняются после оценки: у BrightFunded Classic — 5% в день и 10% всего, у FundingPips 2 Step Pro — 3% и 6%.</li>
            <li><strong>Правило стабильности:</strong> у FundingPips — от 15% до 35% в зависимости от продукта; оно ограничивает долю прибыли одного дня в общей прибыли.</li>
            <li><strong>Выходные:</strong> у FundingPips на этапе оценки перенос через выходные разрешён, а на мастер-счёте требует дополнительной опции Swing.</li>
            <li><strong>Новости:</strong> у FundedNext на счёте фирмы действует новостное окно, прибыль по позициям в нём учитывается лишь на 40%.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section" id="masshtabirovanie">
        <div className="ru-shell ru-content">
          <h2>Масштабирование funded account</h2>
          <p>
            План масштабирования есть у BrightFunded, FundedNext и FundingPips: после стабильных выплат счёт увеличивают. Верхние границы
            в наших профилях — до $400 000 у BrightFunded и до $300 000 у FundedNext. Условия (сколько выплат, какой рост за шаг) у каждой
            фирмы свои — читайте их в обзоре: <Link href="/ru/obzor-bright-funded">BrightFunded</Link>, <Link href="/ru/obzor-fundednext">FundedNext</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="poterya">
        <div className="ru-shell ru-content">
          <h2>Почему теряют funded account: 5 частых нарушений</h2>
          <ol>
            <li><strong>Дневной лимит.</strong> На счёте $10 000 с лимитом 3% достаточно потерять $300 за день.</li>
            <li><strong>Общая просадка.</strong> При трейлинговой просадке граница поднимается за прибылью — запас тает быстрее, чем кажется.</li>
            <li><strong>Позиции через выходные</strong> там, где это ограничено (FundingPips Master без опции Swing).</li>
            <li><strong>Торговля в новостное окно</strong> — у FundedNext это урезает прибыль до 40%.</li>
            <li><strong>Ложные данные о стране или VPN</strong> — FundedNext называет это основанием для закрытия аккаунта.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="demo-ili-realnyy">
        <div className="ru-shell ru-content">
          <h2>Демо или реальный счёт: в чём разница</h2>
          <p>
            Самая неприятная деталь, которую мало кто читает. FundingPips по политике ответственной торговли держит все счета в
            симулированной демо-среде: мастер-счёт — это договорный этап для расчёта вознаграждения, а не брокерский счёт с переданным
            капиталом. Для вас разница в одном: деньги приходят как вознаграждение по договору, а исполнение сделок — симуляция.
            У других фирм ищите в правилах слова «simulated» или «demo» до оплаты.
          </p>
        </div>
      </section>

      <section className="ru-section" id="ili-svoy-depozit">
        <div className="ru-shell ru-content">
          <h2>Funded account или свой депозит у брокера</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-funded-vs-broker="compare">
              <caption className="hidden-caption">Funded account против собственного депозита</caption>
              <thead><tr><th></th><th>Funded account</th><th>Свой депозит</th></tr></thead>
              <tbody>
                <tr><td><strong>Что вы рискуете</strong></td><td>Взнос: €97 за $10K у BrightFunded</td><td>Весь депозит: $10 000 за $10K</td></tr>
                <tr><td><strong>Доля прибыли</strong></td><td>Базово 80%</td><td>100% минус комиссии</td></tr>
                <tr><td><strong>Правила</strong></td><td>Лимиты фирмы, стабильность, ограничения по новостям</td><td>Только ваши</td></tr>
                <tr><td><strong>Вывод</strong></td><td>По графику фирмы (у BrightFunded первая выплата через 30 дней)</td><td>Когда угодно</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kyc-dogovor">
        <div className="ru-shell ru-content">
          <h2>KYC и договор: что проверить до первой сделки на funded account</h2>
          <p>
            Между прохождением оценки и первой сделкой на счёте фирмы почти всегда стоит проверка личности. FTMO проводит её до выхода на
            счёт фирмы (FTMO Identity), E8 Markets определяет страну по документу KYC, а не по IP, Alpha Capital смотрит и на гражданство,
            и на резидентство. Значит, ваш паспорт и адрес должны совпадать с тем, что вы указали при покупке челленджа.
          </p>
          <p>
            В договоре проверьте три вещи: долю прибыли и график выплат, правила, которые меняются после оценки (выходные, новости,
            стабильность), и основания для закрытия счёта. Сохраните копию правил с датой — фирмы обновляют их: FundingPips, например,
            менял условия выплат в августе 2026 года.
          </p>
        </div>
      </section>

      <section className="ru-section" id="kak-vybrat">
        <div className="ru-shell ru-content">
          <h2>Как выбрать funded account: 5 вопросов</h2>
          <ol>
            <li><strong>Принимает ли фирма мою страну?</strong> Проверьте по <Link href="/ru/dlya-russkoyazychnykh-treyderov">таблице доступа</Link>, а не по языку сайта.</li>
            <li><strong>Какая просадка — статическая или трейлинговая?</strong> Статическая считается от начального баланса и прощает больше.</li>
            <li><strong>Сколько ждать первой выплаты?</strong> 21 день у FundedNext Stellar Lite, 30 дней у BrightFunded Classic.</li>
            <li><strong>Как я получу деньги?</strong> Если банковский перевод недоступен, нужен криптокошелёк: USDT или USDC в нужной сети.</li>
            <li><strong>Что меняется на счёте фирмы?</strong> Новостное окно у FundedNext, опция Swing для выходных у FundingPips.</li>
          </ol>
          <p>
            Если хотя бы на один вопрос нет ответа в правилах — напишите в поддержку и сохраните ответ до оплаты. Рейтинг с этими
            параметрами — <Link href="/ru/luchshie-prop-firmy">проп-компании 2026</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" id="vyplaty">
        <div className="ru-shell ru-content">
          <h2>Выплаты с funded account</h2>
          <p>
            Пример: на счёте $10 000 вы заработали 5% — $500. При доле 80% вам причитается $400, из которых ещё вычтутся комиссия
            сети или провайдера. Способы вывода у фирм, открытых для России:
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-funded-payouts="russia-open">
              <caption className="hidden-caption">Способы выплаты у проп-фирм, открытых для России</caption>
              <thead><tr><th>Фирма</th><th>Доля трейдера</th><th>Способы выплаты</th></tr></thead>
              <tbody>
                {payouts.map(row => <tr key={row.firm}><td><strong>{row.firm}</strong></td><td>{row.split}</td><td>{row.methods}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p>Детали по сетям и выводу в рубли — в разделе <Link href="/ru/vyplaty-prop-firm">выплаты проп-фирм</Link>.</p>
        </div>
      </section>

      <section className="ru-section" id="iz-rossii">
        <div className="ru-shell">
          <h2>Где получить funded account из России</h2>
          <p className="ru-muted">
            На {UPDATED} Россию не ограничивают три фирмы ниже. У FundedNext выбирайте CFD-программу: направление Futures
            Россию ограничивает. Полная таблица — <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для россиян</Link>.
          </p>
          <div className="ru-actions">
            <RuGoLink firm="bright-funded" href="/go/bright-funded?from=ru-funded-account-russia-1" rel={goLinkRel('bright-funded')} className="btn-primary">BrightFunded <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="fundednext" href="/go/fundednext?from=ru-funded-account-russia-2" rel={goLinkRel('fundednext')} className="btn-primary">FundedNext CFD <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
            <RuGoLink firm="crypto-fund-trader" href="/go/crypto-fund-trader?from=ru-funded-account-russia-3" rel={goLinkRel('crypto-fund-trader')} className="btn-primary">Crypto Fund Trader <ArrowRight size={14} aria-hidden="true" /></RuGoLink>
          </div>
          <div className="ru-actions" data-ru-cta-mode="all-firms-secondary">
            {[['fundingpips', 'FundingPips'], ['ftmo', 'FTMO'], ['topstep', 'Topstep'], ['e8-markets', 'E8 Markets'], ['fxify', 'FXIFY'], ['maven', 'Maven'], ['alpha-capital', 'Alpha Capital'], ['apex-trader-funding', 'Apex'], ['lucid-trading', 'Lucid'], ['tradeify', 'Tradeify']].map(([slug, name], i) => (
              <RuGoLink key={slug} firm={slug} href={`/go/${slug}?from=ru-funded-account-other-${i + 1}`} rel={goLinkRel(slug)} className="btn-outline">{name}</RuGoLink>
            ))}
          </div>
          <p className="ru-source-line">Дальше: <RuPendingLink href="/ru/prop-trejding">что такое проп-трейдинг</RuPendingLink> · <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm">как работает челлендж</Link> · <Link href="/ru/luchshie-prop-firmy">рейтинг проп-компаний</Link></p>
          <div className="ru-notice" data-russian-risk-disclaimer="funded-account">
            <strong>Риск.</strong> Нарушение лимита убытка закрывает и funded account; взнос не возвращается. Торговля с плечом связана с высоким риском.
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
