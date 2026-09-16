import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, Calculator, CheckCircle2, Flag, ShieldAlert, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianDataFreshnessNotice from '@/components/RussianDataFreshnessNotice'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/kak-rabotayut-chellendzhi-prop-firm'
const TITLE = 'Челлендж проп-фирмы: 5 этапов и правила (2026)'
const DESCRIPTION = 'Как работает челлендж проп-фирмы: оплата, этапы оценки, просадка, правила профинансированного этапа, выплаты и проверка страны на текущих примерах.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое челлендж проп-фирмы?',
    a: 'Это платная или подписочная оценка на симулированном счёте. Трейдер должен достичь цели по прибыли и не нарушить лимиты дневного и общего убытка, торговые ограничения и минимальные дни.',
  },
  {
    q: 'Можно ли пройти челлендж за один день?',
    a: 'Только если конкретный продукт не устанавливает минимальные торговые дни и другие ограничения. Быстрое достижение цели не отменяет проверку стратегии, KYC и правил профинансированного этапа.',
  },
  {
    q: 'Что важнее: цена или просадка?',
    a: 'Цена ограничивает денежный риск покупки, а просадка — торговое пространство после покупки. Дешёвый продукт с тесной или трейлинг-просадкой может быть хуже более дорогого статического продукта для вашей стратегии.',
  },
  {
    q: 'Гарантирует ли прохождение челленджа выплату?',
    a: 'Нет. После оценки действуют договор, KYC, правила профинансированного этапа, минимальная прибыль, правило консистентности, даты и способы выплаты. Нарушение на профинансированном этапе может лишить права на вознаграждение.',
  },
]

export default function RussianChallengeLifecyclePage() {
  const allChallenges = getAllChallenges()
  const products = allChallenges.filter(product => isChallengeFresh(product))
  const partnerCards = getAllFirms()
    .map(firm => {
      const slug = outboundSlug(firm.name)
      return {
        firm,
        slug,
        products: products.filter(product => product.firmSlug === slug),
      }
    })
    .filter(item => item.firm.affiliateUrl)
    .sort((a, b) => b.firm.score - a.firm.score)
  const sourceCount = new Set(products.map(product => product.sourceUrl)).size
  const latestCapture = products.map(product => product.sourceCapturedAt).sort().at(-1)
  const phaseCounts = [0, 1, 2, 3].map(phases => ({
    phases,
    count: products.filter(product => product.phases === phases).length,
  }))

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Как работают челленджи' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    datePublished: '2026-08-24',
    dateModified: '2026-08-24',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: {
      '@type': 'Organization',
      name: 'Traders Fund Hub',
      url: 'https://tradersfundhub.com',
    },
    mainEntityOfPage: `https://tradersfundhub.com${PATH}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Как работают челленджи</div>
          <RussianDataFreshnessNotice firmSlugs={['fundednext', 'bright-funded']} />
          <div className="ru-eyebrow"><Flag size={14} aria-hidden="true" /> Пять этапов решения</div>
          <h1>Как работает челлендж проп-фирмы: от оплаты до выплаты</h1>
          <p className="ru-lead">
            Челлендж — не один тест, а цепочка из пяти решений: продукт, оценка,
            проверка, профинансированный этап и выплата. Продукт без оценки пропускает средние
            этапы, но не отменяет KYC, договор и правила риска.
          </p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Обновлено 24.08.2026.</p>
          <p className="ru-source-line">
            Если термин ещё не знаком, сначала прочитайте <Link href="/ru/chto-takoe-prop-firma">что такое проп-фирма и чем отличаются 3 модели</Link>.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{products.length}</strong><span>свежих продуктов в примерах</span></div>
            <div className="ru-stat"><strong>{sourceCount}</strong><span>первичных страниц</span></div>
            <div className="ru-stat"><strong>{phaseCounts.find(item => item.phases === 0)?.count ?? 0}</strong><span>продуктов без оценки</span></div>
            <div className="ru-stat"><strong>{latestCapture ?? '—'}</strong><span>последний захват</span></div>
          </div>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy#podbor" className="btn-primary btn-glow">Сравнить фирмы <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/obzor-fundednext" className="btn-outline">Посмотреть на примере FundedNext</Link>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <div className="ru-notice" data-russian-country-boundary="challenge-checkout">
            <strong>Нулевой этап — проверка страны.</strong>{' '}
            До сравнения цены подтвердите гражданство и резидентство, KYC, карту,
            доступную платформу и способ выплаты. Русский интерфейс, русская поддержка
            или отсутствие страны в одном FAQ не являются окончательным разрешением.
          </div>
          <h2>Этап 1. Выбор и оплата продукта</h2>
          <p>
            Сначала выберите инструменты и платформу: для валютных пар откройте
            <Link href="/ru/forex-prop-firmy"> сравнение форекс-программ</Link>, для криптоинструментов —
            <Link href="/ru/luchshie-kripto-prop-firmy"> обзор крипто-проп-фирм</Link>.
            Если торгуете в cTrader, отдельно проверьте
            <Link href="/ru/prop-firmy-s-ctrader"> доступность платформы и её правила</Link> до оплаты челленджа.
          </p>
          <p>
            Сравнивайте не размер виртуального счёта, а сумму, которую реально можно
            потерять: первый платёж, будущий платёж после прохождения, ежемесячное
            продление и комиссия активации. Цена $50 и счёт $50 000 не означают риск 0,1%:
            торговый риск задаёт максимальная просадка, а денежный риск — все платежи.
          </p>
          <ul>
            <li>Проверьте, разовый это платёж или подписка.</li>
            <li>Уточните, возвращается ли взнос и после какой выплаты.</li>
            <li>Не переводите цену из EUR в USD или RUB без текущего курса и комиссии.</li>
          </ul>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Этап 2. Оценка</h2>
          <p>
            На оценке трейдер достигает цели по прибыли, не нарушая дневной и общий
            лимит убытка. Один и тот же процент просадки может считаться по балансу,
            эквити, в реальном времени или в конце дня. Эти варианты дают разное
            фактическое пространство для сделки.
          </p>
          <div className="ru-grid">
            <article className="ru-card"><ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Дневной лимит</h3><p className="ru-muted">Сбрасывается по расписанию фирмы. Открытый плавающий убыток может учитываться даже до закрытия сделки.</p></article>
            <article className="ru-card"><Calculator size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Максимальная просадка</h3><p className="ru-muted">Статическая линия не движется; трейлинг-линия следует за максимумом до указанной точки фиксации.</p></article>
            <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Минимальные дни</h3><p className="ru-muted">Достижение цели раньше срока не завершает этап, если продукт требует 2, 5 или больше отдельных торговых дней.</p></article>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-challenge-guide-example="loss-budget">
          <h2>Числовой пример: превратить проценты в лимит сделки</h2>
          <p>Проценты становятся понятнее, если перевести их в деньги до первой сделки. Ниже приведены два условных сценария для виртуального счёта 50 000; это арифметика формулы, а не условия конкретной фирмы и не рекомендация по размеру позиции.</p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Условный набор правил</th><th>Цель</th><th>Дневной лимит</th><th>Общий лимит</th><th>Перевод в деньги</th></tr></thead>
              <tbody>
                <tr><td>8% / 5% / 10%</td><td>8% = 4 000</td><td>5% = 2 500</td><td>10% = 5 000</td><td>Плавающий убыток и закрытые сделки должны оставаться внутри обоих лимитов.</td></tr>
                <tr><td>10% / 3% / 6%</td><td>10% = 5 000</td><td>3% = 1 500</td><td>6% = 3 000</td><td>Более высокая цель не компенсирует более узкий дневной и общий запас.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Практический вывод: дневной лимит задаёт бюджет на один торговый день, а максимальная просадка — бюджет на весь этап. Если правило рассчитывается по эквити, открытая позиция может использовать лимит ещё до закрытия сделки; если по балансу, момент фиксации будет другим. Формулу и время сброса нужно сохранить из правил выбранного продукта.</p>
          <div className="ru-grid">
            <article className="ru-card"><Calculator size={22} color="var(--accent-light)" aria-hidden="true" /><h3>До сделки</h3><p className="ru-muted">Запишите размер счёта, цель, дневной и общий лимит в валюте счёта. Затем определите максимальный риск стратегии, а не только размер стоп-лосса.</p></article>
            <article className="ru-card"><ShieldAlert size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Во время сделки</h3><p className="ru-muted">Проверьте, учитывает ли фирма плавающий результат, комиссии, своп и открытые ордера. Один и тот же процент даёт разный запас при балансовом и equity-расчёте.</p></article>
            <article className="ru-card"><CheckCircle2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>После этапа</h3><p className="ru-muted">Сохраните новую версию правил профинансированного этапа: цель может исчезнуть, но KYC, консистентность, запрет новостей или минимальные прибыльные дни могут появиться.</p></article>
          </div>
          <p className="ru-source-line">Реальные проценты и цены проверяйте в карточке выбранного продукта и его первичном источнике: для русскоязычного сравнения начните с <Link href="/ru/luchshie-prop-firmy#podbor">подбора программ</Link>, а не с усреднённого примера.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Этап 3. Вторая фаза или проверка результатов</h2>
          <p>
            Двух- и трёхэтапные продукты повторяют проверку с новой целью. Одноэтапный
            продукт переходит к внутренней проверке результатов, а продукт без оценки (Phase 0)
            начинает сразу с правилами профинансированного этапа. «Instant» описывает отсутствие оценки,
            но не обещает реальный брокерский капитал или мгновенную выплату.
          </p>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead><tr><th>Тип</th><th>Продуктов сейчас</th><th>Что пропускает</th><th>Что остаётся</th></tr></thead>
              <tbody>
                <tr><td>Без оценки / instant</td><td>{phaseCounts.find(item => item.phases === 0)?.count ?? 0}</td><td>оценку и промежуточную проверку</td><td>KYC, правила профинансированного этапа, условия выплаты</td></tr>
                <tr><td>1 этап</td><td>{phaseCounts.find(item => item.phases === 1)?.count ?? 0}</td><td>вторую цель</td><td>одна цель, лимиты, проверка</td></tr>
                <tr><td>2 этапа</td><td>{phaseCounts.find(item => item.phases === 2)?.count ?? 0}</td><td>ничего</td><td>две цели и все лимиты</td></tr>
                <tr><td>3 этапа</td><td>{phaseCounts.find(item => item.phases === 3)?.count ?? 0}</td><td>ничего</td><td>три цели и все лимиты</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Этап 4. Правила профинансированного этапа</h2>
          <p>
            После оценки правила могут измениться. Часто добавляются буфер до выплаты,
            правило консистентности, лимит контрактов, запрет новостей, ограничение копирования
            или новая формула трейлинг-просадки. Используйте отдельный чек-лист для
            профинансированного этапа; успешная оценка не переносит автоматически все прежние условия.
          </p>
          <ol>
            <li>Сохраните договор и правила в день активации.</li>
            <li>Запишите формулу дневного и общего убытка.</li>
            <li>Отметьте новости, ночь, выходные, EA и копирование сделок.</li>
            <li>Рассчитайте консистентность до первой крупной прибыльной сделки.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Этап 5. Право на выплату</h2>
          <p>
            Дата выплаты и способ выплаты — разные условия. «Каждые 14 дней» не
            гарантирует банковский перевод в вашей стране. Проверьте минимальную сумму,
            прибыльные дни, буфер, консистентность, закрытые позиции, комиссию провайдера
            и совпадение имени получателя с KYC.
          </p>
          <div className="ru-card">
            <WalletCards size={24} color="var(--accent-light)" aria-hidden="true" />
            <h3>Формула проверки</h3>
            <p className="ru-muted">Право по календарю + выполненное условие по прибыли + соблюдённая консистентность + разрешённый канал выплаты + подтверждённый KYC = возможность подать запрос. Это ещё не обещание одобрения.</p>
          </div>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="challenge-guide">
            Некоторые ссылки на фирмы могут быть партнёрскими. Комиссия не меняет
            формулу, порядок сравнения или страновые ограничения. Переходите к покупке
            только после проверки всех пяти этапов.
          </div>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary btn-glow">Собрать короткий список <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/how-prop-firm-challenges-work" hrefLang="en" className="btn-outline">Полная английская версия</Link>
          </div>
          <div className="ru-grid" data-russian-education-partner-cta="challenge-guide">
            {partnerCards.map(item => {
              const reviewHref = item.slug === 'fundednext'
                ? '/ru/obzor-fundednext'
                : item.slug === 'fundingpips'
                  ? '/ru/obzor-fundingpips'
                  : item.slug === 'bright-funded'
                    ? '/ru/obzor-bright-funded'
                    : item.firm.reviewUrl
              return (
                <article className="ru-card" key={item.slug} data-russian-education-partner={item.slug}>
                  <div className="ru-card-head"><h3>{item.firm.name}</h3><span className="ru-score">Партнёр</span></div>
                  <p className="ru-muted">{item.products.length > 0 ? `${item.products.length} свежих продуктов` : 'Свежий продуктовый захват временно отсутствует'}; перед оплатой проверьте этапы, страну, KYC и правило выплаты конкретной модели.</p>
                  <div className="ru-actions">
                    <Link href={reviewHref} className="btn-outline">Открыть обзор</Link>
                    <Link href={`/go/${item.slug}?from=ru-challenge-guide-${item.slug}`} rel="sponsored nofollow noopener" className="btn-primary">
                      Проверить условия <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
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
