import type { Metadata } from 'next'
import Image from 'next/image'
import Link from '@/components/SafeLink'
import { ArrowRight, Globe2, ListChecks, ShieldCheck, WalletCards } from 'lucide-react'
import RussianFaq, { type RussianFaqItem } from '@/components/RussianFaq'
import { getAllChallenges, getAllFirms, isChallengeFresh } from '@/lib/firms'
import { outboundSlug } from '@/lib/outboundDestinations'
import { breadcrumbSchema, faqPageSchema, jsonLd } from '@/lib/schema'
import { getLanguageAlternates } from '@/lib/localizedRoutes'

const PATH = '/ru/dlya-russkoyazychnykh-treyderov'
const TITLE = 'Проп-фирмы для русскоязычных трейдеров за рубежом'
const DESCRIPTION = 'Как русскоязычным трейдерам в разных странах проверить KYC, оплату и правила глобальных проп-фирм перед регистрацией; честный маршрут к партнёрским обзорам.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: getLanguageAlternates(PATH) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const faqs: RussianFaqItem[] = [
  {
    q: 'Можно ли русскоязычному трейдеру зарегистрироваться из другой страны?',
    a: 'Иногда да, но язык сайта ничего не гарантирует. Фирма может проверять отдельно гражданство, страну проживания, адрес, документ KYC, платёжный маршрут и санкционные ограничения. Используйте только правдивые данные и подтвердите маршрут у фирмы до оплаты.',
  },
  {
    q: 'Что проверять, если я переехал или имею два гражданства?',
    a: 'Сначала определите, какие сведения фирма просит в KYC: гражданство, резидентство, адрес и документ. Не выбирайте страну только потому, что карта или IP относятся к ней, и не отправляйте документы с противоречивыми данными.',
  },
  {
    q: 'Почему русская страница ведёт к глобальным, а не только российским фирмам?',
    a: 'Русскоязычные трейдеры живут во многих юрисдикциях. Глобальные продукты дают более широкий набор моделей для сравнения, но доступность всё равно устанавливается по конкретному человеку, стране и продукту. Российские операторы вынесены в отдельное исследование, а не смешаны с партнёрским рейтингом.',
  },
  {
    q: 'Можно ли использовать VPN, если фирма не принимает мою страну?',
    a: 'Нет. VPN, прокси или неверное указание страны не превращают запрещённый маршрут в разрешённый и могут создать проблему с KYC или выплатой. Если правила неясны, запросите письменное подтверждение у поддержки или выберите другой продукт.',
  },
  {
    q: 'Есть ли отдельные проп-фирмы для русскоязычных в Казахстане или ОАЭ?',
    a: 'Отдельная русская страница фирмы не подтверждает доступ. Для Казахстана, ОАЭ и любой другой страны сначала сопоставьте гражданство, фактическое резидентство, адрес, документ KYC, способ оплаты и выплату; международный бренд или русскоязычная реклама сами по себе ничего не гарантируют.',
  },
  {
    q: 'Как выбирать проп-фирмы русскоязычному трейдеру в Европе или Грузии?',
    a: 'Русский язык определяет язык объяснения, а не доступ к продукту. Для Европы, Грузии, Армении, Израиля, США и других стран отдельно проверьте резидентство, гражданство, KYC, платёж и выплату в правилах выбранного продукта.',
  },
]

const primaryPartnerRoutes = [
  {
    slug: 'fundednext',
    name: 'FundedNext',
    reviewHref: '/ru/obzor-fundednext',
    campaign: 'ru-diaspora-fundednext',
    heroCampaign: 'ru-diaspora-hero-fundednext',
    currency: 'USD',
    summary: 'Русский разбор с отдельной проверкой противоречивых ограничений по стране.',
  },
  {
    slug: 'bright-funded',
    name: 'Bright Funded',
    reviewHref: '/ru/obzor-bright-funded',
    campaign: 'ru-diaspora-bright-funded',
    heroCampaign: 'ru-diaspora-hero-bright-funded',
    currency: 'EUR',
    summary: 'Русский разбор с валютой фирмы, KYC и предупреждениями о доступности.',
  },
] as const

export default function RussianDiasporaGuidePage() {
  const firms = getAllFirms()
  const challenges = getAllChallenges()
  const primaryPartnerCards = primaryPartnerRoutes.map(route => {
    const firm = firms.find(candidate => outboundSlug(candidate.name) === route.slug)
    const freshProducts = challenges.filter(challenge =>
      challenge.firmSlug === route.slug && isChallengeFresh(challenge),
    )
    const priceCount = freshProducts.reduce((total, product) => total + product.accountSizes.filter(tier =>
      (tier.priceUsd != null && tier.priceUsd > 0)
      || (tier.priceEur != null && tier.priceEur > 0),
    ).length, 0)
    const captureDate = freshProducts.map(product => product.sourceCapturedAt).sort().at(-1)
    return { ...route, firm, freshProducts, priceCount, captureDate }
  }).filter(item => item.firm?.affiliateUrl)

  const freshPartnerProducts = primaryPartnerCards.reduce((sum, item) => sum + item.freshProducts.length, 0)
  const crumbs = breadcrumbSchema([
    { name: 'Русская версия', url: '/ru' },
    { name: 'Для русскоязычных трейдеров' },
  ])
  const faq = faqPageSchema(faqs)
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: `https://tradersfundhub.com${PATH}`,
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
        <div className="ru-shell" data-russian-diaspora-guide="global-access">
          <div className="ru-breadcrumb"><Link href="/ru">Русская версия</Link> / Для русскоязычных трейдеров</div>
          <div className="ru-eyebrow"><Globe2 size={14} aria-hidden="true" /> Русский язык — не страна</div>
          <h1>Проп-фирмы для русскоязычных трейдеров: проверка доступа в разных странах</h1>
          <p className="ru-lead">
            Эта страница предназначена для русскоязычных трейдеров по всему миру — независимо от того,
            где они живут. Сначала определите свой KYC-маршрут, затем сравните конкретный продукт и только
            после этого переходите к глобальной фирме.
          </p>
          <div className="ru-home-partner-hero" data-russian-diaspora-hero-partners="fundednext-bright-funded">
            {primaryPartnerCards.map(item => {
              const isFundedNext = item.slug === 'fundednext'
              return (
                <article
                  className={`ru-home-partner-hero-card${isFundedNext ? ' ru-home-partner-hero-card--fundednext' : ' ru-home-partner-hero-card--bright'}`}
                  key={item.slug}
                  data-russian-diaspora-hero-partner={item.slug}
                >
                  <div className="ru-home-partner-hero-brand">
                    {item.firm?.logo ? (
                      <span className="ru-home-partner-hero-logo" aria-hidden="true">
                        <Image src={item.firm.logo} alt="" width={72} height={72} />
                      </span>
                    ) : null}
                    <div>
                      <span className="ru-home-partner-hero-label">Главный глобальный партнёр</span>
                      <h2>{item.name}</h2>
                    </div>
                  </div>
                  <p>
                    Актуальных продуктов: {item.freshProducts.length}; опубликованных цен: {item.priceCount}; валюта: {item.currency}.
                    {' '}Сначала проверьте точную модель, страну и KYC, затем открывайте checkout.
                  </p>
                  <div className="ru-home-partner-hero-facts" aria-label={`Охват данных ${item.name}`}>
                    <span><strong>{item.freshProducts.length}</strong> продукта</span>
                    <span><strong>{item.priceCount}</strong> цен</span>
                    <span><strong>{item.captureDate ?? '—'}</strong> проверено</span>
                  </div>
                  <div className="ru-home-partner-hero-actions">
                    <Link
                      href={`/go/${item.slug}?from=${item.heroCampaign}`}
                      rel="sponsored nofollow noopener"
                      className="btn-primary btn-glow"
                    >
                      Проверить условия {item.name} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link href={item.reviewHref} className="ru-home-partner-hero-review">Сначала прочитать обзор</Link>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="ru-actions ru-home-secondary-actions">
            <Link href="/ru/fundednext-vs-bright-funded" className="btn-outline">Сравнить двух партнёров</Link>
            <Link href="#proverka" className="btn-outline">Пройти проверку перед оплатой</Link>
          </div>
          <p className="ru-source-line ru-home-partner-hero-disclosure" data-russian-diaspora-hero-disclosure="primary-affiliates">
            FundedNext и Bright Funded коммерчески выделены как два главных партнёра. Мы можем получить комиссию
            после регистрации по кнопке «Проверить условия»; это не подтверждает доступность вашей страны.
          </p>
          <div className="ru-stats">
            <div className="ru-stat"><strong>{primaryPartnerCards.length}</strong><span>главных глобальных партнёра</span></div>
            <div className="ru-stat"><strong>{freshPartnerProducts}</strong><span>свежих продуктов в этих маршрутах</span></div>
            <div className="ru-stat"><strong>5</strong><span>проверок до регистрации</span></div>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell">
          <div className="ru-notice" data-russian-country-boundary="diaspora-not-access">
            <strong>Страница не подтверждает доступность страны.</strong>{' '}
            Русскоязычный интерфейс подходит людям в разных странах, но гражданство, резидентство,
            IP, адрес, KYC, карта и способ выплаты проверяются отдельно. Резидентам России нельзя обходить
            ограничения VPN, прокси или неверными данными.
          </div>
          <h2>Три ситуации, которые нельзя смешивать</h2>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Живёте за пределами России</h3>
              <p className="ru-muted">Проверьте, какие поля фирма считает определяющими: гражданство, резидентство, адрес или документ. Не делайте вывод только по языку страницы и месту нахождения карты.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Переехали или имеете два гражданства</h3>
              <p className="ru-muted">Подготовьте непротиворечивый KYC-маршрут и заранее спросите поддержку, какие документы и страна указываются в договоре. Сохраняйте ответ до оплаты.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Русскоязычный трейдер в любой другой стране</h3>
              <p className="ru-muted">Сначала выберите рынок и продукт, затем проверьте платёж, платформу, ограничения и выплату именно для вашей юрисдикции. Язык — удобство, а не разрешение.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="kazakhstan-oae">
        <div className="ru-shell ru-content" data-russian-diaspora-regions="kazakhstan-uae">
          <h2>Казахстан и ОАЭ: страна проживания не равна доступу</h2>
          <p>
            Два русскоязычных трейдера в Казахстане или ОАЭ могут иметь разные гражданство, документы и платёжные профили.
            Поэтому местная регистрация, язык интерфейса и возможность купить глобальный продукт проверяются отдельно:
            где вы живёте, какое гражданство указываете, какой документ принимает KYC и каким способом фирма выплачивает именно вам.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Казахстан</h3>
              <p className="ru-muted">Проверьте адрес и резидентство в договоре, валюту и провайдера оплаты, а также доступность выбранного продукта. Казахстанская карта не доказывает, что фирма принимает любое гражданство.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>ОАЭ и страны GCC</h3>
              <p className="ru-muted">Юрисдикция фирмы, страна проживания трейдера и место выплаты могут быть разными. Сохраните письменное подтверждение KYC и метода выплаты до регистрации.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Русскоязычный маршрут</h3>
              <p className="ru-muted">После пяти проверок откройте глобальный обзор ниже; если страна или продукт не подтверждены, не используйте VPN и не подменяйте данные.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section" id="global-regions">
        <div className="ru-shell ru-content" data-russian-diaspora-regions="global-routes">
          <h2>Русскоязычные трейдеры в Европе, на Кавказе и в других странах</h2>
          <p>
            Русскоязычные трейдеры в Европе, Грузии и Израиле могут читать один разбор, но проходят проверку
            по разным профилям. Язык аудитории не создаёт отдельный статус у фирмы: один и тот же глобальный
            продукт нужно проверять по фактической стране, гражданству, документу и маршруту выплаты.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Европа</h3>
              <p className="ru-muted">Для Германии, Латвии, Польши, Чехии и других стран сохраните адрес резидентства и документ, который фирма примет на KYC. Русский интерфейс не заменяет проверку страны в договоре.</p>
            </article>
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Кавказ и Центральная Азия</h3>
              <p className="ru-muted">Для Грузии, Армении, Узбекистана и Казахстана заранее сопоставьте гражданство, адрес, карту или криптометод и валюту выплаты с условиями конкретного продукта.</p>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Израиль, Северная Америка и другие маршруты</h3>
              <p className="ru-muted">Если страна менялась, запросите письменное подтверждение у поддержки до оплаты. Не используйте VPN или чужие документы: несоответствие может проявиться только при выплате.</p>
            </article>
          </div>
          <p>
            После проверки откройте <Link href="/ru/luchshie-prop-firmy">русский глобальный рейтинг</Link> и
            сравните свежие продукты, а не рекламное обещание «для всех русскоязычных».
          </p>
          <div className="ru-notice ru-disclosure" data-russian-diaspora-region-funnel="global-partners">
            <strong>Глобальные переходы после проверки региона.</strong>{' '}
            Кнопки ниже могут приносить Traders Fund Hub комиссию. Это не подтверждает доступность вашей страны:
            сначала сверяйте KYC, оплату и выплату у выбранной фирмы.
          </div>
          <div className="ru-actions">
            {primaryPartnerCards.map(item => (
              <Link
                key={item.slug}
                href={`/go/${item.slug}?from=ru-diaspora-regions-${item.slug}`}
                rel="sponsored nofollow noopener"
                className="btn-primary"
              >
                Проверить {item.name} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ru-section" id="proverka">
        <div className="ru-shell ru-content">
          <h2>Пять проверок перед регистрацией</h2>
          <ol>
            <li><strong>Идентичность:</strong> какие гражданство, резидентство, адрес и документы запросит KYC.</li>
            <li><strong>Доступ:</strong> есть ли ваша страна или гражданство в ограничениях конкретной фирмы и продукта.</li>
            <li><strong>Оплата:</strong> проходит ли выбранный способ оплаты без обхода правил и с понятной комиссией.</li>
            <li><strong>Правила:</strong> цена, тип просадки, цели, торговые ограничения и первая выплата у нужного размера счёта.</li>
            <li><strong>Вывод:</strong> доступен ли вам метод выплаты и какие документы потребуются после успешного этапа.</li>
          </ol>
          <p>
            Если один пункт не подтверждён, не превращайте предположение в рекомендацию. Откройте страницу
            конкретного продукта, задайте вопрос поддержке и сравните альтернативы в{' '}
            <Link href="/ru/luchshie-prop-firmy">русском рейтинге глобальных фирм</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section" data-russian-diaspora-decision-router="four-unresolved-fields">
        <div className="ru-shell ru-content">
          <h2>Откройте маршрут по вопросу, который ещё не закрыт</h2>
          <p>
            Не переходите к регистрации с общим выводом «страна подходит». Выберите один нерешённый блок —
            документы, получение денег, правила продукта или тип рынка — и сначала проверьте его на отдельной странице.
          </p>
          <div className="ru-grid">
            <article className="ru-card">
              <ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Гражданство, адрес или документы</h3>
              <p className="ru-muted">Если гражданство, резидентство, адрес, ID и selfie проверяются разными сторонами, начните с четырёх KYC-этапов и письменных вопросов поддержке.</p>
              <Link href="/ru/prop-firmy-bez-kyc" className="ru-card-link">Открыть проверку KYC →</Link>
            </article>
            <article className="ru-card">
              <WalletCards size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Кошелёк, банк или валюта выплаты</h3>
              <p className="ru-muted">Если неизвестны rail, token/network, валюта, provider fee или банковский маршрут, сравните eligibility, обработку фирмы и фактическое зачисление отдельно.</p>
              <Link href="/ru/vyplaty-prop-firm" className="ru-card-link">Сравнить маршруты выплаты →</Link>
            </article>
            <article className="ru-card">
              <ListChecks size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Не выбран конкретный продукт</h3>
              <p className="ru-muted">Если выбор всё ещё сделан только по бренду, сопоставьте 7 продуктов FundedNext и Bright Funded по этапам, просадке, первой выплате и валюте checkout.</p>
              <Link href="/ru/fundednext-vs-bright-funded" className="ru-card-link">Сравнить 7 продуктов →</Link>
            </article>
            <article className="ru-card">
              <Globe2 size={22} color="var(--accent-light)" aria-hidden="true" />
              <h3>Нужен локальный рынок, а не CFD challenge</h3>
              <p className="ru-muted">Если задача связана с MOEX, стажировкой, рублёвым договором или локальным терминалом, не подменяйте её международным evaluation-продуктом.</p>
              <Link href="/ru/rossiyskie-prop-kompanii" className="ru-card-link">Проверить российские модели →</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell" data-russian-affiliate-disclosure="diaspora-guide">
          <div className="ru-notice ru-disclosure">
            <strong>Партнёрское раскрытие.</strong>{' '}
            Часть глобальных фирм ниже имеет партнёрскую ссылку. Мы можем получить комиссию,
            если читатель зарегистрируется после перехода; это не меняет порядок рейтинга, цены или
            проверку доступа. Перед оплатой подтвердите условия у самой фирмы.
          </div>
          <h2>Два главных глобальных обзора на русском</h2>
          <p className="ru-muted">Сначала откройте разбор, затем переходите на официальную страницу оплаты только после проверки своей юрисдикции.</p>
          <div className="ru-grid">
            {primaryPartnerCards.map(item => (
              <article className="ru-card" key={item.slug} data-russian-diaspora-partner={item.slug}>
                <div className="ru-card-head"><h3>{item.name}</h3><span className="ru-score">{item.firm?.score.toFixed(1) ?? '—'}/10</span></div>
                <p className="ru-muted">{item.summary}</p>
                <p className="ru-source-line">{item.freshProducts.length} свежих продуктов в текущем захвате данных.</p>
                <div className="ru-actions">
                  <Link href={item.reviewHref} className="btn-outline">Читать разбор</Link>
                  <Link href={`/go/${item.slug}?from=${item.campaign}`} rel="sponsored nofollow noopener" className="btn-primary">
                    Проверить условия <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="ru-source-line">
            Вторичный глобальный вариант: <Link href="/ru/obzor-fundingpips">отдельный обзор FundingPips</Link>. Он не входит в два коммерчески выделенных маршрута этой страницы.{' '}
            Нужны локальные примеры? Смотрите отдельное <Link href="/ru/rossiyskie-prop-kompanii">исследование «Российские проп-компании»</Link>:
            оно не является рейтингом и не содержит неактивированных партнёрских переходов. Локальные разборы: <Link href="/ru/obzor-proplive">PropLive</Link>, <Link href="/ru/obzor-eratrade">Era Trade</Link>, <Link href="/ru/obzor-kascapital">KasCapital</Link> и <Link href="/ru/obzor-teamtraders">TeamTraders</Link>.
          </p>
        </div>
      </section>

      <section className="ru-section">
        <div className="ru-shell ru-content">
          <h2>Короткий чек-лист перед кликом</h2>
          <div className="ru-grid">
            <article className="ru-card"><ListChecks size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Сохраните источник</h3><p className="ru-muted">Откройте страницу правил и зафиксируйте дату, продукт, размер счёта и способ выплаты.</p></article>
            <article className="ru-card"><ShieldCheck size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Не скрывайте страну</h3><p className="ru-muted">Несовпадение IP, адреса, документа и платёжного профиля может повлиять на KYC и выплату.</p></article>
            <article className="ru-card"><WalletCards size={22} color="var(--accent-light)" aria-hidden="true" /><h3>Считайте полную стоимость</h3><p className="ru-muted">Сравнивайте не только входную цену, но и активацию, повторную оплату, возврат и условия первой выплаты.</p></article>
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
