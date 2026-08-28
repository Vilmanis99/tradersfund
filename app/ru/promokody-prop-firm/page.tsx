import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  CalendarCheck,
  Calculator,
  ClipboardCheck,
  ExternalLink,
  Globe2,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import CopyableCodePill from '@/components/CopyableCodePill'
import marketEvidence from '@/content/data/russian-market-evidence.json'
import {
  getAllChallenges,
  getAllFirms,
  isChallengeFresh,
  type Challenge,
  type ChallengeAccountSize,
} from '@/lib/firms'
import { getAllDeals, rankDeals, type Deal } from '@/lib/deals'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

export const revalidate = 86400

const PATH = '/ru/promokody-prop-firm'
const TITLE = 'Промокоды проп-фирм 2026: FundedNext и Bright'
const DESCRIPTION = 'Проверенные промокоды FundedNext, Bright Funded и FundingPips: условия, цены после скидки, дата источника и безопасная проверка перед оплатой.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'промокоды проп фирм',
    'FundedNext промокод',
    'FundedNext promo code',
    'Bright Funded промокод',
    'FundingPips промокод',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Какой промокод FundedNext действует сейчас?',
    a: 'FundedNext не публикует общий код для немедленного копирования в проверенном нами источнике. Новый пользователь должен пройти Free Trial: получить 5% прибыли минимум за 3 торговых дня в пределах 14-дневного окна. После достижения цели фирма создаёт персональный код на скидку 5%; он действует 14 дней, применяется к CFD-планам и не действует на resets.',
  },
  {
    q: 'Можно ли просто скопировать промокод Bright Funded?',
    a: 'Да, официальный раздел Trading Updates публикует 3 отдельных кода: SUMMER30 даёт 30% на 1-Step, SUMMER25 — 25% на 2-Step Bright, SUMMER15 — 15% на 2-Step Classic. Код нужно сопоставить с точным продуктом и подтвердить уменьшение суммы до оплаты.',
  },
  {
    q: 'Как работает промокод FundingPips HELLO?',
    a: 'Официальная инструкция FundingPips указывает HELLO для скидки 20% на первую покупку. Код вводится до платежа и не применяется к счетам $100K. Повторная покупка, ввод после оплаты или исключённый размер не соответствуют опубликованным условиям.',
  },
  {
    q: 'Почему цена после скидки может отличаться от таблицы?',
    a: 'Таблица умножает опубликованную листинговую цену на 1 минус процент скидки и сохраняет исходную валюту USD или EUR. Итог checkout может включать выбранную платформу, swap-free опцию, add-ons, налог или комиссию платёжного провайдера; решающей является сумма до подтверждения платежа.',
  },
  {
    q: 'Гарантирует ли партнёрская ссылка скидку?',
    a: 'Нет. Партнёрская ссылка измеряет переход и может принести Traders Fund Hub комиссию, но скидку создаёт только действующий механизм фирмы: код на checkout, ссылка или персональный купон. Если итоговая сумма не изменилась, оплачивать по расчёту нашей таблицы нельзя.',
  },
  {
    q: 'Доступны ли эти предложения русскоязычным трейдерам за рубежом?',
    a: 'Русский язык сам по себе не ограничивает доступ. Фирма проверяет фактические гражданство, резидентство, возраст, адрес, KYC, платёжный метод и страну выплаты. Русскоязычный трейдер в Казахстане, Германии или Канаде должен проверять собственный профиль, а не ориентироваться на язык страницы.',
  },
  {
    q: 'Можно ли использовать VPN, если страна ограничена?',
    a: 'Нет. VPN не меняет гражданство, резидентство, KYC-документы или платёжный профиль. Несовпадение данных может привести к отказу в аккаунте или выплате, поэтому доступ проверяется до покупки и повторно перед funded-account contract.',
  },
  {
    q: 'Почему старые промокоды исчезают со страницы?',
    a: 'getAllDeals() скрывает предложение, если дата проверки старше 30 дней, находится в будущем или expiresOn уже прошла. Такая fail-closed модель уменьшает число карточек, но не позволяет сезонному коду оставаться «актуальным» только потому, что он встречается на сторонних сайтах.',
  },
]

const reviewRoutes: Record<string, string> = {
  fundednext: '/ru/obzor-fundednext',
  'bright-funded': '/ru/obzor-bright-funded',
  fundingpips: '/ru/obzor-fundingpips',
}

const brightDealCodes: Record<string, string> = {
  'bright-funded-1-step': 'SUMMER30',
  'bright-funded-2-step-bright': 'SUMMER25',
  'bright-funded-2-step-classic': 'SUMMER15',
}

function mechanismLabel(mechanism: Deal['mechanism']) {
  return ({
    'checkout-code': 'Публичный код на checkout',
    'link-applied': 'Скидка применяется по ссылке',
    'earned-coupon': 'Персональный купон после условия',
  } as Record<Deal['mechanism'], string>)[mechanism]
}

function offerAction(deal: Deal) {
  if (deal.mechanism === 'earned-coupon') return 'Начать Free Trial'
  if (deal.mechanism === 'link-applied') return 'Открыть предложение'
  return `Проверить ${deal.code ?? 'код'}`
}

function campaignFor(deal: Deal) {
  return `ru-deals-${deal.firmSlug}-${deal.code?.toLowerCase() ?? deal.mechanism}`
}

function productCurrency(product: Challenge): 'USD' | 'EUR' {
  return product.accountSizes.some(tier => tier.priceUsd != null) ? 'USD' : 'EUR'
}

function tierPrice(product: Challenge, tier: ChallengeAccountSize) {
  return productCurrency(product) === 'USD' ? tier.priceUsd : tier.priceEur
}

function money(value: number | null | undefined, currency: 'USD' | 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'USD' ? '$' : '€'
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

function accountSize(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `$${value / 1000}K`
  return `$${value.toLocaleString('en-US')}`
}

function afterDiscount(value: number, pct: number) {
  return Math.round(value * (1 - pct / 100) * 100) / 100
}

function savedAmount(value: number, pct: number) {
  return Math.round(value * (pct / 100) * 100) / 100
}

function pricedTiers(product: Challenge) {
  return product.accountSizes.filter(tier => {
    const value = tierPrice(product, tier)
    return value != null && value > 0
  })
}

export default function RussianPropFirmOffersPage() {
  const firms = getAllFirms()
  const rankedDeals = rankDeals(getAllDeals(), firms)
  const primaryDeals = ['fundednext', 'bright-funded'].flatMap(slug => rankedDeals.filter(deal => deal.firmSlug === slug))
  const secondaryDeals = rankedDeals.filter(deal => !['fundednext', 'bright-funded'].includes(deal.firmSlug))
  const deals = [...primaryDeals, ...secondaryDeals]
  const firmBySlug = new Map(firms.map(firm => [outboundSlug(firm.name), firm]))
  const currentProducts = getAllChallenges().filter(product =>
    ['fundednext', 'bright-funded', 'fundingpips'].includes(product.firmSlug) && isChallengeFresh(product),
  )
  const fundedNextProducts = currentProducts.filter(product => product.firmSlug === 'fundednext')
  const brightProducts = currentProducts.filter(product => product.firmSlug === 'bright-funded')
  const fundingPipsProducts = currentProducts.filter(product => product.firmSlug === 'fundingpips')
  const fundedNextDeal = deals.find(deal => deal.firmSlug === 'fundednext')
  const brightDeals = deals.filter(deal => deal.firmSlug === 'bright-funded')
  const fundingPipsDeal = deals.find(deal => deal.firmSlug === 'fundingpips')
  const latestVerified = deals.map(deal => deal.verifiedOn).sort().at(-1) ?? 'нет данных'
  const codeCount = deals.filter(deal => deal.mechanism === 'checkout-code').length
  const primaryPriceCount = [...fundedNextProducts, ...brightProducts].reduce((sum, product) => sum + pricedTiers(product).length, 0)
  const fundedNextExamples = fundedNextProducts.flatMap(product => {
    const tiers = pricedTiers(product)
    const selectedSizes = new Set([tiers[0]?.sizeUsd, tiers.at(-1)?.sizeUsd])
    return tiers.filter(tier => selectedSizes.has(tier.sizeUsd)).map(tier => ({ product, tier }))
  })
  const brightRows = brightProducts.flatMap(product => {
    const deal = brightDeals.find(candidate => candidate.code === brightDealCodes[product.productSlug])
    return deal ? pricedTiers(product).map(tier => ({ product, tier, deal })) : []
  })
  const fundingPipsExamples = fundingPipsProducts.flatMap(product => pricedTiers(product)
    .filter(tier => [5000, 50000].includes(tier.sizeUsd))
    .map(tier => ({ product, tier })))
  const autocomplete = new Map(marketEvidence.searchDemand.autocompleteSignals.map(item => [item.seed, item]))
  const genericPromoSearch = autocomplete.get('промокоды проп фирм')
  const fundedNextRussianSearch = autocomplete.get('fundednext промокод')
  const fundedNextEnglishSearch = autocomplete.get('fundednext promo code')
  const brightRussianSearch = autocomplete.get('bright funded промокод')
  const fundingPipsRussianSearch = autocomplete.get('fundingpips промокод')

  const crumbs = breadcrumbSchema([
    { name: 'Traders Fund Hub', url: '/' },
    { name: 'Русская версия', url: '/ru' },
    { name: 'Промокоды проп-фирм' },
  ])
  const faq = faqPageSchema(faqs)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    numberOfItems: deals.length,
    itemListElement: deals.map((deal, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Offer',
        name: `${firmBySlug.get(deal.firmSlug)?.name ?? deal.firmSlug}: ${deal.amountLabel}`,
        url: `https://tradersfundhub.com${PATH}#${deal.firmSlug}-${deal.code ?? deal.mechanism}`,
      },
    })),
  }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
    inLanguage: 'ru',
    dateModified: latestVerified,
    author: { '@type': 'Person', name: 'Edris Derakhshi', url: 'https://tradersfundhub.com/authors/edris-derakhshi' },
    publisher: { '@type': 'Organization', name: 'Traders Fund Hub', url: 'https://tradersfundhub.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div
          className="ru-shell"
          data-russian-deals="verified-offers"
          data-russian-deals-guide="long-form-verified-offers"
          data-russian-deal-count={deals.length}
          data-russian-offer-freshness="30-days"
          data-russian-deals-featured-partners="fundednext-bright-funded"
        >
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Промокоды</div>
          <div className="ru-eyebrow"><BadgePercent size={14} aria-hidden="true" /> 5 предложений · 3 первичных источника</div>
          <h1>Промокоды проп-фирм: FundedNext, Bright Funded и реальные скидки</h1>
          <p className="ru-lead">
            На {latestVerified} мы подтверждаем {deals.length} предложений: {codeCount} публичных кода и 1 персональный купон.
            FundedNext и Bright Funded стоят первыми как главные партнёрские маршруты русской версии, но их механика различается:
            у FundedNext скидку 5% нужно заработать, а 3 кода Bright Funded вводятся на checkout.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{deals.length}</strong><span>свежих предложений</span></div>
            <div className="ru-stat"><strong>{codeCount}</strong><span>публичных кодов</span></div>
            <div className="ru-stat"><strong>{primaryPriceCount}</strong><span>цен FundedNext и Bright</span></div>
            <div className="ru-stat"><strong>30 дней</strong><span>максимальный возраст проверки</span></div>
          </div>
          <div className="ru-actions">
            <Link href="#fundednext-promokod" className="btn-primary btn-glow">Как получить 5% FundedNext <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="#bright-funded-promokody" className="btn-outline">Коды Bright Funded</Link>
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сравнить 2 фирмы</Link>
          </div>
        </div>
      </section>

      <article className="ru-review-article" data-russian-deals-article="checkout-intent-source-gated">
        <section className="ru-section ru-review-opening">
          <div className="ru-shell" data-russian-affiliate-disclosure="deals">
            <div className="ru-notice" data-russian-country-boundary="deals-not-access">
              <strong>Промокод не подтверждает доступность страны.</strong>{' '}
              Русскоязычному трейдеру нужно отдельно проверить фактические гражданство, резидентство, возраст, KYC,
              платёжный метод, продукт и способ выплаты. VPN или неверные данные не превращают запрещённый профиль в разрешённый.
            </div>
            <div className="ru-notice ru-disclosure">
              <strong>Партнёрское раскрытие.</strong>{' '}
              Переходы на FundedNext, Bright Funded и FundingPips могут принести нам комиссию после покупки.
              Коммерческое выделение не меняет процент, цену в таблице или 30-дневное правило свежести; финальный checkout фирмы имеет приоритет.
            </div>
            <h2>Короткий ответ: 4 кода можно скопировать, 1 нужно заработать</h2>
            <p>
              В текущем наборе Bright Funded публикует 3 строки — SUMMER30, SUMMER25 и SUMMER15 — для 3 разных программ.
              FundingPips публикует HELLO для первой покупки со скидкой 20%, кроме размера $100K. У FundedNext нет подтверждённого нами
              общего «FundedNext промокода»: новый пользователь сначала достигает цели Free Trial 5%, затем получает персональный купон 5% на 14 дней.
            </p>
            <div className="ru-table-wrap" data-russian-deals-mechanisms="checkout-link-earned">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Механизм</th><th>Размер</th><th>Главное ограничение</th><th>Действие</th></tr></thead>
                <tbody>
                  <tr><td><strong>FundedNext</strong></td><td>Заработанный персональный купон</td><td>5%</td><td>Новый пользователь, Free Trial, CFD-планы, 14 дней</td><td><Link href="#fundednext-promokod">Проверить 4 шага</Link></td></tr>
                  <tr><td><strong>Bright Funded</strong></td><td>3 публичных checkout-кода</td><td>15%–30%</td><td>Каждый код относится к своему продукту</td><td><Link href="#bright-funded-promokody">Сравнить 18 цен</Link></td></tr>
                  <tr><td><strong>FundingPips</strong></td><td>Публичный checkout-код</td><td>20%</td><td>Первая покупка, без $100K</td><td><Link href="#fundingpips-promokod">Проверить HELLO</Link></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="fundednext-promokod">
          <div className="ru-shell" data-russian-deals-featured-partner="fundednext" data-russian-deals-fundednext="earned-not-public">
            <div className="ru-eyebrow"><ShieldCheck size={14} aria-hidden="true" /> Главный партнёр · условный купон</div>
            <h2>FundedNext промокод: почему публичной строки нет</h2>
            <p>
              Официальные Free Trial Rules от 8 апреля 2026 года описывают не публичный код, а последовательность из 4 проверяемых шагов.
              На пробном счёте нужно получить 5% прибыли минимум за 3 торговых дня; 14-дневный отсчёт начинается с первой сделки.
              Лимиты Free Trial составляют 5% за день и 10% максимально, Expert Advisors запрещены, одновременно разрешено до 30 открытых позиций.
            </p>
            <ol>
              <li><strong>Открыть 1 активный Free Trial.</strong> Фирма связывает его с одним email и IP; после отключения можно запросить следующий пробный счёт.</li>
              <li><strong>Достичь цели 5%.</strong> Требуется минимум 3 торговых дня внутри 14 календарных дней от первой сделки; reset для этого предложения не предусмотрен.</li>
              <li><strong>Получить код от FundedNext.</strong> После цели персональная строка автоматически приходит на зарегистрированный email и появляется в разделе My Offers.</li>
              <li><strong>Использовать код за 14 дней.</strong> Купон даёт 5% на CFD-планы только новому пользователю и не применяется к resets.</li>
            </ol>
            <p className="ru-source-line">
              <CalendarCheck size={14} aria-hidden="true" /> Проверено {fundedNextDeal?.verifiedOn ?? '—'} ·{' '}
              <a href={fundedNextDeal?.sourceUrl ?? 'https://help.fundednext.com/en/articles/8902893-fundednext-free-trial-rules'} target="_blank" rel="noopener noreferrer">
                FundedNext Free Trial Rules
              </a>
            </p>
            <div className="ru-actions">
              <Link href="/go/fundednext?from=ru-deals-fundednext-earned-coupon" rel="sponsored nofollow noopener" className="btn-primary">
                Начать Free Trial FundedNext <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/ru/obzor-fundednext" className="btn-outline">Русский обзор FundedNext</Link>
            </div>

            <h3>Что даст 5% на опубликованных ценах</h3>
            <p>
              Ниже 8 контрольных примеров из {fundedNextProducts.length} CFD-продуктов и 22 текущих USD-цен.
              Это расчёт после получения персонального купона, а не обещание скидки при первом открытии checkout.
              Платформа, swap-free опция и дополнительные услуги в формулу не включены.
            </p>
            <div className="ru-table-wrap" data-russian-deals-discount-table="currency-preserved">
              <table className="ru-table">
                <thead><tr><th>Продукт</th><th>Счёт</th><th>Листинг</th><th>После 5%</th><th>Экономия</th></tr></thead>
                <tbody>
                  {fundedNextExamples.map(({ product, tier }) => {
                    const price = tierPrice(product, tier)
                    if (price == null) return null
                    return (
                      <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                        <td>{product.productName}</td>
                        <td>{accountSize(tier.sizeUsd)}</td>
                        <td>{money(price, 'USD')}</td>
                        <td><strong>{money(afterDiscount(price, 5), 'USD')}</strong></td>
                        <td>{money(savedAmount(price, 5), 'USD')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ru-section" id="bright-funded-promokody">
          <div className="ru-shell" data-russian-deals-featured-partner="bright-funded" data-russian-deals-bright="three-product-codes">
            <div className="ru-eyebrow"><BadgePercent size={14} aria-hidden="true" /> Главный партнёр · 3 публичных кода</div>
            <h2>Bright Funded промокоды: SUMMER30, SUMMER25 и SUMMER15</h2>
            <p>
              Bright Funded разделяет скидку по 3 продуктам: SUMMER30 уменьшает цену 1-Step на 30%, SUMMER25 — 2-Step Bright на 25%,
              SUMMER15 — 2-Step Classic на 15%. Один код нельзя автоматически переносить на другую программу.
              Официальный Trading Updates показывает сезонную акцию без отдельной даты окончания, поэтому наша карточка исчезает через 30 дней без новой проверки.
            </p>
            <div className="ru-grid">
              {brightDeals.map(deal => (
                <article className="ru-card" key={deal.code} id={`${deal.firmSlug}-${deal.code}`} data-russian-deal-firm={deal.firmSlug}>
                  <div className="ru-card-head"><h3>{deal.scope}</h3><span className="ru-score">{deal.amountLabel}</span></div>
                  {deal.code && deal.pct != null && <div style={{ display: 'flex', marginBottom: '0.7rem' }}><CopyableCodePill code={deal.code} pct={deal.pct} locale="ru" /></div>}
                  <p>{deal.note}</p>
                  <p className="ru-source-line"><CalendarCheck size={14} aria-hidden="true" /> Проверено {deal.verifiedOn} · <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">{deal.sourceLabel}</a></p>
                  <div className="ru-actions">
                    <Link href={`/go/${deal.firmSlug}?from=${campaignFor(deal)}`} rel="sponsored nofollow noopener" className="btn-primary">
                      {offerAction(deal)} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <h3>Все 18 цены Bright Funded после своего кода</h3>
            <p>
              Таблица сохраняет EUR, потому что конвертация в рубли, доллары или тенге быстро устаревает и скрывает FX-комиссию.
              «После кода» — арифметика от текущей листинговой цены без add-ons, налога и комиссии платёжного провайдера; оплачивать нужно только сумму, показанную самой фирмой.
            </p>
            <div className="ru-table-wrap" data-russian-deals-bright-price-rows={brightRows.length}>
              <table className="ru-table">
                <thead><tr><th>Программа</th><th>Код</th><th>Счёт</th><th>Листинг</th><th>После кода</th><th>Экономия</th></tr></thead>
                <tbody>
                  {brightRows.map(({ product, tier, deal }) => {
                    const price = tierPrice(product, tier)
                    if (price == null || deal.pct == null) return null
                    return (
                      <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                        <td>{product.productName.replace('Bright Funded ', '')}</td>
                        <td><strong>{deal.code}</strong> · {deal.pct}%</td>
                        <td>{accountSize(tier.sizeUsd)}</td>
                        <td>{money(price, 'EUR')}</td>
                        <td><strong>{money(afterDiscount(price, deal.pct), 'EUR')}</strong></td>
                        <td>{money(savedAmount(price, deal.pct), 'EUR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="ru-actions">
              <Link href="/ru/obzor-bright-funded" className="btn-outline">Русский обзор Bright Funded</Link>
              <Link href="/ru/fundednext-vs-bright-funded" className="btn-primary">FundedNext или Bright Funded <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="fundingpips-promokod">
          <div className="ru-shell" data-russian-deals-secondary="fundingpips">
            <div className="ru-eyebrow"><ShoppingCart size={14} aria-hidden="true" /> Дополнительный партнёрский маршрут</div>
            <h2>FundingPips промокод HELLO: 20% на первую покупку</h2>
            <p>
              FundingPips публикует HELLO в официальной инструкции Get Started. Строка вводится до завершения платежа, применяется только к первой покупке
              и исключает размер $100K. Если пользователь уже оплатил первый план или выбрал $100K, опубликованное условие не подтверждает скидку.
            </p>
            {fundingPipsDeal?.code && fundingPipsDeal.pct != null && (
              <div style={{ display: 'flex', marginBottom: '0.9rem' }}>
                <CopyableCodePill code={fundingPipsDeal.code} pct={fundingPipsDeal.pct} locale="ru" />
              </div>
            )}
            <p className="ru-source-line">
              <CalendarCheck size={14} aria-hidden="true" /> Проверено {fundingPipsDeal?.verifiedOn ?? '—'} ·{' '}
              <a href={fundingPipsDeal?.sourceUrl ?? 'https://help.fundingpips.com/hc/en-us/articles/44390730743825-Get-Started'} target="_blank" rel="noopener noreferrer">FundingPips Get Started</a>
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Продукт</th><th>Счёт</th><th>Листинг</th><th>После HELLO</th><th>Экономия</th></tr></thead>
                <tbody>
                  {fundingPipsExamples.map(({ product, tier }) => {
                    const price = tierPrice(product, tier)
                    if (price == null) return null
                    return (
                      <tr key={`${product.productSlug}-${tier.sizeUsd}`}>
                        <td>{product.productName}</td>
                        <td>{accountSize(tier.sizeUsd)}</td>
                        <td>{money(price, 'USD')}</td>
                        <td><strong>{money(afterDiscount(price, 20), 'USD')}</strong></td>
                        <td>{money(savedAmount(price, 20), 'USD')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-muted">Показаны $5K и $50K как 2 контрольных размера каждого продукта. $100K намеренно отсутствует: официальный источник исключает его из предложения HELLO.</p>
            <div className="ru-actions">
              <Link href="/go/fundingpips?from=ru-deals-fundingpips-hello" rel="sponsored nofollow noopener" className="btn-primary">Проверить HELLO на FundingPips <ArrowRight size={14} aria-hidden="true" /></Link>
              <Link href="/ru/obzor-fundingpips" className="btn-outline">Русский обзор FundingPips</Link>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" data-russian-deals-decision="product-before-discount">
            <h2>Скидка не исправляет неподходящий продукт</h2>
            <p>
              Код меняет цену входа, но не меняет 4 главных ограничения: число evaluation phases, тип drawdown, путь к первой выплате и KYC.
              Например, скидка 30% на Bright Funded 1-Step не превращает его 6% real-time trailing maximum drawdown в статический лимит;
              купон 5% FundedNext не делает Stellar Instant refundable; HELLO не отменяет продуктовые правила FundingPips.
            </p>
            <div className="ru-grid">
              <article className="ru-card"><Calculator size={22} color="var(--accent-light)" aria-hidden="true" /><h3>1. Выбрать правило</h3><p>Сопоставьте phases, daily loss, maximum loss и payout gate до сравнения процентов. <Link href="/ru/fundednext-vs-bright-funded">Таблица 7 продуктов</Link> показывает эти различия.</p></article>
              <article className="ru-card"><Globe2 size={22} color="var(--accent-light)" aria-hidden="true" /><h3>2. Проверить профиль</h3><p>Страна, гражданство, резидентство и KYC проверяются по реальным данным. <Link href="/ru/dlya-russkoyazychnykh-treyderov">Маршрут для диаспоры</Link> отделяет язык от доступа.</p></article>
              <article className="ru-card"><BadgePercent size={22} color="var(--accent-light)" aria-hidden="true" /><h3>3. Применить механизм</h3><p>Введите точный код для продукта или выполните условие Free Trial. Процент без изменения checkout total равен 0 фактической экономии.</p></article>
              <article className="ru-card"><ClipboardCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>4. Сохранить доказательство</h3><p>Перед оплатой сохраните название плана, размер, валюту, код и финальную сумму. Эти 5 полей помогают разобрать спор по заказу.</p></article>
            </div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" data-russian-deals-checkout="final-total-controls">
            <h2>Проверка checkout за 60 секунд</h2>
            <ol>
              <li><strong>Совпадает продукт:</strong> 1-Step, 2-Step Bright и 2-Step Classic используют 3 разных кода Bright Funded.</li>
              <li><strong>Совпадает покупатель:</strong> HELLO требует первую покупку, а FundedNext 5% — нового пользователя, который выполнил Free Trial.</li>
              <li><strong>Совпадает размер:</strong> FundingPips исключает $100K; ограничения других предложений читаются на первичном источнике.</li>
              <li><strong>Совпадает валюта:</strong> FundedNext и FundingPips публикуют USD, Bright Funded — EUR; банк может добавить собственный FX.</li>
              <li><strong>Изменился total:</strong> скидка должна быть видна до платежа. Скриншот кода без изменённой суммы не подтверждает её применение.</li>
              <li><strong>Сохранён заказ:</strong> зафиксируйте дату, email, продукт, цену и order ID до первой сделки.</li>
            </ol>
            <div className="ru-notice"><strong>Стоп-сигнал:</strong> если checkout не принимает код, показывает другой продукт или возвращает полную цену, не завершайте платёж только потому, что сторонний сайт обещал скидку.</div>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" data-russian-deals-search="brand-signal-generic-gap">
            <h2>Какие формулировки реально появляются в поиске</h2>
            <p>
              Снимок Google Autocomplete от 27 августа 2026 года вернул {fundedNextRussianSearch?.suggestions.length ?? 0} подсказки для «fundednext промокод»
              и {fundedNextEnglishSearch?.suggestions.length ?? 0} для «fundednext promo code». Для «fundingpips промокод» появились
              {` ${fundingPipsRussianSearch?.suggestions.length ?? 0}`} варианта, включая написание «funding pips промокод».
              Для общего «промокоды проп фирм» и «bright funded промокод» подсказок не было.
            </p>
            <p>
              Ноль подсказок не означает нулевой спрос, а 10 подсказок не являются месячной частотностью. Поэтому мы создаём 1 глубокую страницу с отдельными секциями,
              а не набор тонких doorway-страниц под каждую перестановку слов. Русский запрос FundedNext ведёт к честному ответу «earned coupon, не публичный код»;
              отсутствие Bright-подсказки не скрывает 3 официально опубликованных кодов.
            </p>
            <ul className="ru-facts">
              <li><SearchCheck size={14} aria-hidden="true" /> «fundednext промокод»: {fundedNextRussianSearch?.suggestions.join(' · ') || 'подсказок нет'}</li>
              <li><SearchCheck size={14} aria-hidden="true" /> «fundingpips промокод»: {fundingPipsRussianSearch?.suggestions.join(' · ') || 'подсказок нет'}</li>
              <li><SearchCheck size={14} aria-hidden="true" /> «промокоды проп фирм»: {genericPromoSearch?.suggestions.length ? genericPromoSearch.suggestions.join(' · ') : 'подсказок не возвращено'}</li>
              <li><SearchCheck size={14} aria-hidden="true" /> «bright funded промокод»: {brightRussianSearch?.suggestions.length ? brightRussianSearch.suggestions.join(' · ') : 'подсказок не возвращено'}</li>
            </ul>
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell" data-russian-deals-diaspora="language-not-residency">
            <h2>Русскоязычный читатель — не обязательно резидент России</h2>
            <p>
              Эта страница написана для русскоязычных трейдеров по всему миру. Резидент Казахстана, Латвии, Германии, Израиля, Канады или ОАЭ
              вводит один и тот же код, но проходит разные country, KYC, payment и payout проверки. Нельзя переносить результат одного профиля на другого только из-за общего языка.
            </p>
            <p>
              Для резидентов России действует ещё более строгая граница: русская локализация не обещает доступ к FundedNext, Bright Funded или FundingPips.
              У FundedNext официальные страницы содержат конфликтующие формулировки по России, поэтому требуется ответ поддержки и успешная проверка реального профиля до оплаты.
              Локальные модели вроде PropLive и Era Trade разбираются отдельно и не получают глобальный промокод по аналогии.
            </p>
            <div className="ru-actions">
              <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-primary">Проверить путь по стране <ArrowRight size={14} aria-hidden="true" /></Link>
              <Link href="/ru/rossiyskie-prop-kompanii" className="btn-outline">Сравнить российские модели</Link>
            </div>
          </div>
        </section>

        <section className="ru-section" id="sources">
          <div className="ru-shell" data-russian-deals-expiry="thirty-day-fail-closed">
            <h2>Журнал 5 предложений и дат проверки</h2>
            <p>
              Каждая строка ниже должна иметь первичный URL фирмы и дату не старше 30 дней. Статус «partner» сообщает о коммерческой связи,
              но не заменяет доказательство скидки. Если источник исчезает или дату нельзя обновить, getAllDeals() убирает предложение со страницы.
            </p>
            <div className="ru-table-wrap">
              <table className="ru-table">
                <thead><tr><th>Фирма</th><th>Предложение</th><th>Механизм</th><th>Проверено</th><th>Первичный источник</th><th>Маршрут</th></tr></thead>
                <tbody>
                  {deals.map(deal => {
                    const firm = firmBySlug.get(deal.firmSlug)
                    if (!firm) return null
                    const isAffiliate = Boolean(firm.affiliateUrl)
                    return (
                      <tr key={`${deal.firmSlug}-${deal.code ?? deal.mechanism}`} data-russian-deal-firm={deal.firmSlug}>
                        <td><strong>{firm.name}</strong></td>
                        <td>{deal.code ? `${deal.code} · ` : ''}{deal.amountLabel}</td>
                        <td>{mechanismLabel(deal.mechanism)}</td>
                        <td>{deal.verifiedOn}</td>
                        <td><a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">{deal.sourceLabel}</a></td>
                        <td>
                          <Link href={reviewRoutes[deal.firmSlug] ?? firm.reviewUrl}>Обзор</Link>{' · '}
                          <Link href={`/go/${deal.firmSlug}?from=${campaignFor(deal)}`} rel={isAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}>{offerAction(deal)}</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {deals.length === 0 && <div className="ru-notice"><strong>Сейчас нет свежих предложений.</strong> Проверьте <Link href="/ru/luchshie-prop-firmy">рейтинг</Link> и продуктовые обзоры — устаревший код не показывается.</div>}
          </div>
        </section>

        <section className="ru-section">
          <div className="ru-shell ru-content">
            <h2>Частые вопросы</h2>
            <RussianFaq items={faqs} />
            <p className="ru-source-line"><ExternalLink size={14} aria-hidden="true" /> Английская пара страницы: <Link href="/prop-firm-discount-codes">Prop Firm Discount Codes</Link>. Русские обзоры: <Link href="/ru/obzor-fundednext">FundedNext</Link>, <Link href="/ru/obzor-bright-funded">Bright Funded</Link> и <Link href="/ru/obzor-fundingpips">FundingPips</Link>.</p>
          </div>
        </section>
      </article>
    </>
  )
}
