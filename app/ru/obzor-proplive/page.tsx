import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, FileCheck2, Globe2, Scale, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/obzor-proplive'
const TITLE = 'PropLive: обзор русской проп-компании (2026)'
const DESCRIPTION = 'PropLive на русском: модель через Московскую биржу и Финам, заявления о выплатах, договор, KYC и партнёрская программа без смешения с глобальным рейтингом.'
const PROP_LIVE_HOME = 'https://www.proplive.ru/'
const PROP_LIVE_ABOUT = 'https://proplive.ru/o-nas'
const PROP_LIVE_REQUISITES = 'https://proplive.ru/rekvizity-kompanii'
const PROP_LIVE_PARTNERS = 'https://www.proplive.ru/partnyoram'
const PROP_LIVE_CONTRACT = 'https://static.proplive.ru/documents/document-17.pdf'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'PropLive — это обычный онлайн-челлендж?',
    a: 'По опубликованному описанию PropLive предоставляет торговые аккаунты для сделок на Московской бирже через брокера Финам и позиционирует себя как реальную проп-инфраструктуру. Это отличается от стандартной CFD-модели с автоматическим оценочным челленджем, поэтому условия нельзя сравнивать только по проценту сплита.',
  },
  {
    q: 'Действительно ли PropLive выплачивает за один день?',
    a: 'На официальной странице оператор заявляет вывод в течение одного рабочего дня и в любой день недели. Это заявление компании, а не независимая гарантия: перед регистрацией запросите действующий регламент, комиссию и документы для выплаты.',
  },
  {
    q: 'Подходит ли PropLive русскоязычному трейдеру за пределами России?',
    a: 'Сайт заявляет международный трейдинг и отдельные условия для нерезидентов РФ, но язык страницы не заменяет проверку договора, гражданства, резидентства, KYC, брокера и платёжного маршрута. Получите письменное подтверждение до оформления.',
  },
  {
    q: 'Есть ли у PropLive партнёрская программа для сайта?',
    a: 'Публичная страница партнёров описывает модель для наставников и школ, где вознаграждение связано с прибылью учеников и условия обсуждаются индивидуально. Это не подтверждённая стандартная ссылка для обычного редакционного сайта, поэтому здесь нет локального партнёрского перехода.',
  },
  {
    q: 'Сколько нужно заплатить для старта в PropLive?',
    a: 'На главной странице PropLive написано «Нисколько» и заявлен небольшой стартовый капитал от компании. Это маркетинговое описание, а не полный прайс: запросите договор, приложение со стоимостью услуг, комиссии, требования к терминалу и условия изменения капитала до регистрации.',
  },
  {
    q: 'Какой договор подписывает трейдер PropLive?',
    a: 'В опубликованном PDF это договор возмездного оказания услуг по разработке торговых стратегий. Вознаграждение определяется приложением «Стоимость услуг», расчёт опирается на данные ИТС, а оплата по умолчанию производится в рублях. Перед присоединением прочитайте сам договор и все приложения.',
  },
  {
    q: 'Можно ли торговать из другой страны и на каком компьютере?',
    a: 'Оператор заявляет торговлю из любой страны и отсутствие обязательного гражданства РФ, но для терминала CScalp указывает компьютер на Windows. Для нерезидента отдельно подтвердите KYC, брокера Финам, платёжный маршрут и доступ к MOEX до передачи документов.',
  },
]

const globalRoutes = [
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
  { slug: 'fundingpips', name: 'FundingPips', reviewHref: '/ru/obzor-fundingpips' },
  { slug: 'bright-funded', name: 'Bright Funded', reviewHref: '/ru/obzor-bright-funded' },
] as const

function SourceLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener" className="ru-card-link">{children}</a>
}

export default function RussianPropLiveReviewPage() {
  const localSignal = marketEvidence.localFirmSignals.find(item => item.operator === 'PropLive')
  const affiliateSignal = marketEvidence.affiliatePrograms.find(item => item.operator === 'PropLive')
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании', url: '/ru/rossiyskie-prop-kompanii' },
    { name: 'Обзор PropLive' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    dateModified: marketEvidence.capturedAt,
    inLanguage: 'ru',
    author: { '@type': 'Organization', name: 'Traders Fund Hub' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-local-review="proplive" data-russian-local-review-status="verification-only">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / <Link href="/ru/rossiyskie-prop-kompanii">Российские компании</Link> / PropLive</div>
          <div className="ru-eyebrow"><Building2 size={14} aria-hidden="true" /> Локальное исследование, не рекомендация</div>
          <h1>PropLive: обзор 2026 — Мосбиржа, выплаты и условия</h1>
          <p className="ru-lead">
            Разбираем только опубликованные заявления PropLive: модель через Московскую биржу и Финам,
            заявленный срок вывода, договор и отдельную партнёрскую программу. Это локальный обзор для
            русскоязычного поиска, а не подтверждение доступности или платёжеспособности.
          </p>
          <div className="ru-actions">
            <Link href="#facts" className="btn-primary btn-glow">Проверить факты <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Сравнить глобальные фирмы</Link>
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{Number(localSignal?.claims.traders).toLocaleString('ru-RU')}</strong><span>трейдеров по заявлению оператора</span></div>
            <div className="ru-stat"><strong>1 день</strong><span>заявленный срок вывода</span></div>
            <div className="ru-stat"><strong>MOEX</strong><span>рынок в опубликованной модели</span></div>
            <div className="ru-stat"><strong>{marketEvidence.capturedAt}</strong><span>дата снимка источников</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="facts">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="local-review-not-access">
            <strong>Проверка страницы не равна проверке доступа.</strong>{' '}
            Оператор заявляет международный трейдинг, но гражданство, резидентство, KYC, брокер,
            договор и способ выплаты нужно подтвердить напрямую. Не переносите условия PropLive на глобальные CFD-продукты.
          </div>
          <h2>Что опубликовано на официальных страницах</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-local-review-facts="proplive">
              <thead><tr><th>Пункт</th><th>Заявление оператора</th><th>Редакционный статус</th><th>Источник</th></tr></thead>
              <tbody>
                <tr><td>Модель</td><td>Торговые аккаунты для Московской биржи через брокера Финам; оператор описывает себя как основного инвестора</td><td>Опубликовано оператором; не сравниваем с CFD-челленджем</td><td><SourceLink href={PROP_LIVE_ABOUT}>О компании</SourceLink></td></tr>
                <tr><td>Трейдеры</td><td>{Number(localSignal?.claims.traders).toLocaleString('ru-RU')} в верхнем счётчике; ниже указано более 10 700</td><td>Внутреннее расхождение чисел, не независимый аудит</td><td><SourceLink href={PROP_LIVE_HOME}>Главная</SourceLink></td></tr>
                <tr><td>Старт</td><td>«Нисколько»: оператор заявляет небольшой капитал для раскачки и увеличение капитала при успешной торговле</td><td>Заявление оператора; цена, комиссия и размер капитала зависят от оформления</td><td><SourceLink href={PROP_LIVE_HOME}>FAQ на главной</SourceLink></td></tr>
                <tr><td>Вывод</td><td>В течение 1 рабочего дня и в любой день недели</td><td>Заявленный срок; запросите действующий регламент</td><td><SourceLink href={PROP_LIVE_HOME}>FAQ оператора</SourceLink></td></tr>
                <tr><td>Партнёры</td><td>До {affiliateSignal?.maximumPublishedCommissionPct}% PayOut — доля от прибыли учеников наставника или школы</td><td>Только по заявке; не обычная партнёрская ссылка издателя</td><td><SourceLink href={PROP_LIVE_PARTNERS}>Условия партнёров</SourceLink></td></tr>
                <tr><td>Юрлицо</td><td>ООО «ЛАЙВ ИНВЕСТ»; реквизиты опубликованы отдельно</td><td>Проверьте, с кем заключается договор и кто принимает оплату</td><td><SourceLink href={PROP_LIVE_REQUISITES}>Реквизиты</SourceLink></td></tr>
                <tr><td>Договор</td><td>Услуги по разработке торговых стратегий; вознаграждение — в приложении «Стоимость услуг», оплата по умолчанию в рублях</td><td>Нужно читать актуальную версию и все приложения до регистрации</td><td><SourceLink href={PROP_LIVE_CONTRACT}>PDF договора</SourceLink></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Где PropLive отличается от глобального рейтинга</h2>
          <div className="ru-grid">
            <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Рынок</h3><p className="ru-muted">PropLive описывает торговлю на Московской бирже через брокера; глобальные страницы сайта сравнивают отдельные CFD, крипто и продукты без оценки по их собственным правилам.</p></article>
            <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Документы</h3><p className="ru-muted">Договор и регламент важнее рекламного счётчика. Сохраните версию документов, KYC-требования, комиссию и формулу выплаты до оформления.</p></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Партнёрство</h3><p className="ru-muted">Публичная программа PropLive рассчитана на наставников и школы, поэтому мы не создаём локальный /go/ маршрут без подтверждённой редакционной партнёрской ссылки.</p></article>
          </div>
          <div className="ru-notice" data-russian-local-affiliate="application-only">
            <strong>Локальная партнёрская ссылка пока не активирована.</strong>{' '}
            Публичные условия партнёров требуют заявки и описывают долю от активности учеников. Мы не смешиваем такую модель с глобальными CPA-переходами и не выдаём её за подтверждённую комиссию сайта.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как устроен старт: четыре пункта, которые нужно запросить письменно</h2>
          <ol>
            <li><strong>Право доступа:</strong> оператор пишет, что трейдеру старше 18 лет не обязательно иметь гражданство РФ; это не отменяет отдельную проверку нерезидента.</li>
            <li><strong>Капитал:</strong> на главной заявлен небольшой стартовый капитал без оплаты со стороны трейдера, но сумма и критерии увеличения не раскрыты в этом обещании.</li>
            <li><strong>Инфраструктура:</strong> сделки описаны на MOEX через Финам; CScalp требует компьютер на Windows, поэтому проверьте терминал, комиссии и доступность брокера.</li>
            <li><strong>Выплата:</strong> запросите регламент, долю трейдера, порядок расчёта и валюту до начала торговли; маркетинговая формула «от 1 дня» не является гарантированным сроком.</li>
          </ol>
          <div className="ru-notice" data-russian-proplive-start-check="four-points">
            <strong>Что сохранить до заявки:</strong> актуальный договор, приложение со стоимостью услуг, регламент, реквизиты ООО «ЛАЙВ ИНВЕСТ», условия для нерезидента РФ и подтверждение метода выплаты.
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Договор: важнее рекламного счётчика</h2>
          <div className="ru-grid">
            <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Приложение №4</h3><p className="ru-muted">Пункт 20 опубликованного договора отсылает расчёт вознаграждения к приложению «Стоимость услуг». Без этого приложения нельзя считать условия полностью раскрытыми.</p><SourceLink href={PROP_LIVE_CONTRACT}>Открыть договор</SourceLink></article>
            <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Данные ИТС</h3><p className="ru-muted">Пункты 21–28 связывают объём и стоимость услуг с данными ИТС и допускают корректировку оплаты при изменении экономической эффективности стратегии.</p><SourceLink href={PROP_LIVE_CONTRACT}>Пункты 21–28</SourceLink></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Изменение условий</h3><p className="ru-muted">Пункт 18 описывает уведомление о несогласии в течение 3 календарных дней и прекращение договора через 5 календарных дней после получения уведомления компанией.</p><SourceLink href={PROP_LIVE_CONTRACT}>Пункт 18</SourceLink></article>
          </div>
          <p className="ru-source-line">Это разбор текста опубликованного договора, а не юридическое заключение. Сравните PDF с версией в личном кабинете: приложение, регламент и заявление о присоединении входят в договорный пакет.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-local-global-funnel="proplive">
          <div className="ru-notice ru-disclosure">
            <strong>Переход к глобальным фирмам.</strong>{' '}
            Если вам нужен сопоставимый онлайн-продукт, ниже находятся глобальные партнёры с отдельными русскими обзорами.
            Это переход к онлайн-сравнению, а не перенос условий PropLive: рынок, брокер, KYC и выплаты нужно сверить отдельно.
            Комиссия возможна после регистрации, но не меняет локальные выводы или порядок сравнения.
          </div>
          <h2>Глобальные альтернативы для русскоязычных трейдеров</h2>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-local-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.products.length > 0 ? `${item.products.length} свежих продуктов` : 'Свежий продуктовый захват временно отсутствует'}; сравните CFD-модель с рынком PropLive и отдельно проверьте страну, KYC и вывод.</p>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Открыть обзор</Link>
                  <Link href={`/go/${item.slug}?from=ru-proplive-global-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">Проверить условия <ArrowRight size={14} aria-hidden="true" /></Link>
                </div>
              </article>
            ))}
          </div>
          <p className="ru-source-line"><Globe2 size={14} aria-hidden="true" /> Локальные примеры: <Link href="/ru/rossiyskie-prop-kompanii">все шесть исследовательских карточек</Link>; глобальные условия: <Link href="/ru/luchshie-prop-firmy">русский рейтинг</Link>.</p>
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
