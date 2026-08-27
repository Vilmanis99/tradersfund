import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, CircleAlert, ExternalLink, Globe2 } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllFirms } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import marketEvidence from '@/content/data/russian-market-evidence.json'

const PATH = '/ru/rossiyskie-prop-kompanii'
const TITLE = 'Российские проп-компании: 6 реальных примеров (2026)'
const DESCRIPTION = '6 российских проп-компаний: Era Trade, PropLive, KasCapital, А-Лаб, TeamTraders и Trade System. Модели, выплаты и партнёрские условия по официальным источникам.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

type LocalSignal = {
  operator: string
  sourceUrl: string
  claims: Record<string, number | string | undefined>
  notes: string[]
}

type AffiliateSignal = {
  operator: string
  status: string
  sourceUrl: string
  baseCommissionPct?: number
  maximumPublishedCommissionPct?: number
  minimumPayoutUsd?: number
  notes: string[]
}

const localSignals = marketEvidence.localFirmSignals as LocalSignal[]
const affiliateSignals = marketEvidence.affiliatePrograms as AffiliateSignal[]
const signalFor = (operator: string) => localSignals.find(item => item.operator === operator)
const affiliateFor = (operator: string) => affiliateSignals.find(item => item.operator === operator)

const era = signalFor('Era Trade')
const eraAffiliate = affiliateFor('Era Trade')
const propLive = signalFor('PropLive')
const propLiveAffiliate = affiliateFor('PropLive')
const kasCapital = signalFor('KasCapital')
const kasAffiliate = affiliateFor('KasCapital')
const aLab = signalFor('А-Лаб Групп')
const aLabAffiliate = affiliateFor('А-Лаб Групп')
const teamTraders = signalFor('TeamTraders')
const teamTradersAffiliate = affiliateFor('TeamTraders')
const tradeSystem = signalFor('Trade System')
const tradeSystemAffiliate = affiliateFor('Trade System')

const globalPartnerRoutes = [
  {
    slug: 'fundednext',
    name: 'FundedNext',
    reviewHref: '/ru/obzor-fundednext',
    campaign: 'ru-local-research-fundednext',
    summary: 'Глобальный обзор с отдельной проверкой страны, KYC, валюты и четырёх моделей Stellar.',
  },
  {
    slug: 'fundingpips',
    name: 'FundingPips',
    reviewHref: '/ru/obzor-fundingpips',
    campaign: 'ru-local-research-fundingpips',
    summary: 'Русский разбор пяти продуктовых моделей, просадки, сплита и условий выплаты.',
  },
  {
    slug: 'bright-funded',
    name: 'Bright Funded',
    reviewHref: '/ru/obzor-bright-funded',
    campaign: 'ru-local-research-bright-funded',
    summary: 'Сравнение 1-Step и 2-Step с ценой в EUR, типом просадки и проверкой KYC.',
  },
] as const

const faqs: RussianFaqItem[] = [
  {
    q: 'Это рейтинг российских проп-компаний?',
    a: 'Нет. Это проверка шести реальных примеров и публичных коммерческих условий на конкретную дату. Ни одна из компаний пока не прошла наш полный захват продуктовых цен, правил, юридических документов и истории выплат, поэтому порядок не является рекомендацией.',
  },
  {
    q: 'Есть ли у российских проп-компаний партнёрские программы?',
    a: 'У Era Trade опубликована стандартная партнёрская программа с 5% за прямые покупки и уровнями до 60%. PropLive предлагает договорную модель наставникам и школам с долей до 50% от прибыли учеников. На проверенных страницах KasCapital, А-Лаб, TeamTraders и Trade System обычные публичные affiliate-условия не найдены.',
  },
  {
    q: 'Почему русскоязычному трейдеру всё равно сравнивать глобальные фирмы?',
    a: 'Русскоязычная аудитория живёт во многих странах. Если конкретные резидентство, гражданство, KYC и платёжный маршрут разрешены правилами фирмы, глобальная модель даёт больше сопоставимых продуктов. Для резидентов России доступ нужно проверять отдельно: язык страницы сам по себе ничего не разрешает.',
  },
]

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="nofollow noopener" className="ru-card-link">
      {children} <ExternalLink size={13} aria-hidden="true" />
    </a>
  )
}

export default function RussianPropCompaniesPage() {
  const globalPartners = globalPartnerRoutes.map(route => ({
    ...route,
    firm: getAllFirms().find(firm => outboundSlug(firm.name) === route.slug),
  })).filter(item => item.firm?.affiliateUrl)

  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Российские проп-компании' },
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
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />

      <section className="ru-hero">
        <div className="ru-shell">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Российские компании</div>
          <div className="ru-eyebrow"><Building2 size={14} aria-hidden="true" /> Проверка, а не рекомендация</div>
          <h1>Российские проп-компании в 2026 году: 6 проверяемых примеров</h1>
          <p className="ru-lead">
            Запрос «проп компании для трейдеров в России» существует, но под одним названием скрываются
            разные модели: международный онлайн-челлендж, реальная торговля на Московской бирже и локальная
            проп-инфраструктура. Ниже — только то, что удалось подтвердить на официальных страницах.
          </p>
          <div className="ru-actions">
            <Link href="#tri-kompanii" className="btn-primary btn-glow">Сравнить 6 примеров <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/luchshie-prop-firmy" className="btn-outline">Глобальные проп-фирмы</Link>
          </div>
        </div>
      </section>

      <section className="ru-section" id="tri-kompanii">
        <div className="ru-shell" data-russian-local-firms="verification-only">
          <div className="ru-notice">
            <strong>Это не топ и не совет зарегистрироваться.</strong>{' '}
            Цифры компаний являются заявлениями самих операторов и не подтверждают платёжеспособность,
            юридическую защиту или будущую выплату. Полная продуктовая проверка ещё не завершена.
          </div>
          <h2>Что реально опубликовано</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Era Trade</h3>
              <p className="ru-muted">
                Оператор заявляет {Number(era?.claims.traders).toLocaleString('ru-RU')}+ трейдеров в{' '}
                {era?.claims.countries}+ странах и более ${Number(era?.claims.payoutsUsd).toLocaleString('en-US')}{' '}
                выплат. На странице указан базовый сплит {era?.claims.baseProfitSplitPct}% и юридическое лицо
                NEVERA CORE GLOBAL - FZCO в Дубае, поэтому русскоязычный рынок не равен российской юрисдикции.
              </p>
              <SourceLink href={era?.sourceUrl ?? 'https://eratrade.net/'}>Официальная страница и цифры</SourceLink>
              <Link href="/ru/obzor-eratrade" className="ru-card-link">Открыть отдельный обзор Era Trade →</Link>
            </article>

            <article className="ru-card">
              <BadgeCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>PropLive</h3>
              <p className="ru-muted">
                В верхнем счётчике опубликовано {Number(propLive?.claims.traders).toLocaleString('ru-RU')} трейдера
                по всему миру, хотя ниже на той же странице осталось «более 10 700». Модель описана как торговля
                на Московской бирже через брокера Финам, а не как обычный международный challenge-продукт.
              </p>
              <SourceLink href={propLive?.sourceUrl ?? 'https://www.proplive.ru/'}>Официальная страница и модель</SourceLink>
              <Link href="/ru/obzor-proplive" className="ru-card-link">Открыть отдельный обзор PropLive →</Link>
            </article>

            <article className="ru-card">
              <CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>KasCapital</h3>
              <p className="ru-muted">
                Оператор публикует долю трейдера до {kasCapital?.claims.maximumProfitSharePct}%, обработку выплат
                по понедельникам и диапазон заявки от {Number(kasCapital?.claims.minimumPayoutRub).toLocaleString('ru-RU')} до{' '}
                {Number(kasCapital?.claims.maximumPayoutRub).toLocaleString('ru-RU')} ₽. Эти правила ещё не прошли
                наш полный построчный аудит продукта.
              </p>
              <SourceLink href={kasCapital?.sourceUrl ?? 'https://kascapital.io/'}>Официальные условия</SourceLink>
              <Link href="/ru/obzor-kascapital" className="ru-card-link">Открыть отдельный обзор KasCapital →</Link>
            </article>

            <article className="ru-card">
              <Building2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>А-Лаб Групп</h3>
              <p className="ru-muted">
                Оператор заявляет более {Number(aLab?.claims.traders).toLocaleString('ru-RU')} трейдеров, оборот свыше{' '}
                {Number(aLab?.claims.quarterlyTurnoverRubClaimed).toLocaleString('ru-RU')} ₽ за квартал и работу на фондовом,
                срочном и валютном рынках Московской биржи. Это договорная локальная модель, а не CFD-челлендж.
              </p>
              <SourceLink href={aLab?.sourceUrl ?? 'https://www.a-lab.name/'}>Официальное описание А-Лаб</SourceLink>
            </article>

            <article className="ru-card">
              <BadgeCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>TeamTraders</h3>
              <p className="ru-muted">
                В официальной документации указаны две цели по {teamTraders?.claims.stageProfitPct}%, минимум{' '}
                {teamTraders?.claims.minimumTradingSessions} торговых сессий, дневной лимит потерь {teamTraders?.claims.dailyLossLimitPct}%
                и доля трейдера {teamTraders?.claims.profitSharePct}%. Инструменты — фьючерсы Московской биржи через Финам.
              </p>
              <SourceLink href={teamTraders?.sourceUrl ?? 'https://teamtraders.ru/docs/'}>Официальная документация TeamTraders</SourceLink>
            </article>

            <article className="ru-card">
              <CircleAlert size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Trade System</h3>
              <p className="ru-muted">
                Оператор описывает обучение, отбор, риск-менеджмент и до {tradeSystem?.claims.maximumProfitSharePct}% прибыли трейдеру
                при соблюдении правил. Публичная страница также содержит отказ от гарантий заработка, поэтому цифра не является
                независимой историей выплат.
              </p>
              <SourceLink href={tradeSystem?.sourceUrl ?? 'https://tsystem.pro/'}>Официальная страница Trade System</SourceLink>
            </article>
          </div>
          <p className="ru-source-line">Снимок источников: {marketEvidence.capturedAt}. Плавающие счётчики и правила требуют повторной проверки перед публикацией полного обзора.</p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-local-global-funnel="partner-routes">
          <div className="ru-notice ru-disclosure">
            <strong>Глобальные партнёрские маршруты отделены от локального исследования.</strong>{' '}
            Переход по кнопке может принести Traders Fund Hub комиссию. Это не меняет порядок проверки
            российских компаний и не подтверждает доступность выбранной страны или продукта.
          </div>
          <h2>Если нужен международный challenge</h2>
          <p>
            Локальная проп-компания и международный evaluation-продукт решают разные задачи. Если вам нужен
            сопоставимый challenge с опубликованной ценой, сначала откройте русский обзор, затем проверьте
            гражданство, резидентство, KYC, оплату и выплату на официальном checkout.
          </p>
          <div className="ru-grid">
            {globalPartners.map(item => (
              <article className="ru-card" key={item.slug} data-russian-local-global-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">Партнёр</span></div>
                <p className="ru-muted">{item.summary}</p>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Читать русский обзор</Link>
                  <Link href={`/go/${item.slug}?from=${item.campaign}`} rel="sponsored nofollow noopener" className="btn-primary">
                    Проверить условия <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content" data-russian-affiliate-opportunity="unactivated">
          <h2>Где есть партнёрская возможность</h2>
          <div className="ru-table-wrap">
            <table className="ru-table">
              <thead>
                <tr><th>Компания</th><th>Публичная модель</th><th>Наш статус</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Era Trade</td>
                  <td>{eraAffiliate?.baseCommissionPct}% за прямые покупки; уровни до {eraAffiliate?.maximumPublishedCommissionPct}% при 300+ покупках челленджей в месяц; вывод от ${eraAffiliate?.minimumPayoutUsd}</td>
                  <td>Программа подтверждена, но партнёрство не активировано: сначала проверка продукта и оператора.</td>
                </tr>
                <tr>
                  <td>PropLive</td>
                  <td>До {propLiveAffiliate?.maximumPublishedCommissionPct}% выплаты от прибыли учеников; только наставники и школы, условия после заявки.</td>
                  <td>Не подходит как обычная партнёрская ссылка для издателя.</td>
                </tr>
                <tr>
                  <td>KasCapital</td>
                  <td>Публичные партнёрские или реферальные условия на официальном сайте не найдены.</td>
                  <td>{kasAffiliate?.status === 'not-found' ? 'Нет подтверждённой программы.' : 'Требуется повторная проверка.'}</td>
                </tr>
                <tr>
                  <td>А-Лаб Групп</td>
                  <td>На проверенной официальной странице публичные affiliate-условия не опубликованы.</td>
                  <td>{aLabAffiliate?.status === 'not-found' ? 'Нет подтверждённой программы.' : 'Требуется повторная проверка.'}</td>
                </tr>
                <tr>
                  <td>TeamTraders</td>
                  <td>Документация описывает отбор и правила трейдера; обычная публичная affiliate-программа не указана.</td>
                  <td>{teamTradersAffiliate?.status === 'not-found' ? 'Нет подтверждённой программы.' : 'Требуется повторная проверка.'}</td>
                </tr>
                <tr>
                  <td>Trade System</td>
                  <td>На проверенной главной странице публичные affiliate-условия не опубликованы.</td>
                  <td>{tradeSystemAffiliate?.status === 'not-found' ? 'Нет подтверждённой программы.' : 'Требуется повторная проверка.'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Публичная комиссия не делает фирму лучше и не гарантирует, что мы будем её продвигать. Если Era Trade
            пройдёт юридическую, продуктовую и выплатную проверку, мы сможем рассмотреть только стандартную
            одноуровневую модель прямых рекомендаций; многоуровневая Ambassador-схема нам не нужна.
          </p>
          <p>
            <SourceLink href={eraAffiliate?.sourceUrl ?? 'https://help.eratrade.club/ru/affiliate-program-overview/'}>Условия Era Trade</SourceLink>{' '}
            <SourceLink href={propLiveAffiliate?.sourceUrl ?? 'https://www.proplive.ru/partnyoram'}>Условия PropLive</SourceLink>
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Как эта страница ведёт к глобальным фирмам</h2>
          <p>
            Русскоязычный трейдер может жить в Латвии, Германии, Казахстане, ОАЭ или другой стране. Поэтому главный
            путь сайта — <Link href="/ru/luchshie-prop-firmy">сравнение глобальных проп-фирм</Link> с отдельной
            проверкой резидентства, гражданства, KYC, оплаты и выплат. Местная компания — отдельный вариант, а не
            автоматический выбор только из-за русского интерфейса.
          </p>
          <div className="ru-notice" data-russian-country-boundary="local-to-global">
            <strong>Для резидентов России выбор уже.</strong>{' '}
            FTMO прямо ограничивает Российскую Федерацию, а официальные страницы FundedNext противоречат друг другу.
            Не используйте VPN, чужие документы или неверный адрес для обхода ограничений. Сначала прочитайте{' '}
            <Link href="/ru/obzor-fundednext">разбор FundedNext</Link>, затем получите письменное подтверждение фирмы.
          </div>
          <div className="ru-actions">
            <Link href="/ru/luchshie-prop-firmy" className="btn-primary btn-glow">Сравнить глобальные фирмы <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/ru/dlya-russkoyazychnykh-treyderov" className="btn-outline">Глобальные пути для русскоязычных</Link>
            <Link href="/ru/kak-rabotayut-chellendzhi-prop-firm" className="btn-outline">Понять этапы челленджа</Link>
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
