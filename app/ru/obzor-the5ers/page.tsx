import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import RuPendingLink from '@/components/RuPendingLink'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'
import { getLanguageAlternates, russianRouteDateModified } from '@/lib/localizedRoutes'

const PATH = '/ru/obzor-the5ers'
const CHECKED = '14.10.2026'
const SOURCE = 'https://the5ers.com/terms-and-conditions/'
/** Russia clause, payout cadence and card/Hub Credit terms re-checked on live the5ers.com pages (challenges/_captures/the5ers-2026-10-19.json). */
const RECHECKED = '19.10.2026'
export const revalidate = 86400
const TITLE = 'The5ers: обзор 2026 — программы, правила, доступ из России'
const DESCRIPTION = 'The5ers проп-фирма: программы High Stakes, Hyper/Pro Growth и Bootcamp, цели, просадка, доля прибыли и выплаты по данным на 14.10.2026. Россия и Беларусь — в списке ограничений; альтернативы для РФ.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['the5ers', 'the5ers проп', 'проп фирма 5ers', 'the5ers россия', 'the 5ers'],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const territories = [
  { region: 'Россия', status: 'Ограничена' },
  { region: 'Беларусь', status: 'Ограничена' },
  { region: 'Украина', status: 'Только Крым' },
  { region: 'Казахстан', status: 'Не в списке' },
]

const alternatives = [
  { slug: 'bright-funded', name: 'BrightFunded', note: 'Россия не в списке ограничений; выплаты в USDC (ERC-20) или EUR', review: '/ru/obzor-bright-funded' },
  { slug: 'fundednext', name: 'FundedNext (CFD)', note: 'Россия не в списке ограничений CFD; выплаты в USDT, USDC, через Rise', review: '/ru/obzor-fundednext' },
  { slug: 'crypto-fund-trader', name: 'Crypto Fund Trader', note: 'На Match-Trader ограничений по странам нет; выплаты в USDT, BTC, ETH или банком', review: '/blog/crypto-fund-trader-review' },
] as const

const faqs: RussianFaqItem[] = [
  {
    q: 'The5ers работает с Россией?',
    a: `Нет. На ${RECHECKED} Россия входит в список «Forbidden Territories» в официальных условиях The5ers (Terms and Conditions). Ограничение касается резидентов и граждан.`,
  },
  {
    q: 'Какая доля прибыли у The5ers?',
    a: `По данным на ${CHECKED}: в High Stakes — 80% с ростом до 85%, 90% и 100% по мере масштабирования; в Hyper Growth и Pro Growth — «до 100%», старт с 75%.`,
  },
  {
    q: 'Можно ли пройти The5ers из Казахстана?',
    a: 'Казахстан на дату проверки в списке ограничений The5ers не назван. Это не письменное подтверждение доступа: перед оплатой уточните условия для своего гражданства и страны проживания.',
  },
  {
    q: 'Чем заменить The5ers трейдеру из России?',
    a: 'На дату проверки Россию не ограничивают BrightFunded, FundedNext (только CFD) и Crypto Fund Trader (на Match-Trader). Их правила отличаются от The5ers — сравните их в обзорах.',
  },
  {
    q: 'Почему на странице нет цен The5ers?',
    a: 'Правила программ мы проверили 14.10.2026, но какая цена относится к какому варианту программы, пока не подтверждено. Поэтому цены и способы оплаты не публикуем — смотрите их на странице оформления заказа.',
  },
]

export default function RussianThe5ersPage() {
  const crumbs = breadcrumbSchema([{ name: 'Русская версия', url: '/ru' }, { name: 'The5ers' }])
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-the5ers="restricted">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / The5ers</div>
          <div className="ru-eyebrow"><ShieldAlert size={14} aria-hidden="true" /> <span className="ru-badge ru-badge--closed">Недоступно для РФ</span> · проверено {CHECKED}</div>
          <h1>{TITLE}</h1>
          <p className="ru-lead">
            Если вы ищете The5ers из России — короткий ответ: не получится. Россия и Беларусь стоят в официальном списке «Forbidden
            Territories» фирмы, причём ограничение распространяется и на резидентов, и на граждан. Ниже — что именно написано, кого это
            касается и какие проп-фирмы открыты для РФ.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Источник: <a href={SOURCE} target="_blank" rel="nofollow noopener noreferrer">условия The5ers (Terms and Conditions)</a>, открыты {RECHECKED}.</p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="the5ers">
            <strong>Партнёрское раскрытие.</strong> По кнопкам альтернатив мы можем получить комиссию. Ссылка на официальный сайт The5ers — обычная, не партнёрская.
          </div>
          <div className="ru-actions">
            <a href="https://the5ers.com/" target="_blank" rel="nofollow noopener noreferrer" className="btn-outline" data-russian-the5ers-official="non-affiliate">Официальный сайт The5ers</a>
            <span className="ru-badge ru-badge--closed">Недоступно для РФ</span>
          </div>
        </div>
      </section>

      <section className="ru-section" id="spisok">
        <div className="ru-shell ru-content">
          <h2>The5ers и страны СНГ: что в списке ограничений</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-the5ers-territories="cis">
              <thead><tr><th>Страна</th><th>Статус в The5ers</th></tr></thead>
              <tbody>{territories.map(t => <tr key={t.region}><td><strong>{t.region}</strong></td><td>{t.status}</td></tr>)}</tbody>
            </table>
          </div>
          <p>
            Важная деталь — формулировка «residents or citizens». Россиянин, живущий в другой стране, тоже попадает под ограничение.
          </p>
        </div>
      </section>

      <section className="ru-section" id="the5ers-prop">
        <div className="ru-shell ru-content" data-russian-the5ers-programs="2026-10-14">
          <h2>The5ers проп: программы и правила</h2>
          <p>
            The5ers — проп-фирма для CFD-трейдинга на платформе MT5. По данным на {CHECKED} на официальном сайте описаны три
            основные модели: двухэтапная High Stakes, одноэтапные Hyper Growth и Pro Growth и трёхэтапная Bootcamp. Фьючерсную
            программу мы не проверяли. Цены не приводим: какая цена относится к какому варианту программы, пока не подтверждено.
            Список способов оплаты мы нашли только для фьючерсной программы, поэтому для CFD-программ его не приводим. Смотрите цены и
            способы оплаты на странице оформления заказа.
          </p>

          <h3>High Stakes (2 этапа)</h3>
          <ul>
            <li><strong>Размеры счёта:</strong> $2 500, $5 000, $10 000, $25 000, $50 000 и $100 000.</li>
            <li><strong>Цели:</strong> на первом этапе 8% или 10% в зависимости от варианта программы, на втором — 5%.</li>
            <li><strong>Просадка:</strong> 5% дневная и 10% максимальная для счетов $2 500–$25 000; 4% и 8% для $50 000 и $100 000.</li>
            <li><strong>Минимум:</strong> 3 прибыльных дня с результатом не меньше 0,5%. Ограничения по времени нет.</li>
            <li><strong>Плечо:</strong> 1:100.</li>
            <li><strong>Доля прибыли:</strong> 80%, затем 85% при капитале $175 000, 90% при $250 000 и 100% плюс ежемесячная зарплата при $350 000. Масштабирование — до $500 000.</li>
          </ul>
          <p className="ru-source-line">Источники: <a href="https://the5ers.com/high-stakes/" target="_blank" rel="nofollow noopener noreferrer">High Stakes</a> — по данным на {CHECKED}.</p>

          <h3>Hyper Growth и Pro Growth (1 этап)</h3>
          <ul>
            <li><strong>Цель:</strong> 10%.</li>
            <li><strong>Риск:</strong> стоп-аут при 6% убытка; при 3% дневного убытка торговля ставится на паузу.</li>
            <li><strong>Плечо:</strong> 1:30.</li>
            <li><strong>Доля прибыли:</strong> «до 100%», масштабирование начинается с 75%.</li>
          </ul>
          <p>
            На главной странице сайта отдельно показан одноэтапный счёт $100 000 с целью 10%, максимальным убытком 6%, дневным лимитом 3%,
            правилом согласованности 50%, долей 75%, лимитом выплаты $2 000 и плечом 1:100. Плечо здесь отличается от страницы Hyper Growth —
            перед покупкой уточните, к какой программе относится этот вариант.
          </p>
          <p className="ru-source-line">Источник: <a href="https://the5ers.com/hyper-growth/" target="_blank" rel="nofollow noopener noreferrer">Hyper Growth</a> и главная страница <a href="https://the5ers.com/" target="_blank" rel="nofollow noopener noreferrer">the5ers.com</a> — по данным на {CHECKED}.</p>

          <h3>Bootcamp (3 этапа)</h3>
          <ul>
            <li><strong>Размеры счёта:</strong> $20 000, $100 000 и $250 000. Взнос делится на две части: при покупке и при получении финансирования.</li>
            <li><strong>Цели:</strong> три этапа по 6%, затем 5% на финансируемом счёте.</li>
            <li><strong>Риск:</strong> 5% максимального убытка на оценке; после финансирования — 4% максимального убытка и пауза при 3% за день.</li>
            <li><strong>Плечо и рост:</strong> 1:30, масштабирование до $4 000 000.</li>
          </ul>
          <p className="ru-source-line">Источник: <a href="https://the5ers.com/bootcamp/" target="_blank" rel="nofollow noopener noreferrer">Bootcamp</a> — по данным на {CHECKED}.</p>

          <h3>Выплаты The5ers</h3>
          <p>
            В High Stakes первая выплата — через 14 дней после получения финансируемого счёта, затем раз в две недели. Способы
            получения выплаты мы на действующих страницах The5ers не нашли, поэтому их не приводим. Для трейдеров из России это
            неактуально: доступ закрыт на этапе регистрации.
          </p>
          <p>
            Об оплате: по условиям The5ers взнос можно оплатить картой, банковским переводом или другими способами, которые
            предлагает сайт; при оплате картой платить должен её владелец. Hub Credits, которые начисляет фирма, можно использовать
            для оплаты услуг в Hub (<a href="https://the5ers.com/terms-and-conditions/" target="_blank" rel="nofollow noopener noreferrer">Terms and Conditions</a>, по данным на {RECHECKED}).
          </p>
          <p className="ru-source-line">Источник: <a href="https://the5ers.com/high-stakes/" target="_blank" rel="nofollow noopener noreferrer">High Stakes</a> (график выплат) — по данным на {RECHECKED}.</p>
        </div>
      </section>

      <section className="ru-section" id="sravnenie">
        <div className="ru-shell ru-content">
          <h2>The5ers или альтернативы: в чём разница</h2>
          <p>
            Главное отличие The5ers — длинная лестница роста: в High Stakes доля растёт с 80% до 100%, а Bootcamp масштабируется до
            $4 000 000. Зато правила жёстче, чем кажется по заголовку: в одноэтапных программах стоп-аут при 6% и пауза при 3% дневного убытка, а
            в Bootcamp после финансирования максимальный убыток всего 4%. Если вы живёте в России, сравнение остаётся теоретическим —
            выбирайте среди фирм, которые РФ не ограничивают.
          </p>
        </div>
      </section>

      <section className="ru-section" id="alternativy">
        <div className="ru-shell ru-content">
          <h2>Альтернативы The5ers для трейдеров из России</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-the5ers-alternatives="russia">
              <thead><tr><th>Фирма</th><th>Россия и выплаты</th><th>Переход</th></tr></thead>
              <tbody>
                {alternatives.map((alt, index) => (
                  <tr key={alt.slug}>
                    <td><strong><Link href={alt.review}>{alt.name}</Link></strong></td>
                    <td>{alt.note}</td>
                    <td><RuGoLink firm={alt.slug} href={`/go/${alt.slug}?from=ru-obzor-the5ers-alt-${index + 1}`} rel={goLinkRel(alt.slug)} className="btn-primary">Проверить <ArrowRight size={14} aria-hidden="true" /></RuGoLink></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Полный список — <RuPendingLink href="/ru/prop-kompanii-v-rossii">проп-компании в России</RuPendingLink> и <Link href="/ru/dlya-russkoyazychnykh-treyderov">проп-фирмы для россиян</Link>;
            рейтинг по правилам — <Link href="/ru/luchshie-prop-firmy">рейтинг проп-компаний</Link>.
          </p>
          <div className="ru-notice" data-russian-risk-disclaimer="the5ers">
            <strong>Риск.</strong> Торговля с плечом связана с высоким риском; взнос за челлендж не возвращается при провале. Не обходите ограничения VPN или чужими данными.
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
