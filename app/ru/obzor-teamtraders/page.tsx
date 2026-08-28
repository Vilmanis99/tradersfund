import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Database,
  FileCheck2,
  Globe2,
  Scale,
  SearchCheck,
  ShieldAlert,
  WalletCards,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import evidence from '@/content/data/russian-teamtraders-evidence.json'

const PATH = '/ru/obzor-teamtraders'
const TITLE = 'TeamTraders: отзывы и обзор условий 2026'
const DESCRIPTION = 'Обзор TeamTraders 2026: цены ₽2 590–₽8 990, два этапа по 6%, лимиты 2%/4%, 10 торговых дней, доля 70% или 95%, выплаты и договор.'
const TEAMTRADERS_HOME = 'https://teamtraders.ru/'
const TEAMTRADERS_FAQ = 'https://teamtraders.ru/faq'
const TEAMTRADERS_OFFER = 'https://teamtraders.ru/oferta_prop/'
const TEAMTRADERS_LEGACY_DOCS = 'https://teamtraders.ru/docs/'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'TeamTraders отзывы',
    'TeamTraders обзор',
    'TeamTraders проп компания',
    'TeamTraders стажировка',
    'TeamTraders выплаты',
  ],
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Сколько стоит отбор TeamTraders в 2026 году?',
    a: 'Текущая страница тарифов публикует три месячные цены: 2 590 ₽ за счёт 500 000 ₽, 4 890 ₽ за 1 000 000 ₽ и 8 990 ₽ за 2 000 000 ₽. Оплата покрывает один месяц; при положительном балансе и отсутствии нарушения риска FAQ допускает продление со скидкой 20%.',
  },
  {
    q: 'Какие цели и лимиты действуют на отборе TeamTraders?',
    a: 'Отбор состоит из двух шагов с целью 6% на каждом. Дневной стоп равен 2% стартового баланса, максимальный риск — 4%, а минимальный срок составляет 10 торговых дней суммарно на оба шага. Для зачёта дня достаточно одной сделки.',
  },
  {
    q: 'Сразу ли после отбора дают реальный счёт?',
    a: 'Не обязательно. Текущий FAQ описывает промежуточный финансируемый демо-счёт с долей трейдера 70% и целью-пределом прибыли 10% от баланса. Обычный переход на реальный счёт указан после вывода этих 10%, хотя досрочный перевод возможен по решению компании.',
  },
  {
    q: 'Правда ли, что трейдер получает 95% прибыли?',
    a: '95% относится к полноценному реальному счёту: компания пишет, что удерживает 5% с каждого прибыльного дня. На финансируемом демо-счёте опубликована другая доля — 70%. Архивная документация всё ещё показывает 90%, поэтому фактический процент нужно подтвердить в веб-кабинете до акцепта оферты.',
  },
  {
    q: 'Можно ли переносить позиции через ночь или использовать роботов?',
    a: 'Нет по текущему FAQ: перенос через ночь запрещён, а торговые роботы и алгоритмические стратегии не предусмотрены. Скальпинг, внутридневная торговля и новостные импульсы разрешены только при соблюдении дневного лимита 2% и максимального риска 4%.',
  },
  {
    q: 'На каких рынках работает TeamTraders?',
    a: 'Основной продукт относится к Московской бирже, CScalp и инфраструктуре, которую TeamTraders связывает с брокером Финам. Текущий FAQ уточняет, что доступны выбранные ликвидные фьючерсы, а не автоматически все контракты; акции упомянуты как отдельное подключение с условиями в кабинете.',
  },
  {
    q: 'Есть ли у Traders Fund Hub партнёрская ссылка TeamTraders?',
    a: 'Нет. На проверенных 28 августа 2026 года главной странице, FAQ и оферте не найдена обычная публичная программа для контент-партнёров. Ссылки на FundedNext и Bright Funded ниже относятся к отдельным глобальным фирмам и могут принести Traders Fund Hub комиссию.',
  },
]

const globalRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

function rub(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function SourceLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener" className="ru-card-link">{children}</a>
}

export default function RussianTeamTradersReviewPage() {
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    const priceCount = products.reduce((total, product) => total + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0) || (tier.priceEur != null && tier.priceEur > 0),
    ).length, 0)
    return { ...route, firm, products, priceCount }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании', url: '/ru/rossiyskie-prop-kompanii' },
    { name: 'Обзор TeamTraders' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: evidence.capturedAt,
    dateModified: evidence.capturedAt,
    author: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
    about: { '@type': 'Organization', name: 'TeamTraders', url: TEAMTRADERS_HOME },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section
        className="ru-hero"
        data-russian-local-review="teamtraders"
        data-russian-local-review-status="verification-only"
      >
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/rossiyskie-prop-kompanii">Местные компании</Link> / TeamTraders</div>
          <div className="ru-eyebrow"><SearchCheck size={14} aria-hidden="true" /> TeamTraders отзывы · проверка первичных источников</div>
          <h1>TeamTraders: отзывы и обзор условий 2026 года</h1>
          <p className="ru-lead">
            В текущем снимке TeamTraders продаёт месячный отбор на 3 размера счёта: от 500 000 ₽ до 2 000 000 ₽.
            Два шага требуют по 6% прибыли при дневном стопе 2% и максимальном риске 4%, но после прохождения обычно
            следует ещё финансируемый демо-этап с долей 70%. Заявленные 95% относятся уже к полноценному реальному счёту.
          </p>
          <div className="ru-stats" aria-label="Ключевые цифры TeamTraders">
            <div className="ru-stat"><strong>{evidence.accounts.length}</strong><span>тарифа: ₽500 тыс., ₽1 млн и ₽2 млн</span></div>
            <div className="ru-stat"><strong>{evidence.evaluation.profitTargetPctPerStep}% + {evidence.evaluation.profitTargetPctPerStep}%</strong><span>две цели отбора</span></div>
            <div className="ru-stat"><strong>{evidence.evaluation.minimumTradingDaysTotal}</strong><span>минимальных торговых дней суммарно</span></div>
            <div className="ru-stat"><strong>{evidence.capturedAt}</strong><span>дата проверки источников</span></div>
          </div>
          <div className="ru-actions">
            <SourceLink href={TEAMTRADERS_HOME}>Открыть официальный сайт</SourceLink>
            <Link href="#global-options" className="btn-primary btn-glow">Сравнить глобальные варианты <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="ru-source-line">Официальная ссылка TeamTraders не партнёрская. Цены и правила взяты с главной страницы, FAQ и оферты; архивное расхождение показано отдельно.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="local-review-not-access">
            <strong>Русский язык не делает эту модель глобальной.</strong>{' '}
            TeamTraders описывает локальную инфраструктуру Московской биржи, CScalp и Финам. Русскоязычному трейдеру
            за пределами России нужно отдельно подтвердить договорную допустимость, документы, платежи, доступ к терминалу
            и порядок выплаты; резиденту России нельзя переносить правила TeamTraders на FundedNext или Bright Funded.
          </div>
          <h2>Короткий вывод: это внутридневная MOEX-модель, а не CFD-челлендж</h2>
          <div className="ru-grid" data-russian-teamtraders-verdict="model-first">
            <article className="ru-card">
              <Building2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Кому имеет смысл изучить</h3>
              <p className="ru-muted">Трейдеру, который работает вручную внутри дня, готов использовать CScalp и выбранные инструменты MOEX, а также выдерживать фиксированные границы 2% за день и 4% по счёту.</p>
            </article>
            <article className="ru-card">
              <ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Кому модель не подходит</h3>
              <p className="ru-muted">Свинг-трейдеру с переносом через ночь, пользователю алгоритмов или человеку, который считает, что после двух целей 6% автоматически получает реальный счёт и 95% прибыли без промежуточного этапа.</p>
            </article>
            <article className="ru-card">
              <Scale size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Главный риск чтения рекламы</h3>
              <p className="ru-muted">Заголовок «95%» относится к real account, тогда как funded demo публикует 70% и предел прибыли 10%. Эти 2 стадии нельзя объединять в одну обещанную выплату.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-pricing="three-rub-tiers">
        <div className="ru-shell">
          <h2>Тарифы TeamTraders: три размера и месячная оплата</h2>
          <p className="ru-muted">
            Все 3 строки используют одинаковые проценты: 6% на каждом из двух шагов, дневной риск 2% и максимальный
            риск 4%. Цена покрывает 1 месяц стажировки; это не одноразовая fee с бессрочным evaluation.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Стартовый баланс</th><th>Цена за месяц</th><th>Цель на каждом шаге</th><th>Дневной стоп</th><th>Максимальный риск</th></tr></thead>
              <tbody>
                {evidence.accounts.map(account => (
                  <tr key={account.startingBalanceRub}>
                    <td><strong>{rub(account.startingBalanceRub)}</strong></td>
                    <td>{rub(account.monthlyPriceRub)}</td>
                    <td>{rub(account.targetRubPerStage)} ({evidence.evaluation.profitTargetPctPerStep}%)</td>
                    <td>{rub(account.dailyLossRub)} ({evidence.evaluation.dailyLossPct}%)</td>
                    <td>{rub(account.maximumLossRub)} ({evidence.evaluation.maximumLossPct}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><SourceLink href={TEAMTRADERS_HOME}>Источник тарифов</SourceLink> · <SourceLink href={TEAMTRADERS_FAQ}>FAQ о продлении и риске</SourceLink> · снимок {evidence.capturedAt}.</p>
          <div className="ru-notice">
            <strong>Продление не безусловное.</strong>{' '}
            Скидка {evidence.evaluation.renewalDiscountPct}% опубликована только для счёта в плюсе без нарушения
            риск-менеджмента. Если 2% или 4% превышены на отборе, FAQ требует начать заново с новой оплатой.
          </div>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-process="five-stages">
        <div className="ru-shell ru-content">
          <h2>Путь до реального счёта: пять отдельных состояний</h2>
          <ol>
            <li><strong>Бесплатный демо-счёт.</strong> Он открывается без оплаты и позволяет проверить CScalp, подключение и собственную стратегию; его результат не засчитывается в отбор.</li>
            <li><strong>Оплаченный шаг 1.</strong> После активации начинается учёт результата: цель 6%, дневная граница 2%, общий максимум 4% и запрет на ночь.</li>
            <li><strong>Оплаченный шаг 2.</strong> Баланс этапа обновляется, а те же 6%/2%/4% применяются повторно; оба шага вместе должны включать минимум 10 торговых дней.</li>
            <li><strong>Финансируемый демо-счёт.</strong> По текущему FAQ это промежуточный этап с долей 70%, максимальной прибылью 10% и возможностью выводить доступную прибыль частями.</li>
            <li><strong>Реальный счёт.</strong> Обычный переход указан после вывода 10% на funded demo; только здесь опубликована доля 95%, отсутствие максимального profit cap и бессрочная работа при соблюдении правил.</li>
          </ol>
          <p>
            Формулировка на главной странице сокращает путь до 3 маркетинговых шагов, но FAQ раскрывает 5 операционных
            состояний. Поэтому отзыв «прошёл два этапа, но не получил real» нельзя оценивать без проверки, был ли пользователь
            переведён на funded demo и выполнил ли его 10%-ный переходный критерий.
          </p>
          <p className="ru-source-line"><SourceLink href={TEAMTRADERS_FAQ}>Официальный FAQ о стадиях</SourceLink>. Досрочный перевод сразу на real возможен только по решению компании, а не как право каждого прошедшего трейдера.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-rules="manual-intraday">
        <div className="ru-shell">
          <h2>Торговые правила: что разрешено и что проваливает отбор</h2>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Правило</th><th>Текущая публикация</th><th>Практический вывод</th></tr></thead>
              <tbody>
                <tr><td>Дневной стоп</td><td>Фиксированные 2% от стартового баланса</td><td>На ₽1 млн граница равна ₽20 000 каждый торговый день; превышение на шаге 1 или 2 проваливает отбор.</td></tr>
                <tr><td>Максимальный риск</td><td>4% от стартового баланса</td><td>На ₽1 млн уровень равен ₽40 000; нарушение действует на evaluation, funded demo и real.</td></tr>
                <tr><td>Перенос через ночь</td><td>Запрещён</td><td>Все позиции закрываются внутри дня; правило исключает обычную swing-стратегию.</td></tr>
                <tr><td>Роботы</td><td>Не предусмотрены</td><td>FAQ требует ручных решений через терминал; советники и алгоритмические стратегии не заявлены как допустимые.</td></tr>
                <tr><td>Скальпинг и новости</td><td>Разрешены в рамках 2%/4%</td><td>Разрешение стратегии не отменяет проскальзывание и срабатывание risk robot во время волатильности.</td></tr>
                <tr><td>Инструменты</td><td>Выбранные ликвидные фьючерсы; добавление по запросу</td><td>Откройте бесплатный demo и проверьте точный символ: архивное обещание «все фьючерсы» уже не совпадает с FAQ.</td></tr>
                <tr><td>Комиссии</td><td>Списываются и влияют на demo-result</td><td>Текущий FAQ не публикует единую сумму; фактическую комиссию по контракту нужно увидеть в тестовом счёте.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><SourceLink href={TEAMTRADERS_FAQ}>Правила риска и торговли</SourceLink>. Risk robot может закрыть позицию и заблокировать счёт, но его срабатывание обычно уже означает нарушение.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-payouts="demo-70-real-95">
        <div className="ru-shell">
          <h2>Выплаты: 70% на funded demo и 95% на real</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Database size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Финансируемый демо-счёт</h3>
              <p className="ru-muted">Доля трейдера — {evidence.fundedDemo.profitSharePct}%. Цель и максимальная прибыль этапа — {evidence.fundedDemo.profitTargetAndCapPct}% баланса; заявку можно подать на доступную прибыль, не дожидаясь всех 10%.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Реальный счёт</h3>
              <p className="ru-muted">Доля трейдера — {evidence.realAccount.profitSharePct}%, компании — {evidence.realAccount.companySharePct}% с каждого прибыльного дня. Заявки принимаются ежедневно; максимальный profit cap и фиксированный срок не опубликованы.</p>
            </article>
            <article className="ru-card">
              <AlertTriangle size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Нарушение на real</h3>
              <p className="ru-muted">Превышение дневных 2% блокирует счёт до следующей сессии и добавляет штраф {evidence.realAccount.dailyLossExcessPenaltyPct}% от суммы превышения. Превышение общих 4% означает потерю счёта.</p>
            </article>
          </div>
          <p>
            «Ежедневная выплата» означает частоту подачи и расчёта по опубликованной странице, а не гарантированный
            банковский срок. Публичный FAQ не называет минимальную сумму, метод выплаты, комиссию платёжного маршрута или
            срок фактического зачисления, поэтому эти 4 поля нужно запросить до оплаты стажировки.
          </p>
          <p className="ru-source-line"><SourceLink href={TEAMTRADERS_HOME}>Главная о payout</SourceLink> · <SourceLink href={TEAMTRADERS_FAQ}>FAQ о funded demo и real</SourceLink>.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-source-conflict="current-vs-legacy">
        <div className="ru-shell">
          <h2>Почему старые отзывы TeamTraders показывают другие числа</h2>
          <p className="ru-muted">
            На одном официальном домене одновременно доступны новая главная/FAQ и архив `/docs/`. Это создаёт 3
            проверяемых конфликта, которые нельзя скрыть усреднением или выбором более привлекательной цифры.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Поле</th><th>Текущая главная/FAQ</th><th>Архив `/docs/`</th><th>Как читать</th></tr></thead>
              <tbody>
                <tr><td>Минимальный срок</td><td>10 торговых дней на 2 шага</td><td>15 торговых сессий</td><td>Используем 10 как текущую публикацию, но сохраняем скрин/условия кабинета перед оплатой.</td></tr>
                <tr><td>Доля на real</td><td>95%; компания удерживает 5%</td><td>90%</td><td>Оферта переносит фактический расчёт в кабинет, поэтому 95% нужно сверить с экраном акцепта.</td></tr>
                <tr><td>Фьючерсы</td><td>Выбранные ликвидные инструменты</td><td>Все доступные фьючерсы MOEX</td><td>Решающим является список символов в бесплатном demo, а не старый общий текст.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><SourceLink href={TEAMTRADERS_FAQ}>Текущий FAQ</SourceLink> · <SourceLink href={TEAMTRADERS_LEGACY_DOCS}>Архивная документация</SourceLink> · сравнение зафиксировано {evidence.capturedAt}.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-legal="offer-before-registration">
        <div className="ru-shell ru-content">
          <h2>Оферта и юридическая модель: регистрация уже считается акцептом</h2>
          <p>
            Оферта редакции {evidence.legal.offerRevision} называет предметом услуги разработку торговых стратегий.
            Пункт 1.3 приравнивает регистрацию в веб-кабинете к заключению договора, а пункт 6.1 оставляет размер
            вознаграждения и порядок расчёта в самом кабинете. Поэтому документ нужно прочитать до создания профиля,
            а не после первой выплаты.
          </p>
          <p>
            В реквизитах указан {evidence.legal.operatorName}, ОГРНИП {evidence.legal.ogrnip} и ИНН {evidence.legal.inn}.
            Пункт 5.4 позволяет компании менять условия с уведомлением через кабинет, а пункт 7.3 допускает одностороннее
            расторжение любой стороной. Это описание опубликованного текста, не юридическая консультация.
          </p>
          <div className="ru-notice" data-russian-teamtraders-checklist="eight-fields">
            <strong>Сохраните 8 полей до регистрации:</strong> редакцию оферты, цену тарифа, срок 1 месяца, условия скидки
            20%, две доли 70%/95%, точный метод выплаты, список инструментов и экран с расчётом вознаграждения.
          </div>
          <p className="ru-source-line"><FileCheck2 size={14} aria-hidden="true" /> <SourceLink href={TEAMTRADERS_OFFER}>Открыть публичную оферту</SourceLink>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Партнёрская прозрачность TeamTraders</h2>
          <div className="ru-notice" data-russian-local-affiliate="not-found">
            <strong>Публичная affiliate-программа TeamTraders для нашего сайта не найдена.</strong>{' '}
            На 3 проверенных страницах — главной, FAQ и оферте — нет обычных условий для контент-издателя. Ссылки на
            crypto-exchange rebate в подвале относятся к другому продукту и не доказывают реферальную программу TeamTraders.
          </div>
          <p>
            Поэтому официальный TeamTraders URL на этой странице не содержит `/go/`, UTM affiliate или скрытую замену
            назначения. Коммерческие ссылки появляются только в следующем разделе и ведут к двум отдельно обозначенным
            глобальным партнёрам с собственными русскими обзорами.
          </p>
        </div>
      </section>

      <section className="ru-section" id="global-options">
        <div className="ru-shell" data-russian-local-global-funnel="teamtraders">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="teamtraders-global-options">
            <strong>FundedNext и Bright Funded — отдельные глобальные партнёры.</strong>{' '}
            Мы можем получить комиссию после перехода через `/go/` и регистрации. Комиссия не меняет цифры TeamTraders,
            но эти модели нельзя считать доступными по одному русскому языку: проверьте гражданство, резидентство, KYC,
            платформу и payout route без VPN или неверных данных.
          </div>
          <h2>Когда вместо TeamTraders сравнивать глобальную проп-фирму</h2>
          <p className="ru-muted">
            TeamTraders привязан к MOEX, ручной внутридневной торговле и рублёвой месячной стажировке. Глобальный вариант
            логичнее исследовать, если нужен отдельный CFD evaluation в USD или EUR, иной набор платформ и международный
            платёжный маршрут — при условии, что фактический профиль пользователя разрешён.
          </p>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-teamtraders-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Главный партнёр</span></div>
                <p className="ru-muted">
                  {item.slug === 'fundednext'
                    ? `${item.products.length} свежих модели в USD, включая Stellar Instant; сравните phase count, drawdown и payout timing с 5 стадиями TeamTraders.`
                    : `${item.products.length} свежие evaluation-модели в EUR; сравните platform/KYC и payout через USDC ERC-20 или банковский EUR с локальным MOEX-маршрутом.`}
                </p>
                <ul className="ru-facts">
                  <li><Database size={14} aria-hidden="true" /> {item.products.length} свежих продуктов</li>
                  <li><WalletCards size={14} aria-hidden="true" /> {item.priceCount} опубликованных цен</li>
                  <li><Globe2 size={14} aria-hidden="true" /> Доступ проверяется по реальному профилю</li>
                </ul>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Сначала открыть обзор</Link>
                  <Link
                    href={`/go/${item.slug}?from=ru-teamtraders-global-${item.slug}`}
                    rel="sponsored nofollow noopener"
                    className="btn-primary"
                  >
                    Проверить {item.name} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="ru-source-line"><Globe2 size={14} aria-hidden="true" /> <Link href="/ru/fundednext-vs-bright-funded">Сравнить FundedNext и Bright Funded по 7 продуктам</Link> · <Link href="/ru/dlya-russkoyazychnykh-treyderov">проверка профиля русскоязычного трейдера</Link>.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-teamtraders-decision="rules-before-reviews">
        <div className="ru-shell ru-content">
          <h2>Как принять решение по TeamTraders без веры в анонимный отзыв</h2>
          <ol>
            <li><strong>Откройте бесплатный demo:</strong> проверьте CScalp, Privod Bondar 2.0 и нужный MOEX-символ до оплаты 2 590–8 990 ₽.</li>
            <li><strong>Смоделируйте 10 дней:</strong> стратегия должна дважды достичь 6%, не касаясь дневных 2% и общего уровня 4%.</li>
            <li><strong>Разделите payout:</strong> рассчитайте сначала 70% на funded demo, затем 95% только на real; не применяйте рекламный максимум ко всему пути.</li>
            <li><strong>Сохраните договор:</strong> регистрация считается акцептом, а формула оплаты находится в кабинете и может меняться после уведомления.</li>
            <li><strong>Сравните модель:</strong> MOEX/manual/intraday сопоставляйте с собственным стилем, а FundedNext или Bright Funded — отдельно по country/KYC и конкретному продукту.</li>
          </ol>
          <p>
            Наш вывод не является рейтингом «надёжно/ненадёжно». На {evidence.capturedAt} TeamTraders раскрывает больше
            чисел, чем многие локальные операторы, но одновременно оставляет существенные поля в кабинете и сохраняет
            противоречащий архив. Рациональный следующий шаг — бесплатная техническая проверка и письменное подтверждение
            payout method, а не немедленная месячная оплата.
          </p>
          <p className="ru-source-line"><CalendarDays size={14} aria-hidden="true" /> Проверено {evidence.capturedAt} по 4 страницам первого уровня. <Link href="/ru/rossiyskie-prop-kompanii">Вернуться к 6 локальным примерам</Link>.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Частые вопросы о TeamTraders</h2>
          <RussianFaq items={faqs} />
        </div>
      </section>
    </>
  )
}
