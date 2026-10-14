import type { Metadata } from 'next'
import Link from '@/components/SafeLink'
import { ArrowRight, BadgePercent, CalendarCheck, ShieldAlert } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import CopyableCodePill from '@/components/CopyableCodePill'
import { getAllDeals, type Deal } from '@/lib/deals'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'
import { RuGoLink } from '@/components/RuGoLink'
import { goLinkRel } from '@/lib/russiaAvailability'

export const revalidate = 86400

const PATH = '/ru/promokody-prop-firm'
// Обновлять каждый месяц: MONTH_LABEL, MONTH_ISO и проверенные коды в content/data/deals.json.
const MONTH_LABEL = 'октябрь 2026'
const CHECKED = '14.10.2026'
const CHECKED_ISO = '2026-10-14'
const TITLE = 'Промокоды проп-фирм — октябрь 2026: FundedNext, Upscale, BrightFunded'
const DESCRIPTION = 'Промокоды проп-фирм на октябрь 2026: FundedNext, Upscale, BrightFunded и Crypto Fund Trader — для трейдеров из России. Дата проверки у каждого кода, как применить скидку, и почему нет промокода FTMO.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'промокоды проп фирм',
    'промокод fundednext',
    'upscale проп промокод',
    'промокод brightfunded',
    'промокод crypto fund trader',
    'промокод ftmo',
  ],
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article', locale: 'ru_RU' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

type HubFirm = {
  slug: string
  name: string
  review: string | null
  russiaNote: string
  external?: string
}

// Только фирмы, открытые для РФ на 14.10.2026 (ru-availability.csv). Коды подтягиваются из content/data/deals.json;
// пока там нет проверенного кода, карточка показывает плейсхолдер «код ожидается».
const hubFirms: HubFirm[] = [
  { slug: 'fundednext', name: 'FundedNext (CFD)', review: '/ru/obzor-fundednext', russiaNote: 'Россия не в списке ограничений CFD; FundedNext Futures Россию ограничивает.' },
  { slug: 'upscale', name: 'Upscale', review: null, russiaNote: 'Ограничений по странам не заявлено, KYC нет, выплаты в USDT.', external: 'https://upscale.trade/ru/' },
  { slug: 'bright-funded', name: 'BrightFunded', review: '/ru/obzor-bright-funded', russiaNote: 'Россия не в списке ограничений; исключены лица из санкционных списков.' },
  { slug: 'crypto-fund-trader', name: 'Crypto Fund Trader', review: '/blog/crypto-fund-trader-review', russiaNote: 'Принимает на Match-Trader; карта и PayPal из банков РФ могут не пройти.' },
]

const faqs: RussianFaqItem[] = [
  {
    q: 'Где взять рабочий промокод FundedNext?',
    a: `В карточке FundedNext выше. Мы публикуем код, только если проверили его сами, и ставим дату проверки. Если в карточке написано «код ожидается», значит, на ${CHECKED} проверенного кода у нас нет — не доверяйте кодам без даты на сторонних сайтах.`,
  },
  {
    q: 'Есть ли промокод FTMO для россиян?',
    a: 'Нет смысла его искать: Россия входит в официальный список стран, где FTMO не предоставляет услуги, а до профинансированного этапа FTMO проверяет личность. Скидка не поможет пройти KYC.',
  },
  {
    q: 'Можно ли сложить два промокода?',
    a: 'Как правило, при оформлении принимается один код. Совместимость кода с распродажей мы указываем в карточке только после проверки на кассе фирмы.',
  },
  {
    q: 'Почему старые промокоды исчезают со страницы?',
    a: 'Мы скрываем предложение, если проверка старше 30 дней или опубликованная дата окончания прошла. Каждый месяц страница обновляется заново.',
  },
  {
    q: 'Можно ли использовать VPN, если страна ограничена?',
    a: 'Нет. VPN не меняет гражданство, резидентство и документы KYC; FundedNext прямо называет VPN и ложные данные о стране основанием для закрытия аккаунта.',
  },
]

function dealFor(slug: string, deals: Deal[]): Deal | undefined {
  return deals.find(deal => deal.firmSlug === slug)
}

export default function RussianPromoHubPage() {
  const deals = getAllDeals()
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Промокоды проп-фирм' },
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
  const liveCount = hubFirms.filter(firm => dealFor(firm.slug, deals)).length

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(faqs)) }} />

      <section className="ru-hero">
        <div className="ru-shell" data-russian-promo-hub={CHECKED_ISO}>
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Промокоды проп-фирм</div>
          <div className="ru-eyebrow"><CalendarCheck size={14} aria-hidden="true" /> Выпуск: {MONTH_LABEL} · проверено {CHECKED}</div>
          <h1>Промокоды проп-фирм — {MONTH_LABEL}</h1>
          <p className="ru-lead">
            Большинство «промокодов» в выдаче — это коды без даты, которые давно не работают. Здесь их нет: каждый код
            стоит рядом с датой, когда мы проверили его на кассе. И только для фирм, которые на {CHECKED} принимают трейдеров из России.
          </p>
          <div className="ru-notice ru-disclosure" data-russian-affiliate-disclosure="promo-hub">
            <strong>Партнёрское раскрытие.</strong> По ссылкам на этой странице Traders Fund Hub может получить комиссию.
            Скидку даёт только действующий механизм фирмы; партнёрская ссылка сама по себе цену не снижает.
          </div>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{hubFirms.length}</strong><span>фирмы, открытые для РФ</span></div>
            <div className="ru-stat"><strong>{liveCount}</strong><span>проверенных кодов в этом месяце</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kody">
        <div className="ru-shell">
          <h2>Рабочие промокоды на {MONTH_LABEL}</h2>
          <div className="ru-grid">
            {hubFirms.map((firm, index) => {
              const deal = dealFor(firm.slug, deals)
              const from = `ru-promokody-prop-firm-card-${index + 1}`
              return (
                <article className="ru-card" key={firm.slug} data-russian-promo-firm={firm.slug} data-russian-promo-status={deal ? 'verified' : 'pending'}>
                  <div className="ru-card-head">
                    <h3><BadgePercent size={18} aria-hidden="true" /> {firm.name}</h3>
                    <span className="ru-badge ru-badge--open">Открыта для РФ · проверено {CHECKED}</span>
                  </div>
                  <p className="ru-muted">{firm.russiaNote}</p>
                  {deal ? (
                    <>
                      {deal.code ? <CopyableCodePill code={deal.code} pct={deal.pct ?? 0} locale="ru" analyticsFirm={firm.slug} /> : <p><strong>Скидка применяется по ссылке, код вводить не нужно.</strong></p>}
                      <p><strong>{deal.amountLabel}</strong>{deal.scope ? ` · ${deal.scope}` : ''}</p>
                      <p className="ru-source-line">
                        Проверено {deal.verifiedOn}{deal.expiresOn ? ` · действует до ${deal.expiresOn}` : ''} ·{' '}
                        <a href={deal.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">{deal.sourceLabel}</a>
                      </p>
                      {deal.note ? <p className="ru-muted">{deal.note}</p> : null}
                    </>
                  ) : (
                    <div className="ru-notice" data-russian-promo-placeholder={firm.slug}>
                      {/* TODO(Karlis): получить код у аффилиат-менеджера, проверить на кассе и добавить в content/data/deals.json */}
                      <strong>Код ожидается.</strong> На {CHECKED} проверенного промокода {firm.name} у нас нет. Мы добавим его
                      сюда с датой проверки, как только подтвердим на кассе.
                    </div>
                  )}
                  <div className="ru-actions">
                    {firm.review ? <Link href={firm.review} className="btn-outline">Обзор</Link> : null}
                    {firm.external ? (
                      // TODO: заменить на /go/upscale после подтверждения партнёрской программы Upscale
                      <a href={firm.external} target="_blank" rel="nofollow noopener noreferrer" className="btn-primary">
                        Открыть {firm.name} <ArrowRight size={14} aria-hidden="true" />
                      </a>
                    ) : (
                      <RuGoLink firm={firm.slug} href={`/go/${firm.slug}?from=${from}`} rel={goLinkRel(firm.slug)} className="btn-primary">
                        Перейти в {firm.name} <ArrowRight size={14} aria-hidden="true" />
                      </RuGoLink>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ru-section" id="kak-primenit">
        <div className="ru-shell ru-content">
          <h2>Как применить промокод</h2>
          <ol>
            <li><strong>Выберите продукт до кода.</strong> У FundedNext берите CFD-челлендж: направление Futures Россию ограничивает.</li>
            <li><strong>Введите код на странице оплаты</strong> в поле купона — или перейдите по ссылке, если скидка применяется автоматически (это указано в карточке).</li>
            <li><strong>Сверьте итоговую сумму до подтверждения.</strong> Если цена не изменилась, код не сработал — не платите в расчёте на скидку.</li>
            <li><strong>Платите способом, который работает из РФ.</strong> У Crypto Fund Trader и Upscale это криптовалюта; карта российского банка может не пройти.</li>
          </ol>
        </div>
      </section>

      <section className="ru-section" id="summirovanie">
        <div className="ru-shell ru-content">
          <h2>Какие коды суммируются</h2>
          <p>
            {/* TODO(Karlis): заполнить после проверки совместимости кодов с распродажами у каждой фирмы */}
            Данных о совместимости кодов на {CHECKED} нет: мы не проверяли сложение кода с сезонной распродажей ни у одной
            из четырёх фирм. Таблица появится здесь вместе с первыми проверенными кодами.
          </p>
        </div>
      </section>

      <section className="ru-section" id="ftmo">
        <div className="ru-shell ru-content">
          <h2><ShieldAlert size={20} aria-hidden="true" /> Промокод FTMO: почему его здесь нет</h2>
          <p>
            <span className="ru-badge ru-badge--closed">Недоступно для РФ · проверено {CHECKED}</span>{' '}
            Россия, Беларусь и Казахстан — в официальном списке стран, где FTMO не оказывает услуги. Скидка на челлендж
            ничего не даст: до профинансированного этапа FTMO проверяет личность. Подробнее — в разборе{' '}
            <Link href="/ru/ftmo-dlya-rossiyan">«FTMO для россиян»</Link>, полная таблица — на странице{' '}
            <Link href="/ru/dlya-russkoyazychnykh-treyderov">«Проп-фирмы для россиян в 2026»</Link>.
          </p>
          <div className="ru-notice" data-russian-risk-disclaimer="promo-hub">
            <strong>Риск.</strong> Скидка снижает цену попытки, но не шанс её пройти. Торговля с плечом связана с высоким
            риском; оплата за челлендж не возвращается.
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
