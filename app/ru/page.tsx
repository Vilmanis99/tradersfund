import type { Metadata } from 'next'
import RuAllReviews from '@/components/RuAllReviews'
import Link from '@/components/SafeLink'
import { ruClosedFirmsHref } from '@/lib/closedFirms'
import { ArrowRight, Globe2 } from 'lucide-react'
import type { RussianFaqItem } from '@/components/RussianFaq'
import HeroBlock from '@/components/home/HeroBlock'
import TrustBar from '@/components/home/TrustBar'
import ComparisonTable from '@/components/home/ComparisonTable'
import FeaturedOfferCard from '@/components/home/FeaturedOfferCard'
import DisclosureNote from '@/components/home/DisclosureNote'
import ChallengeExplainer from '@/components/home/ChallengeExplainer'
import { getChallengeSectionFacts } from '@/components/home/challengeFacts'
import HomeFaq from '@/components/home/HomeFaq'
import { getHomeComparisonRows, getHomeCounters, getVerifiedCode } from '@/components/home/homeData'
import { RuAccessBadge } from '@/components/RuGoLink'
import RussianFinderEntry from '@/components/RussianFinderEntry'
import brightEvidence from '@/content/data/russian-bright-funded-evidence.json'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import { getRussianFinderRows } from '@/lib/challengeComparisonData'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, ruFaqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates, russianRouteDateModified, russianPublishedHref } from '@/lib/localizedRoutes'
import { RuGoLink } from '@/components/RuGoLink'
import { russiaStatusFor } from '@/lib/russiaAvailability'
import { RUSSIA_STATUS_ORDER } from '@/lib/russianRanking'
import { getChallengeWatchEntries } from '@/lib/challengeWatch'
import { isProductSetFresh } from '@/lib/reviewFreshness'
import { formatRuDate } from '@/lib/ruDate'

const PATH = '/ru'
export const revalidate = 3600

// Basics links switch on as each new RU page's route is registered (lib/localizedRoutes.ts).
const RU_HOME_BASICS = [
  { href: '/ru/prop-trejding', title: 'Что такое проп-трейдинг', text: 'Как работает торговля на капитале фирмы.' },
  { href: '/ru/funded-account', title: 'Funded account', text: 'Что такое финансируемый счёт и как его получить.' },
  { href: '/ru/prop-kompanii-v-rossii', title: 'Проп-компании в России', text: 'Какие фирмы не ограничивают РФ и как платят.' },
  { href: '/ru/prop-kompanii-otzyvy', title: 'Отзывы о проп-компаниях', text: 'Красные флаги и доказательства выплат.' },
  { href: '/ru/obzor-the5ers', title: 'Обзор The5ers', text: 'Условия и доступ для трейдеров из РФ.' },
  { href: '/ru/luchshie-prop-firmy', title: 'Рейтинг проп-компаний', text: 'Сравнение условий и доступ из России.' },
]
// Gated by the closed-firms publish flag (lib/closedFirms.ts), not by route registration.
const RU_HOME_CLOSED_FIRMS = ruClosedFirmsHref()
  ? [{ href: ruClosedFirmsHref() as string, title: 'Какие проп-фирмы закрылись', text: 'Даты, заявления фирм и архивные копии источников.' }]
  : []
const TITLE = 'Проп-фирмы 2026: условия и цены для русскоязычных трейдеров'
const DESCRIPTION = 'Проп-фирмы и проп-компании для русскоязычных трейдеров: цены челленджей, просадка, выплаты и KYC по первичным источникам. Доступ проверяем по стране.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'website', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Что такое онлайн-проп-фирма?',
    a: 'Это компания с программой оценки: трейдер оплачивает доступ к симулированному счёту, выполняет цель по прибыли и соблюдает лимиты риска. После успешной оценки фирма может предложить следующий симулированный или реальный этап и долю вознаграждения по договору.',
  },
  {
    q: 'Означает ли русская версия, что фирма работает с резидентами России?',
    a: 'Нет. Язык страницы не подтверждает доступность страны. Перед оплатой нужно проверить ограничения по гражданству и резидентству, требования к документам, способ оплаты и способ выплаты на официальном сайте конкретной фирмы.',
  },
  {
    q: 'Почему цены указаны в долларах или евро, а не в рублях?',
    a: 'Мы сохраняем валюту, в которой фирма публикует цену. Пересчёт в рубли быстро устаревает из-за курса и может скрыть комиссию банка или платёжного провайдера.',
  },
]

const featuredPartnerRoutes = [
  { slug: 'bright-funded', name: 'BrightFunded', reviewHref: '/ru/obzor-bright-funded', heroHref: '/go/bright-funded?from=ru-home-hero-bright-funded' },
  { slug: 'fundednext', name: 'FundedNext', reviewHref: '/ru/obzor-fundednext', heroHref: '/go/fundednext?from=ru-home-hero-fundednext' },
] as const

export default function RussianHomePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const featuredPartnerCards = featuredPartnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const products = challenges.filter(product => product.firmSlug === route.slug)
    const fresh = isProductSetFresh(products)
    // Use the oldest capture so the date does not overstate freshness across products.
    const captureDate = fresh ? products.map(product => product.sourceCapturedAt).sort()[0] : null
    const countryAccess = marketEvidence.firmAccess.find(item => item.firmSlug === route.slug)
    const countryCapturedAt = route.slug === 'bright-funded'
      ? brightEvidence.sources.countries.sourceCapturedAt
      : countryAccess?.sourceCapturedAt ?? marketEvidence.capturedAt
    const brightTermsCapturedAt = route.slug === 'bright-funded'
      ? brightEvidence.sources.countryTerms.sourceCapturedAt
      : null
    const countryFresh = isChallengeFresh({ sourceCapturedAt: countryCapturedAt })
      && (brightTermsCapturedAt === null || isChallengeFresh({ sourceCapturedAt: brightTermsCapturedAt }))
    return { ...route, firm, fresh, captureDate, countryCapturedAt, brightTermsCapturedAt, countryFresh }
  }).filter(item => item.firm?.affiliateUrl)
    // Russia-open firms first (BrightFunded), restricted (FundedNext) last.
    .sort((a, b) => RUSSIA_STATUS_ORDER[russiaStatusFor(a.slug)] - RUSSIA_STATUS_ORDER[russiaStatusFor(b.slug)])

  const crumbs = breadcrumbSchema([{ name: 'Traders Fund Hub', url: '/' }, { name: 'Русская версия' }])
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: russianRouteDateModified(PATH),
    isPartOf: { '@type': 'WebSite', '@id': 'https://tradersfundhub.com/#website', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  const tableRows = getHomeComparisonRows('ru')
  const counters = getHomeCounters()
  const watchCount = getChallengeWatchEntries().length
  const challengeFacts = getChallengeSectionFacts('ru')
  // Prefer a pair with its own Russian page, then any pair with a page.
  const pairKeys = Object.keys(challengeFacts.picker.pairHrefs)
  const pickerInitial = ((pairKeys.find(key => challengeFacts.picker.pairHrefs[key].startsWith('/ru/')) ?? pairKeys[0])?.split('-vs-')
    ?? challengeFacts.picker.firms.slice(0, 2).map(firm => firm.slug)) as [string, string]
  const money = (row: (typeof tableRows)[number]) => row.priceBreakdown ?? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: row.currency, maximumFractionDigits: 0 }).format(row.price)

  return (
    <div className="th-home ru-home ru-home--product-led" data-russian-home-layout="focused">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ruFaqPageSchema(faqs)) }} />

      <HeroBlock
        id="ru-home-heading"
        eyebrow={<><Globe2 size={14} aria-hidden="true" /> Для русскоязычных трейдеров по всему миру</>}
        title="Проп-фирмы и проп-компании 2026: сравнение условий"
        lead="Стоимость участия, допустимый убыток и правила выплат. У каждой цифры есть дата источника, а отметка показывает статус доступа для резидентов РФ."
        actions={[{ href: '#ru-home-compare', label: 'Сравнить фирмы' }, { href: '/ru/promokody-prop-firm', label: 'Промокоды', variant: 'secondary' }]}
        counters={[
          { value: String(counters.firms), label: 'фирм в базе' },
          { value: String(counters.freshProducts), label: 'программ с актуальными источниками' },
          { value: String(watchCount), label: 'датированных заметок о правилах' },
          { value: counters.latestCheck ? formatRuDate(counters.latestCheck) : '—', label: 'последняя проверка' },
        ]}
        aside={
          <div className="home-finder-panel">
            <span className="ru-home-partner-hero-label">Ваш короткий список начинается здесь</span>
            <h2>Сравните программы</h2>
            <RussianFinderEntry rows={getRussianFinderRows()} />
            <p className="home-finder-note">Размер счёта — не цена покупки. Доступность страны нужно проверить отдельно.</p>
          </div>
        }
      />

      <TrustBar
        label="Почему этому сравнению можно доверять"
        data={{ 'data-russian-country-boundary': 'language-not-access' }}
        items={[
          { label: 'Методика оценки (на английском)', href: '/methodology', hrefLang: 'en' },
          { label: 'У каждой цифры есть дата проверки' },
          { label: 'Место в таблице не продаётся' },
          { label: 'Русский язык ≠ доступ из РФ: Проверить страну и KYC', href: '/ru/dlya-russkoyazychnykh-treyderov', data: { 'data-russian-home-diaspora-entry': 'trust' } },
        ]}
      />

      <section className="th-section" id="ru-home-compare" aria-labelledby="ru-home-compare-heading" data-russian-home-comparison="cheapest-per-firm">
        <div className="th-wrap">
          <div className="th-section__head">
            <div>
              <h2 id="ru-home-compare-heading">Сравнение программ</h2>
              <p>Счёт $50 000 · самая дешёвая программа фирмы с актуальным источником · сначала фирмы, не ограничивающие РФ. Валюты не пересчитываем.</p>
            </div>
            <Link href="/ru/luchshie-prop-firmy" className="th-link">Посмотреть все фирмы <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <ComparisonTable rows={tableRows} locale="ru" placement="ru-home-comparison" />
          <DisclosureNote summary={<>Часть ссылок партнёрские. Порядок — не реклама. Размер счёта — не цена. Доступность для РФ проверяйте перед оплатой.</>}>
            <p>Отметка «Доступ из РФ» основана на официальных списках ограничений и условиях фирм; она не заменяет проверку вашего гражданства, резидентства и способа оплаты. Нужна местная биржевая торговля? <Link href="/ru/dlya-russkoyazychnykh-treyderov#rossiyskie">Российские проп-компании разобраны отдельно.</Link></p>
          </DisclosureNote>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-home-basics="osnovy">
          <h2>Основы</h2>
          <div className="ru-home-guide-list">
            {[...RU_HOME_BASICS.filter(item => russianPublishedHref(item.href)), ...RU_HOME_CLOSED_FIRMS].map(item => (
              <Link key={item.href} href={item.href}><span><strong>{item.title}</strong><span>{item.text}</span></span><ArrowRight size={20} aria-hidden="true" /></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="th-section th-section--alt" aria-labelledby="ru-home-partners-heading">
        <div className="th-wrap" data-russian-home-hero-partners="fundednext-bright-funded">
          <div className="th-section__head">
            <div>
              <h2 id="ru-home-partners-heading">Партнёры сайта</h2>
              <p className="ru-home-partner-hero-disclosure" data-russian-affiliate-disclosure="home-primary-partners">BrightFunded и FundedNext — наши партнёры: переход на сайт фирмы может принести нам комиссию. FundedNext резидентам России недоступна, её карточка — для трейдеров из других стран. Это не добавляет баллы в рейтинге и не означает, что программа подходит каждому.</p>
            </div>
            <Link href="/ru/fundednext-vs-bright-funded" className="th-link ru-home-comparison-link">FundedNext или BrightFunded: сравнить отличия <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <div className="th-offers">
            {featuredPartnerCards.map(item => {
              const cheapest = tableRows.find(row => row.firmSlug === item.slug)
              return (
                <FeaturedOfferCard
                  key={item.slug}
                  locale="ru"
                  firmSlug={item.slug}
                  firmName={item.name}
                  logo={item.firm?.logo}
                  score={item.firm?.score}
                  badge={<RuAccessBadge firm={item.slug} />}
                  title={<h3>{item.name}</h3>}
                  placement="ru-home-hero"
                  logoClassName="ru-home-partner-hero-logo"
                  code={getVerifiedCode(item.slug)}
                  data={{ 'data-russian-home-hero-partner': item.slug }}
                  facts={[
                    ...(cheapest ? [{ label: 'Взнос от ($50k)', value: money(cheapest) }] : []),
                    ...(item.firm?.maxAllocation ? [{ label: 'Макс. капитал', value: item.firm.maxAllocation.split(/[;(]| per /)[0].trim() }] : []),
                  ]}
                  primary={<RuGoLink firm={item.slug} href={item.heroHref} rel="sponsored nofollow noopener" target="_blank" prefetch={false} className="th-btn th-btn--amber ru-home-partner-hero-review">{`Проверить условия ${item.name} ↗`}</RuGoLink>}
                  secondary={<Link href={item.reviewHref} className="th-btn th-btn--ghost">{`Читать обзор ${item.name}`}</Link>}
                >
                  <p>{item.fresh
                    ? item.slug === 'fundednext'
                      ? 'Для трейдеров вне России: программы с оплатой в USD, с оценочными этапами или без челленджа — Stellar Instant. В обзоре разбираем различия в просадке и выплатах.'
                      : 'Программы с оплатой в EUR и одним или двумя оценочными этапами. В обзоре разбираем лимиты убытка и ожидание первой выплаты.'
                    : 'Условия программ требуют повторной проверки. В обзоре объясняем модель работы и вопросы, которые стоит задать фирме перед оплатой.'}</p>
                  <p className="ru-home-partner-country-note" data-russian-partner-country-warning={item.slug} data-russian-partner-country-source-status={item.countryFresh ? 'dated' : 'recapture-required'} data-russian-home-bright-country-conflict={item.slug === 'bright-funded' ? 'help-six-terms-five' : undefined}>
                    {item.slug === 'fundednext'
                      ? item.countryFresh
                        ? `Недоступно для резидентов России: подвал fundednext.com исключает Россию (по данным на 20.10.2026), хотя список в условиях (п. 5.3, CFD) её не называет (проверка от ${formatRuDate(item.countryCapturedAt)}). Резидент РФ рискует отказом в обслуживании или выплате.`
                        : `Недоступно для резидентов России (подвал fundednext.com, по данным на 20.10.2026); страновые условия (проверка от ${formatRuDate(item.countryCapturedAt)}) требуют новой проверки.`
                      : <>
                        <a href={brightEvidence.sources.countries.sourceUrl} target="_blank" rel="nofollow noopener">Справка BrightFunded</a> от {formatRuDate(item.countryCapturedAt)} включает Пакистан;{' '}
                        <a href={brightEvidence.sources.countryTerms.sourceUrl} target="_blank" rel="nofollow noopener">условия</a> от {formatRuDate(item.brightTermsCapturedAt)} его не называют.{' '}
                        {item.countryFresh
                          ? 'Россия не названа в обоих списках, но это не подтверждает доступ вашего профиля. Уточните до оплаты.'
                          : 'Страновые условия требуют повторной проверки; отсутствие России в старых списках не подтверждает доступ сегодня.'}
                      </>}
                  </p>
                  <p className="ru-source-line ru-home-checked">{item.captureDate ? `Источники проверены: ${formatRuDate(item.captureDate)}` : 'Обновление источников ожидается'}</p>
                </FeaturedOfferCard>
              )
            })}
          </div>
        </div>
      </section>

      <div data-russian-home-next-step="reader-decision">
        <ChallengeExplainer
          locale="ru"
          id="ru-home-guides-heading"
          title="С чего начать"
          facts={challengeFacts}
          data={{ 'data-russian-home-navigation': 'task-first' }}
          cards={[
            { href: '/ru/chto-takoe-prop-firma', label: 'Основы', title: 'Как устроен челлендж', cta: 'Понять, как это работает', data: { 'data-russian-home-definition-entry': 'prop-kompanii-eto' } },
            { href: '/ru/luchshie-prop-firmy', label: 'Стоимость', title: 'Взнос — только часть цены', cta: 'Сравнить взносы' },
            { href: '/ru/kak-rabotayut-chellendzhi-prop-firm', label: 'Перед торговлей', title: 'План вокруг правил оценки', cta: 'Разобрать правила' },
          ]}
          pickerFallbackHref="/ru/luchshie-prop-firmy"
          pickerInitial={pickerInitial}
          firmBadge={slug => <RuAccessBadge firm={slug} />}
          country={{ lead: 'Из России?', label: 'Какие фирмы не ограничивают РФ', href: '/ru/dlya-russkoyazychnykh-treyderov', data: { 'data-russian-home-country': 'russia' } }}
          extra={{
            label: 'Ещё по теме:',
            data: { 'data-russian-home-guides': 'selected-three' },
            links: [
              { href: '/ru/prop-firmy-bez-chelendzha', title: 'Начать без челленджа' },
              { href: '/ru/vyplaty-prop-firm', title: 'Когда и как получить выплату' },
              { href: '/ru/promokody-prop-firm', title: 'Как проверить скидку' },
            ],
          }}
        />
      </div>

      <RuAllReviews marker="ru-home" sectionClassName="th-section ru-all-reviews-home" wrapClassName="th-wrap" />

      <HomeFaq id="ru-home-faq-heading" title="Частые вопросы" items={faqs} />
    </div>
  )
}
