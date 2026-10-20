import type { Metadata } from 'next'
import RuRelatedBlock from '@/components/RuRelatedBlock'
import { RuReviewVerdictBox } from '@/components/RuVerdict'
import Link from '@/components/SafeLink'
import { ArrowRight, Building2, Calculator, FileCheck2, Globe2, Scale, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import RussianEvidenceFreshnessNotice from '@/components/RussianEvidenceFreshnessNotice'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { russianRouteDateModified } from '@/lib/localizedRoutes'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { RuGoLink } from '@/components/RuGoLink'
import { RuAccessBadgeView } from '@/components/RuAccessBadgeView'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { RUSSIA_STATUS_ORDER } from '@/lib/russianRanking'
import Breadcrumbs from '@/components/Breadcrumbs'

const PATH = '/ru/obzor-kascapital'
export const revalidate = 3600
const TITLE = 'KasCapital: обзор 2026 — выплаты, плечо и условия компании'
const DESCRIPTION = 'KasCapital: не челлендж, а свой депозит с плечом до ×100 на акции. Доля «до 95%» и «максимум 20%» компании, выплаты по понедельникам от 10 000 ₽.'
const KAS_HOME = 'https://kascapital.io/'
const KAS_OFFER = 'https://kascapital.io/documents/Oferta.pdf'
// Prop Firm Tracker recheck (data/new-firms-2026-10-20 @4f9a20d, _captures/kascapital-2026-10-20.json): deposit + leverage model,
// no challenge; the split wording on the homepage is shown as published ('до 95%' and 'максимум 20%').
const KAS_RECHECK = '20.10.2026'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'KasCapital — это обычный CFD-челлендж?',
    a: 'Нет. По описанию на сайте (по данным на 20.10.2026) трейдер вносит собственный депозит и торгует акциями с плечом до ×100: в примере 50 000 ₽ дают до 5 000 000 ₽ покупательной способности. Платы за челлендж, целей прибыли и лимитов просадки для оценки на сайте нет, поэтому проценты и сроки нельзя сравнивать с глобальными челленджами.',
  },
  {
    q: 'Как KasCapital описывает выплаты?',
    a: 'На официальной странице указано, что заявки подаются через личный кабинет, выплаты проходят по понедельникам, а диапазон одной заявки составляет от 10 000 до 2 000 000 рублей. Перед регистрацией нужно открыть действующий регламент и проверить дату среза заявки.',
  },
  {
    q: 'Есть ли у KasCapital публичная партнёрская программа?',
    a: 'При проверке официального сайта публичные партнёрские или реферальные условия не найдены. Поэтому этот обзор не содержит локального /go/ перехода и не обещает комиссию.',
  },
  {
    q: 'Подходит ли KasCapital русскоязычному трейдеру за пределами России?',
    a: 'Русский интерфейс не отвечает на вопросы о гражданстве, резидентстве, KYC, договоре, оплате или выплате за пределами России. Эти пункты нужно подтвердить у оператора до передачи документов или денег.',
  },
  {
    q: 'Что означает пример 50 000 ₽ и плечо ×100?',
    a: 'KasCapital приводит пример покупательной способности до 5 000 000 ₽ при депозите 50 000 ₽ и плече ×100 на акциях. Это пример механики, а не обещание доступного лимита, доходности или отсутствия комиссий для каждого уровня.',
  },
  {
    q: 'Какие условия KasCapital нужно запросить до регистрации?',
    a: 'Попросите действующие оферту и регламент, список инструментов и брокера, критерии грейда, правила риска, расчёт доли до 95%, комиссии, KYC и порядок выплаты после пятничного среза. Одной маркетинговой страницы недостаточно для решения о деньгах.',
  },
]

const globalRoutes = [
  { slug: 'bright-funded', name: 'BrightFunded', reviewHref: '/ru/obzor-bright-funded' },
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext' },
] as const

function SourceLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener" className="ru-card-link">{children}</a>
}

export default function RussianKasCapitalReviewPage() {
  const localSignal = marketEvidence.localFirmSignals.find(item => item.operator === 'KasCapital')
  const affiliateSignal = marketEvidence.affiliatePrograms.find(item => item.operator === 'KasCapital')
  const localSignalCapturedAt = localSignal?.sourceCapturedAt ?? ''
  const affiliateCapturedAt = affiliateSignal?.sourceCapturedAt ?? ''
  const faqSourcesCurrent = [marketEvidence.capturedAt, localSignal?.sourceCapturedAt ?? '', affiliateSignal?.sourceCapturedAt ?? '']
    .every(sourceCapturedAt => isChallengeFresh({ sourceCapturedAt }))
  const freshChallenges = getAllChallenges().filter(product => isChallengeFresh(product))
  const globalCards = globalRoutes.map(route => {
    const firm = getAllFirms().find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = freshChallenges.filter(product => product.firmSlug === route.slug)
    return { ...route, firm, products }
  }).filter(item => item.firm?.affiliateUrl)
    // Russia-open firms first (BrightFunded), restricted (FundedNext) last; stable for equal status.
    .sort((a, b) => RUSSIA_STATUS_ORDER[russiaStatusFor(a.slug)] - RUSSIA_STATUS_ORDER[russiaStatusFor(b.slug)])

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании', url: '/ru/dlya-russkoyazychnykh-treyderov#rossiyskie' },
    { name: 'Обзор KasCapital' },
  ])
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    dateModified: russianRouteDateModified(PATH),
    inLanguage: 'ru',
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <Breadcrumbs ld={crumbs} locale="ru" />
      {faqSourcesCurrent && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />}

      <section className="ru-hero">
        <div className="ru-shell" data-russian-local-review="kascapital" data-russian-local-review-status="verification-only">
          <RussianEvidenceFreshnessNotice evidence={[
            { label: 'общий снимок рынка', capturedAt: marketEvidence.capturedAt },
            { label: 'заявления KasCapital на главной', capturedAt: localSignalCapturedAt },
            { label: 'проверка партнёрских условий', capturedAt: affiliateCapturedAt },
          ]} />
          <div className="ru-eyebrow"><Building2 size={14} aria-hidden="true" /> Локальное исследование, не рекомендация</div>
          <h1>KasCapital: обзор 2026 — капитал, выплаты и правила</h1>
          <p className="ru-lead" data-russian-kascapital-model="deposit-leverage-not-challenge"><strong>KasCapital — не челлендж-фирма.</strong> По описанию на сайте трейдер вносит собственный депозит (в примере — 50 000 ₽) и торгует акциями с плечом до ×100; платы за челлендж, целей прибыли и лимитов просадки для оценки на сайте нет (по данным на {KAS_RECHECK}). Ниже — заявления KasCapital о доле прибыли и выплатах по понедельникам. Это отдельная российская модель, её нельзя приравнивать к CFD-челленджу или считать подтверждённо безопасной.</p>
          <p className="ru-source-line">Автор: <Link href="/authors/edris-derakhshi">Edris Derakhshi</Link> · Общий снимок рынка: {marketEvidence.capturedAt}; заявления на главной: {localSignalCapturedAt || 'дата не подтверждена'}.</p>
          <div className="ru-actions"><Link href="#facts" className="btn-primary btn-glow">Проверить факты <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/ru/luchshie-prop-firmy#podbor" className="btn-outline">Сравнить глобальные фирмы</Link></div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>до 95% / 20%</strong><span>«до 95%» трейдеру и «максимум 20%» компании — обе формулировки на главной</span></div>
            <div className="ru-stat"><strong>Пн</strong><span>заявленный день обработки выплат</span></div>
            <div className="ru-stat"><strong>{Number(localSignal?.claims.minimumPayoutRub).toLocaleString('ru-RU')} ₽</strong><span>минимум одной заявки</span></div>
            <div className="ru-stat"><strong>{localSignalCapturedAt || 'нет даты'}</strong><span>проверка заявлений на главной</span></div>
          </div>
        </div>
      </section>

      <RuReviewVerdictBox route={PATH} campaign="kascapital-review" sourcesHref="#facts" />

      <section className="ru-section" id="facts">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="local-review-not-access"><strong>Русский интерфейс не равен доступу.</strong> Резидентство, гражданство, KYC, договор, способ оплаты и маршрут выплаты нужно подтвердить у KasCapital напрямую. Операторская цифра не заменяет юридическую и платёжную проверку.</div>
          <h2>Что опубликовано на официальной странице</h2>
          <div className="ru-table-wrap">
            <table className="ru-table" data-russian-local-review-facts="kascapital">
              <thead><tr><th>Пункт</th><th>Заявление оператора</th><th>Редакционный статус</th><th>Источник</th></tr></thead>
              <tbody>
                <tr><td>Модель</td><td>Не челлендж: депозит трейдера (пример — 50 000 ₽) и плечо до ×100 на акции, покупательная способность до 5 000 000 ₽; цены челленджа, целей и лимитов просадки нет</td><td>Описание оператора по данным на {KAS_RECHECK}; не сопоставляем с CFD-челленджем</td><td><SourceLink href={KAS_HOME}>KasCapital</SourceLink></td></tr>
                <tr><td>Доля прибыли</td><td>«до 95%» трейдеру и в том же блоке «Компания получает максимум 20% прибыли» (по данным на {KAS_RECHECK})</td><td>Как две формулировки сочетаются для вашего уровня, сайт не объясняет; запросите формулу до регистрации</td><td><SourceLink href={KAS_HOME}>Условия на главной</SourceLink></td></tr>
                <tr><td>Выплаты</td><td>Еженедельно по понедельникам; заявка от {Number(localSignal?.claims.minimumPayoutRub).toLocaleString('ru-RU')} до {Number(localSignal?.claims.maximumPayoutRub).toLocaleString('ru-RU')} ₽</td><td>Опубликованный диапазон, не независимая история выплат</td><td><SourceLink href={KAS_HOME}>FAQ оператора</SourceLink></td></tr>
                <tr><td>Регистрация</td><td>500 ₽ на счёт после регистрации по описанию оператора</td><td>Бонус и его условия требуют проверки до регистрации</td><td><SourceLink href={KAS_HOME}>Как начать</SourceLink></td></tr>
                <tr><td>Партнёрство</td><td>Публичных партнёрских условий в проверке не найдено</td><td>{affiliateSignal?.status === 'not-found' ? 'Локальная программа не активирована' : 'Нужна повторная проверка'}</td><td><SourceLink href={KAS_HOME}>Официальный сайт</SourceLink></td></tr>
              </tbody>
            </table>
          </div>
          <p className="ru-source-line"><Globe2 size={14} aria-hidden="true" /> Общий снимок рынка: {marketEvidence.capturedAt}; заявления на главной: {localSignalCapturedAt || 'дата не подтверждена'}; партнёрская проверка: {affiliateCapturedAt || 'дата не подтверждена'}. Числа выше являются заявлениями KasCapital и требуют повторной проверки после изменения регламента.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Что проверить до регистрации</h2>
          <div className="ru-grid">
            <article className="ru-card"><Scale size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Рынок и плечо</h3><p className="ru-muted">Плечо до 100 и покупательная способность до 5 000 000 ₽ описаны как пример. Запросите перечень инструментов, комиссии, ограничения риска и момент принудительного закрытия.</p><SourceLink href={KAS_HOME}>Официальное описание</SourceLink></article>
            <article className="ru-card"><FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Выплаты по понедельникам</h3><p className="ru-muted">Дата выплаты зависит от времени подачи заявки: на странице указаны пятничный срез и следующий понедельник. Сохраните действующий регламент и подтверждение заявки.</p><SourceLink href={KAS_HOME}>FAQ о выплатах</SourceLink></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Нет локальной партнёрской программы</h3><p className="ru-muted">Публичная комиссия KasCapital в источнике не указана. Мы не превращаем локальный обзор в неподтверждённую реферальную рекламу.</p><SourceLink href={KAS_HOME}>Проверить условия</SourceLink></article>
          </div>
          <div className="ru-notice" data-russian-local-affiliate="not-found"><strong>KasCapital не активирован как локальный партнёр.</strong> Глобальные кнопки ниже отделены от этого исследования и ведут к продуктам с собственными источниками условий.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-kascapital-due-diligence="terms-gap">
          <h2>Что пока нельзя вывести из публичной витрины</h2>
          <ol>
            <li><strong>Брокер и инструменты:</strong> пример относится к акциям и покупательной способности, но точный список рынков, комиссий и технических ограничений нужно получить в регламенте.</li>
            <li><strong>Документы:</strong> ссылки «Регламент» и «Условия выплат» в подвале ведут на FAQ той же страницы, а единственная публичная <SourceLink href={KAS_OFFER}>оферта</SourceLink> продаёт доступ к информационным материалам за 12 990 ₽ и не описывает торговую программу (по данным на {KAS_RECHECK}).</li>
            <li><strong>Критерии уровня:</strong> формулировки «до 95%» и «максимум 20%» компании не объясняют, какой грейд, оборот, срок активности или риск-лимит нужен именно вам.</li>
            <li><strong>Выплата:</strong> пятничный срез и понедельник задают календарь обработки, но не заменяют подтверждение документов, налогового статуса и фактической комиссии.</li>
            <li><strong>Резидентство:</strong> русский сайт не подтверждает доступность для каждой страны; KYC и договор нужно согласовать до регистрации.</li>
          </ol>
          <div className="ru-notice"><strong>Редакционный вывод:</strong> 500 ₽ бонуса, плечо ×100, доля «до 95%» и «максимум 20%» компании — заявления оператора; они не являются независимой историей выплат или гарантией результата.</div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-kascapital-analysis="maximum-versus-rule">
          <h2>Как читать максимум 95% и пример ×100</h2>
          <p>На главной рядом стоят «до 95%» трейдеру и «Компания получает максимум 20% прибыли» (по данным на {KAS_RECHECK}). Ни одна из формулировок не означает, что каждый уровень, инструмент и выплата рассчитываются по одной формуле. До регистрации запросите таблицу грейдов: какой результат переводит трейдера на следующий уровень, какие комиссии удерживаются и что происходит при нарушении лимита.</p>
          <div className="ru-grid">
            <article className="ru-card">
              <Calculator size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Покупательная способность</h3>
              <p className="ru-muted">В примере оператора 50 000 ₽ и плечо ×100 дают до 5 000 000 ₽ покупательной способности. Это арифметика рекламного сценария, а не доступный лимит для каждого счёта и не прогноз результата.</p>
              <SourceLink href={KAS_HOME}>Пример на официальной странице</SourceLink>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Диапазон заявки</h3>
              <p className="ru-muted">Публичное описание называет заявки от 10 000 до 2 000 000 ₽ и обработку по понедельникам. Уточните пятничный срез, время отсечения, комиссию и документы, иначе календарный день нельзя считать обещанием получения денег.</p>
              <SourceLink href={KAS_HOME}>Условия выплат</SourceLink>
            </article>
            <article className="ru-card">
              <FileCheck2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Бонус 500 ₽</h3>
              <p className="ru-muted">Регистрационный бонус не заменяет оферту и регламент. Проверьте, является ли 500 ₽ частью стартового условия, какие действия нужны для его получения и может ли оператор изменить предложение.</p>
              <SourceLink href={KAS_HOME}>Описание старта</SourceLink>
            </article>
          </div>
          <h3>Минимальный пакет перед передачей документов</h3>
          <ol>
            <li>Действующая оферта с юридическим лицом, датой и порядком присоединения.</li>
            <li>Полный регламент: инструменты, плечо, лимиты риска, грейды и причины закрытия.</li>
            <li>Формула расчёта доли до 95% с примером для выбранного уровня, а не только верхний процент.</li>
            <li>Порядок заявки после пятничного среза, сроки понедельника и удержания провайдера.</li>
            <li>Правила KYC, резидентства, налоговых документов и изменения условий после регистрации.</li>
          </ol>
          <p className="ru-source-line">Пока эти документы не сопоставлены, KasCapital остаётся исследованием опубликованных заявлений, а не рекомендацией или подтверждением выплаты.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-local-global-funnel="kascapital">
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="kascapital-global-options"><strong>BrightFunded — основной глобальный маршрут для резидентов России; FundedNext резидентам РФ недоступна и показана только для трейдеров из других стран.</strong> Это коммерчески выделенная пара для отдельного сравнения, а не оценка KasCapital в глобальном рейтинге. Рублёвая локальная модель и CFD-челлендж не взаимозаменяемы; перед оплатой откройте действующие правила выбранной фирмы. Комиссия возможна после регистрации, но страну, KYC и выплаты нужно проверять на сайте выбранной фирмы.</div>
          <h2>Глобальные альтернативы для русскоязычных трейдеров</h2>
          <div className="ru-grid">
            {globalCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-local-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3>{russiaStatusFor(item.slug) === 'restricted' ? <RuAccessBadgeView firm={item.slug} status="restricted" hint={false} /> : <span className="ru-score">Главный партнёр</span>}</div>
                {russiaStatusFor(item.slug) === 'restricted' && <p className="ru-source-line" data-russian-restricted-partner-note={item.slug}><strong>Резидентам России недоступна.</strong> Карточка — для русскоязычных трейдеров из других стран.</p>}
                <p className="ru-muted">{item.products.length > 0 ? `${item.products.length} свежих продуктов` : 'Свежий продуктовый захват временно отсутствует'}; сопоставьте конкретный продукт, KYC, первую выплату и метод вывода.</p>
                <div className="ru-actions"><Link href={item.reviewHref} className="btn-outline">Открыть обзор</Link><RuGoLink firm={item.slug} href={`/go/${item.slug}?from=ru-kascapital-global-${item.slug}`} rel="sponsored nofollow noopener" className={russiaStatusFor(item.slug) === 'restricted' ? 'btn-outline' : 'btn-primary'}>Проверить условия <ArrowRight size={14} aria-hidden="true" /></RuGoLink></div>
              </article>
            ))}
          </div>
          <p className="ru-source-line">Другие локальные исследования: <Link href="/ru/dlya-russkoyazychnykh-treyderov#rossiyskie">шесть российских моделей</Link>; глобальное сравнение: <Link href="/ru/fundednext-vs-bright-funded">BrightFunded и FundedNext</Link> (FundedNext недоступна для РФ); отдельные локальные обзоры: <Link href="/ru/obzor-eratrade">Era Trade</Link> и <Link href="/ru/obzor-teamtraders">TeamTraders</Link>.</p>
        </div>
      </section>

      <section className="ru-section" data-russian-local-faq-status={faqSourcesCurrent ? 'dated' : 'recapture-required'}><div className="ru-shell ru-content"><h2>Частые вопросы</h2>{!faqSourcesCurrent && <p className="ru-muted">Источники ответов включают общий снимок рынка от {marketEvidence.capturedAt} и отдельные проверки KasCapital. Как минимум один источник требует повторной проверки; ответы ниже — датированный разбор, а не подтверждение действующего порядка выплат.</p>}<RussianFaq items={faqs} /></div></section>
      <RuRelatedBlock path={PATH} />
    </>
  )
}
